const ethers = require('ethers')

const {TASK_COMPILE_GET_COMPILER_INPUT} = require('@nomiclabs/buidler/builtin-tasks/task-names');

task(TASK_COMPILE_GET_COMPILER_INPUT).setAction(async (_, __, runSuper) => {
  const input = await runSuper();
  input.settings.metadata.useLiteralContent = false;
  return input;
})

usePlugin('@nomiclabs/buidler-waffle');
usePlugin('buidler-gas-reporter');
usePlugin('solidity-coverage');
usePlugin('buidler-deploy');
usePlugin("@nomiclabs/buidler-etherscan");

module.exports = {
  solc: {
    version: '0.6.6',
    optimizer: {
      enabled: true,
      runs: 200
    },
    evmVersion: 'istanbul'
  },
  paths: {
    artifacts: './build',
    deploy: './deploy',
    deployments: './deployments'
  },
  networks: {
    buidlerevm: {
      blockGasLimit: 200000000,
      allowUnlimitedContractSize: true
    },
    coverage: {
      url: 'http://127.0.0.1:8555',
      blockGasLimit: 200000000,
      allowUnlimitedContractSize: true
    },
    localhost: {
      url: 'http://127.0.0.1:8545'
    },
    kovan: {
      url: `https://kovan.infura.io/v3/${process.env.INFURA_API_KEY}`,
      gasPrice: 10e9,
      accounts: {
        mnemonic: process.env.HDWALLET_MNEMONIC,
        initialIndex: 0,
        count: 3,
      }
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${process.env.INFURA_API_KEY}`,
      gasPrice: 10e9,
      accounts: {
        mnemonic: process.env.HDWALLET_MNEMONIC,
        initialIndex: 0,
        count: 3,
      }
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${process.env.INFURA_API_KEY}`,
      gasPrice: 10e9,
      accounts: {
        mnemonic: process.env.HDWALLET_MNEMONIC,
        initialIndex: 0,
        count: 3,
      }
    }
  },
  gasReporter: {
    currency: 'USD',
    gasPrice: 1,
    enabled: (process.env.REPORT_GAS) ? true : false
  },
  namedAccounts: {
    deployer: {
      default: 0,  // Local Wallet; Account 1  OR  [ropsten|kovan].accounts from above
    },
    vrfCoordinator: {
      1: '0xf0d54349aDdcf704F77AE15b96510dEA15cb7952', // mainnet
      4: '0xb3dCcb4Cf7a26f6cf6B120Cf5A73875B7BBc655B', // rinkeby
      42: '0xdD3782915140c8f3b190B5D67eAc6dc5760C46E9', // kovan
    },
    linkToken: {
      1: '0x514910771AF9Ca656af840dff83E8264EcF986CA', // mainnet
      4: '0x01BE23585060835E02B77ef475b0Cc51aA1e0709', // rinkeby
      42: '0xa36085F69e2889c224210F603D836748e7dC0088', // kovan
    }
  }
};
