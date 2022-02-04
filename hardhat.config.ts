import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-waffle';
import 'hardhat-abi-exporter';
import 'hardhat-dependency-compiler';
import 'hardhat-deploy';
import 'hardhat-deploy-ethers';
import 'hardhat-gas-reporter';
import 'solidity-coverage';

import networks from './hardhat.network';
import { HardhatUserConfig } from 'hardhat/config';

const optimizerEnabled = !process.env.OPTIMIZER_DISABLED;

const config: HardhatUserConfig = {
  abiExporter: {
    path: './abis',
    clear: true,
    flat: true,
  },
  solidity: {
    compilers: [
      {
        version: '0.8.6',
        settings: {
          optimizer: {
            enabled: optimizerEnabled,
            runs: 2000,
          },
          evmVersion: 'berlin',
        },
      },
      {
        version: '0.6.6',
        settings: {
          optimizer: {
            enabled: optimizerEnabled,
            runs: 2000,
          },
          evmVersion: 'istanbul',
        },
      },
      {
        version: '0.4.8',
        settings: {
          optimizer: {
            enabled: optimizerEnabled,
            runs: 2000,
          },
          evmVersion: 'homestead',
        },
      },
      {
        version: '0.4.11',
        settings: {
          optimizer: {
            enabled: optimizerEnabled,
            runs: 2000,
          },
          evmVersion: 'homestead',
        },
      },
      {
        version: '0.4.24',
        settings: {
          optimizer: {
            enabled: optimizerEnabled,
            runs: 2000,
          },
          evmVersion: 'homestead',
        },
      },
    ],
  },
  networks,
  gasReporter: {
    currency: 'USD',
    gasPrice: 100,
    enabled: process.env.REPORT_GAS ? true : false,
  },
  namedAccounts: {
    deployer: {
      default: 0, // Local Wallet; Account 1  OR  [ropsten|kovan].accounts from above
    },
    vrfCoordinator: {
      1: '0xf0d54349aDdcf704F77AE15b96510dEA15cb7952', // mainnet
      4: '0xb3dCcb4Cf7a26f6cf6B120Cf5A73875B7BBc655B', // rinkeby
      42: '0xdD3782915140c8f3b190B5D67eAc6dc5760C46E9', // kovan
      137: '0x3d2341ADb2D31f1c5530cDC622016af293177AE0', // matic / polygon
      80001: '0x8C7382F9D8f56b33781fE506E897a4F1e2d17255', // mumbai
    },
    linkToken: {
      1: '0x514910771AF9Ca656af840dff83E8264EcF986CA', // mainnet
      4: '0x01BE23585060835E02B77ef475b0Cc51aA1e0709', // rinkeby
      42: '0xa36085F69e2889c224210F603D836748e7dC0088', // kovan
      137: '0xb0897686c545045aFc77CF20eC7A532E3120E0F1', // matic / polygon
      80001: '0x326C977E6efc84E512bB9C30f76E30c160eD06FB', // mumbai
    },
  },
  dependencyCompiler: {
    paths: [
      '@chainlink/contracts/src/v0.4/LinkToken.sol',
      '@chainlink/contracts/src/v0.6/tests/BlockhashStoreTestHelper.sol',
      '@chainlink/contracts/src/v0.8/dev/VRFCoordinatorV2.sol',
    ],
  },
};

export default config;
