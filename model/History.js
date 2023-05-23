const { Sequelize, DataTypes } = require("sequelize");
const moment = require('moment');

const sequelize = new Sequelize({
  dialect: "mssql",
  host: "localhost",
  server: "TU", // Kiểm tra và cung cấp tên máy chủ của cơ sở dữ liệu
  database: "MMSI",
  username: "admin1",
  password: "admin",
  dialectOptions: {
    options: {
      trustedConnection: true,
    },
  },
});

const History = sequelize.define(
  "VesselInfo",
  {
    Id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    Long: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    Lat: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    DayTime: {
      type: DataTypes.DATE,
      allowNull: false
    },
    MoveDirection: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    MoveSpeed: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    MoveStart: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    MoveFinishExpected: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    IdVessel: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "MoveOnSea", // Tên của bảng trong cơ sở dữ liệu
    timestamps: false, // Tắt sử dụng các trường timestamps (createdAt, updatedAt)
  }
);

module.exports = History;
