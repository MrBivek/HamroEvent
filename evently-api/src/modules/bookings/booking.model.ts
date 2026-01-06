import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { BookingStatus } from "../../common/enums.js";

const BookingSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, required: true, index: true, ref: "User" },
        vendorId: { type: Schema.Types.ObjectId, required: true, index: true, ref: "Vendor" },
        packageId: { type: Schema.Types.ObjectId, ref: "Package" },
        eventId: { type: Schema.Types.ObjectId, required: true, index: true, ref: "Event" },

        status: {
            type: String,
            enum: Object.values(BookingStatus),
            default: BookingStatus.REQUESTED,
            required: true,
            index: true,
        },

        customerNote: { type: String },
        vendorNote: { type: String },
        rejectReason: { type: String },

        requestedAt: { type: Date, default: () => new Date() },
        decisionAt: { type: Date },
    },
    { timestamps: true, collection: "bookings" }
);

// match your migration intent
BookingSchema.index({ userId: 1, status: 1, createdAt: -1 });
BookingSchema.index({ vendorId: 1, status: 1, createdAt: -1 });

export type BookingDoc = InferSchemaType<typeof BookingSchema> & { _id: mongoose.Types.ObjectId };

export const BookingModel =
    (mongoose.models.Booking as mongoose.Model<BookingDoc>) ||
    mongoose.model<BookingDoc>("Booking", BookingSchema);
