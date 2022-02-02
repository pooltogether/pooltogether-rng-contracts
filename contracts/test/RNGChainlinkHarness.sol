// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.6;

import "../RNGChainlink.sol";

contract RNGChainlinkHarness is RNGChainlink {
  constructor(address _vrfCoordinator, address _link) RNGChainlink(_vrfCoordinator, _link) {}

  function setRequestCount(uint32 _requestCount) external {
    requestCount = _requestCount;
  }

  function setRandomNumber(uint256 requestId, uint256 rand) external {
    randomNumbers[requestId] = rand;
  }
}
