import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { UserRole } from "../../common/enums.js";
import { BadRequestError } from "../../common/errors.js";
import { FavoriteModel } from "./favorite.model.js";
import { FavoriteListQuerySchema } from "./favorites.schemas.js";

export const favoritesRoutes = Router();

/**
 * @openapi
 * /api/favorites/vendors/{vendorId}:
 *   post:
 *     tags: [Favorites]
 *     summary: Add vendor to favorites (Customer only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: vendorId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
favoritesRoutes.post(
  "/vendors/:vendorId",
  requireAuth,
  requireRole(UserRole.CUSTOMER),
  async (req, res, next) => {
    try {
      const vendorId = String(req.params.vendorId);
      if (!mongoose.isValidObjectId(vendorId)) throw new BadRequestError("Invalid vendorId");

      await FavoriteModel.updateOne(
        { userId: req.auth!.sub, vendorId },
        { $set: { userId: req.auth!.sub, vendorId } },
        { upsert: true },
      );

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /api/favorites/vendors/{vendorId}:
 *   delete:
 *     tags: [Favorites]
 *     summary: Remove vendor from favorites (Customer only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: vendorId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
favoritesRoutes.delete(
  "/vendors/:vendorId",
  requireAuth,
  requireRole(UserRole.CUSTOMER),
  async (req, res, next) => {
    try {
      const vendorId = String(req.params.vendorId);
      if (!mongoose.isValidObjectId(vendorId)) throw new BadRequestError("Invalid vendorId");

      const result = await FavoriteModel.deleteOne({ userId: req.auth!.sub, vendorId });
      res.json({ deleted: result.deletedCount === 1 });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /api/favorites:
 *   get:
 *     tags: [Favorites]
 *     summary: List my favorites (Customer only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: number, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: number, default: 20 }
 *     responses:
 *       200: { description: OK }
 */
favoritesRoutes.get("/", requireAuth, requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    const q = FavoriteListQuerySchema.parse(req.query);
    const skip = (q.page - 1) * q.limit;

    const [items, total] = await Promise.all([
      FavoriteModel.find({ userId: req.auth!.sub, vendorId: { $exists: true } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(q.limit)
        .lean(),
      FavoriteModel.countDocuments({ userId: req.auth!.sub, vendorId: { $exists: true } }),
    ]);

    res.json({ items, page: q.page, limit: q.limit, total });
  } catch (err) {
    next(err);
  }
});
