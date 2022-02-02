// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.6;

import "../RNGBlockhash.sol";

contract RNGBlockhashHarness is RNGBlockhash {
  uint256 internal _seed;

  function setRequestCount(uint32 _requestCount) external {
    requestCount = _requestCount;
  }

  function setRandomNumber(uint256 requestId, uint256 rand) external {
    randomNumbers[requestId] = rand;
  }

  function setSeed(uint256 seed) external {
    _seed = seed;
  }

  function _getSeed() internal view override returns (uint256 seed) {
    return _seed;
  }
}
