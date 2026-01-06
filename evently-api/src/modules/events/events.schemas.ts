import { z } from "zod";
import { EventType } from "../../common/enums.js";

export const CreateEventSchema = z.object({
    title: z.string().min(2),
    eventType: z.enum(Object.values(EventType) as [string, ...string[]]),
    eventDate: z.string().min(8),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    locationText: z.string().optional(),
    locationId: z.string().optional(),
    guestCount: z.number().int().positive().optional(),
    budgetMin: z.number().nonnegative().optional(),
    budgetMax: z.number().nonnegative().optional(),
    notes: z.string().optional(),
});

export const UpdateEventSchema = CreateEventSchema.partial();

export const EventListQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(20),
});
