const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize({
  dialect: "mssql",
  host: "localhost",
  server: "DESKTOP-HMN562A", // Kiểm tra và cung cấp tên máy chủ của cơ sở dữ liệu
  database: "MMSI",
  username: "admin",
  password: "admin",
  dialectOptions: {
    options: {
      trustedConnection: true,
    },
  },
});

const Model = sequelize.define('Model', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  IdMarinetraffic:{
    type: DataTypes.STRING,

  },
  MMSI: {
    type: DataTypes.STRING,
  },
  imo: {
    type: DataTypes.STRING,
  },
  VesselName: {
    type: DataTypes.STRING,
  },
  IdForce: {
    type: DataTypes.INTEGER,
  },
}, {
  tableName: 'VesselInfo',
  timestamps: false,
});

module.exports = Model;