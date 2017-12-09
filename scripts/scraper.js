const Web3 = require("web3");
const fs = require("fs");
const csvWriter = require("csv-write-stream");
const ERC20ABI = require("../src/abi/ERC20.json");

const currencies = {
  MLN: "0xBEB9eF514a379B997e0798FDcC901Ee474B6D9A1",
  EOS: "0x86fa049857e0209aa7d9e616f7eb3b3b78ecfdb0",
  TXP: "0xB97048628DB6B661D4C2aA833e95Dbe1A905B280",
  ZRX: "0xe41d2489571d322189246dafa5ebde1f4699f498",
  ICN: "0x888666CA69E0f178DED6D75b5726Cee99A87D698"
};

const STEP = 100000;

const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

const holders = new Map();

const ERC20 = web3.eth.contract(ERC20ABI).at(currencies.MLN);

web3.eth.getBlockNumber((err, blockNumber) => {
  let stepBlock = blockNumber;

  const step = () => {
    const fromBlock = Math.max(0, stepBlock - STEP);
    getTokenBalancesStaggered(
      ERC20,
      fromBlock,
      stepBlock,
      // fromBlock === 0 ? createHoldersCSV : step
      createHoldersCSV
    );
    stepBlock = fromBlock;
  };
  step();
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
    console.log("Got", { fromBlock, toBlock, entries: logs.length });
    let timeout = 0;

    if (logs.length === 0) onFinish();

    logs.forEach((log, index) => {
      if (!holders.has(log.args._to)) {
        contract.balanceOf(log.args._to, (err, balance) => {
          if (balance.gt(0)) {
            holders.set(log.args._to, balance.div(10 ** 18));
          }

          global.clearTimeout(timeout);
          timeout = global.setTimeout(() => {
            console.log("Got all balances", index);
            onFinish();
          }, 1000);
        });
      }
    });
  });
};

const createHoldersCSV = () => {
  let csvTimeout = 0;

  const writer = csvWriter();
  writer.pipe(fs.createWriteStream("out.csv"));

  holders.forEach((balance, address) => {
    writer.write({ address, balance: balance.toFixed(4), currency: "MLN" });

    global.clearTimeout(csvTimeout);
    csvTimeout = global.setTimeout(() => {
      writer.end();
      // onFinish(window.holdersCsv);
    }, 1000);
  });
};
