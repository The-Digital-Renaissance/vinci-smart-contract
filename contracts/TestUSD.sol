// SPDX-License-Identifier: MIT
pragma solidity >=0.8.9 <0.9.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

/**
 * Contract used for unit tests
 */
contract TestUSD is ERC20 {
    constructor() ERC20("TestUSD", "TUSD") {}

    function mint(uint256 amount) public {
        _mint(_msgSender(), amount);
    }
}
