
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
//     if (fastify && fastify.io) registerIo(fastify.io);

//     fastify.io.on('connection', async (socket) => {


//         try {
//             const token = socket.handshake.headers?.authorization;


//             if (!token) {
//                 // Token is required for the socket to work
//                 throw new ApiError(401, "Un-authorized handshake. Token is missing");
//             }

//             const decodedToken = await jwt.verify(token, process.env.TOKEN_SECRET);

//             const user = await User.findById(decodedToken?._id).select("-password")

//             if (!user) {
//                 throw new ApiError(401, "Un-authorized handshake. Token is invalid");
//             }
//             socket.user = user;


//             // socket.join(user._id.toString());
//             socket.emit(ChatEventEnum.CONNECTED_EVENT)
//             console.log("User connected. userId: ", user._id.toString());

//             socket.on('registerAdmin', () => {
//                 socket.join('admin');
//                 console.log("Admin joined the admin room.");
//             });
//             socket.on(ChatEventEnum.LOCATION_UPDATE_EVENT, async ({ latitude, longitude }) => {
//                 console.log(longitude, latitude)
//                 const locationUpdated = await LocationLog.create({
//                     officer: socket.user._id,
//                     location: [latitude, longitude] 
//                 })
//                 const createdLocationLog = await LocationLog.findById(locationUpdated._id)
//                 if (!createdLocationLog) throw new ApiError(500, "unable to update location on server")
//                 // console.log
//                 //     ("location updated");

//                 socket.to('admin').emit('userConnected', socket.user._id);

//                 socket.to('admin').emit('userLocation', {
//                     userId: socket.user._id,
//                     name : socket.user.name,
//                     latitude : latitude,
//                     longitude : longitude
//                 });
//                 socket.emit(ChatEventEnum.LOCATION_LOG_EVENT, "Location Logged.")
//             })

//             socket.on('emergency-alert', (data) => {
//                 socket.to(data["room"]).emit('alert', data)
//             })

//             socket.on(ChatEventEnum.DISCONNECT_EVENT, () => {
//                 socket.to("admin").emit("userDisconnected", socket.user?._id)
//                 console.log("user has disconnected. userId: " + socket.user?._id);
//                 if (socket.user?._id) {
//                     socket.leave(socket.user._id);
//                 }
//             });


//         } catch (error) {
//             socket.emit(
//                 ChatEventEnum.SOCKET_ERROR_EVENT,
//                 error?.message || "Something went wrong while connecting to the socket."
//             );
//             console.log("Something went wrong while connecting to the socket. ", error)
//         }
//     });
// }

// async function emitSocketEvent(req, roomId, event, payload) {
//     try {
//         // prefer req.io when available (fastify request with io attached)
//         if (req && req.io && typeof req.io.in === 'function') {
//             return req.io.in(roomId).emit(event, payload);
//         }

//         // fallback to module-level io instance
//         if (ioInstance && typeof ioInstance.in === 'function') {
//             return ioInstance.in(roomId).emit(event, payload);
//         }

//         // as a last resort, if req is actually a fastify instance with .io
//         if (req && req.io === undefined && req.server && req.server.io) {
//             return req.server.io.in(roomId).emit(event, payload);
//         }

//         console.warn('emitSocketEvent: no io instance available to emit', { roomId, event });
//         return null;
//     } catch (err) {
//         console.error('emitSocketEvent error', err);
//         return null;
//     }
// }
// export { setupSocket, emitSocketEvent, registerIo };