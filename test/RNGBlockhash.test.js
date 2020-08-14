const {
  buidler,
  expect,
  getTestUsers,
  deployMockContract,
} = require('../js-utils/testEnv')

const {
  txOverrides,
  contractManager,
  toWei,
} = require('../js-utils/deployHelpers')

const { increaseTime } = require('./helpers/increaseTime')
const { AddressZero } = require('ethers/constants')

const _getContract = contractManager(buidler)

const debug = require('debug')('ptv3:RNGBlockhash.test')

describe('RNGBlockhash contract', function() {
  let users, rng, link

  beforeEach(async () => {
    users = await getTestUsers()

    debug('deploying RNG...')
    rng = await _getContract('RNGBlockhashHarness', [])
  })

  describe('getLastRequestId()', () => {
    it('should return the next unused request ID', async () => {
      await rng.setRequestCount(123)
      expect(await rng.getLastRequestId()).to.equal(123)
    })
  })

  describe('getRequestFee()', () => {
    it('should return the fee for a request', async () => {
      const feeData = await rng.getRequestFee()
      expect(feeData.feeToken).to.equal(AddressZero)
      expect(feeData.requestFee).to.equal(0)
    })
  })

  describe('requestRandomNumber()', () => {
    it('should generate a random number based on the blockhash', async () => {
      const requestId = ethers.constants.One

      await rng.setRequestCount(0)
      await expect(rng.requestRandomNumber())
        .to.emit(rng, 'RandomNumberRequested')
        .withArgs(requestId, users.deployer._address)

      expect(await rng.isRequestComplete(requestId)).to.equal(false)

      // advance 2 blocks
      await increaseTime(1000)
      await increaseTime(1000)

      expect(await rng.isRequestComplete(requestId)).to.equal(true)
    })
  })

  describe('isRequestComplete()', () => {
    it('should check a request by ID and confirm if it is complete or not', async () => {
      const requestId = ethers.constants.One
      await rng.setRequestCount(0)
      await rng.requestRandomNumber()

      expect(await rng.isRequestComplete(requestId)).to.equal(false)

      // advance 2 blocks
      await increaseTime(1000)
      await increaseTime(1000)

      expect(await rng.isRequestComplete(requestId)).to.equal(true)
    })
  })

  describe('randomNumber()', () => {
    it('should return a previous random number by request ID', async () => {
      const requestId = ethers.constants.One
      await rng.setRequestCount(0)
      await rng.requestRandomNumber()

      // advance 2 blocks
      await increaseTime(1000)
      await increaseTime(1000)

      await rng.setSeed(123)
      await expect(rng.randomNumber(requestId))
        .to.emit(rng, 'RandomNumberCompleted')
        .withArgs(requestId, 123)
    })
  })
})
