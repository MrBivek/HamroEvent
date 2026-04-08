import mongoose from "mongoose";
import { PaymentStatus } from "../../common/enums.js";
import { BookingModel } from "../bookings/booking.model.js";
import { PaymentModel } from "./payment.model.js";
import { RefundModel } from "./refund.model.js";
import { CommissionPaymentModel } from "./commission-payment.model.js";

export const COMMISSION_RATE = 0.1;

export function parseMonthKey(raw?: string) {
    if (raw && /^\d{4}-\d{2}$/.test(raw)) {
        const [year, month] = raw.split("-").map(Number);
        return { monthKey: raw, year, month };
    }

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    return {
        monthKey: `${year}-${String(month).padStart(2, "0")}`,
        year,
        month,
    };
}

export function getMonthRange(year: number, month: number) {
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    return { start, end };
}

export async function buildVendorCommissionSummary(
    vendorId: mongoose.Types.ObjectId,
    month?: string,
) {
    const { monthKey, year, month: monthNumber } = parseMonthKey(month);
    const { start, end } = getMonthRange(year, monthNumber);

    const bookings = await BookingModel.find({ vendorId }).select({ _id: 1 }).lean();
    const bookingIds = bookings.map((booking) => booking._id);

    if (!bookingIds.length) {
        return {
            monthKey,
            year,
            month: monthNumber,
            commissionRate: COMMISSION_RATE,
            grossEarnings: 0,
            refundsAmount: 0,
            netEarnings: 0,
            commissionDue: 0,
            commissionPaid: 0,
            commissionReserved: 0,
            commissionOutstanding: 0,
        };
    }

    const [grossAgg, refundAgg, paidAgg, reservedAgg] = await Promise.all([
        PaymentModel.aggregate([
            {
                $match: {
                    bookingId: { $in: bookingIds },
                    status: PaymentStatus.PAID,
                    paidAt: { $gte: start, $lt: end },
                },
            },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        RefundModel.aggregate([
            {
                $match: {
                    bookingId: { $in: bookingIds },
                    status: PaymentStatus.PAID,
                    confirmedAt: { $gte: start, $lt: end },
                },
            },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        CommissionPaymentModel.aggregate([
            {
                $match: {
                    vendorId,
                    monthKey,
                    status: PaymentStatus.PAID,
                },
            },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        CommissionPaymentModel.aggregate([
            {
                $match: {
                    vendorId,
                    monthKey,
                    status: {
                        $in: [PaymentStatus.INITIATED, PaymentStatus.PENDING, PaymentStatus.PAID],
                    },
                },
            },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
    ]);

    const grossEarnings = Number(grossAgg?.[0]?.total ?? 0);
    const refundsAmount = Number(refundAgg?.[0]?.total ?? 0);
    const netEarnings = Math.max(grossEarnings - refundsAmount, 0);
    const commissionDue = Number((netEarnings * COMMISSION_RATE).toFixed(2));
    const commissionPaid = Number(paidAgg?.[0]?.total ?? 0);
    const commissionReserved = Number(reservedAgg?.[0]?.total ?? 0);
    const commissionOutstanding = Math.max(commissionDue - commissionPaid, 0);

    return {
        monthKey,
        year,
        month: monthNumber,
        commissionRate: COMMISSION_RATE,
        grossEarnings,
        refundsAmount,
        netEarnings,
        commissionDue,
        commissionPaid,
        commissionReserved,
        commissionOutstanding,
    };
}
