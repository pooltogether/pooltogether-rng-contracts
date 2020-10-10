module.exports = {
  keyHash: {
    default : '0xced103054e349b8dfb51352f0f8fa9b5d20dde3d06f9f43cb2b85bc64b238205', // local
    1       : '0xAA77729D3466CA35AE8D28B3BBAC7CC36A5031EFDC430821C02BC31A238AF445', // mainnet
    3       : '0xced103054e349b8dfb51352f0f8fa9b5d20dde3d06f9f43cb2b85bc64b238205', // ropsten
    4       : '0xcad496b9d0416369213648a32b4975fff8707f05dfb43603961b58f3ac6617a7', // rinkeby
    42      : '0x0218141742245eeeba0660e61ef8767e6ce8e7215289a4d18616828caf4dfe33', // kovan
  },
  fee: {
    default : ethers.utils.parseEther('1'), // 1 LINK
    1       : ethers.utils.parseEther('2'), // 2 LINK
    3       : ethers.utils.parseEther('0.1'), // 0.1 LINK
    4       : ethers.utils.parseEther('0.1'), // 0.1 LINK
    42      : ethers.utils.parseEther('0.1'), // 0.1 LINK
  }
}
