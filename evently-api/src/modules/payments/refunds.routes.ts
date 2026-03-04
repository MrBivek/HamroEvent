import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { UserRole, PaymentStatus, BookingStatus, NotificationType } from "../../common/enums.js";
import { BadRequestError, NotFoundError, ForbiddenError } from "../../common/errors.js";
import { RefundModel } from "./refund.model.js";
import { PaymentModel } from "./payment.model.js";
import { BookingModel } from "../bookings/booking.model.js";
import { VendorModel } from "../vendors/vendor.model.js";
import { CreateRefundSchema, RefundListQuerySchema, InitiateRefundSchema } from "./payments.schemas.js";
import { createAuditLog } from "../audit-logs/audit-logs.service.js";
import { createNotification, createNotificationsForAdmins } from "../notifications/notifications.service.js";
import { mapUserRoleToUi } from "../../common/mappers.js";
import { emitBookingUpdate } from "../../socket.js";
import { VendorPaymentConfigModel } from "./vendor-payment-config.model.js";
import { env } from "../../configurations/env.js";
import crypto from "node:crypto";

const KHALTI_INITIATE_URLS = {
    sandbox: "https://a.khalti.com/api/v2/epayment/initiate/",
    live: "https://a.khalti.com/api/v2/epayment/initiate/",
} as const;

const KHALTI_LOOKUP_URLS = {
    sandbox: "https://a.khalti.com/api/v2/epayment/lookup/",
    live: "https://a.khalti.com/api/v2/epayment/lookup/",
} as const;

const ESEWA_FORM_URLS = {
    sandbox: "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
    live: "https://epay.esewa.com.np/api/epay/main/v2/form",
} as const;

const ESEWA_STATUS_URLS = {
    sandbox: "https://rc.esewa.com.np/api/epay/transaction/status/",
    live: "https://epay.esewa.com.np/api/epay/transaction/status/",
} as const;

function signEsewa(fields: Record<string, string>, secretKey: string) {
    const payload = Object.entries(fields)
        .map(([key, value]) => `${key}=${value}`)
        .join(",");
    return crypto.createHmac("sha256", secretKey).update(payload).digest("base64");
}

export const refundsRoutes = Router();

/**
 * @openapi
 * /api/refunds:
 *   post:
 *     tags: [Payments]
 *     summary: Create a refund (Admin/Vendor)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentId, amount]
 *             properties:
 *               paymentId: { type: string }
 *               amount: { type: number }
 *               reason: { type: string }
 *     responses:
 *       201: { description: Created }
 */
