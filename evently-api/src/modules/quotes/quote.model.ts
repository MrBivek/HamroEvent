import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { QuoteStatus } from "../../common/enums.js";

const QuoteSchema = new Schema(
  {
    bookingId: { type: Schema.Types.ObjectId, required: true, index: true, ref: "Booking" },
    vendorId: { type: Schema.Types.ObjectId, required: true, index: true, ref: "Vendor" },
    customerId: { type: Schema.Types.ObjectId, required: true, index: true, ref: "User" },
    status: { type: String, enum: Object.values(QuoteStatus), default: QuoteStatus.PENDING, index: true },
    amount: { type: Number, required: true },
    message: { type: String },
    expiresAt: { type: Date },
  },
  { timestamps: true, collection: "quotes" },
);

QuoteSchema.index({ bookingId: 1 }, { unique: true });
QuoteSchema.index({ vendorId: 1, status: 1, createdAt: -1 });

export type QuoteDoc = InferSchemaType<typeof QuoteSchema> & { _id: mongoose.Types.ObjectId };

export const QuoteModel =
  (mongoose.models.Quote as mongoose.Model<QuoteDoc>) || mongoose.model<QuoteDoc>("Quote", QuoteSchema);
