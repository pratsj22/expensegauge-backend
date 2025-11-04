import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
    },
    role: {
        type: String,
        required: true
    },
    netBalance: {
        type: Number,
        default: 0
    },
    refreshTokens: [{ token: String }]
}, { timestamps: true })

export default mongoose.model("users", userSchema)