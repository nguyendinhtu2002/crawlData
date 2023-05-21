const History = require("../model/Model");

const createHistory = async (req, res, next) => {
  try {
    const { MMSI, DATE } = req.body;

    const existingHistory = await History.findOne({ MMSI });

    if (existingHistory) {
      if (DATE > existingHistory.DATE) {
        const newHistory = new History(req.body);
        await newHistory.save();
        return res.status(201).send("New history created successfully");
      } else {
        return res.status(200).send("DATE is not newer, no new record added");
      }
    } else {
      const newHistory = new History(req.body);
      await newHistory.save();
      return res.status(201).send("New history created successfully");
    }
  } catch (error) {
    next(error);
  }
};
const getHistoryByMMSI = async (req, res, next) => {
  try {
    const { MMSI } = req.params;

    // Find history records by MMSI
    const historyRecords = await History.find({ MMSI });

    if (historyRecords.length === 0) {
      return res
        .status(404)
        .send("No history records found for the given MMSI");
    }

    return res.status(200).json(historyRecords);
  } catch (error) {
    next(error);
  }
};
const deleteHistoryByMMSI = async (req, res, next) => {
    try {
      const { MMSI } = req.params;
  
      const deletedRecords = await History.deleteMany({ MMSI });
  
      if (deletedRecords.deletedCount === 0) {
        return res.status(404).send("No history records found for the given MMSI");
      }
  
      return res.status(200).send("History records deleted successfully");
    } catch (error) {
      next(error);
    }
  };
module.exports = { createHistory, getHistoryByMMSI,deleteHistoryByMMSI };
