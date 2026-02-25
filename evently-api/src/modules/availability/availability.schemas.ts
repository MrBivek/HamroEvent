import { z } from "zod";

export const AvailabilityListQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export const UpsertAvailabilitySchema = z.object({
  isAvailable: z.boolean().optional(),
  slots: z
    .array(
      z.object({
        start: z.string().min(1),
        end: z.string().min(1),
      }),
    )
    .optional(),
  note: z.string().optional(),
});

export const PublicAvailabilityQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});
