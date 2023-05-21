const mongoose = require("mongoose");

const modelSchema = new mongoose.Schema({
  SHIP_ID: {
    type: String,
  },
  MMSI: {
    type: String,
    require: true,
  },
  imo: {
    type: String,
  },
});
const Model = mongoose.model("Model", modelSchema);

module.exports = Model;
