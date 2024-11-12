import { InlineKeyboard } from "grammy";
import { bot } from "../bot.js";

export const clearHistory = async (ctx) => {
  try {
    if (ctx.message["chat"]["type"] !== "private") {
      return;
    }

    const currentMessageId = ctx.message.message_id;
    const deleteMessages = [];

    // Faqat joriy xabardan oldingisini o'chirish uchun
    for (let i = currentMessageId; i > -1; i--) {
      deleteMessages.push(i);
      // 100 ta xabardan keyin to'xtatish (Telegram API cheklovi)
      if (deleteMessages.length >= 100) {
        try {
          await bot.api.deleteMessages(ctx.chat.id, deleteMessages);
          // Keyingi to'plamni o'chirish uchun array ni tozalash
          deleteMessages.length = 0;
          // API cheklovidan qochish uchun ozgina kutish
          // await new Promise((resolve) => setTimeout(resolve, 50));
        } catch (error) {
          console.log("Delete message error:", error.message);
          return;
        }
      }
    }

    // Qolgan xabarlarni o'chirish
    if (deleteMessages.length > 0) {
      try {
        await bot.api.deleteMessages(ctx.chat.id, deleteMessages);
      } catch (error) {
        console.log("Delete message error:", error.message);
        return;
      }
    }
    delete userResponses[ctx.chat.id];
  } catch (error) {
    console.error("Clear history error:", error);
    return;
  }
};

export const startCommand = async (ctx) => {
  // Boshlanish komandasini yozish
  const startKeyboard = new InlineKeyboard().text("Boshlash", "getStart");
  const userId = ctx.chat.id;
  const username = ctx.from.username || "Username mavjud emas";
  console.log(`User ID: ${userId}, Username: @${username}`);

  if (ctx.message["chat"]["type"] !== "private") {
    // Guruh/kanal kontekstida kelgan xabarlarni ignore qilish
    return;
  }

  // Foydalanuvchi uchun yangi obyekt yaratamiz
  return await ctx.reply(
    `
Assalomu alaykum 👐\n
Bot orqali savollar beriladi 🤖
Savollarga javob berib malumotlaringizni to'ldiring! 📑`,
    { reply_markup: startKeyboard }
  );
};

export const infoCommand = (ctx) => {
  if (ctx.message["chat"]["type"] !== "private") {
    // Guruh/kanal kontekstida kelgan xabarlarni ignore qilish
    return;
  }
  return ctx.reply(
    `Bot orqali o'zingizni shaxsiy malumotlaringizni yuborishingiz kerak!`
  );
};
