import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { PaymentStatus } from "../../common/enums.js";

const PaymentSchema = new Schema(
    {
        bookingId: { type: Schema.Types.ObjectId, required: true, index: true, ref: "Booking" },
        userId: { type: Schema.Types.ObjectId, required: true, index: true, ref: "User" },
        amount: { type: Number, required: true },
        provider: { type: String, required: true },
        status: {
            type: String,
            enum: Object.values(PaymentStatus),
            default: PaymentStatus.INITIATED,
            index: true,
        },
        providerRef: { type: String },
        payUrl: { type: String },
        providerMeta: { type: Schema.Types.Mixed },
        paidAt: { type: Date },
    },
    { timestamps: true, collection: "payments" },
);

PaymentSchema.index({ providerRef: 1 }, { unique: true, sparse: true });

export type PaymentDoc = InferSchemaType<typeof PaymentSchema> & { _id: mongoose.Types.ObjectId };

export const PaymentModel =
    (mongoose.models.Payment as mongoose.Model<PaymentDoc>) ||
    mongoose.model<PaymentDoc>("Payment", PaymentSchema);
