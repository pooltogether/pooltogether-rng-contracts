// using plugin: buidler-deploy
// reference: https://buidler.dev/plugins/buidler-deploy.html

const { LinkTokenFactory } = require('@chainlink/test-helpers/dist/src/generated/LinkTokenFactory')
const {
  VRF,
  contractManager,
  chainName,
} = require('../js-utils/deployHelpers')


module.exports = async (bre) => {
  const { ethers, getNamedAccounts, deployments } = bre
  const { log } = deployments
  const _getContract = contractManager(bre)
  const network = await ethers.provider.getNetwork()
  const [ deployerWallet ] = await ethers.getSigners()

  // Named accounts, defined in buidler.config.js:
  const { deployer, vrfCoordinator, linkToken } = await getNamedAccounts()
  let linkTokenAddress = linkToken;

  log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
  log("PoolTogether RNG Service - Contract Deploy Script")
  log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n")

  log("  Deploying to Network: ", chainName(network.chainId))

  // log({isAddress: ethers.utils.isAddress(linkToken)})

  if (linkToken === deployer) {
    log("\n  Deploying LINK token...")
    const linkFactory = new LinkTokenFactory(deployerWallet)
    const link = await linkFactory.deploy();
    linkTokenAddress = link.address;
  }

  log("\n  Using Accounts:")
  log("  - Deployer:  ", deployer)
  log("\n  Using Contracts:")
  log("  - VRF:  ", vrfCoordinator)
  log("  - LINK: ", linkTokenAddress)
  log(" ")

  // Deploy Contracts
  const RNGBlockhash = await _getContract('RNGBlockhash', [vrfCoordinator, linkToken])

  log("\n  Initializing...")
  await RNGBlockhash.setKeyhash(VRF.keyHash[network.chainId] || VRF.keyHash.default)
  await RNGBlockhash.setFee(VRF.fee[network.chainId] || VRF.fee.default)
  await RNGBlockhash.setThreshold(VRF.threshold[network.chainId] || VRF.threshold.default)


  // Display Contract Addresses
  log("\n  Contract Deployments Complete!\n")
  log("  - RNGBlockhash: ", RNGBlockhash.address)

  log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n")
}