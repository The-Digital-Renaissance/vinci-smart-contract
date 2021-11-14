const Vinci = artifacts.require("Vinci");
const TestUSD = artifacts.require("TestUSD");
const VinciSale = artifacts.require("VinciSale");
const TokenTimelock = artifacts.require("TokenTimelock");
const truffleAssert = require("truffle-assertions");
const BN = require("bn.js");

const retrieveContractAddressFromTx = (tx) =>
  tx.logs.filter((log) => !!log.args.contractAddress)[0].args.contractAddress;

const decimals = new BN(10).pow(new BN(18));

contract("Vinci contract", async (accounts) => {
  it("Correctly deploys", async () => {
    const vinci = await Vinci.deployed();
    assert.equal(await vinci.symbol.call(), "VINCI");
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

contract("Vinci sales contract", async (accounts) => {
  it("Correctly creates sales contract", async () => {
    const vinci = await Vinci.deployed();
    const testUSD = await TestUSD.deployed();

    const tx = await vinci.createSalesContract(
      testUSD.address,
      new BN(10).pow(new BN(18)),
      0,
      100,
      {
        from: accounts[0],
      }
    );
    const salesAddress = retrieveContractAddressFromTx(tx);
    const salesContract = await VinciSale.at(salesAddress);
    assert.equal(await salesContract.owner.call(), accounts[0]);
  });

  it("Only owner can create sales contract", async () => {
    const vinci = await Vinci.deployed();
    const testUSD = await TestUSD.deployed();

    truffleAssert.reverts(
      vinci.createSalesContract(
        testUSD.address,
        new BN(10).pow(new BN(18)),
        0,
        100,
        {
          from: accounts[1],
        }
      )
    );
  });

  it("Can buy token from sales contract", async () => {
    const vinci = await Vinci.deployed();
    const testUSD = await TestUSD.deployed();

    const tx = await vinci.createSalesContract(
      testUSD.address,
      decimals,
      0,
      decimals.mul(new BN(1000)),
      {
        from: accounts[0],
      }
    );
    const salesAddress = retrieveContractAddressFromTx(tx);
    const salesContract = await VinciSale.at(salesAddress);

    testUSD.mint(decimals.mul(new BN(1000)), { from: accounts[1] });

    await testUSD.approve(salesContract.address, decimals.mul(new BN(100)), {
      from: accounts[1],
    });
    await salesContract.buy(100, { from: accounts[1] });

    const vinciBal = await vinci.balanceOf.call(accounts[1]);
    const testUSDBal = await testUSD.balanceOf.call(accounts[1]);
    assert.isTrue(vinciBal.eq(decimals.mul(new BN(100))));
    assert.isTrue(testUSDBal.eq(decimals.mul(new BN(900))));
  });

  it("Can buy token from sales contract, price 2.5 / token ", async () => {
    const vinci = await Vinci.deployed();
    const testUSD = await TestUSD.deployed();

    const tx = await vinci.createSalesContract(
      testUSD.address,
      new BN(10).pow(new BN(17)).mul(new BN(25)),
      0,
      decimals.mul(new BN(1000)),
      {
        from: accounts[0],
      }
    );
    const salesAddress = retrieveContractAddressFromTx(tx);
    const salesContract = await VinciSale.at(salesAddress);

    testUSD.mint(decimals.mul(new BN(1000)), { from: accounts[2] });

    await testUSD.approve(salesContract.address, decimals.mul(new BN(300)), {
      from: accounts[2],
    });
    await salesContract.buy(100, { from: accounts[2] });

    const vinciBal = await vinci.balanceOf.call(accounts[2]);
    const testUSDBal = await testUSD.balanceOf.call(accounts[2]);
    assert.isTrue(vinciBal.eq(decimals.mul(new BN(100))));
    assert.isTrue(testUSDBal.eq(decimals.mul(new BN(750))));
  });

  it("Can retrieve unsold vinci", async () => {
    const vinci = await Vinci.deployed();
    const testUSD = await TestUSD.deployed();
    const vinciBal = await vinci.balanceOf.call(accounts[0]);

    const tx = await vinci.createSalesContract(
      testUSD.address,
      decimals,
      0,
      decimals.mul(new BN(1000)),
      {
        from: accounts[0],
      }
    );
    const salesAddress = retrieveContractAddressFromTx(tx);
    const salesContract = await VinciSale.at(salesAddress);

    testUSD.mint(decimals.mul(new BN(1000)), { from: accounts[1] });

    await testUSD.approve(salesContract.address, decimals.mul(new BN(100)), {
      from: accounts[1],
    });
    await salesContract.buy(100, { from: accounts[1] });

    await salesContract.getVinci({ from: accounts[0] });
    const vinciBalNow = await vinci.balanceOf.call(accounts[0]);
    assert.isTrue(vinciBalNow.sub(vinciBal).eq(new BN(900).mul(decimals)));
  });

  it("Can retrieve proceeds of sale", async () => {
    const vinci = await Vinci.deployed();
    const testUSD = await TestUSD.deployed();
    const testUSDBal = await testUSD.balanceOf.call(accounts[0]);

    const tx = await vinci.createSalesContract(
      testUSD.address,
      new BN(10).pow(new BN(17)).mul(new BN(25)),
      0,
      decimals.mul(new BN(1000)),
      {
        from: accounts[0],
      }
    );
    const salesAddress = retrieveContractAddressFromTx(tx);
    const salesContract = await VinciSale.at(salesAddress);

    testUSD.mint(decimals.mul(new BN(1000)), { from: accounts[2] });

    await testUSD.approve(salesContract.address, decimals.mul(new BN(300)), {
      from: accounts[2],
    });
    await salesContract.buy(100, { from: accounts[2] });

    await salesContract.getProceeds({ from: accounts[0] });
    const testUSDBalNow = await testUSD.balanceOf.call(accounts[0]);
    assert.isTrue(testUSDBalNow.sub(testUSDBal).eq(new BN(250).mul(decimals)));
  });

  it("Salescontract creates correct TimelockContract if releaseTime is set", async () => {
    const vinci = await Vinci.deployed();
    const testUSD = await TestUSD.deployed();
    const latest = await web3.eth.getBlock("latest");

    const tx = await vinci.createSalesContract(
      testUSD.address,
      decimals,
      latest.timestamp + 60,
      decimals.mul(new BN(1000)),
      {
        from: accounts[0],
      }
    );
    const salesAddress = retrieveContractAddressFromTx(tx);
    const salesContract = await VinciSale.at(salesAddress);

    testUSD.mint(decimals.mul(new BN(1000)), { from: accounts[3] });
    await testUSD.approve(salesContract.address, decimals.mul(new BN(100)), {
      from: accounts[3],
    });
    const buyTx = await salesContract.buy(100, { from: accounts[3] });

    const timelockAddress = retrieveContractAddressFromTx(buyTx);
    const timelockContract = await TokenTimelock.at(timelockAddress);

    assert.equal(await timelockContract.token(), vinci.address);
    assert.equal(await timelockContract.beneficiary(), accounts[3]);
    assert.equal(await timelockContract.releaseTime(), latest.timestamp + 60);
  });

  it("Reverts if not enough testUSD tokens", async () => {
    const vinci = await Vinci.deployed();
    const testUSD = await TestUSD.deployed();

    const tx = await vinci.createSalesContract(
      testUSD.address,
      decimals,
      0,
      decimals.mul(new BN(1000)),
      {
        from: accounts[0],
      }
    );
    const salesAddress = retrieveContractAddressFromTx(tx);
    const salesContract = await VinciSale.at(salesAddress);

    await testUSD.approve(salesContract.address, decimals.mul(new BN(100)), {
      from: accounts[4],
    });
    truffleAssert.reverts(salesContract.buy(100, { from: accounts[4] }));
  });

  it("Reverts if not enough Vinci in contract", async () => {
    const vinci = await Vinci.deployed();
    const testUSD = await TestUSD.deployed();

    const tx = await vinci.createSalesContract(
      testUSD.address,
      decimals,
      0,
      decimals.mul(new BN(1000)),
      {
        from: accounts[0],
      }
    );
    const salesAddress = retrieveContractAddressFromTx(tx);
    const salesContract = await VinciSale.at(salesAddress);

    testUSD.mint(decimals.mul(new BN(10000)), { from: accounts[4] });
    await testUSD.approve(salesContract.address, decimals.mul(new BN(10000)), {
      from: accounts[4],
    });
    truffleAssert.reverts(salesContract.buy(10000, { from: accounts[4] }));
  });
});
