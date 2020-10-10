const { ethers } = require('./buidler');

const toWei = ethers.utils.parseEther
const toEth = ethers.utils.formatEther
const toBytes = ethers.utils.toUtf8Bytes
const toBytes32 = ethers.utils.formatBytes32String

const txOverrides = (options = {}) => ({gas: 20000000, ...options})

const chainName = (chainId) => {
  switch(chainId) {
    case 1: return 'Mainnet';
    case 3: return 'Ropsten';
    case 4: return 'Rinkeby';
    case 5: return 'Goerli';
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
  txOverrides,
  contractManager,
  chainName,
  toWei,
  toEth,
  toBytes,
  toBytes32,
}
