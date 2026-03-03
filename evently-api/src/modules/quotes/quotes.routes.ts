import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { UserRole, QuoteStatus, BookingStatus } from "../../common/enums.js";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import { QuoteModel } from "./quote.model.js";
import { QuoteListQuerySchema } from "./quotes.schemas.js";
import { BookingModel } from "../bookings/booking.model.js";
import { VendorModel } from "../vendors/vendor.model.js";
import { buildQuoteDto } from "../../common/dtos.js";
import { mapBookingStatusToUi } from "../../common/mappers.js";
import { emitQuoteUpdate } from "../../socket.js";
import { sendQuoteApprovedEmails } from "./quotes.service.js";

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

        const mapped = items.map((quote) => buildQuoteDto(quote));
        res.json({ items: mapped, page: q.page, limit: q.limit, total });
    } catch (err) {
        next(err);
    }
});

/**
 * @openapi
 * /api/quotes/booking/{id}:
 *   get:
 *     tags: [Quotes]
 *     summary: Get quote for a booking (Customer or Vendor)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 */
quotesRoutes.get("/booking/:id", requireAuth, async (req, res, next) => {
    try {
        const id = String(req.params.id);
        if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Booking not found");

        const booking = await BookingModel.findById(id).lean();
        if (!booking) throw new NotFoundError("Booking not found");

        const role = req.auth!.role;
        if (role === UserRole.CUSTOMER) {
            if (booking.userId.toString() !== req.auth!.sub) {
                throw new NotFoundError("Booking not found");
            }
        } else if (role === UserRole.VENDOR) {
            const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
            if (!vendor || booking.vendorId.toString() !== vendor._id.toString()) {
                throw new NotFoundError("Booking not found");
            }
        } else {
            throw new NotFoundError("Booking not found");
        }

        const quote = await QuoteModel.findOne({ bookingId: booking._id }).lean();
        if (!quote) {
            return res.json(null);
        }

        res.json(buildQuoteDto(quote, mapBookingStatusToUi(booking.status)));
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

            quote.customerApproved = true;
            quote.lastUpdatedBy = UserRole.CUSTOMER;

            let bookingStatus: BookingStatus | undefined;
            const booking = await BookingModel.findById(quote.bookingId);
            let shouldNotify = false;
            if (booking) {
                bookingStatus = booking.status as BookingStatus;
                if (quote.vendorApproved) {
                    quote.status = QuoteStatus.ACCEPTED;
                    booking.status = BookingStatus.CONFIRMED_PENDING_PAYMENT;
                    const history = (booking.history ?? []) as any[];
                    history.push({
                        status: "accepted",
                        byRole: "customer",
                        at: new Date(),
                        note: "Quote accepted",
                    });
                    booking.history = history as any;
                    await booking.save();
                    shouldNotify = true;
                    bookingStatus = booking.status as BookingStatus;
                }
            }

            await quote.save();
            if (shouldNotify && booking) {
                await sendQuoteApprovedEmails({ quote, booking });
            }
            const dto = buildQuoteDto(
                quote,
                bookingStatus ? mapBookingStatusToUi(bookingStatus) : undefined,
            );
            if (booking) {
                const vendor = await VendorModel.findById(booking.vendorId).lean();
                if (vendor) {
                    emitQuoteUpdate(
                        [quote.customerId.toString(), vendor.userId.toString()],
                        dto,
                    );
                }
            }
            res.json(dto);
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
            quote.customerApproved = false;
            quote.vendorApproved = false;
            await quote.save();

            const booking = await BookingModel.findById(quote.bookingId).lean();
            const dto = buildQuoteDto(
                quote,
                booking ? mapBookingStatusToUi(booking.status) : undefined,
            );
            if (booking) {
                const vendor = await VendorModel.findById(booking.vendorId).lean();
                if (vendor) {
                    emitQuoteUpdate(
                        [quote.customerId.toString(), vendor.userId.toString()],
                        dto,
                    );
                }
            }
            res.json(dto);
        } catch (err) {
            next(err);
        }
    },
);
