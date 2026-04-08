import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { UserRole } from "../../common/enums.js";
import { NotFoundError } from "../../common/errors.js";
import { validateBody } from "../../middlewares/validate.js";
import { ReportModel } from "./report.model.js";
import { AdminUpdateReportSchema, ReportListQuerySchema } from "./reports.schemas.js";
import { UserModel } from "../auth/user.model.js";
import { VendorModel } from "../vendors/vendor.model.js";

export const adminReportsRoutes = Router();

/**
 * @openapi
 * /api/admin/reports:
 *   get:
 *     tags: [Admin]
 *     summary: List reports (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
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
adminReportsRoutes.get(
    "/reports",
    requireAuth,
    requireRole(UserRole.ADMIN),
    async (req, res, next) => {
        try {
            const q = ReportListQuerySchema.parse(req.query);
            const skip = (q.page - 1) * q.limit;

            const filter: Record<string, unknown> = {};
            if (q.status) filter.status = q.status;

            const [items, total, reporters, vendors] = await Promise.all([
                ReportModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(q.limit).lean(),
                ReportModel.countDocuments(filter),
                UserModel.find({}).select({ fullName: 1, email: 1 }).lean(),
                VendorModel.find({}).select({ businessName: 1 }).lean(),
            ]);

            const reporterMap = new Map(reporters.map((user) => [user._id.toString(), user]));
            const vendorMap = new Map(vendors.map((vendor) => [vendor._id.toString(), vendor]));

            const enriched = items.map((item) => ({
                _id: item._id.toString(),
                targetType: item.targetType,
                targetId: item.targetId.toString(),
                reason: item.reason,
                reporterId: item.createdBy.toString(),
                reporterName:
                    reporterMap.get(item.createdBy.toString())?.fullName ||
                    reporterMap.get(item.createdBy.toString())?.email ||
                    "User",
                targetName:
                    item.targetType.toLowerCase() === "vendor"
                        ? vendorMap.get(item.targetId.toString())?.businessName || "Vendor"
                        : `${item.targetType} ${item.targetId.toString()}`,
                status: item.status,
                createdAt: item.createdAt?.toISOString(),
                updatedAt: item.updatedAt?.toISOString(),
            }));

            res.json({ items: enriched, page: q.page, limit: q.limit, total });
        } catch (err) {
            next(err);
        }
    },
);

/**
 * @openapi
 * /api/admin/reports/{id}:
 *   patch:
 *     tags: [Admin]
 *     summary: Update report status (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [OPEN, REVIEWED, RESOLVED]
 *     responses:
 *       200: { description: OK }
 */
adminReportsRoutes.patch(
    "/reports/:id",
    requireAuth,
    requireRole(UserRole.ADMIN),
    validateBody(AdminUpdateReportSchema),
    async (req, res, next) => {
        try {
            const id = String(req.params.id);
            if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Report not found");

            const updated = await ReportModel.findByIdAndUpdate(
                id,
                { $set: { status: req.body.status } },
                { new: true },
            ).lean();

            if (!updated) throw new NotFoundError("Report not found");

            res.json({
                _id: updated._id.toString(),
                targetType: updated.targetType,
                targetId: updated.targetId.toString(),
                reason: updated.reason,
                reporterId: updated.createdBy.toString(),
                status: updated.status,
                createdAt: updated.createdAt?.toISOString(),
                updatedAt: updated.updatedAt?.toISOString(),
            });
        } catch (err) {
            next(err);
        }
    },
);
