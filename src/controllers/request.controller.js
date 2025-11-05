import mongoose, { isValidObjectId } from "mongoose";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
// import axios from "axios";
// import { getFCMAccessToken } from "../utils/fcmAuth.js";
import { Request } from "../models/request.model.js";

const createRequest = asyncHandler(async (req, res) => {

    const { requester, taskDescription, maxOffer, location, tags = [], images = [] } = req.body;

    if (
        !requester || !taskDescription || !maxOffer || !Array.isArray(location) || location.length === 0
    ) {
        throw new ApiError(400, "All fields are required")
    }

    if(!isValidObjectId(requester)){
        throw new ApiError(400, "Invalid requester ID");
    }

    // Convert local time strings to Date objects and then to UTC
    // const localStart = new Date(startsAt);
    // const localEnd = new Date(endsAt);
    // const utcStart = new Date(localStart.toISOString());
    // const utcEnd = new Date(localEnd.toISOString());

    const request = await Request.create({
        requester,
        taskDescription,
        maxOffer,
        location,
        tags,
        images
    });

    if (!request) throw new ApiError(500, "Unable to create request");

    // Get officers with FCM tokens
    // const officers = await User.find({ 
    //     _id: { $in: officerIds },
    //     fcmToken: { $exists: true, $ne: null }

    // Prepare notification promises
    // const notificationPromises = officers.map(async (officer) => {
    //     try {
    //         // Format dates for display
    //         const startTime = localStart.toLocaleString("en-US", { timeZone: "IST" }    );
    //         const endTime = localEnd.toLocaleString("en-US", { timeZone: "IST" });

    //         // Get FCM access token (implementation shown below)
    //         const accessToken = await getFCMAccessToken();     
    //         console.log(officer.fcmToken)
    //         const response = await axios.post(
    //             `https://fcm.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID}/messages:send`,
    //             {
    //                 message: {
    //                     token: officer.fcmToken,
    //                     notification: {
    //                         title: 'New Patrol Assignment',
    //                         body: `You have a patrol from ${startTime} to ${endTime} at ${location.join(', ')}`
    //                     },
    //                     data: {
    //                         type: 'assignment',
    //                         assignmentId: assignment._id.toString(),
    //                         startsAt: utcStart.toISOString(),
    //                         latitude : `${assignment.checkpoints[0][0]}`,
    //                         longitude : `${assignment.checkpoints[0][1]}`,
    //                         endsAt: utcEnd.toISOString(),
    //                         action: 'FLUTTER_NOTIFICATION_CLICK'
    //                     },
    //                     android: {
    //                         priority: 'high',
    //                         // content_available: true
    //                     },
    //                     apns: {
    //                         headers: {
    //                             'apns-priority': '10'
    //                         }
    //                     }
    //                 }
    //             },
    //             {
    //                 headers: {
    //                     'Content-Type': 'application/json',
    //                     'Authorization': `Bearer ${accessToken}`
    //                 },
    //                 timeout: 5000 // 5 second timeout
    //             }
    //         );
            
    //         return {
    //             success: true,
    //             officerId: officer._id,
    //             messageId: response.data.name
    //         };
    //     } catch (error) {
    //         console.error(`Failed to notify officer ${officer._id}:`, error);
    //         return {
    //             success: false,
    //             officerId: officer._id,
    //             error: error.message
    //         };
    //     }
    // });

    // Execute all notifications in parallel
    // const notificationResults = await Promise.all(notificationPromises);
    
    // Count successful notifications
    // const successfulNotifications = notificationResults.filter(r => r.success).length;
    
    // Optionally log failed notifications
    // const failedNotifications = notificationResults.filter(r => !r.success);
    // if (failedNotifications.length > 0) {
    //     console.warn('Failed to notify some officers:', failedNotifications);
    // }

    return res.status(200).send(
        new ApiResponse(200, 
            request,
            // notifications: {
            //     total: officers.length,
            //     successful: successfulNotifications,
            //     failed: failedNotifications.length
            // }
        "Request created successfully")
    )
});


