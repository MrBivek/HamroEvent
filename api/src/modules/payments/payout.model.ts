import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { PayoutStatus } from "../../common/enums.js";

const PayoutSchema = new Schema(
    {
        vendorId: { type: Schema.Types.ObjectId, required: true, index: true, ref: "Vendor" },
        amount: { type: Number, required: true },
        status: {
            type: String,
            enum: Object.values(PayoutStatus),
            default: PayoutStatus.PROCESSING,
            index: true,
        },
        bankLast4: { type: String },
        requestedAt: { type: Date, default: () => new Date() },
        processedAt: { type: Date },
    },
    { timestamps: true, collection: "payouts" },
);

PayoutSchema.index({ vendorId: 1, createdAt: -1 });

export type PayoutDoc = InferSchemaType<typeof PayoutSchema> & { _id: mongoose.Types.ObjectId };

export const PayoutModel =
    (mongoose.models.Payout as mongoose.Model<PayoutDoc>) ||
    mongoose.model<PayoutDoc>("Payout", PayoutSchema);
