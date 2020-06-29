const { deployContract, deployMockContract } = require('ethereum-waffle')
const RNGBlockhashHarness = require('../build/RNGBlockhashHarness.json')

const { buidler, ethers } = require('../js-utils/buidler')
const { expect } = require('chai')

const toWei = ethers.utils.parseEther
const toBytes = ethers.utils.toUtf8Bytes

const debug = require('debug')('ptv3:RNG.test')

let overrides = { gasLimit: 20000000 }


describe('RNGBlockhash contract', function() {
  let wallet, wallet2

  let rng, link

  beforeEach(async () => {
    [wallet, wallet2] = await buidler.ethers.getSigners()
    debug(`using wallet ${wallet._address}`)

    // debug('mocking tokens...')
    // token = await deployMockContract(wallet, IERC20.abi, overrides)

    debug('deploying Harness for RNGBlockhash...')
    rng = await deployContract(wallet, RNGBlockhashHarness, [], overrides)

    // debug('preparing RNGBlockhash...')
    // rng.prepareForTest()
  })

  describe('setKeyhash()', () => {
    it('should allow only the Owner to update the key-hash for VRF')
  })

  describe('setFee()', () => {
    it('should allow only the Owner to update the fee for VRF')
  })

  describe('setThreshold()', () => {
    it('should allow only the Owner to update the threshold for VRF')
  })

  describe('balanceOfLink()', () => {
    it('should return the amount of LINK held in the contract')
  })

  describe('withdrawLink()', () => {
    it('should allow only the Owner to withdraw LINK from the contract')
  })

  describe('requestRandomNumber()', () => {
    it('should get a random number from the blockhash')
    it('should get a random number from the VRF')
  })

  describe('isRequestComplete()', () => {
    it('should check a request by ID and confirm if it is complete')
  })

  describe('randomNumber()', () => {
    it('should return a previous random number by request ID')
  })

  describe('fulfillRandomness()', () => {
    it('should allow only the VRF to fulfill VRF requests')
  })
})
