# Vinci Smart Contract

This is the code repository of the Vinci ERC20 smart contract. Vinci is a
standard ERC20 contract with a supply of 500 million tokens (at 18 decimals).

All tokens are owned by the contract upon deployment. The first important
functionality is the ability to lock tokens for a given benificiary for a
certain amount of time. Once the contract is deployed, the tokens will be
locked according to

 * The vesting schedule mentioned in the Whitepaper
 * Bilateral agreements with early investors

The second important functionality is to create a sales contract that allows
buying of VIN for a given price. The exchange asset can be specified on
contract creation, as well as the price. The latter is specified in amount
exchange asset per 1 Token VIN (10**18 amount).

A sale contract has a releaseTime. If that is in the future at the instant of
sale, a TokenTimelock contract will be created - otherwise the VIN will be
directly paid out.

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
