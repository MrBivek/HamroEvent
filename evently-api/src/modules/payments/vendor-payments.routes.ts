import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { UserRole, PaymentStatus, PayoutStatus } from "../../common/enums.js";
import { NotFoundError } from "../../common/errors.js";
import { VendorModel } from "../vendors/vendor.model.js";
import { BookingModel } from "../bookings/booking.model.js";
import { PaymentModel } from "./payment.model.js";
import { RefundModel } from "./refund.model.js";
import { PayoutModel } from "./payout.model.js";
import { EventModel } from "../events/event.model.js";
import { UserModel } from "../auth/user.model.js";
import { CreatePayoutSchema } from "./payments.schemas.js";
import { formatEventType } from "../../common/mappers.js";

export const vendorPaymentsRoutes = Router();

function getMonthKey(date: Date) {
    return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`;
}

/**
 * @openapi
 * /api/vendors/me/payments/summary:
 *   get:
 *     tags: [Vendor Payments]
 *     summary: Get vendor payment summary
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
vendorPaymentsRoutes.get(
    "/me/payments/summary",
    requireAuth,
    requireRole(UserRole.VENDOR),
    async (req, res, next) => {
        try {
            const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
            if (!vendor) throw new NotFoundError("Vendor profile not found");

            const bookings = await BookingModel.find({ vendorId: vendor._id }).lean();
            const bookingIds = bookings.map((b) => b._id);

            const [payments, payouts] = await Promise.all([
                PaymentModel.find({ bookingId: { $in: bookingIds } }).lean(),
                PayoutModel.find({ vendorId: vendor._id }).lean(),
            ]);

            const paidPayments = payments.filter((p) => p.status === PaymentStatus.PAID);
            const totalEarnings = paidPayments.reduce((sum, p) => sum + p.amount, 0);
            const totalPayouts = payouts
                .filter((p) => p.status !== PayoutStatus.FAILED)
                .reduce((sum, p) => sum + p.amount, 0);
            const pendingPayout = Math.max(totalEarnings - totalPayouts, 0);
            const availableBalance = pendingPayout;

            const now = new Date();
            const thisMonthKey = getMonthKey(now);
            const lastMonthKey = getMonthKey(
                new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)),
            );
            const thisMonth = paidPayments
                .filter((p) => p.paidAt && getMonthKey(p.paidAt) === thisMonthKey)
                .reduce((sum, p) => sum + p.amount, 0);
            const lastMonth = paidPayments
                .filter((p) => p.paidAt && getMonthKey(p.paidAt) === lastMonthKey)
                .reduce((sum, p) => sum + p.amount, 0);
            const growth =
                lastMonth > 0
                    ? Number((((thisMonth - lastMonth) / lastMonth) * 100).toFixed(1))
                    : 0;

            res.json({
                totalEarnings,
                pendingPayout,
                availableBalance,
                thisMonth,
                growth,
            });
        } catch (err) {
            next(err);
        }
    },
);

/**
 * @openapi
 * /api/vendors/me/payments/transactions:
 *   get:
 *     tags: [Vendor Payments]
 *     summary: List vendor transactions
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
vendorPaymentsRoutes.get(
    "/me/payments/transactions",
    requireAuth,
    requireRole(UserRole.VENDOR),
    async (req, res, next) => {
        try {
            const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
            if (!vendor) throw new NotFoundError("Vendor profile not found");

            const bookings = await BookingModel.find({ vendorId: vendor._id }).lean();
            const bookingIds = bookings.map((b) => b._id);

            const [payments, refunds, events, customers] = await Promise.all([
                PaymentModel.find({ bookingId: { $in: bookingIds } }).lean(),
                RefundModel.find({ bookingId: { $in: bookingIds } }).lean(),
                EventModel.find({ _id: { $in: bookings.map((b) => b.eventId) } }).lean(),
                UserModel.find({ _id: { $in: bookings.map((b) => b.userId) } }).lean(),
            ]);

            const bookingMap = new Map(bookings.map((b) => [b._id.toString(), b]));
            const eventMap = new Map(events.map((e) => [e._id.toString(), e]));
            const customerMap = new Map(customers.map((c) => [c._id.toString(), c]));

            const transactions = [
                ...payments.map((p) => {
                    const booking = bookingMap.get(p.bookingId.toString());
                    const event = booking ? eventMap.get(booking.eventId.toString()) : undefined;
                    const customer = booking
                        ? customerMap.get(booking.userId.toString())
                        : undefined;
                    const label = `${formatEventType(event?.eventType)} - ${customer?.fullName ?? "Customer"}`;
                    return {
                        id: p._id.toString(),
                        booking: label.trim(),
                        amount: p.amount,
                        status: p.status === PaymentStatus.PAID ? "completed" : "pending",
                        date: (p.paidAt ?? p.createdAt)?.toISOString(),
                        type: "credit",
                    };
                }),
                ...refunds.map((r) => {
                    const booking = bookingMap.get(r.bookingId.toString());
                    const event = booking ? eventMap.get(booking.eventId.toString()) : undefined;
                    const customer = booking
                        ? customerMap.get(booking.userId.toString())
                        : undefined;
                    const label = `${formatEventType(event?.eventType)} - ${customer?.fullName ?? "Customer"}`;
                    return {
                        id: r._id.toString(),
                        booking: label.trim() || "Refund",
                        amount: r.amount,
                        status: "completed",
                        date: r.createdAt?.toISOString(),
                        type: "debit",
                    };
                }),
            ].sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());

            res.json({ items: transactions });
        } catch (err) {
            next(err);
        }
    },
);

/**
 * @openapi
 * /api/vendors/me/payments/payouts:
 *   get:
 *     tags: [Vendor Payments]
 *     summary: List vendor payouts
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
vendorPaymentsRoutes.get(
    "/me/payments/payouts",
    requireAuth,
    requireRole(UserRole.VENDOR),
    async (req, res, next) => {
        try {
            const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
            if (!vendor) throw new NotFoundError("Vendor profile not found");

            const payouts = await PayoutModel.find({ vendorId: vendor._id })
                .sort({ createdAt: -1 })
                .lean();

            res.json({
                items: payouts.map((p) => ({
                    id: p._id.toString(),
                    amount: p.amount,
                    status: p.status.toLowerCase(),
                    date: (p.processedAt ?? p.requestedAt ?? p.createdAt)?.toISOString(),
                    bank: p.bankLast4 ? `**** ${p.bankLast4}` : undefined,
                })),
            });
        } catch (err) {
            next(err);
        }
    },
);

/**
 * @openapi
 * /api/vendors/me/payments/payouts:
 *   post:
 *     tags: [Vendor Payments]
 *     summary: Request a payout
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount: { type: number }
 *               bankLast4: { type: string }
 *     responses:
 *       201: { description: Created }
 */
vendorPaymentsRoutes.post(
    "/me/payments/payouts",
    requireAuth,
    requireRole(UserRole.VENDOR),
    validateBody(CreatePayoutSchema),
    async (req, res, next) => {
        try {
            const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
            if (!vendor) throw new NotFoundError("Vendor profile not found");

            const payout = await PayoutModel.create({
                vendorId: vendor._id,
                amount: req.body.amount,
                status: PayoutStatus.PROCESSING,
                bankLast4: req.body.bankLast4,
                requestedAt: new Date(),
            });

            res.status(201).json({
                id: payout._id.toString(),
                amount: payout.amount,
                status: payout.status.toLowerCase(),
                date: payout.requestedAt?.toISOString(),
                bank: payout.bankLast4 ? `**** ${payout.bankLast4}` : undefined,
            });
        } catch (err) {
            next(err);
        }
    },
);
