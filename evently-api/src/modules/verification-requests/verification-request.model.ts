import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { VerificationStatus } from "../../common/enums.js";

const VerificationRequestSchema = new Schema(
    {
        vendorId: { type: Schema.Types.ObjectId, required: true, index: true, ref: "Vendor" },
        status: {
            type: String,
            enum: Object.values(VerificationStatus),
            default: VerificationStatus.PENDING,
            required: true,
            index: true,
        },
        documentIds: [{ type: Schema.Types.ObjectId, ref: "Document" }],
        vendorNote: { type: String },
        adminNote: { type: String },
        submittedAt: { type: Date, default: () => new Date() },
        decidedAt: { type: Date },
        decidedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true, collection: "verificationRequests" },
);

VerificationRequestSchema.index({ vendorId: 1, status: 1 });

export type VerificationRequestDoc = InferSchemaType<typeof VerificationRequestSchema> & {
    _id: mongoose.Types.ObjectId;
};

export const VerificationRequestModel =
    (mongoose.models.VerificationRequest as mongoose.Model<VerificationRequestDoc>) ||
    mongoose.model<VerificationRequestDoc>("VerificationRequest", VerificationRequestSchema);
