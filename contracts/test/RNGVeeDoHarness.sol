// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.6.6;

import "../RNGVeeDo.sol";

contract RNGVeeDoHarness is RNGVeeDo {

  constructor(address _vdfBeacon, uint256 _startBlock, uint256 _pulse)
    public
    RNGVeeDo(_vdfBeacon, _startBlock, _pulse)
  {
  }

  function setProofBlockByRequestIdForTest(uint256 requestId, uint256 proofBlock) external {
    proofBlockByRequestId[requestId] = proofBlock;
  }
}
