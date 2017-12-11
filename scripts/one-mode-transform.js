const Sequelize = require("sequelize");
/*
SELECT count(address) AS cnt, address FROM investments GROUP BY address ORDER BY cnt DESC;
SELECT count(address) FROM investments;
SELECT count(token), token FROM investments GROUP BY token;
SELECT * FROM investments ORDER BY address;
*/

const tokens = [];

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

  /*
  const TokensByAddress = sequelize.define("tokensbyaddress", {
    address: {
      type: Sequelize.STRING(120)
    },
    token_list: {
      type: Sequelize.STRING
    }
  });
  */

  const TokenNetwork = sequelize.define("token-network", {
    from: {
      type: Sequelize.STRING(5)
    },
    to: {
      type: Sequelize.STRING
    },
    commonInvestors: {
      type: Sequelize.INTEGER
    }
  });

  await Investment.sync();
  await TokensByAddress.sync();
  await TokenNetwork.sync({ force: true });

  /* shape
    `T1-T2`: 20
  */
  const inMemoryTokenNetwork = new Map();

  const raw = await sequelize.query("SELECT * FROM tokensbyaddress", {
    type: sequelize.QueryTypes.SELECT
  });

  console.log("Got some tokensbyaddress", raw.length);

  /*
  console.log(raw);

  const commonInvestments = await TokensByAddress.findAll({
    attributes: ["token_list"]
  }).map(instance => instance.dataValues.token_list);

  console.log("Got common investments", commonInvestments.length);

  */

  await new Promise(resolve => {
    let timeout = 0;
    raw.forEach(line => {
      global.clearTimeout(timeout);
      timeout = global.setTimeout(resolve, 500);
      const tokens = line.token_list.split(",").sort();

      tokens.forEach((fromToken, i) => {
        const toTokens = tokens.slice(i + 1);

        toTokens.forEach(toToken => {
          const current =
            inMemoryTokenNetwork.get(`${fromToken}-${toToken}`) || 0;
          inMemoryTokenNetwork.set(`${fromToken}-${toToken}`, current + 1);
        });
      });
    });
  });

  await TokenNetwork.bulkCreate(
    Array.from(inMemoryTokenNetwork).map(([key, value]) => ({
      from: key.split("-")[0],
      to: key.split("-")[1],
      commonInvestors: value
    }))
  );
};

try {
  main().then(() => console.log("end"));
} catch (e) {
  console.error(e);
}
