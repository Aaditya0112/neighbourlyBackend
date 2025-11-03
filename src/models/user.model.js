import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"

const userSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    gender: {
        type: String,
        enum: ["MALE", "FEMALE", "OTHER"],
        required: true
    },
    address: {
        type: String,
        required: true,
    },
    phoneNumber: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        min:8,
        max:8
    },    
    havePremium: {
        type: Boolean,
        default: false
    },
    profilePic : {
        type : String,
        default : ""
    },

    homeCoordinates: {
        // [lat, long]
        type : [Number]
    },

    // fcmToken : {
    //     type : String
    // }
},
{
    timestamps : true
}
)

userSchema.pre('save', async function (next) {

    if (!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10)
    next()
})

userSchema.methods.isCorrectPassword = async function (password) {
    return await bcrypt.compare(password, this.password)
}
export const User = mongoose.model("User", userSchema);