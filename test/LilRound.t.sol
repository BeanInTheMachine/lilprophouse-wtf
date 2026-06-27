// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {LilRound} from "../contracts/LilRound.sol";

interface Vm {
    function warp(uint256) external;
    function deal(address, uint256) external;
    function prank(address) external;
    function expectRevert() external;
}

contract MockERC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amt) external {
        balanceOf[to] += amt;
    }

    function approve(address spender, uint256 amt) external returns (bool) {
        allowance[msg.sender][spender] = amt;
        return true;
    }

    function transfer(address to, uint256 amt) external returns (bool) {
        balanceOf[msg.sender] -= amt;
        balanceOf[to] += amt;
        return true;
    }

    function transferFrom(address from, address to, uint256 amt) external returns (bool) {
        allowance[from][msg.sender] -= amt;
        balanceOf[from] -= amt;
        balanceOf[to] += amt;
        return true;
    }
}

contract MockERC721 {
    mapping(uint256 => address) public ownerOf;
    mapping(uint256 => address) public getApproved;
    mapping(address => mapping(address => bool)) public isApprovedForAll;
    mapping(address => uint256) public balanceOf;

    function mint(address to, uint256 id) external {
        ownerOf[id] = to;
        balanceOf[to] += 1;
    }

    function setApprovalForAll(address op, bool ok) external {
        isApprovedForAll[msg.sender][op] = ok;
    }

    function transferFrom(address from, address to, uint256 id) external {
        require(ownerOf[id] == from, "not owner");
        require(
            msg.sender == from || getApproved[id] == msg.sender || isApprovedForAll[from][msg.sender],
            "not approved"
        );
        ownerOf[id] = to;
        balanceOf[from] -= 1;
        balanceOf[to] += 1;
        getApproved[id] = address(0);
    }
}

contract ReentrantFunder {
    LilRound public round;

    constructor(LilRound r) {
        round = r;
    }

    function fund() external payable {
        round.deposit{value: msg.value}();
    }

    function attack() external {
        round.refundEth();
    }

    receive() external payable {
        round.refundEth();
    }
}

