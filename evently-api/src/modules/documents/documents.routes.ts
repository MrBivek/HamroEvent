import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { UserRole, DocumentOwnerType } from "../../common/enums.js";
import { VendorModel } from "../vendors/vendor.model.js";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import { DocumentModel } from "./document.model.js";
import { CreateDocumentSchema, DocumentListQuerySchema } from "./documents.schemas.js";
import { saveBase64File } from "../../common/fileStorage.js";

export const documentsRoutes = Router();

/**
 * @openapi
 * /api/vendors/me/documents:
 *   post:
 *     tags: [Documents]
 *     summary: Upload a document record (Vendor only, mock storage)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: "Business Registration" }
 *               type: { type: string, example: "LICENSE" }
 *               url: { type: string, example: "/uploads/documents/license.pdf" }
 *               data: { type: string, description: "Base64 or data URL" }
 *               mimeType: { type: string, example: "application/pdf" }
 *     responses:
 *       201: { description: Created }
 */
documentsRoutes.post(
  "/me/documents",
  requireAuth,
  requireRole(UserRole.VENDOR),
  validateBody(CreateDocumentSchema),
  async (req, res, next) => {
    try {
      const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
      if (!vendor) throw new NotFoundError("Vendor profile not found");

      let url = req.body.url;
      if (!url && req.body.data) {
        const saved = saveBase64File({
          data: req.body.data,
          folder: `documents/${vendor._id.toString()}`,
          filenamePrefix: "doc",
          mimeTypeHint: req.body.mimeType,
        });
        url = saved.url;
      }
      if (!url) throw new BadRequestError("Document data or url missing");

      const doc = await DocumentModel.create({
        ownerType: DocumentOwnerType.VENDOR,
        ownerId: vendor._id,
        name: req.body.name,
        type: req.body.type,
        url,
        uploadedBy: new mongoose.Types.ObjectId(req.auth!.sub),
      });

      res.status(201).json(doc);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /api/vendors/me/documents:
 *   get:
 *     tags: [Documents]
 *     summary: List my documents (Vendor only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: number, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: number, default: 20 }
 *     responses:
 *       200: { description: OK }
 */
documentsRoutes.get(
  "/me/documents",
  requireAuth,
  requireRole(UserRole.VENDOR),
  async (req, res, next) => {
    try {
      const q = DocumentListQuerySchema.parse(req.query);
      const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
      if (!vendor) throw new NotFoundError("Vendor profile not found");

      const skip = (q.page - 1) * q.limit;
      const filter = { ownerType: DocumentOwnerType.VENDOR, ownerId: vendor._id };

      const [items, total] = await Promise.all([
        DocumentModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(q.limit).lean(),
        DocumentModel.countDocuments(filter),
      ]);

      res.json({ items, page: q.page, limit: q.limit, total });
    } catch (err) {
      next(err);
    }
  },
);