refundsRoutes.post(
    "/",
    requireAuth,
    requireRole(UserRole.ADMIN),
    validateBody(CreateRefundSchema),
    async (req, res, next) => {
        try {
            const { paymentId, amount, reason } = req.body;
            if (!mongoose.isValidObjectId(paymentId))
                throw new BadRequestError("Invalid paymentId");

            const payment = await PaymentModel.findById(paymentId);
            if (!payment) throw new NotFoundError("Payment not found");

            if (payment.status === PaymentStatus.REFUNDED) {
                throw new BadRequestError("Payment already refunded");
            }

            if (payment.status !== PaymentStatus.PAID) {
                throw new BadRequestError("Only paid payments can be refunded");
            }

            if (amount > payment.amount) {
                throw new BadRequestError("Refund amount cannot exceed paid amount");
            }

            const booking = await BookingModel.findById(payment.bookingId).lean();
            if (!booking) throw new NotFoundError("Booking not found");

            if (req.auth!.role === UserRole.VENDOR) {
                const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
                if (!vendor) throw new NotFoundError("Vendor profile not found");
                if (booking.vendorId.toString() !== vendor._id.toString()) {
                    throw new ForbiddenError("Not allowed to refund this payment");
                }
            }

            payment.status = PaymentStatus.REFUNDED;
            await payment.save();

            const updatedBooking = await BookingModel.findByIdAndUpdate(
                booking._id,
                {
                    $set: { status: BookingStatus.CANCELLED },
                    $push: {
                        history: {
                            status: "cancelled",
                            byRole: mapUserRoleToUi(req.auth!.role),
                            at: new Date(),
                            note: reason ?? "Refund issued",
                        },
                    },
                },
                { new: true },
            ).lean();

            const refund = await RefundModel.create({
                paymentId: payment._id,
                bookingId: booking._id,
                amount,
                reason,
                createdBy: new mongoose.Types.ObjectId(req.auth!.sub),
            });

            await createAuditLog({
                actorUserId: req.auth!.sub,
                action: "PAYMENT_REFUND",
                targetType: "Payment",
                targetId: payment._id,
                metadata: { amount, reason: reason ?? null, bookingId: booking._id.toString() },
            });

            await createNotificationsForAdmins({
                type: NotificationType.SYSTEM,
                title: "Refund issued",
                body: `Refund of ${amount} created for booking ${booking._id.toString()}.`,
                link: "/admin/audit-logs",
            });

            await createNotification({
                userId: booking.userId.toString(),
                type: NotificationType.BOOKING_CANCELLED,
                title: "Booking refunded",
                body: "A refund has been issued and the booking was cancelled.",
                link: `/customer/bookings/${booking._id.toString()}`,
            });

            if (updatedBooking) {
                emitBookingUpdate([updatedBooking.userId.toString()], {
                    bookingId: updatedBooking._id.toString(),
                    bookingStatus: "cancelled",
                    history: updatedBooking.history ?? [],
                });
            }

            res.status(201).json(refund);
        } catch (err) {
            next(err);
        }
    },
);

/**
 * @openapi
 * /api/refunds/initiate:
 *   post:
 *     tags: [Payments]
 *     summary: Initiate a refund (Vendor only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentId, amount, provider]
 *             properties:
 *               paymentId: { type: string }
 *               amount: { type: number }
 *               provider: { type: string }
 *               reason: { type: string }
 *     responses:
 *       201: { description: Created }
 */
