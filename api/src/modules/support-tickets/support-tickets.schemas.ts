import { z } from "zod";
import { SupportTicketStatus } from "../../common/enums.js";

export const CreateSupportTicketSchema = z.object({
    subject: z.string().min(3),
    message: z.string().min(5),
});

export const SupportTicketListQuerySchema = z.object({
    status: z.enum(Object.values(SupportTicketStatus) as [string, ...string[]]).optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(20),
});

export const UpdateSupportTicketSchema = z.object({
    status: z.enum(Object.values(SupportTicketStatus) as [string, ...string[]]).optional(),
    assignedTo: z.string().optional(),
});
