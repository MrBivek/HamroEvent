import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { UserRole } from "../../common/enums.js";
import { NotFoundError } from "../../common/errors.js";
import { VendorModel } from "../vendors/vendor.model.js";
import { ReviewModel } from "./review.model.js";
import { ReviewListQuerySchema } from "./reviews.schemas.js";

export const vendorReviewsRoutes = Router();

/**
 * @openapi
 * /api/vendors/me/reviews:
 *   get:
 *     tags: [Reviews]
 *     summary: List my vendor reviews (Vendor only)
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
vendorReviewsRoutes.get("/me/reviews", requireAuth, requireRole(UserRole.VENDOR), async (req, res, next) => {
  try {
    const q = ReviewListQuerySchema.parse(req.query);
    const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
    if (!vendor) throw new NotFoundError("Vendor profile not found");

    const skip = (q.page - 1) * q.limit;

    const [items, total] = await Promise.all([
      ReviewModel.find({ vendorId: vendor._id }).sort({ createdAt: -1 }).skip(skip).limit(q.limit).lean(),
      ReviewModel.countDocuments({ vendorId: vendor._id }),
    ]);

    res.json({ items, page: q.page, limit: q.limit, total });
  } catch (err) {
    next(err);
  }
});
