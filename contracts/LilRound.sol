// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
}

interface IERC721 {
    function transferFrom(address from, address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
    function balanceOf(address owner) external view returns (uint256);
}

interface IERC1155 {
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external;
    function balanceOf(address account, uint256 id) external view returns (uint256);
    function setApprovalForAll(address operator, bool approved) external;
}

/// @title LilRound
/// @notice Fully on-chain round contract for Lil Prop House on Base.
///         Proposals and votes are stored permanently on-chain.
///         State transitions are time-based (derived from block.timestamp vs deadlines).
///         Vote weight is computed on-chain based on the configured strategy.
///         Winner finalization is automated — anyone can call it after voting ends.
contract LilRound {
    enum State { NotStarted, AcceptingProposals, Voting, Completed, Cancelled }
    enum VoteStrategyType { BALANCE_OF_ERC721, BALANCE_OF_ERC20, BALANCE_OF_ERC1155, ALLOWLIST }
    enum AssetType { ETH, ERC20, ERC721, ERC1155 }

    struct Proposal {
        address proposer;
        string title;
        string content;
        string tldr;
        uint256 createdAt;
        uint256 votesFor;
        uint256 votesAgainst;
    }

    struct AwardConfig {
        AssetType assetType;
        address tokenAddress;
        uint256 tokenId;
        uint256 amountPerWinner;
    }

    struct DepositedNFT {
        address nftContract;
        uint256 tokenId;
        uint256 amount;
        bool isERC1155;
        address depositor;
    }

    // ===== ROUND METADATA =====

    address public owner;
    uint256 public houseId;
    string public title;
    string public description;
    uint256 public numWinners;
    uint256 public createdAt;
    uint256 public proposalEndTimestamp;
    uint256 public votingEndTimestamp;
    uint256 public completedAt;
    uint256 public totalDeposited;
    mapping(address => uint256) public tokenDeposits;
    bool public completed;
    bool public cancelled;

    // ===== VOTING STRATEGY =====

    VoteStrategyType public voteStrategyType;
    address public votingToken;
    uint256 public votingTokenId;
    uint256 public voteMultiplier;
    bytes32 public allowlistRoot;

    // ===== AWARDS =====

    AwardConfig[] public awardConfigs;
    mapping(uint256 => uint256) public winnerPositions;

    // ===== PROPOSALS & VOTES =====

    Proposal[] public proposals;
    mapping(uint256 => mapping(address => uint256)) public proposalVotes;
    mapping(uint256 => mapping(address => bool)) public hasVotedOn;

    // ===== WINNER STORAGE =====

    mapping(uint256 => uint256) public winnerAmounts;
    mapping(uint256 => bool) public claimed;

    // ===== NFT DONATIONS (optional bonus rewards) =====

    DepositedNFT[] public depositedNFTs;
    mapping(uint256 => uint256[]) public winnerNftIndices;
    mapping(uint256 => bool) public nftClaimed;
    uint256 public nftDepositCount;

    // ===== EVENTS =====

    event RoundStateChanged(State newState);
    event ProposalSubmitted(uint256 indexed proposalId, address indexed proposer, string title);
    event VoteCast(uint256 indexed proposalId, address indexed voter, uint256 weight, bool isFor);
    event WinnersSet(uint256[] proposalIds, uint256[] awardIndices);
    event AwardClaimed(uint256 indexed proposalId, address indexed winner, uint256 amount);
    event DepositReceived(address indexed depositor, uint256 amount);
    event TokenDeposited(address indexed depositor, address indexed token, uint256 amount);
    event RoundCancelled();
    event NFTDeposited(address indexed depositor, address indexed nftContract, uint256 tokenId, uint256 amount, bool isERC1155);
    event NFTAwarded(uint256 indexed proposalId, address indexed winner, address nftContract, uint256 tokenId, uint256 amount);

    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }

    constructor(
        address _owner,
        uint256 _houseId,
        string memory _title,
        string memory _description,
        uint256 _numWinners,
        uint256 _proposalDuration,
        uint256 _voteDuration,
        VoteStrategyType _voteStrategyType,
        address _votingToken,
        uint256 _votingTokenId,
        uint256 _voteMultiplier,
        bytes32 _allowlistRoot,
        AwardConfig[] memory _awardConfigs
    ) {
        require(_owner != address(0), "Owner required");
        require(bytes(_title).length > 0, "Title required");
        require(_numWinners > 0, "Num winners > 0");
        require(_proposalDuration > 0, "Proposal duration > 0");
        require(_voteDuration > 0, "Vote duration > 0");
        require(_awardConfigs.length == _numWinners, "Award count mismatch");

        owner = _owner;
        houseId = _houseId;
        title = _title;
        description = _description;
        numWinners = _numWinners;
        createdAt = block.timestamp;
        proposalEndTimestamp = block.timestamp + _proposalDuration;
        votingEndTimestamp = proposalEndTimestamp + _voteDuration;

        voteStrategyType = _voteStrategyType;
        votingToken = _votingToken;
        votingTokenId = _votingTokenId;
        voteMultiplier = _voteMultiplier > 0 ? _voteMultiplier : 1;
        allowlistRoot = _allowlistRoot;

        for (uint256 i = 0; i < _awardConfigs.length; i++) {
            awardConfigs.push(_awardConfigs[i]);
        }

        emit RoundStateChanged(State.AcceptingProposals);
    }

