const { buidler, ethers, } = require('./buidler')
const { deployments } = buidler

const { deployContract, deployMockContract } = require('ethereum-waffle')
const { expect } = require('chai')

ethers.errors.setLogLevel('error')

module.exports = {
    buidler,
    deployments,
    ethers,
    expect,

    deployContract,
    deployMockContract,
}