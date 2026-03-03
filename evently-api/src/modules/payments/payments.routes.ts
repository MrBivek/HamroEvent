import { Router } from "express";
import mongoose from "mongoose";
import { createHmac } from "node:crypto";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { UserRole, BookingStatus, PaymentStatus, NotificationType } from "../../common/enums.js";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import { PaymentModel } from "./payment.model.js";
import { BookingModel } from "../bookings/booking.model.js";
import { VendorModel } from "../vendors/vendor.model.js";
import { EventModel } from "../events/event.model.js";
import { CreatePaymentSchema, PaymentListQuerySchema } from "./payments.schemas.js";
import { createNotification } from "../notifications/notifications.service.js";
import { VendorPaymentConfigModel } from "./vendor-payment-config.model.js";
import { env } from "../../configurations/env.js";

export const paymentsRoutes = Router();

const KHALTI_INITIATE_URLS = {
    sandbox: "https://a.khalti.com/api/v2/epayment/initiate/",
    live: "https://a.khalti.com/api/v2/epayment/initiate/",
};

const KHALTI_LOOKUP_URLS = {
    sandbox: "https://a.khalti.com/api/v2/epayment/lookup/",
    live: "https://a.khalti.com/api/v2/epayment/lookup/",
};

const ESEWA_FORM_URLS = {
    sandbox: "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
    live: "https://epay.esewa.com.np/api/epay/main/v2/form",
};

const ESEWA_STATUS_URLS = {
    sandbox: "https://rc.esewa.com.np/api/epay/transaction/status/",
    live: "https://epay.esewa.com.np/api/epay/transaction/status/",
};

function signEsewa(fields: Record<string, string>, secretKey: string) {
    const payload = Object.entries(fields)
        .map(([key, value]) => `${key}=${value}`)
        .join(",");
    return createHmac("sha256", secretKey).update(payload).digest("base64");
}

/**
 * @openapi
 * /api/payments:
 *   post:
 *     tags: [Payments]
 *     summary: Initiate payment (Customer only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId, amount, provider]
 *             properties:
 *               bookingId: { type: string }
 *               amount: { type: number }
 *               provider: { type: string, example: "MOCK" }
 *     responses:
 *       201: { description: Created }
 */
paymentsRoutes.post(
    "/",
    requireAuth,
    requireRole(UserRole.CUSTOMER),
    validateBody(CreatePaymentSchema),
    async (req, res, next) => {
        try {
            const { bookingId, amount, provider } = req.body;
            if (!mongoose.isValidObjectId(bookingId))
                throw new BadRequestError("Invalid bookingId");

            const booking = await BookingModel.findOne({
                _id: bookingId,
                userId: req.auth!.sub,
            }).lean();
            if (!booking) throw new NotFoundError("Booking not found");

            const vendor = await VendorModel.findById(booking.vendorId).lean();
            if (!vendor) throw new NotFoundError("Vendor not found");

            const allowed: BookingStatus[] = [
                BookingStatus.ACCEPTED,
                BookingStatus.CONFIRMED_PENDING_PAYMENT,
            ];
            if (!allowed.includes(booking.status as BookingStatus)) {
                throw new BadRequestError(
                    "Payment is only allowed for accepted bookings or accepted quotes",
                );
            }

            const normalizedProvider = String(provider || "").toUpperCase();
            const payment = await PaymentModel.create({
                bookingId: new mongoose.Types.ObjectId(bookingId),
                userId: new mongoose.Types.ObjectId(req.auth!.sub),
                amount,
                provider: normalizedProvider,
                status: PaymentStatus.INITIATED,
            });

            if (normalizedProvider === "MOCK") {
                payment.payUrl = `mock://pay/${payment._id.toString()}`;
                await payment.save();
                res.status(201).json({ paymentId: payment._id.toString(), payUrl: payment.payUrl });
                return;
            }

            const config = await VendorPaymentConfigModel.findOne({ vendorId: vendor._id }).lean();
            if (!config) throw new BadRequestError("Vendor payment configuration is missing");

            if (normalizedProvider === "KHALTI") {
                const secretKey = config.khalti?.secretKey;
                const mode = config.khalti?.mode ?? "sandbox";
                if (!secretKey) throw new BadRequestError("Khalti keys are not configured");

                const payload = {
                    return_url: `${env.CLIENT_URL}/payments/khalti?paymentId=${payment._id.toString()}`,
                    website_url: env.CLIENT_URL,
                    amount: Math.round(amount * 100),
                    purchase_order_id: payment._id.toString(),
                    purchase_order_name: `Booking ${booking._id.toString()}`,
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
                    throw new BadRequestError("Failed to initiate Khalti payment");
                }
                const data = (await response.json()) as {
                    pidx: string;
                    payment_url?: string;
                };
                payment.providerRef = data.pidx;
                payment.payUrl = data.payment_url;
                payment.providerMeta = { mode, payload };
                await payment.save();
                res.status(201).json({
                    paymentId: payment._id.toString(),
                    payUrl: payment.payUrl,
                });
                return;
            }

            if (normalizedProvider === "ESEWA") {
                const merchantCode = config.esewa?.merchantCode;
                const secretKey = config.esewa?.secretKey;
                const mode = config.esewa?.mode ?? "sandbox";
                if (!merchantCode || !secretKey)
                    throw new BadRequestError("eSewa keys are not configured");

                const transactionUuid = payment._id.toString();
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
                    success_url: `${env.CLIENT_URL}/payments/esewa?paymentId=${payment._id.toString()}`,
                    failure_url: `${env.CLIENT_URL}/payments/esewa?paymentId=${payment._id.toString()}&status=failed`,
                    signed_field_names: "total_amount,transaction_uuid,product_code",
                    signature,
                };

                payment.providerRef = transactionUuid;
                payment.payUrl = ESEWA_FORM_URLS[mode];
                payment.providerMeta = { mode, formData };
                await payment.save();
                res.status(201).json({
                    paymentId: payment._id.toString(),
                    payUrl: payment.payUrl,
                    formData,
                });
                return;
            }

            throw new BadRequestError("Unsupported payment provider");
        } catch (err) {
            next(err);
        }
    },
);

