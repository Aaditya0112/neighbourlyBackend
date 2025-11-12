## Socket & Chat Integration Guide

This document explains how the backend stores chats and messages, the model shapes, socket events (from `ChatEventEnum`), the available controllers and the expected HTTP routes / request and response shapes. It also describes how the socket service is expected to work and how the frontend can integrate with it.

## Purpose / Contract
- Inputs: authenticated requests (JWT) for HTTP endpoints; authenticated socket handshake (JWT) for real-time events.
- Outputs: structured JSON responses (ApiResponse wrapper) and real-time socket events sent to user-specific rooms.
- Error modes: controllers throw `ApiError` with status codes (400/401/403/404/500). Socket emits `socketError` events on handshake/failure.

Assumption: the current socket code expects a raw JWT in the `authorization` header of the socket handshake (no automatic `Bearer ` stripping). If you prefer the `Bearer <token>` format from the frontend, either send the raw token or update the backend to strip the `Bearer ` prefix.

## Models (what's saved and why)

All the models are Mongoose models stored in MongoDB.

- `User` (`src/models/user.model.js`)
  - Fields: `name` (String), `gender` ("MALE"|"FEMALE"|"OTHER"), `address` (String), `phoneNumber` (String, unique), `password` (String, hashed), `havePremium` (Boolean), `profilePic` (String), `homeCoordinates` ([Number]), `fcmToken` (String)
  - Notes: password is hashed in a pre-save hook. `fcmToken` is kept for push notifications.

- `Chat` (`src/models/chat.model.js`)
  - Fields:
    - `name` (String) — a title for group chats or placeholder for one-on-one
    - `isGroupChat` (Boolean) — true for group chats
    - `lastMessage` (ObjectId -> `ChatMessage`) — latest message for list UI
    - `participants` ([ObjectId -> `User`]) — list of members
    - `admin` (ObjectId -> `User`) — group admin (for groups)
  - Timestamps: `createdAt`, `updatedAt` (via schema timestamps)

- `ChatMessage` (`src/models/message.model.js`)
  - Fields:
    - `sender` (ObjectId -> `User`)
    - `content` (String)
    - `attachments` (Array of { url, localPath })
    - `chat` (ObjectId -> `Chat`)
  - Timestamps: `createdAt`, `updatedAt`
  - Notes: attachments are stored with both a public `url` and a `localPath` for server-side cleanup.

## chatEventEnum (server-side constant)
Located at `src/constants.js` as `ChatEventEnum`. Key events:

- `CONNECTED_EVENT` — "connected"
- `DISCONNECT_EVENT` — "disconnect"
- `JOIN_CHAT_EVENT` — "joinChat"
- `LEAVE_CHAT_EVENT` — "leaveChat"
- `UPDATE_GROUP_NAME_EVENT` — "updateGroupName"
- `MESSAGE_RECEIVED_EVENT` — "messageReceived"
- `NEW_CHAT_EVENT` — "newChat"
- `SOCKET_ERROR_EVENT` — "socketError"
- `STOP_TYPING_EVENT` — "stopTyping"
- `TYPING_EVENT` — "typing"
- `MESSAGE_DELETE_EVENT` — "messageDeleted"

Frontend should listen for these specific event names when handling real-time updates.

## Controllers (what they do) — summary and suggested routes

NOTE: In `src/app.js`, chat/message controllers are not currently registered as routes. The controllers already exist under `src/controllers/` and can be wired to REST endpoints. Below are the controller functions and the recommended route mapping + request/response shapes.

1) Chat controller — core operations (`src/controllers/chat.controller.js`)

- searchAvailableUsers
  - Purpose: list other users to start chats with
  - Suggested route: GET `/api/v1/chats/users/search`
  - Auth: required
  - Response: 200 { status, data: [ { _id, avatar, username, email } ] }

- createOrGetAOneOnOneChat(receiverId)
  - Purpose: return existing one-on-one chat or create a new one
  - Suggested route: POST `/api/v1/chats/one-on-one/:receiverId`
  - Auth: required
  - Response: 200 / 201 { status, data: { _id, name, isGroupChat, lastMessage, participants: [...], admin } }
  - Socket: emits `NEW_CHAT_EVENT` to the other participant(s)

- createAGroupChat
  - Purpose: create a new group chat
  - Suggested route: POST `/api/v1/chats/group`
  - Body: { name: string, participants: [userId, ...] }
  - Auth: required
  - Response: 201 { status, data: chat }
  - Socket: emits `NEW_CHAT_EVENT` to newly added participants

- getGroupChatDetails(chatId)
  - Purpose: get full group chat info
  - Suggested route: GET `/api/v1/chats/group/:chatId`
  - Auth: required
  - Response: 200 { status, data: chat }

- renameGroupChat(chatId)
  - Purpose: change group name (admin only)
  - Suggested route: PUT `/api/v1/chats/group/:chatId/rename`
  - Body: { name }
  - Auth: required
  - Response: 200 { status, data: updatedChat }
  - Socket: emits `UPDATE_GROUP_NAME_EVENT` to participants

