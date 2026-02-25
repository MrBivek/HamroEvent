import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { UserRole, VerificationStatus, NotificationType } from "../../common/enums.js";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import { VendorModel } from "../vendors/vendor.model.js";
import { DocumentModel } from "../documents/document.model.js";
import { VerificationRequestModel } from "./verification-request.model.js";
import {
  CreateVerificationRequestSchema,
  VerificationRequestListQuerySchema,
} from "./verification-requests.schemas.js";
import { createNotificationsForAdmins } from "../notifications/notifications.service.js";

export const verificationRequestsRoutes = Router();

/**
 * @openapi
 * /api/vendors/me/verification-requests:
 *   post:
 *     tags: [Vendor Verification]
 *     summary: Submit a verification request (Vendor only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               documentIds:
 *                 type: array
 *                 items: { type: string }
 *               vendorNote: { type: string }
 *     responses:
 *       201: { description: Created }
 *       400: { description: Validation error }
 */
verificationRequestsRoutes.post(
  "/me/verification-requests",
  requireAuth,
  requireRole(UserRole.VENDOR),
  validateBody(CreateVerificationRequestSchema),
  async (req, res, next) => {
    try {
      const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
      if (!vendor) throw new NotFoundError("Vendor profile not found");

      const active = await VerificationRequestModel.findOne({
        vendorId: vendor._id,
        status: VerificationStatus.PENDING,
      }).lean();

      const hasDocumentIds = Array.isArray(req.body.documentIds);
      const documentIds = req.body.documentIds ?? [];
      const validDocIds = documentIds.filter((id: string) => mongoose.isValidObjectId(id));

      if (validDocIds.length !== documentIds.length) {
        throw new BadRequestError("Invalid document id in documentIds");
      }

      if (validDocIds.length > 0) {
        const count = await DocumentModel.countDocuments({
          _id: { $in: validDocIds },
          ownerId: vendor._id,
        });
        if (count !== validDocIds.length) {
          throw new BadRequestError("One or more documents do not belong to this vendor");
        }
      }

      if (active) {
        const update: Record<string, unknown> = {
          vendorNote: req.body.vendorNote,
          submittedAt: new Date(),
        };
        if (hasDocumentIds) {
          update.documentIds = validDocIds.map((id: string) => new mongoose.Types.ObjectId(id));
        }

        const updated = await VerificationRequestModel.findByIdAndUpdate(active._id, update, {
          new: true,
        });

        await VendorModel.updateOne(
          { _id: vendor._id },
          { $set: { verifiedStatus: VerificationStatus.PENDING } },
        );

        await createNotificationsForAdmins({
          type: NotificationType.SYSTEM,
          title: "Verification request updated",
          body: `Vendor ${vendor.businessName} updated their verification request.`,
          link: "/admin/vendors/pending",
        });

        return res.json(updated);
      }

      const doc = await VerificationRequestModel.create({
        vendorId: vendor._id,
        status: VerificationStatus.PENDING,
        documentIds: validDocIds.map((id: string) => new mongoose.Types.ObjectId(id)),
        vendorNote: req.body.vendorNote,
        submittedAt: new Date(),
      });

      await VendorModel.updateOne(
        { _id: vendor._id },
        { $set: { verifiedStatus: VerificationStatus.PENDING } },
      );

      await createNotificationsForAdmins({
        type: NotificationType.SYSTEM,
        title: "New verification request",
        body: `Vendor ${vendor.businessName} submitted verification documents.`,
        link: "/admin/vendors/pending",
      });

      res.status(201).json(doc);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /api/vendors/me/verification-requests:
 *   get:
 *     tags: [Vendor Verification]
 *     summary: List my verification requests (Vendor only)
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
verificationRequestsRoutes.get(
  "/me/verification-requests",
  requireAuth,
  requireRole(UserRole.VENDOR),
  async (req, res, next) => {
    try {
      const q = VerificationRequestListQuerySchema.parse(req.query);
      const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
      if (!vendor) throw new NotFoundError("Vendor profile not found");

      const skip = (q.page - 1) * q.limit;
      const filter: Record<string, unknown> = { vendorId: vendor._id };
      if (q.status) filter.status = q.status;

      const [items, total] = await Promise.all([
        VerificationRequestModel.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(q.limit)
          .lean(),
        VerificationRequestModel.countDocuments(filter),
      ]);

      res.json({ items, page: q.page, limit: q.limit, total });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /api/vendors/me/verification-requests/{id}:
 *   get:
 *     tags: [Vendor Verification]
 *     summary: Get a verification request (Vendor only)
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
verificationRequestsRoutes.get(
  "/me/verification-requests/:id",
  requireAuth,
  requireRole(UserRole.VENDOR),
  async (req, res, next) => {
    try {
      const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
      if (!vendor) throw new NotFoundError("Vendor profile not found");

      const id = String(req.params.id);
      if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Verification request not found");

      const doc = await VerificationRequestModel.findOne({ _id: id, vendorId: vendor._id }).lean();
      if (!doc) throw new NotFoundError("Verification request not found");

      res.json(doc);
    } catch (err) {
      next(err);
    }
  },
);