    function currentState() public view returns (State) {
        if (cancelled) return State.Cancelled;
        if (completed) return State.Completed;
        if (block.timestamp < proposalEndTimestamp) return State.AcceptingProposals;
        if (block.timestamp < votingEndTimestamp) return State.Voting;
        return State.Completed;
    }

    // ==================== ROUND LIFECYCLE ====================

    function cancel() external onlyOwner {
        require(!cancelled && !completed, "Cannot cancel");
        cancelled = true;
        emit RoundCancelled();
        emit RoundStateChanged(State.Cancelled);
    }

    function finalizeRound(uint256[] calldata _proposalIds) external {
        require(block.timestamp >= votingEndTimestamp, "Voting still open");
        require(!cancelled, "Round cancelled");
        require(!completed, "Already completed");
        require(_proposalIds.length <= numWinners, "Too many winners");
        require(_proposalIds.length <= proposals.length, "Not enough proposals");

        if (_proposalIds.length == 0) {
            completed = true;
            completedAt = block.timestamp;
            emit WinnersSet(new uint256[](0), new uint256[](0));
            emit RoundStateChanged(State.Completed);
            return;
        }

        bool[] memory isWinner = new bool[](proposals.length);
        for (uint256 i = 0; i < _proposalIds.length; i++) {
            require(_proposalIds[i] < proposals.length, "Invalid proposal");
            require(!isWinner[_proposalIds[i]], "Duplicate proposal");
            isWinner[_proposalIds[i]] = true;
        }

        // verify descending vote order
        for (uint256 i = 1; i < _proposalIds.length; i++) {
            require(
                proposals[_proposalIds[i]].votesFor <= proposals[_proposalIds[i - 1]].votesFor,
                "Not sorted descending"
            );
        }

        // find minimum winner votes
        uint256 minWinnerVotes = proposals[_proposalIds[_proposalIds.length - 1]].votesFor;

        // find maximum non-winner votes
        uint256 maxNonWinnerVotes = 0;
        for (uint256 i = 0; i < proposals.length; i++) {
            if (!isWinner[i]) {
                if (proposals[i].votesFor > maxNonWinnerVotes) {
                    maxNonWinnerVotes = proposals[i].votesFor;
                }
            }
        }

        // every winner must have >= votes than the best non-winner
        require(minWinnerVotes >= maxNonWinnerVotes, "Not top proposals");

        for (uint256 i = 0; i < _proposalIds.length; i++) {
            winnerPositions[_proposalIds[i]] = i + 1;
        }

        completed = true;
        completedAt = block.timestamp;

        emit WinnersSet(_proposalIds, new uint256[](_proposalIds.length));
        emit RoundStateChanged(State.Completed);
    }

    // ==================== USER ACTIONS ====================

    function propose(
        string calldata _title,
        string calldata _content,
        string calldata _tldr
    ) external returns (uint256) {
        require(block.timestamp < proposalEndTimestamp, "Proposals closed");
        require(!cancelled && !completed, "Round not active");
        require(bytes(_title).length > 0, "Title required");
        require(bytes(_title).length <= 128, "Title too long");
        require(bytes(_tldr).length > 0, "TLDR required");
        require(bytes(_tldr).length <= 256, "TLDR too long");

        uint256 proposalId = proposals.length;

        proposals.push(Proposal({
            proposer: msg.sender,
            title: _title,
            content: _content,
            tldr: _tldr,
            createdAt: block.timestamp,
            votesFor: 0,
            votesAgainst: 0
        }));

        emit ProposalSubmitted(proposalId, msg.sender, _title);
        return proposalId;
    }

    function vote(uint256 _proposalId, bool _isFor) external {
        require(voteStrategyType != VoteStrategyType.ALLOWLIST, "Use voteWithProof for allowlist");
        _castVote(_proposalId, _isFor, _computeVoteWeight(msg.sender));
    }

    function voteWithProof(uint256 _proposalId, bool _isFor, uint256 _weight, bytes32[] calldata _proof) external {
        require(voteStrategyType == VoteStrategyType.ALLOWLIST, "Not allowlist round");
        require(verifyMerkleProof(_proof, keccak256(abi.encodePacked(msg.sender, _weight)), allowlistRoot), "Invalid proof");
        _castVote(_proposalId, _isFor, _weight);
    }

