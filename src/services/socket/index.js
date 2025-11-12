
// import { ChatEventEnum } from "../../constants.js";
// import { User } from "../../models/user.model.js";
// import jwt from 'jsonwebtoken'
// import { ApiError } from "../../utils/ApiError.js";
// import { LocationLog } from "../../models/locationLog.model.js";

// // module-level io instance used by emitSocketEvent when req.io is not available
// let ioInstance = null;

// function registerIo(io) {
//     ioInstance = io;
// }


// async function setupSocket(fastify) {
//     // ensure we capture the io instance used by the server
import { ChatEventEnum } from "../../constants.js";
import { User } from "../../models/user.model.js";
import jwt from "jsonwebtoken";
import { ApiError } from "../../utils/ApiError.js";

// module-level io instance used by emitSocketEvent when req.io is not available
let ioInstance = null;

function registerIo(io) {
	ioInstance = io;
}

/**
 * Initialize socket handlers. Expects fastify to have `io` (socket.io) attached.
 * - verifies JWT from handshake (accepts raw token or `Bearer <token>`)
 * - attaches `socket.user` and joins a room named after the user id
 * - emits CONNECTED_EVENT
 * - provides basic typing/stopTyping forwarding
 */
async function setupSocket(fastify) {
	if (!fastify) return;

	// ensure we capture the io instance used by the server
	if (fastify && fastify.io) registerIo(fastify.io);

	if (!fastify.io) {
		console.warn("setupSocket: fastify.io is not available. Socket handlers not registered.");
		return;
	}

	fastify.io.on("connection", async (socket) => {
        print(socket.handshake.headers.toString())
		try {
			let token = socket.handshake.headers?.authorization || socket.handshake.auth?.token;

			if (!token) {
				throw new ApiError(401, "Un-authorized handshake. Token is missing");
			}

			// Accept `Bearer <token>` or raw token
			if (typeof token === "string" && token.startsWith("Bearer ")) {
				token = token.split(" ")[1];
			}

			const decodedToken = await jwt.verify(token, process.env.TOKEN_SECRET);

			const user = await User.findById(decodedToken?._id).select("-password");

			if (!user) {
				throw new ApiError(401, "Un-authorized handshake. Token is invalid");
			}

			socket.user = user;

			// join a room for this user so controllers can emit to the user id room
			const roomId = user._id.toString();
			socket.join(roomId);

			socket.emit(ChatEventEnum.CONNECTED_EVENT);
			console.log("User connected. userId:", roomId);

			// Example: allow client to register as admin (legacy behavior)
			socket.on("registerAdmin", () => {
				socket.join("admin");
				console.log("Admin joined the admin room.");
			});

			// Typing indicators forwarding. Frontend should send { roomId }
			socket.on(ChatEventEnum.TYPING_EVENT, (payload) => {
				try {
					const targetRoom = payload?.roomId;
					if (targetRoom) socket.to(targetRoom).emit(ChatEventEnum.TYPING_EVENT, { userId: roomId });
				} catch (e) {
					/* swallow */
				}
			});

			socket.on(ChatEventEnum.STOP_TYPING_EVENT, (payload) => {
				try {
					const targetRoom = payload?.roomId;
					if (targetRoom) socket.to(targetRoom).emit(ChatEventEnum.STOP_TYPING_EVENT, { userId: roomId });
				} catch (e) {
					/* swallow */
				}
			});

			socket.on(ChatEventEnum.DISCONNECT_EVENT, () => {
				socket.to("admin").emit("userDisconnected", socket.user?._id);
				console.log("user has disconnected. userId:", socket.user?._id);
				if (socket.user?._id) {
					socket.leave(socket.user._id);
				}
			});
		} catch (error) {
			// if handshake fails, notify client and log
			try {
				socket.emit(
					ChatEventEnum.SOCKET_ERROR_EVENT,
					error?.message || "Something went wrong while connecting to the socket."
				);
			} catch (e) {
				/* ignore */
			}
			console.log("Something went wrong while connecting to the socket.", error);
		}
	});
}

