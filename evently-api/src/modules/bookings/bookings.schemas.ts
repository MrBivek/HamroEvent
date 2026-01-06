import { z } from "zod";
import { BookingStatus } from "../../common/enums.js";

export const CreateBookingSchema = z.object({
    vendorId: z.string().min(1),
    packageId: z.string().optional(),
    eventId: z.string().min(1),
    customerNote: z.string().optional(),
});

export const BookingListQuerySchema = z.object({
    status: z.enum(Object.values(BookingStatus) as [string, ...string[]]).optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(20),
});

export const VendorDecisionSchema = z.object({
    decision: z.enum(["ACCEPT", "REJECT"]),
    vendorNote: z.string().optional(),
    rejectReason: z.string().optional(),
});
