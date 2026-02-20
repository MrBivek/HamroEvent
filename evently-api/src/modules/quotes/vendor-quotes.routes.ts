import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { UserRole, BookingStatus, QuoteStatus } from "../../common/enums.js";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import { VendorModel } from "../vendors/vendor.model.js";
import { BookingModel } from "../bookings/booking.model.js";
import { QuoteModel } from "./quote.model.js";
import { CreateQuoteSchema, UpdateQuoteSchema } from "./quotes.schemas.js";

export const vendorQuotesRoutes = Router();

/**
 * @openapi
 * /api/vendors/me/bookings/{id}/quote:
 *   post:
 *     tags: [Quotes]
 *     summary: Send a quote for a booking (Vendor only)
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
 *             required: [amount]
 *             properties:
 *               amount: { type: number }
 *               message: { type: string }
 *               expiresAt: { type: string }
 *     responses:
 *       201: { description: Created }
 *       400: { description: Invalid request }
 */
vendorQuotesRoutes.post(
  "/me/bookings/:id/quote",
  requireAuth,
  requireRole(UserRole.VENDOR),
  validateBody(CreateQuoteSchema),
  async (req, res, next) => {
    try {
      const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
      if (!vendor) throw new NotFoundError("Vendor profile not found");

      const id = String(req.params.id);
      if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Booking not found");

      const booking = await BookingModel.findOne({ _id: id, vendorId: vendor._id });
      if (!booking) throw new NotFoundError("Booking not found");

      const allowed: BookingStatus[] = [BookingStatus.REQUESTED, BookingStatus.ACCEPTED];
      if (!allowed.includes(booking.status as BookingStatus)) {
        throw new BadRequestError("Quotes can only be created for REQUESTED or ACCEPTED bookings");
      }

      const existing = await QuoteModel.findOne({ bookingId: booking._id }).lean();
      if (existing) {
        throw new BadRequestError("A quote already exists for this booking");
      }

      const quote = await QuoteModel.create({
        bookingId: booking._id,
        vendorId: vendor._id,
        customerId: booking.userId,
        amount: req.body.amount,
        message: req.body.message,
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
        status: QuoteStatus.PENDING,
      });

      if (booking.status === BookingStatus.REQUESTED) {
        booking.status = BookingStatus.ACCEPTED;
        await booking.save();
      }

      res.status(201).json(quote);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /api/vendors/me/quotes/{id}:
 *   patch:
 *     tags: [Quotes]
 *     summary: Update a quote (Vendor only, pending only)
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
 *             properties:
 *               amount: { type: number }
 *               message: { type: string }
 *               expiresAt: { type: string }
 *     responses:
 *       200: { description: OK }
 */
vendorQuotesRoutes.patch(
  "/me/quotes/:id",
  requireAuth,
  requireRole(UserRole.VENDOR),
  validateBody(UpdateQuoteSchema),
  async (req, res, next) => {
    try {
      const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
      if (!vendor) throw new NotFoundError("Vendor profile not found");

      const id = String(req.params.id);
      if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Quote not found");

      const quote = await QuoteModel.findOne({ _id: id, vendorId: vendor._id });
      if (!quote) throw new NotFoundError("Quote not found");

      if (quote.status !== QuoteStatus.PENDING) {
        throw new BadRequestError("Only PENDING quotes can be updated");
      }

      if (req.body.amount !== undefined) quote.amount = req.body.amount;
      if (req.body.message !== undefined) quote.message = req.body.message;
      if (req.body.expiresAt !== undefined) quote.expiresAt = new Date(req.body.expiresAt);

      await quote.save();
      res.json(quote.toObject());
    } catch (err) {
      next(err);
    }
  },
);
