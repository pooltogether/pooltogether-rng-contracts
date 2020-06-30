// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.6.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.6/VRFConsumerBase.sol";
// import "./external/chainlink/IVRFCoordinator.sol";

import "./RNGInterface.sol";

contract RNGBlockhash is RNGInterface, VRFConsumerBase, Ownable {
  using SafeMath for uint256;

  uint8 constant internal REQ_STATE_INCOMPLETE = 1;
  uint8 constant internal REQ_STATE_COMPLETE   = 2;
  uint8 constant internal REQ_TYPE_INTERNAL    = 4;
  uint8 constant internal REQ_TYPE_CHAINLINK   = 8;

  bytes32 internal keyHash;
  uint256 internal threshold;
  uint256 public requestCount;

  //    RequestID => Value
  mapping(uint256 => uint256) public randomNumbers;
  mapping(uint256 => uint8) public requestState;

  //  ChainlinkID => RequestID
  mapping(bytes32 => uint256) public chainlinkRequestIds;


  modifier onlyVRFCoordinator {
    require(msg.sender == vrfCoordinator, "RNGBlockhash/invalid-vrf-coordinator");
    _;
  }

  constructor(address _vrfCoordinator, address _link)
    public
    VRFConsumerBase(_vrfCoordinator, _link)
  {
  }

  function getLinkAdress() external view returns (address) {
    return address(LINK);
  }

  function setKeyhash(bytes32 _keyhash) external onlyOwner {
    keyHash = _keyhash;
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
    *                Add caller protection?
    */
  function requestRandomNumber(address token, uint256 budget, uint256 fee) external override returns (uint256 requestId) {
    uint256 seed = uint256(blockhash(block.number));

    // uint256 fee = IVRFCoordinator(vrfCoordinator).serviceAgreements(keyHash).fee;

    // Using Chainlink VRF
    if (budget >= threshold && LINK.balanceOf(address(this)) >= fee) {
      requestId = _requestRandomness(seed, fee);
    }

    // Using blockhash
    else {
      requestId = _generateRandomness(seed);
    }

    emit RandomNumberRequested(requestId, msg.sender, token, budget);
  }

  function isRequestComplete(uint256 requestId) external override view returns (bool isCompleted) {
    return requestState[requestId] & REQ_STATE_COMPLETE == REQ_STATE_COMPLETE;
  }

  function randomNumber(uint256 requestId) external override view returns (uint256 randomNum) {
    return randomNumbers[requestId];
  }

  //
  // Internal and/or VRF-specific
  //

  function _generateRandomness(uint256 seed) internal returns (uint256 requestId) {
    // Get next request ID
    requestId = _getNextRequestId();

    // Track type/state of request
    requestState[requestId] = REQ_TYPE_INTERNAL | REQ_STATE_INCOMPLETE;

    // Complete request
    _storeResult(requestId, seed);
  }

  function _requestRandomness(uint256 seed, uint256 fee) internal returns (uint256 requestId) {
    // Get next request ID
    requestId = _getNextRequestId();

    // Track type/state of request
    requestState[requestId] = REQ_TYPE_CHAINLINK | REQ_STATE_INCOMPLETE;

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
    uint256 internalRequestId = chainlinkRequestIds[requestId];
    _storeResult(internalRequestId, randomness.mod(20).add(1));
  }

  function _getNextRequestId() internal returns (uint256 requestId) {
    requestCount = requestCount.add(1);
    requestId = requestCount;
  }

  function _storeResult(uint256 requestId, uint256 result) internal {
    // Store random value
    randomNumbers[requestId] = result;

    // Update state of request
    requestState[requestId] = (requestState[requestId] | REQ_STATE_COMPLETE) ^ REQ_STATE_INCOMPLETE;

    emit RandomNumberCompleted(requestId, result);
  }
}
