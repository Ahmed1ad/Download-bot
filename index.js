import TelegramBot from "node-telegram-bot-api";
import fetch from "node-fetch";
import express from "express";
import Parser from "rss-parser";

/* ========= CONFIG ========= */
const BOT_TOKEN = process.env.BOT_TOKEN;
const CRYPTOPANIC_API = process.env.CRYPTOPANIC_API;
const PORT = process.env.PORT || 3000;
const CHECK_INTERVAL = 60 * 1000;
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

const subscribers = new Set();
const sentItems = new Set();

/* ========= RSS FEEDS ========= */
const RSS_FEEDS = [
  "https://cointelegraph.com/rss",
  "https://www.coindesk.com/arc/outboundfeeds/rss/",
  "https://blog.binance.com/en/rss"
];

/* ========= START ========= */
bot.onText(/\/start/, (msg) => {
  subscribers.add(msg.chat.id);
  bot.sendMessage(
    msg.chat.id,
    "📰 *Crypto News Bot*\n\n" +
      "• أخبار كريبتو عامة\n" +
      "• تلخيص + مصدر + رابط\n\n" +
      "✳️ استخدم /news لاختبار فوري",
    { parse_mode: "Markdown" }
  );
});

/* ========= MANUAL TEST ========= */
bot.onText(/\/news/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "🔍 بفحص الأخبار الآن...");
  const items = await fetchAllNews(true);
  if (!items.length) {
    bot.sendMessage(chatId, "❌ مفيش أخبار حالياً من أي مصدر");
  }
});

/* ========= FETCH CRYPTOPANIC ========= */
async function fetchCryptoPanic() {
  try {
    const url =
      `https://cryptopanic.com/api/developer/v2/posts/` +
      `?auth_token=${CRYPTOPANIC_API}&public=true&limit=5`;

    const res = await fetch(url);
    const data = await res.json();

    console.log("CryptoPanic results:", data.results?.length || 0);
    return data.results || [];
  } catch (e) {
    console.log("CryptoPanic error");
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
  console.log("RSS results:", news.length);
  return news;
}

/* ========= COLLECT ALL ========= */
async function fetchAllNews(forceSend = false) {
  let posts = await fetchCryptoPanic();
  let source = "cryptopanic";

  if (!posts.length) {
    posts = await fetchRSS();
    source = "rss";
  }

  console.log("Using source:", source);

  for (const post of posts) {
    const id = post.id || post.link;
    if (!forceSend && sentItems.has(id)) continue;

    sentItems.add(id);

    const title = post.title;
    const link = post.url || post.link;
    const from =
      post.source?.title ||
      post.creator ||
      post.site ||
      "RSS";

    const message =
`🚨 *Crypto News*

${title}
• Market reaction is developing
• Traders are monitoring closely
• Short-term impact possible
• Volatility expected
• More updates soon

📰 Source: ${from}
🔗 ${link}`;

    for (const chatId of subscribers) {
      await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    }
  }

  return posts;
}

/* ========= AUTO LOOP ========= */
setInterval(() => {
  fetchAllNews(false);
}, CHECK_INTERVAL);
