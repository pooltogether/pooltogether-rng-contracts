const {
  buidler,
  expect,
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
  let deployer
  let user1
  let user2

  let rng, link


  beforeEach(async () => {
    [deployer, user1, user2] = await buidler.ethers.getSigners()
    const { vrfCoordinator } = await buidler.getNamedAccounts() // defined in buidler.config.js

    debug('mocking LINK...')
    link = await deployMockContract(deployer, LinkTokenInterface.abi, txOverrides())

    debug('deploying RNG...')
    rng = await _getContract('RNGBlockhash', [vrfCoordinator, link.address], deployer)
  })

  describe('setKeyhash()', () => {
    it('should allow only the Owner to update the key-hash for VRF', async () => {
      // Non-Owner
      await expect(rng.connect(user1).setKeyhash(VRF.keyHash.default))
        .to.be.revertedWith('Ownable: caller is not the owner')

      // Owner
      await expect(rng.setKeyhash(VRF.keyHash.default))
        .to.not.be.revertedWith('Ownable: caller is not the owner')
    })
  })

  describe('setThreshold()', () => {
    it('should allow only the Owner to update the threshold for VRF', async () => {
      // Non-Owner
      await expect(rng.connect(user1).setThreshold(VRF.threshold.default))
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
      await expect(rng.connect(user1).withdrawLink(smallAmount))
        .to.be.revertedWith('Ownable: caller is not the owner')

      // Owner; Insufficient balance
      await link.mock.balanceOf.withArgs(rng.address).returns(smallAmount)
      await expect(rng.withdrawLink(bigAmount))
        .to.be.revertedWith('RNGBlockhash/insuff-link')

      // Owner; Sufficient balance; transfer fails
      await link.mock.balanceOf.withArgs(rng.address).returns(bigAmount)
      await link.mock.transfer.withArgs(deployer._address, smallAmount).returns(false)
      await expect(rng.withdrawLink(smallAmount))
        .to.be.revertedWith('RNGBlockhash/transfer-failed')

      // Owner; Sufficient balance
      await link.mock.balanceOf.withArgs(rng.address).returns(bigAmount)
      await link.mock.transfer.withArgs(deployer._address, smallAmount).returns(true)
      await expect(rng.withdrawLink(smallAmount))
        .to.not.be.revertedWith('RNGBlockhash/insuff-link')
        .to.not.be.revertedWith('RNGBlockhash/transfer-failed')
    })
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
    it('should allow only the VRF to fulfill VRF requests', async () => {
      await expect(rng.fulfillRandomness(VRF.keyHash.default, toWei('12345')))
        .to.be.revertedWith('RNGBlockhash/invalid-vrf-coordinator')
    })
  })
})
