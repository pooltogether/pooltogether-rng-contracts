// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.6;

import "./RNGInterface.sol";

/**
* @title RNG Chainlink V2 Interface
* @notice Provides an interface for requesting random numbers from Chainlink VRF V2.
*/
interface RNGChainlinkV2Interface is RNGInterface {
  /**
   * @notice Get LINK token address.
   * @return address LINK token address
   */
  function getLink() external view returns (address);

  /**
   * @notice Get Chainlink VRF subscription id associated with this contract.
   * @return uint64 Chainlink VRF subscription id
   */
  function getSubscriptionId() external view returns (uint64);

  /**
   * @notice Set Chainlink VRF keyhash
   * @param _keyhash The keyhash to be used by Chainlink VRF
   */
  function setKeyhash(bytes32 _keyhash) external;
}
