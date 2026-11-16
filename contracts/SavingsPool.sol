// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SavingsPool
/// @notice A shared G$ savings pool on Celo. Members add G$ with joinPool and take their own G$
///         back out with exitPool (or withdraw for the full balance). The owner may set an exit
///         fee of at most 5% (500 basis points), paid to the owner when a member exits.
///         Only the fees and a member's own deposit ever leave the pool.
contract SavingsPool is ReentrancyGuard {
    using SafeERC20 for IERC20;

    error ZeroAmount();
    error NotGoodDollar();
    error NotOwner();
    error FeeTooHigh();
    error InsufficientBalance();

    /// @notice The G$ token members save in.
    IERC20 public immutable gd;
    /// @notice The pool owner, who receives exit fees.
    address public immutable owner;
    /// @notice The highest exit fee the owner may set, in basis points (500 = 5%).
    uint256 public constant MAX_FEE_BPS = 500;
    uint256 private constant BPS_DENOMINATOR = 10_000;

    /// @notice The current exit fee in basis points (100 = 1%).
    uint256 public feeBps;
    /// @notice Total G$ held by the pool for its members.
    uint256 public totalDeposits;
    /// @notice How many wallets currently have G$ in the pool.
    uint256 public memberCount;

    /// @notice The G$ each wallet has in the pool, in the token's smallest unit.
    mapping(address => uint256) public balanceOf;
    mapping(address => bool) private inPool;

    event Joined(address indexed member, uint256 amount);
    event Exited(address indexed member, uint256 amount, uint256 fee);
    event FeeUpdated(uint256 feeBps);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /// @param gd_ The G$ token on this network.
    constructor(IERC20 gd_) {
        gd = gd_;
        owner = msg.sender;
    }

    /// @notice Put G$ into the pool. Approve this contract for `amount` first.
    /// @param amount How much G$ to save, in the token's smallest unit.
    function joinPool(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        gd.safeTransferFrom(msg.sender, address(this), amount);
        _credit(msg.sender, amount);
    }

    /// @notice ERC-677 hook: save G$ in one transaction with gd.transferAndCall(pool, amount, "").
    /// @dev The amount arrives with the transfer, so the `from` wallet is the one credited.
    function onTokenTransfer(address from, uint256 amount, bytes calldata) external nonReentrant returns (bool) {
        if (msg.sender != address(gd)) revert NotGoodDollar();
        _credit(from, amount);
        return true;
    }

    /// @notice Take your own G$ back out. The current exit fee is kept by the owner.
    /// @param amount How much G$ to take out of your own balance, in the token's smallest unit.
    function exitPool(uint256 amount) external nonReentrant {
        _exit(msg.sender, amount);
    }

    /// @notice Take your whole balance out of the pool in one call.
    function withdraw() external nonReentrant {
        _exit(msg.sender, balanceOf[msg.sender]);
    }

    /// @notice Set the exit fee, in basis points (100 = 1%). Cannot exceed 500 (5%).
    /// @param feeBps_ The new fee in basis points.
    function setFee(uint256 feeBps_) external onlyOwner {
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh();
        feeBps = feeBps_;
        emit FeeUpdated(feeBps_);
    }

    /// @notice What an exit of `amount` would pay out, and the fee the owner keeps.
    /// @param member The wallet exiting.
    /// @param amount How much of that wallet's balance would leave the pool.
    function quoteExit(address member, uint256 amount) external view returns (uint256 payout, uint256 fee) {
        uint256 held = balanceOf[member];
        if (amount > held) amount = held;
        fee = (amount * feeBps) / BPS_DENOMINATOR;
        payout = amount - fee;
    }

    /// @notice A wallet's share of the pool, in basis points (1000 = 10%).
    function shareOf(address member) external view returns (uint256) {
        uint256 total = totalDeposits;
        if (total == 0) return 0;
        return (balanceOf[member] * BPS_DENOMINATOR) / total;
    }

    function _credit(address member, uint256 amount) private {
        if (amount == 0) revert ZeroAmount();
        balanceOf[member] += amount;
        totalDeposits += amount;
        if (!inPool[member]) {
            inPool[member] = true;
            memberCount += 1;
        }
        emit Joined(member, amount);
    }

    function _exit(address member, uint256 amount) private {
        if (amount == 0) revert ZeroAmount();
        uint256 held = balanceOf[member];
        if (amount > held) revert InsufficientBalance();

        uint256 fee = (amount * feeBps) / BPS_DENOMINATOR;
        uint256 payout = amount - fee;

        balanceOf[member] = held - amount;
        totalDeposits -= amount;
        if (balanceOf[member] == 0 && inPool[member]) {
            inPool[member] = false;
            memberCount -= 1;
        }

        gd.safeTransfer(member, payout);
        if (fee > 0) gd.safeTransfer(owner, fee);
        emit Exited(member, amount, fee);
    }
}
