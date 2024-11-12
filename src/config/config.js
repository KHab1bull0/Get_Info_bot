import dotenv from "dotenv";
dotenv.config();

export default {
  botToken: process.env.BOT_TOKEN,
  groupId: process.env.GROUP_CHAT_ID,
};
