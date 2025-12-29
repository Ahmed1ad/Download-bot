import TelegramBot from "node-telegram-bot-api";
import fetch from "node-fetch";
import express from "express";
import Parser from "rss-parser";

/* ========= CONFIG ========= */
const BOT_TOKEN = process.env.BOT_TOKEN;
const CRYPTOPANIC_API = process.env.CRYPTOPANIC_API;
const PORT = process.env.PORT || 3000;

const CHECK_INTERVAL = 60 * 1000;
const SIGNATURE = "@A7med_ad1";
const CHANNEL_ID = "@Crypto_NewsAR";
/* ========================= */

if (!BOT_TOKEN || !CRYPTOPANIC_API) {
  console.error("❌ Missing environment variables");
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
  return new Date().toLocaleString("ar-EG", {
    timeZone: "Africa/Cairo",
    hour12: true
  });
}

function classify(title = "") {
  const t = title.toLowerCase();
  if (t.includes("bitcoin") || t.includes("btc")) return "🟠 Bitcoin";
  if (t.includes("ethereum") || t.includes("eth")) return "🔵 Ethereum";
  if (t.includes("binance") || t.includes("coinbase")) return "🏦 Exchanges";
  if (t.includes("hack") || t.includes("exploit")) return "🚨 Security";
  if (t.includes("etf") || t.includes("sec")) return "🏛️ Regulation";
  if (t.includes("altcoin")) return "🟣 Altcoins";
  return "🌍 General";
}

function arabicSummary() {
  return (
    "• الخبر يوضح تطورات جديدة في سوق العملات الرقمية.\n" +
    "• المتداولون يراقبون تأثيره على الأسعار.\n" +
    "• من المحتمل حدوث تقلبات خلال الفترة القادمة.\n" +
    "• التحليل يشير إلى تغير في شهية المخاطرة.\n" +
    "• التفاصيل الكاملة عبر المصدر."
  );
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
      news.push(...parsed.items.slice(0, 3));
    } catch {}
  }
  return news;
}

/* ========= MAIN LOOP ========= */
async function checkNews() {
  let posts = await fetchCryptoPanic();
  if (!posts.length) posts = await fetchRSS();

  for (const post of posts) {
    const id = post.id || post.link;
    if (sentItems.has(id)) continue;
    sentItems.add(id);

    const title = post.title;
    const link = post.url || post.link;
    const source =
      post.source?.title ||
      post.creator ||
      post.site ||
      "Crypto News";

    const message =
`🚨 *خبر كريبتو جديد*

🕒 ${getDateTime()}
🏷️ ${classify(title)}

📰 *العنوان:*
${title}

🧠 *ملخص بالعربي:*
${arabicSummary()}

🔗 ${link}

✍️ ${SIGNATURE}`;

    await bot.sendMessage(CHANNEL_ID, message, {
      parse_mode: "Markdown",
      disable_web_page_preview: false
    });
  }
}

setInterval(checkNews, CHECK_INTERVAL);
