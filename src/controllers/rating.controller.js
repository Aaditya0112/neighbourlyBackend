import Rating from "../models/rating.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getMyHelpProvided = asyncHandler(async (req, res) => {
    
    const ratings = await Rating.find({ ratedId: req.user._id });

    return res.code(200).send(
        new ApiResponse(200, ratings, "Ratings fetched successfully")
    );
});



export {
    getMyHelpProvided,
}