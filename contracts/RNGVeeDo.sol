// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.6.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "./external/starkware/IBeaconContract.sol";

import "./RNGInterface.sol";

contract RNGVeeDo is RNGInterface, Ownable {
  using SafeMath for uint256;

  event RandomNumberReceived(address indexed sender, uint256 randomNumber, uint256 latestCycle);

  uint256 internal startBlock;
  uint256 internal blockStep;
  uint256 internal requestCount;

  //    RequestID => Block number of Proof
  mapping(uint256 => uint256) internal proofBlockByRequestId;

  IBeaconContract public vdfBeacon;

  constructor(address _vdfBeacon, uint256 _startBlock, uint256 _blockStep) public {
    vdfBeacon = IBeaconContract(_vdfBeacon);
    startBlock = _startBlock;
    blockStep = _blockStep;
  }

  function requestRandomNumber(address token, uint256 budget) external virtual override returns (uint256 requestId) {
    uint256 blockCycle = _getCycleByBlock(block.number).add(1);
    uint256 nextProofBlock = startBlock.add(blockCycle.mul(blockStep));

    requestId = _getNextRequestId();
    proofBlockByRequestId[requestId] = nextProofBlock;

    emit RandomNumberRequested(requestId, msg.sender, token, budget);
  }

  function isRequestComplete(uint256 requestId) external virtual override view returns (bool isCompleted) {
    return _getRandomByRequestId(requestId) > 0;
  }

  function randomNumber(uint256 requestId) external virtual override view returns (uint256 randomNum) {
    return _getRandomByRequestId(requestId);
  }

  function _getRandomByRequestId(uint256 requestId) internal view returns (uint256 randomNum) {
    uint256 proofBlock = proofBlockByRequestId[requestId];
    if (proofBlock == 0) { return 0; }
    return uint256(vdfBeacon.getRandomness(proofBlock));
  }

  function _getNextRequestId() internal returns (uint256 requestId) {
    requestCount = requestCount.add(1);
    requestId = requestCount;
  }

  function _getCycleByBlock(uint256 blockNum) internal view returns (uint256 cycle) {
    if (blockNum.sub(startBlock) < blockStep) { return 0; }

    uint256 blocksInCycle = blockNum.mod(blockStep);
    return blockNum.sub(blocksInCycle).div(blockStep);
  }
}
