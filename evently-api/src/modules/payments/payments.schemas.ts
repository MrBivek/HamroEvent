import { z } from "zod";

export const CreatePaymentSchema = z.object({
  bookingId: z.string().min(1),
  amount: z.number().positive(),
  provider: z.string().min(2),
});

export const PaymentListQuerySchema = z.object({
  bookingId: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export const CreateRefundSchema = z.object({
  paymentId: z.string().min(1),
  amount: z.number().positive(),
  reason: z.string().optional(),
});

export const RefundListQuerySchema = z.object({
  bookingId: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export const CreatePayoutSchema = z.object({
  amount: z.number().positive(),
  bankLast4: z.string().optional(),
});
