// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.6;

import "./RNGInterface.sol";

/**
 * @title RNG Chainlink V2 Interface
 * @notice Provides an interface for requesting random numbers from Chainlink VRF V2.
 */
interface RNGChainlinkV2Interface is RNGInterface {
  /**
   * @notice Get Chainlink VRF subscription id associated with this contract.
   * @return uint64 Chainlink VRF subscription id
   */
  function getSubscriptionId() external view returns (uint64);

  /**
   * @notice Get Chainlink VRF coordinator contract address associated with this contract.
   * @return address Chainlink VRF coordinator address
   */
  function getVrfCoordinator() external view returns (address);

  /**
   * @notice Set Chainlink VRF subscription id associated with this contract.
   * @dev This function is only callable by the owner.
   * @param subId Chainlink VRF subscription id
   */
  function setSubscriptionId(uint64 subId) external;

  /**
   * @notice Set Chainlink VRF callback gas limit.
   * @dev This function is only callable by the owner.
   * @param callbackGasLimit Chainlink VRF callback gas limit
   */
  function setCallbackGasLimit(uint32 callbackGasLimit) external;

  /**
   * @notice Set Chainlink VRF request confirmations.
   * @dev This function is only callable by the owner.
   * @param requestConfirmations Chainlink VRF request confirmations
   */
  function setRequestConfirmations(uint16 requestConfirmations) external;

  /**
   * @notice Set Chainlink VRF keyHash.
   * @dev This function is only callable by the owner.
   * @param keyHash Chainlink VRF keyHash
   */
  function setKeyhash(bytes32 keyHash) external;
}