contract LilRoundRefundTest {
    Vm constant vm = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    address owner = address(0xA11CE);
    address funderA = address(0xB0B);
    address funderB = address(0xCAFE);
    address proposer = address(0xD00D);

    function setUp() public {
        vm.warp(1_000_000);
        vm.deal(address(this), 1000 ether);
        vm.deal(funderA, 100 ether);
        vm.deal(funderB, 100 ether);
    }

    function _deployEth(uint256 numWinners, uint256 amountPerWinner) internal returns (LilRound) {
        LilRound.AwardConfig[] memory cfgs = new LilRound.AwardConfig[](numWinners);
        for (uint256 i = 0; i < numWinners; i++) {
            cfgs[i] = LilRound.AwardConfig({
                assetType: LilRound.AssetType.ETH,
                tokenAddress: address(0),
                tokenId: 0,
                amountPerWinner: amountPerWinner
            });
        }
        return new LilRound(
            owner, 1, "Test Round", "desc", numWinners,
            1 days, 1 days,
            LilRound.VoteStrategyType.BALANCE_OF_ERC20,
            address(0), 0, 1, bytes32(0), cfgs
        );
    }

    function _eq(uint256 a, uint256 b, string memory m) internal pure {
        require(a == b, m);
    }

    // 1. Cancelled round -> exact ETH refund
    function testCancelEthRefund() public {
        LilRound r = _deployEth(1, 1 ether);
        vm.prank(funderA);
        r.deposit{value: 5 ether}();
        _eq(address(r).balance, 5 ether, "deposit balance");
        _eq(r.ethDepositOf(funderA), 5 ether, "credited");

        vm.prank(owner);
        r.cancel();

        uint256 before = funderA.balance;
        vm.prank(funderA);
        r.refundEth();
        _eq(funderA.balance - before, 5 ether, "refunded amount");
        _eq(address(r).balance, 0, "drained");
        _eq(r.ethDepositOf(funderA), 0, "zeroed");
    }

    // 2. Empty round (no proposals), voting ended -> exact refund, no finalize needed
    function testEmptyEndedEthRefund() public {
        LilRound r = _deployEth(1, 1 ether);
        vm.prank(funderA);
        r.deposit{value: 2 ether}();

        vm.warp(block.timestamp + 2 days + 1); // past votingEndTimestamp

        uint256 before = funderA.balance;
        vm.prank(funderA);
        r.refundEth();
        _eq(funderA.balance - before, 2 ether, "refunded");
    }

    // 3. Multiple funders cancelled -> each exact; double refund reverts
    function testMultiFunderRefundAndDoubleRefundReverts() public {
        LilRound r = _deployEth(1, 1 ether);
        vm.prank(funderA);
        r.deposit{value: 1 ether}();
        vm.prank(funderB);
        r.deposit{value: 3 ether}();

        vm.prank(owner);
        r.cancel();

        uint256 aBefore = funderA.balance;
        vm.prank(funderA);
        r.refundEth();
        _eq(funderA.balance - aBefore, 1 ether, "A exact");

        uint256 bBefore = funderB.balance;
        vm.prank(funderB);
        r.refundEth();
        _eq(funderB.balance - bBefore, 3 ether, "B exact");

        vm.prank(funderA);
        vm.expectRevert();
        r.refundEth();
    }

    // 4. Refund not open on an active round
    function testRefundNotOpenReverts() public {
        LilRound r = _deployEth(1, 1 ether);
        vm.prank(funderA);
        r.deposit{value: 1 ether}();

        vm.prank(funderA);
        vm.expectRevert();
        r.refundEth();
    }

    // 5. ERC20 full refund on cancel
    function testCancelTokenRefund() public {
        LilRound r = _deployEth(1, 1 ether);
        MockERC20 token = new MockERC20();
        token.mint(funderA, 100 ether);

        vm.prank(funderA);
        token.approve(address(r), 100 ether);
        vm.prank(funderA);
        r.depositToken(address(token), 40 ether);
        _eq(token.balanceOf(address(r)), 40 ether, "token deposited");

        vm.prank(owner);
        r.cancel();

        vm.prank(funderA);
        r.refundToken(address(token));
        _eq(token.balanceOf(funderA), 100 ether, "token returned");
        _eq(token.balanceOf(address(r)), 0, "token drained");
    }

    // 6. NFT returned to depositor on cancel
    function testCancelNftRefund() public {
        LilRound r = _deployEth(1, 1 ether);
        MockERC721 nft = new MockERC721();
        nft.mint(funderA, 7);

        vm.prank(funderA);
        nft.setApprovalForAll(address(r), true);
        vm.prank(funderA);
        r.depositERC721(address(nft), 7);
        _eq(uint256(uint160(nft.ownerOf(7))), uint256(uint160(address(r))), "nft in round");

        vm.prank(owner);
        r.cancel();

        vm.prank(funderA);
        r.refundNft(0);
        _eq(uint256(uint160(nft.ownerOf(7))), uint256(uint160(funderA)), "nft returned");
    }

    // 7. Normal round with winner -> only true excess refundable after window; winner keeps award
    function testExcessRefundAfterWindow() public {
        LilRound r = _deployEth(1, 1 ether); // award 1 ETH to 1 winner
        vm.prank(funderA);
        r.deposit{value: 3 ether}(); // over-funded by 2 ETH

        // create a proposal during proposal window
        vm.prank(proposer);
        r.propose("Title", "content", "tldr");

        // finalize after voting ends, proposal 0 wins
        vm.warp(block.timestamp + 2 days + 1);
        uint256[] memory winners = new uint256[](1);
        winners[0] = 0;
        r.finalizeRound(winners);
        _eq(r.winnersAssigned(), 1, "winner assigned");

        // before window: excess refund must revert
        vm.prank(funderA);
        vm.expectRevert();
        r.refundExcessEth();

        // pass the 14 day claim window
        vm.warp(block.timestamp + 14 days + 1);

        // winner claims their 1 ETH award
        uint256 pBefore = proposer.balance;
        vm.prank(proposer);
        r.claim(0);
        _eq(proposer.balance - pBefore, 1 ether, "winner award");

        // funder reclaims the 2 ETH excess (only)
        uint256 aBefore = funderA.balance;
        vm.prank(funderA);
        r.refundExcessEth();
        _eq(funderA.balance - aBefore, 2 ether, "excess only");
        _eq(address(r).balance, 0, "fully settled");

        // double-dip reverts
        vm.prank(funderA);
        vm.expectRevert();
        r.refundExcessEth();
    }

    // 8. Reentrancy attempt on refundEth is blocked
    function testReentrancyBlocked() public {
        LilRound r = _deployEth(1, 1 ether);
        ReentrantFunder attacker = new ReentrantFunder(r);
        vm.deal(address(attacker), 1 ether);
        attacker.fund{value: 1 ether}();

        vm.prank(owner);
        r.cancel();

        vm.expectRevert();
        attacker.attack();
    }
}
