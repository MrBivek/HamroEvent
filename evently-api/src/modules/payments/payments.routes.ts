import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { UserRole, BookingStatus, PaymentStatus, NotificationType } from "../../common/enums.js";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import { PaymentModel } from "./payment.model.js";
import { BookingModel } from "../bookings/booking.model.js";
import { VendorModel } from "../vendors/vendor.model.js";
import { CreatePaymentSchema, PaymentListQuerySchema } from "./payments.schemas.js";
import { createNotification } from "../notifications/notifications.service.js";

export const paymentsRoutes = Router();

/**
 * @openapi
 * /api/payments:
 *   post:
 *     tags: [Payments]
 *     summary: Initiate payment (Customer only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId, amount, provider]
 *             properties:
 *               bookingId: { type: string }
 *               amount: { type: number }
 *               provider: { type: string, example: "MOCK" }
 *     responses:
 *       201: { description: Created }
 */
paymentsRoutes.post(
  "/",
  requireAuth,
  requireRole(UserRole.CUSTOMER),
  validateBody(CreatePaymentSchema),
  async (req, res, next) => {
    try {
      const { bookingId, amount, provider } = req.body;
      if (!mongoose.isValidObjectId(bookingId)) throw new BadRequestError("Invalid bookingId");

      const booking = await BookingModel.findOne({ _id: bookingId, userId: req.auth!.sub }).lean();
      if (!booking) throw new NotFoundError("Booking not found");

      const allowed: BookingStatus[] = [
        BookingStatus.ACCEPTED,
        BookingStatus.CONFIRMED_PENDING_PAYMENT,
      ];
      if (!allowed.includes(booking.status as BookingStatus)) {
        throw new BadRequestError(
          "Payment is only allowed for accepted bookings or accepted quotes",
        );
      }

      const payment = await PaymentModel.create({
        bookingId: new mongoose.Types.ObjectId(bookingId),
        userId: new mongoose.Types.ObjectId(req.auth!.sub),
        amount,
        provider,
        status: PaymentStatus.INITIATED,
      });

      payment.payUrl = `mock://pay/${payment._id.toString()}`;
      await payment.save();

      res.status(201).json({ paymentId: payment._id.toString(), payUrl: payment.payUrl });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /api/payments/{id}/confirm:
 *   post:
 *     tags: [Payments]
 *     summary: Confirm payment (Customer only, mock)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
paymentsRoutes.post(
  "/:id/confirm",
  requireAuth,
  requireRole(UserRole.CUSTOMER),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Payment not found");

      const payment = await PaymentModel.findOne({ _id: id, userId: req.auth!.sub });
      if (!payment) throw new NotFoundError("Payment not found");

      if (payment.status === PaymentStatus.PAID)
        throw new BadRequestError("Payment already confirmed");
      if (payment.status === PaymentStatus.REFUNDED)
        throw new BadRequestError("Payment is refunded");

      payment.status = PaymentStatus.PAID;
      payment.paidAt = new Date();
      await payment.save();

      const booking = await BookingModel.findByIdAndUpdate(
        payment.bookingId,
        {
          $set: { status: BookingStatus.CONFIRMED },
          $push: {
            history: {
              status: "confirmed",
              byRole: "customer",
              at: new Date(),
              note: "Payment confirmed",
            },
          },
        },
        { new: true },
      ).lean();

      if (booking) {
        await createNotification({
          userId: booking.userId.toString(),
          type: NotificationType.BOOKING_CONFIRMED,
          title: "Booking confirmed",
          body: "Your booking has been confirmed.",
          link: `/customer/bookings/${booking._id.toString()}`,
        });

        const vendor = await VendorModel.findById(booking.vendorId).lean();
        if (vendor) {
          await createNotification({
            userId: vendor.userId.toString(),
            type: NotificationType.PAYMENT_RECEIVED,
            title: "Payment received",
            body: "You received a booking payment.",
            link: "/vendor/bookings",
          });
        }
      }

      res.json(payment.toObject());
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /api/payments:
 *   get:
 *     tags: [Payments]
 *     summary: List my payments (Customer only)
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
paymentsRoutes.get("/", requireAuth, requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    const q = PaymentListQuerySchema.parse(req.query);
    const skip = (q.page - 1) * q.limit;

    const filter: Record<string, unknown> = { userId: req.auth!.sub };
    if (q.bookingId) {
      if (!mongoose.isValidObjectId(q.bookingId)) throw new BadRequestError("Invalid bookingId");
      filter.bookingId = new mongoose.Types.ObjectId(q.bookingId);
    }

    const [items, total] = await Promise.all([
      PaymentModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(q.limit).lean(),
      PaymentModel.countDocuments(filter),
    ]);

    res.json({ items, page: q.page, limit: q.limit, total });
  } catch (err) {
    next(err);
  }
});
