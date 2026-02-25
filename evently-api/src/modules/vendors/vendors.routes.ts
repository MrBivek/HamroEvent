import { Router } from "express";
import mongoose from "mongoose";
import { VendorModel } from "./vendor.model.js";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import {
  UpdateVendorMeSchema,
  VendorListQuerySchema,
  UploadPortfolioSchema,
  DeletePortfolioSchema,
} from "./vendors.schemas.js";
import { DocumentOwnerType, UserRole, VerificationStatus, UserStatus } from "../../common/enums.js";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import { CategoryModel } from "../categories/category.model.js";
import { LocationModel } from "../locations/location.model.js";
import { PackageModel } from "../packages/package.model.js";
import { DocumentModel } from "../documents/document.model.js";
import { UserModel } from "../auth/user.model.js";
import { buildVendorProfile } from "../../common/dtos.js";
import { deleteFileByUrl, saveBase64File } from "../../common/fileStorage.js";
import { AvailabilityModel } from "../availability/availability.model.js";
import { BookingModel } from "../bookings/booking.model.js";
import { EventModel } from "../events/event.model.js";
import { BookingStatus } from "../../common/enums.js";
import {
  normalizeEventRangeForConflict,
  normalizeTimeRange,
  rangeWithinSlot,
  rangesOverlap,
} from "../../common/time.js";
import { PublicAvailabilityQuerySchema } from "../availability/availability.schemas.js";
import { resolveVendorForUser } from "../../common/vendor.js";

export const vendorsRoutes = Router();

function parseDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestError("Invalid date format. Use YYYY-MM-DD");
  }
  const [y, m, d] = value.split("-").map((v) => Number(v));
  return new Date(Date.UTC(y, m - 1, d));
}

function startOfDayUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function endOfDayUtc(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999),
  );
}

async function hydrateVendorProfile(
  vendor: any,
  options?: { includePackages?: boolean; packageFilter?: Record<string, unknown> },
) {
  const includePackages = options?.includePackages ?? true;
  const packageFilter = options?.packageFilter ?? {};

  const [user, category, location, packages, documents] = await Promise.all([
    UserModel.findById(vendor.userId).lean(),
    vendor.categoryId ? CategoryModel.findById(vendor.categoryId).lean() : Promise.resolve(null),
    vendor.primaryLocationId
      ? LocationModel.findById(vendor.primaryLocationId).lean()
      : Promise.resolve(null),
    PackageModel.find({ vendorId: vendor._id, ...packageFilter }).lean(),
    DocumentModel.find({ ownerType: DocumentOwnerType.VENDOR, ownerId: vendor._id }).lean(),
  ]);

  return buildVendorProfile({
    vendor,
    user,
    category,
    location,
    packages,
    documents,
    includePackages,
  });
}

/**
 * @openapi
 * /api/vendors/me:
 *   get:
 *     tags: [Vendors]
 *     summary: Get my vendor profile (Vendor only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 *       401: { description: Unauthorized }
 */
