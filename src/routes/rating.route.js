import { getMyHelpProvided, giveRatings } from "../controllers/rating.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

async function ratingRoutes(fastify, options) { 
    fastify.get("/help-provided",{preHandler: verifyJWT}, getMyHelpProvided);
    fastify.post("/rate",{preHandler: verifyJWT}, giveRatings);
}

export default ratingRoutes;
