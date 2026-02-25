import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { UserRole } from "../../common/enums.js";
import { NotFoundError, BadRequestError } from "../../common/errors.js";
import { SupportTicketModel } from "./support-ticket.model.js";
import {
    SupportTicketListQuerySchema,
    UpdateSupportTicketSchema,
} from "./support-tickets.schemas.js";

export const adminSupportTicketsRoutes = Router();

/**
 * @openapi
 * /api/admin/support-tickets:
 *   get:
 *     tags: [Admin]
 *     summary: List support tickets (Admin only)
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
adminSupportTicketsRoutes.get(
    "/support-tickets",
    requireAuth,
    requireRole(UserRole.ADMIN),
    async (req, res, next) => {
        try {
            const q = SupportTicketListQuerySchema.parse(req.query);
            const skip = (q.page - 1) * q.limit;

            const filter: Record<string, unknown> = {};
            if (q.status) filter.status = q.status;

            const [items, total] = await Promise.all([
                SupportTicketModel.find(filter)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(q.limit)
                    .lean(),
                SupportTicketModel.countDocuments(filter),
            ]);

            res.json({ items, page: q.page, limit: q.limit, total });
        } catch (err) {
            next(err);
        }
    },
);

/**
 * @openapi
 * /api/admin/support-tickets/{id}:
 *   patch:
 *     tags: [Admin]
 *     summary: Update support ticket (Admin only)
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
 *             properties:
 *               status: { type: string }
 *               assignedTo: { type: string }
 *     responses:
 *       200: { description: OK }
 */
adminSupportTicketsRoutes.patch(
    "/support-tickets/:id",
    requireAuth,
    requireRole(UserRole.ADMIN),
    validateBody(UpdateSupportTicketSchema),
    async (req, res, next) => {
        try {
            const id = String(req.params.id);
            if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Support ticket not found");

            const updates: Record<string, unknown> = {};
            if (req.body.status) updates.status = req.body.status;
            if (req.body.assignedTo) {
                if (!mongoose.isValidObjectId(req.body.assignedTo)) {
                    throw new BadRequestError("Invalid assignedTo");
                }
                updates.assignedTo = new mongoose.Types.ObjectId(req.body.assignedTo);
            }

            const ticket = await SupportTicketModel.findByIdAndUpdate(
                id,
                { $set: updates },
                { new: true },
            ).lean();
            if (!ticket) throw new NotFoundError("Support ticket not found");

            res.json(ticket);
        } catch (err) {
            next(err);
        }
    },
);
