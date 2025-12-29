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
  console.error("Missing environment variables");
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

/* ========= RSS SOURCES ========= */
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
      "📡 أخبار كريبتو عامة\n" +
      "🧠 تلخيص واضح\n" +
      "🔁 CryptoPanic + RSS احتياطي\n\n" +
      "جاهز 🚀",
    { parse_mode: "Markdown" }
  );
});
/* ========================= */

/* ========= SEND ========= */
async function broadcast(message) {
  for (const id of subscribers) {
    await bot.sendMessage(id, message, { parse_mode: "Markdown" });
  }
}
/* ========================= */

/* ========= CRYPTOPANIC ========= */
async function fetchCryptoPanic() {
  const url =
    `https://cryptopanic.com/api/developer/v2/posts/` +
    `?auth_token=${CRYPTOPANIC_API}&public=true&limit=5`;

  const res = await fetch(url);
  const text = await res.text();

  if (!text.startsWith("{")) return [];

  const data = JSON.parse(text);
  return data.results || [];
}
/* ========================= */

/* ========= RSS ========= */
async function fetchRSS() {
  let news = [];
  for (const feedUrl of RSS_FEEDS) {
    try {
      const feed = await parser.parseURL(feedUrl);
      news.push(...feed.items.slice(0, 3));
    } catch (_) {}
  }
  return news;
}
/* ========================= */

/* ========= MAIN LOOP ========= */
async function checkNews() {
  try {
    let posts = await fetchCryptoPanic();
    let sourceType = "cryptopanic";

    if (!posts.length) {
      posts = await fetchRSS();
      sourceType = "rss";
    }

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
        "RSS Source";

      const summary =
`${title}
• The crypto market is reacting to this development.
• Investors are closely watching price movements.
• This news may affect short-term sentiment.
• Volatility could increase following this update.
• Further updates are expected soon.`;

      const message =
`🚨 *Crypto News Alert*

${summary}

📰 *Source:* ${source}
🔗 [Read more](${link})`;

      await broadcast(message);
    }
  } catch (err) {
    console.error("News error:", err.message);
  }
}

setInterval(checkNews, CHECK_INTERVAL);
/* ========================= */
