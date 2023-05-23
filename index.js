const express = require("express");
const app = express();

const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");
const connectDatabase = require("./config/db1.js");
const cron = require("node-cron");
const moment = require("moment-timezone");
const cors = require("cors");
const dotenv = require("dotenv");
const { default: axios } = require("axios");
const ModelRouter = require("./router/Model.js");
const HistoryRouter = require("./router/History.js");
const sql = require("mssql");

const Model = require("./model/Model.js");
const History = require("./model/History.js");
dotenv.config();
connectDatabase();
app.use(express.json());
app.use(cors());

puppeteer.use(StealthPlugin());

const extractMmsiFromUrl = (url) => {
  const regex = /mmsi:(\d+)/;
  const matches = url.match(regex);

  if (matches && matches.length > 1) {
    return matches[1];
  }

  return null;
};
const extractImoFromUrl = (url) => {
  const regex = /imo:(\d+)/i;
  const match = url.match(regex);
  const imo = match ? match[1] : null;
  return imo;
};

const fetchData = async () => {
  try {
    const browser = await puppeteer.launch({
      headless: false,
    });
    const page = await browser.newPage();
    let requestCount = 0;
    let isEvaluated = false;

    page.on("response", async (response) => {
      const url = response.url();
      if (
        url.includes("https://www.marinetraffic.com/getData/get_data_json_4") &&
        !isEvaluated
      ) {
        const data = await response.json();
        const allRecords = await Model.findAll();
        const dataValuesArray = allRecords.map((model) => model.dataValues);

        filteredData = data.data.rows.filter((item) => {
          return dataValuesArray.some(
            (record) => record.SHIP_ID === item.SHIP_ID
          );
        });

        if (filteredData.length > 0) {
          fs.writeFileSync("updated_data.json", JSON.stringify(filteredData));
        }

        isEvaluated = true;
      }
    });
    page.on("request", (request) => {
      if (
        request
          .url()
          .includes("https://www.marinetraffic.com/getData/get_data_json_4")
      ) {
        console.log(request.url());
        requestCount++;
      }
    });
    page.on("requestfinished", (request) => {
      if (
        request
          .url()
          .includes("https://www.marinetraffic.com/getData/get_data_json_4")
      ) {
        requestCount--;
      }
    });
    page.on("requestfailed", (request) => {
      if (
        request
          .url()
          .includes("https://www.marinetraffic.com/getData/get_data_json_4")
      ) {
        requestCount--;
      }
    });

    await page.goto("https://www.marinetraffic.com/users/login");

    await page.waitForSelector(".css-47sehv");
    // Click on the button
    await page.click(".css-47sehv");

    await page.waitForSelector("#email");
    await page.type("#email", "andesong2488@gmail.com");

    await page.waitForSelector("#password");
    await page.type("#password", "huongKhenh123");

    await page.waitForSelector("#login_form_submit");
    await page.click("#login_form_submit");

    await page.waitForNavigation();
    await page.goto(
      "https://www.marinetraffic.com/en/ais/home/centerx:110.3/centery:6.6/zoom:7"
    );

    await page.waitForTimeout(30000);

    while (requestCount > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    await browser.close();
  } catch (error) {
    console.log(error);
  }
};
const config = {
  user: "admin1",
  password: "admin",
  server: "TU",
  database: "MMSI",
  options: {
    trustServerCertificate: true, // Nếu sử dụng SSL
  },
};

const getMmsi = async () => {
  await sql.connect(config);

  const browser = await puppeteer.launch({
    headless: false,
    args: ["--start-maximized"],
  });
  const page = await browser.newPage();

  const records = await Model.findAll();

  const dataValuesArray = records.map((model) => model.dataValues);
  if (dataValuesArray.length > 0) {
    for (let i = 0; i < dataValuesArray.length; i++) {
      const client = await page.target().createCDPSession();
      await client.send("Network.clearBrowserCookies");
      await page.setCacheEnabled(false);

      await page.goto("https://www.marinetraffic.com/users/login");
      await page.waitForSelector(".css-47sehv");
      await page.click(".css-47sehv");
      await page.waitForSelector("#email");
      await page.type("#email", "andesong2488@gmail.com");

      await page.waitForSelector("#password");
      await page.type("#password", "huongKhenh123");

      await page.waitForSelector("#login_form_submit");
      await page.click("#login_form_submit");
      await page.waitForNavigation();

      const shipId = dataValuesArray[i].IdMarinetraffic;
      let id = dataValuesArray[i].id;
      const url = `${process.env.URL}${shipId}`;

      await page.goto(url);
      await page.waitForSelector(
        ".MuiTypography-root.MuiTypography-caption.css-qc770s"
      );

      const elements = await page.$$(
        ".MuiTypography-root.MuiTypography-caption.css-qc770s"
      );

      const arr = [];

      for (const element of elements) {
        const text = await page.evaluate(
          (element) => element.textContent,
          element
        );
        arr.push(text);
      }
      await page.waitForSelector(
        "p.MuiTypography-root.MuiTypography-body1.MuiTypography-gutterBottom.css-18xv3ee b"
      );

      const bElement = await page.$eval(
        "p.MuiTypography-root.MuiTypography-body1.MuiTypography-gutterBottom.css-18xv3ee b",
        (element) => element.innerHTML
      );
      const endIndex = bElement.indexOf(" LT");

      const result = bElement.substring(0, endIndex);
      const link = await page.evaluate(() => {
        const element = document.querySelector(
          "p.MuiTypography-root:nth-child(5) a.MuiLink-root"
        );
        return element ? element.textContent : null;
      });
      const parts = link.split(" / ");
      const LAT = parseFloat(parts[0].replace("°", ""));
      const LOT = parseFloat(parts[1].replace("°", ""));
      const coordinates = await page.evaluate(() => {
        const element = document.querySelector(
          "p.MuiTypography-root:nth-child(7) b"
        );
        return element ? element.textContent : null;
      });
      const [speed, courseWithDegree] = coordinates.split(" kn / ");
      const course = courseWithDegree.replace(" °", "");

      const dateTime = moment(result, "YYYY-MM-DD HH:mm").toDate();
      const formattedDateTime = moment(dateTime).format("YYYY-MM-DD HH:mm:ss");
      const currentUrl = page.url();
      const mmsi = extractMmsiFromUrl(currentUrl);
      if (mmsi !== null) {
        try {
          const existingRecord = await History.findOne({
            where: { IdVessel: id },
            order: [["Id", "DESC"]],
          });
          if (existingRecord) {
            const existingDateTime = moment(existingRecord.dataValues.DayTime);
            if (existingDateTime.isBefore(dateTime)) {
              const Long = parseFloat(LOT);
              const Lat =  parseFloat(LAT);
              const DayTime = formattedDateTime;
              const MoveDirection =  parseFloat(course);
              const MoveSpeed =  parseFloat(speed);
              const MoveStart = arr[0];
              const MoveFinishExpected = arr[1];
              const IdVessel = id;

              const request = new sql.Request();
              request.input("Long", sql.Int, Long);
              request.input("Lat", sql.Int, Lat);
              request.input("DayTime", sql.DateTime, DayTime);
              request.input("MoveDirection", sql.Int, MoveDirection);
              request.input("MoveSpeed", sql.Int, MoveSpeed);
              request.input("MoveStart", sql.VarChar, MoveStart);
              request.input(
                "MoveFinishExpected",
                sql.VarChar,
                MoveFinishExpected
              );
              request.input("IdVessel", sql.Int, IdVessel);

              const query = `
        INSERT INTO [MoveOnSea] ([Long], [Lat], [DayTime], [MoveDirection], [MoveSpeed], [MoveStart], [MoveFinishExpected], [IdVessel])
        OUTPUT INSERTED.[Id], INSERTED.[Long], INSERTED.[Lat], INSERTED.[DayTime], INSERTED.[MoveDirection], INSERTED.[MoveSpeed], INSERTED.[MoveStart], INSERTED.[MoveFinishExpected], INSERTED.[IdVessel]
        VALUES (@Long, @Lat, @DayTime, @MoveDirection, @MoveSpeed, @MoveStart, @MoveFinishExpected, @IdVessel);
      `;

              const result = await request.query(query);
              console.log("Success for item " + i);
            } else {
              console.log("Skipped for item " + i);
            }
          } else {
            const Long = parseFloat(LOT);
            const Lat = parseFloat(LAT);
            const DayTime = formattedDateTime;
            const MoveDirection = parseFloat(course);
            const MoveSpeed = parseFloat(speed);
            const MoveStart = arr[0];
            const MoveFinishExpected = arr[1];
            const IdVessel = id;

            const request = new sql.Request();
            request.input("Long", sql.Int, Long);
            request.input("Lat", sql.Int, Lat);
            request.input("DayTime", sql.DateTime, DayTime);
            request.input("MoveDirection", sql.Int, MoveDirection);
            request.input("MoveSpeed", sql.Int, MoveSpeed);
            request.input("MoveStart", sql.VarChar, MoveStart);
            request.input(
              "MoveFinishExpected",
              sql.VarChar,
              MoveFinishExpected
            );
            request.input("IdVessel", sql.Int, IdVessel);

            const query = `
                INSERT INTO [MoveOnSea] ([Long], [Lat], [DayTime], [MoveDirection], [MoveSpeed], [MoveStart], [MoveFinishExpected], [IdVessel])
                OUTPUT INSERTED.[Id], INSERTED.[Long], INSERTED.[Lat], INSERTED.[DayTime], INSERTED.[MoveDirection], INSERTED.[MoveSpeed], INSERTED.[MoveStart], INSERTED.[MoveFinishExpected], INSERTED.[IdVessel]
                VALUES (@Long, @Lat, @DayTime, @MoveDirection, @MoveSpeed, @MoveStart, @MoveFinishExpected, @IdVessel);
              `;

            const result = await request.query(query);
            console.log("Success for item " + i);
          }
        } catch (error) {
          console.error(`Error: ${error.message}`);
          throw error;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 15000));

    }
    await browser.close();
  }
};
const headers = {
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1",
  Cookie:
    "_gcl_au=1.1.959588111.1683366545; _ga_6L2TW3CJE4=GS1.1.1683632576.1.1.1683633576.0.0.0; _ga=GA1.1.471123684.1683366545; _ga_0MB1EVE8B7=GS1.1.1684585685.4.1.1684585776.0.0.0; vfid=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJ1aWQiOjI0MzEzLCJyIjozLCJzZSI6MTY4NjE0NDg5NCwiZSI6MTY4NjE0NDg5NCwiaWRlbnRpdHkiOjI0MzEzLCJjbCI6MiwiZXhwIjoxNjg0NTg3NTc2LCJpYXQiOjE2ODQ1ODU3NzYsInJtYnIiOnRydWUsImp0aSI6MTI2MzEwNjh9.PRNhDWLnkxHeXZNqeQ2chGe2RHDK0juTXNlW3RDxCQJlquMCvkYOxV3WpZGqRe7OQWyM-mglSiGs6mWMGCl3EEtZPusWAtWDVSgecGaaNf5OcojPffXGt6QmK3nin2u5A0k3zyUc_uw1FrNNCeRM1dYRu9sE6a-s-U3L47Ids_XJ6p5sghTTZ1nNZklZAYSs3Axdp1H4_9Tbl5rmMgqABHPOQg1WqBCbPC6CQliEjA2U_phkAK4rp3z20UAS-PGbNd8rN9Wo3dcMlikN9uZzQcmDUC9SBoBk6f5JZj4rphvQvO4-8nW9VYBFON-O1bdfp-v4YukmRn8XGEbsrBhNoA",
  Referer: "https://www.vesselfinder.com/pro/map",
};

const fetchDataWeb1 = async () => {
  await axios
    .get("https://www.vesselfinder.com/api/pro/myfleet2/0?1684585777", {
      headers,
    })
    .then((response) => {
      // Handle response
      console.log(response.data.d);
    })
    .catch((error) => {
      // Handle error
      console.error(error);
    });
};
cron.schedule("*/10 * * * *", () => {
    fetchData();
});

// cron.schedule("*/10 * * * *", () => {
//     fetchDataWeb1();
// });
cron.schedule("*/5 * * * *", () => {
    getMmsi();
});

app.use("/api/v1/Model", ModelRouter);
app.use("/api/v1/History", HistoryRouter);

app.listen(process.env.PORT, () => {
  console.log(`Server listening on port ${process.env.PORT}`);
});
