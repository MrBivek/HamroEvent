import { z } from "zod";
import { QuoteStatus } from "../../common/enums.js";

export const CreateQuoteSchema = z.object({
    amount: z.number().positive(),
    message: z.string().optional(),
    expiresAt: z.string().optional(),
});

export const UpdateQuoteSchema = z.object({
    amount: z.number().positive().optional(),
    message: z.string().optional(),
    expiresAt: z.string().optional(),
});

export const QuoteListQuerySchema = z.object({
    status: z.enum(Object.values(QuoteStatus) as [string, ...string[]]).optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(20),
});