/**
 * @openapi
 * /api/payments/{id}/confirm:
 *   post:
 *     tags: [Payments]
 *     summary: Confirm payment (Customer only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
paymentsRoutes.post(
    "/:id/confirm",
    requireAuth,
    requireRole(UserRole.CUSTOMER),
    async (req, res, next) => {
        try {
            const id = String(req.params.id);
            if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Payment not found");

            const payment = await PaymentModel.findOne({ _id: id, userId: req.auth!.sub });
            if (!payment) throw new NotFoundError("Payment not found");

            if (payment.status === PaymentStatus.PAID)
                throw new BadRequestError("Payment already confirmed");
            if (payment.status === PaymentStatus.REFUNDED)
                throw new BadRequestError("Payment is refunded");

            const booking = await BookingModel.findById(payment.bookingId).lean();
            if (!booking) throw new NotFoundError("Booking not found");

            const vendor = await VendorModel.findById(booking.vendorId).lean();
            if (!vendor) throw new NotFoundError("Vendor not found");

            const provider = String(payment.provider || "").toUpperCase();
            if (provider !== "MOCK") {
                const config = await VendorPaymentConfigModel.findOne({
                    vendorId: vendor._id,
                }).lean();
                if (!config) throw new BadRequestError("Vendor payment configuration is missing");

                if (provider === "KHALTI") {
                    const secretKey = config.khalti?.secretKey;
                    const mode = config.khalti?.mode ?? "sandbox";
                    if (!secretKey) throw new BadRequestError("Khalti keys are not configured");
                    if (!payment.providerRef)
                        throw new BadRequestError("Missing Khalti payment reference");

                    const response = await fetch(KHALTI_LOOKUP_URLS[mode], {
                        method: "POST",
                        headers: {
                            Authorization: `Key ${secretKey}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ pidx: payment.providerRef }),
                    });
                    if (!response.ok) {
                        throw new BadRequestError("Failed to verify Khalti payment");
                    }
                    const data = (await response.json()) as { status?: string };
                    const status = String(data.status || "").toLowerCase();
                    if (status !== "completed") {
                        throw new BadRequestError("Khalti payment not completed yet");
                    }
                } else if (provider === "ESEWA") {
                    const merchantCode = config.esewa?.merchantCode;
                    const mode = config.esewa?.mode ?? "sandbox";
                    if (!merchantCode) throw new BadRequestError("eSewa keys are not configured");
                    if (!payment.providerRef)
                        throw new BadRequestError("Missing eSewa transaction reference");
                    const meta = payment.providerMeta as
                        | { formData?: Record<string, string> }
                        | undefined;
                    const totalAmount = meta?.formData?.total_amount ?? payment.amount.toFixed(2);
                    const url = new URL(ESEWA_STATUS_URLS[mode]);
                    url.searchParams.set("product_code", merchantCode);
                    url.searchParams.set("total_amount", totalAmount);
                    url.searchParams.set("transaction_uuid", payment.providerRef);
                    const response = await fetch(url.toString());
                    if (!response.ok) {
                        throw new BadRequestError("Failed to verify eSewa payment");
                    }
                    const data = (await response.json()) as { status?: string };
                    const status = String(data.status || "").toLowerCase();
                    if (status !== "complete") {
                        throw new BadRequestError("eSewa payment not completed yet");
                    }
                } else {
                    throw new BadRequestError("Unsupported payment provider");
                }
            }

            payment.status = PaymentStatus.PAID;
            payment.paidAt = new Date();
            await payment.save();

            const updatedBooking = await BookingModel.findByIdAndUpdate(
                payment.bookingId,
                {
                    $set: { status: BookingStatus.CONFIRMED },
                    $push: {
                        history: {
                            status: "confirmed",
                            byRole: "customer",
                            at: new Date(),
                            note: "Payment confirmed",
                        },
                    },
                },
                { new: true },
            ).lean();

            if (updatedBooking) {
                await createNotification({
                    userId: updatedBooking.userId.toString(),
                    type: NotificationType.BOOKING_CONFIRMED,
                    title: "Booking confirmed",
                    body: "Your booking has been confirmed.",
                    link: `/customer/bookings/${updatedBooking._id.toString()}`,
                });

                await createNotification({
                    userId: vendor.userId.toString(),
                    type: NotificationType.PAYMENT_RECEIVED,
                    title: "Payment received",
                    body: "You received a booking payment.",
                    link: "/vendor/bookings",
                });
            }

            res.json(payment.toObject());
        } catch (err) {
            next(err);
        }
    },
);

/**
 * @openapi
 * /api/payments:
 *   get:
 *     tags: [Payments]
 *     summary: List my payments (Customer only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: bookingId
 *         schema: { type: string }
 *       - in: query
 *         name: eventId
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
paymentsRoutes.get("/", requireAuth, requireRole(UserRole.CUSTOMER), async (req, res, next) => {
    try {
        const q = PaymentListQuerySchema.parse(req.query);
        const skip = (q.page - 1) * q.limit;

        const filter: Record<string, unknown> = { userId: req.auth!.sub };

        let bookingIds: mongoose.Types.ObjectId[] | null = null;
        if (q.bookingId) {
            if (!mongoose.isValidObjectId(q.bookingId))
                throw new BadRequestError("Invalid bookingId");
            bookingIds = [new mongoose.Types.ObjectId(q.bookingId)];
        }
        if (q.eventId) {
            if (!mongoose.isValidObjectId(q.eventId)) throw new BadRequestError("Invalid eventId");
            const eventBookings = await BookingModel.find({
                userId: req.auth!.sub,
                eventId: new mongoose.Types.ObjectId(q.eventId),
            }).lean();
            bookingIds = bookingIds
                ? bookingIds.filter((id) => eventBookings.some((b) => b._id.equals(id)))
                : eventBookings.map((b) => b._id);
        }
        if (bookingIds) {
            filter.bookingId = { $in: bookingIds };
        }

        const [items, total] = await Promise.all([
            PaymentModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(q.limit).lean(),
            PaymentModel.countDocuments(filter),
        ]);

        const bookingIdList = items.map((p) => p.bookingId);
        const bookings = bookingIdList.length
            ? await BookingModel.find({ _id: { $in: bookingIdList } }).lean()
            : [];
        const vendorIds = bookings.map((b) => b.vendorId);
        const [vendors, events] = await Promise.all([
            vendorIds.length
                ? VendorModel.find({ _id: { $in: vendorIds } }).lean()
                : Promise.resolve([]),
            bookings.length
                ? EventModel.find({ _id: { $in: bookings.map((b) => b.eventId) } }).lean()
                : Promise.resolve([]),
        ]);

        const bookingMap = new Map(bookings.map((b) => [b._id.toString(), b]));
        const vendorMap = new Map(vendors.map((v) => [v._id.toString(), v]));
        const eventMap = new Map(events.map((e) => [e._id.toString(), e]));

        const enriched = items.map((payment) => {
            const booking = bookingMap.get(payment.bookingId.toString());
            const vendor = booking ? vendorMap.get(booking.vendorId.toString()) : undefined;
            const event = booking ? eventMap.get(booking.eventId.toString()) : undefined;
            return {
                _id: payment._id.toString(),
                bookingId: payment.bookingId.toString(),
                amount: payment.amount,
                provider: payment.provider,
                status: payment.status,
                payUrl: payment.payUrl,
                createdAt: payment.createdAt?.toISOString(),
                paidAt: payment.paidAt?.toISOString(),
                vendorId: vendor?._id?.toString(),
                vendorName: vendor?.businessName,
                eventId: event?._id?.toString(),
                eventTitle: event?.title,
            };
        });

        res.json({ items: enriched, page: q.page, limit: q.limit, total });
    } catch (err) {
        next(err);
    }
});
