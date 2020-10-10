// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.6.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20Mintable is ERC20 {

  constructor (string memory name, string memory symbol) public ERC20(name, symbol) {
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}