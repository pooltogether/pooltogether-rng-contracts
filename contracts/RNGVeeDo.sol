// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.6.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/SafeCast.sol";

import "./external/starkware/IBeaconContract.sol";

import "./RNGInterface.sol";

contract RNGVeeDo is RNGInterface, Ownable {
  using SafeMath for uint256;
  using SafeCast for uint256;

  event RandomNumberReceived(address indexed sender, uint256 randomNumber, uint256 latestCycle);

  uint32 public pulse;
  uint32 public requestCount;

  //    RequestID => Block number to Lock at
  mapping(uint32 => uint32) internal lockBlockByRequestId;

  IBeaconContract public vdfBeacon;

  constructor(address _vdfBeacon, uint32 _pulse) public {
    vdfBeacon = IBeaconContract(_vdfBeacon);
    pulse = _pulse;
  }

  function requestRandomNumber(address token, uint256 budget) external virtual override returns (uint32 requestId, uint32 lockBlock) {
    uint32 lastRequestId = uint256(requestCount).toUint32();
    uint256 lastLockBlock = lockBlockByRequestId[lastRequestId];
    require(block.number > lastLockBlock, "RNGVeeDo/request-in-flight");

    uint256 blockCycle = _getCycleByBlock(block.number).add(1);
    lockBlock = blockCycle.mul(uint256(pulse)).toUint32();

    requestId = _getNextRequestId();
    lockBlockByRequestId[requestId] = lockBlock;

    emit RandomNumberRequested(requestId, msg.sender, token, budget);
  }

  function isRequestComplete(uint32 requestId) external virtual override view returns (bool isCompleted) {
    return _getRandomByRequestId(requestId) > 0;
  }

  function randomNumber(uint32 requestId) external virtual override view returns (uint256 randomNum) {
    return _getRandomByRequestId(requestId);
  }

  function setPulse(uint32 _pulse) external onlyOwner {
    pulse = _pulse;
  }

  function _getRandomByRequestId(uint32 requestId) internal view returns (uint256 randomNum) {
    uint256 lockBlock = lockBlockByRequestId[requestId];
    if (lockBlock == 0) { return 0; }
    return uint256(vdfBeacon.getRandomness(lockBlock));
  }

  function _getNextRequestId() internal returns (uint32 requestId) {
    requestCount = uint256(requestCount).add(1).toUint32();
    requestId = requestCount;
  }

  function _getCycleByBlock(uint256 blockNum) internal view returns (uint256 cycle) {
    if (blockNum < pulse) { return 0; }

    uint256 blocksInCycle = blockNum.mod(pulse);
    return blockNum.sub(blocksInCycle).div(pulse);
  }
}
