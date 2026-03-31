import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { BadRequestError } from "../../common/errors.js";
import { ReportModel } from "./report.model.js";
import { CreateReportSchema } from "./reports.schemas.js";
import { createNotificationsForAdmins } from "../notifications/notifications.service.js";
import { NotificationType } from "../../common/enums.js";

export const reportsRoutes = Router();

/**
 * @openapi
 * /api/reports:
 *   post:
 *     tags: [Reports]
 *     summary: Submit a report (authenticated users)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [targetType, targetId, reason]
 *             properties:
 *               targetType: { type: string }
 *               targetId: { type: string }
 *               reason: { type: string }
 *     responses:
 *       201: { description: Created }
 */
reportsRoutes.post("/", requireAuth, validateBody(CreateReportSchema), async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.body.targetId))
            throw new BadRequestError("Invalid targetId");

        const report = await ReportModel.create({
            createdBy: req.auth!.sub,
            targetType: req.body.targetType,
            targetId: new mongoose.Types.ObjectId(req.body.targetId),
            reason: req.body.reason,
        });

        await createNotificationsForAdmins({
            type: NotificationType.SYSTEM,
            title: "New report submitted",
            body: `${req.body.targetType} reported`,
            link: "/admin/reports",
        });

        res.status(201).json(report);
    } catch (err) {
        next(err);
    }
});
