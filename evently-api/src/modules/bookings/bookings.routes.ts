import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { UserRole, BookingStatus, NotificationType } from "../../common/enums.js";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import { BookingModel } from "./booking.model.js";
import { CreateBookingSchema, BookingListQuerySchema } from "./bookings.schemas.js";
import { EventModel } from "../events/event.model.js";
import { VendorModel } from "../vendors/vendor.model.js";
import { PackageModel } from "../packages/package.model.js";
import { createNotification } from "../notifications/notifications.service.js";
import { AvailabilityModel } from "../availability/availability.model.js";
import { CategoryModel } from "../categories/category.model.js";
import { LocationModel } from "../locations/location.model.js";
import { UserModel } from "../auth/user.model.js";
import { buildBookingDto, buildVendorProfile } from "../../common/dtos.js";
import { mapUiBookingStatusToInternal } from "../../common/mappers.js";
import { ConversationModel } from "../conversations/conversation.model.js";
import { MessageModel } from "../conversations/message.model.js";
import { normalizeTimeRange, rangeWithinSlot } from "../../common/time.js";

export const bookingsRoutes = Router();

async function getVendorProfileForBooking(vendorId: mongoose.Types.ObjectId) {
    const vendor = await VendorModel.findById(vendorId).lean();
    if (!vendor) return null;
    const [user, category, location] = await Promise.all([
        UserModel.findById(vendor.userId).lean(),
        vendor.categoryId
            ? CategoryModel.findById(vendor.categoryId).lean()
            : Promise.resolve(null),
        vendor.primaryLocationId
            ? LocationModel.findById(vendor.primaryLocationId).lean()
            : Promise.resolve(null),
    ]);
    return buildVendorProfile({
        vendor,
        user,
        category,
        location,
        packages: [],
        documents: [],
        includePackages: false,
    });
}

/**
 * @openapi
 * /api/bookings:
 *   post:
 *     tags: [Bookings]
 *     summary: Create a booking request (Customer only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vendorId, eventId]
 *             properties:
 *               vendorId: { type: string }
 *               packageId: { type: string }
 *               eventId: { type: string }
 *               customerNote: { type: string }
 *     responses:
 *       201: { description: Created }
 */
bookingsRoutes.post(
    "/",
    requireAuth,
    requireRole(UserRole.CUSTOMER),
    validateBody(CreateBookingSchema),
    async (req, res, next) => {
        try {
            const userId = new mongoose.Types.ObjectId(req.auth!.sub);
            const { vendorId, packageId, eventId, customerNote } = req.body;

            if (!mongoose.isValidObjectId(vendorId)) throw new BadRequestError("Invalid vendorId");
            if (!mongoose.isValidObjectId(eventId)) throw new BadRequestError("Invalid eventId");
            if (packageId && !mongoose.isValidObjectId(packageId))
                throw new BadRequestError("Invalid packageId");

            // verify event belongs to customer
            const event = await EventModel.findOne({ _id: eventId, userId }).lean();
            if (!event) throw new NotFoundError("Event not found");

            // verify vendor exists
            const vendor = await VendorModel.findById(vendorId).lean();
            if (!vendor) throw new NotFoundError("Vendor not found");

            // if vendor has availability defined for event date, ensure available
            const eventDate = new Date(event.eventDate);
            const dateOnly = new Date(
                Date.UTC(
                    eventDate.getUTCFullYear(),
                    eventDate.getUTCMonth(),
                    eventDate.getUTCDate(),
                ),
            );
            const availability = await AvailabilityModel.findOne({
                vendorId: vendor._id,
                date: dateOnly,
            }).lean();
            if (availability && availability.isAvailable === false) {
                throw new BadRequestError("Vendor is not available on the event date");
            }
            if (availability?.slots && availability.slots.length > 0) {
                const eventRange = normalizeTimeRange(event.startTime, event.endTime);
                if (!eventRange) {
                    throw new BadRequestError(
                        "Event time range is required for this vendor on the selected date",
                    );
                }
                const fits = availability.slots.some((slot) =>
                    rangeWithinSlot(eventRange, slot.start, slot.end),
                );
                if (!fits) {
                    throw new BadRequestError("Event time is outside the vendor's available slots");
                }
            }

            // if packageId provided, validate it belongs to vendor
            if (packageId) {
                const pkg = await PackageModel.findOne({ _id: packageId, vendorId }).lean();
                if (!pkg) throw new NotFoundError("Package not found for this vendor");
            }

            const booking = await BookingModel.create({
                userId,
                vendorId: new mongoose.Types.ObjectId(vendorId),
                packageId: packageId ? new mongoose.Types.ObjectId(packageId) : undefined,
                eventId: new mongoose.Types.ObjectId(eventId),
                status: BookingStatus.REQUESTED,
                customerNote,
                requestedAt: new Date(),
                history: [
                    {
                        status: "pending",
                        byRole: "customer",
                        at: new Date(),
                        note: "Booking request submitted",
                    },
                ],
            });

            await createNotification({
                userId: vendor.userId.toString(),
                type: NotificationType.BOOKING_REQUESTED,
                title: "New booking request",
                body: "You have a new booking request.",
                link: `/vendor/bookings/${booking._id.toString()}`,
            });

            const vendorProfile = await getVendorProfileForBooking(booking.vendorId);
            const pkg = packageId
                ? await PackageModel.findById(new mongoose.Types.ObjectId(packageId)).lean()
                : null;
            res.status(201).json(
                buildBookingDto({
                    booking: booking.toObject(),
                    event,
                    vendorProfile,
                    packageTitle: pkg?.title,
                    packagePrice: typeof pkg?.priceMin === "number" ? pkg.priceMin : undefined,
                    packageInclusions: pkg?.includes ?? [],
                }),
            );
        } catch (err) {
            next(err);
        }
    },
);

