const { range, without, uniq, splitEvery } = require("ramda");
const Sequelize = require("sequelize");
const Web3 = require("web3");
const fs = require("fs");
const csvWriter = require("csv-write-stream");
const ERC20ABI = require("../src/abi/ERC20.json");

const tokens = {
  MLN: "0xBEB9eF514a379B997e0798FDcC901Ee474B6D9A1",
  // EOS: "0x86fa049857e0209aa7d9e616f7eb3b3b78ecfdb0",
  TXP: "0xB97048628DB6B661D4C2aA833e95Dbe1A905B280",
  ZRX: "0xe41d2489571d322189246dafa5ebde1f4699f498",
  ICN: "0x888666CA69E0f178DED6D75b5726Cee99A87D698",
  QTUM: "0x9a642d6b3368ddc662CA244bAdf32cDA716005BC",
  OMG: "0xd26114cd6EE289AccF82350c8d8487fedB8A0C07",
  MKR: "0xc66ea802717bfb9833400264dd12c2bceaa34a6d",
  REP: "0xe94327d07fc17907b4db788e5adf2ed424addff6",
  GNT: "0xa74476443119A942dE498590Fe1f2454d7D4aC0d",
  SNT: "0x744d70fdbe2ba4cf95131626614a1763df805b9e",
  DGD: "0xe0b7927c4af23765cb51314a0e0521a9645f0e2a",
  BAT: "0x0d8775f648430679a709e98d2b0cb6250d2887ef",
  KNC: "0xdd974d5c2e2928dea5f71b9825b8b646686bd200",
  SAN: "0x7c5a0ce9267ed19b22f8cae653f198e3e8daf098",
  GNO: "0x6810e776880c02933d47db1b9fc05908e5386b96",
  MANA: "0x0f5d2fb29fb7d3cfee444a200298f468908cc942",
  BNT: "0x1f573d6fb3f13d689ff844b4ce37794d79a7ff1c",
  CVC: "0x41e5560054824ea6b0732e656e3ad64e20e94e45",
  ANT: "0x960b236A07cf122663c4303350609A66A7B288C0",
  DNT: "0x0abdace70d3790235af448c88547603b945604ea",
  MCO: "0xb63b606ac810a52cca15e44bb630fd42d8d1d83d",
  NET: "0xcfb98637bcae43C13323EAa1731cED2B716962fD",
  BCAP: "0xff3519eeeea3e76f1f699ccce5e23ee0bdda41ac"
};

const STEP = 10000;
const CONCURRENT_LOOKUPS = 500;

const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

const main = async () => {
  const sequelize = new Sequelize(
    "postgres://sna:sna@193.108.137.116:5432/sna",
    {
      logging: () => {}
    }
  );

  await sequelize
    .authenticate()
    .then(() => {
      console.log("Connection has been established successfully.");
    })
    .catch(err => {
      console.error("Unable to connect to the database:", err);
    });

  const Investment = sequelize.define(
    "investment",
    {
      address: {
        type: Sequelize.STRING
      },
      balance: {
        type: Sequelize.DECIMAL(18)
      },
      token: {
        type: Sequelize.STRING
      }
    },
    { indexes: [{ unique: true, fields: ["address", "token"] }] }
  );

  await Investment.sync();

  web3.eth.getBlockNumber((err, blockNumber) => {
    let currencyIndex = 0;
    Object.keys(tokens).reduce(async (previous, token) => {
      await previous;

      return getInvestorsForToken(token, blockNumber, Investment);
    }, new Promise(resolve => resolve()));
  });
};

const getInvestorsForToken = async (token, latestBlock, Investment) => {
  const tokenAddress = tokens[token];
  const ERC20 = web3.eth.contract(ERC20ABI).at(tokenAddress);
  let stepBlock = latestBlock;
  const steps = Math.ceil(latestBlock / STEP);
  const blockSteps = range(0, steps).map(i => i * STEP);
  blockSteps.reverse();

  // const sliced = blockSteps.slice(0, 2);

  console.log(
    `Getting all investors for token ${token}@${tokenAddress} in ${
      steps
    } steps. Latest block: ${latestBlock}`
  );

  return blockSteps.reduce(async (previous, current) => {
    const previousBlock = await previous;
    return getTokenBalancesStaggered(
      ERC20,
      token,
      current,
      previousBlock,
      Investment
    );
  }, new Promise(resolve => resolve(latestBlock)));
};

const getTokenBalancesStaggered = async (
  contract,
  token,
  fromBlock,
  toBlock,
  Investment
) =>
  new Promise(async (resolve, reject) => {
    const holders = new Map();

    const filter = contract.Transfer(
      {},
      {
        fromBlock,
        toBlock
      }
    );

    filter.get(async (err, logs) => {
      console.log("Got", { fromBlock, toBlock, entries: logs.length });

      if (logs.length === 0) return resolve(fromBlock);

      const alreadyScraped = await Investment.findAll({
        attributes: ["address"],
        where: { token }
      }).map(instance => instance.dataValues.address);

      const allTransfers = logs.map(log => log.args._to);
      const investors = uniq(allTransfers);
      const toLookup = without(alreadyScraped, investors);

      console.log({
        allTransfers: allTransfers.length,
        investors: investors.length,
        alreadyScraped: alreadyScraped.length,
        toLookup: toLookup.length
      });

      await splitEvery(CONCURRENT_LOOKUPS, toLookup).reduce(
        async (previous, addresses) => {
          await previous;

          const investments = await lookupBulk(contract, addresses);
          console.log(`Got ${investments.size} new investments`);

          await Investment.bulkCreate(
            Array.from(investments).map(([key, value]) => ({
              address: key,
              balance: value.toString(),
              token
            }))
          ).then(() =>
            console.log(
              `Inserted ${investments.size} ${token} investments into db`
            )
          );
        },
        new Promise(resolve => resolve())
      );

      return resolve(fromBlock);
    });
  });

const lookupBulk = async (contract, addresses) =>
  new Promise(resolve => {
    let timeout = 0;
    const result = new Map();

    addresses.forEach(address => {
      contract.balanceOf(address, (err, balance) => {
        if (err) console.error(err);

        if (balance && balance.gt(0)) {
          result.set(address, balance.div(10 ** 18));
        }

        global.clearTimeout(timeout);
        timeout = global.setTimeout(() => {
          resolve(result);
        }, 1000);
      });
    });
  });

try {
  main().then(() => console.log("end"));
} catch (e) {
  console.error(e);
}
