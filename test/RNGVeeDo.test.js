const {
  buidler,
  expect,
  getTestUsers,
  deployMockContract,
  TEST_TOKEN,
} = require('../js-utils/testEnv')

const {
  VDF,
  txOverrides,
  contractManager,
  toWei,
  toBytes32,
} = require('../js-utils/deployHelpers')

const IBeaconContract = require('../build/IBeaconContract.json')
const _getContract = contractManager(buidler)

const debug = require('debug')('ptv3:RNGVeeDo.test')


describe('RNGVeeDo contract', function() {
  let users, rng, beacon

  beforeEach(async () => {
    users = await getTestUsers()

    debug('mocking VDF Beacon...')
    beacon = await deployMockContract(users.deployer, IBeaconContract.abi, txOverrides())

    debug('deploying RNG...')
    rng = await _getContract('RNGVeeDoHarness', [beacon.address, VDF.pulse.default])
  })

  describe('requestRandomNumber()', () => {
    it('should get a random number from the VDF', async () => {
      const requestId = ethers.constants.One
      const budget = toWei('1')
      const lockBlock = VDF.pulse.default;
      const randomNumber = toBytes32('123')

      await expect(rng.requestRandomNumber(TEST_TOKEN, budget))
        .to.emit(rng, 'RandomNumberRequested')
        .withArgs(requestId, users.deployer._address, TEST_TOKEN, budget)

      await beacon.mock.getRandomness.withArgs(lockBlock).returns(randomNumber)
      expect(await rng.randomNumber(requestId)).to.equal(randomNumber)
    })
  })

  describe('isRequestComplete()', () => {
    it('should check a request by ID and confirm if it is complete or not', async () => {
      const requestId = ethers.constants.One
      const lockBlock = ethers.constants.Two
      const randomNumber = toBytes32('123')

      expect(await rng.isRequestComplete(requestId)).to.equal(false)

      await rng.setLockBlockByRequestIdForTest(requestId, lockBlock)
      await beacon.mock.getRandomness.withArgs(lockBlock).returns(randomNumber)

      expect(await rng.isRequestComplete(requestId)).to.equal(true)
    })
  })

  describe('randomNumber()', () => {
    it('should return a previous random number by request ID', async () => {
      const requestId = ethers.constants.One
      const lockBlock = ethers.constants.Two
      const randomNumber = toBytes32('123')

      await rng.setLockBlockByRequestIdForTest(requestId, lockBlock)
      await beacon.mock.getRandomness.withArgs(lockBlock).returns(randomNumber)

      expect(await rng.randomNumber(requestId)).to.equal(randomNumber)
    })
  })
})
