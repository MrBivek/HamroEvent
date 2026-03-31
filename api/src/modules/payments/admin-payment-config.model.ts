import mongoose, { Schema, type InferSchemaType } from "mongoose";

const AdminPaymentConfigSchema = new Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            index: true,
            default: "default",
        },
        khalti: {
            publicKey: { type: String },
            secretKey: { type: String },
            mode: { type: String, enum: ["sandbox", "live"], default: "sandbox" },
        },
        esewa: {
            merchantCode: { type: String },
            secretKey: { type: String },
            mode: { type: String, enum: ["sandbox", "live"], default: "sandbox" },
        },
    },
    { timestamps: true, collection: "adminPaymentConfigs" },
);

export type AdminPaymentConfigDoc = InferSchemaType<typeof AdminPaymentConfigSchema> & {
    _id: mongoose.Types.ObjectId;
};

export const AdminPaymentConfigModel =
    (mongoose.models.AdminPaymentConfig as mongoose.Model<AdminPaymentConfigDoc>) ||
    mongoose.model<AdminPaymentConfigDoc>("AdminPaymentConfig", AdminPaymentConfigSchema);
