import { z } from "zod";

export const AuditLogListQuerySchema = z.object({
    action: z.string().optional(),
    targetType: z.string().optional(),
    targetId: z.string().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(20),
});
