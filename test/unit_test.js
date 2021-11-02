const Vinci = artifacts.require("Vinci");
const TokenTimelock = artifacts.require("TokenTimelock");
const truffleAssert = require("truffle-assertions");
const BN = require("bn.js");

const retrieveContractAddressFromTx = (tx) =>
  tx.logs.filter((log) => !!log.args.contractAddress)[0].args.contractAddress;

contract("Unit Tests", async (accounts) => {
  it("Correctly deploys", async () => {
    const vinci = await Vinci.deployed();
    assert.equal(await vinci.symbol.call(), "VIN");
  });

  it("Owner is set to deployer", async () => {
    const vinci = await Vinci.deployed();
    const owner = await vinci.owner();
    assert.equal(owner, accounts[0]);
  });

  it("Tokens are minted", async () => {
    const vinci = await Vinci.deployed();
    const amount = await vinci.balanceOf.call(vinci.address);
    const decimals = await vinci.decimals.call();
    const supply = new BN(500).mul(new BN(10).pow(new BN(6)));
    const factor = new BN(10).pow(decimals);
    assert.isTrue(amount.eq(supply.mul(factor)));
  });

  it("Only owner can call lockTokens", async () => {
    const vinci = await Vinci.deployed();
    const latest = await web3.eth.getBlock("latest");

    truffleAssert.reverts(
      vinci.lockTokens(accounts[1], 1, latest.timestamp + 60, {
        from: accounts[1],
      })
    );

    await vinci.lockTokens(accounts[1], 1, latest.timestamp + 60, {
      from: accounts[0],
    });
  });

  it("lockTokens emits TokenLocked", async () => {
    const vinci = await Vinci.deployed();
    const latest = await web3.eth.getBlock("latest");

    const tx = await vinci.lockTokens(accounts[1], 1, latest.timestamp + 60, {
      from: accounts[0],
    });

    truffleAssert.eventEmitted(
      tx,
      "TokenLocked",
      (ev) =>
        ev.beneficiary == accounts[1] &&
        ev.amount.toNumber() == 1 &&
        ev.releaseTime == latest.timestamp + 60
    );
  });

  it("lockTokens returns TokenTimelock address", async () => {
    const vinci = await Vinci.deployed();
    const latest = await web3.eth.getBlock("latest");

    const tx = await vinci.lockTokens(accounts[1], 1, latest.timestamp + 60, {
      from: accounts[0],
    });
    const address = retrieveContractAddressFromTx(tx);

    const timelockContract = await TokenTimelock.at(address);

    assert.equal(await timelockContract.token(), vinci.address);
    assert.equal(await timelockContract.beneficiary(), accounts[1]);
    assert.equal(await timelockContract.releaseTime(), latest.timestamp + 60);
  });

  it("lockTokens' TokenTimelock address holds the corrent amount of VIN", async () => {
    const vinci = await Vinci.deployed();
    const latest = await web3.eth.getBlock("latest");
    const amount = Math.floor(Math.random() * 10 ** 10) + 1;

    const tx = await vinci.lockTokens(
      accounts[1],
      amount,
      latest.timestamp + 60,
      {
        from: accounts[0],
      }
    );
    const address = retrieveContractAddressFromTx(tx);

    const timelockContract = await TokenTimelock.at(address);

    assert.equal(await vinci.balanceOf.call(address), amount);
  });

  it("lockTokens' TokenTimelock address correctly releases VIN", async () => {
    const vinci = await Vinci.deployed();
    const latest = await web3.eth.getBlock("latest");
    assert.equal(await vinci.balanceOf.call(accounts[2]), 0);

    const tx = await vinci.lockTokens(accounts[2], 1, latest.timestamp + 60, {
      from: accounts[0],
    });
    const address = retrieveContractAddressFromTx(tx);

    const timelockContract = await TokenTimelock.at(address);

    await web3.currentProvider.send(
      {
        method: "evm_increaseTime",
        params: [120],
      },
      () => {}
    );

    await timelockContract.release({ from: accounts[2] });

    assert.equal(await vinci.balanceOf.call(accounts[2]), 1);
  });

  it("Only owner can call withdraw", async () => {
    const vinci = await Vinci.deployed();

    truffleAssert.reverts(
      vinci.withdraw(accounts[3], 1, {
        from: accounts[1],
      })
    );

    await vinci.withdraw(accounts[3], 1, {
      from: accounts[0],
    });
  });

  it("Withdraw withdraws tokens", async () => {
    const vinci = await Vinci.deployed();
    const acc4Amount = await vinci.balanceOf.call(accounts[4]);
    const vinciAmount = await vinci.balanceOf.call(vinci.address);
    const amount = new BN(Math.floor(Math.random() * 10 ** 10) + 1);

    await vinci.withdraw(accounts[4], amount, {
      from: accounts[0],
    });

    assert.isTrue(
      (await vinci.balanceOf.call(accounts[4])).eq(acc4Amount.add(amount))
    );
    assert.isTrue(
      (await vinci.balanceOf.call(vinci.address)).eq(vinciAmount.sub(amount))
    );
  });
});
