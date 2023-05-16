const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const mongoose = require('mongoose');
const connectDatabase = require("./config/db.js");
const cron = require('node-cron');

const dotenv = require("dotenv");
const { default: axios } = require('axios');
dotenv.config();
// connectDatabase();


puppeteer.use(StealthPlugin());


const extractMmsiFromUrl = (url) => {
    const regex = /mmsi:(\d+)/;
    const matches = url.match(regex);

    if (matches && matches.length > 1) {
        return matches[1];
    }

    return null;
}

const fetchData = async () => {
    try {
        const browser = await puppeteer.launch({
            headless: false
        });
        const page = await browser.newPage();
        let requestCount = 0;
        let isEvaluated = false;
        const temptData = [
            "6558323",
            "4235634",
            "5822293",
            "5892749",
            "6387411",
            "6390527",
            "461028",
            "211872",
        ];
        page.on("response", async (response) => {
            const url = response.url();
            if (
                url.includes("https://www.marinetraffic.com/getData/get_data_json_4") &&
                !isEvaluated
            ) {
                const data = await response.json();

                filteredData = data.data.rows.filter((item) => {
                    return temptData.some((id) => id === item.SHIP_ID);
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
    const browser = await puppeteer.launch();
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
            const shipId = jsonData[i].SHIP_ID;
            const url = `${process.env.URL}${shipId}`;
            await page.goto(url);
            const currentUrl = page.url();
            const mmsi = extractMmsiFromUrl(currentUrl);
            if (mmsi !== null) {
                jsonData[i].MMSI = mmsi;
                console.log("Thanh cong thu " + i);
            } else {
                console.log("That bau thu " + i);
            }
        }
        fs.writeFileSync("input.json", JSON.stringify(jsonData));
        fs.unlinkSync("updated_data.json");
        await browser.close();
    }
};


const headers = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
    'Cookie': '_ga=GA1.1.2059276080.1684211588; _gcl_au=1.1.397926588.1684211589; vfid=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJ1aWQiOjI0MzEzLCJyIjozLCJzZSI6MTY4NjE0NDg5NCwiZSI6MTY4NjE0NDg5NCwiaWRlbnRpdHkiOjI0MzEzLCJjbCI6MiwiZXhwIjoxNjg0MjEzNjIyLCJpYXQiOjE2ODQyMTE4MjIsInJtYnIiOnRydWUsImp0aSI6MTI1MzU5NDl9.ZZ68BTDX0_8WOI1We1k-HlqaqU_dUou5uXlWHecHlgVh4S2VQDMqfKt8WClSEBEU3y_wHVMt9lyqtokrINf4hU-EDO0-WQUGolLkn_vMTk3JuoRvoVpZZz8O1lSZ0Lqk-w3_HCRGu3z1x38D2sr45bz3CE2K1V2XNFBytPoie6A6xP6mwVTA4eJI-Xf5PXfx3FphYKyBuBgaeic-HSZeyb09i7vAT1yMwwj9SicYPt5HOZnJ8i7PPCKhHDzFvw1sS-gzx_cmfxq0YOYIXmmNWTW1RDeoDVsLrM9hBMYyqd60DyAVp_1PIQnS8hkGK_AVLeDGz0c4rJSq_viYK74mdg; _ga_0MB1EVE8B7=GS1.1.1684211588.1.1.1684211821.0.0.0',
    'Referer': 'https://www.vesselfinder.com/pro/map'
};

const fetchDataWeb1 = async () => {
    await axios.get("https://www.vesselfinder.com/api/pro/myfleet2/0?1684211821", { headers })
        .then(response => {
            // Handle response
            console.log(response.data);
        })
        .catch(error => {
            // Handle error
            console.error(error);
        });
}
// cron.schedule("*/10 * * * *", () => {
//     fetchData();
// });

// cron.schedule("*/10 * * * *", () => {
//     fetchDataWeb1();
// });
// cron.schedule("*/1 * * * *", () => {
//     getMmsi();
// });





