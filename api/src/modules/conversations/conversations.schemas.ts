import { z } from "zod";

export const CreateConversationSchema = z.object({
    bookingId: z.string().optional(),
    vendorId: z.string().optional(),
    customerUserId: z.string().optional(),
});

export const CreateMessageSchema = z.object({
    text: z.string().min(1),
});

export const ConversationListQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(20),
});

export const MessageListQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(50),
});
