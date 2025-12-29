import TelegramBot from "node-telegram-bot-api";
import fetch from "node-fetch";
import express from "express";
import Parser from "rss-parser";

/* ========= CONFIG ========= */
const BOT_TOKEN = process.env.BOT_TOKEN;
const CRYPTOPANIC_API = process.env.CRYPTOPANIC_API;
const PORT = process.env.PORT || 3000;

const NEWS_INTERVAL = 60 * 1000;            // الأخبار كل دقيقة
const PRICES_INTERVAL = 30 * 60 * 1000;     // الأسعار كل 30 دقيقة

const CHANNEL_ID = "@Crypto_NewsAR";
const SIGNATURE = "@A7med_ad1";
/* ========================= */

if (!BOT_TOKEN || !CRYPTOPANIC_API) {
  console.error("❌ Missing ENV variables");
  process.exit(1);
}

/* ========= EXPRESS ========= */
const app = express();
app.get("/", (req, res) => res.send("Crypto Bot running"));
app.listen(PORT, () =>
  console.log("🚀 Server listening on port", PORT)
);
/* ========================= */

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const parser = new Parser();
const sentItems = new Set();

/* ========= RSS FEEDS ========= */
const RSS_FEEDS = [
  "https://cointelegraph.com/rss",
  "https://www.coindesk.com/arc/outboundfeeds/rss/"
];

/* ========= HELPERS ========= */
function getTime() {
  return new Date().toLocaleString("en-GB", { timeZone: "UTC" });
}

function buildHashtags(title = "") {
  const t = title.toLowerCase();
  let tags = ["#Crypto", "#News"];
  if (t.includes("bitcoin")) tags.push("#Bitcoin");
  if (t.includes("ethereum")) tags.push("#Ethereum");
  if (t.includes("binance")) tags.push("#Binance");
  if (t.includes("solana")) tags.push("#Solana");
  if (t.includes("xrp")) tags.push("#XRP");
  return tags.join(" ");
}

/* ========= FETCH RSS (TEXT) ========= */
async function fetchRSS() {
  let news = [];
  for (const feed of RSS_FEEDS) {
    try {
      const parsed = await parser.parseURL(feed);
      news.push(...parsed.items.slice(0, 2));
    } catch {}
  }
  return news;
}

/* ========= FETCH CRYPTOPANIC ========= */
async function fetchCryptoPanic() {
  try {
    const url =
      `https://cryptopanic.com/api/developer/v2/posts/` +
      `?auth_token=${CRYPTOPANIC_API}&public=true&limit=3`;

    const res = await fetch(url);
    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}

/* ========= NEWS LOOP (لم يتغير) ========= */
async function checkNews() {
  let posts = await fetchRSS(); // أولوية للنص الكبير

  if (!posts.length) {
    posts = await fetchCryptoPanic();
  }

  for (const post of posts) {
    const id = post.guid || post.id || post.link;
    if (sentItems.has(id)) continue;
    sentItems.add(id);

    const title = post.title;
    const link = post.link || post.url;
    const content =
      post.contentSnippet ||
      post.content ||
      "Full details in the source link.";

    const message =
`📰 Crypto News

🕒 ${getTime()}

${title}

${content.slice(0, 800)}...

🔗 ${link}

${buildHashtags(title)}
✍️ ${SIGNATURE}`;

    await bot.sendMessage(CHANNEL_ID, message, {
      disable_web_page_preview: false
    });
  }
}

/* ========= PRICES LOOP (إضافة مستقلة تمامًا) ========= */
async function sendPrices() {
  try {
    const url =
      "https://api.coingecko.com/api/v3/simple/price" +
      "?ids=bitcoin,ethereum,binancecoin,solana,ripple" +
      "&vs_currencies=usd";

    const data = await fetch(url).then(r => r.json());

    const message =
`📊 Crypto Prices (Every 30 Minutes)

🟠 Bitcoin (BTC): $${data.bitcoin.usd}
🔵 Ethereum (ETH): $${data.ethereum.usd}
🟡 BNB: $${data.binancecoin.usd}
🟣 Solana (SOL): $${data.solana.usd}
⚪ XRP: $${data.ripple.usd}

🕒 ${getTime()}
✍️ ${SIGNATURE}`;

    await bot.sendMessage(CHANNEL_ID, message, {
      parse_mode: "Markdown"
    });
  } catch (e) {
    console.log("Price fetch error");
  }
}

/* ========= RUN ========= */
setInterval(checkNews, NEWS_INTERVAL);
setInterval(sendPrices, PRICES_INTERVAL);
