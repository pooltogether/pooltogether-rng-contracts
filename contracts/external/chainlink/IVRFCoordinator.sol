pragma solidity >=0.6.0;
pragma experimental ABIEncoderV2;

interface IVRFCoordinator {
  struct ServiceAgreement { // Tracks oracle commitments to VRF service
    address vRFOracle; // Oracle committing to respond with VRF service
    bytes32 jobID; // ID of corresponding chainlink job in oracle's DB
    uint256 fee; // Minimum payment for oracle response
  }

  function serviceAgreements(bytes32) external view returns (ServiceAgreement memory);
}
