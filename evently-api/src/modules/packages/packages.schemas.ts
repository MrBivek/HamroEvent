import { z } from "zod";

const BasePackageSchema = z.object({
  categoryId: z.string().optional(),
  title: z.string().min(2).optional(),
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  priceMin: z.number().optional(),
  priceMax: z.number().optional(),
  includes: z.array(z.string()).optional(),
  inclusions: z.array(z.string()).optional(),
  duration: z.string().optional(),
  policies: z.string().optional(),
  addOns: z.array(z.string()).optional(),
});

export const CreatePackageSchema = BasePackageSchema.refine((data) => Boolean(data.title || data.name), {
  message: "title or name is required",
  path: ["title"],
});

export const UpdatePackageSchema = BasePackageSchema.partial();
