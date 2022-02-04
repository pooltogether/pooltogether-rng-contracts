import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  contractManager,
  chainName,
} from '../js-utils/deployHelpers';

import VDFConfig from '../vdf.config';

const debug = require('debug')('deploy.js')

export default async (hardhat: HardhatRuntimeEnvironment) => {
  const { ethers, getNamedAccounts, deployments } = hardhat
  const { deploy } = deployments
  const _getContract = contractManager(hardhat)
  const network = await ethers.provider.getNetwork()
  const { chainId } = network

  const {
    vrfCoordinator,
    linkToken
  } = await getNamedAccounts()

  const {
    fee,
    keyHash
  } = VDFConfig

  const [ deployerWallet ] = await ethers.getSigners()

  const feeValue = fee[chainId] || fee.default
  const keyHashValue = keyHash[chainId] || keyHash.default

  debug("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
  debug("PoolTogether RNG Service - Contract Deploy Script")
  debug("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n")

  debug("  Deploying to Network: ", chainName(chainId))

  debug("\n  Using Contracts:")
  debug("  - VRF:  ", vrfCoordinator)
  debug("  - LINK: ", linkToken)
  debug(" ")

  // Blockhash RNG
  const RNGBlockhash = await _getContract('RNGBlockhash', [])

  let RNGChainlink

  if (vrfCoordinator) {
    let linkAddress = linkToken
    if (!linkAddress) {
      debug("\n  Deploying LINK token...")
      const linkResult = await deploy('Link', {
        contract: 'ERC20Mintable',
        from: deployerWallet.address,
        args: ['Chainlink Link', 'LINK']
      })
      linkAddress = linkResult.address
    }

    // Chainlink VRF
    RNGChainlink = await _getContract('RNGChainlink', [vrfCoordinator, linkAddress])

    debug("\n  Initializing RNGChainlink:")
    debug("  - fee:  ", feeValue.toString())
    debug("  - keyHash:  ", keyHashValue)
    debug(" ")
    await RNGChainlink.setFee(feeValue)
    await RNGChainlink.setKeyhash(keyHashValue)
  }

  // Display Contract Addresses
  debug("\n  Contract Deployments Complete!\n")
  debug("  - RNGBlockhash:   ", RNGBlockhash.address)
  debug("  - RNGChainlink:   ", RNGChainlink ? RNGChainlink.address : 'NOT AVAILABLE')

  debug("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n")
}
