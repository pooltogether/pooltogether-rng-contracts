pragma solidity ^0.6.6;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./IBeaconContract.sol";

contract BeaconContract is Ownable, IBeaconContract {

  // Mapping: blockNumber -> randomness.
  mapping(uint256 => bytes32) private registeredRandomness;

  constructor() public {}

  function setRandomness(uint256 blockNumber, uint256 randomNumber) external onlyOwner {
    registeredRandomness[blockNumber] = bytes32(randomNumber);
  }

  function getRandomness(uint256 blockNumber)
      external
      override
      view
      returns (bytes32)
  {
      return registeredRandomness[blockNumber];
  }
}
