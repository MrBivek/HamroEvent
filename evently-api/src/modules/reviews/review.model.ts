import mongoose, { Schema, type InferSchemaType } from "mongoose";

const ReviewSchema = new Schema(
  {
    bookingId: { type: Schema.Types.ObjectId, required: true, unique: true, index: true, ref: "Booking" },
    vendorId: { type: Schema.Types.ObjectId, required: true, index: true, ref: "Vendor" },
    customerId: { type: Schema.Types.ObjectId, required: true, index: true, ref: "User" },
    rating: { type: Number, required: true },
    comment: { type: String },
    isHidden: { type: Boolean, default: false },
    moderationReason: { type: String },
  },
  { timestamps: true, collection: "reviews" },
);

ReviewSchema.index({ vendorId: 1, createdAt: -1 });

export type ReviewDoc = InferSchemaType<typeof ReviewSchema> & { _id: mongoose.Types.ObjectId };

export const ReviewModel =
  (mongoose.models.Review as mongoose.Model<ReviewDoc>) || mongoose.model<ReviewDoc>("Review", ReviewSchema);