vendorsRoutes.get("/me", requireAuth, requireRole(UserRole.VENDOR), async (req, res, next) => {
  try {
    const vendor = await resolveVendorForUser(req.auth!.sub, { lean: true });
    if (!vendor) throw new NotFoundError("Vendor profile not found");
    const profile = await hydrateVendorProfile(vendor, { includePackages: true });
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/vendors/me:
 *   patch:
 *     tags: [Vendors]
 *     summary: Update my vendor profile (Vendor only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
vendorsRoutes.patch(
  "/me",
  requireAuth,
  requireRole(UserRole.VENDOR),
  validateBody(UpdateVendorMeSchema),
  async (req, res, next) => {
    try {
      const updates: any = { ...req.body };

      if (updates.socialLinks) {
        updates.social = updates.socialLinks;
        delete updates.socialLinks;
      }

      if (updates.contact) {
        updates.contactPhone = updates.contact.phone;
        updates.contactEmail = updates.contact.email;
        delete updates.contact;
      }

      if (updates.category && !updates.categoryId) {
        const category = await CategoryModel.findOne({ slug: updates.category }).lean();
        if (!category) throw new BadRequestError("Invalid category");
        updates.categoryId = category._id.toString();
      }

      if (updates.location) {
        updates.locationText = updates.location;
        const location = await LocationModel.findOne({ name: updates.location }).lean();
        if (location) {
          updates.primaryLocationId = location._id.toString();
          updates.locations = Array.from(
            new Set([...(updates.locations ?? []), location._id.toString()]),
          );
        }
        delete updates.location;
      }

      if (Array.isArray(updates.portfolioMedia)) {
        const stored: string[] = [];
        for (const media of updates.portfolioMedia) {
          if (typeof media === "string" && media.startsWith("data:")) {
            const saved = saveBase64File({
              data: media,
              folder: `vendors/${req.auth!.sub}`,
              filenamePrefix: "portfolio",
            });
            stored.push(saved.url);
          } else if (typeof media === "string") {
            stored.push(media);
          }
        }
        updates.portfolioMedia = stored;
      }

      // convert ObjectId-like fields safely
      if (updates.categoryId && mongoose.isValidObjectId(updates.categoryId)) {
        updates.categoryId = new mongoose.Types.ObjectId(updates.categoryId);
      }
      if (updates.primaryLocationId && mongoose.isValidObjectId(updates.primaryLocationId)) {
        updates.primaryLocationId = new mongoose.Types.ObjectId(updates.primaryLocationId);
      }
      if (Array.isArray(updates.locations)) {
        updates.locations = updates.locations
          .filter((id: string) => mongoose.isValidObjectId(id))
          .map((id: string) => new mongoose.Types.ObjectId(id));
      }

      const vendor = await VendorModel.findOneAndUpdate(
        { userId: req.auth!.sub },
        { $set: updates },
        { new: true },
      ).lean();

      if (!vendor) throw new NotFoundError("Vendor profile not found");
      const profile = await hydrateVendorProfile(vendor, { includePackages: true });
      res.json(profile);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /api/vendors/me/portfolio:
 *   post:
 *     tags: [Vendors]
 *     summary: Upload portfolio images (Vendor only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [images]
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [data]
 *                   properties:
 *                     data: { type: string, description: "Base64 or data URL" }
 *                     filename: { type: string }
 *                     mimeType: { type: string }
 *     responses:
 *       200: { description: OK }
 */
vendorsRoutes.post(
  "/me/portfolio",
  requireAuth,
  requireRole(UserRole.VENDOR),
  validateBody(UploadPortfolioSchema),
  async (req, res, next) => {
    try {
      const vendor = await resolveVendorForUser(req.auth!.sub);
      if (!vendor) throw new NotFoundError("Vendor profile not found");

      const stored: string[] = [];
      for (const img of req.body.images) {
        const saved = saveBase64File({
          data: img.data,
          folder: `vendors/${vendor.userId.toString()}`,
          filenamePrefix: "portfolio",
          mimeTypeHint: img.mimeType,
        });
        stored.push(saved.url);
      }

      vendor.portfolioMedia = [...(vendor.portfolioMedia ?? []), ...stored];
      await vendor.save();

      const profile = await hydrateVendorProfile(vendor.toObject(), { includePackages: true });
      res.json(profile);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /api/vendors/me/portfolio:
 *   delete:
 *     tags: [Vendors]
 *     summary: Remove a portfolio image (Vendor only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url]
 *             properties:
 *               url: { type: string }
 *     responses:
 *       200: { description: OK }
 */
vendorsRoutes.delete(
  "/me/portfolio",
  requireAuth,
  requireRole(UserRole.VENDOR),
  validateBody(DeletePortfolioSchema),
  async (req, res, next) => {
    try {
      const vendor = await resolveVendorForUser(req.auth!.sub);
      if (!vendor) throw new NotFoundError("Vendor profile not found");

      const url = req.body.url;
      vendor.portfolioMedia = (vendor.portfolioMedia ?? []).filter((item) => item !== url);
      await vendor.save();
      deleteFileByUrl(url);

      const profile = await hydrateVendorProfile(vendor.toObject(), { includePackages: true });
      res.json(profile);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /api/vendors:
 *   get:
 *     tags: [Marketplace]
 *     summary: List vendors (public)
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: locationId
 *         schema: { type: string }
 *       - in: query
 *         name: location
 *         schema: { type: string }
 *       - in: query
 *         name: verifiedStatus
 *         schema: { type: string }
 *       - in: query
 *         name: verified
 *         schema: { type: boolean }
 *       - in: query
 *         name: date
 *         schema: { type: string, example: "2026-02-25" }
 *       - in: query
 *         name: startTime
 *         schema: { type: string, example: "10:00" }
 *       - in: query
 *         name: endTime
 *         schema: { type: string, example: "16:00" }
 *       - in: query
 *         name: priceMin
 *         schema: { type: number }
 *       - in: query
 *         name: priceMax
 *         schema: { type: number }
 *       - in: query
 *         name: minRating
 *         schema: { type: number }
 *       - in: query
 *         name: sortBy
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
vendorsRoutes.get("/", async (req, res, next) => {
  try {
    const query = VendorListQuerySchema.parse(req.query);

    const filter: Record<string, any> = { verifiedStatus: VerificationStatus.APPROVED };
    const activeUsers = await UserModel.find({ status: UserStatus.ACTIVE })
      .select({ _id: 1 })
      .lean();
    filter.userId = { $in: activeUsers.map((u) => u._id) };

    if (query.categoryId && mongoose.isValidObjectId(query.categoryId)) {
      filter.categoryId = new mongoose.Types.ObjectId(query.categoryId);
    } else if (query.category) {
      const category = await CategoryModel.findOne({ slug: query.category }).lean();
      if (category) filter.categoryId = category._id;
      else return res.json({ items: [], page: query.page, limit: query.limit, total: 0 });
    }

    const andFilters: Record<string, unknown>[] = [];

    if (query.locationId && mongoose.isValidObjectId(query.locationId)) {
      filter.locations = new mongoose.Types.ObjectId(query.locationId);
    } else if (query.location) {
      andFilters.push({
        $or: [{ locationText: query.location }, { serviceAreas: { $in: [query.location] } }],
      });
    }

    if (query.q) {
      andFilters.push({
        $or: [
          { businessName: { $regex: query.q, $options: "i" } },
          { description: { $regex: query.q, $options: "i" } },
        ],
      });
    }

    if (andFilters.length) {
      filter.$and = andFilters;
    }

    if (typeof query.minRating === "number") {
      filter.ratingAvg = { $gte: query.minRating };
    }
    if (typeof query.priceMin === "number") {
      filter.pricingMin = { $gte: query.priceMin };
    }
    if (typeof query.priceMax === "number") {
      filter.pricingMax = { $lte: query.priceMax };
    }

    const excludedVendorIds = new Set<string>();
    if (query.date) {
      const targetDate = parseDateOnly(query.date);
      const endDate = endOfDayUtc(targetDate);
      const hasTimeFilter = Boolean(query.startTime || query.endTime);
      const timeRange = normalizeTimeRange(query.startTime, query.endTime);
      if (hasTimeFilter && !timeRange) {
        throw new BadRequestError("Invalid time range. Use HH:mm and ensure end is after start.");
      }

      const blocked = await AvailabilityModel.find(
        { date: targetDate, isAvailable: false },
        { vendorId: 1 },
      ).lean();
      for (const item of blocked) {
        excludedVendorIds.add(item.vendorId.toString());
      }

      if (hasTimeFilter) {
        const withSlots = await AvailabilityModel.find(
          { date: targetDate, "slots.0": { $exists: true } },
          { vendorId: 1, slots: 1 },
        ).lean();
        for (const entry of withSlots) {
          const fits =
            timeRange &&
            entry.slots?.some((slot) => rangeWithinSlot(timeRange, slot.start, slot.end));
          if (!fits) {
            excludedVendorIds.add(entry.vendorId.toString());
          }
        }
      }

      const eventsOnDate = await EventModel.find(
        { eventDate: { $gte: targetDate, $lte: endDate } },
        { _id: 1, startTime: 1, endTime: 1 },
      ).lean();

      if (eventsOnDate.length > 0) {
        const eventIds = eventsOnDate.map((e) => e._id);
        const eventMap = new Map(
          eventsOnDate.map((e) => [
            e._id.toString(),
            normalizeEventRangeForConflict(e.startTime, e.endTime),
          ]),
        );

        const blockingStatuses = [
          BookingStatus.ACCEPTED,
          BookingStatus.CONFIRMED_PENDING_PAYMENT,
          BookingStatus.CONFIRMED,
          BookingStatus.COMPLETED,
        ];

        const bookings = await BookingModel.find(
          { eventId: { $in: eventIds }, status: { $in: blockingStatuses } },
          { vendorId: 1, eventId: 1 },
        ).lean();

        const targetRange = normalizeEventRangeForConflict(query.startTime, query.endTime);
        for (const booking of bookings) {
          const otherRange = eventMap.get(booking.eventId.toString());
          if (!otherRange) continue;
          if (rangesOverlap(targetRange, otherRange)) {
            excludedVendorIds.add(booking.vendorId.toString());
          }
        }
      }
    }

    if (excludedVendorIds.size > 0) {
      filter._id = {
        ...(filter._id ?? {}),
        $nin: Array.from(excludedVendorIds).map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    const skip = (query.page - 1) * query.limit;

    let sort: Record<string, 1 | -1> = { createdAt: -1 };
    switch (query.sortBy) {
      case "rating":
        sort = { ratingAvg: -1 };
        break;
      case "reviews":
      case "popularity":
        sort = { ratingCount: -1 };
        break;
      case "price-low":
        sort = { pricingMin: 1 };
        break;
      case "price-high":
        sort = { pricingMax: -1 };
        break;
      case "latest":
        sort = { createdAt: -1 };
        break;
      default:
        break;
    }

    const [items, total] = await Promise.all([
      VendorModel.find(filter).sort(sort).skip(skip).limit(query.limit).lean(),
      VendorModel.countDocuments(filter),
    ]);

    const hydrated = await Promise.all(
      items.map((vendor) =>
        hydrateVendorProfile(vendor, { includePackages: false, packageFilter: { isActive: true } }),
      ),
    );

    res.json({ items: hydrated, page: query.page, limit: query.limit, total });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/vendors/{id}/availability:
 *   get:
 *     tags: [Marketplace]
 *     summary: Get vendor availability (public)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, example: "2026-02-25" }
 *       - in: query
 *         name: to
 *         schema: { type: string, example: "2026-03-26" }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 */
vendorsRoutes.get("/:id/availability", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Vendor not found");

    const vendor = await VendorModel.findById(id).lean();
    if (!vendor || vendor.verifiedStatus !== VerificationStatus.APPROVED) {
      throw new NotFoundError("Vendor not found");
    }
    const user = await UserModel.findById(vendor.userId).lean();
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new NotFoundError("Vendor not found");
    }

    const q = PublicAvailabilityQuerySchema.parse(req.query);
    const now = new Date();
    const defaultFrom = startOfDayUtc(now);
    const defaultTo = endOfDayUtc(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));
    const from = q.from ? parseDateOnly(q.from) : defaultFrom;
    const to = q.to ? parseDateOnly(q.to) : defaultTo;

    const dayCount = Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
    if (dayCount > 60 || dayCount < 0) {
      throw new BadRequestError("Date range too large. Max 60 days.");
    }

    const items = await AvailabilityModel.find({
      vendorId: vendor._id,
      date: { $gte: from, $lte: to },
    })
      .sort({ date: 1 })
      .lean();

    const map = new Map(items.map((item) => [item.date.toISOString().slice(0, 10), item]));
    const availableDates: string[] = [];
    const blockedDates: string[] = [];

    const cursor = new Date(from.getTime());
    while (cursor <= to) {
      const key = cursor.toISOString().slice(0, 10);
      const entry = map.get(key);
      if (entry && entry.isAvailable === false) {
        blockedDates.push(key);
      } else {
        availableDates.push(key);
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    res.json({
      items,
      availableDates,
      blockedDates,
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/vendors/{id}:
 *   get:
 *     tags: [Marketplace]
 *     summary: Get vendor public profile (public)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 */
vendorsRoutes.get("/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Vendor not found");

    const vendor = await VendorModel.findById(id).lean();
    if (!vendor || vendor.verifiedStatus !== VerificationStatus.APPROVED) {
      throw new NotFoundError("Vendor not found");
    }
    const user = await UserModel.findById(vendor.userId).lean();
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new NotFoundError("Vendor not found");
    }

    const profile = await hydrateVendorProfile(vendor, {
      includePackages: true,
      packageFilter: { isActive: true },
    });
    res.json(profile);
  } catch (err) {
    next(err);
  }
});
