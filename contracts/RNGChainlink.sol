// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.6.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/SafeCast.sol";
import "@chainlink/contracts/src/v0.6/VRFConsumerBase.sol";

import "./RNGInterface.sol";

contract RNGChainlink is RNGInterface, VRFConsumerBase, Ownable {
  using SafeMath for uint256;
  using SafeCast for uint256;

  /// @dev The keyhash used by the Chainlink VRF
  bytes32 internal keyHash;

  /// @dev The request fee of the Chainlink VRF
  uint256 internal fee;

  /// @dev A counter for the number of requests made used for request ids
  uint32 internal requestCount;

  /// @dev A list of random numbers from past requests mapped by request id
  mapping(uint32 => uint256) internal randomNumbers;

  /// @dev A list of blocks to be locked at based on past requests mapped by request id
  mapping(uint32 => uint32) internal requestLockBlock;

  /// @dev A mapping from Chainlink request ids to internal request ids
  mapping(bytes32 => uint32) internal chainlinkRequestIds;

  /// @dev Ensure calls are made only by the VRF Coordinator
  modifier onlyVRFCoordinator {
    require(msg.sender == vrfCoordinator, "RNGChainlink/invalid-vrf-coordinator");
    _;
  }

  /// @dev Public constructor
  constructor(address _vrfCoordinator, address _link)
    public
    VRFConsumerBase(_vrfCoordinator, _link)
  {
  }

  /// @notice Allows governance to set the VRF keyhash
  /// @param _keyhash The keyhash to be used by the VRF
  function setKeyhash(bytes32 _keyhash) external onlyOwner {
    keyHash = _keyhash;
  }

  /// @notice Allows governance to set the fee per request required by the VRF
  /// @param _fee The fee to be charged for a request
  function setFee(uint256 _fee) external onlyOwner {
    fee = _fee;
  }

  /// @notice Gets the last request id used by the RNG service
  /// @return requestId The last request id used in the last request
  function getLastRequestId() external override view returns (uint32 requestId) {
    return requestCount;
  }

  /// @notice Gets the Fee for making a Request against an RNG service
  /// @return feeToken The address of the token that is used to pay fees
  /// @return requestFee The fee required to be paid to make a request
  function getRequestFee() external override view returns (address feeToken, uint256 requestFee) {
    return (address(LINK), fee);
  }

  /// @notice Sends a request for a random number to the 3rd-party service
  /// @dev Some services will complete the request immediately, others may have a time-delay
  /// @dev Some services require payment in the form of a token, such as $LINK for Chainlink VRF
  /// @return requestId The ID of the request used to get the results of the RNG service
  /// @return lockBlock The block number at which the RNG service will start generating time-delayed randomness.  The calling contract
  /// should "lock" all activity until the result is available via the `requestId`
  function requestRandomNumber() external override returns (uint32 requestId, uint32 lockBlock) {
    uint256 seed = _getSeed();
    lockBlock = uint32(block.number);

    // collect fee for payment
    require(LINK.transferFrom(msg.sender, address(this), fee), "RNGChainlink/fee-transfer-failed");

    // send request (costs fee)
    requestId = _requestRandomness(seed);

    requestLockBlock[requestId] = lockBlock;

    emit RandomNumberRequested(requestId, msg.sender);
  }

  /// @notice Checks if the request for randomness from the 3rd-party service has completed
  /// @dev For time-delayed requests, this function is used to check/confirm completion
  /// @param requestId The ID of the request used to get the results of the RNG service
  /// @return isCompleted True if the request has completed and a random number is available, false otherwise
  function isRequestComplete(uint32 requestId) external override view returns (bool isCompleted) {
    return block.number > requestLockBlock[requestId];
  }

  /// @notice Gets the random number produced by the 3rd-party service
  /// @param requestId The ID of the request used to get the results of the RNG service
  /// @return randomNum The random number
  function randomNumber(uint32 requestId) external override returns (uint256 randomNum) {
    return randomNumbers[requestId];
  }

  /// @dev Requests a new random number from the Chainlink VRF
  /// @dev The result of the request is returned in the function `fulfillRandomness`
  /// @param seed The seed used as entropy for the request
  function _requestRandomness(uint256 seed) internal returns (uint32 requestId) {
    // Get next request ID
    requestId = _getNextRequestId();

    // Complete request
    bytes32 vrfRequestId = requestRandomness(keyHash, fee, seed);
    chainlinkRequestIds[vrfRequestId] = requestId;
  }

  /// @notice Callback function used by VRF Coordinator
  /// @dev The VRF Coordinator will only send this function verified responses.
  /// @dev The VRF Coordinator will not pass randomness that could not be verified.
  function fulfillRandomness(bytes32 requestId, uint256 randomness) external override onlyVRFCoordinator {
    uint32 internalRequestId = chainlinkRequestIds[requestId];
    _storeResult(internalRequestId, randomness.mod(20).add(1));
  }

  /// @dev Gets the next consecutive request ID to be used
  /// @return requestId The ID to be used for the next request
  function _getNextRequestId() internal returns (uint32 requestId) {
    requestCount = uint256(requestCount).add(1).toUint32();
    requestId = requestCount;
  }

  /// @dev Gets a seed for a random number from the latest available blockhash
  /// @return seed The seed to be used for generating a random number
  function _getSeed() internal virtual view returns (uint256 seed) {
    return uint256(blockhash(block.number - 1));
  }

  /// @dev Stores the latest random number by request ID and logs the event
  /// @param requestId The ID of the request to store the random number
  /// @param result The random number for the request ID
  function _storeResult(uint32 requestId, uint256 result) internal {
    // Store random value
    randomNumbers[requestId] = result;

    emit RandomNumberCompleted(requestId, result);
  }
}
