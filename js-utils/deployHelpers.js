
const { ethers } = require('./buidler');

const toWei = ethers.utils.parseEther
const toEth = ethers.utils.formatEther
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

const txOverrides = (options = {}) => ({gas: 4000000, ...options})

const contractManager = (bre) => async (contractName, contractArgs = [], overrides = {}) => {
  const { ethers, deployments } = bre
  const { deployIfDifferent, log } = deployments

  const [ deployer ] = await ethers.getSigners()
  overrides.from = overrides.from || deployer._address

  let contract = await deployments.getOrNull(contractName)
  if (!contract) {
    log(`  Deploying ${contractName}...`)
    const deployResult = await deployIfDifferent(['data'], contractName, txOverrides(overrides), contractName, ...contractArgs)
    contract = await deployments.get(contractName)
    if (deployResult.newlyDeployed) {
      log(`  - deployed at ${contract.address} for ${deployResult.receipt.gasUsed} WEI`)
    }
  }

  //  Return an Ethers Contract instance with the "deployer" as Signer
  return new ethers.Contract(contract.address, contract.abi, deployer)
}

const chainName = (chainId) => {
  switch(chainId) {
    case 1: return 'Mainnet';
    case 3: return 'Ropsten';
    case 42: return 'Kovan';
    case 31337: return 'localhost';
    default: return 'Unknown';
  }
}


module.exports = {
  VRF,
  txOverrides,
  contractManager,
  chainName,
  toWei,
  toEth,
}
