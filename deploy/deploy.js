// using plugin: buidler-deploy
// reference: https://buidler.dev/plugins/buidler-deploy.html

const { LinkTokenFactory } = require('@chainlink/test-helpers/dist/src/generated/LinkTokenFactory')
const {
  VRF,
  VDF,
  contractManager,
  chainName,
} = require('../js-utils/deployHelpers')

const KOVAN_CHAIN_ID = 42
const BUIDLER_EVM_CHAIN_ID = 31337

module.exports = async (buidler) => {
  const { ethers, getNamedAccounts, deployments } = buidler
  const { log } = deployments
  const _getContract = contractManager(buidler)
  const network = await ethers.provider.getNetwork()

  // Named accounts, defined in buidler.config.js:
  const { deployer, vrfCoordinator, vdfBeacon, linkToken } = await getNamedAccounts()
  const [ deployerWallet ] = await ethers.getSigners()

  log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
  log("PoolTogether RNG Service - Contract Deploy Script")
  log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n")

  log("  Deploying to Network: ", chainName(network.chainId))

  let Link = {address: linkToken};
  let Beacon = {address: vdfBeacon};
  if (network.chainId === BUIDLER_EVM_CHAIN_ID) {
    log("\n  Deploying LINK token...")
    const linkFactory = new LinkTokenFactory(deployerWallet)
    Link = await linkFactory.deploy();
  }
  if (network.chainId === BUIDLER_EVM_CHAIN_ID) { // || network.chainId === KOVAN_CHAIN_ID) {
    log("\n  Deploying VDF Beacon contract...")
    Beacon = await _getContract('BeaconContract')
  }

  log("\n  Using Accounts:")
  log("  - Deployer:  ", deployer)

  log("\n  Using Contracts:")
  log("  - VRF:  ", vrfCoordinator)
  log("  - VDF:  ", Beacon.address)
  log("  - LINK: ", Link.address)
  log(" ")

  // Deploy Contracts
  const RNGBlockhash = await _getContract('RNGBlockhash', [vrfCoordinator, Link.address])

  const startBlock = VDF.startBlock[network.chainId] || VDF.startBlock.default
  const blockStep = VDF.blockStep[network.chainId] || VDF.blockStep.default
  const RNGVeeDo = await _getContract('RNGVeeDo', [Beacon.address, startBlock, blockStep])

  log("\n  Initializing...")
  await RNGBlockhash.setFee(VRF.fee[network.chainId] || VRF.fee.default)
  await RNGBlockhash.setKeyhash(VRF.keyHash[network.chainId] || VRF.keyHash.default)
  await RNGBlockhash.setThreshold(VRF.threshold[network.chainId] || VRF.threshold.default)


  // Display Contract Addresses
  log("\n  Contract Deployments Complete!\n")
  log("  - RNGBlockhash: ", RNGBlockhash.address)
  log("  - RNGVeeDo:     ", RNGVeeDo.address)

  log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n")
}
