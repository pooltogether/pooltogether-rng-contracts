import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, Contract, Transaction } from 'ethers';
import { deployMockContract, MockContract } from 'ethereum-waffle';
import { artifacts, ethers } from 'hardhat';

const { getContractFactory, getSigners, provider, utils } = ethers;
const { parseEther, solidityPack } = utils;

import { toWei } from '../js-utils/deployHelpers';
import { getEvents as getEventsHelper } from './helpers/getEvents';

const getEvents = (tx: Transaction, contract: Contract) => getEventsHelper(provider, tx, contract);

const debug = require('debug')('ptv3:RNGChainlink.test');

describe('RNGChainlink contract', function () {
  let deployer: SignerWithAddress;
  let stranger: SignerWithAddress;
  let vrfCoordinator: SignerWithAddress;

  let fee: BigNumber;
  let keyhash: string;

  let link: MockContract;
  let rng: Contract;

  beforeEach(async () => {
    [deployer, vrfCoordinator, stranger] = await getSigners();

    debug('Mocking LINK...');
    const LinkToken = await artifacts.readArtifact('LinkToken');
    link = await deployMockContract(deployer, LinkToken.abi);

    debug('Deploying RNG...');
    const RNGFactory = await getContractFactory('RNGChainlinkHarness', deployer);
    rng = await RNGFactory.deploy(vrfCoordinator.address, link.address);

    fee = parseEther('1');
    keyhash = '0xced103054e349b8dfb51352f0f8fa9b5d20dde3d06f9f43cb2b85bc64b238205';

    // Presets
    await rng.setFee(fee);
    await rng.setKeyhash(keyhash);
  });

  describe('getLink()', () => {
    it('should return link address', async () => {
      expect(await rng.getLink()).to.equal(link.address);
    });
  });

  describe('setKeyhash()', () => {
    it('should allow only the Owner to update the key-hash for VRF', async () => {
      // Non-Owner
      await expect(rng.connect(stranger).setKeyhash(keyhash)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );

      // Owner
      await expect(rng.setKeyhash(keyhash)).to.emit(rng, 'KeyHashSet').withArgs(keyhash);
    });
  });

  describe('setFee()', () => {
    it('should allow only the Owner to update the fee for VRF', async () => {
      // Non-Owner
      await expect(rng.connect(stranger).setFee(fee)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );

      // Owner
      await expect(rng.setFee(fee)).to.emit(rng, 'FeeSet').withArgs(fee);

      expect(await rng.fee()).to.equal(fee);
    });
  });

  describe('getLastRequestId()', () => {
    it('should return the next unused request ID', async () => {
      await rng.setRequestCount(123);
      expect(await rng.getLastRequestId()).to.equal(123);
    });
  });

  describe('getRequestFee()', () => {
    it('should return the fee for a request', async () => {
      await rng.setFee(fee);
      const feeData = await rng.getRequestFee();
      expect(feeData.feeToken).to.equal(link.address);
      expect(feeData.requestFee).to.equal(fee);
    });
  });

  describe('requestRandomNumber()', () => {
    it('should get a random number from the VRF', async () => {
      const requestId = ethers.constants.One;
      const fee = toWei('1');

      // Prep
      await rng.setRequestCount(0);
      await link.mock.transferFrom.withArgs(deployer.address, rng.address, fee).returns(true);

      const seed = solidityPack(['bytes32', 'uint256'], [keyhash, 0]);
      await link.mock.transferAndCall.withArgs(vrfCoordinator.address, fee, seed).returns(true);

      // Test
      await expect(rng.requestRandomNumber())
        .to.emit(rng, 'RandomNumberRequested')
        .withArgs(requestId, deployer.address);

      // Confirm delayed completion
      expect(await rng.isRequestComplete(requestId)).to.equal(false);
    });
  });

  describe('isRequestComplete()', () => {
    it('should return false if request has not completed', async () => {
      // Prep
      await link.mock.transferFrom.withArgs(deployer.address, rng.address, fee).returns(true);

      const seed = solidityPack(['bytes32', 'uint256'], [keyhash, 0]);
      await link.mock.transferAndCall.withArgs(vrfCoordinator.address, fee, seed).returns(true);

      // Test
      const tx = await rng.requestRandomNumber();

      const events = await getEvents(tx, rng);
      const event = events.find((event) => event && event.name === 'VRFRequested');

      if (event) {
        const { requestId, chainlinkRequestId } = event.args;

        expect(event).to.not.be.undefined;

        expect(await rng.isRequestComplete(requestId)).to.equal(false);

        const rando = 999;
        await rng.connect(vrfCoordinator).rawFulfillRandomness(chainlinkRequestId, rando);

        expect(await rng.isRequestComplete(requestId)).to.equal(true);

        expect(await rng.callStatic.randomNumber(requestId)).to.equal(rando);
      }
    });
  });

  describe('randomNumber()', () => {
    it('should return a previous random number by request ID', async () => {
      const requestId = ethers.constants.One;

      // Prep
      await rng.setRequestCount(0);
      await rng.setRandomNumber(requestId, 123);

      expect(await rng.callStatic.randomNumber(requestId)).to.equal(123);
    });
  });
});
