import { Router } from "express";
import mongoose from "mongoose";
import { LocationModel } from "./location.model.js";

export const locationsRoutes = Router();

/**
 * @openapi
 * /api/locations:
 *   get:
 *     tags: [Catalog]
 *     summary: List locations
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search by name (contains)
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *         description: Filter by type (e.g., CITY)
 *       - in: query
 *         name: parentId
 *         schema: { type: string }
 *         description: Filter by parent location id
 *     responses:
 *       200: { description: OK }
 */
locationsRoutes.get("/", async (req, res, next) => {
    try {
        const q = String(req.query.q ?? "").trim();
        const type = String(req.query.type ?? "").trim();
        const parentId = String(req.query.parentId ?? "").trim();

        const filter: Record<string, unknown> = {};
        if (q) filter.name = { $regex: q, $options: "i" };
        if (type) filter.type = type;
        if (parentId && mongoose.isValidObjectId(parentId)) filter.parentId = new mongoose.Types.ObjectId(parentId);

        const items = await LocationModel.find(filter).sort({ name: 1 }).limit(200).lean();
        res.json({ items });
    } catch (err) {
        next(err);
    }
});
