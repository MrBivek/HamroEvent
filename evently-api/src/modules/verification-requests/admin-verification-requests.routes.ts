import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { UserRole, VerificationStatus, NotificationType } from "../../common/enums.js";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import { VerificationRequestModel } from "./verification-request.model.js";
import {
  VerificationRequestListQuerySchema,
  AdminDecisionSchema,
} from "./verification-requests.schemas.js";
import { VendorModel } from "../vendors/vendor.model.js";
import { PackageModel } from "../packages/package.model.js";
import { CategoryModel } from "../categories/category.model.js";
import { LocationModel } from "../locations/location.model.js";
import { DocumentModel } from "../documents/document.model.js";
import { createAuditLog } from "../audit-logs/audit-logs.service.js";
import { createNotification } from "../notifications/notifications.service.js";

export const adminVerificationRequestsRoutes = Router();

/**
 * @openapi
 * /api/admin/verification-requests:
 *   get:
 *     tags: [Admin]
 *     summary: List verification requests (Admin only)
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
adminVerificationRequestsRoutes.get(
  "/verification-requests",
  requireAuth,
  requireRole(UserRole.ADMIN),
  async (req, res, next) => {
    try {
      const q = VerificationRequestListQuerySchema.parse(req.query);
      const skip = (q.page - 1) * q.limit;

      const filter: Record<string, unknown> = {};
      if (q.status) filter.status = q.status;

      const [items, total] = await Promise.all([
        VerificationRequestModel.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(q.limit)
          .lean(),
        VerificationRequestModel.countDocuments(filter),
      ]);

      const vendorIds = items.map((item) => item.vendorId);
      const vendors = await VendorModel.find({ _id: { $in: vendorIds } }).lean();
      const categoryIds = vendors.map((v) => v.categoryId).filter(Boolean) as mongoose.Types.ObjectId[];
      const locationIds = vendors.map((v) => v.primaryLocationId).filter(Boolean) as mongoose.Types.ObjectId[];

      const [categories, locations] = await Promise.all([
        CategoryModel.find({ _id: { $in: categoryIds } }).lean(),
        LocationModel.find({ _id: { $in: locationIds } }).lean(),
      ]);

      const categoryMap = new Map(categories.map((c) => [c._id.toString(), c]));
      const locationMap = new Map(locations.map((l) => [l._id.toString(), l]));
      const vendorMap = new Map(vendors.map((v) => [v._id.toString(), v]));

      const docCounts = await DocumentModel.aggregate([
        { $match: { ownerId: { $in: vendorIds } } },
        { $group: { _id: "$ownerId", count: { $sum: 1 } } },
      ]);
      const docCountMap = new Map(docCounts.map((d) => [d._id.toString(), d.count]));

      const mapped = items.map((item) => {
        const vendor = vendorMap.get(item.vendorId.toString());
        const category = vendor?.categoryId ? categoryMap.get(vendor.categoryId.toString()) : undefined;
        const location = vendor?.primaryLocationId
          ? locationMap.get(vendor.primaryLocationId.toString())
          : undefined;
        return {
          ...item,
          vendor: vendor
            ? {
                _id: vendor._id.toString(),
                businessName: vendor.businessName,
                category: category?.slug ?? "",
                location: vendor.locationText ?? location?.name ?? "",
              }
            : undefined,
          documentsCount: docCountMap.get(item.vendorId.toString()) ?? 0,
        };
      });

      res.json({ items: mapped, page: q.page, limit: q.limit, total });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /api/admin/verification-requests/{id}/decision:
 *   patch:
 *     tags: [Admin]
 *     summary: Approve or reject a verification request (Admin only)
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
 *             required: [decision]
 *             properties:
 *               decision: { type: string, enum: [APPROVE, REJECT, RESUBMIT_REQUIRED] }
 *               note: { type: string }
 *     responses:
 *       200: { description: OK }
 *       400: { description: Invalid transition }
 *       404: { description: Not found }
 */
adminVerificationRequestsRoutes.patch(
  "/verification-requests/:id/decision",
  requireAuth,
  requireRole(UserRole.ADMIN),
  validateBody(AdminDecisionSchema),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Verification request not found");

      const request = await VerificationRequestModel.findById(id);
      if (!request) throw new NotFoundError("Verification request not found");

      if (request.status !== VerificationStatus.PENDING) {
        throw new BadRequestError("Only PENDING requests can be decided");
      }

      let nextStatus: VerificationStatus = VerificationStatus.PENDING;
      let notificationType: NotificationType = NotificationType.VENDOR_APPROVED;
      let notificationTitle = "Vendor verification approved";
      let notificationBody = "Your verification request has been approved.";

      if (req.body.decision === "APPROVE") {
        nextStatus = VerificationStatus.APPROVED;
        notificationType = NotificationType.VENDOR_APPROVED;
        notificationTitle = "Vendor verification approved";
        notificationBody = "Your verification request has been approved.";
      } else if (req.body.decision === "REJECT") {
        nextStatus = VerificationStatus.REJECTED;
        notificationType = NotificationType.VENDOR_REJECTED;
        notificationTitle = "Vendor verification rejected";
        notificationBody = "Your verification request was rejected.";
      } else {
        nextStatus = VerificationStatus.RESUBMIT_REQUIRED;
        notificationType = NotificationType.VENDOR_RESUBMIT;
        notificationTitle = "Verification resubmission required";
        notificationBody = "Please update your verification documents and resubmit.";
      }

      request.status = nextStatus;
      request.adminNote = req.body.note;
      request.decidedAt = new Date();
      request.decidedBy = new mongoose.Types.ObjectId(req.auth!.sub);
      await request.save();

      const vendor = await VendorModel.findByIdAndUpdate(
        request.vendorId,
        { $set: { verifiedStatus: nextStatus, verificationNote: req.body.note } },
        { new: true },
      ).lean();
      if (!vendor) throw new NotFoundError("Vendor not found");

      if (nextStatus !== VerificationStatus.APPROVED) {
        await PackageModel.updateMany({ vendorId: vendor._id }, { $set: { isActive: false } });
      }

      await createAuditLog({
        actorUserId: req.auth!.sub,
        action: "VENDOR_VERIFICATION_DECISION",
        targetType: "Vendor",
        targetId: vendor._id,
        metadata: {
          decision: req.body.decision,
          note: req.body.note ?? null,
          requestId: request._id.toString(),
        },
      });

      await createNotification({
        userId: vendor.userId.toString(),
        type: notificationType,
        title: notificationTitle,
        body: notificationBody,
        link: "/vendor/verification",
      });

      res.json({ request: request.toObject(), vendor });
    } catch (err) {
      next(err);
    }
  },
);
