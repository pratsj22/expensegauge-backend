import mongoose from "mongoose";

export const connectDB=async()=>{
    try {
        await mongoose.connect(process.env.MONGO_URL)
        console.log("Connected to the database");
    } catch (error) {
        console.log(error);
    }
}