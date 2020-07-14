// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.6.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/SafeCast.sol";
import "@chainlink/contracts/src/v0.6/VRFConsumerBase.sol";

import "./RNGInterface.sol";

///////////////////////////////////////////////////////////
//
//  WARNING NOTE:
//     "requestRandomNumber()" can be called by anyone, potentially draining our $LINK
//     TODO: Add caller protection mechanism? Governor? redirect payment?
//
///////////////////////////////////////////////////////////

contract RNGBlockhash is RNGInterface, VRFConsumerBase, Ownable {
  using SafeMath for uint256;
  using SafeCast for uint256;

  enum RngRequestType {
    INTERNAL,
    CHAINLINK
  }

  struct RngRequest {
    bool isComplete;
    RngRequestType rngType;
  }

  bytes32 internal keyHash;
  uint256 internal threshold;
  uint256 internal fee;
  uint32 internal requestCount;

  //    RequestID => Value
  mapping(uint32 => uint256) public randomNumbers;
  mapping(uint32 => RngRequest) public requestState;

  //  ChainlinkID => RequestID
  mapping(bytes32 => uint32) public chainlinkRequestIds;


  modifier onlyVRFCoordinator {
    require(msg.sender == vrfCoordinator, "RNGBlockhash/invalid-vrf-coordinator");
    _;
  }

  constructor(address _vrfCoordinator, address _link)
    public
    VRFConsumerBase(_vrfCoordinator, _link)
  {
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

  function withdrawLink(uint256 amount) external onlyOwner {
    require(LINK.balanceOf(address(this)) >= amount, "RNGBlockhash/insuff-link");
    require(LINK.transfer(msg.sender, amount), "RNGBlockhash/transfer-failed");
  }

  /**
    *  WARNING NOTE: This can be called by anyone, potentially draining our $LINK
    *     TODO: Add caller protection mechanism? Governor? redirect payment?
    */
  function requestRandomNumber(address token, uint256 budget) external virtual override returns (uint32 requestId, uint32 lockBlock) {
    uint256 seed = _getSeed();
    lockBlock = uint32(block.number);

    // Using Chainlink VRF
    if (budget >= threshold && LINK.balanceOf(address(this)) >= fee) {
      requestId = _requestRandomness(seed);
    }

    // Using blockhash
    else {
      requestId = _generateRandomness(seed);
    }

    emit RandomNumberRequested(requestId, msg.sender, token, budget);
  }

  function isRequestComplete(uint32 requestId) external virtual override view returns (bool isCompleted) {
    return requestState[requestId].isComplete;
  }

  function randomNumber(uint32 requestId) external virtual override view returns (uint256 randomNum) {
    return randomNumbers[requestId];
  }

  //
  // Internal and/or VRF-specific
  //

  function _generateRandomness(uint256 seed) internal returns (uint32 requestId) {
    // Get next request ID
    requestId = _getNextRequestId();

    // Track type/state of request
    requestState[requestId].rngType = RngRequestType.CHAINLINK;

    // Complete request
    _storeResult(requestId, seed);
  }

  function _requestRandomness(uint256 seed) internal returns (uint32 requestId) {
    // Get next request ID
    requestId = _getNextRequestId();

    // Track type/state of request
    requestState[requestId].rngType = RngRequestType.INTERNAL;

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

  function _getNextRequestId() internal returns (uint32 requestId) {
    requestCount = uint256(requestCount).add(1).toUint32();
    requestId = requestCount;
  }

  function _getSeed() internal virtual view returns (uint256 seed) {
    return uint256(blockhash(block.number - 1));
  }

  function _storeResult(uint32 requestId, uint256 result) internal {
    // Store random value
    randomNumbers[requestId] = result;

    // Update state of request
    requestState[requestId].isComplete = true;

    emit RandomNumberCompleted(requestId, result);
  }
}
