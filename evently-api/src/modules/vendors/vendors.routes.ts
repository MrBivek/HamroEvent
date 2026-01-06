import { Router } from "express";
import mongoose from "mongoose";
import { VendorModel } from "./vendor.model.js";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { UpdateVendorMeSchema, VendorListQuerySchema } from "./vendors.schemas.js";
import { UserRole } from "../../common/enums.js";
import { NotFoundError } from "../../common/errors.js";

export const vendorsRoutes = Router();

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
        res.json(vendor);
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
                { new: true }
            ).lean();

            if (!vendor) throw new NotFoundError("Vendor profile not found");
            res.json(vendor);
        } catch (err) {
            next(err);
        }
    }
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
 *         name: locationId
 *         schema: { type: string }
 *       - in: query
 *         name: verifiedStatus
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
        if (query.verifiedStatus) filter.verifiedStatus = query.verifiedStatus;
        if (query.categoryId && mongoose.isValidObjectId(query.categoryId)) {
            filter.categoryId = new mongoose.Types.ObjectId(query.categoryId);
        }
        if (query.locationId && mongoose.isValidObjectId(query.locationId)) {
            filter.locations = new mongoose.Types.ObjectId(query.locationId);
        }
        if (query.q) {
            filter.businessName = { $regex: query.q, $options: "i" };
        }

        const skip = (query.page - 1) * query.limit;

        const [items, total] = await Promise.all([
            VendorModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).lean(),
            VendorModel.countDocuments(filter),
        ]);

        res.json({ items, page: query.page, limit: query.limit, total });
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
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Vendor not found");

        const vendor = await VendorModel.findById(id).lean();
        if (!vendor) throw new NotFoundError("Vendor not found");

        res.json(vendor);
    } catch (err) {
        next(err);
    }
});