/**
 * @openapi
 * /api/bookings:
 *   get:
 *     tags: [Bookings]
 *     summary: List my bookings (Customer only)
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
bookingsRoutes.get("/", requireAuth, requireRole(UserRole.CUSTOMER), async (req, res, next) => {
    try {
        const q = BookingListQuerySchema.parse(req.query);
        const userId = new mongoose.Types.ObjectId(req.auth!.sub);
        const skip = (q.page - 1) * q.limit;

        const filter: any = { userId };
        if (q.status) {
            const internal = mapUiBookingStatusToInternal(q.status);
            if (internal) filter.status = internal;
        }

        const [items, total] = await Promise.all([
            BookingModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(q.limit).lean(),
            BookingModel.countDocuments(filter),
        ]);

        const eventIds = items.map((b) => b.eventId);
        const vendorIds = items.map((b) => b.vendorId);
        const packageIds = items
            .map((b) => b.packageId)
            .filter(Boolean) as mongoose.Types.ObjectId[];

        const [events, vendors, packages] = await Promise.all([
            EventModel.find({ _id: { $in: eventIds } }).lean(),
            VendorModel.find({ _id: { $in: vendorIds } }).lean(),
            packageIds.length
                ? PackageModel.find({ _id: { $in: packageIds } }).lean()
                : Promise.resolve([]),
        ]);

        const categoryIds = vendors
            .map((v) => v.categoryId)
            .filter((id): id is mongoose.Types.ObjectId => Boolean(id));
        const [categories, users] = await Promise.all([
            categoryIds.length
                ? CategoryModel.find({ _id: { $in: categoryIds } }).lean()
                : Promise.resolve([]),
            UserModel.find({ _id: { $in: vendors.map((v) => v.userId) } }).lean(),
        ]);

        const eventMap = new Map(events.map((e) => [e._id.toString(), e]));
        const vendorMap = new Map(vendors.map((v) => [v._id.toString(), v]));
        const packageMap = new Map(packages.map((p) => [p._id.toString(), p]));
        const categoryMap = new Map(categories.map((c) => [c._id.toString(), c]));
        const userMap = new Map(users.map((u) => [u._id.toString(), u]));

        const enriched = items.map((booking) => {
            const event = eventMap.get(booking.eventId.toString());
            const vendor = vendorMap.get(booking.vendorId.toString());
            const pkg = booking.packageId
                ? packageMap.get(booking.packageId.toString())
                : undefined;
            const category = vendor?.categoryId
                ? categoryMap.get(vendor.categoryId.toString())
                : undefined;
            const vendorUser = vendor ? userMap.get(vendor.userId.toString()) : undefined;
            const vendorProfile = vendor
                ? buildVendorProfile({
                      vendor,
                      user: vendorUser,
                      category,
                      location: null,
                      packages: [],
                      documents: [],
                      includePackages: false,
                  })
                : null;
            return buildBookingDto({
                booking,
                event,
                vendorProfile,
                packageTitle: pkg?.title,
                packagePrice: typeof pkg?.priceMin === "number" ? pkg.priceMin : undefined,
                packageInclusions: pkg?.includes ?? [],
            });
        });

        res.json({ items: enriched, page: q.page, limit: q.limit, total });
    } catch (err) {
        next(err);
    }
});

/**
 * @openapi
 * /api/bookings/{id}:
 *   get:
 *     tags: [Bookings]
 *     summary: Get a booking (Customer only)
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
bookingsRoutes.get("/:id", requireAuth, requireRole(UserRole.CUSTOMER), async (req, res, next) => {
    try {
        const id = String(req.params.id);
        if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Booking not found");

        const booking = await BookingModel.findOne({
            _id: new mongoose.Types.ObjectId(id),
            userId: new mongoose.Types.ObjectId(req.auth!.sub),
        }).lean();

        if (!booking) throw new NotFoundError("Booking not found");

        const [event, vendor, pkg] = await Promise.all([
            EventModel.findById(booking.eventId).lean(),
            VendorModel.findById(booking.vendorId).lean(),
            booking.packageId
                ? PackageModel.findById(booking.packageId).lean()
                : Promise.resolve(null),
        ]);

        const [category, vendorUser] = await Promise.all([
            vendor?.categoryId
                ? CategoryModel.findById(vendor.categoryId).lean()
                : Promise.resolve(null),
            vendor ? UserModel.findById(vendor.userId).lean() : Promise.resolve(null),
        ]);

        const vendorProfile = vendor
            ? buildVendorProfile({
                  vendor,
                  user: vendorUser,
                  category,
                  location: null,
                  packages: [],
                  documents: [],
                  includePackages: false,
              })
            : null;

        const conversation = await ConversationModel.findOne({ bookingId: booking._id }).lean();
        const messages = conversation
            ? await MessageModel.find({ conversationId: conversation._id })
                  .sort({ createdAt: 1 })
                  .lean()
            : [];
        const messageRoleMap = new Map<string, string>();
        messageRoleMap.set(booking.userId.toString(), "customer");
        if (vendorUser?._id) messageRoleMap.set(vendorUser._id.toString(), "vendor");

        res.json(
            buildBookingDto({
                booking,
                event,
                vendorProfile,
                packageTitle: pkg?.title,
                packagePrice: typeof pkg?.priceMin === "number" ? pkg.priceMin : undefined,
                packageInclusions: pkg?.includes ?? [],
                messages,
                messageRoleMap,
            }),
        );
    } catch (err) {
        next(err);
    }
});
