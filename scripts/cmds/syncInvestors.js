const getSequelize = require("../utils/getSequelize");
const { defineInvestorSchema } = require("../schemas/Investor");

const syncInvestors = async () => {
  const sequelize = await getSequelize();
  const Investor = await defineInvestorSchema(sequelize);
  //await Investor.sync({ force: true });
  await Investor.sync();
};

if (require.main === module) {
  const start = new Date();
  console.log("Started", __filename);
  syncInvestors()
    .then(() => {
      const end = new Date();
      console.log("Finished after", (end - start) / 1000, "seconds");
    })
    .then(null, e => console.error(e));
}
