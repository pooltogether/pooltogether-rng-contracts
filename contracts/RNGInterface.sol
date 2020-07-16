// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.6.0;

/// @title Random Number Generator Interface
/// @notice Provides an interface for requesting random numbers from 3rd-party RNG services (Chainlink VRF, Starkware VDF, etc..)
interface RNGInterface {

  /// @notice Emitted when a new request for a random number has been submitted
  /// @param id The indexed ID of the request used to get the results of the RNG service
  /// @param sender The indexed address of the sender of the request
  /// @param token The address of the payment token required to use the service
  /// @param budget The budget of the calling contract in the payment token
  event RandomNumberRequested(uint32 indexed id, address indexed sender, address token, uint256 budget);

  /// @notice Emitted when an existing request for a random number has been completed
  /// @param id The indexed ID of the request used to get the results of the RNG service
  /// @param randomNumber The random number produced by the 3rd-party service
  event RandomNumberCompleted(uint32 indexed id, uint256 randomNumber);

  /// @notice Sends a request for a random number to the 3rd-party service
  /// @dev Some services will complete the request immediately, others may have a time-delay
  /// @dev Some services require payment in the form of a `token`, such as $LINK for Chainlink VRF
  /// @param token The address of the payment token required to use the service (a balance should be held in the calling contract)
  /// @param budget The budget of the calling contract (its balance of the payment token).  If the `budget` is less than the
  /// service-fee, then the RNG will fallback to using blockhash-based randomness
  /// @return requestId The ID of the request used to get the results of the RNG service
  /// @return lockBlock The block number at which the RNG service will start generating time-delayed randomness.  The calling contract
  /// should "lock" all activity until the result is available via the `requestId`
  function requestRandomNumber(address token, uint256 budget) external returns (uint32 requestId, uint32 lockBlock);

  /// @notice Checks if the request for randomness from the 3rd-party service has completed
  /// @dev For time-delayed requests, this function is used to check/confirm completion
  /// @param id The ID of the request used to get the results of the RNG service
  /// @return True if the request has completed and a random number is available, false otherwise
  function isRequestComplete(uint32 id) external view returns (bool);

  /// @notice Gets the random number produced by the 3rd-party service
  /// @param id The ID of the request used to get the results of the RNG service
  /// @return The random number
  function randomNumber(uint32 id) external view returns (uint256);
}
