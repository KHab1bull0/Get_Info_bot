import { Bot, InlineKeyboard, session } from "grammy";
import config from "./config/config.js";
import {
  clearHistory,
  infoCommand,
  startCommand,
} from "./commands/commands.js";
import { commands, questions } from "./helper/helper.js";

export const bot = new Bot(process.env.BOT_TOKEN);
export const userResponses = {};
export let check = true;
export let checkPhoto = false;

export const getBackPhoto = (ctx) => {
  check = false;
  checkPhoto = true;
  setTimeout(async () => {
    await ctx.reply("📸 Passportni orqa rasmini yuboring!");
  }, 2000);
};

export const confirmPhoto = (ctx) => {
  checkPhoto = false;
  setTimeout(async () => {
    await ctx.reply("📸 Rasmlarni to'liq yubordingizmi?", {
      reply_markup: new InlineKeyboard()
        .text("Ha", "confirm_photo")
        .text("Yo'q", "deny_photo"),
    });
  }, 12000);
};

// Bot admin bo'lgan guruhlarni olish
async function getAdminGroups() {
  const groups = [];

  try {
    // Botning barcha chatlarini olish
    const updates = await bot.api.getUpdates();
    const chatIds = new Set();

    // Unique chat ID larni yig'ish
    updates.forEach((update) => {
      if (
        update.message?.chat.type === "supergroup" ||
        update.message?.chat.type === "group"
      ) {
        chatIds.add(update.message.chat.id);
      }
    });

    // Har bir chat uchun botning admin huquqlarini tekshirish
    for (const chatId of chatIds) {
      try {
        const chatInfo = await bot.api.getChat(chatId);
        const botInfo = await bot.api.getMe();
        const adminInfo = await bot.api.getChatMember(chatId, botInfo.id);

        if (chatInfo.type === "supergroup" || chatInfo.type === "group") {
          const groupInfo = {
            chatId: chatId,
            title: chatInfo.title || "Nomsiz guruh",
            membersCount: await bot.api.getChatMemberCount(chatId),
            isAdmin: adminInfo.status === "administrator",
            adminPermissions: null,
          };

          if (adminInfo.status === "administrator") {
            groupInfo.adminPermissions = {
              canDeleteMessages: adminInfo.can_delete_messages,
              canRestrictMembers: adminInfo.can_restrict_members,
              canPromoteMembers: adminInfo.can_promote_members,
              canChangeInfo: adminInfo.can_change_info,
              canInviteUsers: adminInfo.can_invite_users,
              canPinMessages: adminInfo.can_pin_messages,
            };
          }

          groups.push(groupInfo);
        }
      } catch (err) {
        console.error(`Xatolik yuz berdi chatId=${chatId}:`, err);
      }
    }
  } catch (err) {
    console.error("Guruhlar ro'yxatini olishda xatolik:", err);
  }

  return groups;
}

// Admin guruhlar ro'yxatini ko'rsatish komandasi
bot.command("my_groups", async (ctx) => {
  try {
    const adminGroups = await getAdminGroups();

    if (adminGroups.length === 0) {
      await ctx.reply("Bot hech qaysi guruhda admin emas.");
      return;
    }

    let message = "Bot admin bo'lgan guruhlar ro'yxati:\n\n";
    adminGroups.forEach((group, index) => {
      message += `${index + 1}. ${group.title}\n`;
      message += `   Chat ID: ${group.chatId}\n`;
      message += `   A'zolar soni: ${group.membersCount}\n`;

      if (group.adminPermissions) {
        message += "   Huquqlar:\n";
        const permissions = {
          canDeleteMessages: "- Xabarlarni o'chirish",
          canRestrictMembers: "- Foydalanuvchilarni cheklash",
          canPromoteMembers: "- Admin tayinlash",
          canChangeInfo: "- Guruh ma'lumotlarini o'zgartirish",
          canInviteUsers: "- Foydalanuvchilarni taklif qilish",
          canPinMessages: "- Xabarlarni qadash",
        };

        for (const [key, value] of Object.entries(group.adminPermissions)) {
          if (value) {
            message += `   ${permissions[key]}\n`;
          }
        }
      }
      message += "\n";
    });

    await ctx.reply(message);
  } catch (error) {
    console.error("Xatolik yuz berdi:", error);
    await ctx.reply("Xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.");
  }
});

