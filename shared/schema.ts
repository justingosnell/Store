import { sql } from "drizzle-orm";
import { pgTable, text, doublePrecision } from "drizzle-orm/pg-core";
import { z } from "zod";

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("manager"), // "admin" or "manager"
  isLocked: text("is_locked").notNull().default("false"), // "true" or "false"
  failedLoginAttempts: text("failed_login_attempts").notNull().default("0"),
  lastFailedLogin: text("last_failed_login"),
  lastPasswordChange: text("last_password_change").notNull().default(sql`CURRENT_TIMESTAMP`),
  mustChangePassword: text("must_change_password").notNull().default("false"), // "true" or "false"
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  role: z.enum(["admin", "manager"]).optional().default("manager"),
});

export type InsertUser = {
  username: string;
  password: string;
  role?: "admin" | "manager";
};
export type User = typeof users.$inferSelect;

export const locations = pgTable("locations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  latitude: doublePrecision("latitude").default(0),
  longitude: doublePrecision("longitude").default(0),
  category: text("category").notNull(),
  state: text("state").notNull(),
  city: text("city").default(""),
  zipCode: text("zip_code").default(""),
  photoUrl: text("photo_url").notNull(),
  photoId: text("photo_id").notNull(),
  taggedDate: text("tagged_date").notNull(),
  description: text("description").default(""),
  customFields: text("custom_fields").default("{}"),
  isBookmarked: text("is_bookmarked").notNull().default("false"),
});

export const insertLocationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  latitude: z.number().default(0),
  longitude: z.number().default(0),
  zipCode: z.string().default(""),
  description: z.string().default(""),
  customFields: z.string().default("{}"),
  photoUrl: z.string().default(""),
  photoId: z.string().default(""),
  taggedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  isBookmarked: z.string().default("false"),
});

export type InsertLocation = {
  name?: string;
  category?: string;
  state?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  zipCode?: string;
  photoUrl?: string;
  photoId?: string;
  taggedDate?: string;
  description?: string;
  customFields?: string;
  isBookmarked?: string;
};
export type Location = typeof locations.$inferSelect;

// Media Library Schema
export const media = pgTable("media", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  url: text("url").notNull(),
  mimeType: text("mime_type").notNull(),
  size: text("size").notNull(), // Store as string to avoid integer overflow
  width: text("width"),
  height: text("height"),
  alt: text("alt").default(""),
  caption: text("caption").default(""),
  data: text("data"), // Legacy base64 data, to be phased out
  storagePath: text("storage_path"),
  uploadedAt: text("uploaded_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  uploadedBy: text("uploaded_by").references(() => users.id),
});

export const insertMediaSchema = z.object({
  filename: z.string().min(1),
  originalName: z.string().min(1),
  url: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.string().min(1),
  width: z.string().default(""),
  height: z.string().default(""),
  alt: z.string().default(""),
  caption: z.string().default(""),
  data: z.string().default(""),
  storagePath: z.string().default(""),
  uploadedBy: z.string().default(""),
});

export type InsertMedia = {
  filename: string;
  originalName: string;
  url: string;
  mimeType: string;
  size: string;
  width?: string;
  height?: string;
  alt?: string;
  caption?: string;
  data?: string;
  storagePath?: string;
  uploadedBy?: string;
};
export type Media = typeof media.$inferSelect;

// Settings Schema
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedBy: text("updated_by").references(() => users.id),
});

export const insertSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  updatedBy: z.string().default(""),
});

export type InsertSetting = {
  key: string;
  value: string;
  updatedBy?: string;
};
export type Setting = typeof settings.$inferSelect;

// Categories Schema
export const categories = pgTable("categories", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").default(""),
  icon: text("icon").default("📍"),
  color: text("color").default("#f97316"), // Default orange color
  displayOrder: doublePrecision("display_order").default(0),
  backgroundImageUrl: text("background_image_url"),
  overlayColor: text("overlay_color").default("#000000"),
  overlayOpacity: text("overlay_opacity").default("0.5"),
  textColor: text("text_color").default("#ffffff"),
  customIconUrl: text("custom_icon_url"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().default(""),
  icon: z.string().default("📍"),
  color: z.string().default("#f97316"),
  displayOrder: z.number().default(0),
  backgroundImageUrl: z.string().default(""),
  overlayColor: z.string().default("#000000"),
  overlayOpacity: z.string().default("0.5"),
  textColor: z.string().default("#ffffff"),
  customIconUrl: z.string().default(""),
});

export type InsertCategory = {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  displayOrder?: number;
  backgroundImageUrl?: string;
  overlayColor?: string;
  overlayOpacity?: string;
  textColor?: string;
  customIconUrl?: string;
};
export type Category = typeof categories.$inferSelect;

// Store Products Schema
export const products = pgTable("products", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  handle: text("handle").notNull().unique(),
  category: text("category").notNull(),
  description: text("description").notNull().default(""),
  price: text("price").notNull(),
  compareAtPrice: text("compare_at_price").default(""),
  inventory: doublePrecision("inventory").default(0),
  status: text("status").notNull().default("active"),
  imageUrl: text("image_url").default(""),
  ageRange: text("age_range").default(""),
  material: text("material").default(""),
  tags: text("tags").default(""),
  sku: text("sku").default(""),
  featured: text("featured").notNull().default("false"),
  seoTitle: text("seo_title").default(""),
  seoDescription: text("seo_description").default(""),
  focusKeyword: text("focus_keyword").default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertProductSchema = z.object({
  title: z.string().min(1, "Product title is required"),
  handle: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  description: z.string().default(""),
  price: z.string().min(1, "Price is required"),
  compareAtPrice: z.string().default(""),
  inventory: z.number().default(0),
  status: z.enum(["active", "draft", "archived"]).default("active"),
  imageUrl: z.string().default(""),
  ageRange: z.string().default(""),
  material: z.string().default(""),
  tags: z.string().default(""),
  sku: z.string().default(""),
  featured: z.string().default("false"),
  seoTitle: z.string().default(""),
  seoDescription: z.string().default(""),
  focusKeyword: z.string().default(""),
});

export type InsertProduct = {
  title: string;
  handle?: string;
  category: string;
  description?: string;
  price: string;
  compareAtPrice?: string;
  inventory?: number;
  status?: "active" | "draft" | "archived";
  imageUrl?: string;
  ageRange?: string;
  material?: string;
  tags?: string;
  sku?: string;
  featured?: string;
  seoTitle?: string;
  seoDescription?: string;
  focusKeyword?: string;
};
export type Product = typeof products.$inferSelect;
