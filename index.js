import TelegramBot from "node-telegram-bot-api";
import fetch from "node-fetch";

/* ========= CONFIG ========= */
const BOT_TOKEN = process.env.BOT_TOKEN;
const CRYPTOPANIC_API = process.env.CRYPTOPANIC_API;

const CHECK_INTERVAL = 60 * 1000; // كل دقيقة
/* ========================= */

if (!BOT_TOKEN || !CRYPTOPANIC_API) {
  console.error("❌ Missing ENV variables");
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

let subscribers = [];
let sentNews = new Set();

/* ========= START ========= */
bot.onText(/\/start/, (msg) => {
  if (!subscribers.includes(msg.chat.id)) {
    subscribers.push(msg.chat.id);
  }

  bot.sendMessage(
    msg.chat.id,
    "📰 *Crypto News Bot*\n\n" +
      "📡 هيوصلك كل خبر كريبتو جديد أول ما ينزل\n" +
      "📝 مع تلخيص واضح + المصدر + الرابط\n\n" +
      "جاهز 🔥",
    { parse_mode: "Markdown" }
  );
});
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
