import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, Contract } from 'ethers';
import { MockContract } from 'ethereum-waffle';
import { ethers } from 'hardhat';

const { constants, getContractFactory, getSigners, provider } = ethers;

import { increaseTime as increaseTimeHelper } from './helpers/increaseTime';

const increaseTime = (time: number) => increaseTimeHelper(provider, time);

const debug = require('debug')('ptv3:RNGBlockhash.test');

describe('RNGBlockhash contract', function () {
  let deployer: SignerWithAddress;
  let stranger: SignerWithAddress;
  let vrfCoordinator: SignerWithAddress;

  let rng: Contract;

  beforeEach(async () => {
    [deployer, vrfCoordinator, stranger] = await getSigners();

    debug('Deploying RNG...');
    const RNGFactory = await getContractFactory('RNGBlockhashHarness', deployer);
    rng = await RNGFactory.deploy();
  });

  describe('getLastRequestId()', () => {
    it('should return the next unused request ID', async () => {
      await rng.setRequestCount(123);
      expect(await rng.getLastRequestId()).to.equal(123);
    });
  });

  describe('requestRandomNumber()', () => {
    it('should generate a random number based on the blockhash', async () => {
      const requestId = ethers.constants.One;

      await rng.setRequestCount(0);
      await expect(rng.requestRandomNumber())
        .to.emit(rng, 'RandomNumberRequested')
        .withArgs(requestId, deployer.address);

      expect(await rng.isRequestComplete(requestId)).to.equal(false);

      // advance 2 blocks
      await increaseTime(1000);
      await increaseTime(1000);

      expect(await rng.isRequestComplete(requestId)).to.equal(true);
    });
  });

  describe('isRequestComplete()', () => {
    it('should check a request by ID and confirm if it is complete or not', async () => {
      const requestId = ethers.constants.One;
      await rng.setRequestCount(0);
      await rng.requestRandomNumber();

      expect(await rng.isRequestComplete(requestId)).to.equal(false);

      // advance 2 blocks
      await increaseTime(1000);
      await increaseTime(1000);

      expect(await rng.isRequestComplete(requestId)).to.equal(true);
    });
  });

  describe('randomNumber()', () => {
    it('should return a previous random number by request ID', async () => {
      const requestId = ethers.constants.One;
      await rng.setRequestCount(0);
      await rng.requestRandomNumber();

      // advance 2 blocks
      await increaseTime(1000);
      await increaseTime(1000);

      await rng.setSeed(123);
      await expect(rng.randomNumber(requestId))
        .to.emit(rng, 'RandomNumberCompleted')
        .withArgs(requestId, 123);
    });
  });
});
