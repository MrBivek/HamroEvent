import { Router } from "express";
import { CategoryModel } from "./category.model.js";

export const categoriesRoutes = Router();

/**
 * @openapi
 * /api/categories:
 *   get:
 *     tags: [Catalog]
 *     summary: List categories
 *     parameters:
 *       - in: query
 *         name: active
 *         schema: { type: boolean }
 *         description: If true, only active categories
 *     responses:
 *       200: { description: OK }
 */
categoriesRoutes.get("/", async (req, res, next) => {
    try {
        const activeOnly = String(req.query.active ?? "true") === "true";
        const filter = activeOnly ? { isActive: true } : {};
        const items = await CategoryModel.find(filter).sort({ name: 1 }).lean();
        res.json({ items });
    } catch (err) {
        next(err);
    }
});
