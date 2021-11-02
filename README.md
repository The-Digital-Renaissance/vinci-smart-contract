# Vinci Smart Contract

This is the code repository of the Vinci ERC20 smart contract. Vinci is a
standard ERC20 contract with a supply of 500 million tokens (at 18 decimals).

All tokens are owned by the contract upon deployment. The only important
functionality is the ability to lock tokens for a given benificiary for a
certain amount of time. Once the contract is deployed, the tokens will be
locked according to

 * The vesting schedule mentioned in the Whitepaper
 * Bileteral agreements with early investors


## Technical Considerations

By relying on OpenZeppelin's ERC20 and `TokenTimelock` contract, almost
no custom code has to be written. Using `TokenTimelock` to lock the tokens
has the additional benefit that it also allows to lock multiple stakes
for a single address, with different time to expires. The drawback is
that deploying a new contract is costly.


# CI
Our CI ensures
* Linting via prettier
* 100% Unit test coverage

# CD
Merging to the branch `testnet` automatically deploys a contract to the Ropsten
testnet.
