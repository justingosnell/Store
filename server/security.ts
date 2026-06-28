import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";

export function createRateLimiter(options: { windowMs: number; max: number; message: string }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const resetAt = now + options.windowMs;
    const clientKey = `${req.baseUrl || req.path}:${req.ip || req.socket.remoteAddress || "unknown"}`;
    try {
      const result = await db.execute(sql`
        INSERT INTO rate_limits (key, count, reset_at)
        VALUES (${clientKey}, 1, ${resetAt})
        ON CONFLICT (key) DO UPDATE SET
          count = CASE WHEN rate_limits.reset_at <= ${now} THEN 1 ELSE rate_limits.count + 1 END,
          reset_at = CASE WHEN rate_limits.reset_at <= ${now} THEN ${resetAt} ELSE rate_limits.reset_at END
        RETURNING count, reset_at
      `) as any;
      const row = result[0];
      const count = Number(row.count);
      const windowReset = Number(row.reset_at);
      res.setHeader("RateLimit-Limit", String(options.max));
      res.setHeader("RateLimit-Remaining", String(Math.max(0, options.max - count)));
      res.setHeader("RateLimit-Reset", String(Math.ceil(windowReset / 1000)));
      if (count > options.max) {
        res.setHeader("Retry-After", String(Math.ceil((windowReset - now) / 1000)));
        return res.status(429).json({ message: options.message });
      }
      next();
    } catch (error) {
      console.error("Rate limiter storage failed:", error);
      res.status(503).json({ message: "Request protection is temporarily unavailable" });
    }
  };
}

export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = typeof req.headers["x-request-id"] === "string" ? req.headers["x-request-id"] : crypto.randomUUID();
  res.locals.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}

export function requireTrustedOrigin(req: Request, res: Response, next: NextFunction) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (!origin) return next();
  const allowed = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || "http://localhost:3000")
    .split(",").map((value) => value.trim()).filter(Boolean);
  if (!allowed.includes(origin)) return res.status(403).json({ message: "Untrusted request origin" });
  next();
}
