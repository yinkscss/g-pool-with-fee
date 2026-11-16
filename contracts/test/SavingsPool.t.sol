// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, Actor} from "@goodbuild/Test.sol";
import {MockGoodDollar} from "@goodbuild/MockGoodDollar.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SavingsPool} from "../SavingsPool.sol";

contract SavingsPoolTest is Test {
    MockGoodDollar gd;
    SavingsPool pool;
    Actor alice;
    Actor bob;

    function setUp() public {
        gd = new MockGoodDollar();
        pool = new SavingsPool(gd);
        alice = newActor();
        bob = newActor();
        gd.mint(address(alice), 1_000e18);
        gd.mint(address(bob), 1_000e18);
    }

    function _join(Actor who, uint256 amount) internal {
        who.exec(address(gd), abi.encodeCall(gd.approve, (address(pool), amount)));
        who.exec(address(pool), abi.encodeCall(pool.joinPool, (amount)));
    }

    function testJoinAndExitOwnBalance() public {
        _join(alice, 100e18);
        assertEq(pool.balanceOf(address(alice)), 100e18, "balance after join");
        assertEq(pool.totalDeposits(), 100e18, "total after join");
        assertEq(pool.memberCount(), 1, "member count");

        alice.exec(address(pool), abi.encodeCall(pool.exitPool, (40e18)));
        assertEq(pool.balanceOf(address(alice)), 60e18, "balance after partial exit");
        assertEq(gd.balanceOf(address(alice)), 940e18, "wallet back after exit");
        assertEq(pool.totalDeposits(), 60e18, "total after exit");

        alice.exec(address(pool), abi.encodeCall(pool.exitPool, (60e18)));
        assertEq(pool.balanceOf(address(alice)), 0, "empty balance");
        assertEq(gd.balanceOf(address(alice)), 1_000e18, "wallet fully back");
        assertEq(pool.memberCount(), 0, "no members");
        assertEq(pool.totalDeposits(), 0, "empty pool");
    }

    function testJoinWithTransferAndCall() public {
        alice.exec(address(gd), abi.encodeCall(gd.transferAndCall, (address(pool), 50e18, "")));
        assertEq(pool.balanceOf(address(alice)), 50e18, "balance after one-step join");
        assertEq(pool.totalDeposits(), 50e18, "total after one-step join");
    }

    function testFeeIsTakenOnExit() public {
        _join(alice, 100e18);
        pool.setFee(500);
        uint256 ownerBefore = gd.balanceOf(address(this));

        alice.exec(address(pool), abi.encodeCall(pool.exitPool, (100e18)));

        assertEq(gd.balanceOf(address(alice)), 1_000e18 - 5e18, "member pays the 5% fee");
        assertEq(gd.balanceOf(address(this)) - ownerBefore, 5e18, "owner keeps the fee");
        assertEq(pool.totalDeposits(), 0, "pool empty");
    }

    function testSetFeeGuards() public {
        expectRevert(alice, address(pool), abi.encodeCall(pool.setFee, (100)), "only owner sets fee");
        bool reverted;
        try pool.setFee(501) {
            reverted = false;
        } catch {
            reverted = true;
        }
        assertTrue(reverted, "fee above 5%");
        pool.setFee(500);
        assertEq(pool.feeBps(), 500, "5% allowed");
    }

    function testCannotExitMoreThanBalance() public {
        _join(bob, 10e18);
        expectRevert(bob, address(pool), abi.encodeCall(pool.exitPool, (11e18)), "over balance");
        expectRevert(bob, address(pool), abi.encodeCall(pool.exitPool, (0)), "zero exit");
    }

    function testOnlyGoodDollarCanCredit() public {
        expectRevert(alice, address(pool), abi.encodeCall(pool.onTokenTransfer, (address(alice), 1e18, "")), "not gd");
    }

    // ---- exploit tests -------------------------------------------------------

    /// @notice A stranger tries the pool's admin and value-moving calls; every one must fail
    ///         and the pool's ledger must stay exactly as it was.
    function testExploitUnauthorizedCall() public {
        _join(alice, 100e18);

        // 1. a stranger cannot change the exit fee
        expectRevert(bob, address(pool), abi.encodeCall(pool.setFee, (100)), "stranger cannot set the fee");
        assertEq(pool.feeBps(), 0, "fee unchanged");

        // 2. a stranger cannot take another member's G$ out (exitPool only moves msg.sender's own line)
        expectRevert(bob, address(pool), abi.encodeCall(pool.exitPool, (100e18)), "cannot exit another balance");
        assertEq(pool.balanceOf(address(alice)), 100e18, "alice keeps her balance");
        assertEq(pool.totalDeposits(), 100e18, "ledger untouched");
        assertEq(gd.balanceOf(address(bob)), 1_000e18, "bob gained nothing");

        // 3. a stranger cannot call the G$ hook to credit himself for free
        expectRevert(
            bob,
            address(pool),
            abi.encodeCall(pool.onTokenTransfer, (address(bob), 100e18, "")),
            "hook is G$ only"
        );
        assertEq(pool.balanceOf(address(bob)), 0, "no free balance");
        assertEq(pool.totalDeposits(), 100e18, "ledger still untouched");
    }

    /// @notice A hostile token calls the receiver back while the pool is paying out.
    ///         The attacker tries to withdraw again mid-payout and must get nothing extra.
    function testExploitReentrancy() public {
        HookedToken token = new HookedToken();
        SavingsPool hookedPool = new SavingsPool(IERC20(address(token)));
        ReenterOnPayout attacker = new ReenterOnPayout(hookedPool, token);

        token.mint(address(attacker), 100e18);
        attacker.join(100e18);
        assertEq(hookedPool.balanceOf(address(attacker)), 100e18, "attacker joined");

        attacker.exit(40e18);

        assertEq(attacker.attempts(), 1, "the token called back during the payout");
        assertTrue(!attacker.reentrySucceeded(), "the reentrant exit was refused");
        assertEq(token.balanceOf(address(attacker)), 40e18, "exactly one payout arrived");
        assertEq(hookedPool.balanceOf(address(attacker)), 60e18, "the rest is still in the pool");
        assertEq(hookedPool.totalDeposits(), 60e18, "pool ledger matches");
        assertEq(token.balanceOf(address(hookedPool)), 60e18, "no G$ left the pool");
    }
}

