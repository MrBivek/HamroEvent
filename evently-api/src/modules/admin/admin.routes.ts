import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { UserRole, VerificationStatus } from "../../common/enums.js";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import { VendorModel } from "../vendors/vendor.model.js";

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
            const { id } = req.params;
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

            // note can be stored later in verificationRequests/auditLogs (next iteration)
            res.json({ vendor, note: note || undefined });
        } catch (err) {
            next(err);
        }
    }
);
