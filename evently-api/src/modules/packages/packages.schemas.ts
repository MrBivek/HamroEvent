import { z } from "zod";

export const CreatePackageSchema = z.object({
    categoryId: z.string().optional(),
    title: z.string().min(2),
    description: z.string().optional(),
    priceMin: z.number().optional(),
    priceMax: z.number().optional(),
    includes: z.array(z.string()).optional(),
});

export const UpdatePackageSchema = CreatePackageSchema.partial();
