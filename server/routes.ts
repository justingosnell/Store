import express, { type Express, type Request, type Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import PostgresStore from "connect-pg-simple";
import { Pool } from "pg";
import helmet from "helmet";
import { storage, ensureStorageReady } from "./storage";
import { runMigrations, initializeDatabase } from "./db";
import { deleteCloudinaryFile, isCloudinaryConfigured, listCloudinaryImages, uploadFileToCloudinary } from "./cloudinary-client";
import { geocodeLocation, isValidUSCoordinates } from "./geocoding";
import bcrypt from "bcrypt";
import { insertLocationSchema, insertProductSchema, type InsertMedia, type InsertProduct } from "@shared/schema";
import { z } from "zod";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { Readable } from "stream";
import { createRateLimiter, requestId, requireTrustedOrigin } from "./security";
import { createSquarePaymentLink } from "./square-checkout";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// XSS Protection: Sanitize user input to prevent XSS attacks
function sanitizeInput(input: string): string {
  if (!input || typeof input !== "string") return "";
  // Remove potentially dangerous characters and escape HTML entities
  return input
    .replace(/[<>\"'&]/g, (char) => {
      const entities: Record<string, string> = {
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#x27;",
        "&": "&amp;",
      };
      return entities[char] || char;
    })
    .trim();
}

// Extend session data type
declare module "express-session" {
  interface SessionData {
    userId: string;
    googleOAuthState?: string;
    googleTokens?: {
      accessToken: string;
      refreshToken?: string;
      expiresAt: number;
    };
  }
}

// Middleware to check if user is authenticated
function requireAuth(req: Request, res: Response, next: Function) {
  console.log("🔐 Auth check:", {
    sessionId: req.sessionID,
    userId: req.session.userId,
    cookies: req.headers.cookie ? "✓" : "✗",
  });
  if (!req.session.userId) {
    console.log("❌ Auth failed - no userId in session");
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

// Configure multer for file uploads - using dynamic import
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

let upload: any;
async function initMulter() {
  const multerModule = await import("multer");
  const multer = multerModule.default;
  
  // Use memory storage to store file in buffer instead of disk
  const storageConfig = multer.memoryStorage();

  upload = multer({
    storage: storageConfig,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req: any, file: any, cb: any) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error("Only image files are allowed (jpeg, jpg, png, gif, webp)"));
      }
    },
  });
}

// Helper function to compute file hash for deduplication from buffer
function computeFileHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `product-${Date.now()}`;
}

function getGoogleOAuthConfig(req?: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    (req ? `${req.protocol}://${req.get("host")}/api/google/search-console/callback` : "");

  return { clientId, clientSecret, redirectUri };
}

function getFrontendUrl() {
  return (process.env.FRONTEND_URL || process.env.FRONTEND_URLS?.split(",")[0] || "http://localhost:3000").trim();
}

function getDateRange(days = 28) {
  const end = new Date();
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  const format = (date: Date) => date.toISOString().slice(0, 10);
  return { startDate: format(start), endDate: format(end) };
}

async function exchangeGoogleCodeForTokens(code: string, req: Request) {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig(req);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google token exchange failed: ${response.status} ${errorText}`);
  }

  return response.json() as Promise<{ access_token: string; refresh_token?: string; expires_in: number }>;
}

async function refreshGoogleAccessToken(req: Request) {
  const tokens = req.session.googleTokens;
  if (!tokens) return undefined;
  if (tokens.expiresAt > Date.now() + 60_000) return tokens.accessToken;
  if (!tokens.refreshToken) return undefined;

  const { clientId, clientSecret } = getGoogleOAuthConfig(req);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokens.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) return undefined;

  const refreshed = await response.json() as { access_token: string; expires_in: number };
  req.session.googleTokens = {
    ...tokens,
    accessToken: refreshed.access_token,
    expiresAt: Date.now() + refreshed.expires_in * 1000,
  };

  await new Promise<void>((resolve, reject) => req.session.save((err) => (err ? reject(err) : resolve())));
  return refreshed.access_token;
}

async function requireGoogleAccessToken(req: Request, res: Response) {
  const accessToken = await refreshGoogleAccessToken(req);
  if (!accessToken) {
    res.status(401).json({ message: "Google Search Console is not connected" });
    return undefined;
  }
  return accessToken;
}

async function googleApiRequest<T>(url: string, accessToken: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google API request failed: ${response.status} ${errorText}`);
  }

  return response.json() as Promise<T>;
}

function mapSearchConsoleRow(row?: { clicks?: number; impressions?: number; ctr?: number; position?: number }) {
  return {
    clicks: Math.round(row?.clicks || 0),
    impressions: Math.round(row?.impressions || 0),
    ctr: row?.ctr || 0,
    position: row?.position || 0,
  };
}

function hasChanged(previous: string | number | null | undefined, next: string | number | null | undefined) {
  return String(previous ?? "") !== String(next ?? "");
}

async function logAuditEvent(
  req: Request,
  action: string,
  resourceType: string,
  resourceId: string,
  summary: string,
  metadata: unknown = {}
) {
  try {
    const actor = req.session.userId ? await storage.getUser(req.session.userId) : undefined;
    await storage.createAuditLog({
      actorUserId: req.session.userId,
      actorUsername: actor?.username || "",
      action,
      resourceType,
      resourceId,
      summary,
      metadata: JSON.stringify(metadata),
    });
  } catch (error) {
    console.error("Audit log write failed:", error);
  }
}

async function syncCloudinaryMediaToLibrary() {
  if (!isCloudinaryConfigured) return;

  const [existingMedia, cloudinaryFiles] = await Promise.all([
    storage.getAllMedia(),
    listCloudinaryImages(),
  ]);
  const existingKeys = new Set(existingMedia.flatMap((item) => [item.storagePath, item.url]).filter(Boolean));

  for (const file of cloudinaryFiles) {
    const storagePath = `cloudinary:${file.publicId}`;
    if (existingKeys.has(storagePath) || existingKeys.has(file.url)) continue;

    await storage.createMedia({
      filename: file.filename,
      originalName: file.filename,
      url: file.url,
      mimeType: file.mimeType || "image/jpeg",
      size: String(file.size || 0),
      width: file.width ? String(file.width) : "",
      height: file.height ? String(file.height) : "",
      alt: "",
      caption: "",
      storagePath,
      uploadedBy: "",
    });
  }
}

