// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.6;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/dev/VRFConsumerBaseV2.sol";
import "@pooltogether/owner-manager-contracts/contracts/Manageable.sol";

import "./RNGChainlinkV2Interface.sol";

contract RNGChainlinkV2 is RNGChainlinkV2Interface, VRFConsumerBaseV2, Manageable {
  /* ============ Global Variables ============ */

  /// @dev Reference to the VRFCoordinatorV2 deployed contract
  VRFCoordinatorV2Interface internal _vrfCoordinator;

  /// @dev A counter for the number of requests made used for request ids
  uint32 public requestCounter;

  /// @dev A list of random numbers from past requests mapped by request id
  mapping(uint32 => uint256) internal randomNumbers;

  /// @dev A list of blocks to be locked at based on past requests mapped by request id
  mapping(uint32 => uint32) internal requestLockBlock;

  /// @dev A mapping from Chainlink request ids to internal request ids
  mapping(uint256 => uint32) internal chainlinkRequestIds;

  /// @notice Chainlink VRF subscription request configuration
  RequestConfig public sRequestConfig;

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
   * @notice Emmited when the Chainlink VRF subscription id is set
   * @param subId Chainlink VRF subscription id
   */
  event SubscriptionIdSet(uint64 subId);

  /**
   * @notice Emmited when the Chainlink VRF callback gas limit is set
   * @param callbackGasLimit Chainlink VRF callback gas limit
   */
  event CallbackGasLimitSet(uint32 callbackGasLimit);

  /**
   * @notice Emmited when the Chainlink VRF request confirmations is set
   * @param requestConfirmations Chainlink VRF request confirmations
   */
  event RequestConfirmationsSet(uint16 requestConfirmations);

  /**
   * @notice Emmited when the Chainlink VRF keyHash is set
   * @param keyHash Chainlink VRF keyHash
   */
  event KeyHashSet(bytes32 keyHash);

  /**
   * @notice Emmited when the Chainlink VRF request configuration is set
   * @param sRequestConfig Chainlink VRF request configuration
   */
  event RequestConfigSet(RequestConfig sRequestConfig);

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
   * @param _subId Chainlink VRF subscription id
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
    uint64 _subId,
    uint32 _callbackGasLimit,
    uint16 _requestConfirmations,
    uint32 _numWords,
    bytes32 _keyHash
  ) Ownable(_owner) VRFConsumerBaseV2(vrfCoordinator_) {
    require(vrfCoordinator_ != address(0), "RNGChainLink/vrf-not-zero-addr");
    _requireSubId(_subId);
    _requireCallbackGasLimit(_callbackGasLimit);
    _requireRequestConfirmations(_requestConfirmations);
    require(_numWords > 0, "RNGChainLink/numWords-gt-zero");
    _requireKeyhash(_keyHash);

    _vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinator_);

    RequestConfig memory _sRequestConfig = RequestConfig({
      subId: _subId,
      callbackGasLimit: _callbackGasLimit,
      requestConfirmations: _requestConfirmations,
      numWords: _numWords,
      keyHash: _keyHash
    });

    sRequestConfig = _sRequestConfig;

    emit VrfCoordinatorSet(_vrfCoordinator);
    emit RequestConfigSet(_sRequestConfig);
  }

  /* ============ External Functions ============ */

  /// @inheritdoc RNGInterface
  function requestRandomNumber()
    external
    override
    onlyManager
    returns (uint32 requestId, uint32 lockBlock)
  {
    RequestConfig memory _requestConfig = sRequestConfig;

    uint256 _vrfRequestId = _vrfCoordinator.requestRandomWords(
      _requestConfig.keyHash,
      _requestConfig.subId,
      _requestConfig.requestConfirmations,
      _requestConfig.callbackGasLimit,
      _requestConfig.numWords
    );

    sRequestId = _vrfRequestId;

    requestCounter++;
    uint32 _requestCounter = requestCounter;

    requestId = _requestCounter;
    chainlinkRequestIds[_vrfRequestId] = _requestCounter;

    lockBlock = uint32(block.number);
    requestLockBlock[_requestCounter] = lockBlock;

    emit RandomNumberRequested(_requestCounter, msg.sender);
  }

  /// @inheritdoc RNGInterface
  function isRequestComplete(uint32 _internalRequestId)
    external
    view
    override
    returns (bool isCompleted)
  {
    return randomNumbers[_internalRequestId] != 0;
  }

  /// @inheritdoc RNGInterface
  function randomNumber(uint32 _internalRequestId)
    external
    view
    override
    returns (uint256 randomNum)
  {
    return randomNumbers[_internalRequestId];
  }

  /// @inheritdoc RNGInterface
  function getLastRequestId() external view override returns (uint32 requestId) {
    return requestCounter;
  }

  /// @inheritdoc RNGInterface
  function getRequestFee() external pure override returns (address feeToken, uint256 requestFee) {
    return (address(0), 0);
  }

  /// @inheritdoc RNGChainlinkV2Interface
  function getSubscriptionId() external view override returns (uint64) {
    return sRequestConfig.subId;
  }

  /// @inheritdoc RNGChainlinkV2Interface
  function getVrfCoordinator() external view override returns (address) {
    return address(_vrfCoordinator);
  }

  /// @inheritdoc RNGChainlinkV2Interface
  function setSubscriptionId(uint64 _subId) external override onlyOwner {
    _requireSubId(_subId);
    sRequestConfig.subId = _subId;

    emit SubscriptionIdSet(_subId);
  }

  /// @inheritdoc RNGChainlinkV2Interface
  function setCallbackGasLimit(uint32 _callbackGasLimit) external override onlyOwner {
    _requireCallbackGasLimit(_callbackGasLimit);
    sRequestConfig.callbackGasLimit = _callbackGasLimit;

    emit CallbackGasLimitSet(_callbackGasLimit);
  }

  /// @inheritdoc RNGChainlinkV2Interface
  function setRequestConfirmations(uint16 _requestConfirmations) external override onlyOwner {
    _requireRequestConfirmations(_requestConfirmations);
    sRequestConfig.requestConfirmations = _requestConfirmations;

    emit RequestConfirmationsSet(_requestConfirmations);
  }

  /// @inheritdoc RNGChainlinkV2Interface
  function setKeyhash(bytes32 _keyHash) external override onlyOwner {
    _requireKeyhash(_keyHash);
    sRequestConfig.keyHash = _keyHash;

    emit KeyHashSet(_keyHash);
  }

  /* ============ Internal Functions ============ */

  /**
   * @notice Callback function called by VRF Coordinator
   * @dev The VRF Coordinator will only call it once it has verified the proof associated with the randomness.
   */
  function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
    require(_requestId == sRequestId, "RNGChainLink/requestId-incorrect");

    uint32 _internalRequestId = chainlinkRequestIds[_requestId];
    uint256 _randomNumber = _randomWords[0];

    randomNumbers[_internalRequestId] = _randomNumber;

    emit RandomNumberCompleted(_internalRequestId, _randomNumber);
  }

  /**
   * @notice Check that subscription id is greater than 0
   * @param _subId Chainlink VRF subscription id
   */
  function _requireSubId(uint64 _subId) internal {
    require(_subId > 0, "RNGChainLink/subId-gt-zero");
  }

  /**
   * @notice Check that callback gas limit is greater than 0
   * @param _callbackGasLimit Chainlink VRF callback gas limit
   */
  function _requireCallbackGasLimit(uint32 _callbackGasLimit) internal {
    require(_callbackGasLimit > 0, "RNGChainLink/gas-limit-gt-zero");
  }

  /**
   * @notice Check that request confirmations is greater than 0
   * @param _requestConfirmations Chainlink VRF request confirmations
   */
  function _requireRequestConfirmations(uint16 _requestConfirmations) internal {
    require(_requestConfirmations > 0, "RNGChainLink/requestConf-gt-zero");
  }

  /**
   * @notice Check that keyHash is not an empty bytes32 string
   * @param _keyHash Chainlink VRF keyHash
   */
  function _requireKeyhash(bytes32 _keyHash) internal {
    require(_keyHash != bytes32(0), "RNGChainLink/keyHash-not-empty");
  }
}