/// @dev A token that calls the receiver's ERC-677 hook on every transfer, so a payout can reenter.
contract HookedToken {
    error TestInsufficientBalance();
    error TestInsufficientAllowance();

    string public constant name = "Hooked G$";
    string public constant symbol = "hG$";
    uint8 public constant decimals = 18;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _move(msg.sender, to, amount);
        if (to.code.length > 0) {
            // The hook may revert (or be reentered) without breaking the transfer itself.
            try IERC677Receiver(to).onTokenTransfer(msg.sender, amount, "") {} catch {}
        }
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            if (allowed < amount) revert TestInsufficientAllowance();
            allowance[from][msg.sender] = allowed - amount;
        }
        _move(from, to, amount);
        return true;
    }

    function _move(address from, address to, uint256 amount) private {
        uint256 held = balanceOf[from];
        if (held < amount) revert TestInsufficientBalance();
        balanceOf[from] = held - amount;
        balanceOf[to] += amount;
    }
}

/// @dev A member contract that tries to withdraw twice while the pool is paying it out.
contract ReenterOnPayout {
    SavingsPool public immutable pool;
    HookedToken public immutable token;
    uint256 public attempts;
    bool public reentrySucceeded;

    constructor(SavingsPool pool_, HookedToken token_) {
        pool = pool_;
        token = token_;
    }

    function join(uint256 amount) external {
        token.approve(address(pool), amount);
        pool.joinPool(amount);
    }

    function exit(uint256 amount) external {
        pool.exitPool(amount);
    }

    /// @dev Runs while the pool is mid-transfer to this contract.
    function onTokenTransfer(address, uint256, bytes calldata) external returns (bool) {
        attempts += 1;
        try pool.exitPool(pool.balanceOf(address(this))) {
            reentrySucceeded = true;
        } catch {}
        return true;
    }
}

interface IERC677Receiver {
    function onTokenTransfer(address from, uint256 amount, bytes calldata data) external returns (bool);
}
