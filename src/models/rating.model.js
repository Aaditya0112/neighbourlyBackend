import mongoose, {Schema} from 'mongoose'

const ratingSchema = new mongoose.Schema({
    requestId: {
        type: Schema.Types.ObjectId,
        ref: "Request",
        required: true,
    },
    raterId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    rateeId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    score: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        default: ""
    }   
}, { timestamps: true });

export const Rating = mongoose.model('Rating', ratingSchema);