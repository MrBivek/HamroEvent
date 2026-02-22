import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { UserRole, BookingStatus } from "../../common/enums.js";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import { ReviewModel } from "./review.model.js";
import { CreateReviewSchema, ReviewListQuerySchema } from "./reviews.schemas.js";
import { BookingModel } from "../bookings/booking.model.js";
import { VendorModel } from "../vendors/vendor.model.js";

export const reviewsRoutes = Router();

/**
 * @openapi
 * /api/reviews:
 *   post:
 *     tags: [Reviews]
 *     summary: Create a review (Customer only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId, rating]
 *             properties:
 *               bookingId: { type: string }
 *               rating: { type: number, example: 5 }
 *               comment: { type: string }
 *     responses:
 *       201: { description: Created }
 */
reviewsRoutes.post(
  "/",
  requireAuth,
  requireRole(UserRole.CUSTOMER),
  validateBody(CreateReviewSchema),
  async (req, res, next) => {
    try {
      const { bookingId, rating, comment } = req.body;
      if (!mongoose.isValidObjectId(bookingId)) throw new BadRequestError("Invalid bookingId");

      const booking = await BookingModel.findOne({ _id: bookingId, userId: req.auth!.sub }).lean();
      if (!booking) throw new NotFoundError("Booking not found");

      if (booking.status !== BookingStatus.COMPLETED) {
        throw new BadRequestError("Reviews can only be submitted after completed bookings");
      }

      const exists = await ReviewModel.findOne({
        bookingId: new mongoose.Types.ObjectId(bookingId),
      }).lean();
      if (exists) throw new BadRequestError("Review already exists for this booking");

      const review = await ReviewModel.create({
        bookingId: new mongoose.Types.ObjectId(bookingId),
        vendorId: booking.vendorId,
        customerId: booking.userId,
        rating,
        comment,
      });

      const vendor = await VendorModel.findById(booking.vendorId).lean();
      if (vendor) {
        const newCount = (vendor.ratingCount ?? 0) + 1;
        const newAvg = ((vendor.ratingAvg ?? 0) * (vendor.ratingCount ?? 0) + rating) / newCount;
        await VendorModel.updateOne(
          { _id: vendor._id },
          { $set: { ratingAvg: Number(newAvg.toFixed(2)), ratingCount: newCount } },
        );
      }

      res.status(201).json(review);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /api/reviews:
 *   get:
 *     tags: [Reviews]
 *     summary: List reviews (public)
 *     parameters:
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
reviewsRoutes.get("/", async (req, res, next) => {
  try {
    const q = ReviewListQuerySchema.parse(req.query);
    const skip = (q.page - 1) * q.limit;

    const filter: Record<string, unknown> = { isHidden: { $ne: true } };
    if (q.vendorId && mongoose.isValidObjectId(q.vendorId)) {
      filter.vendorId = new mongoose.Types.ObjectId(q.vendorId);
    }

    const [items, total] = await Promise.all([
      ReviewModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(q.limit).lean(),
      ReviewModel.countDocuments(filter),
    ]);

    res.json({ items, page: q.page, limit: q.limit, total });
  } catch (err) {
    next(err);
  }
});
