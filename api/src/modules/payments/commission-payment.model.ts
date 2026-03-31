import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { PaymentStatus } from "../../common/enums.js";

const CommissionPaymentSchema = new Schema(
    {
        vendorId: { type: Schema.Types.ObjectId, required: true, index: true, ref: "Vendor" },
        monthKey: { type: String, required: true, index: true },
        year: { type: Number, required: true, index: true },
        month: { type: Number, required: true, index: true },
        grossEarnings: { type: Number, required: true, default: 0 },
        refundsAmount: { type: Number, required: true, default: 0 },
        netEarnings: { type: Number, required: true, default: 0 },
        commissionRate: { type: Number, required: true, default: 0.1 },
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
        createdBy: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    },
    { timestamps: true, collection: "commissionPayments" },
);

CommissionPaymentSchema.index({ providerRef: 1 }, { unique: true, sparse: true });
CommissionPaymentSchema.index({ vendorId: 1, monthKey: 1, status: 1 });

export type CommissionPaymentDoc = InferSchemaType<typeof CommissionPaymentSchema> & {
    _id: mongoose.Types.ObjectId;
};

export const CommissionPaymentModel =
    (mongoose.models.CommissionPayment as mongoose.Model<CommissionPaymentDoc>) ||
    mongoose.model<CommissionPaymentDoc>("CommissionPayment", CommissionPaymentSchema);
