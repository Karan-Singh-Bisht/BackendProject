const mongoose = require("mongoose");
const { DB_NAME } = require("../constant");

const db = async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
    console.log("DB Connected");
  } catch (err) {
    console.log("MONGODB connection Failed!", err);
    process.exit(1);
  }
};

module.exports = db;
