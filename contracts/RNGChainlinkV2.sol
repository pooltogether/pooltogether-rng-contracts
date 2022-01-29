// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.6;

import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/dev/VRFConsumerBaseV2.sol";
import "@pooltogether/owner-manager-contracts/contracts/Manageable.sol";

import "./interfaces/RNGChainlinkV2Interface.sol";

contract RNGChainlinkV2 is RNGChainlinkV2Interface, VRFConsumerBaseV2, Manageable {
  /* ============ Global Variables ============ */

  /// @dev Reference to the VRFCoordinatorV2 deployed contract
  VRFCoordinatorV2Interface private _vrfCoordinator;

  /// @dev Reference to the LINK token contract.
  LinkTokenInterface private immutable _linkToken;

  /// @dev The keyhash used by the Chainlink VRF
  bytes32 public keyHash;

  /// @dev A counter for the number of requests made used for request ids
  uint256 public requestCounter;

  /// @dev A list of random numbers from past requests mapped by request id
  mapping(uint256 => uint256) internal randomNumbers;

  /// @dev A list of blocks to be locked at based on past requests mapped by request id
  mapping(uint256 => uint256) internal requestLockBlock;

  /// @dev A mapping from Chainlink request ids to internal request ids
  mapping(uint256 => uint256) internal chainlinkRequestIds;

  /// @notice Chainlink VRF subscription request configuration
  RequestConfig public sRequestConfig;

  /// @notice Chainlink VRF subscription random words
  uint256[] public sRandomWords;

  /// @notice Chainlink VRF subscription request id
  uint256 public sRequestId;

  /* ============ Structs ============ */

  /**
   * @notice Chainlink VRF request configuration to request random numbers
   * @param subId Chainlink VRF subscription id
   * @param callbackGasLimit How much gas you would like in your callback to do work with the random words provided.
   * Must be less than the coordinators `maxGasLimit`.
   * @param requestConfirmations How many confirmations the Chainlink node should wait before responding.
   * The longer the node waits the more secure the random value is.
   * Must be greater than the coordinator's `minimumRequestBlockConfirmations`.
   * @param numWords Number of random values to receive
   * @param keyHash Hash of the public key used to verify the VRF proof
   */
  struct RequestConfig {
    uint64 subId;
    uint32 callbackGasLimit;
    uint16 requestConfirmations;
    uint32 numWords;
    bytes32 keyHash;
  }

  /* ============ Events ============ */

  /**
   * @notice Emmited when the Chainlink VRF keyHash is set
   * @param keyHash Chainlink VRF keyHash
   */
  event KeyHashSet(bytes32 keyHash);

  /**
   * @notice Emmited when the Chainlink VRF Coordinator address is set
   * @param vrfCoordinator Address of the VRF Coordinator
   */
  event VrfCoordinatorSet(VRFCoordinatorV2Interface indexed vrfCoordinator);

  /* ============ Constructor ============ */

  /**
   * @notice Constructor of the contract
   * @param _owner Owner of the contract
   * @param vrfCoordinator_ Address of the VRF Coordinator
   * @param linkToken_ Address of the LINK token contract
   * @param _subscriptionId Chainlink VRF subscription id
   * @param _callbackGasLimit How much gas you would like in your callback to do work with the random words provided.
   * Must be less than the coordinators `maxGasLimit`.
   * @param _requestConfirmations How many confirmations the Chainlink node should wait before responding.
   * The longer the node waits the more secure the random value is.
   * Must be greater than the coordinator's `minimumRequestBlockConfirmations`.
   * @param _numWords Number of random values to receive
   * @param _keyHash Hash of the public key used to verify the VRF proof
   */
  constructor(
    address _owner,
    address vrfCoordinator_,
    address linkToken_,
    uint64 _subscriptionId,
    uint32 _callbackGasLimit,
    uint16 _requestConfirmations,
    uint32 _numWords,
    bytes32 _keyHash
  ) Ownable(_owner) VRFConsumerBaseV2(vrfCoordinator_) {
    require(vrfCoordinator_ != address(0), "RNGChainLink/vrf-not-zero-addr");
    require(linkToken_ != address(0), "RNGChainLink/link-not-zero-addr");
    require(_subscriptionId > 0, "RNGChainLink/subId-gt-zero");
    require(_callbackGasLimit > 0, "RNGChainLink/gas-limit-gt-zero");
    require(_requestConfirmations > 0, "RNGChainLink/request-gt-zero");
    require(_numWords > 0, "RNGChainLink/numWords-gt-zero");
    require(_keyHash != bytes32(0), "RNGChainLink/keyHash-not-zero");

    _vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinator_);
    _linkToken = LinkTokenInterface(linkToken_);
    keyHash = _keyHash;

    sRequestConfig = RequestConfig({
      subId: _subscriptionId,
      callbackGasLimit: _callbackGasLimit,
      requestConfirmations: _requestConfirmations,
      numWords: _numWords,
      keyHash: _keyHash
    });

    emit KeyHashSet(_keyHash);
    emit VrfCoordinatorSet(_vrfCoordinator);
  }

  /* ============ External Functions ============ */

  /// @inheritdoc RNGInterface
  function requestRandomNumber() external override onlyManager returns (uint256 requestId, uint256 lockBlock) {
    lockBlock = block.number;

    _requestRandomWords(sRequestConfig);

    requestId = sRequestId;
    requestLockBlock[requestId] = lockBlock;

    emit RandomNumberRequested(requestId, msg.sender);
  }

  /// @inheritdoc RNGInterface
  function isRequestComplete(uint256 requestId) external view override returns (bool isCompleted) {
    return randomNumbers[requestId] != 0;
  }

  /// @inheritdoc RNGInterface
  function randomNumber(uint256 requestId) external view override returns (uint256 randomNum) {
    return randomNumbers[requestId];
  }

  /// @inheritdoc RNGInterface
  function getLastRequestId() external view override returns (uint256 requestId) {
    return requestCounter;
  }

  /// @inheritdoc RNGChainlinkV2Interface
  function getLink() external view override returns (address) {
    return address(_linkToken);
  }

  /// @inheritdoc RNGChainlinkV2Interface
  function getSubscriptionId() public view override returns (uint64) {
    return sRequestConfig.subId;
  }

  /// @inheritdoc RNGChainlinkV2Interface
  function setKeyhash(bytes32 _keyhash) external override onlyOwner {
    sRequestConfig.keyHash = _keyhash;

    emit KeyHashSet(_keyhash);
  }

  /* ============ Internal Functions ============ */

  /**
   * @notice Callback function called by VRF Coordinator
   * @dev The VRF Coordinator will only call it once it has verified the proof associated with the randomness.
   */
  function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
    require(_requestId == sRequestId, "RNGChainLink/requestId-incorrect");
    sRandomWords = _randomWords;

    uint256 _internalRequestId = chainlinkRequestIds[_requestId];
    uint256 _randomNumber = _randomWords[0];

    randomNumbers[_internalRequestId] = _randomNumber;

    emit RandomNumberCompleted(_internalRequestId, _randomNumber);
  }

  /**
   * @notice Requests new random words from the Chainlink VRF.
   * @dev The result of the request is returned in the function `fulfillRandomWords`.
   * @dev Will revert if subscription is not set and/or funded.
   */
  function _requestRandomWords(RequestConfig memory _requestConfig) internal {
    uint256 _vrfRequestId = _vrfCoordinator.requestRandomWords(
      _requestConfig.keyHash,
      _requestConfig.subId,
      _requestConfig.requestConfirmations,
      _requestConfig.callbackGasLimit,
      _requestConfig.numWords
    );

    sRequestId = _vrfRequestId;
    chainlinkRequestIds[_vrfRequestId] = requestCounter;

    emit RandomNumberRequested(requestCounter++, msg.sender);
  }
}
