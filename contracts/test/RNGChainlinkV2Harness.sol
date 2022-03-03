// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.6;

import "../RNGChainlinkV2.sol";

contract RNGChainlinkV2Harness is RNGChainlinkV2 {
  constructor(
    address _owner,
    VRFCoordinatorV2Interface _vrfCoordinator,
    uint64 _subscriptionId,
    bytes32 _keyHash
  )
    RNGChainlinkV2(
      _owner,
      _vrfCoordinator,
      _subscriptionId,
      _keyHash
    )
  {}

  function subscribe() external {
    address[] memory consumers = new address[](1);
    consumers[0] = address(this);
    subscriptionId = vrfCoordinator.createSubscription();
    vrfCoordinator.addConsumer(subscriptionId, consumers[0]);
  }

  function setRequestCounter(uint32 _requestCounter) external {
    requestCounter = _requestCounter;
  }

  function rawFulfillRandomWordsStub(uint256 requestId, uint256[] memory randomWords) external {
    fulfillRandomWords(requestId, randomWords);
  }
}
