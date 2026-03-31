import mongoose, { Schema, type InferSchemaType } from "mongoose";

const EmailOtpSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
        email: { type: String, required: true, lowercase: true, trim: true },
        purpose: {
            type: String,
            enum: ["VERIFY_ACCOUNT", "RESET_PASSWORD"],
            default: "VERIFY_ACCOUNT",
            required: true,
        },
        codeHash: { type: String, required: true },
        expiresAt: { type: Date, required: true },
        attempts: { type: Number, default: 0 },
        lastSentAt: { type: Date },
        resetTokenHash: { type: String },
        resetTokenExpiresAt: { type: Date },
        verifiedAt: { type: Date },
    },
    { timestamps: true, collection: "emailOtps" },
);

export type EmailOtpDoc = InferSchemaType<typeof EmailOtpSchema> & {
    _id: mongoose.Types.ObjectId;
};

export const EmailOtpModel =
    (mongoose.models.EmailOtp as mongoose.Model<EmailOtpDoc>) ||
    mongoose.model<EmailOtpDoc>("EmailOtp", EmailOtpSchema);
