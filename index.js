import TelegramBot from "node-telegram-bot-api";
import fetch from "node-fetch";
import express from "express";

const BOT_TOKEN = process.env.BOT_TOKEN;
const CRYPTOPANIC_API = process.env.CRYPTOPANIC_API;
const PORT = process.env.PORT || 3000;
const CHECK_INTERVAL = 60 * 1000;

if (!BOT_TOKEN || !CRYPTOPANIC_API) {
  console.error("Missing environment variables");
  process.exit(1);
}

/* ===== Express (Render requires open port) ===== */
const app = express();
app.get("/", (req, res) => res.send("Crypto News Bot running"));
app.listen(PORT, () =>
  console.log("Server listening on port", PORT)
);
/* ============================================= */

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

const subscribers = new Set();
const sentNews = new Set();

bot.onText(/\/start/, (msg) => {
  subscribers.add(msg.chat.id);
  bot.sendMessage(
    msg.chat.id,
    "📰 Crypto News Bot\n\n" +
      "📡 You will receive new crypto news automatically\n" +
      "📝 With summary + source + link",
    { parse_mode: "Markdown" }
  );
});

async function checkNews() {
  try {
    const url = `https://cryptopanic.com/api/v1/posts/?auth_token=${CRYPTOPANIC_API}&kind=news`;
    const res = await fetch(url);
    const text = await res.text();

    if (!text.startsWith("{")) return;

    const data = JSON.parse(text);
    if (!data.results) return;

    for (const post of data.results) {
      if (sentNews.has(post.id)) continue;
      sentNews.add(post.id);

      const message =
`🚨 *Crypto News*

${post.title}
• Market reaction is developing
• Traders are watching closely
• Possible short-term impact
• Volatility expected
• More updates soon

📰 Source: ${post.source?.title || "Unknown"}
🔗 ${post.url}`;

      for (const chatId of subscribers) {
        await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
      }
    }
  } catch (e) {
    console.error("News error:", e.message);
  }
}

setInterval(checkNews, CHECK_INTERVAL);
