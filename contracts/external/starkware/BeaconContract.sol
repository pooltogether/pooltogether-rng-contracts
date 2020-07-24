pragma solidity ^0.6.6;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./IBeaconContract.sol";

contract BeaconContract is Ownable, IBeaconContract {

  constructor() public {}

  function getRandomness(uint256 blockNumber)
      external
      override
      view
      returns (bytes32)
  {
      return blockhash(blockNumber);
  }
}
