const { ethers } = require("ethers");

module.exports = {
  keyHash: {
    default : '0xced103054e349b8dfb51352f0f8fa9b5d20dde3d06f9f43cb2b85bc64b238205', // local
    1       : '0xAA77729D3466CA35AE8D28B3BBAC7CC36A5031EFDC430821C02BC31A238AF445', // mainnet
    4       : '0x2ed0feb3e7fd2022120aa84fab1945545a9f2ffc9076fd6156fa96eaff4c1311', // rinkeby
    42      : '0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4', // kovan
    137     : '0xf86195cf7690c55907b2b611ebb7343a6f649bff128701cc542f0569e2c549da', // matic / polygon
    80001   : '0x6e75b569a01ef56d18cab6a8e71e6600d6ce853834d4a5748b720d06f878b3a4'
  },
  fee: {
    default : ethers.utils.parseEther('1'), // 1 LINK
    1       : ethers.utils.parseEther('2'), // 2 LINK
    4       : ethers.utils.parseEther('0.1'), // 0.1 LINK
    42      : ethers.utils.parseEther('0.1'), // 0.1 LINK
    137     : ethers.utils.parseEther('0.0001'), // 0.0001 LINK
    80001   : ethers.utils.parseEther('0.0001') // 0.0001 LINK
  }
}
