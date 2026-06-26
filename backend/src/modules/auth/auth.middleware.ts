import type { NextFunction, Request, Response } from "express";
import { verifyToken, type AuthRole, type JwtPayload } from "../../config/jwt.js";

declare global {
  namespace Express {
    interface Locals {
      auth?: JwtPayload & { token: string };
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header("Authorization");
  const [scheme, token] = authHeader?.split(" ") ?? [];

  if (scheme !== "Bearer" || !token) {
    res.status(401).json({ ok: false, reason: "missing-token" });
    return;
  }

  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ ok: false, reason: "invalid-token" });
    return;
  }

  res.locals.auth = { ...payload, token };
  next();
}

export function requireRole(...roles: AuthRole[]) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const auth = res.locals.auth;

    if (!auth) {
      res.status(401).json({ ok: false, reason: "missing-token" });
      return;
    }

    if (!roles.includes(auth.role)) {
      res.status(403).json({ ok: false, reason: "forbidden" });
      return;
    }

    next();
  };
}
