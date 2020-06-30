// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.6.6;

import "../RNGInterface.sol";

contract RNGBlockhashHarness is RNGInterface {

  uint256 internal random;

  function setRandomNumber(uint256 rando) external {
    random = rando;
  }

  function requestRandomNumber(address, uint256, uint256) external override returns (uint256) {
    return 1;
  }

  function isRequestComplete(uint256) external override view returns (bool) {
    return true;
  }

  function randomNumber(uint256) external override view returns (uint256) {
    return random;
  }
}