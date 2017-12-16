const Sequelize = require("sequelize");

const getSequelize = async () => {
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

  return sequelize;
};

module.exports = getSequelize;
