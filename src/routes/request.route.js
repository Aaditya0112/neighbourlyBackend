import { createRequest, getAllRequests, getMyRequests, acceptRequest, approveProvider, deleteRequest, helpsProvided, getRequest} from "../controllers/request.controller.js";
// import { otpBasedPasswordChange } from "../controllers/users.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

async function  requestRoutes(fastify, options) {
    
    fastify.post("/requests", {preHandler : verifyJWT}, createRequest)
    fastify.get("/requests", {preHandler : verifyJWT}, getAllRequests)
    fastify.get("/my-requests", {preHandler : verifyJWT}, getMyRequests)
    fastify.get("/requests/:requestId", {preHandler : verifyJWT}, getRequest)
    fastify.get("/requests/:requestId/accept", {preHandler : verifyJWT}, acceptRequest)
    fastify.post("/requests/approve", {preHandler : verifyJWT}, approveProvider)
    fastify.delete("/requests/:requestId", {preHandler : verifyJWT}, deleteRequest)
    fastify.get("/helps-provided", {preHandler : verifyJWT}, helpsProvided)
}

export default requestRoutes;