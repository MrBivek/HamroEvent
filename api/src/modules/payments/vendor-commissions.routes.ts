import { Router } from "express";
import mongoose from "mongoose";
import { createHmac } from "node:crypto";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { UserRole, PaymentStatus, NotificationType } from "../../common/enums.js";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import { env } from "../../configurations/env.js";
import { VendorModel } from "../vendors/vendor.model.js";
import { AdminPaymentConfigModel } from "./admin-payment-config.model.js";
import { CommissionMonthQuerySchema, InitiateCommissionPaymentSchema } from "./commissions.schemas.js";
import { buildVendorCommissionSummary, parseMonthKey } from "./commission.service.js";
import { CommissionPaymentModel } from "./commission-payment.model.js";
import { createNotification, createNotificationsForAdmins } from "../notifications/notifications.service.js";

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

export const vendorCommissionsRoutes = Router();

/**
 * @openapi
 * /api/vendors/me/commissions/summary:
 *   get:
 *     tags: [Vendor Commissions]
 *     summary: Get my monthly commission summary
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: string, example: "2026-03" }
 *     responses:
 *       200: { description: OK }
 */
vendorCommissionsRoutes.get(
    "/me/commissions/summary",
    requireAuth,
    requireRole(UserRole.VENDOR),
    async (req, res, next) => {
        try {
            const parsed = CommissionMonthQuerySchema.parse(req.query);
            const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
            if (!vendor) throw new NotFoundError("Vendor profile not found");

            const summary = await buildVendorCommissionSummary(vendor._id, parsed.month);
            res.json(summary);
        } catch (err) {
            next(err);
        }
    },
);

/**
 * @openapi
 * /api/vendors/me/commissions/payments:
 *   get:
 *     tags: [Vendor Commissions]
 *     summary: List my commission payments
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: string, example: "2026-03" }
 *       - in: query
 *         name: page
 *         schema: { type: number, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: number, default: 20 }
 *     responses:
 *       200: { description: OK }
 */
vendorCommissionsRoutes.get(
    "/me/commissions/payments",
    requireAuth,
    requireRole(UserRole.VENDOR),
    async (req, res, next) => {
        try {
            const parsed = CommissionMonthQuerySchema.parse(req.query);
            const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
            if (!vendor) throw new NotFoundError("Vendor profile not found");

            const filter: Record<string, unknown> = { vendorId: vendor._id };
            if (parsed.month) filter.monthKey = parsed.month;

            const skip = (parsed.page - 1) * parsed.limit;
            const [items, total] = await Promise.all([
                CommissionPaymentModel.find(filter)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(parsed.limit)
                    .lean(),
                CommissionPaymentModel.countDocuments(filter),
            ]);

            res.json({
                items: items.map((item) => ({
                    _id: item._id.toString(),
                    vendorId: item.vendorId.toString(),
                    monthKey: item.monthKey,
                    amount: item.amount,
                    status: item.status,
                    provider: item.provider,
                    payUrl: item.payUrl,
                    createdAt: item.createdAt?.toISOString(),
                    paidAt: item.paidAt?.toISOString(),
                })),
                page: parsed.page,
                limit: parsed.limit,
                total,
            });
        } catch (err) {
            next(err);
        }
    },
);

/**
 * @openapi
 * /api/vendors/me/commissions/payments/initiate:
 *   post:
 *     tags: [Vendor Commissions]
 *     summary: Initiate a commission payment to admin
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [month, amount, provider]
 *             properties:
 *               month: { type: string, example: "2026-03" }
 *               amount: { type: number }
 *               provider: { type: string, example: "KHALTI" }
 *     responses:
 *       201: { description: Created }
 */
