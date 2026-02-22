import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { UserRole, PaymentStatus, BookingStatus } from "../../common/enums.js";
import { BadRequestError, NotFoundError, ForbiddenError } from "../../common/errors.js";
import { RefundModel } from "./refund.model.js";
import { PaymentModel } from "./payment.model.js";
import { BookingModel } from "../bookings/booking.model.js";
import { VendorModel } from "../vendors/vendor.model.js";
import { CreateRefundSchema, RefundListQuerySchema } from "./payments.schemas.js";
import { createAuditLog } from "../audit-logs/audit-logs.service.js";

export const refundsRoutes = Router();

/**
 * @openapi
 * /api/refunds:
 *   post:
 *     tags: [Payments]
 *     summary: Create a refund (Admin/Vendor)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentId, amount]
 *             properties:
 *               paymentId: { type: string }
 *               amount: { type: number }
 *               reason: { type: string }
 *     responses:
 *       201: { description: Created }
 */
refundsRoutes.post(
  "/",
  requireAuth,
  requireRole(UserRole.ADMIN, UserRole.VENDOR),
  validateBody(CreateRefundSchema),
  async (req, res, next) => {
    try {
      const { paymentId, amount, reason } = req.body;
      if (!mongoose.isValidObjectId(paymentId)) throw new BadRequestError("Invalid paymentId");

      const payment = await PaymentModel.findById(paymentId);
      if (!payment) throw new NotFoundError("Payment not found");

      if (payment.status === PaymentStatus.REFUNDED) {
        throw new BadRequestError("Payment already refunded");
      }

      const booking = await BookingModel.findById(payment.bookingId).lean();
      if (!booking) throw new NotFoundError("Booking not found");

      if (req.auth!.role === UserRole.VENDOR) {
        const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
        if (!vendor) throw new NotFoundError("Vendor profile not found");
        if (booking.vendorId.toString() !== vendor._id.toString()) {
          throw new ForbiddenError("Not allowed to refund this payment");
        }
      }

      payment.status = PaymentStatus.REFUNDED;
      await payment.save();

      await BookingModel.updateOne(
        { _id: booking._id },
        { $set: { status: BookingStatus.CANCELLED } },
      );

      const refund = await RefundModel.create({
        paymentId: payment._id,
        bookingId: booking._id,
        amount,
        reason,
        createdBy: new mongoose.Types.ObjectId(req.auth!.sub),
      });

      await createAuditLog({
        actorUserId: req.auth!.sub,
        action: "PAYMENT_REFUND",
        targetType: "Payment",
        targetId: payment._id,
        metadata: { amount, reason: reason ?? null, bookingId: booking._id.toString() },
      });

      res.status(201).json(refund);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /api/refunds:
 *   get:
 *     tags: [Payments]
 *     summary: List refunds (Admin/Vendor)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: bookingId
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
refundsRoutes.get(
  "/",
  requireAuth,
  requireRole(UserRole.ADMIN, UserRole.VENDOR),
  async (req, res, next) => {
    try {
      const q = RefundListQuerySchema.parse(req.query);
      const skip = (q.page - 1) * q.limit;

      const filter: Record<string, unknown> = {};

      if (q.bookingId) {
        if (!mongoose.isValidObjectId(q.bookingId)) throw new BadRequestError("Invalid bookingId");
        filter.bookingId = new mongoose.Types.ObjectId(q.bookingId);
      }

      if (req.auth!.role === UserRole.VENDOR) {
        const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
        if (!vendor) throw new NotFoundError("Vendor profile not found");

        const bookingIds = await BookingModel.find({ vendorId: vendor._id }, { _id: 1 }).lean();
        const allowedIds = bookingIds.map((b) => b._id.toString());
        if (filter.bookingId) {
          if (!allowedIds.includes((filter.bookingId as mongoose.Types.ObjectId).toString())) {
            filter.bookingId = { $in: [] };
          }
        } else {
          filter.bookingId = { $in: bookingIds.map((b) => b._id) };
        }
      }

      const [items, total] = await Promise.all([
        RefundModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(q.limit).lean(),
        RefundModel.countDocuments(filter),
      ]);

      res.json({ items, page: q.page, limit: q.limit, total });
    } catch (err) {
      next(err);
    }
  },
);
