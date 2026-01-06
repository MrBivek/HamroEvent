import { z } from "zod";

export const UpdateVendorMeSchema = z.object({
    businessName: z.string().min(2).optional(),
    description: z.string().optional(),
    categoryId: z.string().optional(),
    primaryLocationId: z.string().optional(),
    locations: z.array(z.string()).optional(),
    serviceAreas: z.array(z.string()).optional(),
    social: z
        .object({
            website: z.string().optional(),
            instagram: z.string().optional(),
            facebook: z.string().optional(),
        })
        .optional(),
});

export const VendorListQuerySchema = z.object({
    q: z.string().optional(),
    categoryId: z.string().optional(),
    locationId: z.string().optional(),
    verifiedStatus: z.string().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(20),
});
