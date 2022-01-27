import { HardhatUserConfig } from 'hardhat/config';

const infuraApiKey = process.env.INFURA_API_KEY;
const mnemonic = process.env.HDWALLET_MNEMONIC;

const networks: HardhatUserConfig['networks'] = {
  coverage: {
    url: 'http://127.0.0.1:8555',
    blockGasLimit: 200000000,
    allowUnlimitedContractSize: true,
  },
  localhost: {
    chainId: 1,
    url: 'http://127.0.0.1:8545',
    allowUnlimitedContractSize: true,
  },
  kovan: {
    url: `https://kovan.infura.io/v3/${infuraApiKey}`,
    accounts: {
      mnemonic,
      initialIndex: 0,
      count: 3,
    },
  },
  ropsten: {
    url: `https://ropsten.infura.io/v3/${infuraApiKey}`,
    accounts: {
      mnemonic,
      initialIndex: 0,
      count: 3,
    },
  },
  rinkeby: {
    url: `https://rinkeby.infura.io/v3/${infuraApiKey}`,
    accounts: {
      mnemonic,
      initialIndex: 0,
      count: 3,
    },
  },
  mainnet: {
    url: `https://mainnet.infura.io/v3/${infuraApiKey}`,
    accounts: {
      mnemonic,
      initialIndex: 0,
      count: 3,
    },
  },
  poaSokol: {
    chainId: 77,
    url: 'https://sokol.poa.network',
    accounts: {
      mnemonic,
    },
  },
  xdai: {
    chainId: 100,
    url: 'https://xdai.poanetwork.dev',
    accounts: {
      mnemonic,
    },
  },
  matic: {
    chainId: 137,
    url: process.env.POLYGON_MAINNET_RPC_URL,
    accounts: {
      mnemonic,
    },
  },
  mumbai: {
    chainId: 80001,
    url: 'https://rpc-mumbai.maticvigil.com',
    accounts: {
      mnemonic,
    },
  },
  bsc: {
    chainId: 56,
    url: 'https://bsc-dataseed.binance.org',
    accounts: {
      mnemonic,
    },
  },
  bscTestnet: {
    chainId: 97,
    url: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
    accounts: {
      mnemonic,
    },
  },
  celo: {
    chainId: 42220,
    url: 'https://forno.celo.org',
    accounts: {
      mnemonic,
    },
  },
  celoTestnet: {
    chainId: 44787,
    url: 'https://alfajores-forno.celo-testnet.org',
    accounts: {
      mnemonic,
    },
  },
};

export default networks;
