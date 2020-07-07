const { buidler, ethers, } = require('./buidler')
const { deployments } = buidler

const { deployContract, deployMockContract } = require('ethereum-waffle')
const { expect } = require('chai')

ethers.errors.setLogLevel('error')

const getTestUsers = async () => {
  // deployer is specified at index "0" in buidler.config.js
  // vrfCoordinator is specified at index "1"
  const [deployer, vrfCoordinator, vdfBeacon, user1, user2, stranger] = await buidler.ethers.getSigners()
  return {deployer, vrfCoordinator, vdfBeacon, user1, user2, stranger}
}

module.exports = {
    buidler,
    deployments,
    ethers,
    expect,

    getTestUsers,
    deployContract,
    deployMockContract,

    TEST_TOKEN: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
}