- deleteGroupChat(chatId)
  - Purpose: admin deletes group; cascades message deletion and attachments
  - Suggested route: DELETE `/api/v1/chats/group/:chatId`
  - Auth: required
  - Response: 200 { status, data: {} }
  - Socket: emits `LEAVE_CHAT_EVENT` to other participants

- deleteOneOnOneChat(chatId)
  - Purpose: delete a one-on-one chat and its messages
  - Suggested route: DELETE `/api/v1/chats/:chatId`
  - Auth: required
  - Response: 200 { status, data: {} }
  - Socket: emits `LEAVE_CHAT_EVENT` to the other participant

- leaveGroupChat(chatId)
  - Purpose: current user leaves a group
  - Suggested route: POST `/api/v1/chats/group/:chatId/leave`
  - Auth: required
  - Response: 200 { status, data: updatedChat }

- addNewParticipantInGroupChat(chatId, participantId)
  - Purpose: admin adds a new participant
  - Suggested route: POST `/api/v1/chats/group/:chatId/participants/:participantId`
  - Auth: required (admin only)
  - Response: 200 { status, data: updatedChat }
  - Socket: emits `NEW_CHAT_EVENT` to the added participant

- removeParticipantFromGroupChat(chatId, participantId)
  - Purpose: admin removes someone from group
  - Suggested route: DELETE `/api/v1/chats/group/:chatId/participants/:participantId`
  - Auth: required (admin only)
  - Response: 200 { status, data: updatedChat }
  - Socket: emits `LEAVE_CHAT_EVENT` to removed participant

- getAllChats()
  - Purpose: fetch all chats for logged-in user
  - Suggested route: GET `/api/v1/chats`
  - Auth: required
  - Response: 200 { status, data: [ chat objects ] }

2) Message controller — (`src/controllers/message.controller.js`)

- getAllMessages(chatId)
  - Purpose: list messages of a chat (permission checked: only participants)
  - Route: GET `/api/v1/chats/:chatId/messages`
  - Auth: required
  - Response: 200 { status, data: [ { _id, sender: { _id, username, avatar }, content, attachments, createdAt } ] }

- sendMessage(chatId)
  - Purpose: create a message (content or attachments required), updates chat.lastMessage
  - Route: POST `/api/v1/chats/:chatId/messages`
  - Body: { content?: string } and multipart attachments under `attachments` field
  - Auth: required
  - Response: 201 { status, data: message }
  - Socket: emits `MESSAGE_RECEIVED_EVENT` to other participants in the chat

- deleteMessage(chatId, messageId)
  - Purpose: delete a message (only sender allowed). Deletes attachments from local storage.
  - Route: DELETE `/api/v1/chats/:chatId/messages/:messageId`
  - Auth: required
  - Response: 200 { status, data: deletedMessage }
  - Socket: emits `MESSAGE_DELETE_EVENT` to other participants


## Example response shapes

- Chat (aggregated / returned by controllers):

```json
{
  "_id": "<chatId>",
  "name": "One on one chat",
  "isGroupChat": false,
  "lastMessage": {
    "_id": "<messageId>",
    "sender": { "_id": "<userId>", "username": "alice", "avatar": "..." },
    "content": "Hi!",
    "attachments": [],
    "createdAt": "2025-01-01T..."
  },
  "participants": [ { "_id": "<userId>", "username": "alice" }, ... ],
  "admin": "<adminUserId>"
}
```

- Message (returned after send):

```json
{
  "_id": "<messageId>",
  "sender": { "_id": "<userId>", "username": "alice", "avatar": "..." },
  "content": "Hello",
  "attachments": [ { "url": "https://...", "localPath": "/uploads/.." } ],
  "chat": "<chatId>",
  "createdAt": "2025-01-01T..."
}
```

Note: Controllers often run aggregation lookups to attach `sender`/`participants` data with sensitive fields omitted (password, tokens, etc.).

## Socket service (how it works on the backend)

Current `src/services/socket/index.js` contains commented-out code for a typical socket.io integration. The intended flow:

1. Server-side: initialize socket.io and call `setupSocket(fastifyApp)` so the module captures the `io` instance.
2. Client-side: when opening a socket connection, include an `authorization` header with the JWT (see assumption above about raw token vs `Bearer `).
3. On connection, server verifies JWT: `jwt.verify(token, process.env.TOKEN_SECRET)`, then finds the `User` by id and attaches it to the socket as `socket.user`.
4. Server emits `CONNECTED_EVENT` to the socket and can join user-specific rooms. Common pattern: join a room named after the user's id (e.g., `socket.join(user._id.toString())`) so the server can emit to that user from anywhere using `io.in(userId).emit(event, payload)`.
5. The server has an `emitSocketEvent(req, roomId, event, payload)` helper used in controllers. It attempts to use `req.io` (if available), falls back to a module-level `ioInstance`, and finally tries `req.server.io`.
6. Controllers call `emitSocketEvent(req, participantUserId, ChatEventEnum.MESSAGE_RECEIVED_EVENT, receivedMessage)` to notify other participants.

