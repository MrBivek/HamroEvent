import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { UserRole } from "../../common/enums.js";
import { AuditLogModel } from "./audit-log.model.js";
import { AuditLogListQuerySchema } from "./audit-logs.schemas.js";

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
auditLogsRoutes.get("/audit-logs", requireAuth, requireRole(UserRole.ADMIN), async (req, res, next) => {
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

    res.json({ items, page: q.page, limit: q.limit, total });
  } catch (err) {
    next(err);
  }
});
