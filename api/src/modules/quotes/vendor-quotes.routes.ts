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
import { PackageModel } from "../packages/package.model.js";
import { buildQuoteDto } from "../../common/dtos.js";
import { mapBookingStatusToUi } from "../../common/mappers.js";
import { emitBookingUpdate, emitQuoteUpdate } from "../../socket.js";
import { sendQuoteApprovedEmails } from "./quotes.service.js";

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
 *               packageInclusions:
 *                 type: array
 *                 items: { type: string }
 *               customInclusions:
 *                 type: array
 *                 items: { type: string }
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

            const allowed: BookingStatus[] = [BookingStatus.REQUESTED];
            if (!allowed.includes(booking.status as BookingStatus)) {
                throw new BadRequestError("Quotes can only be created while booking is pending");
            }

            const existing = await QuoteModel.findOne({ bookingId: booking._id }).lean();
            if (existing) {
                throw new BadRequestError("A quote already exists for this booking");
            }

            if (booking.packageId && req.body.packageInclusions?.length) {
                const pkg = await PackageModel.findById(booking.packageId).lean();
                if (pkg) {
                    const allowed = new Set(
                        (pkg.includes ?? []).map((item: string) => item.trim()),
                    );
                    const invalid = req.body.packageInclusions.filter(
                        (item: string) => !allowed.has(item.trim()),
                    );
                    if (invalid.length) {
                        throw new BadRequestError("Invalid package inclusions selected");
                    }
                }
            }

            const quote = await QuoteModel.create({
                bookingId: booking._id,
                vendorId: vendor._id,
                customerId: booking.userId,
                amount: req.body.amount,
                message: req.body.message,
                packageInclusions: req.body.packageInclusions ?? [],
                customInclusions: req.body.customInclusions ?? [],
                vendorApproved: false,
                customerApproved: false,
                lastUpdatedBy: UserRole.VENDOR,
                expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
                status: QuoteStatus.PENDING,
            });

            const history = (booking.history ?? []) as any[];
            history.push({
                status: "proposal",
                byRole: "vendor",
                at: new Date(),
                note: "Proposal submitted by vendor",
                meta: {
                    quoteId: quote._id.toString(),
                    amount: quote.amount,
                    message: quote.message,
                    packageInclusions: quote.packageInclusions ?? [],
                    customInclusions: quote.customInclusions ?? [],
                    updatedBy: "vendor",
                },
            });
            booking.history = history as any;
            await booking.save();

            const dto = buildQuoteDto(quote, mapBookingStatusToUi(booking.status));
            emitQuoteUpdate([booking.userId.toString(), vendor.userId.toString()], dto);
            emitBookingUpdate([booking.userId.toString(), vendor.userId.toString()], {
                bookingId: booking._id.toString(),
                bookingStatus: mapBookingStatusToUi(booking.status),
                history: booking.history ?? [],
            });
            res.status(201).json(dto);
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
 *               packageInclusions:
 *                 type: array
 *                 items: { type: string }
 *               customInclusions:
 *                 type: array
 *                 items: { type: string }
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

            const booking = await BookingModel.findById(quote.bookingId).lean();
            if (booking && booking.status !== BookingStatus.REQUESTED) {
                throw new BadRequestError("Quotes can only be updated while booking is pending");
            }

            if (req.body.packageInclusions !== undefined) {
                if (booking?.packageId) {
                    const pkg = await PackageModel.findById(booking.packageId).lean();
                    if (pkg) {
                        const allowed = new Set(
                            (pkg.includes ?? []).map((item: string) => item.trim()),
                        );
                        const invalid = req.body.packageInclusions.filter(
                            (item: string) => !allowed.has(item.trim()),
                        );
                        if (invalid.length) {
                            throw new BadRequestError("Invalid package inclusions selected");
                        }
                    }
                }
            }

            if (req.body.amount !== undefined) quote.amount = req.body.amount;
            if (req.body.message !== undefined) quote.message = req.body.message;
            if (req.body.packageInclusions !== undefined) {
                quote.packageInclusions = req.body.packageInclusions ?? [];
            }
            if (req.body.customInclusions !== undefined) {
                quote.customInclusions = req.body.customInclusions ?? [];
            }
            if (req.body.expiresAt !== undefined) quote.expiresAt = new Date(req.body.expiresAt);
            quote.vendorApproved = false;
            quote.customerApproved = false;
            quote.lastUpdatedBy = UserRole.VENDOR;
            quote.status = QuoteStatus.PENDING;

            await quote.save();
            const bookingDoc = await BookingModel.findById(quote.bookingId);
            if (bookingDoc) {
                const history = (bookingDoc.history ?? []) as any[];
                history.push({
                    status: "proposal",
                    byRole: "vendor",
                    at: new Date(),
                    note: "Proposal updated by vendor",
                    meta: {
                        quoteId: quote._id.toString(),
                        amount: quote.amount,
                        message: quote.message,
                        packageInclusions: quote.packageInclusions ?? [],
                        customInclusions: quote.customInclusions ?? [],
                        updatedBy: "vendor",
                    },
                });
                bookingDoc.history = history as any;
                await bookingDoc.save();
            }
            const bookingAfter = await BookingModel.findById(quote.bookingId).lean();
            const dto = buildQuoteDto(
                quote,
                bookingAfter ? mapBookingStatusToUi(bookingAfter.status) : undefined,
            );
            emitQuoteUpdate([quote.customerId.toString(), vendor.userId.toString()], dto);
            if (bookingAfter) {
                emitBookingUpdate([quote.customerId.toString(), vendor.userId.toString()], {
                    bookingId: bookingAfter._id.toString(),
                    bookingStatus: mapBookingStatusToUi(bookingAfter.status),
                    history: bookingAfter.history ?? [],
                });
            }
            res.json(dto);
        } catch (err) {
            next(err);
        }
    },
);

