// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.6;

import "../RNGChainlink.sol";

contract RNGChainlinkHarness is RNGChainlink {
  uint256 internal _seed;

  constructor(
    address _owner,
    address vrfCoordinator_,
    address linkToken_,
    uint32 _callbackGasLimit,
    uint16 _requestConfirmations,
    uint32 _numWords,
    bytes32 _keyHash
  )
    RNGChainlink(
      _owner,
      vrfCoordinator_,
      linkToken_,
      _callbackGasLimit,
      _requestConfirmations,
      _numWords,
      _keyHash
    )
  {}

  function setRequestCount(uint32 _requestCount) external {
    requestCounter = _requestCount;
  }

  function setRandomNumber(uint32 requestId, uint256 rand) external {
    randomNumbers[requestId] = rand;
  }
}
