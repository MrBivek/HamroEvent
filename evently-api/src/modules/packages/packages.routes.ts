import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { UserRole, VerificationStatus } from "../../common/enums.js";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import { VendorModel } from "../vendors/vendor.model.js";
import { PackageModel } from "./package.model.js";
import { CreatePackageSchema, UpdatePackageSchema } from "./packages.schemas.js";

export const packagesRoutes = Router();

/**
 * NOTE:
 * This router is intended to be mounted at:
 *   apiRouter.use("/vendors", packagesRoutes);
 *
 * Therefore the final paths are:
 *   /api/vendors/me/packages
 *   /api/vendors/me/packages/:id
 *   /api/vendors/:vendorId/packages
 */

/**
 * @openapi
 * /api/vendors/me/packages:
 *   get:
 *     tags: [Packages]
 *     summary: List my packages (Vendor only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Vendor profile not found
 */
packagesRoutes.get("/me/packages", requireAuth, requireRole(UserRole.VENDOR), async (req, res, next) => {
    try {
        const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
        if (!vendor) throw new NotFoundError("Vendor profile not found");

        const items = await PackageModel.find({ vendorId: vendor._id })
            .sort({ createdAt: -1 })
            .lean();

        res.json({ items });
    } catch (err) {
        next(err);
    }
});

/**
 * @openapi
 * /api/vendors/me/packages:
 *   post:
 *     tags: [Packages]
 *     summary: Create a package (Vendor only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               categoryId: { type: string, example: "65a000000000000000000001" }
 *               title: { type: string, example: "Basic Package" }
 *               description: { type: string, example: "Great for small events" }
 *               priceMin: { type: number, example: 25000 }
 *               priceMax: { type: number, example: 50000 }
 *               includes:
 *                 type: array
 *                 items: { type: string }
 *                 example: ["4 hours coverage", "50 edited photos"]
 *     responses:
 *       201:
 *         description: Created
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Vendor profile not found
 */
packagesRoutes.post(
    "/me/packages",
    requireAuth,
    requireRole(UserRole.VENDOR),
    validateBody(CreatePackageSchema),
    async (req, res, next) => {
        try {
            const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
            if (!vendor) throw new NotFoundError("Vendor profile not found");

            const body: any = { ...req.body };

            if (body.categoryId && mongoose.isValidObjectId(body.categoryId)) {
                body.categoryId = new mongoose.Types.ObjectId(body.categoryId);
            } else {
                delete body.categoryId;
            }

            const doc = await PackageModel.create({
                vendorId: vendor._id,
                ...body,
                isActive: false, // publish requires verification
            });

            res.status(201).json(doc);
        } catch (err) {
            next(err);
        }
    }
);

/**
 * @openapi
 * /api/vendors/me/packages/{id}:
 *   patch:
 *     tags: [Packages]
 *     summary: Update my package (Vendor only)
 *     security:
 *       - bearerAuth: []
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
 *               categoryId: { type: string }
 *               title: { type: string }
 *               description: { type: string }
 *               priceMin: { type: number }
 *               priceMax: { type: number }
 *               includes:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Package not found
 */
packagesRoutes.patch(
    "/me/packages/:id",
    requireAuth,
    requireRole(UserRole.VENDOR),
    validateBody(UpdatePackageSchema),
    async (req, res, next) => {
        try {
            const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
            if (!vendor) throw new NotFoundError("Vendor profile not found");

            const { id } = req.params;
            if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Package not found");

            const updates: any = { ...req.body };

            if (updates.categoryId && mongoose.isValidObjectId(updates.categoryId)) {
                updates.categoryId = new mongoose.Types.ObjectId(updates.categoryId);
            } else if ("categoryId" in updates) {
                delete updates.categoryId;
            }

            const doc = await PackageModel.findOneAndUpdate(
                { _id: new mongoose.Types.ObjectId(id), vendorId: vendor._id },
                { $set: updates },
                { new: true }
            ).lean();

            if (!doc) throw new NotFoundError("Package not found");

            res.json(doc);
        } catch (err) {
            next(err);
        }
    }
);

/**
 * @openapi
 * /api/vendors/me/packages/{id}:
 *   delete:
 *     tags: [Packages]
 *     summary: Delete my package (Vendor only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Package not found
 */
packagesRoutes.delete("/me/packages/:id", requireAuth, requireRole(UserRole.VENDOR), async (req, res, next) => {
    try {
        const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
        if (!vendor) throw new NotFoundError("Vendor profile not found");

        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Package not found");

        const result = await PackageModel.deleteOne({ _id: new mongoose.Types.ObjectId(id), vendorId: vendor._id });
        res.json({ deleted: result.deletedCount === 1 });
    } catch (err) {
        next(err);
    }
});

/**
 * @openapi
 * /api/vendors/me/packages/{id}/publish:
 *   post:
 *     tags: [Packages]
 *     summary: Publish my package (Vendor must be verified APPROVED)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *       400:
 *         description: Vendor must be verified before publishing packages
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Package not found
 */
packagesRoutes.post("/me/packages/:id/publish", requireAuth, requireRole(UserRole.VENDOR), async (req, res, next) => {
    try {
        const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
        if (!vendor) throw new NotFoundError("Vendor profile not found");

        if (vendor.verifiedStatus !== VerificationStatus.APPROVED) {
            throw new BadRequestError("Vendor must be verified before publishing packages");
        }

        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Package not found");

        const doc = await PackageModel.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(id), vendorId: vendor._id },
            { $set: { isActive: true } },
            { new: true }
        ).lean();

        if (!doc) throw new NotFoundError("Package not found");

        res.json(doc);
    } catch (err) {
        next(err);
    }
});

/**
 * @openapi
 * /api/vendors/me/packages/{id}/unpublish:
 *   post:
 *     tags: [Packages]
 *     summary: Unpublish my package (Vendor only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Package not found
 */
packagesRoutes.post("/me/packages/:id/unpublish", requireAuth, requireRole(UserRole.VENDOR), async (req, res, next) => {
    try {
        const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
        if (!vendor) throw new NotFoundError("Vendor profile not found");

        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Package not found");

        const doc = await PackageModel.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(id), vendorId: vendor._id },
            { $set: { isActive: false } },
            { new: true }
        ).lean();

        if (!doc) throw new NotFoundError("Package not found");

        res.json(doc);
    } catch (err) {
        next(err);
    }
});

/* -------------------------------------------------------------------------- */
/* Public: Active Packages for a Vendor                                       */
/* -------------------------------------------------------------------------- */

/**
 * @openapi
 * /api/vendors/{vendorId}/packages:
 *   get:
 *     tags: [Marketplace]
 *     summary: List active packages for a vendor (public)
 *     parameters:
 *       - in: path
 *         name: vendorId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *       404:
 *         description: Vendor not found
 */
packagesRoutes.get("/:vendorId/packages", async (req, res, next) => {
    try {
        const { vendorId } = req.params;
        if (!mongoose.isValidObjectId(vendorId)) throw new NotFoundError("Vendor not found");

        const items = await PackageModel.find({
            vendorId: new mongoose.Types.ObjectId(vendorId),
            isActive: true,
        })
            .sort({ createdAt: -1 })
            .lean();

        res.json({ items });
    } catch (err) {
        next(err);
    }
});
