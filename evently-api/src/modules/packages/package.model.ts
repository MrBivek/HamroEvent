import mongoose, { Schema, type InferSchemaType } from "mongoose";

const PackageSchema = new Schema(
  {
    vendorId: { type: Schema.Types.ObjectId, required: true, index: true, ref: "Vendor" },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category" },

    title: { type: String, required: true, trim: true },
    description: { type: String },

    priceMin: { type: Number },
    priceMax: { type: Number },

    includes: [{ type: String }],

    isActive: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, collection: "packages" },
);

PackageSchema.index({ categoryId: 1, isActive: 1 });

export type PackageDoc = InferSchemaType<typeof PackageSchema> & { _id: mongoose.Types.ObjectId };

export const PackageModel =
  (mongoose.models.Package as mongoose.Model<PackageDoc>) ||
  mongoose.model<PackageDoc>("Package", PackageSchema);
