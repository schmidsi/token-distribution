const Sequelize = require("sequelize");

const schema = {
  address: {
    type: Sequelize.STRING(42)
  },
  cryptocompareId: {
    type: Sequelize.STRING
  },
  name: {
    type: Sequelize.STRING
  },
  symbol: {
    type: Sequelize.STRING(10)
  },
  rank: {
    type: Sequelize.INTEGER
  },
  price_usd: {
    type: Sequelize.DECIMAL(20, 8)
  },
  price_btc: {
    type: Sequelize.DECIMAL(20, 8)
  },
  "24h_volume_usd": {
    type: Sequelize.DECIMAL(20, 8)
  },
  market_cap_usd: {
    type: Sequelize.DECIMAL(20, 8)
  },
  available_supply: {
    type: Sequelize.DECIMAL(20, 8)
  },
  total_supply: {
    type: Sequelize.DECIMAL(20, 8)
  },
  percent_change_1h: {
    type: Sequelize.DECIMAL(20, 8)
  },
  percent_change_24h: {
    type: Sequelize.DECIMAL(20, 8)
  },
  percent_change_7d: {
    type: Sequelize.DECIMAL(20, 8)
  },
  last_updated: {
    type: Sequelize.INTEGER
  }
};

const defineSchema = sequelize =>
  sequelize.define("token", schema, {
    indexes: [
      { unique: true, fields: ["address"] },
      { unique: true, fields: ["cryptocompareId"] }
    ]
  });

exports.defineTokenSchema = defineSchema;
exports.tokenSchema = schema;
