pragma solidity >=0.6.0;

interface IBeaconContract {
    function getRandomness(uint256 blockNumber) external view returns (bytes32);
}
