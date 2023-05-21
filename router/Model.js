const express = require("express");
const {addModel} = require("../controller/AddShipper");
const router = express.Router();


router.post("/",addModel)


module.exports = router;