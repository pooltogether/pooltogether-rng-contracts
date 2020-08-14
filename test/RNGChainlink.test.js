const {
  buidler,
  expect,
  getTestUsers,
  deployMockContract,
} = require('../js-utils/testEnv')

const {
  VRF,
  txOverrides,
  contractManager,
  toWei,
  toBytes32,
} = require('../js-utils/deployHelpers')

const { call } = require('./helpers/call')
const { increaseTime } = require('./helpers/increaseTime')

const LinkTokenInterface = require('../build/LinkTokenInterface.json')
const _getContract = contractManager(buidler)

const debug = require('debug')('ptv3:RNGChainlink.test')


describe('RNGChainlink contract', function() {
  let users, rng, link

  beforeEach(async () => {
    users = await getTestUsers()

    debug('mocking LINK...')
    link = await deployMockContract(users.deployer, LinkTokenInterface.abi, txOverrides())

    debug('deploying RNG...')
    rng = await _getContract('RNGChainlinkHarness', [users.vrfCoordinator._address, link.address])

    // Presets
    await rng.setFee(VRF.fee.default)
    await rng.setKeyhash(VRF.keyHash.default)
  })

  describe('setKeyhash()', () => {
    it('should allow only the Owner to update the key-hash for VRF', async () => {
      // Non-Owner
      await expect(rng.connect(users.stranger).setKeyhash(VRF.keyHash.default))
        .to.be.revertedWith('Ownable: caller is not the owner')

      // Owner
      await expect(rng.setKeyhash(VRF.keyHash.default))
        .to.not.be.revertedWith('Ownable: caller is not the owner')
    })
  })

  describe('setFee()', () => {
    it('should allow only the Owner to update the fee for VRF', async () => {
      // Non-Owner
      await expect(rng.connect(users.stranger).setFee(VRF.fee.default))
        .to.be.revertedWith('Ownable: caller is not the owner')

      // Owner
      await expect(rng.setFee(VRF.fee.default))
        .to.not.be.revertedWith('Ownable: caller is not the owner')
    })
  })

  describe('getLastRequestId()', () => {
    it('should return the next unused request ID', async () => {
      await rng.setRequestCount(123)
      expect(await rng.getLastRequestId()).to.equal(123)
    })
  })

  describe('getRequestFee()', () => {
    it('should return the fee for a request', async () => {
      await rng.setFee(VRF.fee.default)
      const feeData = await rng.getRequestFee()
      expect(feeData.feeToken).to.equal(link.address)
      expect(feeData.requestFee).to.equal(VRF.fee.default)
    })
  })

  describe('requestRandomNumber()', () => {
    it('should get a random number from the VRF', async () => {
      const requestId = ethers.constants.One
      const fee = toWei('1')

      // Prep
      await rng.setRequestCount(0)
      await rng.setSeed(123)
      await link.mock.transferFrom.withArgs(users.deployer._address, rng.address, fee).returns(true)

      const seed = ethers.utils.solidityPack(['bytes32', 'uint256'], [VRF.keyHash.default, 123])
      await link.mock.transferAndCall.withArgs(users.vrfCoordinator._address, VRF.fee.default, seed).returns(true)

      // Test
      await expect(rng.requestRandomNumber())
        .to.emit(rng, 'RandomNumberRequested')
        .withArgs(requestId, users.deployer._address)

      // Confirm delayed completion
      expect(await rng.isRequestComplete(requestId)).to.equal(false)
    })
  })

  describe('isRequestComplete()', () => {
    it('should check a request by ID and confirm if it is complete or not', async () => {
      const requestId = ethers.constants.One

      // Prep
      await rng.setRequestCount(0)
      await rng.setSeed(123)
      await link.mock.transferFrom.withArgs(users.deployer._address, rng.address, VRF.fee.default).returns(true)

      const seed = ethers.utils.solidityPack(['bytes32', 'uint256'], [VRF.keyHash.default, 123])
      await link.mock.transferAndCall.withArgs(users.vrfCoordinator._address, VRF.fee.default, seed).returns(true)

      // Test
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

      // Prep
      await rng.setRequestCount(0)
      await rng.setRandomNumber(requestId, 123)

      // Test
      expect(await call(rng, 'randomNumber', requestId)).to.equal(123)
    })
  })

  describe('fulfillRandomness()', () => {
    it('should disallow any account but the VRF to fulfill VRF requests', async () => {
      // Not-VRF
      await expect(rng.fulfillRandomness(VRF.keyHash.default, toWei('12345')))
        .to.be.revertedWith('RNGChainlink/invalid-vrf-coordinator')

      // VRF
      await expect(rng.connect(users.vrfCoordinator).fulfillRandomness(VRF.keyHash.default, toWei('12345')))
        .to.not.be.revertedWith('RNGChainlink/invalid-vrf-coordinator')
    })
  })
})
