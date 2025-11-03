import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import jwt from "jsonwebtoken"

export const verifyJWT  = asyncHandler(async (req, res) => {
    try {
        const token =  req.cookies?.Token || req.headers.authorization?.replace("Bearer ", "")
        if(!token) throw new ApiError(401, 'unauthorized Request')

        const decodedToken = jwt.verify(token, process.env.TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id).select("-password")

        if(!user) throw new ApiError(401, "Invalid token")

        req.user = user


    } catch (error) {
        throw new ApiError(401, error?.message ||"invalid access token")
    }
})