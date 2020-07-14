// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.6.0;

interface RNGInterface {
  event RandomNumberRequested(uint32 indexed id, address indexed sender, address token, uint256 budget);
  event RandomNumberCompleted(uint32 indexed id, uint256 randomNumber);

  function requestRandomNumber(address token, uint256 budget) external returns (uint32 requestId, uint32 lockBlock);
  function isRequestComplete(uint32 id) external view returns (bool);
  function randomNumber(uint32 id) external view returns (uint256);
}
