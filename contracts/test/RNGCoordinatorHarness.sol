// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.6.6;

import "../RNGCoordinator.sol";


/// @title Coordinator for multiple RNG Services
/// @notice Coordinates requests to the appropriate RNG Service by specific request id
contract RNGCoordinatorHarness is RNGCoordinator {

  function resetServices() external {
    delete rngServices;
  }
}
