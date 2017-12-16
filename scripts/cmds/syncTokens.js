const getSequelize = require("../utils/getSequelize");
const tokens = require("../fixtures/tokens");
const rp = require("request-promise");
const { defineTokenSchema } = require("../schemas/token");

const wait = ms => new Promise(resolve => global.setTimeout(resolve, ms));

const syncTokens = async () => {
  const sequelize = await getSequelize();
  const Token = await defineTokenSchema(sequelize);
  //await Token.sync({ force: true });
  await Token.sync();

  return Object.keys(tokens).reduce(async (previous, token) => {
    await previous;

    console.log("Getting data of", token);

    const res = await rp({
      uri: `https://api.coinmarketcap.com/v1/ticker/${token}/`,
      json: true
    });

    const info = res[0];

    info.cryptocompareId = info.id;
    info.id = undefined;
    info.address = tokens[token];

    await Token.upsert(info);

    const inserted = await Token.findAll({
      attributes: ["price_btc"],
      where: { cryptocompareId: info.cryptocompareId }
    });

    await wait(6000);
  }, new Promise(resolve => resolve()));
};

if (require.main === module) {
  const start = new Date();
  console.log("Started", __filename);
  syncTokens()
    .then(() => {
      const end = new Date();
      console.log("Finished after", (end - start) / 1000, "seconds");
    })
    .then(null, e => console.error(e));
}