    function _castVote(uint256 _proposalId, bool _isFor, uint256 _weight) internal {
        require(block.timestamp >= proposalEndTimestamp, "Voting not open");
        require(block.timestamp < votingEndTimestamp, "Voting closed");
        require(!cancelled && !completed, "Round not active");
        require(_proposalId < proposals.length, "Invalid proposal");
        require(!hasVotedOn[_proposalId][msg.sender], "Already voted");
        require(_weight > 0, "Weight must be > 0");

        hasVotedOn[_proposalId][msg.sender] = true;
        proposalVotes[_proposalId][msg.sender] = _weight;

        if (_isFor) {
            proposals[_proposalId].votesFor += _weight;
        } else {
            proposals[_proposalId].votesAgainst += _weight;
        }

        emit VoteCast(_proposalId, msg.sender, _weight, _isFor);
    }

    function claim(uint256 _proposalId) external {
        require(completed, "Round not finalized");
        require(_proposalId < proposals.length, "Invalid proposal");
        require(proposals[_proposalId].proposer == msg.sender, "Not your proposal");
        require(!claimed[_proposalId], "Already claimed");

        uint256 stored = winnerPositions[_proposalId];
        require(stored > 0, "Not a winner");
        uint256 position = stored - 1;

        claimed[_proposalId] = true;

        if (position < awardConfigs.length) {
            _claimAward(_proposalId, position);
        }

        _claimBonusNfts(_proposalId);
    }

    // ==================== FUNDING ====================

    function deposit() external payable {
        require(!cancelled && !completed, "Round finalized");
        require(msg.value > 0, "Must deposit ETH");
        totalDeposited += msg.value;
        emit DepositReceived(msg.sender, msg.value);
    }

    function depositToken(address _token, uint256 _amount) external {
        require(!cancelled && !completed, "Round finalized");
        require(_amount > 0, "Must deposit");
        require(_token != address(0), "Invalid token");

        IERC20 token = IERC20(_token);
        uint256 beforeBalance = token.balanceOf(address(this));
        require(token.transferFrom(msg.sender, address(this), _amount), "Transfer failed");
        uint256 received = token.balanceOf(address(this)) - beforeBalance;
        require(received > 0, "No tokens received");

        tokenDeposits[_token] += received;
        emit TokenDeposited(msg.sender, _token, received);
    }

    function depositERC721(address _nftContract, uint256 _tokenId) external {
        require(!cancelled && !completed, "Round finalized");
        require(_nftContract != address(0), "Invalid contract");

        IERC721 nft = IERC721(_nftContract);
        require(nft.ownerOf(_tokenId) == msg.sender, "Not token owner");
        nft.transferFrom(msg.sender, address(this), _tokenId);

        depositedNFTs.push(DepositedNFT({
            nftContract: _nftContract,
            tokenId: _tokenId,
            amount: 1,
            isERC1155: false,
            depositor: msg.sender
        }));
        nftDepositCount++;

        emit NFTDeposited(msg.sender, _nftContract, _tokenId, 1, false);
    }

    function depositERC1155(address _nftContract, uint256 _tokenId, uint256 _amount) external {
        require(!cancelled && !completed, "Round finalized");
        require(_nftContract != address(0), "Invalid contract");
        require(_amount > 0, "Amount must be > 0");

        IERC1155 nft = IERC1155(_nftContract);
        require(nft.balanceOf(msg.sender, _tokenId) >= _amount, "Insufficient balance");
        nft.safeTransferFrom(msg.sender, address(this), _tokenId, _amount, "");

        depositedNFTs.push(DepositedNFT({
            nftContract: _nftContract,
            tokenId: _tokenId,
            amount: _amount,
            isERC1155: true,
            depositor: msg.sender
        }));
        nftDepositCount++;

        emit NFTDeposited(msg.sender, _nftContract, _tokenId, _amount, true);
    }

    function setWinnerNfts(uint256 _proposalId, uint256[] calldata _nftIndices) external onlyOwner {
        require(completed, "Round not finalized");
        require(_proposalId < proposals.length, "Invalid proposal");
        require(winnerPositions[_proposalId] > 0, "Not a winner");

        for (uint256 i = 0; i < _nftIndices.length; i++) {
            require(_nftIndices[i] < depositedNFTs.length, "Invalid NFT index");
            require(!nftClaimed[_nftIndices[i]], "NFT already claimed/assigned");
            nftClaimed[_nftIndices[i]] = true;
        }

        winnerNftIndices[_proposalId] = _nftIndices;
    }

    receive() external payable {
        totalDeposited += msg.value;
        emit DepositReceived(msg.sender, msg.value);
    }

