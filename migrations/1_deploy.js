const Vinci = artifacts.require("Vinci");
const TestUSD = artifacts.require("TestUSD");

module.exports = function (deployer, network, accounts) {
  if (network === "live" || network === "live-fork") {
    return deployer.deploy(Vinci);
  } else if (network === "ropsten") {
    deployer.deploy(TestUSD);
    return deployer.deploy(Vinci);
  } else if (network === "polygon") {
    return deployer.deploy(Vinci);
  } else {
    deployer.deploy(TestUSD);
    return deployer.deploy(Vinci);
  }
};
