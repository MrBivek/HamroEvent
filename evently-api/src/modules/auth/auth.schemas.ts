import { z } from "zod";

const Password = z.string().min(6);

export const RegisterCustomerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: Password,
  acceptTerms: z.boolean().optional(),
});

export const RegisterVendorSchema = z.object({
  account: z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional(),
    password: Password,
    acceptTerms: z.boolean().optional(),
  }),
  business: z.object({
    businessName: z.string().min(2),
    categoryId: z.string().optional(),
    description: z.string().optional(),
    primaryLocationId: z.string().optional(),
    serviceAreas: z.array(z.string()).optional(),

    website: z.string().optional(),
    instagram: z.string().optional(),
    facebook: z.string().optional(),
  }),
  packages: z
    .array(
      z.object({
        title: z.string().min(2),
        description: z.string().optional(),
        priceMin: z.number().optional(),
        priceMax: z.number().optional(),
        includes: z.array(z.string()).optional(),
      }),
    )
    .optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: Password,
});
