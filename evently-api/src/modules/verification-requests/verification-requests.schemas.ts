import { z } from "zod";

export const CreateVerificationRequestSchema = z.object({
  documentIds: z.array(z.string()).optional(),
  vendorNote: z.string().optional(),
});

export const VerificationRequestListQuerySchema = z.object({
  status: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export const AdminDecisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT", "RESUBMIT_REQUIRED"]),
  note: z.string().optional(),
});
