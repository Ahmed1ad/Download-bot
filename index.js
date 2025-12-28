const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

/* ========= CONFIG ========= */
const BOT_TOKEN = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 3000;
const DOWNLOAD_DIR = "./downloads";
/* ========================= */

if (!BOT_TOKEN) {
  console.error("Missing BOT_TOKEN");
  process.exit(1);
}

if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR);
}

const bot = new TelegramBot(BOT_TOKEN);
const app = express();
app.use(express.json());

/* ===== HEALTH CHECK ===== */
app.get("/", (req, res) => {
  res.send("Bot is running");
});

/* ===== TELEGRAM WEBHOOK ===== */
app.post("/webhook", (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

/* ===== BOT ===== */
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "🎬 *Video Downloader Bot*\n\n" +
      "📥 ابعت لينك فيديو من:\n" +
      "TikTok / Instagram / YouTube / X / Facebook\n\n" +
      "⬇️ وأنا أحملهولك",
    { parse_mode: "Markdown" }
  );
});

bot.on("message", (msg) => {
  if (!msg.text || msg.text.startsWith("/")) return;

  const chatId = msg.chat.id;
  const url = msg.text.trim();

  if (!url.startsWith("http")) return;

  bot.sendMessage(chatId, "⏳ جاري التحميل...");

  const outputTemplate = path.join(
    DOWNLOAD_DIR,
    `video_${Date.now()}.%(ext)s`
  );

  // yt-dlp command
  const command = `yt-dlp -f mp4 -o "${outputTemplate}" "${url}"`;

  exec(command, (error) => {
    if (error) {
      console.error(error);
      bot.sendMessage(
        chatId,
        "❌ فشل التحميل\nاللينك غير مدعوم أو الفيديو خاص"
      );
      return;
    }

    // find downloaded file
    const files = fs.readdirSync(DOWNLOAD_DIR);
    const file = files.find((f) => f.startsWith("video_"));

    if (!file) {
      bot.sendMessage(chatId, "❌ لم يتم العثور على الملف");
      return;
    }

    const filePath = path.join(DOWNLOAD_DIR, file);

    bot.sendVideo(chatId, filePath).then(() => {
      fs.unlinkSync(filePath);
    });
  });
});

/* ===== START SERVER ===== */
app.listen(PORT, async () => {
  console.log("🚀 Server running on port", PORT);

  const webhookUrl = `${process.env.RENDER_EXTERNAL_URL}/webhook`;
  await bot.setWebHook(webhookUrl);

  console.log("✅ Webhook set:", webhookUrl);
});
