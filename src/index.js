import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import registerServiceWorker from "./registerServiceWorker";
// import { providers, Contract } from "ethers";
import ERC20ABI from "./abi/ERC20.json";
import Web3 from "web3";

ReactDOM.render(<App />, document.getElementById("root"));
registerServiceWorker();

window.holders = new Map();
window.holdersCsv = "Address,Balance,Token\n";

window.addEventListener("load", async () => {
  /*const network = providers.networks.mainnet;
  const provider = new providers.InfuraProvider(network);
  */
  const $MLN = "0xBEB9eF514a379B997e0798FDcC901Ee474B6D9A1";
  const $EOS = "0x86fa049857e0209aa7d9e616f7eb3b3b78ecfdb0";
  const $TXP = "0xB97048628DB6B661D4C2aA833e95Dbe1A905B280";
  const $ZRX = "0xe41d2489571d322189246dafa5ebde1f4699f498";

  /*
    const ERC20 = new Contract($MLN, ERC20ABI, provider);

  console.log(ERC20);

  
  ERC20.Transfer = (author, value) => {
    console.log("Transfer", { author, value });
  };

  console.log({ blockNumber });
  provider.resetEventsBlock(blockNumber - 100000);
  const blockNumber = await provider.getBlockNumber();
  */

  const web3 = new Web3(window.web3.currentProvider);

  const ERC20 = web3.eth.contract(ERC20ABI).at($ZRX);

  web3.eth.getBlockNumber((err, blockNumber) => {
    let stepBlock = blockNumber;

    const step = () =>
      window.setTimeout(() => {
        const fromBlock = Math.max(0, stepBlock - 10000);
        getTokenBalancesStaggered(
          ERC20,
          fromBlock,
          stepBlock,
          fromBlock === 0 ? createHoldersCSV : step
        );
        stepBlock = fromBlock;
      }, 500);
    step();
  });

  // ERC20.balanceOf("0x1554aa0026292d03cfc8a2769df8dd4d169d590a");
});

const getTokenBalancesStaggered = (contract, fromBlock, toBlock, onFinish) => {
  const filter = contract.Transfer(
    {},
    {
      fromBlock,
      toBlock
    }
  );

  filter.get((err, logs) => {
    console.log("Got", { fromBlock, toBlock, logs }, logs.length);
    let timeout = 0;

    if (logs.length === 0) onFinish();

    logs.forEach((log, index) => {
      if (!window.holders.has(log.args._to)) {
        contract.balanceOf(log.args._to, (err, balance) => {
          if (balance.gt(0)) {
            window.holders.set(log.args._to, balance.div(10 ** 18));
          }

          window.clearTimeout(timeout);
          timeout = window.setTimeout(() => {
            console.log("Got all balances", { log, index });
            onFinish();
          }, 1000);
        });
      }
    });
  });
};

const createHoldersCSV = () => {
  let csvTimeout = 0;

  window.holders.forEach((balance, address) => {
    window.holdersCsv += `${address},${balance.toFixed(4)},"ZRX"\n`;

    window.clearTimeout(csvTimeout);
    csvTimeout = window.setTimeout(() => {
      console.log(window.holdersCsv);
      // onFinish(window.holdersCsv);
    }, 1000);
  });
};
