// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

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
        uint256 requestedAmount;
        uint256 createdAt;
        uint256 votesFor;
        uint256 votesAgainst;
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
    bool public completed;
    bool public cancelled;

    Proposal[] public proposals;
    mapping(uint256 => mapping(address => uint256)) public proposalVotes;   // proposalId → voter → weight
    mapping(uint256 => mapping(address => bool)) public hasVotedOn;          // proposalId → voter → voted
    mapping(uint256 => uint256) public winnerAmounts;                        // proposalId → amount
    mapping(uint256 => bool) public claimed;                                 // proposalId → claimed

    event RoundStateChanged(State newState);
    event ProposalSubmitted(uint256 indexed proposalId, address indexed proposer, string title);
    event VoteCast(uint256 indexed proposalId, address indexed voter, uint256 weight, bool isFor);
    event WinnersSet(uint256[] proposalIds, uint256[] amounts);
    event AwardClaimed(uint256 indexed proposalId, address indexed winner, uint256 amount);
    event DepositReceived(address indexed depositor, uint256 amount);
    event RoundCancelled();

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
        if (block.timestamp >= votingEndTimestamp) return State.Voting;
        if (block.timestamp >= proposalEndTimestamp) return State.Voting;
        return State.AcceptingProposals;
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
        string calldata _tldr,
        uint256 _requestedAmount
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
            requestedAmount: _requestedAmount,
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

    /// @notice Claim an award (winners only)
    function claim(uint256 _proposalId) external {
        require(completed, "Round not finalized");
        require(_proposalId < proposals.length, "Invalid proposal");
        require(proposals[_proposalId].proposer == msg.sender, "Not your proposal");
        require(winnerAmounts[_proposalId] > 0, "Not a winner");
        require(!claimed[_proposalId], "Already claimed");
        require(address(this).balance >= winnerAmounts[_proposalId], "Insufficient balance");

        claimed[_proposalId] = true;
        uint256 amount = winnerAmounts[_proposalId];

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");

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
}
