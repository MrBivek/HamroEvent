import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { UserRole } from "../../common/enums.js";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import { VendorPaymentConfigSchema } from "./payments.schemas.js";
import { CommissionMonthQuerySchema } from "./commissions.schemas.js";
import { AdminPaymentConfigModel } from "./admin-payment-config.model.js";
import { VendorModel } from "../vendors/vendor.model.js";
import { CommissionPaymentModel } from "./commission-payment.model.js";
import { buildVendorCommissionSummary, parseMonthKey } from "./commission.service.js";

export const adminCommissionsRoutes = Router();

/**
 * @openapi
 * /api/admin/payments/config:
 *   get:
 *     tags: [Admin Payments]
 *     summary: Get admin payment configuration
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
adminCommissionsRoutes.get(
    "/payments/config",
    requireAuth,
    requireRole(UserRole.ADMIN),
    async (_req, res, next) => {
        try {
            const config = await AdminPaymentConfigModel.findOne({ key: "default" }).lean();
            res.json(config || null);
        } catch (err) {
            next(err);
        }
    },
);

/**
 * @openapi
 * /api/admin/payments/config:
 *   put:
 *     tags: [Admin Payments]
 *     summary: Update admin payment configuration
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
 *               esewa:
 *                 type: object
 *     responses:
 *       200: { description: OK }
 */
adminCommissionsRoutes.put(
    "/payments/config",
    requireAuth,
    requireRole(UserRole.ADMIN),
    validateBody(VendorPaymentConfigSchema),
    async (req, res, next) => {
        try {
            const existing = await AdminPaymentConfigModel.findOne({ key: "default" }).lean();
            const config = await AdminPaymentConfigModel.findOneAndUpdate(
                { key: "default" },
                {
                    $set: {
                        key: "default",
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
 * /api/admin/commissions/summary:
 *   get:
 *     tags: [Admin Commissions]
 *     summary: Get commission summary for a month
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: string, example: "2026-03" }
 *     responses:
 *       200: { description: OK }
 */
adminCommissionsRoutes.get(
    "/commissions/summary",
    requireAuth,
    requireRole(UserRole.ADMIN),
    async (req, res, next) => {
        try {
            const parsed = CommissionMonthQuerySchema.parse(req.query);
            const month = parsed.month;
            const { monthKey } = parseMonthKey(month);
            const vendors = await VendorModel.find({}).lean();
            const summaries = await Promise.all(
                vendors.map(async (vendor) => {
                    const summary = await buildVendorCommissionSummary(vendor._id, month);
                    return {
                        vendorId: vendor._id.toString(),
                        businessName: vendor.businessName,
                        ...summary,
                    };
                }),
            );

            const totals = summaries.reduce(
                (acc, item) => {
                    acc.grossEarnings += item.grossEarnings;
                    acc.refundsAmount += item.refundsAmount;
                    acc.netEarnings += item.netEarnings;
                    acc.commissionDue += item.commissionDue;
                    acc.commissionPaid += item.commissionPaid;
                    acc.commissionOutstanding += item.commissionOutstanding;
                    return acc;
                },
                {
                    grossEarnings: 0,
                    refundsAmount: 0,
                    netEarnings: 0,
                    commissionDue: 0,
                    commissionPaid: 0,
                    commissionOutstanding: 0,
                },
            );

            res.json({
                monthKey,
                commissionRate: 0.1,
                ...totals,
                vendors: summaries.sort((a, b) => b.commissionOutstanding - a.commissionOutstanding),
            });
        } catch (err) {
            next(err);
        }
    },
);

/**
 * @openapi
 * /api/admin/commissions/payments:
 *   get:
 *     tags: [Admin Commissions]
 *     summary: List vendor commission payments
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: string, example: "2026-03" }
 *       - in: query
 *         name: vendorId
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
adminCommissionsRoutes.get(
    "/commissions/payments",
    requireAuth,
    requireRole(UserRole.ADMIN),
    async (req, res, next) => {
        try {
            const parsed = CommissionMonthQuerySchema.parse(req.query);
            const filter: Record<string, unknown> = {};
            if (parsed.month) filter.monthKey = parsed.month;
            if (req.query.vendorId) {
                const vendorId = String(req.query.vendorId);
                if (!mongoose.isValidObjectId(vendorId)) throw new BadRequestError("Invalid vendorId");
                filter.vendorId = new mongoose.Types.ObjectId(vendorId);
            }

            const skip = (parsed.page - 1) * parsed.limit;
            const [items, total, vendors] = await Promise.all([
                CommissionPaymentModel.find(filter)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(parsed.limit)
                    .lean(),
                CommissionPaymentModel.countDocuments(filter),
                VendorModel.find({}).lean(),
            ]);

            const vendorMap = new Map(vendors.map((vendor) => [vendor._id.toString(), vendor]));

            res.json({
                items: items.map((item) => ({
                    _id: item._id.toString(),
                    vendorId: item.vendorId.toString(),
                    vendorName: vendorMap.get(item.vendorId.toString())?.businessName ?? "Vendor",
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
