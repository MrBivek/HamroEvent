import { VerificationStatus } from "../../common/enums.js";
import mongoose, { Schema, type InferSchemaType } from "mongoose";

const VendorSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, unique: true, index: true, ref: "User" },
    businessName: { type: String, required: true, trim: true },
    description: { type: String },
    locationText: { type: String },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category" },
    primaryLocationId: { type: Schema.Types.ObjectId, ref: "Location" },
    locations: [{ type: Schema.Types.ObjectId, ref: "Location" }],
    serviceAreas: [{ type: String }],
    contactPhone: { type: String },
    contactEmail: { type: String },
    social: {
      website: { type: String },
      instagram: { type: String },
      facebook: { type: String },
    },
    portfolioMedia: [{ type: String }],
    pricingMin: { type: Number },
    pricingMax: { type: Number },
    verifiedStatus: {
      type: String,
      enum: Object.values(VerificationStatus),
      default: VerificationStatus.PENDING,
      index: true,
      required: true,
    },
    verificationNote: { type: String },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "vendors" },
);

VendorSchema.index({ locations: 1 });

export type VendorDoc = InferSchemaType<typeof VendorSchema> & { _id: mongoose.Types.ObjectId };

export const VendorModel =
  (mongoose.models.Vendor as mongoose.Model<VendorDoc>) ||
  mongoose.model<VendorDoc>("Vendor", VendorSchema);
