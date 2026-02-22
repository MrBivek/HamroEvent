import { z } from "zod";

const Password = z.string().min(6);

export const RegisterCustomerSchema = z.object({
  fullName: z.string().min(2).optional(),
  name: z.string().min(2).optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  password: Password,
  acceptTerms: z.boolean().optional(),
}).refine((data) => Boolean(data.fullName || data.name), {
  message: "fullName or name is required",
  path: ["fullName"],
});

export const RegisterVendorSchema = z.object({
  account: z.object({
    fullName: z.string().min(2).optional(),
    name: z.string().min(2).optional(),
    email: z.string().email(),
    phone: z.string().optional(),
    password: Password,
    acceptTerms: z.boolean().optional(),
  }).refine((data) => Boolean(data.fullName || data.name), {
    message: "fullName or name is required",
    path: ["fullName"],
  }),
  business: z.object({
    businessName: z.string().min(2),
    categoryId: z.string().optional(),
    category: z.string().optional(),
    description: z.string().optional(),
    primaryLocationId: z.string().optional(),
    location: z.string().optional(),
    serviceAreas: z.array(z.string()).optional(),

    website: z.string().optional(),
    instagram: z.string().optional(),
    facebook: z.string().optional(),
  }),
  packages: z
    .array(
      z.object({
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
      }),
    )
    .optional(),
  portfolioMedia: z.array(z.string()).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: Password,
});
