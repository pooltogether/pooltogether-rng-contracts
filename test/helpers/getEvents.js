const buidler = require('@nomiclabs/buidler')

async function getEvents(tx, contract) {
  const { provider } = buidler.ethers
  const receipt = await provider.getTransactionReceipt((await tx).hash)

  return receipt.logs.map(log => {
    try {
      return contract.interface.parseLog(log)
    } catch (e) {}
  })
}

module.exports = {
  getEvents
}