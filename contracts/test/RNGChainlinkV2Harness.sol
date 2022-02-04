// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.6;

import "../RNGChainlinkV2.sol";

contract RNGChainlinkV2Harness is RNGChainlinkV2 {
  constructor(
    address _owner,
    address vrfCoordinator_,
    uint64 _subId,
    uint32 _callbackGasLimit,
    uint16 _requestConfirmations,
    uint32 _numWords,
    bytes32 _keyHash
  )
    RNGChainlinkV2(
      _owner,
      vrfCoordinator_,
      _subId,
      _callbackGasLimit,
      _requestConfirmations,
      _numWords,
      _keyHash
    )
  {}

  function getInternalRequestId(uint256 _requestId) external view returns (uint32) {
    return chainlinkRequestIds[_requestId];
  }

  function subscribe() external {
    address[] memory consumers = new address[](1);
    consumers[0] = address(this);
    sRequestConfig.subId = _vrfCoordinator.createSubscription();
    _vrfCoordinator.addConsumer(sRequestConfig.subId, consumers[0]);
  }

  function setRequestCounter(uint32 _requestCounter) external {
    requestCounter = _requestCounter;
  }

  function rawFulfillRandomWordsStub(uint256 requestId, uint256[] memory randomWords) external {
    fulfillRandomWords(requestId, randomWords);
  }
}
