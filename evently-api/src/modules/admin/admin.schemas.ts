import { z } from "zod";
import { UserStatus } from "../../common/enums.js";

export const AdminUserListQuerySchema = z.object({
  q: z.string().optional(),
  role: z.string().optional(),
  status: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export const AdminUpdateUserSchema = z
  .object({
    isActive: z.boolean().optional(),
    status: z.enum(Object.values(UserStatus) as [string, ...string[]]).optional(),
  })
  .refine((data) => data.isActive !== undefined || data.status !== undefined, {
    message: "isActive or status is required",
    path: ["isActive"],
  });

export const AdminReviewListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  hidden: z.coerce.boolean().optional(),
});

export const AdminReviewUpdateSchema = z.object({
  isHidden: z.boolean(),
  moderationReason: z.string().optional(),
});
