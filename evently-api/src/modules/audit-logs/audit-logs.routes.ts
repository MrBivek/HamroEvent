import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { UserRole } from "../../common/enums.js";
import { AuditLogModel } from "./audit-log.model.js";
import { AuditLogListQuerySchema } from "./audit-logs.schemas.js";
import { UserModel } from "../auth/user.model.js";
import { VendorModel } from "../vendors/vendor.model.js";
import { ReviewModel } from "../reviews/review.model.js";

export const auditLogsRoutes = Router();

/**
 * @openapi
 * /api/admin/audit-logs:
 *   get:
 *     tags: [Admin]
 *     summary: List audit logs (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *       - in: query
 *         name: targetType
 *         schema: { type: string }
 *       - in: query
 *         name: targetId
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
auditLogsRoutes.get(
  "/audit-logs",
  requireAuth,
  requireRole(UserRole.ADMIN),
  async (req, res, next) => {
    try {
      const q = AuditLogListQuerySchema.parse(req.query);
      const skip = (q.page - 1) * q.limit;

      const filter: Record<string, unknown> = {};
      if (q.action) filter.action = q.action;
      if (q.targetType) filter.targetType = q.targetType;
      if (q.targetId && mongoose.isValidObjectId(q.targetId)) {
        filter.targetId = new mongoose.Types.ObjectId(q.targetId);
      }

      const [items, total] = await Promise.all([
        AuditLogModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(q.limit).lean(),
        AuditLogModel.countDocuments(filter),
      ]);
      const actorIds = items.map((i) => i.actorUserId);
      const [actors, vendors, reviews] = await Promise.all([
        UserModel.find({ _id: { $in: actorIds } }).lean(),
        VendorModel.find({ _id: { $in: items.map((i) => i.targetId) } }).lean(),
        ReviewModel.find({ _id: { $in: items.map((i) => i.targetId) } }).lean(),
      ]);
      const actorMap = new Map(actors.map((a) => [a._id.toString(), a]));
      const vendorMap = new Map(vendors.map((v) => [v._id.toString(), v]));
      const reviewMap = new Map(reviews.map((r) => [r._id.toString(), r]));

      const mapped = items.map((log) => {
        const actor = actorMap.get(log.actorUserId.toString());
        let target = log.targetId.toString();
        if (log.targetType === "Vendor") {
          target = vendorMap.get(log.targetId.toString())?.businessName ?? target;
        } else if (log.targetType === "Review") {
          target = `Review ${log.targetId.toString().slice(-6)}`;
        } else if (log.targetType === "User") {
          target = actorMap.get(log.targetId.toString())?.email ?? target;
        }
        return {
          id: log._id.toString(),
          action: log.action,
          actor: actor?.fullName ?? "Admin",
          target,
          type: log.targetType?.toLowerCase?.() ?? "system",
          at: log.createdAt?.toISOString(),
          metadata: log.metadata,
        };
      });

      res.json({ items: mapped, page: q.page, limit: q.limit, total });
    } catch (err) {
      next(err);
    }
  },
);
