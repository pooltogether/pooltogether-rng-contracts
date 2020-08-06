const { buidler, ethers, } = require('./buidler')
const { deployments } = buidler

const { deployContract, deployMockContract } = require('ethereum-waffle')
const { expect } = require('chai')

ethers.errors.setLogLevel('error')

const getTestUsers = async () => {
  // deployer is specified at index "0" in buidler.config.js
  // vrfCoordinator is specified at index "1"
  const [deployer, vrfCoordinator, user1, user2, stranger] = await buidler.ethers.getSigners()
  return {deployer, vrfCoordinator, user1, user2, stranger}
}

const callMultiReturnTx = async (contract, method, params = []) => {
  let fxn = contract.interface.functions[method]
  let call = fxn.encode(params)
  let result = await contract.provider.call({ to: contract.address, data: call })
  return fxn.decode(result)
}

module.exports = {
    buidler,
    deployments,
    ethers,
    expect,

    getTestUsers,
    callMultiReturnTx,
    deployContract,
    deployMockContract,

    TEST_TOKEN: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
}
