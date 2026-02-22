import { z } from "zod";
const BaseEventSchema = z.object({
  title: z.string().min(2),
  eventType: z.string().min(2),
  eventDate: z.string().min(8).optional(),
  date: z.string().min(8).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  locationText: z.string().optional(),
  location: z.string().optional(),
  locationId: z.string().optional(),
  guestCount: z.number().int().positive().optional(),
  budgetMin: z.number().nonnegative().optional(),
  budgetMax: z.number().nonnegative().optional(),
  budget: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

export const CreateEventSchema = BaseEventSchema.refine((data) => Boolean(data.eventDate || data.date), {
  message: "eventDate or date is required",
  path: ["eventDate"],
});

export const UpdateEventSchema = BaseEventSchema.partial();

export const EventListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});
