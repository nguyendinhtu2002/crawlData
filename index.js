const express = require("express");
const app = express();

const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");
const connectDatabase = require("./config/db.js");
const cron = require("node-cron");
const moment = require("moment-timezone");
const cors = require("cors");
const dotenv = require("dotenv");
const { default: axios } = require("axios");
const ModelRouter = require("./router/Model.js");
const HistoryRouter = require("./router/History.js");

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
        const allRecords = await Model.find({}, "SHIP_ID");

        filteredData = data.data.rows.filter((item) => {
          return allRecords.some((record) => record.SHIP_ID === item.SHIP_ID);
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
const getMmsi = async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--start-maximized"],
  });
  const page = await browser.newPage();

  if (!fs.existsSync("updated_data.json")) {
    console.log("File 'updated_data.json' not found.");
    await browser.close();
    return;
  }
  const data = fs.readFileSync("updated_data.json");

  const jsonData = JSON.parse(data);
  if (jsonData.length > 0) {
    for (let i = 0; i < jsonData.length; i++) {
      // Delete all cookies
      const client = await page.target().createCDPSession();
      await client.send("Network.clearBrowserCookies");
      // Disable cache
      await page.setCacheEnabled(false);

      await page.goto("https://www.marinetraffic.com/users/login");

      // Rest of the login process...

      const shipId = jsonData[i].SHIP_ID;
      const url = `${process.env.URL}${shipId}`;
      await page.waitForTimeout(10000);

      await page.goto(url);
      // Wait for the page content to load completely
      await page.waitForSelector(
        ".MuiTypography-root.MuiTypography-caption.css-qc770s"
      );

      // Extract elements based on CSS class
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

      const dateTime = moment(result, "YYYY-MM-DD HH:mm").toDate();
      const unixTimestamp = Math.floor(dateTime.getTime() / 1000);

      const currentUrl = page.url();
      const mmsi = extractMmsiFromUrl(currentUrl);
      const imo = extractImoFromUrl(currentUrl);
      if (mmsi !== null) {
        const existingRecord = await History.findOne({ SHIP_ID: shipId });
        if (existingRecord) {
          if (existingRecord.DATE < unixTimestamp) {
            const historyData = {
              SHIP_ID: shipId,
              MMSI: mmsi,
              imo: imo,
              DATE: unixTimestamp,
              START: arr[0],
              END: arr[1],
              SPEED: jsonData[i].SPEED,
              LAT: jsonData[i].LAT,
              LON: jsonData[i].LON,
            };
            const newRecord = new History(historyData);
            await newRecord.save();
            console.log("Success for item " + i);
          } else {
            console.log("Skipped for item " + i);
          }
        } else {
          const historyData = {
            SHIP_ID: shipId,
            MMSI: mmsi,
            imo: imo,
            DATE: unixTimestamp,
            START: arr[0],
            END: arr[1],
            SPEED: jsonData[i].SPEED,
            LAT: jsonData[i].LAT,
            LON: jsonData[i].LON,
          };
          const newRecord = new History(historyData);
          await newRecord.save();
          console.log("Success for item " + i);
        }
      }
    }
    fs.unlinkSync("updated_data.json");
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
// cron.schedule("*/10 * * * *", () => {
//     fetchData();
// });

// cron.schedule("*/10 * * * *", () => {
//     fetchDataWeb1();
// });
// cron.schedule("*/1 * * * *", () => {
//     getMmsi();
// });

app.use("/api/v1/Model", ModelRouter);
app.use("/api/v1/History", HistoryRouter);

app.listen(process.env.PORT, () => {
  console.log(`Server listening on port ${process.env.PORT}`);
});
