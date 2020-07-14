// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.6.6;

import "../RNGVeeDo.sol";

contract RNGVeeDoHarness is RNGVeeDo {

  constructor(address _vdfBeacon, uint32 _pulse)
    public
    RNGVeeDo(_vdfBeacon, _pulse)
  {
  }

  function setLockBlockByRequestIdForTest(uint32 requestId, uint32 lockBlock) external {
    lockBlockByRequestId[requestId] = lockBlock;
  }
}
