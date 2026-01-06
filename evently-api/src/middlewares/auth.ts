import jwt from "jsonwebtoken";
import type { RequestHandler } from "express";
import { env } from "../configurations/env.js";
import type { UserRole } from "../common/enums.js";
import { ForbiddenError, UnauthorizedError } from "../common/errors.js";

type AuthTokenPayload = { sub: string; role: UserRole };

declare global {
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload;
    }
  }
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next(new UnauthorizedError("Missing token"));
  const token = header.slice("Bearer ".length);

  try {
    req.auth = jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
    next();
  } catch {
    next(new UnauthorizedError("Invalid or expired token"));
  }
};

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) return next(new UnauthorizedError("Missing auth context"));
    if (!roles.includes(req.auth.role)) return next(new ForbiddenError("Insufficient role"));
    next();
  };
}