Rooms and event examples:
- When a new chat is created: server calls `emitSocketEvent(..., participantUserId, ChatEventEnum.NEW_CHAT_EVENT, chatPayload)` — frontend should listen for `newChat` and add the chat to the list.
- When a message is created: emit `messageReceived` to every other participant. Payload: aggregated message object.
- When a message is deleted: emit `messageDeleted` with the message object or id.
- Typing indicators: frontend can emit `typing`/`stopTyping` to server; server can broadcast to other participants.

Security note: make sure the handshake token is validated and socket events check permissions. For example, ensure a client cannot emit `sendMessage` to a chat they are not a participant of — server-side controllers already check that.

## Frontend integration checklist

1. Authenticate via HTTP and obtain JWT (from `/api/v1/auth/login`).
2. Open socket connection to the server and include the JWT as `authorization` header (raw token) until backend is updated to accept `Bearer `.
   - Example: socket.io-client connect options -> `extraHeaders: { authorization: token }` or `auth: { token }` depending on client library.
3. After connected, listen for key events from `ChatEventEnum`: `newChat`, `messageReceived`, `messageDeleted`, `updateGroupName`, `leaveChat`, `typing`, `stopTyping`.
4. To send a message, call HTTP POST `/api/v1/chats/:chatId/messages` with `content` (or attachments via multipart). Server persists message and emits `messageReceived` to other participants.
5. For chat list and last message: GET `/api/v1/chats`.

## Existing registered routes (in this repo as of now)
- Auth: `/api/v1/auth` (see `src/routes/authentication.route.js`)
  - `POST /register` — register user
  - `POST /login` — login returns token
  - `POST /fcmtoken` — set fcm token (auth required)
  - `GET /me` — get current user

- Requests & Users: `/api/v1` (see `src/routes/request.route.js`, `src/routes/user.route.js`)

Note: Chat/message routes are not currently registered in `src/app.js`. Add routes similar to the suggested routes above to enable HTTP endpoints for chat functionality.

## Suggested minimal route wiring (example)
Create a `src/routes/chat.route.js` that registers these endpoints and mount it in `app.js` with `await app.register(chatRoutes, { prefix: '/api/v1' });`.

Example endpoints to expose (summary):

- GET `/api/v1/chats` -> `getAllChats`
- POST `/api/v1/chats/one-on-one/:receiverId` -> `createOrGetAOneOnOneChat`
- POST `/api/v1/chats/group` -> `createAGroupChat`
- GET `/api/v1/chats/group/:chatId` -> `getGroupChatDetails`
- PUT `/api/v1/chats/group/:chatId/rename` -> `renameGroupChat`
- DELETE `/api/v1/chats/group/:chatId` -> `deleteGroupChat`
- DELETE `/api/v1/chats/:chatId` -> `deleteOneOnOneChat`
- POST `/api/v1/chats/group/:chatId/leave` -> `leaveGroupChat`
- POST `/api/v1/chats/group/:chatId/participants/:participantId` -> `addNewParticipantInGroupChat`
- DELETE `/api/v1/chats/group/:chatId/participants/:participantId` -> `removeParticipantFromGroupChat`

Message endpoints:
- GET `/api/v1/chats/:chatId/messages` -> `getAllMessages`
- POST `/api/v1/chats/:chatId/messages` -> `sendMessage` (multipart/form-data for attachments)
- DELETE `/api/v1/chats/:chatId/messages/:messageId` -> `deleteMessage`

## Next steps & recommendations

1. Register the chat/message routes in `src/app.js` so HTTP endpoints are available.
2. Enable and wire the socket service: uncomment and bind `setupSocket(app)` and ensure `fastify` is configured with socket.io (or use a separate HTTP server + socket.io). Ensure `emitSocketEvent` has a valid `io` instance.
3. Normalize token expectation in handshake: accept `Bearer <token>` or raw token consistently and document it for frontend.
4. Add client-side helpers:
   - joining the user's room on connect
   - updating the chat list on `newChat`
   - append messages on `messageReceived`

5. (Optional) Add typed contracts (OpenAPI/Swagger) for chat/message endpoints and socket event payloads to reduce frontend/backend mismatch.

## Contact
If you want, I can:
- add a `src/routes/chat.route.js` and register it in `app.js` (I can implement this wiring),
- wire the socket service (enable socket.io, implement `registerIo` + `setupSocket` usage), and
- add example client code for socket.io-client showing how to connect and listen for the events.

---

File created from server sources in `src/models/` and `src/controllers/`. If you'd like, I can also add a small Postman collection / cURL examples or implement the suggested route registration now.
