import mongoose, { Schema, type InferSchemaType } from "mongoose";

const RefundSchema = new Schema(
    {
        paymentId: { type: Schema.Types.ObjectId, required: true, index: true, ref: "Payment" },
        bookingId: { type: Schema.Types.ObjectId, required: true, index: true, ref: "Booking" },
        amount: { type: Number, required: true },
        reason: { type: String },
        createdBy: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    },
    { timestamps: true, collection: "refunds" },
);

// paymentId and bookingId already have index: true on the fields

export type RefundDoc = InferSchemaType<typeof RefundSchema> & { _id: mongoose.Types.ObjectId };

export const RefundModel =
    (mongoose.models.Refund as mongoose.Model<RefundDoc>) ||
    mongoose.model<RefundDoc>("Refund", RefundSchema);
