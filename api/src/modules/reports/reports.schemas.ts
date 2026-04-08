import { z } from "zod";
import { ReportStatus } from "../../common/enums.js";

export const CreateReportSchema = z.object({
    targetType: z.string().min(2),
    targetId: z.string().min(1),
    reason: z.string().min(5),
});

export const ReportListQuerySchema = z.object({
    status: z.enum(Object.values(ReportStatus) as [string, ...string[]]).optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(20),
});

export const AdminUpdateReportSchema = z.object({
    status: z.enum(Object.values(ReportStatus) as [string, ...string[]]),
});
