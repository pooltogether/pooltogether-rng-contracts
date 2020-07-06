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
} = require('../js-utils/deployHelpers')

const LinkTokenInterface = require('../build/LinkTokenInterface.json')
const _getContract = contractManager(buidler)

const debug = require('debug')('ptv3:RNG.test')


describe('RNGBlockhash contract', function() {
  let users, rng, link

  beforeEach(async () => {
    users = await getTestUsers()

    debug('mocking LINK...')
    link = await deployMockContract(users.deployer, LinkTokenInterface.abi, txOverrides())

    debug('deploying RNG...')
    rng = await _getContract('RNGBlockhashHarness', [users.vrfCoordinator._address, link.address])
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

  describe('setThreshold()', () => {
    it('should allow only the Owner to update the threshold for VRF', async () => {
      // Non-Owner
      await expect(rng.connect(users.stranger).setThreshold(VRF.threshold.default))
        .to.be.revertedWith('Ownable: caller is not the owner')

      // Owner
      await expect(rng.setThreshold(VRF.threshold.default))
        .to.not.be.revertedWith('Ownable: caller is not the owner')
    })
  })

  describe('withdrawLink()', () => {
    it('should allow only the Owner to withdraw LINK from the contract', async () => {
      const bigAmount = toWei('100')
      const smallAmount = toWei('10')

      // Non-Owner
      await expect(rng.connect(users.stranger).withdrawLink(smallAmount))
        .to.be.revertedWith('Ownable: caller is not the owner')

      // Owner; Insufficient balance
      await link.mock.balanceOf.withArgs(rng.address).returns(smallAmount)
      await expect(rng.withdrawLink(bigAmount))
        .to.be.revertedWith('RNGBlockhash/insuff-link')

      // Owner; Sufficient balance; transfer fails
      await link.mock.balanceOf.withArgs(rng.address).returns(bigAmount)
      await link.mock.transfer.withArgs(users.deployer._address, smallAmount).returns(false)
      await expect(rng.withdrawLink(smallAmount))
        .to.be.revertedWith('RNGBlockhash/transfer-failed')

      // Owner; Sufficient balance
      await link.mock.balanceOf.withArgs(rng.address).returns(bigAmount)
      await link.mock.transfer.withArgs(users.deployer._address, smallAmount).returns(true)
      await expect(rng.withdrawLink(smallAmount))
        .to.not.be.revertedWith('RNGBlockhash/insuff-link')
        .to.not.be.revertedWith('RNGBlockhash/transfer-failed')
    })
  })

  describe('requestRandomNumber()', () => {
    it('should get a random number from the blockhash', async () => {
      const requestId = ethers.constants.One
      const token = link.address
      const budget = toWei('1')

      await rng.setThreshold(budget.add(toWei('0.5'))) // Blockhash: budget < threshold
      await link.mock.balanceOf.withArgs(rng.address).returns(toWei('100'))

      await expect(rng.requestRandomNumber(token, budget))
        .to.emit(rng, 'RandomNumberRequested')
        .withArgs(requestId, users.deployer._address, token, budget)

      // Confirm immediate completion
      expect(await rng.isRequestComplete(requestId)).to.equal(true)
    })

    it('should get a random number from the VRF', async () => {
      const requestId = ethers.constants.One
      const token = link.address
      const budget = toWei('1')

      // Presets
      await rng.setFee(VRF.fee.default)
      await rng.setKeyhash(VRF.keyHash.default)
      await rng.setThreshold(budget.sub(toWei('0.5'))) // VRF: budget >= threshold

      // Mocks
      await link.mock.balanceOf.withArgs(rng.address).returns(toWei('100'))

      const blockhash = (await ethers.provider.getBlock()).hash
      const seed = ethers.utils.solidityPack(['bytes32', 'uint256'], [VRF.keyHash.default, blockhash])
      await link.mock.transferAndCall.withArgs(users.vrfCoordinator._address, VRF.fee.default, seed).returns(true)

      // Test
      await expect(rng.requestRandomNumber(token, budget))
        .to.emit(rng, 'RandomNumberRequested')
        .withArgs(requestId, users.deployer._address, token, budget)

      // Confirm delayed completion
      expect(await rng.isRequestComplete(requestId)).to.equal(false)
    })
  })

  describe('isRequestComplete()', () => {
    it('should check a request by ID and confirm if it is complete or not', async () => {
      const requestId = ethers.constants.One
      const RngRequestType = {INTERNAL: 0, CHAINLINK: 1} // Mock Enum

      // Internal
      await rng.setRequestType(requestId, RngRequestType.INTERNAL)
      await rng.setRequestState(requestId, false)
      expect(await rng.isRequestComplete(requestId)).to.equal(false)

      await rng.setRequestState(requestId, true)
      expect(await rng.isRequestComplete(requestId)).to.equal(true)

      // Chainlink
      await rng.setRequestType(requestId, RngRequestType.CHAINLINK)
      await rng.setRequestState(requestId, false)
      expect(await rng.isRequestComplete(requestId)).to.equal(false)

      await rng.setRequestState(requestId, true)
      expect(await rng.isRequestComplete(requestId)).to.equal(true)
    })
  })

  describe('randomNumber()', () => {
    it('should return a previous random number by request ID', async () => {
      const requestId = ethers.constants.One
      await rng.setRandomNumber(requestId, 123)
      expect(await rng.randomNumber(requestId)).to.equal(123)
    })
  })

  describe('fulfillRandomness()', () => {
    it('should disallow any account but the VRF to fulfill VRF requests', async () => {
      // Not-VRF
      await expect(rng.fulfillRandomness(VRF.keyHash.default, toWei('12345')))
        .to.be.revertedWith('RNGBlockhash/invalid-vrf-coordinator')

      // VRF
      await expect(rng.connect(users.vrfCoordinator).fulfillRandomness(VRF.keyHash.default, toWei('12345')))
        .to.not.be.revertedWith('RNGBlockhash/invalid-vrf-coordinator')
    })
  })
})
