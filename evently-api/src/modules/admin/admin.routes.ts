import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { UserRole, VerificationStatus, NotificationType } from "../../common/enums.js";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import { VendorModel } from "../vendors/vendor.model.js";
import { PackageModel } from "../packages/package.model.js";
import { createAuditLog } from "../audit-logs/audit-logs.service.js";
import { createNotification } from "../notifications/notifications.service.js";

export const adminRoutes = Router();

/**
 * @openapi
 * /api/admin/vendors/{id}/verification:
 *   patch:
 *     tags: [Admin]
 *     summary: Update vendor verification status (Admin only)
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, APPROVED, REJECTED, RESUBMIT_REQUIRED]
 *               note:
 *                 type: string
 *     responses:
 *       200: { description: OK }
 */
adminRoutes.patch(
    "/vendors/:id/verification",
    requireAuth,
    requireRole(UserRole.ADMIN),
    async (req, res, next) => {
        try {
            const id = String(req.params.id);
            if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Vendor not found");

            const status = String(req.body?.status ?? "").trim();
            const note = String(req.body?.note ?? "").trim();

            if (!Object.values(VerificationStatus).includes(status as any)) {
                throw new BadRequestError("Invalid verification status");
            }

            const vendor = await VendorModel.findByIdAndUpdate(
                id,
                { $set: { verifiedStatus: status } },
                { new: true }
            ).lean();

            if (!vendor) throw new NotFoundError("Vendor not found");

            if (status !== VerificationStatus.APPROVED) {
                await PackageModel.updateMany({ vendorId: vendor._id }, { $set: { isActive: false } });
            }

            await createAuditLog({
                actorUserId: req.auth!.sub,
                action: "VENDOR_VERIFICATION_DECISION",
                targetType: "Vendor",
                targetId: vendor._id,
                metadata: { decision: status, note: note || null },
            });

            if (status === VerificationStatus.APPROVED || status === VerificationStatus.REJECTED || status === VerificationStatus.RESUBMIT_REQUIRED) {
                const notificationType =
                    status === VerificationStatus.APPROVED
                        ? NotificationType.VENDOR_APPROVED
                        : status === VerificationStatus.REJECTED
                          ? NotificationType.VENDOR_REJECTED
                          : NotificationType.VENDOR_RESUBMIT;

                await createNotification({
                    userId: vendor.userId.toString(),
                    type: notificationType,
                    title:
                        status === VerificationStatus.APPROVED
                            ? "Vendor verification approved"
                            : status === VerificationStatus.REJECTED
                              ? "Vendor verification rejected"
                              : "Verification resubmission required",
                    body:
                        status === VerificationStatus.APPROVED
                            ? "Your verification request has been approved."
                            : status === VerificationStatus.REJECTED
                              ? "Your verification request was rejected."
                              : "Please update your verification documents and resubmit.",
                    link: "/vendor/verification",
                });
            }

            // note can be stored later in verificationRequests/auditLogs (next iteration)
            res.json({ vendor, note: note || undefined });
        } catch (err) {
            next(err);
        }
    }
);
