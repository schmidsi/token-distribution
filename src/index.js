import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import registerServiceWorker from "./registerServiceWorker";
import { providers, Contract } from "ethers";
import ERC20ABI from "./abi/ERC20.json";
import Web3 from "web3";

ReactDOM.render(<App />, document.getElementById("root"));
registerServiceWorker();

window.holders = new Map();
window.holdersCsv = "";

window.addEventListener("load", async () => {
  const network = providers.networks.mainnet;
  const provider = new providers.InfuraProvider(network);
  const $MLN = "0xBEB9eF514a379B997e0798FDcC901Ee474B6D9A1";

  /*
    const MLNContract = new Contract($MLN, ERC20ABI, provider);

  console.log(MLNContract);

  
  MLNContract.Transfer = (author, value) => {
    console.log("Transfer", { author, value });
  };

  console.log({ blockNumber });
  provider.resetEventsBlock(blockNumber - 100000);
  */
  const blockNumber = await provider.getBlockNumber();

  const web3 = new Web3(window.web3.currentProvider);
  console.log(web3);

  const MLNContract = web3.eth.contract(ERC20ABI).at($MLN);
  const filter = MLNContract.Transfer(
    {},
    {
      fromBlock: 0,
      toBlock: blockNumber
    }
  );
  filter.get((err, logs) => {
    console.log(logs);
    logs.forEach(log => {
      if (!window.holders.has(log.args._to)) {
        MLNContract.balanceOf(log.args._to, (err, balance) => {
          if (balance.gt(0)) {
            window.holders.set(log.args._to, balance.div(10 ** 18).toString());
            window.holdersCsV += `${log.args._to},${balance
              .div(10 ** 18)
              .toString()}\n`;
          }
        });
      }
    });
  });
  // MLNContract.balanceOf("0x1554aa0026292d03cfc8a2769df8dd4d169d590a");
});
