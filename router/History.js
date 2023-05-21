const express = require("express");
const { getAll, getHistoryByMMSI, deleteHistoryByMMSI } = require("../controller/History");
const router = express.Router();


router.get("/",getAll)
router.get("/getByMMSI/:MMSI",getHistoryByMMSI)
router.delete("/deleteHistoryByMMSI/:MMSI",deleteHistoryByMMSI)


module.exports = router;