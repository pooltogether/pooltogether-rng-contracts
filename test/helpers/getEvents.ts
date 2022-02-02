import { Contract, providers, Transaction } from "ethers";

export async function getEvents(provider: providers.JsonRpcProvider, tx: Transaction, contract: Contract) {
  const receipt = await provider.getTransactionReceipt(tx.hash as string);

  return receipt.logs.map((log) => {
    try {
      return contract.interface.parseLog(log);
    } catch (e) {}
  });
}
