const Model = require("../model/Model");

const addModel = async (req, res, next) => {
  try {
    const { shipperId, MMSI, imo } = req.body;
    const checkShipper = await Model.findOne({ SHIP_ID: shipperId });
    const checkmmsi = await Model.findOne({ MMSI });
    const checkimo = await Model.findOne({ imo });
    if (checkShipper || checkmmsi || checkimo) {
      return res.json({ message: "Đã tồn tại thông tin trên" });
    } else {
      const newData = await Model.create({
        SHIP_ID: shipperId,
        MMSI,
        imo,
      });
      if (newData) {
        return res.json({ message: "Thêm thành công" });
      } else {
        return res.json({ message: "Có lỗi gì đó" });
      }
    }
  } catch (error) {
    next(error);
  }
};

const getALL = async (req, res, next) => {
  try {
    const data = await Model.find({});
    return res.json(data);
  } catch (error) {
    next(error);
  }
};
const deleteModelById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Assuming you have a Model schema defined using Mongoose
    const deletedModel = await Model.findByIdAndDelete(id);

    if (!deletedModel) {
      return res.status(404).json({ message: "Model not found" });
    }

    return res.status(200).json({ message: "Model deleted successfully" });
  } catch (error) {
    next(error);
  }
};
module.exports = { addModel, getALL, deleteModelById };
