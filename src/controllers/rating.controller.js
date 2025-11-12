import { isValidObjectId } from "mongoose";
import { Rating } from "../models/rating.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";  
import mongoose from "mongoose";    

const getMyHelpProvided = asyncHandler(async (req, res) => {

    const ratings = await Rating.aggregate([
        { $match: { providerId: new mongoose.Types.ObjectId(req.user._id) } }
    ]);
    console.log(req.user._id);

    return res.code(200).send(
        new ApiResponse(200, ratings, "Ratings fetched successfully")
    );
});

const giveRatings = asyncHandler(async (req, res) => {

    const { providerId, requestId,  score, reviewText } = req.body;

    if(!isValidObjectId(providerId)) {
        throw new ApiError(400, "Invalid provider user ID");
    }

    if(score < 1 || score > 5) {
        throw new ApiError(400, "Score must be between 1 and 5");
    }

    const provider = await User.findById(providerId);

    if(!provider) {
        throw new ApiError(404, "Provider user not found");
    }

    const newRating = await Rating.create({
        requestId,
        requesterId: req.user._id,
        providerId,
        score,
        reviewText
    })
    if(!newRating) {
        throw new ApiError(500, "Failed to submit rating");
    }


    return res.code(201).send(
        new ApiResponse(201, newRating, "Rating submitted successfully")
    );
});



export {
    getMyHelpProvided,
    giveRatings
}