    // ==================== VIEWS ====================

    function proposalCount() external view returns (uint256) {
        return proposals.length;
    }

    function getProposal(uint256 _proposalId) external view returns (Proposal memory) {
        require(_proposalId < proposals.length, "Invalid proposal");
        return proposals[_proposalId];
    }

    function getAllProposals() external view returns (Proposal[] memory) {
        return proposals;
    }

    function getVoteWeight(address _voter, uint256 _proposalId) external view returns (uint256) {
        return proposalVotes[_proposalId][_voter];
    }

    function getAllDepositedNFTs() external view returns (DepositedNFT[] memory) {
        return depositedNFTs;
    }

    function getAwardConfigs() external view returns (AwardConfig[] memory) {
        return awardConfigs;
    }

    function getWinnerPosition(uint256 _proposalId) external view returns (int256) {
        uint256 stored = winnerPositions[_proposalId];
        return stored > 0 ? int256(stored) - 1 : -1;
    }

    // ==================== INTERNAL ====================

    function _claimAward(uint256 _proposalId, uint256 _position) internal {
        AwardConfig storage cfg = awardConfigs[_position];
        if (cfg.assetType == AssetType.ETH) {
            uint256 ethAmount = cfg.amountPerWinner;
            if (ethAmount > 0 && address(this).balance >= ethAmount) {
                (bool success, ) = payable(msg.sender).call{value: ethAmount}("");
                require(success, "ETH transfer failed");
                emit AwardClaimed(_proposalId, msg.sender, ethAmount);
            }
        } else if (cfg.assetType == AssetType.ERC20) {
            _claimErc20(_proposalId, cfg);
        } else if (cfg.assetType == AssetType.ERC721) {
            IERC721(cfg.tokenAddress).transferFrom(address(this), msg.sender, cfg.tokenId);
            emit AwardClaimed(_proposalId, msg.sender, 0);
        } else if (cfg.assetType == AssetType.ERC1155) {
            _claimErc1155(_proposalId, cfg);
        }
    }

    function _claimErc20(uint256 _proposalId, AwardConfig storage cfg) internal {
        require(cfg.amountPerWinner > 0, "No ERC20 award");
        IERC20 token = IERC20(cfg.tokenAddress);
        require(token.balanceOf(address(this)) >= cfg.amountPerWinner, "Insufficient token balance");
        require(token.transfer(msg.sender, cfg.amountPerWinner), "Token transfer failed");
        emit AwardClaimed(_proposalId, msg.sender, cfg.amountPerWinner);
    }

    function _claimErc1155(uint256 _proposalId, AwardConfig storage cfg) internal {
        require(cfg.amountPerWinner > 0, "No ERC1155 award");
        IERC1155(cfg.tokenAddress).safeTransferFrom(address(this), msg.sender, cfg.tokenId, cfg.amountPerWinner, "");
        emit AwardClaimed(_proposalId, msg.sender, 0);
    }

    function _claimBonusNfts(uint256 _proposalId) internal {
        uint256[] storage nftIndices = winnerNftIndices[_proposalId];
        for (uint256 i = 0; i < nftIndices.length; i++) {
            uint256 idx = nftIndices[i];
            if (nftClaimed[idx]) continue;
            nftClaimed[idx] = true;
            DepositedNFT storage nft = depositedNFTs[idx];
            if (nft.isERC1155) {
                IERC1155(nft.nftContract).safeTransferFrom(address(this), msg.sender, nft.tokenId, nft.amount, "");
            } else {
                IERC721(nft.nftContract).transferFrom(address(this), msg.sender, nft.tokenId);
            }
            emit NFTAwarded(_proposalId, msg.sender, nft.nftContract, nft.tokenId, nft.amount);
        }
    }

    function _computeVoteWeight(address _voter) internal view returns (uint256) {
        if (voteStrategyType == VoteStrategyType.BALANCE_OF_ERC721) {
            return IERC721(votingToken).balanceOf(_voter) * voteMultiplier;
        }
        if (voteStrategyType == VoteStrategyType.BALANCE_OF_ERC20) {
            return IERC20(votingToken).balanceOf(_voter) * voteMultiplier;
        }
        if (voteStrategyType == VoteStrategyType.BALANCE_OF_ERC1155) {
            return IERC1155(votingToken).balanceOf(_voter, votingTokenId) * voteMultiplier;
        }
        revert("Unknown strategy");
    }

    function verifyMerkleProof(
        bytes32[] memory _proof,
        bytes32 _leaf,
        bytes32 _root
    ) internal pure returns (bool) {
        bytes32 computedHash = _leaf;
        for (uint256 i = 0; i < _proof.length; i++) {
            bytes32 proofElement = _proof[i];
            if (computedHash <= proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }
        return computedHash == _root;
    }
}
