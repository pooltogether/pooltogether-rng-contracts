# PoolTogether Prize Savings Protocol - RNG Service

[![Coverage Status](https://coveralls.io/repos/github/pooltogether/rng-service/badge.svg?branch=master)](https://coveralls.io/github/pooltogether/rng-service?branch=master)

[![built-with openzeppelin](https://img.shields.io/badge/built%20with-OpenZeppelin-3677FF)](https://docs.openzeppelin.com/)

The [PoolTogether](https://www.pooltogether.com/) Prize Savings Protocol Ethereum smart contracts.

See the [documentation](https://docs.pooltogether.com/protocol/random-number-generator)

# Deployments

The Chainlink RNG is supported on mainnet, rinkeby and kovan.

The Blockhash RNG is supported on mainnet, rinkeby, kovan, and ropsten.

# Setup

Install Dependencies

```sh
$ yarn
```

Copy over .envrc.example to .envrc

```sh
$ cp .envrc.example .envrc
```

Make sure to update the enviroment variables with suitable values.

Now enable the env vars using [direnv](https://direnv.net/docs/installation.html)

```sh
$ direnv allow
```

# Interacting using Buidler Console

You can interact with the contract using the buidler console:

```sh
$ buidler console --network [network]
```

Then you can interact with deployed contracts:

```javascript
> const signer = (await ethers.getSigners())[0]
> const d = await deployments.all()
> const chainlink = await ethers.getContractAt('RNGChainlink', d.RNGChainlink.address, signer)
> const link = await ethers.getContractAt('IERC20', (await chainlink.getLink()), signer)
```

# Deploying

You can deploy using the deploy script:

```sh
$ yarn deploy [network]
```

Where [network] can be `mainnet`, `rinkeby`, `ropsten`, or `kovan`.

Now you should verify the contracts on Etherscan:

```sh
$ yarn etherscan-verify [network]
```

The network option is the same as above.

# Development

Verify Codebase (hint + test)

```sh
$ yarn verify
```

Run Static Code Analysis

```sh
$ yarn hint
```

Run Tests

```sh
$ yarn test
```

Run Coverage

```sh
$ yarn coverage
```

Run Gas Report

```sh
$ yarn gas
```

Start Local TestRPC & Deploy

```sh
$ yarn start
```

Deploy to an Ethereum Network


