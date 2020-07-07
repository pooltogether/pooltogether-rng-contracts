
const { ethers } = require('./buidler');

const toWei = ethers.utils.parseEther
const toEth = ethers.utils.formatEther
const toBytes = ethers.utils.toUtf8Bytes
const toBytes32 = ethers.utils.formatBytes32String

const VRF = {
  keyHash: {
    default : toBytes32(0xced103054e349b8dfb51352f0f8fa9b5d20dde3d06f9f43cb2b85bc64b238205), // local
    1       : '', // mainnet
    3       : toBytes32(0xced103054e349b8dfb51352f0f8fa9b5d20dde3d06f9f43cb2b85bc64b238205), // ropsten
    42      : toBytes32(0x0218141742245eeeba0660e61ef8767e6ce8e7215289a4d18616828caf4dfe33), // kovan
  },
  fee: {
    default : toWei('1'), // 1 LINK
    1       : toWei('1'), // 1 LINK
    3       : toWei('1'), // 1 LINK
    42      : toWei('1'), // 1 LINK
  },
  threshold: {
    default : toWei('0.01'),
    1       : toWei('0.01'),
    3       : toWei('0.01'),
    42      : toWei('0.01'),
  }
}

const VDF = {
  startBlock: {
    default : 1,
    1       : 10000000,
    3       : 8000000,
    42      : 18000000,
  },
  blockStep: {
    default : 820,
    1       : 820,
    3       : 820,
    42      : 820,
  }
}

const txOverrides = (options = {}) => ({gas: 20000000, ...options})

const chainName = (chainId) => {
  switch(chainId) {
    case 1: return 'Mainnet';
    case 3: return 'Ropsten';
    case 42: return 'Kovan';
    case 31337: return 'BuidlerEVM';
    default: return 'Unknown';
  }
}

const contractManager = (buidler) => async (contractName, contractArgs = [], deployer) => {
  const { ethers, deployments } = buidler
  const { deploy } = deployments
  const [ defaultDeployer ] = await ethers.getSigners()
  deployer = deployer || defaultDeployer

  await deploy(contractName, {args: contractArgs, from: deployer._address, log: true})
  contract = await deployments.get(contractName)
  return new ethers.Contract(contract.address, contract.abi, deployer)
}

module.exports = {
  VRF,
  VDF,
  txOverrides,
  contractManager,
  chainName,
  toWei,
  toEth,
  toBytes,
  toBytes32,
}
