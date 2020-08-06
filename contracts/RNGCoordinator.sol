// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.6.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/SafeCast.sol";

import "./utils/ExtendedSafeCast.sol";
import "./RNGInterface.sol";


/// @title Coordinator for multiple RNG Services
/// @notice Coordinates requests to the appropriate RNG Service by specific request id
contract RNGCoordinator is RNGInterface, Ownable {
  using SafeMath for uint256;
  using SafeCast for uint256;
  using ExtendedSafeCast for uint256;

  /// @notice Type for looking up the RNG Service by request-id
  /// @dev The offset is relative to when the RNG service is added
  /// @dev The offset is used to align the request-ids passed into this contract
  /// with the request-ids of the external RNG services
  struct RngServiceLookup {
    uint96 offsetRequestId;
    address service;
  }

  /// @dev A list of RNG services managed by the coordinator
  RngServiceLookup[] internal rngServices;

  constructor() public {}

  /// @notice Allows the Owner/Governor to add an RNG service to be used by the coordinator
  /// @dev The new service will be used for new requests, and old services get phased out
  /// @param _rngService The address of the new RNG service
  function addRngService(address _rngService) external onlyOwner {
    require(_rngService != address(0), "RNGCoordinator/invalid-rng-service");

    uint96 offsetRequestId;
    uint serviceCount = rngServices.length;
    if (serviceCount > 0) {
      RngServiceLookup storage rng = rngServices[serviceCount - 1];
      offsetRequestId = uint256(RNGInterface(rng.service).getLastRequestId()).add(rng.offsetRequestId).toUint96();
    }

    // Add RNG Service
    rngServices.push(RngServiceLookup({
      offsetRequestId: offsetRequestId,
      service: _rngService
    }));
  }

  /// @notice Gets the next request id that will be used by the RNG service
  /// @dev Returns the next unused request id and must not update internal state
  /// @return requestId The next unused request id that will be used in the next request
  function getLastRequestId() external override view returns (uint32 requestId) {
    RngServiceLookup storage rng = rngServices[rngServices.length - 1];
    return uint256(RNGInterface(rng.service).getLastRequestId()).add(rng.offsetRequestId).toUint32();
  }

  /// @notice Sends a request for a random number to the 3rd-party service
  /// @dev Some services will complete the request immediately, others may have a time-delay
  /// @dev Some services require payment in the form of a `token`, such as $LINK for Chainlink VRF
  /// @param token The address of the payment token required to use the service (a balance should be held in the calling contract)
  /// @param budget The budget of the calling contract (its balance of the payment token).
  /// @return requestId The ID of the request used to get the results of the RNG service
  /// @return lockBlock The block number at which the RNG service will start generating time-delayed randomness.  The calling contract
  /// should "lock" all activity until the result is available via the `requestId`
  function requestRandomNumber(address token, uint256 budget) external override returns (uint32 requestId, uint32 lockBlock) {
    RngServiceLookup storage rng = rngServices[rngServices.length - 1];
    (requestId, lockBlock) = RNGInterface(rng.service).requestRandomNumber(token, budget);
    requestId = uint256(requestId).add(rng.offsetRequestId).toUint32();
  }

  /// @notice Checks if the request for randomness from the 3rd-party service has completed
  /// @dev For time-delayed requests, this function is used to check/confirm completion
  /// @param requestId The ID of the request used to get the results of the RNG service
  /// @return True if the request has completed and a random number is available, false otherwise
  function isRequestComplete(uint32 requestId) external override view returns (bool) {
    uint256 serviceIndex = _lookupServiceByRequestId(requestId);
    RngServiceLookup storage rng = rngServices[serviceIndex];
    uint32 offsetRequestId = uint256(requestId).sub(rng.offsetRequestId).toUint32();
    return RNGInterface(rng.service).isRequestComplete(offsetRequestId);
  }

  /// @notice Gets the random number produced by the 3rd-party service
  /// @param requestId The ID of the request used to get the results of the RNG service
  /// @return The random number
  function randomNumber(uint32 requestId) external override view returns (uint256) {
    uint256 serviceIndex = _lookupServiceByRequestId(requestId);
    RngServiceLookup storage rng = rngServices[serviceIndex];
    uint32 offsetRequestId = uint256(requestId).sub(rng.offsetRequestId).toUint32();
    return RNGInterface(rng.service).randomNumber(offsetRequestId);
  }

  /// @dev Lookup the RNG service used by the specific request id
  /// @dev Allows existing requests to continue utilizing the same RNG service
  /// @param requestId The ID of the request used to get the results of the RNG service
  /// @return index The index of the RNG service within the `rngServices` array
  function _lookupServiceByRequestId(uint32 requestId) internal view returns (uint256 index) {
    require(rngServices.length > 0, "RNGCoordinator/no-rng-service");

    uint256 serviceCount = rngServices.length - 1;
    for (index = serviceCount; index >= 0; index--) {
      if (rngServices[index].offsetRequestId < requestId) {
        return index;
      }
    }
  }
}
