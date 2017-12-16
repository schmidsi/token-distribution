const Sequelize = require("sequelize");

const schema = {
  address: {
    type: Sequelize.STRING(42)
  },
  ethBalance: {
    type: Sequelize.DECIMAL(36, 18)
  },
  ensName: {
    type: Sequelize.STRING(100)
  },
  comment: {
    type: Sequelize.STRING(100)
  }
};

const defineSchema = sequelize =>
  sequelize.define("token", schema, {
    indexes: [{ unique: true, fields: ["address"] }]
  });

exports.defineInvestorSchema = defineSchema;
exports.investorSchema = schema;
