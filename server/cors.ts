import type { Request, Response, NextFunction } from "express";

const defaultAllowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
];

function getAllowedOrigins() {
  const configuredOrigins = process.env.FRONTEND_URLS || process.env.FRONTEND_URL || "";
  const origins = configuredOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return [...new Set([...defaultAllowedOrigins, ...origins])];
}

export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();

  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  }
  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ message: "Origin is not allowed" });
  }

  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
}
