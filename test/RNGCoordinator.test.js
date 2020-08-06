const {
  buidler,
  ethers,
  expect,
  getTestUsers,
  callMultiReturnTx,
  deployMockContract,
  TEST_TOKEN,
} = require('../js-utils/testEnv')

const {
  VRF,
  VDF,
  txOverrides,
  contractManager,
  toWei,
  toBytes32,
} = require('../js-utils/deployHelpers')

const RNGInterface = require('../build/RNGInterface.json')
const _getContract = contractManager(buidler)

const debug = require('debug')('ptv3:RNGCoordinator.test')


describe('RNGCoordinator contract', function() {
  let users, rngCoordinator, rngService, rngService2

  beforeEach(async () => {
    users = await getTestUsers()

    debug('mocking RNGInterface...')
    rngService = await deployMockContract(users.deployer, RNGInterface.abi, txOverrides())
    rngService2 = await deployMockContract(users.deployer, RNGInterface.abi, txOverrides())

    debug('deploying RNGCoordinator...')
    rngCoordinator = await _getContract('RNGCoordinatorHarness', [])
    await rngService.mock.getLastRequestId.returns(1)
  })

  describe('randomNumber()', () => {
    it('should throw error when no RNG service attached', async () => {
      await expect(rngCoordinator.randomNumber(1))
        .to.be.revertedWith('RNGCoordinator/no-rng-service')
    })
  })

  describe('addRngService()', () => {
    it('should prevent adding invalid RNG Services', async () => {
      await expect(rngCoordinator.addRngService(ethers.constants.AddressZero))
        .to.be.revertedWith('RNGCoordinator/invalid-rng-service')
    })

    it('should only allow the Owner/Governor to add RNG Services', async () => {
      // Non-Owner
      await expect(rngCoordinator.connect(users.stranger).addRngService(rngService.address))
        .to.be.revertedWith('Ownable: caller is not the owner')

      // Owner
      await expect(rngCoordinator.addRngService(rngService.address))
        .to.not.be.revertedWith('Ownable: caller is not the owner')
    })
  })

  describe('with a valid RNG Service', () => {
    beforeEach(async () => {
      await rngCoordinator.resetServices()
      await rngService.mock.getLastRequestId.returns(123)
      await rngCoordinator.addRngService(rngService.address)
    })

    describe('getLastRequestId()', () => {
      it('should return the last used request ID', async () => {
        expect(await rngCoordinator.getLastRequestId()).to.equal(123)
      })
    })

    describe('requestRandomNumber()', () => {
      it('should request a random number from the latest RNG Service', async () => {
        let response

        debug('First service request..')
        await rngService.mock.requestRandomNumber.withArgs(TEST_TOKEN, toWei('1')).returns(1, 456)
        response = await callMultiReturnTx(rngCoordinator, 'requestRandomNumber', [TEST_TOKEN, toWei('1')])
        expect(response.requestId).to.equal(1)
        expect(response.lockBlock).to.equal(456)

        debug('Adding new RNG Service..')
        await rngService.mock.getLastRequestId.returns(124)
        rngCoordinator.addRngService(rngService2.address)

        debug('Second service request..')
        await rngService2.mock.requestRandomNumber.withArgs(TEST_TOKEN, toWei('1')).returns(1, 789) // requestId is offset
        response = await callMultiReturnTx(rngCoordinator, 'requestRandomNumber', [TEST_TOKEN, toWei('1')])
        expect(response.requestId).to.equal(125)
        expect(response.lockBlock).to.equal(789)
      })
    })

    describe('isRequestComplete()', () => {
      it('should check a request by ID and confirm if it is complete or not', async () => {
        debug('First service request..')
        await rngService.mock.requestRandomNumber.withArgs(TEST_TOKEN, toWei('1')).returns(1, 111)
        await rngCoordinator.requestRandomNumber(TEST_TOKEN, toWei('1'))

        debug('Adding new RNG Service..')
        await rngService.mock.getLastRequestId.returns(1)
        rngCoordinator.addRngService(rngService2.address)

        debug('Second service request..')
        await rngService2.mock.requestRandomNumber.withArgs(TEST_TOKEN, toWei('1')).returns(1, 222) // requestId is offset
        await rngCoordinator.requestRandomNumber(TEST_TOKEN, toWei('1'))

        debug('Test first request..')
        await rngService.mock.isRequestComplete.withArgs(1).returns(true)
        expect(await rngCoordinator.isRequestComplete(1)).to.equal(true)

        debug('Test second request..')
        await rngService2.mock.isRequestComplete.withArgs(1).returns(false)
        expect(await rngCoordinator.isRequestComplete(2)).to.equal(false)
      })
    })

    describe('randomNumber()', () => {
      it('should return a previous random number by request ID', async () => {
        debug('First service request..')
        await rngService.mock.requestRandomNumber.withArgs(TEST_TOKEN, toWei('1')).returns(1, 111)
        await rngCoordinator.requestRandomNumber(TEST_TOKEN, toWei('1'))

        debug('Adding new RNG Service..')
        await rngService.mock.getLastRequestId.returns(1)
        rngCoordinator.addRngService(rngService2.address)

        debug('Second service request..')
        await rngService2.mock.requestRandomNumber.withArgs(TEST_TOKEN, toWei('1')).returns(1, 222) // requestId is offset
        await rngCoordinator.requestRandomNumber(TEST_TOKEN, toWei('1'))

        debug('Test first request..')
        await rngService.mock.randomNumber.withArgs(1).returns(99999999)
        expect(await rngCoordinator.randomNumber(1)).to.equal(99999999)

        debug('Test second request..')
        await rngService2.mock.randomNumber.withArgs(1).returns(8888888)
        expect(await rngCoordinator.randomNumber(2)).to.equal(8888888)
      })
    })

  })
})
