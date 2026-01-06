import { env } from "./env.js";
import mongoose from "mongoose";

export async function connectDb() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.MONGO_URI);
  console.log("MongoDB Connected.");
}
