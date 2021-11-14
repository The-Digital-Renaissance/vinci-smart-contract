// SPDX-License-Identifier: MIT
pragma solidity >=0.8.9 <0.9.0;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/utils/TokenTimelock.sol";

contract VinciSale is Ownable {
    IERC20 public exchangeAsset;
    IERC20 public vinciContract;
    uint256 public vinciPrice;
    uint256 public releaseTime;

    event TokenLocked(
        address indexed beneficiary,
        uint256 amount,
        uint256 releaseTime,
        address contractAddress
    );

    constructor(
        IERC20 exchangeAsset_,
        IERC20 vinciContract_,
        uint256 vinciPrice_,
        uint256 releaseTime_,
        address owner_
    ) {
        exchangeAsset = exchangeAsset_;
        vinciContract = vinciContract_;
        vinciPrice = vinciPrice_;
        releaseTime = releaseTime_;
        transferOwnership(owner_);
    }

    function buy(uint256 numberVinciTokens) public {
        uint256 amountVinci = numberVinciTokens * 10**18;
        uint256 cost = vinciPrice * numberVinciTokens;

        require(
            vinciContract.balanceOf(address(this)) >= amountVinci,
            "Not enough vinci to buy in contract"
        );
        require(
            exchangeAsset.balanceOf(msg.sender) >= cost,
            "Sender doesn't have enough to pay"
        );

        exchangeAsset.transferFrom(msg.sender, address(this), cost);

        if (releaseTime <= block.timestamp) {
            // No timelock
            vinciContract.transfer(_msgSender(), amountVinci);
        } else {
            TokenTimelock token_timelock_contract = new TokenTimelock(
                vinciContract,
                _msgSender(),
                releaseTime
            );

            emit TokenLocked(
                _msgSender(),
                amountVinci,
                releaseTime,
                address(token_timelock_contract)
            );

            vinciContract.transfer(
                address(token_timelock_contract),
                amountVinci
            );
        }
    }

    function getProceeds() public onlyOwner {
        uint256 amount = exchangeAsset.balanceOf(address(this));
        exchangeAsset.transfer(owner(), amount);
    }

    function getVinci() public onlyOwner {
        uint256 amount = vinciContract.balanceOf(address(this));
        vinciContract.transfer(owner(), amount);
    }
}
