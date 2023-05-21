const mongoose = require("mongoose");

const historySchema = new mongoose.Schema({
  SHIP_ID: {
    type: String,
    require: true,
  },
  MMSI: {
    type: String,
    require: true,
  },
  imo: {
    type: String,
    require: true,
  },
  LAT: {
    type: Number,
    require: true,
  },
  LON:{
    type: Number,
    require: true,
  },
  SPEED:{
    type: Number,
    require: true,
  },
  START:{
    type: String,
    require: true,
  },
  END:{
    type: String,
    require: true,
  },
  DATE:{
    type: Number,
    require: true,
  }
});
const History = mongoose.model("History", historySchema);

module.exports = History;
