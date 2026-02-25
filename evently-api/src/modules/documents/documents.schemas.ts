import { z } from "zod";

export const CreateDocumentSchema = z
    .object({
        name: z.string().min(2),
        type: z.string().optional(),
        url: z.string().min(4).optional(),
        data: z.string().min(10).optional(),
        mimeType: z.string().optional(),
    })
    .refine((data) => Boolean(data.url || data.data), {
        message: "url or data is required",
        path: ["url"],
    });

export const DocumentListQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(20),
});
