import { z } from "zod";

export const UpdateVendorMeSchema = z.object({
  businessName: z.string().min(2).optional(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  category: z.string().optional(),
  primaryLocationId: z.string().optional(),
  location: z.string().optional(),
  locations: z.array(z.string()).optional(),
  serviceAreas: z.array(z.string()).optional(),
  contact: z
    .object({
      phone: z.string().optional(),
      email: z.string().optional(),
    })
    .optional(),
  social: z
    .object({
      website: z.string().optional(),
      instagram: z.string().optional(),
      facebook: z.string().optional(),
    })
    .optional(),
  socialLinks: z
    .object({
      website: z.string().optional(),
      instagram: z.string().optional(),
      facebook: z.string().optional(),
    })
    .optional(),
  portfolioMedia: z.array(z.string()).optional(),
});

export const VendorListQuerySchema = z.object({
  q: z.string().optional(),
  categoryId: z.string().optional(),
  category: z.string().optional(),
  locationId: z.string().optional(),
  location: z.string().optional(),
  verifiedStatus: z.string().optional(),
  verified: z.coerce.boolean().optional(),
  priceMin: z.coerce.number().optional(),
  priceMax: z.coerce.number().optional(),
  minRating: z.coerce.number().optional(),
  sortBy: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export const UploadPortfolioSchema = z.object({
  images: z
    .array(
      z.object({
        data: z.string().min(10),
        filename: z.string().optional(),
        mimeType: z.string().optional(),
      }),
    )
    .min(1),
});

export const DeletePortfolioSchema = z.object({
  url: z.string().min(4),
});
