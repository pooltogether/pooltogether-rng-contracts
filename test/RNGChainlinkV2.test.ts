import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Contract, Transaction } from 'ethers';
import { deployMockContract } from 'ethereum-waffle';
import { artifacts, ethers } from 'hardhat';

const { constants, getContractFactory, getSigners, provider, utils } = ethers;
const { AddressZero } = constants;
const { formatBytes32String } = utils;

import { getEvents as getEventsHelper } from './helpers/getEvents';

const getEvents = (tx: Transaction, contract: Contract) => getEventsHelper(provider, tx, contract);

const debug = require('debug')('ptv3:RNGChainlink.test');

type deployParametersType = {
  deployerAddress: string;
  vrfCoordinatorAddress: string;
  subscriptionId: number;
  keyHash: string;
};

describe('RNGChainlinkV2 contract', function () {
  let deployer: SignerWithAddress;
  let manager: SignerWithAddress;
  let stranger: SignerWithAddress;

  let blockStore: Contract;
  let link: Contract;
  let rng: Contract;
  let vrfCoordinator: Contract;

  let isDeployTest = false;

  // Ethereum Mainnet 200 Gwei keyHash
  const keyHash = '0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef';

  let deployParameters: deployParametersType;

  const deployRNGChainlinkV2 = async ({
    deployerAddress,
    vrfCoordinatorAddress,
    subscriptionId,
    keyHash,
  }: deployParametersType) => {
    const RNGFactory = await getContractFactory('RNGChainlinkV2Harness', deployer);

    return await RNGFactory.deploy(
      deployerAddress,
      vrfCoordinatorAddress,
      subscriptionId,
      keyHash,
    );
  };

  beforeEach(async () => {
    [deployer, manager, stranger] = await getSigners();

    debug('Deploying LINK...');
    const LinkFactory = await getContractFactory('LinkToken', deployer);
    link = await LinkFactory.deploy();

    debug('Deploying AggregatorV3 mock contract...');
    const Aggregator = await artifacts.readArtifact('AggregatorV3Interface');
    const aggregatorV3Mock = await deployMockContract(deployer, Aggregator.abi);

    debug('Deploying BlockStore...');
    const BlockStoreFactory = await getContractFactory('BlockhashStoreTestHelper', deployer);
    blockStore = await BlockStoreFactory.deploy();

    debug('Deploying RNG...');
    const VRFCoordinatorFactory = await getContractFactory('VRFCoordinatorV2', deployer);
    vrfCoordinator = await VRFCoordinatorFactory.deploy(
      link.address,
      aggregatorV3Mock.address,
      blockStore.address,
    );

    // Dummy values to test random number generation
    await vrfCoordinator.setConfig(3, 1000000, 60, 0, 1, {
      fulfillmentFlatFeeLinkPPMTier1: 0,
      fulfillmentFlatFeeLinkPPMTier2: 0,
      fulfillmentFlatFeeLinkPPMTier3: 0,
      fulfillmentFlatFeeLinkPPMTier4: 0,
      fulfillmentFlatFeeLinkPPMTier5: 0,
      reqsForTier2: 0,
      reqsForTier3: 0,
      reqsForTier4: 0,
      reqsForTier5: 0,
    });

    deployParameters = {
      deployerAddress: deployer.address,
      vrfCoordinatorAddress: vrfCoordinator.address,
      subscriptionId: 1,
      keyHash,
    };

    if (!isDeployTest) {
      rng = await deployRNGChainlinkV2(deployParameters);
      await rng.setManager(manager.address);
    }
  });

  describe('constructor()', () => {
    beforeEach(async () => {
      isDeployTest = true;
    });

    afterEach(async () => {
      isDeployTest = false;
    });

    it('should deploy RNGChainlinkV2', async () => {
      const rng = await deployRNGChainlinkV2(deployParameters);
      const deployTransaction = rng.deployTransaction;

      const {
        deployerAddress,
        vrfCoordinatorAddress,
        subscriptionId,
        keyHash,
      } = deployParameters;

      await expect(deployTransaction)
        .to.emit(rng, 'KeyHashSet')
        .withArgs(keyHash);

      await expect(deployTransaction)
        .to.emit(rng, 'SubscriptionIdSet')
        .withArgs(subscriptionId);

      await expect(deployTransaction)
        .to.emit(rng, 'VrfCoordinatorSet')
        .withArgs(vrfCoordinatorAddress);

      expect(await rng.owner()).to.equal(deployerAddress);
      expect(await rng.getKeyHash()).to.equal(keyHash);
      expect(await rng.getSubscriptionId()).to.equal(subscriptionId);
      expect(await rng.getVrfCoordinator()).to.equal(vrfCoordinatorAddress);
    });

    it('should fail to deploy RNGChainlinkV2 if vrfCoordinator is address zero', async () => {
      deployParameters.vrfCoordinatorAddress = AddressZero;

      await expect(deployRNGChainlinkV2(deployParameters)).to.be.revertedWith(
        'RNGChainLink/vrf-not-zero-addr',
      );
    });

    it('should fail to deploy RNGChainlinkV2 if subscriptionId is not greater than zero', async () => {
      deployParameters.subscriptionId = 0;

      await expect(deployRNGChainlinkV2(deployParameters)).to.be.revertedWith(
        'RNGChainLink/subId-gt-zero',
      );
    });

    it('should fail to deploy RNGChainlinkV2 if keyHash is an empty bytes32 string', async () => {
      deployParameters.keyHash = formatBytes32String('');

      await expect(deployRNGChainlinkV2(deployParameters)).to.be.revertedWith(
        'RNGChainLink/keyHash-not-empty',
      );
    });
  });

  describe('requestRandomNumber()', () => {
    it('should request a random number', async () => {
      await rng.subscribe();

      const transaction = await rng.connect(manager).requestRandomNumber();
      const requestId = await rng.callStatic.getLastRequestId();

      await expect(transaction)
        .to.emit(rng, 'RandomNumberRequested')
        .withArgs(requestId, manager.address);

      // Confirm delayed completion
      expect(await rng.isRequestComplete(requestId)).to.equal(false);
    });

    it('should return the correct data', async () => {
      await rng.subscribe();

      const blockNumber = (await provider.getBlock('latest')).number;
      const returnData = await rng.connect(manager).callStatic.requestRandomNumber();

      await rng.connect(manager).requestRandomNumber();

      expect(returnData['requestId']).to.equal(await rng.callStatic.getLastRequestId());
      expect(returnData['lockBlock']).to.equal(blockNumber);
    });

    it('should fail to request a random number if the subscription ID is invalid', async () => {
      await expect(rng.connect(manager).requestRandomNumber()).to.be.revertedWith(
        'InvalidSubscription()',
      );
    });

    it('should fail to request a random number if not manager', async () => {
      await expect(rng.requestRandomNumber()).to.be.revertedWith('Manageable/caller-not-manager');
    });
  });

  describe('fulfillRandomWords()', () => {
    it('should fulfill a random number request', async () => {
      await rng.subscribe();

      const returnData = await rng.connect(manager).callStatic.requestRandomNumber();
      const requestRandomNumberTransaction = await rng.connect(manager).requestRandomNumber();

      const events = await getEvents(requestRandomNumberTransaction, vrfCoordinator);
      const event = events.find((event) => event && event.name === 'RandomWordsRequested');

      if (event) {
        const requestId = event.args['requestId'];
        const internalRequestId = returnData['requestId'];

        expect(await rng.isRequestComplete(internalRequestId)).to.equal(false);

        const randomNumber = Math.floor(Math.random() * 1000);
        const fulfillRandomWordsTransaction = await rng.rawFulfillRandomWordsStub(requestId, [
          randomNumber,
        ]);

        expect(fulfillRandomWordsTransaction)
          .to.emit(rng, 'RandomNumberCompleted')
          .withArgs(internalRequestId, randomNumber);

        expect(await rng.callStatic.isRequestComplete(internalRequestId)).to.equal(true);
        expect(await rng.callStatic.randomNumber(internalRequestId)).to.equal(randomNumber);
      }
    });

    it('should fail to fulfill a random number request if requestId is incorrect', async () => {
      await rng.subscribe();
      await rng.connect(manager).requestRandomNumber();

      const randomNumber = Math.floor(Math.random() * 1000);

      await expect(rng.rawFulfillRandomWordsStub(1, [randomNumber])).to.be.revertedWith(
        'RNGChainLink/requestId-incorrect',
      );
    });
  });

  describe('randomNumber()', () => {
    it('should return the latest generated random number', async () => {
      await rng.subscribe();

      const returnData = await rng.connect(manager).callStatic.requestRandomNumber();
      const requestRandomNumberTransaction = await rng.connect(manager).requestRandomNumber();

      const events = await getEvents(requestRandomNumberTransaction, vrfCoordinator);
      const event = events.find((event) => event && event.name === 'RandomWordsRequested');

      if (event) {
        const requestId = event.args['requestId'];
        const internalRequestId = returnData['requestId'];

        const randomNumber = Math.floor(Math.random() * 1000);
        await rng.rawFulfillRandomWordsStub(requestId, [randomNumber]);

        expect(await rng.callStatic.randomNumber(internalRequestId)).to.equal(randomNumber);
      }
    });
  });

  describe('getLastRequestId()', () => {
    it('should return the next unused request ID', async () => {
      await rng.setRequestCounter(123);
      expect(await rng.getLastRequestId()).to.equal(123);
    });
  });

  describe('getRequestFee()', () => {
    it('should return the fee for a request', async () => {
      const feeData = await rng.getRequestFee();
      expect(feeData.feeToken).to.equal(AddressZero);
      expect(feeData.requestFee).to.equal(0);
    });
  });

  describe('getKeyHash()', () => {
    it('should get Chainlink VRF keyHash', async () => {
      expect(await rng.getKeyHash()).to.equal(deployParameters.keyHash);
    });
  });

  describe('getSubscriptionId()', () => {
    it('should get Chainlink VRF subscription ID', async () => {
      expect(await rng.getSubscriptionId()).to.equal(1);
    });
  });

  describe('getVrfCoordinator()', () => {
    it('should get Chainlink VRF Coordinator address', async () => {
      expect(await rng.getVrfCoordinator()).to.equal(vrfCoordinator.address);
    });
  });

  describe('setSubscriptionId()', () => {
    it('should succeed to set subscription id if owner', async () => {
      const { subscriptionId } = deployParameters;
      await expect(rng.setSubscriptionId(subscriptionId)).to.emit(rng, 'SubscriptionIdSet').withArgs(subscriptionId);
    });

    it('should fail to set subscription id if subscriptionId is not greater than zero', async () => {
      deployParameters.subscriptionId = 0;

      await expect(rng.setSubscriptionId(deployParameters.subscriptionId)).to.be.revertedWith(
        'RNGChainLink/subId-gt-zero',
      );
    });

    it('should fail to set subscription id if not owner', async () => {
      await expect(
        rng.connect(stranger).setSubscriptionId(deployParameters.subscriptionId),
      ).to.be.revertedWith('Ownable/caller-not-owner');
    });
  });

  describe('setKeyhash()', () => {
    it('should succeed to set keyHash if owner', async () => {
      await expect(rng.setKeyhash(keyHash)).to.emit(rng, 'KeyHashSet').withArgs(keyHash);
    });

    it('should fail to set keyHash if keyHash is an empty bytes32 string', async () => {
      deployParameters.keyHash = formatBytes32String('');

      await expect(rng.setKeyhash(deployParameters.keyHash)).to.be.revertedWith(
        'RNGChainLink/keyHash-not-empty',
      );
    });

    it('should fail to set keyHash if not owner', async () => {
      await expect(rng.connect(stranger).setKeyhash(keyHash)).to.be.revertedWith(
        'Ownable/caller-not-owner',
      );
    });
  });
});
