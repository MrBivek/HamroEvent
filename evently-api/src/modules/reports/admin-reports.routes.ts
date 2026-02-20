import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { UserRole } from "../../common/enums.js";
import { ReportModel } from "./report.model.js";
import { ReportListQuerySchema } from "./reports.schemas.js";

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
adminReportsRoutes.get("/reports", requireAuth, requireRole(UserRole.ADMIN), async (req, res, next) => {
  try {
    const q = ReportListQuerySchema.parse(req.query);
    const skip = (q.page - 1) * q.limit;

    const filter: Record<string, unknown> = {};
    if (q.status) filter.status = q.status;

    const [items, total] = await Promise.all([
      ReportModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(q.limit).lean(),
      ReportModel.countDocuments(filter),
    ]);

    res.json({ items, page: q.page, limit: q.limit, total });
  } catch (err) {
    next(err);
  }
});
