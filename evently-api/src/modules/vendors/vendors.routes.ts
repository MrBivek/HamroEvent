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
import { DocumentOwnerType, UserRole } from "../../common/enums.js";
import { mapUiVerificationStatusToInternal } from "../../common/mappers.js";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import { CategoryModel } from "../categories/category.model.js";
import { LocationModel } from "../locations/location.model.js";
import { PackageModel } from "../packages/package.model.js";
import { DocumentModel } from "../documents/document.model.js";
import { UserModel } from "../auth/user.model.js";
import { buildVendorProfile } from "../../common/dtos.js";
import { deleteFileByUrl, saveBase64File } from "../../common/fileStorage.js";

export const vendorsRoutes = Router();

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
    const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
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
      const vendor = await VendorModel.findOne({ userId: req.auth!.sub });
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
      const vendor = await VendorModel.findOne({ userId: req.auth!.sub });
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

    const filter: Record<string, any> = {};
    if (query.verified === true) {
      filter.verifiedStatus = "APPROVED";
    } else if (query.verifiedStatus) {
      const mapped = mapUiVerificationStatusToInternal(query.verifiedStatus);
      if (mapped) filter.verifiedStatus = mapped;
    }

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
    if (!vendor) throw new NotFoundError("Vendor not found");

    const profile = await hydrateVendorProfile(vendor, {
      includePackages: true,
      packageFilter: { isActive: true },
    });
    res.json(profile);
  } catch (err) {
    next(err);
  }
});
