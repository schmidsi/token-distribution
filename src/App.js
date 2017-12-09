import React, { Component } from "react";
import { CSVLink } from "react-csv";
import ERC20ABI from "./abi/ERC20.json";
import Web3 from "web3";
import logo from "./logo.svg";
import "./App.css";

window.holders = new Map();
window.holdersCsv = [];

const currencies = {
  MLN: "0xBEB9eF514a379B997e0798FDcC901Ee474B6D9A1",
  EOS: "0x86fa049857e0209aa7d9e616f7eb3b3b78ecfdb0",
  TXP: "0xB97048628DB6B661D4C2aA833e95Dbe1A905B280",
  ZRX: "0xe41d2489571d322189246dafa5ebde1f4699f498",
  ICN: "0x888666CA69E0f178DED6D75b5726Cee99A87D698"
};

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      progress: 0,
      latestBlock: 0,
      readyToDownload: false,
      csv: []
    };
  }

  componentDidMount() {
    const web3 = new Web3(window.web3.currentProvider);

    const ERC20 = web3.eth.contract(ERC20ABI).at(currencies.ICN);

    const onFinish = () => {
      let csvTimeout = 0;

      window.holders.forEach((balance, address) => {
        window.holdersCsv.push([address, balance.toFixed(4), "ICN"]);

        window.clearTimeout(csvTimeout);
        csvTimeout = window.setTimeout(() => {
          this.setState({ readyToDownload: true, csv: window.holdersCsv });
        }, 1000);
      });
    };

    const getTokenBalancesStaggered = (
      contract,
      fromBlock,
      toBlock,
      onFinish
    ) => {
      const filter = contract.Transfer(
        {},
        {
          fromBlock,
          toBlock
        }
      );

      filter.get((err, logs) => {
        console.log("Got", { fromBlock, toBlock, logs }, logs.length);
        const latestBlock = this.state.latestBlock;
        this.setState({ progress: (latestBlock - fromBlock) / latestBlock });

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

    web3.eth.getBlockNumber((err, blockNumber) => {
      let stepBlock = blockNumber;
      this.setState({ latestBlock: blockNumber });

      const step = () =>
        window.setTimeout(() => {
          const fromBlock = Math.max(0, stepBlock - 10000);
          getTokenBalancesStaggered(
            ERC20,
            fromBlock,
            stepBlock,
            fromBlock === 0 ? onFinish : step
          );
          stepBlock = fromBlock;
        }, 500);
      step();
    });
  }

  render() {
    console.log("render", this.state.readyToDownload);

    const download = this.state.readyToDownload ? (
      <CSVLink data={this.state.csv}>Download me</CSVLink>
    ) : (
      <div> loading {(this.state.progress * 100).toFixed(2)}% </div>
    );

    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Welcome to React</h1>
        </header>
        {download}
      </div>
    );
  }
}

export default App;
