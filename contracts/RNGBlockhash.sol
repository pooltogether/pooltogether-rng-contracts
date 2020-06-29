// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.6.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.6/VRFConsumerBase.sol";

import "./RNGInterface.sol";

contract RNGBlockhash is RNGInterface, VRFConsumerBase, Ownable {
  using SafeMath for uint256;

  bytes32 internal keyHash;
  uint256 internal fee;
  uint256 internal threshold;

  uint256 public requestCount;
  mapping(uint256 => bool) public completed;
  mapping(uint256 => uint256) public randomNumbers;

  modifier onlyVRFCoordinator {
      require(msg.sender == vrfCoordinator, "RNGBlockhash/invalid-vrf-coordinator");
          _;
  }

  constructor(address _vrfCoordinator, address _link) VRFConsumerBase(_vrfCoordinator, _link) public {
    vrfCoordinator = _vrfCoordinator;
    LINK = LinkTokenInterface(_link);
    fee = 10 ** 18;
  }

  function setKeyhash(bytes32 _keyhash) external  onlyOwner {
    keyHash = _keyhash;
  }
  function setFee(uint256 _fee) external onlyOwner {
    fee = _fee;
  }
  function setThreshold(uint256 _threshold) external onlyOwner {
    threshold = _threshold;
  }

  function balanceOfLink() external view returns (uint256 balance) {
    return LINK.balanceOf(address(this));
  }
  function withdrawLink(uint256 amount) external onlyOwner {
    require(LINK.balanceOf(address(this)) >= amount, "RNGBlockhash/insuff-link");
    require(LINK.transfer(msg.sender, amount), "RNGBlockhash/transfer-failed");
  }

  /**
    * @notice Requests randomness from a user-provided seed
    * @dev The user-provided seed is hashed with the current blockhash as an additional precaution.
    * @dev   1. In case of block re-orgs, the revealed answers will not be re-used again.
    * @dev   2. In case of predictable user-provided seeds, the seed is mixed with the less predictable blockhash.
    *
    *  WARNING NOTE: This can be called by anyone, potentially draining our $LINK
    *                Add caller protection?
    *
    */
  function requestRandomNumber(uint256 seed, address token, uint256 budget) external override returns (uint256 requestId) {
    uint256 seedHash = uint256(keccak256(abi.encode(seed, blockhash(block.number)))); // Hash user seed and blockhash

    // Using Chainlink VRF
    if (budget >= threshold && LINK.balanceOf(address(this)) >= fee) {
      requestId = _requestRandomness(seedHash);
    }

    // Using blockhash
    else {
      requestId = _generateRandomness(seedHash);
    }

    emit RandomNumberRequested(requestId, msg.sender, token, budget);
  }

  function isRequestComplete(uint256 requestId) external override view returns (bool isCompleted) {
    return completed[requestId];
  }

  function randomNumber(uint256 requestId) external override view returns (uint256 randomNum) {
    return randomNumbers[requestId];
  }

  //
  // Internal and/or VRF-specific
  //

  function _generateRandomness(uint256 seed) internal returns (uint256 requestId) {
    requestCount = requestCount.add(1);
    //
    // WARNING NOTE: May eventualy clash with requestIds from VRF
    //
    requestId = requestCount;
    _storeResult(requestId, seed);
  }

  function _requestRandomness(uint256 seed) internal returns (uint256 requestId) {
    LINK.transferAndCall(vrfCoordinator, fee, abi.encode(keyHash, seed));
    uint256 vRFSeed  = makeVRFInputSeed(keyHash, seed, address(this), nonces[keyHash]);
    // nonces[keyHash] must stay in sync with
    // VRFCoordinator.nonces[keyHash][this], which was incremented by the above
    // successful LINK.transferAndCall (in VRFCoordinator.randomnessRequest)
    nonces[keyHash] = nonces[keyHash].add(1);
    return uint256(makeRequestId(keyHash, vRFSeed));
  }

  /**
    * @notice Callback function used by VRF Coordinator
    * @dev The VRF Coordinator will only send this function verified responses.
    * @dev The VRF Coordinator will not pass randomness that could not be verified.
    */
  function fulfillRandomness(bytes32 requestId, uint256 randomness) external override onlyVRFCoordinator {
    _storeResult(uint256(requestId), randomness.mod(20).add(1));
  }

  function _storeResult(uint256 requestId, uint256 result) internal {
    randomNumbers[requestId] = result;
    completed[requestId] = true;

    emit RandomNumberCompleted(requestId, result);
  }
}