/**
 * Emit socket event to a room. Controllers should call this helper with the recipient userId as roomId.
 * It prefers `req.io` when available, falls back to a module-level io instance, and lastly `req.server.io`.
 */
async function emitSocketEvent(req, roomId, event, payload) {
	try {
		// prefer req.io when available (fastify request with io attached)
		if (req && req.io && typeof req.io.in === "function") {
			return req.io.in(roomId).emit(event, payload);
		}

		// fallback to module-level io instance
		if (ioInstance && typeof ioInstance.in === "function") {
			return ioInstance.in(roomId).emit(event, payload);
		}

		// as a last resort, if req is actually a fastify instance with .io
		if (req && req.io === undefined && req.server && req.server.io) {
			return req.server.io.in(roomId).emit(event, payload);
		}

		console.warn("emitSocketEvent: no io instance available to emit", { roomId, event });
		return null;
	} catch (err) {
		console.error("emitSocketEvent error", err);
		return null;
	}
}

export { setupSocket, emitSocketEvent, registerIo };
// Also export a helper to setup directly from a socket.io server instance
async function setupSocketIo(io) {
	if (!io) return;
	// register module-level instance for emit fallback
	registerIo(io);

	io.on("connection", async (socket) => {
		try {
			let token = socket.handshake.headers?.authorization || socket.handshake.auth?.token;

			if (!token) {
				throw new ApiError(401, "Un-authorized handshake. Token is missing");
			}

			if (typeof token === "string" && token.startsWith("Bearer ")) {
				token = token.split(" ")[1];
			}

			const decodedToken = await jwt.verify(token, process.env.TOKEN_SECRET);
			const user = await User.findById(decodedToken?._id).select("-password");
			if (!user) throw new ApiError(401, "Un-authorized handshake. Token is invalid");

			socket.user = user;
			const roomId = user._id.toString();
			socket.join(roomId);
			socket.emit(ChatEventEnum.CONNECTED_EVENT);
			console.log("User connected (io). userId:", roomId);

			socket.on("registerAdmin", () => {
				socket.join("admin");
				console.log("Admin joined the admin room.");
			});

			socket.on(ChatEventEnum.TYPING_EVENT, (payload) => {
				try {
					const targetRoom = payload?.roomId;
					if (targetRoom) socket.to(targetRoom).emit(ChatEventEnum.TYPING_EVENT, { userId: roomId });
				} catch (e) {}
			});

			socket.on(ChatEventEnum.STOP_TYPING_EVENT, (payload) => {
				try {
					const targetRoom = payload?.roomId;
					if (targetRoom) socket.to(targetRoom).emit(ChatEventEnum.STOP_TYPING_EVENT, { userId: roomId });
				} catch (e) {}
			});

			socket.on(ChatEventEnum.DISCONNECT_EVENT, () => {
				socket.to("admin").emit("userDisconnected", socket.user?._id);
				console.log("user has disconnected. userId:", socket.user?._id);
				if (socket.user?._id) socket.leave(socket.user._id);
			});
		} catch (error) {
			try {
				socket.emit(ChatEventEnum.SOCKET_ERROR_EVENT, error?.message || "Something went wrong while connecting to the socket.");
			} catch (e) {}
			console.log("Something went wrong in setupSocketIo:", error);
		}
	});
}

export { setupSocketIo };

/**
 * Returns true if the user (userId) currently has any sockets connected (is in their user room).
 * Resolves false if io is not initialized.
 */
async function isUserOnline(userId) {
	try {
		if (!ioInstance || typeof ioInstance.in !== "function" || !userId) return false;
		const sockets = await ioInstance.in(userId).allSockets();
		return sockets && sockets.size > 0;
	} catch (err) {
		console.warn("isUserOnline check failed", err);
		return false;
	}
}

export { isUserOnline };