import TelegramBot from "node-telegram-bot-api";
import fetch from "node-fetch";
import express from "express";
import Parser from "rss-parser";

/* ========= CONFIG ========= */
const BOT_TOKEN = process.env.BOT_TOKEN;
const CRYPTOPANIC_API = process.env.CRYPTOPANIC_API;
const PORT = process.env.PORT || 3000;

const CHECK_INTERVAL = 60 * 1000;
const CHANNEL_ID = "@Crypto_NewsAR";
const SIGNATURE = "@A7med_ad1";
/* ========================= */

if (!BOT_TOKEN || !CRYPTOPANIC_API) {
  console.error("❌ Missing ENV variables");
  process.exit(1);
}

/* ========= EXPRESS ========= */
const app = express();
app.get("/", (req, res) => res.send("Crypto News Bot running"));
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
  "https://www.coindesk.com/arc/outboundfeeds/rss/",
  "https://blog.binance.com/en/rss"
];

/* ========= HELPERS ========= */
function getDateTime() {
  return new Date().toLocaleString("en-GB", {
    timeZone: "UTC"
  });
}

function buildHashtags(title = "") {
  const t = title.toLowerCase();
  let tags = ["#Crypto", "#Blockchain", "#News"];

  if (t.includes("bitcoin") || t.includes("btc")) tags.push("#Bitcoin");
  if (t.includes("ethereum") || t.includes("eth")) tags.push("#Ethereum");
  if (t.includes("binance")) tags.push("#Binance");
  if (t.includes("sec") || t.includes("etf")) tags.push("#Regulation");
  if (t.includes("hack")) tags.push("#Security");

  return tags.join(" ");
}

/* ========= FETCH CRYPTOPANIC ========= */
async function fetchCryptoPanic() {
  try {
    const url =
      `https://cryptopanic.com/api/developer/v2/posts/` +
      `?auth_token=${CRYPTOPANIC_API}&public=true&limit=5`;

    const res = await fetch(url);
    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}

/* ========= FETCH RSS ========= */
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

/* ========= FETCH COINGECKO ========= */
async function fetchCoinGecko() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/news?page=1"
    );
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

/* ========= MAIN LOOP ========= */
async function checkNews() {
  let posts = await fetchCryptoPanic();
  let source = "cryptopanic";

  if (!posts.length) {
    posts = await fetchRSS();
    source = "rss";
  }

  if (!posts.length) {
    posts = await fetchCoinGecko();
    source = "coingecko";
  }

  for (const post of posts) {
    const id = post.id || post.link || post.url;
    if (sentItems.has(id)) continue;
    sentItems.add(id);

    const title = post.title;
    const link = post.url || post.link;

    const message =
`🚨 Crypto News

🕒 ${getDateTime()}

${title}

🔗 ${link}

${buildHashtags(title)}
✍️ ${SIGNATURE}`;

    await bot.sendMessage(CHANNEL_ID, message, {
      disable_web_page_preview: false
    });
  }
}

setInterval(checkNews, CHECK_INTERVAL);
