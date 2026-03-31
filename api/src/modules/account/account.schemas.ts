import { z } from "zod";

export const TwoFactorCodeSchema = z.object({
    code: z.string().length(6),
});
