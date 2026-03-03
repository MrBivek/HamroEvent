import mongoose, { Schema, type InferSchemaType } from "mongoose";

const VendorPaymentConfigSchema = new Schema(
    {
        vendorId: { type: Schema.Types.ObjectId, required: true, unique: true, index: true, ref: "Vendor" },
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
    { timestamps: true, collection: "vendorPaymentConfigs" },
);

export type VendorPaymentConfigDoc = InferSchemaType<typeof VendorPaymentConfigSchema> & {
    _id: mongoose.Types.ObjectId;
};

export const VendorPaymentConfigModel =
    (mongoose.models.VendorPaymentConfig as mongoose.Model<VendorPaymentConfigDoc>) ||
    mongoose.model<VendorPaymentConfigDoc>("VendorPaymentConfig", VendorPaymentConfigSchema);
