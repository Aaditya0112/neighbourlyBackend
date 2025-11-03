
import { EventEnum } from "../constants.js";
import { User } from "../models/user.model.js";
import jwt from 'jsonwebtoken'
import { ApiError } from "../utils/ApiError.js";
import { LocationLog } from "../models/locationLog.model.js";
import { Server } from "socket.io";


async function setupSocket(fastify) {
    fastify.io.on('connection', async (socket) => {


        try {
            const token = socket.handshake.headers?.authorization;


            if (!token) {
                // Token is required for the socket to work
                throw new ApiError(401, "Un-authorized handshake. Token is missing");
            }

            const decodedToken = await jwt.verify(token, process.env.TOKEN_SECRET);

            const user = await User.findById(decodedToken?._id).select("-password")

            if (!user) {
                throw new ApiError(401, "Un-authorized handshake. Token is invalid");
            }
            socket.user = user;


            // socket.join(user._id.toString());
            socket.emit(EventEnum.CONNECTED_EVENT)
            console.log("User connected. userId: ", user._id.toString());

            socket.on('registerAdmin', () => {
                socket.join('admin');
                console.log("Admin joined the admin room.");
            });
            socket.on(EventEnum.LOCATION_UPDATE_EVENT, async ({ latitude, longitude }) => {
                console.log(longitude, latitude)
                const locationUpdated = await LocationLog.create({
                    officer: socket.user._id,
                    location: [latitude, longitude] 
                })
                const createdLocationLog = await LocationLog.findById(locationUpdated._id)
                if (!createdLocationLog) throw new ApiError(500, "unable to update location on server")
                // console.log
                //     ("location updated");

                socket.to('admin').emit('userConnected', socket.user._id);

                socket.to('admin').emit('userLocation', {
                    userId: socket.user._id,
                    name : socket.user.name,
                    latitude : latitude,
                    longitude : longitude
                });
                socket.emit(EventEnum.LOCATION_LOG_EVENT, "Location Logged.")
            })

            socket.on('emergency-alert', (data) => {
                socket.to(data["room"]).emit('alert', data)
            })

            socket.on(EventEnum.DISCONNECT_EVENT, () => {
                socket.to("admin").emit("userDisconnected", socket.user?._id)
                console.log("user has disconnected. userId: " + socket.user?._id);
                if (socket.user?._id) {
                    socket.leave(socket.user._id);
                }
            });


        } catch (error) {
            socket.emit(
                EventEnum.SOCKET_ERROR_EVENT,
                error?.message || "Something went wrong while connecting to the socket."
            );
            console.log("Something went wrong while connecting to the socket. ", error)
        }
    });
}

// async function emitSocketEvent(req, roomId, event, payload) {
//     req.io.in(roomId).emit(event, payload)
// }

export default setupSocket;