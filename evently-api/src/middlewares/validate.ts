import type { ZodSchema } from "zod";
import type { RequestHandler } from "express";
import { BadRequestError } from "../common/errors.js";

export function validateBody(schema: ZodSchema): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new BadRequestError("Validation failed", result.error.flatten()));
    }
    req.body = result.data;
    next();
  };
}
