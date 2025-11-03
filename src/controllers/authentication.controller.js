import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { ApiResponse } from "../utils/ApiResponse.js";
// import { createVerification, createVerificationCheck } from "../Twilio/index.js";
// import { isValidObjectId } from "mongoose";

const generateToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const token = jwt.sign(
            {
                _id: user._id,
                name: user.name,
            },
            process.env.TOKEN_SECRET,
            {
                expiresIn: process.env.TOKEN_EXPIRY
            }
        )

        return token

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating the tokens")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { name, gender, address, phoneNumber, password} = req.body;

    if (
        [name, gender, address, phoneNumber, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "all fields are required")
    }

    const existingUser = await User.findOne({
        phoneNumber
    })

    if (existingUser) throw new ApiError(400, "User already exists")

    const user = await User.create({
        name,
        gender,
        address,
        phoneNumber,
        password
    })

    const createdUser = await User.findById(user._id).select("-password ")

    if (!createdUser) throw new ApiError(500, "Error while registering the User")

    return res.code(201)
        .send(
            new ApiResponse(200, createdUser, "User registered Successfully")
        )
})

const loginUser = asyncHandler(async (req, res) => {
    const { phoneNumber, password } = req.body;

    if (
        [phoneNumber, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findOne({
        phoneNumber
    })

    if (!user) throw new ApiError(404, "User not found")

    const isValidPassword = await user.isCorrectPassword(password);

    if (!isValidPassword) throw new ApiError(401, "Password is incorrect")

    const token = await generateToken(user._id);

    const loggedInUser = await User.findByIdAndUpdate(
        user._id,
        // {
        //     $set: {
        //         lastLogin: Date.now(),
        //         fcmToken: token
        //     }
        // },
        {
            new: true
        }
    ).select("-password")



    const cookieOptions = {
        httpOnly: true,
        secure: true,
        path: "/"
    }


    return res.code(200)
        .cookie("Token", token, cookieOptions)
        .send(
            new ApiResponse(200, { user: loggedInUser, Token: token }, "Logged in Successfully")
        )
})

const loginWithOTP = asyncHandler(async (req, res) => {
    // const { phoneNumber, otp } = req.body;

    // if (
    //     [phoneNumber, password].some((field) => field?.trim() === "")
    // ) {
    //     throw new ApiError(400, "All fields are required")
    // }

    // const user = await User.findOne({
    //     phoneNumber
    // })

    // if (!user) throw new ApiError(404, "User not found")

    // const isValidPassword = await user.isCorrectPassword(password);

    // if (!isValidPassword) throw new ApiError(401, "Password is incorrect")

    // const token = await generateToken(user._id);

    // const loggedInUser = await User.findByIdAndUpdate(
    //     user._id,
    //     {
    //         $set: {
    //             lastLogin: Date.now(),
    //             fcmToken: token
    //         }
    //     },
    //     {
    //         new: true
    //     }
    // ).select("-password")



    // const cookieOptions = {
    //     httpOnly: true,
    //     secure: true,
    //     path: "/"
    // }


    // return res.code(200)
    //     .cookie("Token", token, cookieOptions)
    //     .send(
    //         new ApiResponse(200, { user: loggedInUser, Token: token }, "Logged in Successfully")
    //     )
})

// not needed
const logoutUser = asyncHandler(async (req, res) => {
    const cookieOptions = {
        httpOnly: true,
        secure: true,
        path: "/"
    }

    return res
        .removeHeader('Authorization')
        .clearCookie("Token", cookieOptions)
        .code(200)
        .send(
            new ApiResponse(200, {}, "Logged out successfully")
        )

})

const getUser = asyncHandler(async (req, res) => {
    return res.code(200).send(
        new ApiResponse(200, req.user, "User fetched Successfully")
    )
})


const setFCMToken = asyncHandler(async (req, res) => {
    const { token } = req.body
    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fcmToken: token
            }
        },
        {
            new: true
        }
    )

    return res.code(201).send(
        new ApiResponse(200, updatedUser, "FCM Token updated Successfully")
    )
})

const sendOTP = asyncHandler(async (req, res) => {

    const { countryCode = "+91", badgeNumber } = req.body

    const userFound = await User.find({ badgeNumber: badgeNumber }).select("-password");

    if (!userFound) {
        throw new ApiError(404, "User not Found")
    }

    const phoneNumber = userFound[0]?.phoneNumber
    const verification = await createVerification(countryCode, phoneNumber)

    if (!verification.sid || verification.sid == null) {
        throw new ApiError(500, "unable to send otp")
    }

    return res.code(200).send(
        new ApiResponse(200, { badgeNumber: badgeNumber, phoneNumber: phoneNumber }, `otp sent succesfully`)
    )

})

const verifyOTP = asyncHandler(async (req, res) => {

    const { otp, badgeNumber } = req.body

    const userFound = await User.find({ badgeNumber: badgeNumber }).select("-password");

    if (!userFound) {
        throw new ApiError(404, "User not Found")
    }

    const phoneNumber = userFound[0]?.phoneNumber
    const verified = await createVerificationCheck("+91", otp, phoneNumber)

    if (verified == "approved") {
        return res.code(200).send(
            new ApiResponse(200, {user : userFound, otpStatus : verified}, `otp verified`)
        )

    }

    throw new ApiError(400, "wrong otp")
})




export {
    registerUser,
    loginUser,
    logoutUser,
    loginWithOTP,
    getUser,
    setFCMToken,
    sendOTP,
    verifyOTP,
}