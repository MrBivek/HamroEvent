import { AppError } from "../common/errors.js";
import type { Request, Response, NextFunction } from "express";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      details: err.details ?? undefined,
    });
  }

  const message = err instanceof Error ? err.message : "Internal Server Error.";
  return res.status(500).json({ error: message });
}
