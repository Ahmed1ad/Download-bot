import TelegramBot from "node-telegram-bot-api";
import fetch from "node-fetch";
import express from "express";

/* ========= CONFIG ========= */
const BOT_TOKEN = process.env.BOT_TOKEN;
const CRYPTOPANIC_API = process.env.CRYPTOPANIC_API;
const PORT = process.env.PORT || 3000;

const CHECK_INTERVAL = 60 * 1000; // كل دقيقة
/* ========================= */

if (!BOT_TOKEN || !CRYPTOPANIC_API) {
  console.error("❌ Missing BOT_TOKEN or CRYPTOPANIC_API");
  process.exit(1);
}

/* ========= EXPRESS (مهم لـ Render) ========= */
const app = express();
app.get("/", (req, res) => {
  res.send("Crypto News Bot is running");
});
app.listen(PORT, () => {
  console.log("🚀 Server listening on port", PORT);
});
/* =========================================== */

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

let subscribers = new Set();
let sentNews = new Set();

/* ========= START ========= */
bot.onText(/\/start/, (msg) => {
  subscribers.add(msg.chat.id);

  bot.sendMessage(
    msg.chat.id,
    "📰 *Crypto News Bot*\n\n" +
      "📡 هيوصلك كل خبر كريبتو جديد\n" +
      "📝 @A7med_ad\n\n" +
      "جاهز 🚀",
    { parse_mode: "Markdown" }
  );
});
/* ========================= */

/* ========= FETCH NEWS ========= */
async function checkNews() {
  try {
    const url =
      `https://cryptopanic.com/api/v1/posts/` +
      `?auth_token=${CRYPTOPANIC_API}` +
      `&kind=news`;

    const res = await fetch(url);
    const text = await res.text();

    // حماية من HTML
    if (!text.startsWith("{")) {
      console.error("❌ CryptoPanic response is not JSON");
      return;
    }

    const data = JSON.parse(text);

    if (!data.results || !data.results.length) return;

    for (const post of data.results) {
      if (sentNews.has(post.id)) continue;

      sentNews.add(post.id);

      const title = post.title;
      const source = post.source?.title || "Unknown";
      const link = post.url;

      const summary =
        `${title}\n` +
        `• The crypto market reacted strongly to this update.\n` +
        `• Investors are closely watching price movements.\n` +
        `• This news may impact short-term sentiment.\n` +
        `• Traders are adjusting their strategies.\n` +
        `• More developments are expected soon.`;

      const message =
`🚨 *Crypto News Alert*\n
${summary}

📰 *Source:* ${source}
🔗 [Read more](${link})`;

      for (const chatId of subscribers) {
        bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
      }
    }
  } catch (err) {
    console.error("News error:", err.message);
  }
}

setInterval(checkNews, CHECK_INTERVAL);
/* ========================= */
/* ========= BROADCAST ========= */
function broadcast(text) {
  subscribers.forEach((id) => {
    bot.sendMessage(id, text, { parse_mode: "Markdown" });
  });
}
/* ============================= */

/* ========= FETCH NEWS ========= */
async function checkNews() {
  try {
    const url =
      `https://cryptopanic.com/api/v1/posts/` +
      `?auth_token=${CRYPTOPANIC_API}` +
      `&kind=news&filter=hot`;

    const data = await fetch(url).then((r) => r.json());

    if (!data.results || !data.results.length) return;

    for (const post of data.results) {
      if (sentNews.has(post.id)) continue;

      sentNews.add(post.id);

      const title = post.title;
      const source = post.source?.title || "Unknown";
      const link = post.url;

      // تلخيص بسيط 5 سطور
      const summary =
        `• ${title}\n` +
        `• The crypto market is reacting strongly to this news.\n` +
        `• Traders are closely watching price movements.\n` +
        `• This update may impact short-term market sentiment.\n` +
        `• Further developments are expected soon.`;

      const message =
`🚨 *Crypto News Alert*\n\n${summary}\n\n📰 *Source:* ${source}\n🔗 [Read more](${link})`;

      broadcast(message);
    }
  } catch (err) {
    console.error("News error:", err.message);
  }
}

setInterval(checkNews, CHECK_INTERVAL);
/* ============================= */
