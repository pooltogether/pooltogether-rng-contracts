const buidler = require("@nomiclabs/buidler")
const { ethers } = buidler

ethers.errors.setLogLevel("error")

module.exports = { buidler, ethers }
