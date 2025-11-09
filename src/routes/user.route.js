import { createRequest, getAllRequests, getMyRequests, acceptRequest, approveProvider, deleteRequest, helpsProvided, getRequest} from "../controllers/request.controller.js";
import { getUserById, getAllUsers} from "../controllers/user.controller.js";
// import { otpBasedPasswordChange } from "../controllers/users.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

async function  userRoutes(fastify, options) {
    
    fastify.get("/users/:userId", {preHandler : verifyJWT}, getUserById)
    fastify.get("/users", {preHandler : verifyJWT}, getAllUsers)

}

export default userRoutes;