refundsRoutes.post(
    "/initiate",
    requireAuth,
    requireRole(UserRole.VENDOR),
    validateBody(InitiateRefundSchema),
    async (req, res, next) => {
        try {
            const { paymentId, amount, provider, reason } = req.body;
            if (!mongoose.isValidObjectId(paymentId))
                throw new BadRequestError("Invalid paymentId");

            const payment = await PaymentModel.findById(paymentId).lean();
            if (!payment) throw new NotFoundError("Payment not found");

            const booking = await BookingModel.findById(payment.bookingId).lean();
            if (!booking) throw new NotFoundError("Booking not found");

            const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
            if (!vendor) throw new NotFoundError("Vendor profile not found");
            if (booking.vendorId.toString() !== vendor._id.toString()) {
                throw new ForbiddenError("Not allowed to refund this payment");
            }

            const [paidAgg, refundedAgg] = await Promise.all([
                PaymentModel.aggregate([
                    {
                        $match: {
                            bookingId: new mongoose.Types.ObjectId(booking._id),
                            status: PaymentStatus.PAID,
                        },
                    },
                    { $group: { _id: null, total: { $sum: "$amount" } } },
                ]),
                RefundModel.aggregate([
                    {
                        $match: {
                            bookingId: new mongoose.Types.ObjectId(booking._id),
                            status: { $in: [PaymentStatus.INITIATED, PaymentStatus.PAID] },
                        },
                    },
                    { $group: { _id: null, total: { $sum: "$amount" } } },
                ]),
            ]);

            const totalPaid = paidAgg?.[0]?.total ?? 0;
            const totalRefunded = refundedAgg?.[0]?.total ?? 0;
            const refundable = Math.max(totalPaid - totalRefunded, 0);

            if (amount > refundable) {
                throw new BadRequestError("Refund exceeds the paid amount so far");
            }

            const normalizedProvider = String(provider || "").toUpperCase();
            const refund = await RefundModel.create({
                paymentId: payment._id,
                bookingId: booking._id,
                amount,
                reason,
                provider: normalizedProvider,
                status: PaymentStatus.INITIATED,
                createdBy: new mongoose.Types.ObjectId(req.auth!.sub),
            });

            if (normalizedProvider === "MOCK") {
                refund.payUrl = `mock://refund/${refund._id.toString()}`;
                await refund.save();
                return res.status(201).json({
                    refundId: refund._id.toString(),
                    payUrl: refund.payUrl,
                });
            }

            const config = await VendorPaymentConfigModel.findOne({ vendorId: vendor._id }).lean();
            if (!config) throw new BadRequestError("Vendor payment configuration is missing");

            if (normalizedProvider === "KHALTI") {
                const secretKey = config.khalti?.secretKey;
                const mode = config.khalti?.mode ?? "sandbox";
                if (!secretKey) throw new BadRequestError("Khalti keys are not configured");

                const payload = {
                    return_url: `${env.CLIENT_URL}/refunds/khalti?refundId=${refund._id.toString()}`,
                    website_url: env.CLIENT_URL,
                    amount: Math.round(amount * 100),
                    purchase_order_id: refund._id.toString(),
                    purchase_order_name: `Refund ${booking._id.toString()}`,
                };

                const response = await fetch(KHALTI_INITIATE_URLS[mode], {
                    method: "POST",
                    headers: {
                        Authorization: `Key ${secretKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                });
                if (!response.ok) {
                    throw new BadRequestError("Failed to initiate Khalti refund");
                }
                const data = (await response.json()) as { pidx: string; payment_url?: string };
                refund.providerRef = data.pidx;
                refund.payUrl = data.payment_url;
                refund.providerMeta = { mode, payload };
                await refund.save();
                return res.status(201).json({
                    refundId: refund._id.toString(),
                    payUrl: refund.payUrl,
                });
            }

            if (normalizedProvider === "ESEWA") {
                const merchantCode = config.esewa?.merchantCode;
                const secretKey = config.esewa?.secretKey;
                const mode = config.esewa?.mode ?? "sandbox";
                if (!merchantCode || !secretKey)
                    throw new BadRequestError("eSewa keys are not configured");

                const transactionUuid = refund._id.toString();
                const totalAmount = amount.toFixed(2);
                const signFields = {
                    total_amount: totalAmount,
                    transaction_uuid: transactionUuid,
                    product_code: merchantCode,
                };
                const signature = signEsewa(signFields, secretKey);

                const formData = {
                    amount: totalAmount,
                    tax_amount: "0",
                    total_amount: totalAmount,
                    transaction_uuid: transactionUuid,
                    product_code: merchantCode,
                    product_service_charge: "0",
                    product_delivery_charge: "0",
                    success_url: `${env.CLIENT_URL}/refunds/esewa?refundId=${refund._id.toString()}`,
                    failure_url: `${env.CLIENT_URL}/refunds/esewa?refundId=${refund._id.toString()}&status=failed`,
                    signed_field_names: "total_amount,transaction_uuid,product_code",
                    signature,
                };

                refund.providerRef = transactionUuid;
                refund.payUrl = ESEWA_FORM_URLS[mode];
                refund.providerMeta = { mode, formData };
                await refund.save();
                return res.status(201).json({
                    refundId: refund._id.toString(),
                    payUrl: refund.payUrl,
                    formData,
                });
            }

            throw new BadRequestError("Unsupported refund provider");
        } catch (err) {
            next(err);
        }
    },
);

/**
 * @openapi
 * /api/refunds/{id}/confirm:
 *   post:
 *     tags: [Payments]
 *     summary: Confirm a refund payment (Vendor only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
refundsRoutes.post(
    "/:id/confirm",
    requireAuth,
    requireRole(UserRole.VENDOR),
    async (req, res, next) => {
        try {
            const id = String(req.params.id);
            if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Refund not found");

            const refund = await RefundModel.findById(id);
            if (!refund) throw new NotFoundError("Refund not found");

            const booking = await BookingModel.findById(refund.bookingId).lean();
            if (!booking) throw new NotFoundError("Booking not found");

            const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
            if (!vendor) throw new NotFoundError("Vendor profile not found");
            if (booking.vendorId.toString() !== vendor._id.toString()) {
                throw new ForbiddenError("Not allowed to confirm this refund");
            }

            if (refund.status === PaymentStatus.PAID) {
                return res.json(refund.toObject());
            }

            const provider = String(refund.provider || "").toUpperCase();
            if (provider !== "MOCK") {
                const config = await VendorPaymentConfigModel.findOne({ vendorId: vendor._id }).lean();
                if (!config) throw new BadRequestError("Vendor payment configuration is missing");

                if (provider === "KHALTI") {
                    const secretKey = config.khalti?.secretKey;
                    const mode = config.khalti?.mode ?? "sandbox";
                    if (!secretKey) throw new BadRequestError("Khalti keys are not configured");
                    if (!refund.providerRef)
                        throw new BadRequestError("Missing Khalti refund reference");

                    const response = await fetch(KHALTI_LOOKUP_URLS[mode], {
                        method: "POST",
                        headers: {
                            Authorization: `Key ${secretKey}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ pidx: refund.providerRef }),
                    });
                    if (!response.ok) {
                        throw new BadRequestError("Failed to verify Khalti refund");
                    }
                    const data = (await response.json()) as { status?: string };
                    const status = String(data.status || "").toLowerCase();
                    if (status !== "completed") {
                        throw new BadRequestError("Khalti refund not completed yet");
                    }
                } else if (provider === "ESEWA") {
                    const merchantCode = config.esewa?.merchantCode;
                    const mode = config.esewa?.mode ?? "sandbox";
                    if (!merchantCode) throw new BadRequestError("eSewa keys are not configured");
                    if (!refund.providerRef)
                        throw new BadRequestError("Missing eSewa refund reference");
                    const meta = refund.providerMeta as
                        | { formData?: Record<string, string> }
                        | undefined;
                    const totalAmount = meta?.formData?.total_amount ?? refund.amount.toFixed(2);
                    const url = new URL(ESEWA_STATUS_URLS[mode]);
                    url.searchParams.set("product_code", merchantCode);
                    url.searchParams.set("total_amount", totalAmount);
                    url.searchParams.set("transaction_uuid", refund.providerRef);
                    const response = await fetch(url.toString());
                    if (!response.ok) {
                        throw new BadRequestError("Failed to verify eSewa refund");
                    }
                    const data = (await response.json()) as { status?: string };
                    const status = String(data.status || "").toLowerCase();
                    if (status !== "complete") {
                        throw new BadRequestError("eSewa refund not completed yet");
                    }
                } else {
                    throw new BadRequestError("Unsupported refund provider");
                }
            }

            refund.status = PaymentStatus.PAID;
            refund.confirmedAt = new Date();
            await refund.save();

            await PaymentModel.updateOne(
                { _id: refund.paymentId },
                { $set: { status: PaymentStatus.REFUNDED } },
            );

            const updatedBooking = await BookingModel.findByIdAndUpdate(
                booking._id,
                {
                    $set: { status: BookingStatus.CANCELLED },
                    $push: {
                        history: {
                            status: "cancelled",
                            byRole: "vendor",
                            at: new Date(),
                            note: refund.reason ?? "Refund issued",
                        },
                    },
                },
                { new: true },
            ).lean();

            await createAuditLog({
                actorUserId: req.auth!.sub,
                action: "PAYMENT_REFUND",
                targetType: "Refund",
                targetId: refund._id,
                metadata: { amount: refund.amount, bookingId: booking._id.toString() },
            });

            await createNotificationsForAdmins({
                type: NotificationType.SYSTEM,
                title: "Refund issued",
                body: `Refund of ${refund.amount} created for booking ${booking._id.toString()}.`,
                link: "/admin/audit-logs",
            });

            await createNotification({
                userId: booking.userId.toString(),
                type: NotificationType.BOOKING_CANCELLED,
                title: "Booking refunded",
                body: "A refund has been issued and the booking was cancelled.",
                link: `/customer/bookings/${booking._id.toString()}`,
            });

            if (updatedBooking) {
                emitBookingUpdate([updatedBooking.userId.toString()], {
                    bookingId: updatedBooking._id.toString(),
                    bookingStatus: "cancelled",
                    history: updatedBooking.history ?? [],
                });
            }

            res.json(refund.toObject());
        } catch (err) {
            next(err);
        }
    },
);