const initBot = async () => {
  bot.use(session());
  await bot.api.setMyCommands([], {
    scope: {
      type: "all_group_chats",
    },
  });

  await bot.api.setMyCommands(commands, {
    scope: {
      type: "all_private_chats",
    },
  });

  bot.command("start", startCommand);
  bot.command("info", infoCommand);
  bot.command("clear_history", clearHistory);

  bot.on("message:photo", async (ctx) => {
    if (ctx.message["chat"]["type"] !== "private") {
      // Guruh/kanal kontekstida kelgan xabarlarni ignore qilish
      return;
    }

    const userId = ctx.chat.id;
    const user = userResponses[userId];
    const mediaGroupId = ctx.message.media_group_id;

    if (!user) return;

    if (questions[user.currentQuestion].key !== "photo") {
      if (questions[user.currentQuestion].key == "card") {
        return ctx.reply(
          `Iltimos, karta raqami va amal qilish muddatini quyidagi formatda kiriting:\n1234567891234567 12/27`
        );
      } else if (questions[user.currentQuestion].key == "address") {
        return ctx.reply(`Yashash manzilini to'g'ri kiriting!`);
      } else if (questions[user.currentQuestion].key == "phone") {
        return ctx.reply(
          `Telefon raqamingizni to'g'ri formatda kiriting!\nMasalan: +998901234567`
        );
      }
    }

    // Media group ID ni saqlash
    if (!userResponses[userId] || userResponses[userId].currentQuestion !== 0)
      return;

    // Agar yangi media group boshlansa
    if (
      mediaGroupId &&
      (!user.mediaGroupId || user.mediaGroupId !== mediaGroupId)
    ) {
      user.mediaGroupId = mediaGroupId;
      user.answers[0] = []; // Rasmlar arrayini tozalash
    }
    const photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;

    if (!user.answers[0]) {
      user.answers[0] = [];
    }
    user.answers[0].push(photoId);

    if (check) getBackPhoto(ctx);
    if (checkPhoto) confirmPhoto(ctx);
  });

  // Javobni qayta ishlash
  bot.on("message:text", async (ctx) => {
    const userId = ctx.chat.id;
    const user = userResponses[userId];
    const messageId = ctx.message.message_id;
    if (!user) return;

    if (ctx.message["chat"]["type"] !== "private") {
      // Guruh/kanal kontekstida kelgan xabarlarni ignore qilish
      return;
    }

    if (questions[user.currentQuestion].key === "card") {
      const cardDetails = ctx.message.text.split(" ");

      // Check if both card number and expiry date are provided
      if (cardDetails.length !== 2) {
        return ctx.reply(
          "Iltimos, karta raqami va amal qilish muddatini quyidagi formatda kiriting:\n1234567891234567 12/27"
        );
      }

      const [cardNumber, expiryDate] = cardDetails;

      // Validate card number (16 digits)
      if (!/^\d{16}$/.test(cardNumber)) {
        return ctx.reply("Karta raqami 16 ta raqamdan iborat bo'lishi kerak!");
      }

      // Validate expiry date (MM/YY format)
      if (!/^(0[1-9]|1[0-2])\/([0-9]{2})$/.test(expiryDate)) {
        return ctx.reply(
          "Amal qilish muddati noto'g'ri formatda! (Masalan: 12/27)"
        );
      }
    }

    if (questions[user.currentQuestion].key === "address") {
      if (ctx.message.text.length < 3) {
        return ctx.reply("Yashash manzilini to'g'ri kiriting!");
      }
    }

    if (questions[user.currentQuestion].key === "address_nomer") {
      if (ctx.message.text.length < 1) {
        return ctx.reply("Yashash manzilini to'g'ri kiriting!");
      }
    }

    if (questions[user.currentQuestion].key === "phone") {
      if (!/^\+998\d{9}$/.test(ctx.message.text)) {
        return ctx.reply(
          "Telefon raqamingizni to'g'ri formatda kiriting!\nMasalan: +998901234567"
        );
      }
    }

    if (user && user?.["answers"][0]) {
      // Foydalanuvchi uchun javoblar mavjudligini tekshirish
      if (!userResponses[userId] || userResponses[userId].currentQuestion === 0)
        return;

      const user = userResponses[userId];
      user.answers.push(ctx.message.text); // Javobni saqlash

      // Keyingi savolni yuborish yoki barcha javoblarni ko'rsatish
      if (user.currentQuestion < questions.length - 1) {
        if (userResponses[userId]) {
          if (user.currentQuestion === 1) {
            ctx.reply(questions[user.currentQuestion + 1].message);
            user.currentQuestion++;
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
          user.currentQuestion++;
          ctx.reply(questions[user.currentQuestion].message);
        } else {
          ctx.reply(`Qaytadan /start tugmasini bosing!`);
        }
      } else {
        // Barcha javoblar to'plandi, foydalanuvchiga ko'rsatamiz
        let media = [];
        if (user.answers[0].length > 0) {
          media = user.answers[0].map((photoId, index) => ({
            type: "photo",
            media: photoId,
            caption:
              index === 0
                ? `👤 Malumotlaringiz to'g'rimi?\n\n` +
                  `💳 Plastik karta: ${user.answers[1].split(" ")[0]}${
                    user.answers[1].split(" ")[1]}\n` +
                  `📍 Yashash manzil:\nShahar: ${user.answers[2]}\nTuman: ${user.answers[3]}\nMahalla: ${user.answers[4]}\nKo'cha: ${user.answers[5]}\nUy: ${user.answers[6]}\n` +
                  `📱 Telefon: ${user.answers[7]}\n` +
                  `🛒 Xarid qilmoqchisiz: ${user.answers[8]}`
                : "",
            parse_mode: "HTML",
          }));
        }
        await bot.api.sendMediaGroup(userId, media, {
          parse_mode: "HTML",
        });

        // Tasdiqlash tugmalarini yaratamiz
        const keyboard = new InlineKeyboard()
          .text("To'g'ri", "confirm")
          .text("Noto'g'ri", "deny");

        ctx.reply("✅ Tasdiqlash!", {
          reply_markup: keyboard,
          parse_mode: "HTML",
        });
      }
    } else {
      return ctx.reply("📸 Rasm kiriting!");
    }
  });

  bot.callbackQuery("confirm", async (ctx) => {
    const userId = ctx.callbackQuery.message.chat.id;
    const groupId1 = config.groupId1;
    const groupId2 = config.groupId2;
    const user = userResponses[userId];
    const messageId = ctx.callbackQuery.message.message_id;

    if (user) {
      let media = [];
      if (user.answers[0].length > 0) {
        media = user.answers[0].map((photoId, index) => ({
          type: "photo",
          media: photoId,
          caption:
            index === 0
              ? `👤 Client malumotlari\n\n` +
                `💳 Plastik karta: <code>${
                  user.answers[1].split(" ")[0]
                }</code> <code>${user.answers[1].split(" ")[1]}</code>\n` +
                `📍 Yashash manzil:\nShahar: ${user.answers[2]}\nTuman: ${user.answers[3]}\nMahalla: ${user.answers[4]}\nKo'cha: ${user.answers[5]}\nUy: ${user.answers[6]}\n` +
                `📱 Telefon: ${user.answers[7]}\n` +
                `🛒 Xarid qilmoqda: ${user.answers[8]}`
              : "",
          parse_mode: "HTML",
        }));
      }

      try {
        await bot.api.sendMediaGroup(groupId1, media, { parse_mode: "HTML" });
        await bot.api.sendMediaGroup(groupId2, media, { parse_mode: "HTML" });
      } catch (error) {
        console.log(error);
      }
      ctx.reply("👍 Malumotlaringiz qabul qilindi!\nO'zimiz aloqaga chiqamiz!");
      delete userResponses[userId]; // Javoblarni o'chirish
      ctx.answerCallbackQuery(); // Tugma holatini yangilash
    }

    const arr = [];
    for (let i = messageId; i > messageId - 100; i--) {
      arr.push(i);
    }
    await bot.api.deleteMessages(ctx.chat.id, arr);
  });

  bot.callbackQuery("getStart", (ctx) => {
    const userId = ctx.callbackQuery.message.chat.id;
    check = true;
    userResponses[userId] = { answers: [], currentQuestion: 0 };
    ctx.reply("🪪 Passport malumoti!");
    setTimeout(() => {
      ctx.reply(questions[0].message);
    }, 1000);
    ctx.answerCallbackQuery();
  });

  bot.callbackQuery("deny", async (ctx) => {
    const userId = ctx.callbackQuery.message.chat.id;
    userResponses[userId] = { answers: [], currentQuestion: 0 };
    check = true;
    checkPhoto = false;

    ctx.reply("🔄 Malumotlaringizni qaytadan kiriting!");
    await new Promise((resolve) => setTimeout(resolve, 100));
    ctx.reply(questions[0].message);
    ctx.answerCallbackQuery();
  });

  bot.callbackQuery("confirm_photo", (ctx) => {
    const userId = ctx.callbackQuery.message.chat.id;
    const user = userResponses[userId];
    if (user) {
      const userId = ctx.callbackQuery.message.chat.id;
      userResponses[userId].currentQuestion++;
      ctx.reply(questions[userResponses[userId].currentQuestion].message);
      ctx.answerCallbackQuery();
    }
  });

  bot.callbackQuery("deny_photo", (ctx) => {
    const userId = ctx.callbackQuery.message.chat.id;
    const user = userResponses[userId];
    if (user) {
      ctx.reply("📸 Qolgan rasmlarni yuboring!");
      checkPhoto = true;
      ctx.answerCallbackQuery();
    }
  });

  bot.start();
  console.log(`Bot is running...`);
};

initBot().catch((err) => console.log(err));
