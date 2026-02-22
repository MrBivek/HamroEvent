import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { UserRole } from "../../common/enums.js";
import { BadRequestError } from "../../common/errors.js";
import { FavoriteModel } from "./favorite.model.js";
import { FavoriteListQuerySchema } from "./favorites.schemas.js";
import { VendorModel } from "../vendors/vendor.model.js";
import { UserModel } from "../auth/user.model.js";
import { CategoryModel } from "../categories/category.model.js";
import { LocationModel } from "../locations/location.model.js";
import { buildVendorProfile } from "../../common/dtos.js";

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

    const vendorIds = items
      .map((f) => f.vendorId)
      .filter((id): id is mongoose.Types.ObjectId => Boolean(id));
    const vendors = vendorIds.length
      ? await VendorModel.find({ _id: { $in: vendorIds } }).lean()
      : [];
    const categoryIds = vendors
      .map((v) => v.categoryId)
      .filter((id): id is mongoose.Types.ObjectId => Boolean(id));
    const locationIds = vendors
      .map((v) => v.primaryLocationId)
      .filter((id): id is mongoose.Types.ObjectId => Boolean(id));
    const [categories, locations, users] = await Promise.all([
      categoryIds.length
        ? CategoryModel.find({ _id: { $in: categoryIds } }).lean()
        : Promise.resolve([]),
      locationIds.length
        ? LocationModel.find({ _id: { $in: locationIds } }).lean()
        : Promise.resolve([]),
      UserModel.find({ _id: { $in: vendors.map((v) => v.userId) } }).lean(),
    ]);
    const categoryMap = new Map(categories.map((c) => [c._id.toString(), c]));
    const locationMap = new Map(locations.map((l) => [l._id.toString(), l]));
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));
    const vendorMap = new Map(vendors.map((v) => [v._id.toString(), v]));

    const mapped = items.map((fav) => {
      if (!fav.vendorId) return null;
      const vendor = vendorMap.get(fav.vendorId.toString());
      if (!vendor) return null;
      const category = vendor.categoryId ? categoryMap.get(vendor.categoryId.toString()) : null;
      const location = vendor.primaryLocationId
        ? locationMap.get(vendor.primaryLocationId.toString())
        : null;
      const user = userMap.get(vendor.userId.toString());
      return buildVendorProfile({
        vendor,
        user,
        category,
        location,
        packages: [],
        documents: [],
        includePackages: false,
      });
    });

    res.json({ items: mapped.filter(Boolean), page: q.page, limit: q.limit, total });
  } catch (err) {
    next(err);
  }
});
