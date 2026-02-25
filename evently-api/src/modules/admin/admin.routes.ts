import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { UserRole, VerificationStatus, NotificationType } from "../../common/enums.js";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import { VendorModel } from "../vendors/vendor.model.js";
import { PackageModel } from "../packages/package.model.js";
import { createAuditLog } from "../audit-logs/audit-logs.service.js";
import { createNotification } from "../notifications/notifications.service.js";
import { validateBody } from "../../middlewares/validate.js";
import {
  AdminUserListQuerySchema,
  AdminUpdateUserSchema,
  AdminReviewListQuerySchema,
  AdminReviewUpdateSchema,
} from "./admin.schemas.js";
import { UserModel } from "../auth/user.model.js";
import { ReviewModel } from "../reviews/review.model.js";
import { BookingModel } from "../bookings/booking.model.js";
import { mapVerificationStatusToUi, toUiUser } from "../../common/mappers.js";
import { VerificationRequestModel } from "../verification-requests/verification-request.model.js";
import { CategoryModel } from "../categories/category.model.js";

export const adminRoutes = Router();

/**
 * @openapi
 * /api/admin/dashboard:
 *   get:
 *     tags: [Admin]
 *     summary: Admin dashboard stats
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
adminRoutes.get("/dashboard", requireAuth, requireRole(UserRole.ADMIN), async (_req, res, next) => {
  try {
    const [totalUsers, activeVendors, totalBookings, avgRatingAgg] = await Promise.all([
      UserModel.countDocuments({}),
      VendorModel.countDocuments({ verifiedStatus: VerificationStatus.APPROVED }),
      BookingModel.countDocuments({}),
      VendorModel.aggregate([
        { $match: { ratingCount: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: "$ratingAvg" } } },
      ]),
    ]);

    const avgRating = avgRatingAgg.length ? Number(avgRatingAgg[0].avg.toFixed(2)) : 0;

    const pending = await VerificationRequestModel.find({ status: VerificationStatus.PENDING })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    const vendorIds = pending.map((p) => p.vendorId);
    const vendors = await VendorModel.find({ _id: { $in: vendorIds } }).lean();
    const categoryIds = vendors
      .map((v) => v.categoryId)
      .filter((id): id is mongoose.Types.ObjectId => Boolean(id));
    const categories = categoryIds.length
      ? await CategoryModel.find({ _id: { $in: categoryIds } }).lean()
      : [];
    const categoryMap = new Map(categories.map((c) => [c._id.toString(), c]));
    const vendorMap = new Map(vendors.map((v) => [v._id.toString(), v]));

    const pendingVendors = pending.map((req) => {
      const vendor = vendorMap.get(req.vendorId.toString());
      const category = vendor?.categoryId
        ? categoryMap.get(vendor.categoryId.toString())
        : undefined;
      return {
        id: req._id.toString(),
        name: vendor?.businessName ?? "",
        category: category?.name ?? category?.slug ?? "",
        date: req.submittedAt?.toISOString(),
      };
    });

    res.json({
      stats: {
        totalUsers,
        activeVendors,
        totalBookings,
        avgRating,
      },
      pendingVendors,
    });
  } catch (err) {
    next(err);
  }
});

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
        { $set: { verifiedStatus: status, verificationNote: note || undefined } },
        { new: true },
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

      if (
        status === VerificationStatus.APPROVED ||
        status === VerificationStatus.REJECTED ||
        status === VerificationStatus.RESUBMIT_REQUIRED
      ) {
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
  },
);

/**
 * @openapi
 * /api/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List users (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: role
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, example: "2026-02-01" }
 *       - in: query
 *         name: to
 *         schema: { type: string, example: "2026-02-25" }
 *       - in: query
 *         name: page
 *         schema: { type: number, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: number, default: 20 }
 *     responses:
 *       200: { description: OK }
 */
