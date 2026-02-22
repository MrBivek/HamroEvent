import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { UserRole, QuoteStatus, BookingStatus } from "../../common/enums.js";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import { QuoteModel } from "./quote.model.js";
import { QuoteListQuerySchema } from "./quotes.schemas.js";
import { BookingModel } from "../bookings/booking.model.js";

export const quotesRoutes = Router();

/**
 * @openapi
 * /api/quotes:
 *   get:
 *     tags: [Quotes]
 *     summary: List my quotes (Customer only)
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
quotesRoutes.get("/", requireAuth, requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    const q = QuoteListQuerySchema.parse(req.query);
    const skip = (q.page - 1) * q.limit;

    const filter: Record<string, unknown> = { customerId: req.auth!.sub };
    if (q.status) filter.status = q.status;

    const [items, total] = await Promise.all([
      QuoteModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(q.limit).lean(),
      QuoteModel.countDocuments(filter),
    ]);

    res.json({ items, page: q.page, limit: q.limit, total });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/quotes/{id}/accept:
 *   post:
 *     tags: [Quotes]
 *     summary: Accept a quote (Customer only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
quotesRoutes.post(
  "/:id/accept",
  requireAuth,
  requireRole(UserRole.CUSTOMER),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Quote not found");

      const quote = await QuoteModel.findOne({ _id: id, customerId: req.auth!.sub });
      if (!quote) throw new NotFoundError("Quote not found");

      if (quote.status !== QuoteStatus.PENDING) {
        throw new BadRequestError("Only PENDING quotes can be accepted");
      }

      if (quote.expiresAt && quote.expiresAt < new Date()) {
        throw new BadRequestError("Quote has expired");
      }

      quote.status = QuoteStatus.ACCEPTED;
      await quote.save();

      await BookingModel.updateOne(
        { _id: quote.bookingId },
        {
          $set: { status: BookingStatus.CONFIRMED_PENDING_PAYMENT },
          $push: {
            history: {
              status: "accepted",
              byRole: "customer",
              at: new Date(),
              note: "Quote accepted",
            },
          },
        },
      );

      res.json(quote.toObject());
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /api/quotes/{id}/reject:
 *   post:
 *     tags: [Quotes]
 *     summary: Reject a quote (Customer only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
quotesRoutes.post(
  "/:id/reject",
  requireAuth,
  requireRole(UserRole.CUSTOMER),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Quote not found");

      const quote = await QuoteModel.findOne({ _id: id, customerId: req.auth!.sub });
      if (!quote) throw new NotFoundError("Quote not found");

      if (quote.status !== QuoteStatus.PENDING) {
        throw new BadRequestError("Only PENDING quotes can be rejected");
      }

      quote.status = QuoteStatus.REJECTED;
      await quote.save();

      await BookingModel.updateOne(
        { _id: quote.bookingId },
        {
          $set: { status: BookingStatus.CANCELLED },
          $push: {
            history: {
              status: "cancelled",
              byRole: "customer",
              at: new Date(),
              note: "Quote rejected",
            },
          },
        },
      );

      res.json(quote.toObject());
    } catch (err) {
      next(err);
    }
  },
);
