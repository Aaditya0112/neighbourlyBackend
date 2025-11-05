import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getUser = asyncHandler(async (req, res) => {
    return res.code(200).send(
        new ApiResponse(200, req.user, "User fetched Successfully")
    )
})

const getUserById = asyncHandler(async (req, res) => {
    const { userId } = req.params

    const user = await User.findById(userId).select("-password")

    if (!user) throw new ApiError(404, "User not found")

    return res.code(200).send(
        new ApiResponse(200, user, "User fetched Successfully")
    )
});

export {
    getUser,
    getUserById
}