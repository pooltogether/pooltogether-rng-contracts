// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.6.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/SafeCast.sol";
import "@chainlink/contracts/src/v0.6/VRFConsumerBase.sol";

import "./external/starkware/IBeaconContract.sol";

import "./RNGInterface.sol";

///////////////////////////////////////////////////////////
//
//  WARNING NOTE:
//     "requestRandomNumber()" can be called by anyone, potentially draining our $LINK
//     TODO: Add caller protection mechanism? Governor? redirect payment?
//
///////////////////////////////////////////////////////////

contract RNGService is RNGInterface, VRFConsumerBase, Ownable {
  using SafeMath for uint256;
  using SafeCast for uint256;

  enum RngRequestType {
    INTERNAL,
    CHAINLINK,
    STARKWARE
  }

  struct RngRequest {
    bool isComplete;
    RngRequestType rngType;
  }

  uint32 internal requestCount;

  // RequestID => Value
  mapping(uint32 => uint256) public randomNumbers;
  mapping(uint32 => RngRequest) public requestState;

  // VRF specific
  bytes32 internal keyHash;
  uint256 internal threshold;
  uint256 internal fee;

  // VRF Request ID => RequestID
  mapping(bytes32 => uint32) public chainlinkRequestIds;

  // VDF specific
  uint32 public pulse;

  // VDF Request ID => Block number to Lock at
  mapping(uint32 => uint32) internal lockBlockByRequestId;

  // VDF Beacon
  IBeaconContract public vdfBeacon;

  constructor(
    address _vrfCoordinator,
    address _vrfLinkToken,
    address _vdfBeacon,
    uint32 _vdfPulse
  )
    public
    VRFConsumerBase(_vrfCoordinator, _vrfLinkToken)
  {
    vdfBeacon = IBeaconContract(_vdfBeacon);
    pulse = _vdfPulse;
  }

  function setKeyhash(bytes32 _keyhash) external onlyOwner {
    keyHash = _keyhash;
  }

  function setFee(uint256 _fee) external onlyOwner {
    fee = _fee;
  }

  function setThreshold(uint256 _threshold) external onlyOwner {
    threshold = _threshold;
  }

  function setPulse(uint32 _pulse) external onlyOwner {
    pulse = _pulse;
  }

  function withdrawLink(uint256 amount) external onlyOwner {
    require(LINK.balanceOf(address(this)) >= amount, "RNGService/insuff-link");
    require(LINK.transfer(msg.sender, amount), "RNGService/transfer-failed");
  }

  /**
    *  WARNING NOTE: This can be called by anyone, potentially draining our $LINK
    *     TODO: Add caller protection mechanism? Governor? redirect payment?
    */
  function requestRandomNumber(address token, uint256 budget) external virtual override returns (uint32 requestId, uint32 lockBlock) {

    // Using Starkware VRF
    if (budget >= threshold) {
      (requestId, lockBlock) = _requestVDFRandomness();
    }

    else {
      uint256 seed = _getSeed();
      lockBlock = uint32(block.number);

      // Using Chainlink VRF
      if (LINK.balanceOf(address(this)) >= fee) {
        requestId = _requestVRFRandomness(seed);
      }

      // Using blockhash
      else {
        requestId = _generateRandomness(seed);
      }
    }

    emit RandomNumberRequested(requestId, msg.sender, token, budget);
  }

  function isRequestComplete(uint32 requestId) external virtual override view returns (bool isCompleted) {
    if (requestState[requestId].rngType == RngRequestType.STARKWARE) {
      return _getRandomByRequestId(requestId) > 0;
    }
    return requestState[requestId].isComplete;
  }

  function randomNumber(uint32 requestId) external virtual override view returns (uint256 randomNum) {
    if (requestState[requestId].rngType == RngRequestType.STARKWARE) {
      return _getRandomByRequestId(requestId);
    }
    return randomNumbers[requestId];
  }

  //
  // Chainlink-specific
  //

  function _requestVRFRandomness(uint256 seed) internal returns (uint32 requestId) {
    // Get next request ID
    requestId = _getNextRequestId();

    // Track type/state of request
    requestState[requestId].rngType = RngRequestType.CHAINLINK;

    // Complete request
    bytes32 vrfRequestId = requestRandomness(keyHash, fee, seed);
    chainlinkRequestIds[vrfRequestId] = requestId;
  }

  /**
    * @notice Callback function used by VRF Coordinator
    * @dev The VRF Coordinator will only send this function verified responses.
    * @dev The VRF Coordinator will not pass randomness that could not be verified.
    */
  function fulfillRandomness(bytes32 requestId, uint256 randomness) external override onlyVRFCoordinator {
    uint32 internalRequestId = chainlinkRequestIds[requestId];
    _storeResult(internalRequestId, randomness.mod(20).add(1));
  }

  function _getSeed() internal virtual view returns (uint256 seed) {
    return uint256(blockhash(block.number - 1));
  }

  modifier onlyVRFCoordinator {
    require(msg.sender == vrfCoordinator, "RNGService/invalid-vrf-coordinator");
    _;
  }

  //
  // Starkware-specific
  //

  function _requestVDFRandomness() internal returns (uint32 requestId, uint32 lockBlock) {
    uint32 lastRequestId = uint256(requestCount).toUint32();
    uint256 lastLockBlock = lockBlockByRequestId[lastRequestId];
    require(block.number > lastLockBlock, "RNGService/request-in-flight");

    uint256 blockCycle = _getCycleByBlock(block.number).add(1);
    lockBlock = blockCycle.mul(uint256(pulse)).toUint32();

    requestId = _getNextRequestId();
    lockBlockByRequestId[requestId] = lockBlock;

    // Track type/state of request
    requestState[requestId].rngType = RngRequestType.STARKWARE;
  }

  function _getCycleByBlock(uint256 blockNum) internal view returns (uint256 cycle) {
    if (blockNum < pulse) { return 0; }

    uint256 blocksInCycle = blockNum.mod(pulse);
    return blockNum.sub(blocksInCycle).div(pulse);
  }

  function _getRandomByRequestId(uint32 requestId) internal view returns (uint256 randomNum) {
    uint256 lockBlock = lockBlockByRequestId[requestId];
    if (lockBlock == 0) { return 0; }
    return uint256(vdfBeacon.getRandomness(lockBlock));
  }

  //
  // Internal/Generic
  //

  function _getNextRequestId() internal returns (uint32 requestId) {
    requestCount = uint256(requestCount).add(1).toUint32();
    requestId = requestCount;
  }

  function _generateRandomness(uint256 seed) internal returns (uint32 requestId) {
    // Get next request ID
    requestId = _getNextRequestId();

    // Track type/state of request
    requestState[requestId].rngType = RngRequestType.INTERNAL;

    // Complete request
    _storeResult(requestId, seed);
  }

  function _storeResult(uint32 requestId, uint256 result) internal {
    // Store random value
    randomNumbers[requestId] = result;

    // Update state of request
    requestState[requestId].isComplete = true;

    emit RandomNumberCompleted(requestId, result);
  }
}