const getAllRequests = asyncHandler(async (req, res) => {
    // TODO Handle anonymity from backend

    const { status } = req.query;

    // Acceptable status values (match schema enum)
    const allowedStatuses = ["OPEN", "IN_PROGRESS", "COMPLETED"];

    const pipeline = [];

    if (status) {
        const statusUpper = String(status).toUpperCase();
        if (!allowedStatuses.includes(statusUpper)) {
            throw new ApiError(400, "Invalid status query param");
        }
        pipeline.push({ $match: { status: statusUpper } });
    }

    pipeline.push({
        $lookup: {
            from: "users",
            localField: "requester",
            foreignField: "_id",
            as: "requester",
            pipeline: [
                {
                    $project: {
                        name: 1,
                        gender: 1,
                        phoneNumber: 1,
                        profilePic: 1,
                        havePremium: 1,
                        homeCoordinates: 1
                    }
                }
            ]
        }
    });
    pipeline.push({
        $addFields: {
            requester: { $first: "$requester" }
        }
    });

    pipeline.push({
        $lookup: {
            from: "users",
            localField: "provider",
            foreignField: "_id",
            as: "provider",
            pipeline: [
                {
                    $project: {
                        _id: 1,
                        name: 1,
                    }
                }   
            ]
        }
    });
    pipeline.push({
        $addFields: {
            provider: { $first: "$provider" }
        }
    });

    const allRequests = await Request.aggregate(pipeline);

    //TODO errors aa sakte hai isActive ke regarding as it is virtual field
    // thodi problems ho sakti hai active and inactive ko leke

    return res.code(200).send(new ApiResponse(200, allRequests, "All requests fetched"));

})

const getMyRequests = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    // Use aggregation to populate availableProviders with user refs (name, gender, profilePic)
    const myRequests = await Request.aggregate([
        {
            $match: {
                requester: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "availableProviders",
                foreignField: "_id",
                as: "availableProviders",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            name: 1,
                            gender: 1,
                            profilePic: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "provider",
                foreignField: "_id",
                as: "provider",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            name: 1,
                            gender: 1,
                            profilePic: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                provider: { $first: "$provider" }
            }
        }
    ]);

    return res.code(200).send(new ApiResponse(200, myRequests, "My requests fetched successfully"));
});

// const updateAssignment = asyncHandler(async (req, res) => {
//     const { assignmentId } = req.params;
//     if (!isValidObjectId(assignmentId)) throw new ApiError(400, "invalid assignment id")

//     if (req.user.role !== "ADMIN") throw new ApiError(400, "Unauthorized Access")

//     // what i thought : there will be an update button, on clicking that button 
//     // navigate to a new page with a form with the same officerId and also one button to change officer
//     // on clicking that button, will open a list of officers and further same process as creating assignment
//     // same for crime Area selection

//     const { endsAt, location } = req.body

//     if (!endsAt && !location) throw new ApiError(400, "All fields are required")

//     const updatedAssignment = await Assignment.findByIdAndUpdate(
//         assignmentId,
//         {
//             $set: {
//                 endsAt,
//                 location
//             }
//         },
//         {
//             new: true
//         }
//     )


//     //also we can track the history of particular assignment

//     return res.code(200)
//         .send(
//             new ApiResponse(200, updatedAssignment, "Assignment updated successfully")
//         )
// })

const getRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    if (!isValidObjectId(requestId)) throw new ApiError(400, "invalid request id");

    const requestFound = await Request.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(requestId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "requester",
                foreignField: "_id",
                as: "requester",
                pipeline: [
                    {
                        $project: {
                            name: 1,
                            profilePic: 1,
                            phoneNumber: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                requester: { $first: "$requester" }
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "availableProviders",
                foreignField: "_id",
                as: "availableProviders",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            name: 1,
                            gender: 1,
                            profilePic: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "provider",
                foreignField: "_id",
                as: "provider",
                pipeline: [
                    {
                        $project: {
                            name: 1,
                            profilePic: 1,
                            phoneNumber: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                provider: { $first: "$provider" }
            }
        }
    ]);

    if (!requestFound || requestFound.length === 0) throw new ApiError(404, "Request not found");

    return res.code(200).send(new ApiResponse(200, requestFound[0], "Request fetched successfully"));
});

const deleteRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    if (!isValidObjectId(requestId)) throw new ApiError(400, "invalid request id")

    const requestFound = await Request.findById(requestId);
    if (!requestFound) throw new ApiError(404, "Request not found");

    // Ensure current user is the requester for this request
    if (!requestFound.requester || requestFound.requester.toString() !== req.user._id.toString()) {
        throw new ApiError(400, "Unauthorized Attempt to Delete Request");
    }

    // Only allow deletion if the request is still OPEN
    if (requestFound.status !== "OPEN") {
        throw new ApiError(400, "Only requests with status OPEN can be deleted");
    }

    await Request.findByIdAndDelete(requestId);

    return res.code(204).send(new ApiResponse(204, {}, "Request deleted successfully"));
})


const acceptRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.params;

    if (!isValidObjectId(requestId)) throw new ApiError(400, "invalid request id")

    const requestFound = await Request.findById(requestId);
    if (!requestFound) throw new ApiError(404, "Request not found")

    // Prevent requester from accepting their own request
    if (requestFound.requester && requestFound.requester.toString() === req.user._id.toString()) {
        throw new ApiError(400, "Requester cannot accept their own request")
    }

    // Add the current user to availableProviders if not already present
    const updatedRequest = await Request.findByIdAndUpdate(
        requestId,
        { $addToSet: { availableProviders: req.user._id } },
        { new: true }
    );

    return res.code(200).send(new ApiResponse(200, updatedRequest, "Request accepted"));
});


const approveProvider = asyncHandler(async (req, res) => {
    const { requestId, providerId } = req.body;

    if (!requestId || !providerId) throw new ApiError(400, "requestId and providerId are required");

    if (!isValidObjectId(requestId)) throw new ApiError(400, "invalid request id");
    if (!isValidObjectId(providerId)) throw new ApiError(400, "invalid provider id");

    const requestFound = await Request.findById(requestId);
    if (!requestFound) throw new ApiError(404, "Request not found");

    // Ensure current user is the requester for this request
    if (!requestFound.requester || requestFound.requester.toString() !== req.user._id.toString()) {
        throw new ApiError(400, "Unauthorized Attempt to Approve Provider");
    }

    // Ensure the provider is in the availableProviders list for this request
    const providerIsAvailable = Array.isArray(requestFound.availableProviders) &&
        requestFound.availableProviders.some(p => p.toString() === providerId.toString());

    if (!providerIsAvailable) {
        throw new ApiError(400, "Provider is not available for this request");
    }

    // Optional: ensure provider exists
    // const providerUser = await User.findById(providerId);
    // if (!providerUser) throw new ApiError(404, "Provider user not found");

    // Update provider, enable chatting and set status to IN_PROGRESS
    const updatedRequest = await Request.findByIdAndUpdate(
        requestId,
        {
            $set: {
                provider: providerId,
                chattingEnabled: true,
                status: "IN_PROGRESS"
            }
        },
        { new: true }
    );

    return res.code(200).send(new ApiResponse(200, updatedRequest, "Provider approved"));
});

const helpsProvided = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // Find all requests where the provider field equals the current user
    const providedRequests = await Request.find({ provider: userId });

    return res.code(200).send(new ApiResponse(200, providedRequests, `${providedRequests.length} helps provided`));
});




export {
    createRequest,
    getAllRequests,
    getMyRequests,
    deleteRequest,
    acceptRequest,
    approveProvider,
    getRequest,
    helpsProvided
}