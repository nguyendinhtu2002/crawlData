const Sequelize = require("sequelize");

const connectDatabase = async () => {
  try {
    const sequelize = new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USERNAME,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST,
        dialect: "mssql", // Sử dụng SQL Server
        dialectOptions: {
          options: {
            encrypt: false,
            trustServerCertificate: true,
          },
        },
        define: {
          timestamps: false, // Tắt tự động thêm cột timestamps (createdAt, updatedAt)
          freezeTableName: true, // Giữ nguyên tên bảng từ tên mô hình
        },
         logging: false,
      }
    );

    await sequelize.authenticate();
    console.log("SQL Server Connected");


    // Các bước cấu hình và khởi tạo mô hình Sequelize tương ứng với các bảng trong SQL Server
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDatabase;
