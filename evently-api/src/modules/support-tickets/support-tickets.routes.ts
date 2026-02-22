import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { SupportTicketModel } from "./support-ticket.model.js";
import {
  CreateSupportTicketSchema,
  SupportTicketListQuerySchema,
} from "./support-tickets.schemas.js";

export const supportTicketsRoutes = Router();

/**
 * @openapi
 * /api/support-tickets:
 *   post:
 *     tags: [Support]
 *     summary: Create a support ticket
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subject, message]
 *             properties:
 *               subject: { type: string }
 *               message: { type: string }
 *     responses:
 *       201: { description: Created }
 */
supportTicketsRoutes.post(
  "/",
  requireAuth,
  validateBody(CreateSupportTicketSchema),
  async (req, res, next) => {
    try {
      const ticket = await SupportTicketModel.create({
        createdBy: req.auth!.sub,
        subject: req.body.subject,
        message: req.body.message,
      });

      res.status(201).json(ticket);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /api/support-tickets:
 *   get:
 *     tags: [Support]
 *     summary: List my support tickets
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
supportTicketsRoutes.get("/", requireAuth, async (req, res, next) => {
  try {
    const q = SupportTicketListQuerySchema.parse(req.query);
    const skip = (q.page - 1) * q.limit;

    const filter: Record<string, unknown> = { createdBy: req.auth!.sub };
    if (q.status) filter.status = q.status;

    const [items, total] = await Promise.all([
      SupportTicketModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(q.limit).lean(),
      SupportTicketModel.countDocuments(filter),
    ]);

    res.json({ items, page: q.page, limit: q.limit, total });
  } catch (err) {
    next(err);
  }
});
