import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { UserRole, PaymentStatus } from "../../common/enums.js";
import { NotFoundError } from "../../common/errors.js";
import { VendorModel } from "../vendors/vendor.model.js";
import { BookingModel } from "../bookings/booking.model.js";
import { PaymentModel } from "./payment.model.js";
import { RefundModel } from "./refund.model.js";
import { EventModel } from "../events/event.model.js";
import { UserModel } from "../auth/user.model.js";
import {
    VendorPaymentConfigSchema,
    VendorPaymentListQuerySchema,
} from "./payments.schemas.js";
import { formatEventType } from "../../common/mappers.js";
import { VendorPaymentConfigModel } from "./vendor-payment-config.model.js";

export const vendorPaymentsRoutes = Router();

function getMonthKey(date: Date) {
    return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`;
}

/**
 * @openapi
 * /api/vendors/me/payments/config:
 *   get:
 *     tags: [Vendor Payments]
 *     summary: Get vendor payment configuration
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
vendorPaymentsRoutes.get(
    "/me/payments/config",
    requireAuth,
    requireRole(UserRole.VENDOR),
    async (req, res, next) => {
        try {
            const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
            if (!vendor) throw new NotFoundError("Vendor profile not found");

            const config = await VendorPaymentConfigModel.findOne({ vendorId: vendor._id }).lean();
            res.json(config || null);
        } catch (err) {
            next(err);
        }
    },
);

/**
 * @openapi
 * /api/vendors/me/payments/config:
 *   put:
 *     tags: [Vendor Payments]
 *     summary: Update vendor payment configuration
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               khalti:
 *                 type: object
 *                 properties:
 *                   publicKey: { type: string }
 *                   secretKey: { type: string }
 *                   mode: { type: string, enum: [sandbox, live] }
 *               esewa:
 *                 type: object
 *                 properties:
 *                   merchantCode: { type: string }
 *                   secretKey: { type: string }
 *                   mode: { type: string, enum: [sandbox, live] }
 *     responses:
 *       200: { description: OK }
 */
vendorPaymentsRoutes.put(
    "/me/payments/config",
    requireAuth,
    requireRole(UserRole.VENDOR),
    validateBody(VendorPaymentConfigSchema),
    async (req, res, next) => {
        try {
            const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
            if (!vendor) throw new NotFoundError("Vendor profile not found");

            const existing = await VendorPaymentConfigModel.findOne({
                vendorId: vendor._id,
            }).lean();
            const config = await VendorPaymentConfigModel.findOneAndUpdate(
                { vendorId: vendor._id },
                {
                    $set: {
                        vendorId: vendor._id,
                        khalti: req.body.khalti ?? existing?.khalti,
                        esewa: req.body.esewa ?? existing?.esewa,
                    },
                },
                { new: true, upsert: true },
            ).lean();

            res.json(config);
        } catch (err) {
            next(err);
        }
    },
);

/**
 * @openapi
 * /api/vendors/me/payments:
 *   get:
 *     tags: [Vendor Payments]
 *     summary: List vendor payments (optional booking filter)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: bookingId
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: number, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: number, default: 20 }
 *     responses:
 *       200: { description: OK }
 */
vendorPaymentsRoutes.get(
    "/me/payments",
    requireAuth,
    requireRole(UserRole.VENDOR),
    async (req, res, next) => {
        try {
            const q = VendorPaymentListQuerySchema.parse(req.query);
            const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
            if (!vendor) throw new NotFoundError("Vendor profile not found");

            const bookings = await BookingModel.find({ vendorId: vendor._id }).lean();
            const bookingIds = bookings.map((b) => b._id);

            if (q.bookingId && !mongoose.isValidObjectId(q.bookingId)) {
                throw new NotFoundError("Booking not found");
            }

            const filter: Record<string, unknown> = { bookingId: { $in: bookingIds } };
            if (q.bookingId) {
                const match = bookingIds.find((id) => id.toString() === q.bookingId);
                if (!match) throw new NotFoundError("Booking not found");
                filter.bookingId = new mongoose.Types.ObjectId(q.bookingId);
            }

            const skip = (q.page - 1) * q.limit;
            const [payments, total, events, customers] = await Promise.all([
                PaymentModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(q.limit).lean(),
                PaymentModel.countDocuments(filter),
                EventModel.find({ _id: { $in: bookings.map((b) => b.eventId) } }).lean(),
                UserModel.find({ _id: { $in: bookings.map((b) => b.userId) } }).lean(),
            ]);

            const bookingMap = new Map(bookings.map((b) => [b._id.toString(), b]));
            const eventMap = new Map(events.map((e) => [e._id.toString(), e]));
            const customerMap = new Map(customers.map((c) => [c._id.toString(), c]));

            const items = payments.map((payment) => {
                const booking = bookingMap.get(payment.bookingId.toString());
                const event = booking ? eventMap.get(booking.eventId.toString()) : undefined;
                const customer = booking ? customerMap.get(booking.userId.toString()) : undefined;
                return {
                    id: payment._id.toString(),
                    bookingId: payment.bookingId.toString(),
                    amount: payment.amount,
                    provider: payment.provider,
                    status: payment.status,
                    createdAt: payment.createdAt?.toISOString(),
                    paidAt: payment.paidAt?.toISOString(),
                    eventTitle: event?.title,
                    customerName: customer?.fullName ?? "Customer",
                };
            });

            res.json({ items, page: q.page, limit: q.limit, total });
        } catch (err) {
            next(err);
        }
    },
);

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

            const payments = await PaymentModel.find({ bookingId: { $in: bookingIds } }).lean();

            const paidPayments = payments.filter((p) => p.status === PaymentStatus.PAID);
            const totalEarnings = paidPayments.reduce((sum, p) => sum + p.amount, 0);
            const pendingPayout = 0;
            const availableBalance = 0;

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
