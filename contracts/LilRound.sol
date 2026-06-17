// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IERC721 {
    function transferFrom(address from, address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
    function approve(address to, uint256 tokenId) external;
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
contract LilRound {
    enum State { NotStarted, AcceptingProposals, Voting, Completed, Cancelled }

    struct Proposal {
        address proposer;
        string title;
        string content;
        string tldr;
        uint256 createdAt;
        uint256 votesFor;
        uint256 votesAgainst;
    }

    struct DepositedNFT {
        address nftContract;
        uint256 tokenId;
        uint256 amount;
        bool isERC1155;
        address depositor;
    }

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

    Proposal[] public proposals;
    mapping(uint256 => mapping(address => uint256)) public proposalVotes;   // proposalId → voter → weight
    mapping(uint256 => mapping(address => bool)) public hasVotedOn;          // proposalId → voter → voted
    mapping(uint256 => uint256) public winnerAmounts;                        // proposalId → amount
    mapping(uint256 => bool) public claimed;                                 // proposalId → claimed
    DepositedNFT[] public depositedNFTs;
    mapping(uint256 => uint256[]) public winnerNftIndices;                    // proposalId → nft indices
    mapping(uint256 => bool) public nftClaimed;                               // nft index → claimed
    uint256 public nftDepositCount;

    event RoundStateChanged(State newState);
    event ProposalSubmitted(uint256 indexed proposalId, address indexed proposer, string title);
    event VoteCast(uint256 indexed proposalId, address indexed voter, uint256 weight, bool isFor);
    event WinnersSet(uint256[] proposalIds, uint256[] amounts);
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
        uint256 _voteDuration
    ) {
        require(_owner != address(0), "Owner required");
        require(bytes(_title).length > 0, "Title required");
        require(_numWinners > 0, "Num winners > 0");
        require(_proposalDuration > 0, "Proposal duration > 0");
        require(_voteDuration > 0, "Vote duration > 0");

        owner = _owner;
        houseId = _houseId;
        title = _title;
        description = _description;
        numWinners = _numWinners;
        createdAt = block.timestamp;
        proposalEndTimestamp = block.timestamp + _proposalDuration;
        votingEndTimestamp = proposalEndTimestamp + _voteDuration;

        emit RoundStateChanged(State.AcceptingProposals);
    }

    /// @notice Derive the current state from block.timestamp vs deadlines
    function currentState() public view returns (State) {
        if (cancelled) return State.Cancelled;
        if (completed) return State.Completed;
        if (block.timestamp < proposalEndTimestamp) return State.AcceptingProposals;
        if (block.timestamp < votingEndTimestamp) return State.Voting;
        return State.Completed;
    }

    // ==================== ROUND LIFECYCLE ====================

    /// @notice Cancel the round (owner only, before finalizing)
    function cancel() external onlyOwner {
        require(!cancelled && !completed, "Cannot cancel");
        cancelled = true;
        emit RoundCancelled();
        emit RoundStateChanged(State.Cancelled);
    }

    /// @notice Set winners and finalize the round (owner only, after voting ends)
    function setWinners(uint256[] calldata _proposalIds, uint256[] calldata _amounts) external onlyOwner {
        require(block.timestamp >= votingEndTimestamp, "Voting still open");
        require(!cancelled, "Round cancelled");
        require(!completed, "Already completed");
        require(_proposalIds.length == _amounts.length, "Length mismatch");
        require(_proposalIds.length <= numWinners, "Too many winners");

        for (uint256 i = 0; i < _proposalIds.length; i++) {
            require(_proposalIds[i] < proposals.length, "Invalid proposal");
            winnerAmounts[_proposalIds[i]] = _amounts[i];
        }

        completed = true;
        completedAt = block.timestamp;

        emit WinnersSet(_proposalIds, _amounts);
        emit RoundStateChanged(State.Completed);
    }

    // ==================== USER ACTIONS ====================

    /// @notice Submit a proposal (full content stored on-chain)
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

    /// @notice Vote on a proposal (one vote per proposal per voter)
    function vote(uint256 _proposalId, uint256 _weight, bool _isFor) external {
        require(block.timestamp >= proposalEndTimestamp, "Voting not open");
        require(block.timestamp < votingEndTimestamp, "Voting closed");
        require(!cancelled && !completed, "Round not active");
        require(_proposalId < proposals.length, "Invalid proposal");
        require(_weight > 0, "Weight must be > 0");
        require(!hasVotedOn[_proposalId][msg.sender], "Already voted");

        hasVotedOn[_proposalId][msg.sender] = true;
        proposalVotes[_proposalId][msg.sender] = _weight;

        if (_isFor) {
            proposals[_proposalId].votesFor += _weight;
        } else {
            proposals[_proposalId].votesAgainst += _weight;
        }

        emit VoteCast(_proposalId, msg.sender, _weight, _isFor);
    }

    /// @notice Claim an award + any assigned NFTs (winners only)
    function claim(uint256 _proposalId) external {
        require(completed, "Round not finalized");
        require(_proposalId < proposals.length, "Invalid proposal");
        require(proposals[_proposalId].proposer == msg.sender, "Not your proposal");
        require(winnerAmounts[_proposalId] > 0, "Not a winner");
        require(!claimed[_proposalId], "Already claimed");

        claimed[_proposalId] = true;

        // Transfer ETH
        uint256 amount = winnerAmounts[_proposalId];
        if (amount > 0 && address(this).balance >= amount) {
            (bool success, ) = payable(msg.sender).call{value: amount}("");
            require(success, "ETH transfer failed");
        }

        // Transfer assigned NFTs
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

        emit AwardClaimed(_proposalId, msg.sender, amount);
    }

    // ==================== FUNDING ====================

    /// @notice Deposit ETH into the round
    function deposit() external payable {
        require(!cancelled && !completed, "Round finalized");
        require(msg.value > 0, "Must deposit ETH");
        totalDeposited += msg.value;
        emit DepositReceived(msg.sender, msg.value);
    }

    /// @notice Deposit ERC20 tokens into the round (caller must approve first)
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

    /// @notice Deposit an ERC721 NFT into the round (caller must approve first)
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

    /// @notice Deposit ERC1155 tokens into the round (caller must setApprovalForAll first)
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

    /// @notice Assign deposited NFTs to a winning proposal (owner only, after setWinners)
    function setWinnerNfts(uint256 _proposalId, uint256[] calldata _nftIndices) external onlyOwner {
        require(completed, "Round not finalized");
        require(_proposalId < proposals.length, "Invalid proposal");
        require(winnerAmounts[_proposalId] > 0, "Not a winner");

        for (uint256 i = 0; i < _nftIndices.length; i++) {
            require(_nftIndices[i] < depositedNFTs.length, "Invalid NFT index");
            require(!nftClaimed[_nftIndices[i]], "NFT already claimed/assigned");
            nftClaimed[_nftIndices[i]] = true;
        }

        winnerNftIndices[_proposalId] = _nftIndices;
    }

    /// @notice Accept ETH directly
    receive() external payable {
        totalDeposited += msg.value;
        emit DepositReceived(msg.sender, msg.value);
    }

    // ==================== VIEWS ====================

    /// @notice Get the total number of proposals
    function proposalCount() external view returns (uint256) {
        return proposals.length;
    }

    /// @notice Get a single proposal by ID
    function getProposal(uint256 _proposalId) external view returns (Proposal memory) {
        require(_proposalId < proposals.length, "Invalid proposal");
        return proposals[_proposalId];
    }

    /// @notice Get all proposals (may be expensive if many)
    function getAllProposals() external view returns (Proposal[] memory) {
        return proposals;
    }

    /// @notice Get the vote weight cast by a voter on a proposal
    function getVoteWeight(address _voter, uint256 _proposalId) external view returns (uint256) {
        return proposalVotes[_proposalId][_voter];
    }

    /// @notice Get all deposited NFTs
    function getAllDepositedNFTs() external view returns (DepositedNFT[] memory) {
        return depositedNFTs;
    }
}
