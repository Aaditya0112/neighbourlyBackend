import {
  addNewParticipantInGroupChat,
  createAGroupChat,
  createOrGetAOneOnOneChat,
  deleteGroupChat,
  deleteOneOnOneChat,
  getAllChats,
  getGroupChatDetails,
  leaveGroupChat,
  removeParticipantFromGroupChat,
  renameGroupChat,
  searchAvailableUsers,
} from "../controllers/chat.controller.js";
import { getAllMessages, sendMessage, deleteMessage } from "../controllers/message.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

async function chatRoutes(fastify, options) {
  // Chat management
  fastify.get("/chats/users/search", { preHandler: verifyJWT }, searchAvailableUsers);
  fastify.get("/chats", { preHandler: verifyJWT }, getAllChats);
  fastify.post("/chats/one-on-one/:receiverId", { preHandler: verifyJWT }, createOrGetAOneOnOneChat);
  fastify.post("/chats/group", { preHandler: verifyJWT }, createAGroupChat);
  fastify.get("/chats/group/:chatId", { preHandler: verifyJWT }, getGroupChatDetails);
  fastify.put("/chats/group/:chatId/rename", { preHandler: verifyJWT }, renameGroupChat);
  fastify.delete("/chats/group/:chatId", { preHandler: verifyJWT }, deleteGroupChat);
  fastify.delete("/chats/:chatId", { preHandler: verifyJWT }, deleteOneOnOneChat);
  fastify.post("/chats/group/:chatId/leave", { preHandler: verifyJWT }, leaveGroupChat);
  fastify.post(
    "/chats/group/:chatId/participants/:participantId",
    { preHandler: verifyJWT },
    addNewParticipantInGroupChat
  );
  fastify.delete(
    "/chats/group/:chatId/participants/:participantId",
    { preHandler: verifyJWT },
    removeParticipantFromGroupChat
  );

  // Messages
  fastify.get("/chats/:chatId/messages", { preHandler: verifyJWT }, getAllMessages);
  fastify.post("/chats/:chatId/messages", { preHandler: verifyJWT }, sendMessage);
  fastify.delete("/chats/:chatId/messages/:messageId", { preHandler: verifyJWT }, deleteMessage);
}

export default chatRoutes;