/**
 * @openapi
 * /api/refunds:
 *   get:
 *     tags: [Payments]
 *     summary: List refunds (Admin/Vendor)
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
refundsRoutes.get(
    "/",
    requireAuth,
    requireRole(UserRole.ADMIN, UserRole.VENDOR),
    async (req, res, next) => {
        try {
            const q = RefundListQuerySchema.parse(req.query);
            const skip = (q.page - 1) * q.limit;

            const filter: Record<string, unknown> = {};

            if (q.bookingId) {
                if (!mongoose.isValidObjectId(q.bookingId))
                    throw new BadRequestError("Invalid bookingId");
                filter.bookingId = new mongoose.Types.ObjectId(q.bookingId);
            }

            if (req.auth!.role === UserRole.VENDOR) {
                const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
                if (!vendor) throw new NotFoundError("Vendor profile not found");

                const bookingIds = await BookingModel.find(
                    { vendorId: vendor._id },
                    { _id: 1 },
                ).lean();
                const allowedIds = bookingIds.map((b) => b._id.toString());
                if (filter.bookingId) {
                    if (
                        !allowedIds.includes(
                            (filter.bookingId as mongoose.Types.ObjectId).toString(),
                        )
                    ) {
                        filter.bookingId = { $in: [] };
                    }
                } else {
                    filter.bookingId = { $in: bookingIds.map((b) => b._id) };
                }
            }

            const [items, total] = await Promise.all([
                RefundModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(q.limit).lean(),
                RefundModel.countDocuments(filter),
            ]);

            res.json({ items, page: q.page, limit: q.limit, total });
        } catch (err) {
            next(err);
        }
    },
);

/**
 * @openapi
 * /api/refunds/customer:
 *   get:
 *     tags: [Payments]
 *     summary: List refunds (Customer only)
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
refundsRoutes.get(
    "/customer",
    requireAuth,
    requireRole(UserRole.CUSTOMER),
    async (req, res, next) => {
        try {
            const q = RefundListQuerySchema.parse(req.query);
            const skip = (q.page - 1) * q.limit;

            const filter: Record<string, unknown> = {};

            if (q.bookingId) {
                if (!mongoose.isValidObjectId(q.bookingId))
                    throw new BadRequestError("Invalid bookingId");
                filter.bookingId = new mongoose.Types.ObjectId(q.bookingId);
            }

            const bookingFilter: Record<string, unknown> = { userId: req.auth!.sub };
            if (filter.bookingId) {
                bookingFilter._id = filter.bookingId;
            }

            const bookingIds = await BookingModel.find(bookingFilter, { _id: 1 }).lean();
            filter.bookingId = { $in: bookingIds.map((b) => b._id) };

            const [items, total] = await Promise.all([
                RefundModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(q.limit).lean(),
                RefundModel.countDocuments(filter),
            ]);

            res.json({ items, page: q.page, limit: q.limit, total });
        } catch (err) {
            next(err);
        }
    },
);