async function uploadFileToConfiguredStorage(file: Express.Multer.File): Promise<InsertMedia> {
  const fileHash = computeFileHash(file.buffer);
  const safeFileName = file.originalname.replace(/[^a-zA-Z0-9._-]+/g, "-");

  if (isCloudinaryConfigured) {
    console.log("📤 Uploading to Cloudinary...");
    const cloudinaryFile = await uploadFileToCloudinary(file.buffer, `${fileHash}-${Date.now()}-${safeFileName}`, file.mimetype);
    console.log("✅ Cloudinary upload successful");

    return {
      filename: cloudinaryFile.filename || file.originalname,
      originalName: file.originalname,
      url: cloudinaryFile.url,
      mimeType: cloudinaryFile.mimeType || file.mimetype,
      size: String(cloudinaryFile.size || file.size),
      width: cloudinaryFile.width ? String(cloudinaryFile.width) : "",
      height: cloudinaryFile.height ? String(cloudinaryFile.height) : "",
      alt: "",
      caption: "",
      storagePath: `cloudinary:${cloudinaryFile.publicId}`,
    };
  }

  console.warn("⚠️ Cloudinary is not configured. Storing uploaded image in the database.");
  const data = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

  return {
    filename: `${fileHash}-${safeFileName}`,
    originalName: file.originalname,
    url: "",
    mimeType: file.mimetype,
    size: String(file.size),
    width: "",
    height: "",
    alt: "",
    caption: "",
    data,
    storagePath: `database:${fileHash}`,
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required. The app does not use in-memory storage.");
  }

  // Initialize database with IPv4 resolution
  console.log("\n🔌 Initializing database connection...");
  await initializeDatabase();
  console.log("✅ Database initialized\n");

  // Run migrations to ensure database schema is up to date
  await runMigrations();
  
  // Ensure storage is initialized before setting up routes
  await ensureStorageReady();
  
  // Initialize multer
  await initMulter();
  
  
  // Security: Add Helmet middleware to prevent XSS, clickjacking, and other attacks
  // This sets various HTTP headers for security
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://unpkg.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", "https:", "ws://localhost:3000", "wss:"],
        frameSrc: ["'self'"],
        objectSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
    },
    xssFilter: true,
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }));
  app.use(requestId);
  app.use(requireTrustedOrigin);
  app.use("/api", createRateLimiter({ windowMs: 60_000, max: 180, message: "Too many requests. Please try again shortly." }));
  app.use("/api/auth/login", createRateLimiter({ windowMs: 15 * 60_000, max: 10, message: "Too many login attempts. Please wait and try again." }));
  app.use("/api/checkout", createRateLimiter({ windowMs: 60_000, max: 12, message: "Too many checkout attempts. Please wait and try again." }));
  
  // Serve uploaded files statically

  // Session configuration
  const isProduction = process.env.NODE_ENV === 'production';
  const sessionCookieName = process.env.SESSION_COOKIE_NAME || "connect.sid";
  if (isProduction && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters in production");
  }
  const sessionStoreName = "PostgreSQL";
  const requiresSsl =
    isProduction || /[?&]sslmode=require(?:&|$)/i.test(databaseUrl);
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
  });
  const sessionStore = new (PostgresStore(session))({
    pool,
    tableName: "session",
    createTableIfMissing: true,
  });
  console.log("💾 Using PostgreSQL session store");
  
  app.use(
    session({
      name: sessionCookieName,
      store: sessionStore,
      secret: process.env.SESSION_SECRET || "tiny-treasures-session-secret-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProduction,
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        sameSite: 'lax',
      },
    })
  );
  
  console.log("🍪 Session config:", { name: sessionCookieName, secure: isProduction, store: sessionStoreName, httpOnly: true, sameSite: 'lax' });

  // ============ Health Check Endpoint (for uptime monitoring) ============
  app.get("/health", async (_req: Request, res: Response) => {
    try {
      await storage.getAllProducts();
      res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.round(process.uptime()),
        database: "connected",
        squareConfigured: Boolean(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID),
      });
    } catch {
      res.status(503).json({ status: "degraded", timestamp: new Date().toISOString(), database: "unavailable" });
    }
  });

  app.post("/api/checkout/square", async (req: Request, res: Response) => {
    try {
      const body = z.object({
        items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1).max(25) })).min(1).max(50),
        giftBox: z.boolean().optional(),
        giftNote: z.string().max(500).optional(),
      }).parse(req.body);
      const lines = [];
      for (const item of body.items) {
        const product = await storage.getProduct(item.productId);
        if (!product || product.status !== "active") return res.status(400).json({ message: "A cart item is unavailable" });
        if ((product.inventory || 0) < item.quantity) return res.status(409).json({ message: `Not enough inventory for ${product.title}` });
        lines.push({ product, quantity: item.quantity });
      }
      const checkout = await createSquarePaymentLink({ lines, giftBox: body.giftBox, giftNote: body.giftNote });
      res.json(checkout);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid checkout request" });
      res.status(503).json({ message: error instanceof Error ? error.message : "Checkout unavailable" });
    }
  });

  // ============ Authentication Routes ============
  
  // Login with security features (account lockout, failed attempt tracking, XSS protection)
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      let { username, password } = req.body;

      // Security: Validate and sanitize inputs
      if (!username || typeof username !== "string" || username.trim().length === 0) {
        return res.status(400).json({ message: "Valid username is required" });
      }
      
      if (!password || typeof password !== "string" || password.length === 0) {
        return res.status(400).json({ message: "Password is required" });
      }

      // Sanitize username to prevent XSS attacks
      username = sanitizeInput(username);

      const user = await storage.getUserByUsername(username);
      if (!user) {
        // Generic message to prevent username enumeration
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check if account is locked (now requires 10 failed attempts instead of 5)
      if (user.isLocked === "true") {
        return res.status(403).json({
          message: "Account is locked due to too many failed login attempts. Please contact an administrator.",
        });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        // Record failed login attempt (locks after 10 attempts)
        await storage.recordFailedLogin(user.id);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Reset failed login attempts on successful login
      await storage.resetFailedLogins(user.id);

      req.session.userId = user.id;
      console.log("✅ Session userId set:", { userId: user.id, sessionID: req.sessionID });
      
      // Save session before sending response to ensure it's persisted
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("❌ Session save error:", err);
            reject(err);
          } else {
            console.log("✅ Session saved:", { sessionID: req.sessionID });
            resolve();
          }
        });
      });
      
      res.json({ 
        message: "Login successful",
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          mustChangePassword: user.mustChangePassword === "true",
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.clearCookie(sessionCookieName, {
        path: "/",
        secure: isProduction,
        httpOnly: true,
        sameSite: "lax",
      });
      res.json({ message: "Logout successful" });
    });
  });

  // Check authentication status
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    res.json({ 
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        mustChangePassword: user.mustChangePassword === "true",
      },
    });
  });

  // Change password (users can only change their own password)
  app.post("/api/auth/change-password", requireAuth, async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;

      // Security: Validate passwords are required
      if (!currentPassword || typeof currentPassword !== "string" || currentPassword.length === 0) {
        return res.status(400).json({ message: "Current password is required" });
      }
      
      if (!newPassword || typeof newPassword !== "string" || newPassword.length === 0) {
        return res.status(400).json({ message: "New password is required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      const success = await storage.updateUserPassword(user.id, newPassword);
      if (!success) {
        return res.status(500).json({ message: "Failed to update password" });
      }

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ============ Google Search Console OAuth + Analytics Import ============

  app.get("/api/google/search-console/status", requireAuth, async (req: Request, res: Response) => {
    const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig(req);
    res.json({
      configured: Boolean(clientId && clientSecret && redirectUri),
      connected: Boolean(req.session.googleTokens?.accessToken || req.session.googleTokens?.refreshToken),
    });
  });

  app.get("/api/google/search-console/auth", requireAuth, async (req: Request, res: Response) => {
    const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig(req);
    if (!clientId || !clientSecret || !redirectUri) {
      return res.status(500).json({
        message: "Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI.",
      });
    }

    const state = crypto.randomBytes(24).toString("hex");
    req.session.googleOAuthState = state;
    await new Promise<void>((resolve, reject) => req.session.save((err) => (err ? reject(err) : resolve())));

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      access_type: "offline",
      prompt: "consent",
      state,
    });

    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  });

  app.get("/api/google/search-console/callback", requireAuth, async (req: Request, res: Response) => {
    try {
      const { code, state, error } = req.query;
      if (error) {
        return res.redirect(`${getFrontendUrl()}/admin?google=denied`);
      }
      if (!code || typeof code !== "string" || state !== req.session.googleOAuthState) {
        return res.redirect(`${getFrontendUrl()}/admin?google=invalid`);
      }

      const tokens = await exchangeGoogleCodeForTokens(code, req);
      req.session.googleTokens = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || req.session.googleTokens?.refreshToken,
        expiresAt: Date.now() + tokens.expires_in * 1000,
      };
      req.session.googleOAuthState = undefined;
      await new Promise<void>((resolve, reject) => req.session.save((err) => (err ? reject(err) : resolve())));

      res.redirect(`${getFrontendUrl()}/admin?google=connected`);
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      res.redirect(`${getFrontendUrl()}/admin?google=error`);
    }
  });

  app.post("/api/google/search-console/disconnect", requireAuth, async (req: Request, res: Response) => {
    req.session.googleTokens = undefined;
    req.session.googleOAuthState = undefined;
    await new Promise<void>((resolve, reject) => req.session.save((err) => (err ? reject(err) : resolve())));
    res.json({ message: "Google Search Console disconnected" });
  });

  app.get("/api/google/search-console/properties", requireAuth, async (req: Request, res: Response) => {
    try {
      const accessToken = await requireGoogleAccessToken(req, res);
      if (!accessToken) return;

      const data = await googleApiRequest<{ siteEntry?: Array<{ siteUrl: string; permissionLevel: string }> }>(
        "https://www.googleapis.com/webmasters/v3/sites",
        accessToken
      );

      res.json({
        properties: (data.siteEntry || []).map((site) => ({
          siteUrl: site.siteUrl,
          permissionLevel: site.permissionLevel,
        })),
      });
    } catch (error) {
      console.error("Google properties error:", error);
      res.status(500).json({ message: "Failed to load Google Search Console properties" });
    }
  });

  app.get("/api/google/search-console/metrics", requireAuth, async (req: Request, res: Response) => {
    try {
      const accessToken = await requireGoogleAccessToken(req, res);
      if (!accessToken) return;

      const rawSiteUrl = typeof req.query.siteUrl === "string" ? req.query.siteUrl : "";
      if (!rawSiteUrl) {
        return res.status(400).json({ message: "siteUrl is required" });
      }

      const { startDate, endDate } = getDateRange(28);
      const encodedSiteUrl = encodeURIComponent(rawSiteUrl);
      const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/searchAnalytics/query`;

      const [summaryData, pageData] = await Promise.all([
        googleApiRequest<{ rows?: Array<{ clicks: number; impressions: number; ctr: number; position: number }> }>(endpoint, accessToken, {
          method: "POST",
          body: JSON.stringify({
            startDate,
            endDate,
            type: "web",
            rowLimit: 1,
          }),
        }),
        googleApiRequest<{ rows?: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }> }>(endpoint, accessToken, {
          method: "POST",
          body: JSON.stringify({
            startDate,
            endDate,
            type: "web",
            dimensions: ["page"],
            rowLimit: 10,
          }),
        }),
      ]);

      res.json({
        siteUrl: rawSiteUrl,
        startDate,
        endDate,
        summary: mapSearchConsoleRow(summaryData.rows?.[0]),
        pages: (pageData.rows || []).map((row) => ({
          page: row.keys?.[0] || "",
          ...mapSearchConsoleRow(row),
        })),
      });
    } catch (error) {
      console.error("Google metrics error:", error);
      res.status(500).json({ message: "Failed to import Search Console metrics" });
    }
  });

  // Middleware to check if user is admin
  function requireAdmin(req: Request, res: Response, next: Function) {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    // Will be checked in each endpoint after getting user details
    next();
  }

  // ============ User Management Routes (Admin Only) ============

  // Get all users (admin only)
  app.get("/api/admin/users", requireAdmin, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }

      const users = await storage.getAllUsers();
      // Don't send password hashes
      const safeUsers = users.map((u) => ({
        id: u.id,
        username: u.username,
        role: u.role,
        isLocked: u.isLocked === "true",
        failedLoginAttempts: parseInt(u.failedLoginAttempts || "0", 10),
        lastPasswordChange: u.lastPasswordChange,
        createdAt: u.createdAt,
        mustChangePassword: u.mustChangePassword === "true",
      }));
      res.json(safeUsers);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create new user (admin only)
  app.post("/api/admin/users", requireAdmin, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }

      let { username, password, role } = req.body;

      // Security: Validate and sanitize username
      if (!username || typeof username !== "string" || username.trim().length === 0) {
        return res.status(400).json({ message: "Valid username is required" });
      }
      
      if (!password || typeof password !== "string" || password.length === 0) {
        return res.status(400).json({ message: "Password is required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      if (role && !["admin", "manager"].includes(role)) {
        return res.status(400).json({ message: "Role must be either 'admin' or 'manager'" });
      }

      // Sanitize username to prevent XSS attacks
      username = sanitizeInput(username);

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await storage.createUser({
        username,
        password: hashedPassword,
        role: (role as "admin" | "manager") || "manager",
      });

      // Mark new user to change password on first login
      await storage.setMustChangePassword(newUser.id);

      res.status(201).json({
        message: "User created successfully",
        user: {
          id: newUser.id,
          username: newUser.username,
          role: newUser.role,
        },
      });
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Reset user password (admin only)
  app.post("/api/admin/users/:userId/reset-password", requireAdmin, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }

      const { userId } = req.params;
      const { newPassword } = req.body;

      if (!newPassword) {
        return res.status(400).json({ message: "New password is required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Prevent admin from resetting their own password via this endpoint
      if (userId === req.session.userId) {
        return res.status(400).json({
          message: "Use the change-password endpoint to reset your own password",
        });
      }

      const success = await storage.updateUserPassword(userId, newPassword);
      if (!success) {
        return res.status(500).json({ message: "Failed to reset password" });
      }

      // Mark user to change password on next login
      await storage.setMustChangePassword(userId);

      res.json({ message: "Password reset successfully. User must change it on next login." });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Lock user account (admin only)
  app.post("/api/admin/users/:userId/lock", requireAdmin, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }

      const { userId } = req.params;
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const success = await storage.lockUser(userId);
      if (!success) {
        return res.status(500).json({ message: "Failed to lock user" });
      }

      res.json({ message: "User account locked successfully" });
    } catch (error) {
      console.error("Lock user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Unlock user account (admin only)
  app.post("/api/admin/users/:userId/unlock", requireAdmin, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }

      const { userId } = req.params;
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const success = await storage.unlockUser(userId);
      if (!success) {
        return res.status(500).json({ message: "Failed to unlock user" });
      }

      res.json({ message: "User account unlocked successfully" });
    } catch (error) {
      console.error("Unlock user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ============ Media Library Routes ============
  
  // Get all media (public endpoint for slideshows)
  app.get("/api/media/public/list", async (req: Request, res: Response) => {
    try {
      await syncCloudinaryMediaToLibrary();
      const media = await storage.getAllMedia();
      res.json(media);
    } catch (error) {
      console.error("Get public media error:", error);
      res.status(500).json({ message: "Failed to fetch media" });
    }
  });

  // Get all media (admin endpoint)
  app.get("/api/media", requireAuth, async (req: Request, res: Response) => {
    try {
      await syncCloudinaryMediaToLibrary();
      const media = await storage.getAllMedia();
      res.json(media);
    } catch (error) {
      console.error("Get media error:", error);
      res.status(500).json({ message: "Failed to fetch media" });
    }
  });

  // Get single media item
  app.get("/api/media/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const mediaItem = await storage.getMedia(req.params.id);
      if (!mediaItem) {
        return res.status(404).json({ message: "Media not found" });
      }
      res.json(mediaItem);
    } catch (error) {
      console.error("Get media error:", error);
      res.status(500).json({ message: "Failed to fetch media" });
    }
  });

  // Serve image from database by ID (public endpoint)
  app.get("/api/image/:id", async (req: Request, res: Response) => {
    try {
      const mediaItem = await storage.getMedia(req.params.id);
      if (!mediaItem) {
        return res.status(404).json({ message: "Image not found" });
      }

      if (mediaItem.data?.startsWith("data:")) {
        const parts = mediaItem.data.split(";base64,");
        if (parts.length === 2) {
          const mimeType = parts[0].replace("data:", "");
          const base64Data = parts[1];
          res.setHeader("Content-Type", mimeType);
          res.setHeader("Cache-Control", "public, max-age=31536000");
          res.send(Buffer.from(base64Data, "base64"));
          return;
        }
      }

      if (mediaItem.url) {
        return res.redirect(mediaItem.url);
      }

      res.status(404).json({ message: "Image not found" });
    } catch (error) {
      console.error("Get image error:", error);
      res.status(500).json({ message: "Failed to fetch image" });
    }
  });

  // Wrapper to handle multer errors
  const uploadMiddleware = (req: Request, res: Response, next: Function) => {
    upload.single("image")(req, res, (err: any) => {
      if (err) {
        console.error("❌ Multer error:", err);
        return res.status(400).json({ message: err.message || "File upload failed" });
      }
      next();
    });
  };

  // Upload image to media library
  app.post("/api/media", requireAuth, uploadMiddleware, async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      console.log("📤 Upload started:", {
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });

      const mediaData = await uploadFileToConfiguredStorage(req.file);

      console.log("💾 Creating media record in database...");
      const mediaItem = await storage.createMedia({
        ...mediaData,
        uploadedBy: req.session.userId,
      });
      const responseMedia = mediaItem.url
        ? mediaItem
        : await storage.updateMedia(mediaItem.id, { url: `/api/image/${mediaItem.id}` }) || mediaItem;

      console.log("✅ Media record created:", responseMedia.id);
      res.status(201).json(responseMedia);
    } catch (error) {
      console.error("❌ Upload error:", {
        error,
        message: error instanceof Error ? error.message : "Unknown",
        stack: error instanceof Error ? error.stack : undefined,
      });
      const errorMsg = error instanceof Error ? error.message : "Failed to upload file";
      res.status(500).json({ message: errorMsg });
    }
  });

  // Update media metadata
  app.put("/api/media/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { alt, caption } = z.object({
        alt: z.string().trim().max(250).optional(),
        caption: z.string().trim().max(1000).optional(),
      }).parse(req.body);
      const updates: Partial<any> = {};
      
      if (alt !== undefined) updates.alt = alt;
      if (caption !== undefined) updates.caption = caption;

      const mediaItem = await storage.updateMedia(req.params.id, updates);
      
      if (!mediaItem) {
        return res.status(404).json({ message: "Media not found" });
      }

      await logAuditEvent(req, "media.metadata_updated", "media", mediaItem.id, `Updated image metadata for "${mediaItem.originalName}"`, {
        altUpdated: alt !== undefined,
        captionUpdated: caption !== undefined,
      });
      res.json(mediaItem);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid media metadata" });
      console.error("Update media error:", error);
      res.status(500).json({ message: "Failed to update media" });
    }
  });

  // Delete media
  app.delete("/api/media/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      if (req.headers["x-confirm-action"] !== "delete-media") {
        return res.status(409).json({ message: "Media deletion requires explicit confirmation." });
      }
      const mediaItem = await storage.getMedia(req.params.id);
      if (!mediaItem) {
        return res.status(404).json({ message: "Media not found" });
      }

      if (mediaItem.storagePath?.startsWith("cloudinary:")) {
        await deleteCloudinaryFile(mediaItem.storagePath.replace("cloudinary:", ""));
      }

      const success = await storage.deleteMedia(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Media not found" });
      }

      res.json({ message: "Media deleted successfully" });
    } catch (error) {
      console.error("Delete media error:", error);
      res.status(500).json({ message: "Failed to delete media" });
    }
  });

  // Legacy upload endpoint (for backward compatibility)
  // Now stores images in database like the new /api/media endpoint
  app.post("/api/upload", requireAuth, uploadMiddleware, async (req: Request, res: Response) => {
    try {
      console.log("📤 Upload endpoint called:", {
        userId: req.session.userId,
        filePresent: !!req.file,
        fileName: req.file?.originalname,
        fileSize: req.file?.size,
      });

      if (!req.file) {
        console.error("❌ No file in request");
        return res.status(400).json({ message: "No file uploaded" });
      }

      const mediaData = await uploadFileToConfiguredStorage(req.file);
      console.log("🔗 Generated public URL:", mediaData.url);

      try {
        const mediaItem = await storage.createMedia({
          ...mediaData,
          uploadedBy: req.session.userId,
        });
        const responseMedia = mediaItem.url
          ? mediaItem
          : await storage.updateMedia(mediaItem.id, { url: `/api/image/${mediaItem.id}` }) || mediaItem;

        console.log("✅ Media record created:", { id: responseMedia.id, url: responseMedia.url });

        res.json({ 
          url: responseMedia.url,
          filename: responseMedia.filename,
          originalName: responseMedia.originalName,
          size: responseMedia.size,
          id: responseMedia.id,
        });
      } catch (dbError) {
        console.error("❌ Failed to create media record:", {
          error: dbError,
          message: dbError instanceof Error ? dbError.message : "Unknown",
        });
        throw dbError;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to upload file";
      console.error("❌ Upload endpoint error:", { message: errorMsg, error });
      res.status(500).json({ message: errorMsg });
    }
  });

  // ============ Admin Routes ============

  // Cleanup orphaned media files and duplicates (admin only)
  app.post("/api/admin/cleanup-media", requireAuth, async (req: Request, res: Response) => {
    try {
      const allMedia = await storage.getAllMedia();
      
      // Find duplicates by URL
      const urlMap = new Map<string, (typeof allMedia)[number]>();
      const toDelete: string[] = [];
      
      for (const media of allMedia) {
        if (!urlMap.has(media.url)) {
          urlMap.set(media.url, media);
        } else {
          // This is a duplicate - mark it for deletion
          toDelete.push(media.id);
        }
      }
      
      // Delete all duplicates
      let deletedCount = 0;
      for (const mediaId of toDelete) {
        const success = await storage.deleteMedia(mediaId);
        if (success) deletedCount++;
      }
      
      console.log(`🧹 Cleaned up ${deletedCount} duplicate media entries`);
      
      res.json({
        message: `Cleanup complete. Removed ${deletedCount} duplicate media entries.`,
        deletedCount,
        remainingCount: allMedia.length - deletedCount,
      });
    } catch (error) {
      console.error("❌ Cleanup error:", error);
      const errorMsg = error instanceof Error ? error.message : "Cleanup failed";
      res.status(500).json({ message: errorMsg });
    }
  });

  // Fix broken media URLs (admin only)
  app.post("/api/admin/fix-broken-urls", requireAuth, async (req: Request, res: Response) => {
    try {
      const allMedia = await storage.getAllMedia();
      
      // Find entries with undefined in URL
      const brokenMedia = allMedia.filter(m => m.url.includes("undefined"));
      console.log(`🔍 Found ${brokenMedia.length} entries with broken URLs`);
      
      if (brokenMedia.length === 0) {
        return res.json({
          message: "No broken URLs found",
          fixedCount: 0,
        });
      }
      
      // Fix each broken URL
      const supabaseUrl = process.env.SUPABASE_URL || "https://fpaxndekwubupxlubvxj.supabase.co";
      const bucket = process.env.SUPABASE_BUCKET || "imageStore";
      
      let fixedCount = 0;
      for (const item of brokenMedia) {
        // Extract the storage path from the broken URL
        // From: undefined/storage/v1/object/public/undefined/media/...
        // Extract: media/...
        const storagePathMatch = item.url.match(/media\/.*$/);
        if (!storagePathMatch) {
          console.log(`⚠️  Could not extract storage path from: ${item.url}`);
          continue;
        }
        
        const storagePath = storagePathMatch[0];
        const fixedUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${storagePath}`;
        
        try {
          const updated = await storage.updateMedia(item.id, { url: fixedUrl });
          if (updated) fixedCount++;
          console.log(`✓ Fixed: ${item.originalName}`);
        } catch (error) {
          console.error(`✗ Failed to fix ${item.id}:`, error);
        }
      }
      
      console.log(`✅ Fixed ${fixedCount} broken URLs!`);
      
      res.json({
        message: `Fixed ${fixedCount} broken URLs`,
        fixedCount,
        remainingCount: allMedia.length - fixedCount,
      });
    } catch (error) {
      console.error("❌ Fix error:", error);
      const errorMsg = error instanceof Error ? error.message : "Fix failed";
      res.status(500).json({ message: errorMsg });
    }
  });

  // Fix media URLs with empty subdomain (https://.supabase.co/...)
  app.post("/api/admin/fix-empty-subdomain-urls", requireAuth, async (req: Request, res: Response) => {
    try {
      const allMedia = await storage.getAllMedia();
      
      // Find entries with .supabase.co but missing subdomain
      const brokenMedia = allMedia.filter(m => m.url.includes("://.supabase.co/"));
      console.log(`🔍 Found ${brokenMedia.length} media entries with empty subdomain URLs`);
      
      if (brokenMedia.length === 0) {
        return res.json({
          message: "No empty subdomain URLs found in media",
          fixedCount: 0,
        });
      }
      
      const supabaseUrl = process.env.SUPABASE_URL || "https://fpaxndekwubupxlubvxj.supabase.co";
      const bucket = process.env.SUPABASE_BUCKET || "imageStore";
      
      let fixedCount = 0;
      for (const item of brokenMedia) {
        // Extract the storage path from the broken URL
        // From: https://.supabase.co/storage/v1/object/public/imageStore/media/...
        // Extract: media/...
        const storagePathMatch = item.url.match(/media\/.*$/);
        if (!storagePathMatch) {
          console.log(`⚠️  Could not extract storage path from: ${item.url}`);
          continue;
        }
        
        const storagePath = storagePathMatch[0];
        const fixedUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${storagePath}`;
        
        try {
          const updated = await storage.updateMedia(item.id, { url: fixedUrl });
          if (updated) fixedCount++;
          console.log(`✓ Fixed: ${item.originalName} -> ${fixedUrl.substring(0, 60)}...`);
        } catch (error) {
          console.error(`✗ Failed to fix ${item.id}:`, error);
        }
      }
      
      console.log(`✅ Fixed ${fixedCount} media URLs with empty subdomain!`);
      
      res.json({
        message: `Fixed ${fixedCount} media URLs`,
        fixedCount,
        remainingCount: allMedia.length - fixedCount,
      });
    } catch (error) {
      console.error("❌ Fix error:", error);
      const errorMsg = error instanceof Error ? error.message : "Fix failed";
      res.status(500).json({ message: errorMsg });
    }
  });

  // Recover media from Supabase storage (admin only)
  app.post("/api/admin/recover-supabase-media", requireAuth, async (req: Request, res: Response) => {
    try {
      const { supabase, isSupabaseConfigured } = await import("./supabase-client");
      const { getPublicUrl } = await import("./supabase-client");

      const bucket = process.env.SUPABASE_BUCKET;
      if (!isSupabaseConfigured || !supabase || !bucket) {
        return res.status(503).json({
          message: "Supabase storage is not configured. Set SUPABASE_URL, SUPABASE_KEY, and SUPABASE_BUCKET.",
        });
      }

      // List all files in Supabase bucket
      const { data: files, error } = await supabase.storage.from(bucket).list();

      if (error) {
        console.error("Error listing Supabase files:", error);
        return res.status(500).json({ message: "Failed to list Supabase files" });
      }

      console.log(`📁 Found ${files.length} files in Supabase bucket`);

      // Get all existing media records from database
      const existingMedia = await storage.getAllMedia();
      const existingUrls = new Set(existingMedia.map((m) => m.url));

      console.log(`💾 Found ${existingMedia.length} media records in database`);

      // Filter files that aren't in the database
      const newFiles = files.filter((file) => {
        const fileUrl = getPublicUrl(bucket, file.name);
        return !existingUrls.has(fileUrl);
      });

      if (newFiles.length === 0) {
        return res.json({
          message: "All Supabase files are already in database",
          addedCount: 0,
          totalCount: existingMedia.length,
        });
      }

      console.log(`🆕 Found ${newFiles.length} new files to add`);

      // Add new files to database
      let addedCount = 0;
      for (const file of newFiles) {
        try {
          const fileUrl = getPublicUrl(bucket, file.name);
          const mimeType = getMimeType(file.name);
          await storage.createMedia({
            filename: file.name,
            originalName: file.name,
            url: fileUrl,
            mimeType,
            size: String(file.metadata?.size || 0),
            alt: "",
            caption: "",
          });
          addedCount++;
          console.log(`✅ Added: ${file.name}`);
        } catch (err) {
          console.error(`❌ Failed to add ${file.name}:`, err);
        }
      }

      console.log(`✨ Recovery complete! Added ${addedCount} media entries`);

      res.json({
        message: `Recovery complete! Added ${addedCount} media entries`,
        addedCount,
        totalCount: existingMedia.length + addedCount,
      });
    } catch (error) {
      console.error("❌ Recovery error:", error);
      const errorMsg = error instanceof Error ? error.message : "Recovery failed";
      res.status(500).json({ message: errorMsg });
    }
  });

  // Helper function to get MIME type
  function getMimeType(filename: string): string {
    const ext = filename.toLowerCase().split(".").pop();
    const mimeTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
    };
    return mimeTypes[ext || ""] || "application/octet-stream";
  }

  // Fix broken location photo URLs (admin only)
  app.post("/api/admin/fix-location-urls", requireAuth, async (req: Request, res: Response) => {
    try {
      const allLocations = await storage.getAllLocations();
      
      // Find entries with undefined in photoUrl
      const brokenLocations = allLocations.filter(l => l.photoUrl && l.photoUrl.includes("undefined"));
      console.log(`🔍 Found ${brokenLocations.length} locations with broken URLs`);
      
      if (brokenLocations.length === 0) {
        return res.json({
          message: "No broken location URLs found",
          fixedCount: 0,
        });
      }
      
      // Fix each broken URL
      const supabaseUrl = process.env.SUPABASE_URL || "https://fpaxndekwubupxlubvxj.supabase.co";
      const bucket = process.env.SUPABASE_BUCKET || "imageStore";
      
      let fixedCount = 0;
      for (const item of brokenLocations) {
        // Extract the storage path from the broken URL
        // From: undefined/storage/v1/object/public/undefined/media/...
        // Extract: media/...
        const storagePathMatch = item.photoUrl.match(/media\/.*$/);
        if (!storagePathMatch) {
          console.log(`⚠️  Could not extract storage path from: ${item.photoUrl}`);
          continue;
        }
        
        const storagePath = storagePathMatch[0];
        const fixedUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${storagePath}`;
        
        try {
          const updated = await storage.updateLocation(item.id, { photoUrl: fixedUrl });
          if (updated) fixedCount++;
          console.log(`✓ Fixed: ${item.name}`);
        } catch (error) {
          console.error(`✗ Failed to fix ${item.id}:`, error);
        }
      }
      
      console.log(`✅ Fixed ${fixedCount} location URLs!`);
      
      res.json({
        message: `Fixed ${fixedCount} location URLs`,
        fixedCount,
        remainingCount: allLocations.length - fixedCount,
      });
    } catch (error) {
      console.error("❌ Fix error:", error);
      const errorMsg = error instanceof Error ? error.message : "Fix failed";
      res.status(500).json({ message: errorMsg });
    }
  });

  // ============ Location Routes (Public) ============
  
  // Get all locations (public) with optional search
  // ============ Store Product Routes ============
  app.get("/api/products", async (_req: Request, res: Response) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error) {
      console.error("Get products error:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", async (req: Request, res: Response) => {
    try {
      const product =
        (await storage.getProduct(req.params.id)) ||
        (await storage.getProductByHandle(req.params.id));

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json(product);
    } catch (error) {
      console.error("Get product error:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.post("/api/products", requireAuth, async (req: Request, res: Response) => {
    try {
      const validatedData = insertProductSchema.parse({
        ...req.body,
        handle: req.body.handle || slugify(req.body.title || ""),
      }) as InsertProduct;
      const product = await storage.createProduct(validatedData);
      await logAuditEvent(req, "product.created", "product", product.id, `Created product "${product.title}"`, {
        title: product.title,
        price: product.price,
        status: product.status,
      });
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid product data", errors: error.errors });
      }
      console.error("Create product error:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.put("/api/products/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const existing = await storage.getProduct(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Product not found" });
      }

      const validatedData = insertProductSchema.partial().parse(req.body);
      const priceChanged = validatedData.price !== undefined && hasChanged(existing.price, validatedData.price);
      const statusChanged = validatedData.status !== undefined && hasChanged(existing.status, validatedData.status);
      const archiveRequested = validatedData.status === "archived" && existing.status !== "archived";

      if (priceChanged && req.body.confirmPriceChange !== true) {
        return res.status(409).json({
          message: "Changing a product price requires confirmation.",
          confirmationRequired: "price-change",
        });
      }

      if (archiveRequested && req.body.confirmArchive !== true) {
        return res.status(409).json({
          message: "Archiving a product requires confirmation.",
          confirmationRequired: "archive-product",
        });
      }

      const product = await storage.updateProduct(req.params.id, validatedData);
      if (product) {
        await logAuditEvent(req, "product.updated", "product", product.id, `Updated product "${product.title}"`, {
          before: {
            title: existing.title,
            price: existing.price,
            status: existing.status,
          },
          after: {
            title: product.title,
            price: product.price,
            status: product.status,
          },
        });

        if (priceChanged) {
          await logAuditEvent(req, "product.price_changed", "product", product.id, `Changed price for "${product.title}" from ${existing.price} to ${product.price}`, {
            previousPrice: existing.price,
            newPrice: product.price,
          });
        }

        if (statusChanged) {
          await logAuditEvent(req, "product.status_changed", "product", product.id, `Changed status for "${product.title}" from ${existing.status} to ${product.status}`, {
            previousStatus: existing.status,
            newStatus: product.status,
          });
        }
      }
      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid product data", errors: error.errors });
      }
      console.error("Update product error:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      if (req.get("X-Confirm-Action") !== "archive-product") {
        return res.status(409).json({
          message: "Archiving a product requires confirmation.",
          confirmationRequired: "archive-product",
        });
      }

      const existing = await storage.getProduct(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Product not found" });
      }

      const product = await storage.updateProduct(req.params.id, { status: "archived" });
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      await logAuditEvent(req, "product.archived", "product", product.id, `Archived product "${product.title}"`, {
        previousStatus: existing.status,
        newStatus: product.status,
        softDelete: true,
      });

      res.json({ message: "Product archived successfully", product });
    } catch (error) {
      console.error("Delete product error:", error);
      res.status(500).json({ message: "Failed to archive product" });
    }
  });

  app.get("/api/locations", async (req: Request, res: Response) => {
    try {
      const searchQuery = req.query.search as string | undefined;
      let locations = await storage.getAllLocations();
      
      console.log(`📍 Fetched ${locations.length} total locations from database`);
      
      // If search query is provided, filter locations
      if (searchQuery && searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        locations = locations.filter((location) => {
          // Search in name, category, state
          const nameMatch = location.name.toLowerCase().includes(query);
          const categoryMatch = location.category.toLowerCase().includes(query);
          const stateMatch = location.state.toLowerCase().includes(query);
          
          // Search in custom fields
          let customFieldsMatch = false;
          try {
            const customFields = JSON.parse(location.customFields || "{}");
            customFieldsMatch = Object.entries(customFields).some(([key, value]) => {
              const keyMatch = key.toLowerCase().includes(query);
              const valueMatch = String(value).toLowerCase().includes(query);
              return keyMatch || valueMatch;
            });
          } catch (e) {
            // Invalid JSON, skip custom fields search
          }
          
          return nameMatch || categoryMatch || stateMatch || customFieldsMatch;
        });
        console.log(`🔍 Search query "${query}" returned ${locations.length} results`);
      }
      
      console.log(`📤 Sending ${locations.length} locations to client`);
      res.json(locations);
    } catch (error) {
      console.error("Get locations error:", error);
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  // Get single location (public)
  app.get("/api/locations/:id", async (req: Request, res: Response) => {
    try {
      const location = await storage.getLocation(req.params.id);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      res.json(location);
    } catch (error) {
      console.error("Get location error:", error);
      res.status(500).json({ message: "Failed to fetch location" });
    }
  });

  // ============ Location Routes (Admin Only) ============
  
  // Create location
  app.post("/api/locations", requireAuth, async (req: Request, res: Response) => {
    try {
      const validatedData = insertLocationSchema.parse(req.body);

      // Validate required fields for geocoding
      const city = (validatedData.city || "").trim();
      const state = (validatedData.state || "").trim();
      
      if (!city) {
        return res.status(400).json({
          message: "City is required to create a location."
        });
      }
      
      if (!state) {
        return res.status(400).json({
          message: "State is required to create a location."
        });
      }

      // Check if coordinates are missing or invalid
      const hasValidCoords = validatedData.latitude !== undefined &&
                            validatedData.longitude !== undefined &&
                            validatedData.latitude !== 0 &&
                            validatedData.longitude !== 0 &&
                            isValidUSCoordinates(validatedData.latitude, validatedData.longitude);

      if (!hasValidCoords) {
        console.log(`➡️ LOG 1: Attempting to geocode: city="${city}" | state="${state}"`);
        const geocoded = await geocodeLocation(city, state);
        console.log(`➡️ LOG 2: Geocoding result:`, geocoded);
        
        if (geocoded && isValidUSCoordinates(geocoded.latitude, geocoded.longitude)) {
          validatedData.latitude = geocoded.latitude;
          validatedData.longitude = geocoded.longitude;
          console.log(`✅ Auto-geocoded location: ${validatedData.name} → (${geocoded.latitude}, ${geocoded.longitude})`);
        } else {
          return res.status(400).json({
            message: `Could not find valid coordinates for ${city}, ${state}. Please verify the city and state spelling and try again.`
          });
        }
      }

      const location = await storage.createLocation(validatedData);
      res.status(201).json(location);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Create location error:", error);
      res.status(500).json({ message: "Failed to create location" });
    }
  });

  // Toggle bookmark for location (must come before generic :id route)
  app.put("/api/locations/:id/bookmark", requireAuth, async (req: Request, res: Response) => {
    try {
      const location = await storage.toggleBookmark(req.params.id);
      
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      res.json(location);
    } catch (error) {
      console.error("Toggle bookmark error:", error);
      res.status(500).json({ message: "Failed to toggle bookmark" });
    }
  });

  // Update location
  app.put("/api/locations/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const updates = insertLocationSchema.partial().parse(req.body);

      // Re-geocode if city or state changed and coordinates are not manually set
      if ((updates.city || updates.state) &&
          (!updates.latitude || updates.latitude === 0) &&
          (!updates.longitude || updates.longitude === 0)) {
        const existingLocation = await storage.getLocation(req.params.id);
        if (existingLocation) {
          const city = (updates.city || existingLocation.city || "").trim();
          const state = (updates.state || existingLocation.state || "").trim();
          if (city && state) {
            const geocoded = await geocodeLocation(city, state);
            if (geocoded && isValidUSCoordinates(geocoded.latitude, geocoded.longitude)) {
              updates.latitude = geocoded.latitude;
              updates.longitude = geocoded.longitude;
              console.log(`✅ Re-geocoded updated location: ${updates.name || existingLocation.name} → (${geocoded.latitude}, ${geocoded.longitude})`);
            } else {
              return res.status(400).json({
                message: `Could not find valid coordinates for ${city}, ${state}. Please verify the city and state spelling and try again.`
              });
            }
          }
        }
      }

      const location = await storage.updateLocation(req.params.id, updates);

      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }

      res.json(location);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Update location error:", error);
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  // Delete location
  app.delete("/api/locations/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const success = await storage.deleteLocation(req.params.id);
      
      if (!success) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      res.json({ message: "Location deleted successfully" });
    } catch (error) {
      console.error("Delete location error:", error);
      res.status(500).json({ message: "Failed to delete location" });
    }
  });

  // Re-geocode locations with invalid coordinates
  app.post("/api/locations/regeocode-invalid", requireAuth, async (req: Request, res: Response) => {
    try {
      console.log("🔄 Re-geocoding invalid locations request from user:", req.session.userId);

      // Get all locations
      const locations = await storage.getAllLocations();
      const { isValidUSCoordinates, geocodeLocation, clearGeocodeCache } = await import("./geocoding");
      
      // Clear cache to ensure fresh geocoding
      clearGeocodeCache();

      const invalidLocations = locations.filter(loc =>
        !isValidUSCoordinates(loc.latitude || 0, loc.longitude || 0)
      );

      console.log(`📍 Found ${invalidLocations.length} locations with invalid coordinates`);

      if (invalidLocations.length === 0) {
        return res.json({
          message: "No locations with invalid coordinates found",
          processed: 0,
          updated: 0
        });
      }

      let updated = 0;
      const results = [];

      for (const location of invalidLocations) {
        try {
          console.log(`🔄 Re-geocoding: ${location.name} (${location.city}, ${location.state})`);

          const trimmedCity = (location.city || "").trim();
          const trimmedState = (location.state || "").trim();
          const geocoded = await geocodeLocation(trimmedCity, trimmedState);
          if (geocoded && isValidUSCoordinates(geocoded.latitude, geocoded.longitude)) {
            await storage.updateLocation(location.id, {
              latitude: geocoded.latitude,
              longitude: geocoded.longitude,
            });
            updated++;
            results.push({
              id: location.id,
              name: location.name,
              oldCoords: { lat: location.latitude, lng: location.longitude },
              newCoords: geocoded,
              status: "updated"
            });
            console.log(`✅ Updated ${location.name}: (${geocoded.latitude}, ${geocoded.longitude})`);
          } else {
            results.push({
              id: location.id,
              name: location.name,
              coords: { lat: location.latitude, lng: location.longitude },
              status: "failed_to_geocode"
            });
            console.warn(`⚠️ Failed to re-geocode ${location.name} - invalid coordinates or no results`);
          }
        } catch (error) {
          console.error(`❌ Error re-geocoding ${location.name}:`, error);
          results.push({
            id: location.id,
            name: location.name,
            coords: { lat: location.latitude, lng: location.longitude },
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }

      res.json({
        message: `Processed ${invalidLocations.length} locations, updated ${updated}`,
        processed: invalidLocations.length,
        updated,
        results
      });
    } catch (error) {
      console.error("Re-geocode locations error:", error);
      res.status(500).json({ message: "Failed to re-geocode locations" });
    }
  });

  // Bulk upload locations from text file
  app.post("/api/locations/bulk-upload", requireAuth, async (req: Request, res: Response) => {
    try {
      console.log("🔄 Bulk upload request received from user:", req.session.userId);
      const { content } = req.body;
      
      if (!content || typeof content !== 'string') {
        console.log("❌ Invalid content:", typeof content);
        return res.status(400).json({ message: "File content is required" });
      }
      
      const lines = content.split('\n').filter(line => line.trim());
      console.log(`📋 Processing ${lines.length} lines`);

      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      // Helper function to parse CSV line with quoted field support
      const parseCSVLine = (line: string): string[] => {
        const parts: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const nextChar = line[i + 1];

          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              // Escaped quote
              current += '"';
              i++;
            } else {
              // Toggle quote mode
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            // End of field
            parts.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        parts.push(current.trim());
        return parts;
      };

      // Helper function to validate coordinates
      const validateCoordinates = (lat: string | number, lon: string | number): boolean => {
        const latitude = parseFloat(String(lat));
        const longitude = parseFloat(String(lon));
        return !isNaN(latitude) && !isNaN(longitude) && 
               latitude >= -90 && latitude <= 90 && 
               longitude >= -180 && longitude <= 180;
      };

      for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum].trim();
        if (!line) continue;

        try {
          // Parse CSV line with quoted field support
          // Format: City, State, Category, Visit Date, Name, [Latitude, Longitude, Photo URL, Description]
          const parts = parseCSVLine(line);
          
          if (parts.length < 5) {
            results.failed++;
            results.errors.push(`Line ${lineNum + 1}: Invalid format - expected minimum 5 fields, got ${parts.length}`);
            continue;
          }

          const [city, state, categoryRaw, visitDate, name] = parts;
          const latitude = parts[5] ? parseFloat(parts[5]) : 0;
          const longitude = parts[6] ? parseFloat(parts[6]) : 0;
          const photoUrl = parts[7] || '';
          const description = parts[8] || '';

          // Validate required fields
          if (!city || !state || !categoryRaw || !visitDate || !name) {
            results.failed++;
            results.errors.push(`Line ${lineNum + 1}: Missing required fields (City, State, Category, Date, Name)`);
            continue;
          }

          // Normalize category: convert to lowercase and replace spaces with hyphens
          const category = categoryRaw
            .toLowerCase()
            .replace(/\s+/g, '-')
            .trim();

          // Validate category
          const validCategories = ['muffler-men', 'worlds-largest', 'unique-finds'];
          if (!validCategories.includes(category)) {
            results.failed++;
            results.errors.push(`Line ${lineNum + 1}: Invalid category "${categoryRaw}" - must be one of: Muffler Men, World's Largest, Unique Finds`);
            continue;
          }

          // Parse and validate date from MM/DD/YYYY format
          let taggedDate = '';
          try {
            const dateParts = visitDate.split('/');
            if (dateParts.length === 3) {
              const [month, day, year] = dateParts;
              const monthNum = parseInt(month);
              const dayNum = parseInt(day);
              const yearNum = parseInt(year);

              // Validate date values
              if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31 || yearNum < 1900 || yearNum > 2100) {
                throw new Error('Date values out of range');
              }

              // Convert to ISO format YYYY-MM-DD
              taggedDate = `${yearNum}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            } else {
              throw new Error('Unexpected format');
            }
          } catch (dateError) {
            results.failed++;
            results.errors.push(`Line ${lineNum + 1}: Invalid date format "${visitDate}" - expected MM/DD/YYYY`);
            continue;
          }

          // Prepare metadata for migration tracking
          const customFields = JSON.stringify({
            _migrated_at: new Date().toISOString(),
            _migrated_by: req.session.userId,
            _source: 'bulk_upload',
          });

          // Check if coordinates are missing or invalid
          const hasValidCoords = latitude !== undefined &&
                                longitude !== undefined &&
                                latitude !== 0 &&
                                longitude !== 0 &&
                                isValidUSCoordinates(latitude, longitude);

          let finalLatitude = latitude || 0;
          let finalLongitude = longitude || 0;

          if (!hasValidCoords) {
            // Try to geocode the location with trimmed city/state
            const trimmedCity = (city || "").trim();
            const trimmedState = (state || "").trim();
            const geocoded = await geocodeLocation(trimmedCity, trimmedState);
            if (geocoded && isValidUSCoordinates(geocoded.latitude, geocoded.longitude)) {
              finalLatitude = geocoded.latitude;
              finalLongitude = geocoded.longitude;
              console.log(`✅ Line ${lineNum + 1}: Auto-geocoded "${name}" → (${finalLatitude}, ${finalLongitude})`);
            } else {
              results.failed++;
              results.errors.push(`Line ${lineNum + 1}: Unable to geocode location "${name}". Please provide valid coordinates or check city/state spelling.`);
              continue;
            }
          }

          const locationData = {
            name: name.substring(0, 255), // Limit name length
            city: city.substring(0, 100),
            state: state.substring(0, 10),
            category,
            taggedDate,
            latitude: finalLatitude,
            longitude: finalLongitude,
            photoUrl: photoUrl.substring(0, 500), // Allow longer URLs
            photoId: '', // Will be set separately if needed
            zipCode: '',
            description: description.substring(0, 1000), // Limit description length
            customFields,
          };

          await storage.createLocation(locationData);
          results.success++;
          console.log(`✅ Line ${lineNum + 1}: Created location "${name}"`);
        } catch (error) {
          results.failed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push(`Line ${lineNum + 1}: ${errorMsg}`);
          console.warn(`⚠️ Line ${lineNum + 1} failed:`, errorMsg);
        }
      }

      console.log(`📊 Bulk upload complete: ${results.success} success, ${results.failed} failed`);
      res.json(results);
    } catch (error) {
      console.error("❌ Bulk upload error:", error);
      res.status(500).json({ message: "Failed to process bulk upload" });
    }
  });

  // Bulk export locations
  app.get("/api/locations/bulk-export", requireAuth, async (req: Request, res: Response) => {
    try {
      const locations = await storage.getAllLocations();
      
      if (locations.length === 0) {
        return res.json({ message: "No locations to export" });
      }

      // Format: City, State, Category, Visit Date (MM/DD/YYYY), Name, Latitude, Longitude, Photo URL, Description
      const lines: string[] = [];
      
      for (const loc of locations) {
        // Convert ISO date (YYYY-MM-DD) to MM/DD/YYYY format
        let visitDate = '';
        try {
          if (loc.taggedDate) {
            const [year, month, day] = loc.taggedDate.split('-');
            visitDate = `${month}/${day}/${year}`;
          }
        } catch (e) {
          visitDate = loc.taggedDate || '';
        }

        // Escape and quote fields that might contain commas
        const escapeField = (field: string | null | undefined) => {
          if (!field) return '""';
          const str = String(field);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };

        const line = [
          escapeField(loc.city),
          escapeField(loc.state),
          escapeField(loc.category),
          visitDate,
          escapeField(loc.name),
          loc.latitude || 0,
          loc.longitude || 0,
          escapeField(loc.photoUrl),
          escapeField(loc.description),
        ].join(', ');

        lines.push(line);
      }

      // Add header
      const header = 'City, State, Category, Visit Date (MM/DD/YYYY), Name, Latitude, Longitude, Photo URL, Description';
      const content = [header, ...lines].join('\n');

      // Send as file download
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="locations-export.txt"');
      res.send(content);
    } catch (error) {
      console.error("Bulk export error:", error);
      res.status(500).json({ message: "Failed to export locations" });
    }
  });

  // ============ Settings Routes (Admin Only) ============
  
  // Get all settings (public - for logo display)
  app.get("/api/settings", async (req: Request, res: Response) => {
    try {
      const allSettings = await storage.getAllSettings();
      // Convert to key-value object for easier access
      const settingsObj = allSettings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, string>);
      res.json(settingsObj);
    } catch (error) {
      console.error("Get settings error:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  // Get single setting (public)
  app.get("/api/settings/:key", async (req: Request, res: Response) => {
    try {
      const setting = await storage.getSetting(req.params.key);
      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      res.json({ key: setting.key, value: setting.value });
    } catch (error) {
      console.error("Get setting error:", error);
      res.status(500).json({ message: "Failed to fetch setting" });
    }
  });

  // Update setting (admin only)
  app.put("/api/settings/:key", requireAuth, async (req: Request, res: Response) => {
    try {
      const { value } = z.object({
        value: z.string().max(5000),
      }).parse(req.body);
      const booleanSettings = new Set([
        "defer_below_fold_scripts",
        "lazy_load_below_fold_images",
      ]);

      if (booleanSettings.has(req.params.key) && value !== "true" && value !== "false") {
        return res.status(400).json({ message: "This setting must be true or false" });
      }

      const urlSettings = new Set(["facebook_reviews_url", "favicon_url"]);
      if (urlSettings.has(req.params.key) && value.trim()) {
        try {
          const parsedUrl = new URL(value);
          if (!["http:", "https:"].includes(parsedUrl.protocol)) {
            return res.status(400).json({ message: "This setting must be a valid http or https URL" });
          }
        } catch {
          return res.status(400).json({ message: "This setting must be a valid URL" });
        }
      }

      const setting = await storage.setSetting({
        key: req.params.key,
        value,
        updatedBy: req.session.userId,
      });

      res.json(setting);
    } catch (error) {
      console.error("Update setting error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid setting value", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update setting" });
    }
  });

  // ============ Category Routes ============
  
  // Get all categories (public)
  app.get("/api/categories", async (req: Request, res: Response) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      console.error("Get categories error:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Get single category (public)
  app.get("/api/categories/:id", async (req: Request, res: Response) => {
    try {
      const category = await storage.getCategory(req.params.id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      console.error("Get category error:", error);
      res.status(500).json({ message: "Failed to fetch category" });
    }
  });

  // Create category (admin only)
  app.post("/api/categories", requireAuth, async (req: Request, res: Response) => {
    try {
      const { name, slug, description, icon, color, displayOrder } = req.body;

      if (!name || !slug) {
        return res.status(400).json({ message: "Name and slug are required" });
      }

      // Check if slug already exists
      const existingCategory = await storage.getCategoryBySlug(slug);
      if (existingCategory) {
        return res.status(400).json({ message: "Category with this slug already exists" });
      }

      const category = await storage.createCategory({
        name,
        slug,
        description: description || "",
        icon: icon || "📍",
        color: color || "#f97316",
        displayOrder: displayOrder || 0,
      });

      res.status(201).json(category);
    } catch (error) {
      console.error("Create category error:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  // Update category (admin only)
  app.put("/api/categories/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { name, slug, description, icon, color, displayOrder, backgroundImageUrl, overlayColor, overlayOpacity, textColor, customIconUrl } = req.body;
      const updates: Partial<any> = {};

      if (name !== undefined) updates.name = name;
      if (slug !== undefined) {
        // Check if slug is being changed and if new slug already exists
        const category = await storage.getCategory(req.params.id);
        if (category && category.slug !== slug) {
          const existingCategory = await storage.getCategoryBySlug(slug);
          if (existingCategory) {
            return res.status(400).json({ message: "Category with this slug already exists" });
          }
        }
        updates.slug = slug;
      }
      if (description !== undefined) updates.description = description;
      if (icon !== undefined) updates.icon = icon;
      if (color !== undefined) updates.color = color;
      if (displayOrder !== undefined) updates.displayOrder = displayOrder;
      if (backgroundImageUrl !== undefined) updates.backgroundImageUrl = backgroundImageUrl;
      if (overlayColor !== undefined) updates.overlayColor = overlayColor;
      if (overlayOpacity !== undefined) updates.overlayOpacity = overlayOpacity;
      if (textColor !== undefined) updates.textColor = textColor;
      if (customIconUrl !== undefined) updates.customIconUrl = customIconUrl;

      const category = await storage.updateCategory(req.params.id, updates);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      res.json(category);
    } catch (error) {
      console.error("Update category error:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  // Delete category (admin only)
  app.delete("/api/categories/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      // Check if any locations use this category
      const locations = await storage.getAllLocations();
      const category = await storage.getCategory(req.params.id);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      const locationsUsingCategory = locations.filter(loc => loc.category === category.slug);
      if (locationsUsingCategory.length > 0) {
        return res.status(400).json({ 
          message: `Cannot delete category. ${locationsUsingCategory.length} location(s) are using this category.` 
        });
      }

      const success = await storage.deleteCategory(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Category not found" });
      }

      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Delete category error:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
