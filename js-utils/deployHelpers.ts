import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers } from 'hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

const { utils } = ethers;

export const { toUtf8Bytes: toBytes, formatBytes32String: toBytes32, formatEther: toEth, parseEther: toWei } = utils;

export const chainName = (chainId: number) => {
  switch(chainId) {
    case 1: return 'Mainnet';
    case 3: return 'Ropsten';
    case 4: return 'Rinkeby';
    case 5: return 'Goerli';
    case 42: return 'Kovan';
    case 31337: return 'BuidlerEVM';
    default: return 'Unknown';
  }
}

export const contractManager = ({ ethers, deployments }: HardhatRuntimeEnvironment) => async (contractName: string, contractArgs = [], deployer?: SignerWithAddress) => {
  const { deploy } = deployments
  const [ defaultDeployer ] = await ethers.getSigners()

  deployer = deployer ? deployer : defaultDeployer

  await deploy(contractName, {args: contractArgs, from: deployer.address, log: true})

  const contract = await deployments.get(contractName)

  return new ethers.Contract(contract.address, contract.abi, deployer)
}