vendorCommissionsRoutes.post(
    "/me/commissions/payments/initiate",
    requireAuth,
    requireRole(UserRole.VENDOR),
    validateBody(InitiateCommissionPaymentSchema),
    async (req, res, next) => {
        try {
            const { month, amount, provider } = req.body;
            const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
            if (!vendor) throw new NotFoundError("Vendor profile not found");

            const summary = await buildVendorCommissionSummary(vendor._id, month);
            if (summary.commissionDue <= 0) {
                throw new BadRequestError("No commission is due for this month");
            }

            const remainingOpen = Math.max(summary.commissionDue - summary.commissionReserved, 0);
            if (amount > remainingOpen) {
                throw new BadRequestError(
                    `Commission payment exceeds remaining balance. Remaining: ${remainingOpen}`,
                );
            }

            const adminConfig = await AdminPaymentConfigModel.findOne({ key: "default" }).lean();
            if (!adminConfig) throw new BadRequestError("Admin payment configuration is missing");

            const { year, month: monthNumber } = parseMonthKey(month);
            const normalizedProvider = String(provider || "").toUpperCase();
            const commissionPayment = await CommissionPaymentModel.create({
                vendorId: vendor._id,
                monthKey: month,
                year,
                month: monthNumber,
                grossEarnings: summary.grossEarnings,
                refundsAmount: summary.refundsAmount,
                netEarnings: summary.netEarnings,
                commissionRate: summary.commissionRate,
                amount,
                provider: normalizedProvider,
                status: PaymentStatus.INITIATED,
                createdBy: new mongoose.Types.ObjectId(req.auth!.sub),
            });

            if (normalizedProvider === "MOCK") {
                commissionPayment.payUrl = `mock://commission/${commissionPayment._id.toString()}`;
                await commissionPayment.save();
                res.status(201).json({
                    paymentId: commissionPayment._id.toString(),
                    payUrl: commissionPayment.payUrl,
                });
                return;
            }

            if (normalizedProvider === "KHALTI") {
                const secretKey = adminConfig.khalti?.secretKey;
                const mode = adminConfig.khalti?.mode ?? "sandbox";
                if (!secretKey) throw new BadRequestError("Admin Khalti keys are not configured");

                const payload = {
                    return_url: `${env.CLIENT_URL}/commission-payments/khalti?paymentId=${commissionPayment._id.toString()}`,
                    website_url: env.CLIENT_URL,
                    amount: Math.round(amount * 100),
                    purchase_order_id: commissionPayment._id.toString(),
                    purchase_order_name: `Commission ${vendor.businessName} ${month}`,
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
                    throw new BadRequestError("Failed to initiate Khalti commission payment");
                }
                const data = (await response.json()) as { pidx: string; payment_url?: string };
                commissionPayment.providerRef = data.pidx;
                commissionPayment.payUrl = data.payment_url;
                commissionPayment.providerMeta = { mode, payload };
                await commissionPayment.save();
                res.status(201).json({
                    paymentId: commissionPayment._id.toString(),
                    payUrl: commissionPayment.payUrl,
                });
                return;
            }

            if (normalizedProvider === "ESEWA") {
                const merchantCode = adminConfig.esewa?.merchantCode;
                const secretKey = adminConfig.esewa?.secretKey;
                const mode = adminConfig.esewa?.mode ?? "sandbox";
                if (!merchantCode || !secretKey) {
                    throw new BadRequestError("Admin eSewa keys are not configured");
                }

                const transactionUuid = commissionPayment._id.toString();
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
                    success_url: `${env.CLIENT_URL}/commission-payments/esewa?paymentId=${commissionPayment._id.toString()}`,
                    failure_url: `${env.CLIENT_URL}/commission-payments/esewa?paymentId=${commissionPayment._id.toString()}&status=failed`,
                    signed_field_names: "total_amount,transaction_uuid,product_code",
                    signature,
                };

                commissionPayment.providerRef = transactionUuid;
                commissionPayment.payUrl = ESEWA_FORM_URLS[mode];
                commissionPayment.providerMeta = { mode, formData };
                await commissionPayment.save();
                res.status(201).json({
                    paymentId: commissionPayment._id.toString(),
                    payUrl: commissionPayment.payUrl,
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
 * /api/vendors/me/commissions/payments/{id}/confirm:
 *   post:
 *     tags: [Vendor Commissions]
 *     summary: Confirm a commission payment to admin
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
vendorCommissionsRoutes.post(
    "/me/commissions/payments/:id/confirm",
    requireAuth,
    requireRole(UserRole.VENDOR),
    async (req, res, next) => {
        try {
            const id = String(req.params.id);
            if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Commission payment not found");

            const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
            if (!vendor) throw new NotFoundError("Vendor profile not found");

            const commissionPayment = await CommissionPaymentModel.findOne({
                _id: id,
                vendorId: vendor._id,
            });
            if (!commissionPayment) throw new NotFoundError("Commission payment not found");

            if (commissionPayment.status === PaymentStatus.PAID) {
                return res.json(commissionPayment.toObject());
            }

            const adminConfig = await AdminPaymentConfigModel.findOne({ key: "default" }).lean();
            if (!adminConfig) throw new BadRequestError("Admin payment configuration is missing");

            const provider = String(commissionPayment.provider || "").toUpperCase();
            if (provider !== "MOCK") {
                if (provider === "KHALTI") {
                    const secretKey = adminConfig.khalti?.secretKey;
                    const mode = adminConfig.khalti?.mode ?? "sandbox";
                    if (!secretKey) throw new BadRequestError("Admin Khalti keys are not configured");
                    if (!commissionPayment.providerRef) {
                        throw new BadRequestError("Missing Khalti payment reference");
                    }

                    const response = await fetch(KHALTI_LOOKUP_URLS[mode], {
                        method: "POST",
                        headers: {
                            Authorization: `Key ${secretKey}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ pidx: commissionPayment.providerRef }),
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
                    const merchantCode = adminConfig.esewa?.merchantCode;
                    const mode = adminConfig.esewa?.mode ?? "sandbox";
                    if (!merchantCode) throw new BadRequestError("Admin eSewa keys are not configured");
                    if (!commissionPayment.providerRef) {
                        throw new BadRequestError("Missing eSewa payment reference");
                    }
                    const meta = commissionPayment.providerMeta as
                        | { formData?: Record<string, string> }
                        | undefined;
                    const totalAmount = meta?.formData?.total_amount ?? commissionPayment.amount.toFixed(2);
                    const url = new URL(ESEWA_STATUS_URLS[mode]);
                    url.searchParams.set("product_code", merchantCode);
                    url.searchParams.set("total_amount", totalAmount);
                    url.searchParams.set("transaction_uuid", commissionPayment.providerRef);
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

            commissionPayment.status = PaymentStatus.PAID;
            commissionPayment.paidAt = new Date();
            await commissionPayment.save();

            await createNotification({
                userId: vendor.userId.toString(),
                type: NotificationType.SYSTEM,
                title: "Commission payment confirmed",
                body: `Your ${commissionPayment.monthKey} commission payment has been confirmed.`,
                link: "/vendor/payments",
            });

            await createNotificationsForAdmins({
                type: NotificationType.SYSTEM,
                title: "Commission payment received",
                body: `${vendor.businessName} paid NPR ${commissionPayment.amount} for ${commissionPayment.monthKey}.`,
                link: "/admin/commissions",
            });

            res.json(commissionPayment.toObject());
        } catch (err) {
            next(err);
        }
    },
);