adminRoutes.get("/users", requireAuth, requireRole(UserRole.ADMIN), async (req, res, next) => {
  try {
    const q = AdminUserListQuerySchema.parse(req.query);
    const skip = (q.page - 1) * q.limit;

    const filter: Record<string, unknown> = {};
    if (q.role) filter.role = q.role.toUpperCase();
    if (q.status) filter.status = q.status.toUpperCase();
    if (q.q) {
      filter.$or = [
        { fullName: { $regex: q.q, $options: "i" } },
        { email: { $regex: q.q, $options: "i" } },
      ];
    }
    if (q.from || q.to) {
      const createdAt: Record<string, Date> = {};
      if (q.from) {
        const from = new Date(q.from);
        if (Number.isNaN(from.getTime())) throw new BadRequestError("Invalid from date");
        if (q.from.length <= 10) from.setHours(0, 0, 0, 0);
        createdAt.$gte = from;
      }
      if (q.to) {
        const to = new Date(q.to);
        if (Number.isNaN(to.getTime())) throw new BadRequestError("Invalid to date");
        if (q.to.length <= 10) to.setHours(23, 59, 59, 999);
        createdAt.$lte = to;
      }
      filter.createdAt = createdAt;
    }

    const [items, total] = await Promise.all([
      UserModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(q.limit).lean(),
      UserModel.countDocuments(filter),
    ]);

    const vendorUserIds = items
      .filter((user) => user.role === UserRole.VENDOR)
      .map((user) => user._id);
    const vendors = vendorUserIds.length
      ? await VendorModel.find({ userId: { $in: vendorUserIds } })
          .select({ userId: 1, verifiedStatus: 1 })
          .lean()
      : [];
    const vendorMap = new Map(vendors.map((v) => [v.userId.toString(), v]));

    const mapped = items.map((user) => {
      const base = toUiUser(user as any);
      const vendor = vendorMap.get(user._id.toString());
      return vendor
        ? { ...base, verificationStatus: mapVerificationStatusToUi(vendor.verifiedStatus) }
        : base;
    });

    res.json({ items: mapped, page: q.page, limit: q.limit, total });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/admin/users/{id}:
 *   patch:
 *     tags: [Admin]
 *     summary: Update a user (Admin only)
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
 *               isActive: { type: boolean }
 *               status: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 */
adminRoutes.patch(
  "/users/:id",
  requireAuth,
  requireRole(UserRole.ADMIN),
  validateBody(AdminUpdateUserSchema),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      if (!mongoose.isValidObjectId(id)) throw new NotFoundError("User not found");

      const updates: Record<string, unknown> = {};
      if (req.body.status) {
        updates.status = req.body.status;
      } else if (typeof req.body.isActive === "boolean") {
        updates.status = req.body.isActive ? "ACTIVE" : "SUSPENDED";
      }

      const user = await UserModel.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
      if (!user) throw new NotFoundError("User not found");

      await createAuditLog({
        actorUserId: req.auth!.sub,
        action: "USER_STATUS_UPDATE",
        targetType: "User",
        targetId: user._id,
        metadata: updates,
      });

      res.json(toUiUser(user));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /api/admin/reviews:
 *   get:
 *     tags: [Admin]
 *     summary: List reviews (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: hidden
 *         schema: { type: boolean }
 *       - in: query
 *         name: page
 *         schema: { type: number, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: number, default: 20 }
 *     responses:
 *       200: { description: OK }
 */
adminRoutes.get("/reviews", requireAuth, requireRole(UserRole.ADMIN), async (req, res, next) => {
  try {
    const q = AdminReviewListQuerySchema.parse(req.query);
    const skip = (q.page - 1) * q.limit;
    const filter: Record<string, unknown> = {};
    if (q.hidden === true) filter.isHidden = true;
    if (q.hidden === false) filter.isHidden = false;

    const [items, total] = await Promise.all([
      ReviewModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(q.limit).lean(),
      ReviewModel.countDocuments(filter),
    ]);
    const vendorIds = items.map((r) => r.vendorId);
    const customerIds = items.map((r) => r.customerId);
    const [vendors, customers] = await Promise.all([
      VendorModel.find({ _id: { $in: vendorIds } }).lean(),
      UserModel.find({ _id: { $in: customerIds } }).lean(),
    ]);
    const vendorMap = new Map(vendors.map((v) => [v._id.toString(), v]));
    const customerMap = new Map(customers.map((c) => [c._id.toString(), c]));

    const mapped = items.map((review) => ({
      ...review,
      _id: review._id.toString(),
      vendorName: vendorMap.get(review.vendorId.toString())?.businessName ?? "",
      customerName: customerMap.get(review.customerId.toString())?.fullName ?? "",
    }));

    res.json({ items: mapped, page: q.page, limit: q.limit, total });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/admin/analytics:
 *   get:
 *     tags: [Admin]
 *     summary: Analytics overview (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
adminRoutes.get("/analytics", requireAuth, requireRole(UserRole.ADMIN), async (_req, res, next) => {
  try {
    const bookings = await BookingModel.find({}).lean();
    const vendorIds = bookings.map((b) => b.vendorId);
    const vendors = await VendorModel.find({ _id: { $in: vendorIds } }).lean();
    const categoryIds = vendors
      .map((v) => v.categoryId)
      .filter((id): id is mongoose.Types.ObjectId => Boolean(id));
    const categories = categoryIds.length
      ? await CategoryModel.find({ _id: { $in: categoryIds } }).lean()
      : [];
    const categoryMap = new Map(categories.map((c) => [c._id.toString(), c.name]));
    const vendorMap = new Map(vendors.map((v) => [v._id.toString(), v]));

    const counts: Record<string, number> = {};
    for (const booking of bookings) {
      const vendor = vendorMap.get(booking.vendorId.toString());
      const categoryName = vendor?.categoryId
        ? (categoryMap.get(vendor.categoryId.toString()) ?? "Other")
        : "Other";
      counts[categoryName] = (counts[categoryName] ?? 0) + 1;
    }
    const total = Object.values(counts).reduce((sum, v) => sum + v, 0) || 1;
    const bookingsByCategory = Object.entries(counts).map(([category, count]) => ({
      category,
      count,
      percent: Math.round((count / total) * 100),
    }));

    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const monthlyBookings = Array.from({ length: 12 }, () => 0);
    for (const booking of bookings) {
      const date = booking.createdAt ?? new Date();
      if (date.getUTCFullYear() === currentYear) {
        monthlyBookings[date.getUTCMonth()] += 1;
      }
    }

    res.json({ bookingsByCategory, monthlyBookings });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/admin/reviews/{id}:
 *   patch:
 *     tags: [Admin]
 *     summary: Moderate a review (Admin only)
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
 *             required: [isHidden]
 *             properties:
 *               isHidden: { type: boolean }
 *               moderationReason: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 */
adminRoutes.patch(
  "/reviews/:id",
  requireAuth,
  requireRole(UserRole.ADMIN),
  validateBody(AdminReviewUpdateSchema),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Review not found");

      const review = await ReviewModel.findByIdAndUpdate(
        id,
        { $set: { isHidden: req.body.isHidden, moderationReason: req.body.moderationReason } },
        { new: true },
      ).lean();

      if (!review) throw new NotFoundError("Review not found");

      await createAuditLog({
        actorUserId: req.auth!.sub,
        action: "REVIEW_MODERATION",
        targetType: "Review",
        targetId: review._id,
        metadata: { isHidden: req.body.isHidden },
      });

      res.json(review);
    } catch (err) {
      next(err);
    }
  },
);