/**
 * @openapi
 * /api/vendors/me/quotes/{id}/approve:
 *   post:
 *     tags: [Quotes]
 *     summary: Approve a quote (Vendor only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
vendorQuotesRoutes.post(
    "/me/quotes/:id/approve",
    requireAuth,
    requireRole(UserRole.VENDOR),
    async (req, res, next) => {
        try {
            const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
            if (!vendor) throw new NotFoundError("Vendor profile not found");

            const id = String(req.params.id);
            if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Quote not found");

            const quote = await QuoteModel.findOne({ _id: id, vendorId: vendor._id });
            if (!quote) throw new NotFoundError("Quote not found");

            if (quote.status !== QuoteStatus.PENDING) {
                throw new BadRequestError("Only PENDING quotes can be approved");
            }

            quote.vendorApproved = true;
            quote.lastUpdatedBy = UserRole.VENDOR;

            let bookingStatus: BookingStatus | undefined;
            let shouldNotify = false;
            const booking = await BookingModel.findById(quote.bookingId);
            if (booking) {
                bookingStatus = booking.status as BookingStatus;
                if (quote.customerApproved) {
                    quote.status = QuoteStatus.ACCEPTED;
                    booking.status = BookingStatus.CONFIRMED_PENDING_PAYMENT;
                    const history = (booking.history ?? []) as any[];
                    history.push({
                        status: "accepted",
                        byRole: "vendor",
                        at: new Date(),
                        note: "Quote approved",
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
            emitQuoteUpdate([quote.customerId.toString(), vendor.userId.toString()], dto);
            res.json(dto);
        } catch (err) {
            next(err);
        }
    },
);

/**
 * @openapi
 * /api/vendors/me/quotes/{id}/reject:
 *   post:
 *     tags: [Quotes]
 *     summary: Reject a quote (Vendor only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
vendorQuotesRoutes.post(
    "/me/quotes/:id/reject",
    requireAuth,
    requireRole(UserRole.VENDOR),
    async (req, res, next) => {
        try {
            const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
            if (!vendor) throw new NotFoundError("Vendor profile not found");

            const id = String(req.params.id);
            if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Quote not found");

            const quote = await QuoteModel.findOne({ _id: id, vendorId: vendor._id });
            if (!quote) throw new NotFoundError("Quote not found");

            if (quote.status !== QuoteStatus.PENDING) {
                throw new BadRequestError("Only PENDING quotes can be rejected");
            }

            quote.status = QuoteStatus.REJECTED;
            quote.vendorApproved = false;
            quote.customerApproved = false;
            quote.lastUpdatedBy = UserRole.VENDOR;

            const booking = await BookingModel.findById(quote.bookingId).lean();
            const bookingStatus = booking ? (booking.status as BookingStatus) : undefined;

            await quote.save();
            const dto = buildQuoteDto(
                quote,
                bookingStatus ? mapBookingStatusToUi(bookingStatus) : undefined,
            );
            emitQuoteUpdate([quote.customerId.toString(), vendor.userId.toString()], dto);
            res.json(dto);
        } catch (err) {
            next(err);
        }
    },
);
