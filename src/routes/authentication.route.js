
import { registerUser, loginUser, getUser, } from "../controllers/authentication.controller.js";
// import { otpBasedPasswordChange } from "../controllers/users.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

async function authRoutes(fastify, options) {
    fastify.post("/register", registerUser);
    fastify.post("/login", loginUser);
    // fastify.post("/fcmtoken", { preHandler: verifyJWT }, setFCMToken)
    // fastify.post("/check/:txt", asyncHandler(
    //     async (req, res) => {
    //         const { txt } = req.params;
    //         console.log( txt )

    //         console.log(req.body)
    //     }
    // ))
    // fastify.post("/logout",{ preHandler: verifyJWT }, logoutUser);
    fastify.get("/me", { preHandler: verifyJWT }, getUser);
    // fastify.post("/send-otp", sendOTP);
    // fastify.post("/verify-otp", verifyOTP);
    // fastify.post("/change-password-with-otp", otpBasedPasswordChange)
}


export default authRoutes;



