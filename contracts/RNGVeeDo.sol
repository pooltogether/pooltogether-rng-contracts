// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.6.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "./external/starkware/IBeaconContract.sol";

import "./RNGInterface.sol";

contract RNGVeeDo is RNGInterface, Ownable {
  using SafeMath for uint256;

  event RandomNumberReceived(address indexed sender, uint256 randomNumber, uint256 latestCycle);

  uint256 public startBlock;
  uint256 public pulse;
  uint256 public requestCount;

  //    RequestID => Block number of Proof
  mapping(uint256 => uint256) internal proofBlockByRequestId;

  IBeaconContract public vdfBeacon;

  constructor(address _vdfBeacon, uint256 _startBlock, uint256 _pulse) public {
    vdfBeacon = IBeaconContract(_vdfBeacon);
    startBlock = _startBlock;
    pulse = _pulse;
  }

  function requestRandomNumber(address token, uint256 budget) external virtual override returns (uint256 requestId) {
    uint256 blockCycle = _getCycleByBlock(block.number).add(1);
    uint256 nextProofBlock = startBlock.add(blockCycle.mul(pulse));

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

  function setStartBlock(uint256 _startBlock) external onlyOwner {
    startBlock = _startBlock;
  }

  function setPulse(uint256 _pulse) external onlyOwner {
    pulse = _pulse;
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
    if (blockNum.sub(startBlock) < pulse) { return 0; }

    uint256 blocksInCycle = blockNum.mod(pulse);
    return blockNum.sub(blocksInCycle).div(pulse);
  }
}
