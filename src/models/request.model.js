import mongoose, {Schema} from 'mongoose'

const requestSchema = new mongoose.Schema({
    requester: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    taskDescription: {
        type: String,
        required: true
    },
    maxOffer: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ["OPEN", "IN_PROGRESS", "COMPLETED"],
        default: "OPEN"
    },
    location: {
        type: [Number],
        required: true,
    },
    provider: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    availableProviders: {
        type: [Schema.Types.ObjectId],
        ref: "User",
        default: []
    },
    chattingEnabled: {
        type: Boolean,
        default: false,
    },
    chatId :{
        type: Schema.Types.ObjectId,
        ref: "Chat",
        default: null,
    },
    tags : {
        type : [String],
        default : []
    },
    images :{
        type : [String],
        default : []
    }
    
}, { timestamps: true });

export const Request = mongoose.model('Request', requestSchema);