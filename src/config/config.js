import dotenv from "dotenv";
dotenv.config();

export default {
  botToken: process.env.BOT_TOKEN,
  groupId1: process.env.GROUP_CHAT_ID,
  groupId2: process.env.GROUP_CHAT_ID2,
};
