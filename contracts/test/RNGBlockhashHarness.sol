// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.6.6;

import "../RNGBlockhash.sol";

contract RNGBlockhashHarness is RNGBlockhash {

  constructor(address _vrfCoordinator, address _link)
    public
    RNGBlockhash(_vrfCoordinator, _link)
  {
  }

  function setRandomNumber(uint32 requestId, uint256 rand) external {
    randomNumbers[requestId] = rand;
  }
  function setRequestState(uint32 requestId, bool isComplete) external {
    requestState[requestId].isComplete = isComplete;
  }
  function setRequestType(uint32 requestId, uint8 rngType) external {
    requestState[requestId].rngType = RngRequestType(rngType);
  }

  function _getSeed() internal override view returns (uint256 seed) {
    return uint256(blockhash(block.number - 2)); // -2 since unit-test is 1 mock behind
  }
}