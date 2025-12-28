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

/* ===== BOT COMMANDS ===== */
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "🎬 *Video Downloader Bot*\n\n" +
      "📥 ابعت لينك فيديو من:\n" +
      "TikTok / Instagram / YouTube / Twitter\n\n" +
      "⬇️ وأنا أحملهولك",
    { parse_mode: "Markdown" }
  );
});

bot.on("message", (msg) => {
  if (!msg.text || msg.text.startsWith("/")) return;

  const url = msg.text.trim();
  if (!url.startsWith("http")) return;

  bot.sendMessage(msg.chat.id, "⏳ جاري التحميل...");

  const fileName = `video_${Date.now()}.mp4`;
  const filePath = path.join(DOWNLOAD_DIR, fileName);

  const command = `yt-dlp -f mp4 -o "${filePath}" "${url}"`;

  exec(command, (error) => {
    if (error) {
      bot.sendMessage(
        msg.chat.id,
        "❌ فشل التحميل\nاللينك غير مدعوم أو الفيديو خاص"
      );
      return;
    }

    bot.sendVideo(msg.chat.id, filePath).then(() => {
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
