require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const APPS2APPCLASS = require("./supported_sites/APPS2APP");
const bot = new TelegramBot(process.env.TOKEN, { polling: true });

async function scrape_data(
  website_handler,
  scrape_type,
  url,
  file_name,
  chat_id
) {
  const parsed_data = await website_handler.read_lines();
  const title = parsed_data.title;
  const decrypt_url = website_handler.decrypted_URL;

  let lines = parsed_data.data;
  const lines_array = lines.split("\n");
  if (scrape_type === "scrape") {
    const cleaned_lines = lines_array
      .map((line) => {
        const match = line.match("^.+?:[^ ]+");
        if (match) return match[0];
        return line;
      })
      .join("\n");
    lines = cleaned_lines;
  }

  const buffer = Buffer.from(lines, "utf-8");
  bot.sendDocument(
    chat_id,
    buffer,
    {},
    { contentType: "text/plain", filename: file_name + ".txt" }
  );
  let markups = {};
  if (scrape_type === "scrape") {
    markups = {
      inline_keyboard: [
        [
          {
            text: "Get raw",
            callback_data: decrypt_url.length < 63 ? decrypt_url : "none",
          },
        ],
      ],
    };
  }
  bot.sendMessage(
    chat_id,
    `Compiled <code>${lines_array.length}</code> accounts.\nFilename: <code>${file_name}</code>\nTitle: <code>${title}</code>`,
    {
      parse_mode: "HTML",
      reply_markup: markups,
    }
  );
}

bot.onText(/\/(scrape|scraperaw) (.+)/, async (msg, match) => {
  const args = match[2].trim().split(" ");
  const scrape_type = match[1].trim();
  let temp_args = [...args];
  const chat_id = msg.chat.id;
  const url = temp_args.shift();
  const file_name = temp_args.join(" ") || "creds";

  const apps2app = new APPS2APPCLASS(url);
  if (!apps2app.encrypted_string) {
    bot.sendMessage(chat_id, "The URL is not yet supported.");
    return;
  }

  const decrypt_url = apps2app.decrypt_string();
  bot.sendMessage(
    chat_id,
    `The decrypted URL appears to be: <code>${decrypt_url}</code>`,
    { parse_mode: "HTML" }
  );
  await scrape_data(apps2app, scrape_type, url, file_name, chat_id);
});

bot.on("callback_query", async (callbackQuery) => {
  // only inline option is raw as of yet
  const chat_id = callbackQuery.message.chat.id;
  const url = callbackQuery.data;

  if (url == "none") {
    await bot.sendMessage(
      chat_id,
      `The URL was too long to be stored in Telegram's inline button.`
    );
    return;
  }
  await bot.sendMessage(
    chat_id,
    `Attempting to generate a raw file from the url <code>${url}</code>...`,
    {
      parse_mode: "HTML",
    }
  );
  const apps2app = new APPS2APPCLASS(url);
  apps2app.decrypted_URL = url;
  await scrape_data(apps2app, "scraperaw", url, "raw", chat_id);
});

bot.on("polling_error", (error) => {
  console.log(error);
});
