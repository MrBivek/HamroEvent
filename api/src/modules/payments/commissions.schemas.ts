import { z } from "zod";

export const CommissionMonthQuerySchema = z.object({
    month: z
        .string()
        .regex(/^\d{4}-\d{2}$/)
        .optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(20),
});

export const InitiateCommissionPaymentSchema = z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/),
    amount: z.number().positive(),
    provider: z.string().min(2),
});
