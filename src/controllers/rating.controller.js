import { isValidObjectId } from "mongoose";
import { Rating } from "../models/rating.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";  
import mongoose from "mongoose";    

const getMyHelpProvided = asyncHandler(async (req, res) => {

    const ratings = await Rating.aggregate([
        { 
            $match: 
                { 
                    providerId: new mongoose.Types.ObjectId(req.user._id)
                } 
        },
        {
            $lookup: {
                from: "requests",
                localField: "requestId",
                foreignField: "_id",
                as: "request",
                pipeline: [
                    { $project: { status: 1 } }
                ]
            }
        },
    // expose only requestStatus from the looked up request
    { $addFields: { requestStatus: { $first: "$request.status" } } },
    { $project: { request: 0 } },
    ]);

    return res.code(200).send(
        new ApiResponse(200, ratings, "Ratings fetched successfully")
    );
});

const giveRatings = asyncHandler(async (req, res) => {

    const { providerId, requestId,  score, reviewText } = req.body;

    if(!isValidObjectId(providerId) || !isValidObjectId(requestId)) {
        throw new ApiError(400, "Invalid provider user ID or request ID");
    }

    const requestFound = await Request.findById(requestId);

    if(!requestFound) {
        throw new ApiError(404, "Request not found");
    } 
    if(requestFound.requesterId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to rate this request");
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