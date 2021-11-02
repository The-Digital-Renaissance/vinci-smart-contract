// SPDX-License-Identifier: MIT
pragma solidity >=0.8.9 <0.9.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/utils/TokenTimelock.sol";

contract Vinci is ERC20, Ownable {
    constructor() ERC20("Vinci", "VINCI") {
        _mint(address(this), 500 * 10**6 * 10**18);
    }

    event TokenLocked(
        address indexed beneficiary,
        uint256 amount,
        uint256 releaseTime,
        address contractAddress
    );

    /**
     * @dev Creates new TokenTimelock contract (from openzeppelin) and
     * locks `amount` tokens in it.
     *
     * The arguments `beneficiary` and `releaseTime` are passed to the
     * TokenTimelock contract. Returns the address of the newly created
     * TokenTimelock contract.
     *
     * Emits a {TokenLocked} event.
     *
     * Requirements:
     *
     * - `beneficiary` cannot be the zero address.
     * - `releaseTime` must be in the future (compared to `block.timestamp`).
     */
    function lockTokens(
        address beneficiary,
        uint256 amount,
        uint256 releaseTime
    ) public onlyOwner returns (address) {
        TokenTimelock token_timelock_contract = new TokenTimelock(
            IERC20(this),
            beneficiary,
            releaseTime
        );

        _transfer(address(this), address(token_timelock_contract), amount);

        emit TokenLocked(
            beneficiary,
            amount,
            releaseTime,
            address(token_timelock_contract)
        );

        return address(token_timelock_contract);
    }
}
