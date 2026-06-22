import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";

// Initialize database connection
let client: postgres.Sql | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

export async function initializeDatabase() {
  if (_db) return _db;
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  
  try {
    console.log("🔌 Initializing database connection...");
    
    // IMPORTANT: For Render (IPv4-only), use Supabase Supavisor:
    // CONNECTION STRING FORMAT:
    // postgresql://postgres:PASSWORD@pooler.supabase.com:6543/postgres?sslmode=require
    // 
    // Get this from Supabase Dashboard:
    // 1. Go to your project settings
    // 2. Click "Database" → "Connection Info"
    // 3. Select "Connection pooler" (NOT "Session pooler")
    // 4. Copy the connection string
    // 5. Add ?sslmode=require at the end
    
    // Remove ?sslmode=require from URL if present, as we handle SSL via options
    const cleanUrl = databaseUrl.replace('?sslmode=require', '');
    
    const options: any = {
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false,
      } : false,
      // Timeout settings for better reliability
      idle_timeout: 20,
      max_lifetime: 60 * 15,
    };
    
    client = postgres(cleanUrl, options);
    
    _db = drizzle(client, { schema });
    console.log("✅ Database initialized");
    return _db;
  } catch (error) {
    console.error("❌ Failed to initialize database:", error);
    throw error;
  }
}

// Export getter that initializes on first access (for backward compatibility)
export function getDb(): ReturnType<typeof drizzle> {
  if (!_db) {
    throw new Error("Database not initialized. Call initializeDatabase() first.");
  }
  return _db;
}

// Create a lazy proxy for the db export
export const db = new Proxy({} as any, {
  get(target, prop) {
    if (!_db) {
      throw new Error("Database not initialized. Call initializeDatabase() first.");
    }
    return (_db as any)[prop];
  }
});

// Run migrations if needed
export async function runMigrations() {
  try {
    if (!_db || !client) {
      throw new Error("Database not initialized");
    }
    console.log("🔄 Ensuring database schema...");

    await client`
      CREATE TABLE IF NOT EXISTS users (
        id text PRIMARY KEY,
        username text NOT NULL UNIQUE,
        password text NOT NULL,
        role text NOT NULL DEFAULT 'manager',
        is_locked text NOT NULL DEFAULT 'false',
        failed_login_attempts text NOT NULL DEFAULT '0',
        last_failed_login text,
        last_password_change text NOT NULL DEFAULT (CURRENT_TIMESTAMP)::text,
        must_change_password text NOT NULL DEFAULT 'false',
        created_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP)::text
      )
    `;

    await client`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id text PRIMARY KEY,
        actor_user_id text,
        actor_username text DEFAULT '',
        action text NOT NULL,
        resource_type text NOT NULL,
        resource_id text NOT NULL,
        summary text NOT NULL,
        metadata text DEFAULT '{}',
        created_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP)::text
      )
    `;

    await client`
      CREATE TABLE IF NOT EXISTS categories (
        id text PRIMARY KEY,
        name text NOT NULL,
        slug text NOT NULL UNIQUE,
        description text DEFAULT '',
        icon text DEFAULT '',
        color text DEFAULT '#f97316',
        display_order double precision DEFAULT 0,
        background_image_url text,
        overlay_color text DEFAULT '#000000',
        overlay_opacity text DEFAULT '0.5',
        text_color text DEFAULT '#ffffff',
        custom_icon_url text,
        created_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP)::text,
        updated_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP)::text
      )
    `;

    await client`
      CREATE TABLE IF NOT EXISTS locations (
        id text PRIMARY KEY,
        name text NOT NULL,
        latitude double precision DEFAULT 0,
        longitude double precision DEFAULT 0,
        category text NOT NULL,
        state text NOT NULL,
        city text DEFAULT '',
        zip_code text DEFAULT '',
        photo_url text NOT NULL,
        photo_id text NOT NULL,
        tagged_date text NOT NULL,
        description text DEFAULT '',
        custom_fields text DEFAULT '{}',
        is_bookmarked text NOT NULL DEFAULT 'false'
      )
    `;

    await client`
      CREATE TABLE IF NOT EXISTS media (
        id text PRIMARY KEY,
        filename text NOT NULL,
        original_name text NOT NULL,
        url text NOT NULL,
        mime_type text NOT NULL,
        size text NOT NULL,
        width text,
        height text,
        alt text DEFAULT '',
        caption text DEFAULT '',
        data text,
        storage_path text,
        uploaded_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP)::text,
        uploaded_by text
      )
    `;

    await client`
      CREATE TABLE IF NOT EXISTS settings (
        key text PRIMARY KEY,
        value text NOT NULL,
        updated_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP)::text,
        updated_by text
      )
    `;

    await client`
      CREATE TABLE IF NOT EXISTS products (
        id text PRIMARY KEY,
        title text NOT NULL,
        handle text NOT NULL UNIQUE,
        category text NOT NULL,
        description text NOT NULL DEFAULT '',
        price text NOT NULL,
        compare_at_price text DEFAULT '',
        inventory double precision DEFAULT 0,
        status text NOT NULL DEFAULT 'active',
        image_url text DEFAULT '',
        age_range text DEFAULT '',
        material text DEFAULT '',
        tags text DEFAULT '',
        sku text DEFAULT '',
        featured text NOT NULL DEFAULT 'false',
        seo_title text DEFAULT '',
        seo_description text DEFAULT '',
        focus_keyword text DEFAULT '',
        created_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP)::text,
        updated_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP)::text
      )
    `;

    const columnsByTable: Record<string, string[]> = {
      users: [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'manager'",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_locked text NOT NULL DEFAULT 'false'",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts text NOT NULL DEFAULT '0'",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_failed_login text",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_password_change text NOT NULL DEFAULT (CURRENT_TIMESTAMP)::text",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password text NOT NULL DEFAULT 'false'",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP)::text",
      ],
      audit_logs: [
        "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_user_id text",
        "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_username text DEFAULT ''",
        "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS action text NOT NULL DEFAULT 'unknown'",
        "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_type text NOT NULL DEFAULT 'unknown'",
        "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_id text NOT NULL DEFAULT 'unknown'",
        "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS summary text NOT NULL DEFAULT ''",
        "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata text DEFAULT '{}'",
        "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS created_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP)::text",
      ],
      locations: [
        "ALTER TABLE locations ADD COLUMN IF NOT EXISTS latitude double precision DEFAULT 0",
        "ALTER TABLE locations ADD COLUMN IF NOT EXISTS longitude double precision DEFAULT 0",
        "ALTER TABLE locations ADD COLUMN IF NOT EXISTS city text DEFAULT ''",
        "ALTER TABLE locations ADD COLUMN IF NOT EXISTS zip_code text DEFAULT ''",
        "ALTER TABLE locations ADD COLUMN IF NOT EXISTS description text DEFAULT ''",
        "ALTER TABLE locations ADD COLUMN IF NOT EXISTS custom_fields text DEFAULT '{}'",
        "ALTER TABLE locations ADD COLUMN IF NOT EXISTS is_bookmarked text NOT NULL DEFAULT 'false'",
      ],
      media: [
        "ALTER TABLE media ADD COLUMN IF NOT EXISTS width text",
        "ALTER TABLE media ADD COLUMN IF NOT EXISTS height text",
        "ALTER TABLE media ADD COLUMN IF NOT EXISTS alt text DEFAULT ''",
        "ALTER TABLE media ADD COLUMN IF NOT EXISTS caption text DEFAULT ''",
        "ALTER TABLE media ADD COLUMN IF NOT EXISTS data text",
        "ALTER TABLE media ADD COLUMN IF NOT EXISTS storage_path text",
        "ALTER TABLE media ADD COLUMN IF NOT EXISTS uploaded_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP)::text",
        "ALTER TABLE media ADD COLUMN IF NOT EXISTS uploaded_by text",
      ],
      settings: [
        "ALTER TABLE settings ADD COLUMN IF NOT EXISTS updated_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP)::text",
        "ALTER TABLE settings ADD COLUMN IF NOT EXISTS updated_by text",
      ],
      categories: [
        "ALTER TABLE categories ADD COLUMN IF NOT EXISTS description text DEFAULT ''",
        "ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon text DEFAULT ''",
        "ALTER TABLE categories ADD COLUMN IF NOT EXISTS color text DEFAULT '#f97316'",
        "ALTER TABLE categories ADD COLUMN IF NOT EXISTS display_order double precision DEFAULT 0",
        "ALTER TABLE categories ADD COLUMN IF NOT EXISTS background_image_url text",
        "ALTER TABLE categories ADD COLUMN IF NOT EXISTS overlay_color text DEFAULT '#000000'",
        "ALTER TABLE categories ADD COLUMN IF NOT EXISTS overlay_opacity text DEFAULT '0.5'",
        "ALTER TABLE categories ADD COLUMN IF NOT EXISTS text_color text DEFAULT '#ffffff'",
        "ALTER TABLE categories ADD COLUMN IF NOT EXISTS custom_icon_url text",
        "ALTER TABLE categories ADD COLUMN IF NOT EXISTS created_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP)::text",
        "ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP)::text",
      ],
      products: [
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_at_price text DEFAULT ''",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS inventory double precision DEFAULT 0",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url text DEFAULT ''",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS age_range text DEFAULT ''",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS material text DEFAULT ''",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS tags text DEFAULT ''",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS sku text DEFAULT ''",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS featured text NOT NULL DEFAULT 'false'",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_title text DEFAULT ''",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_description text DEFAULT ''",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS focus_keyword text DEFAULT ''",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP)::text",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at text NOT NULL DEFAULT (CURRENT_TIMESTAMP)::text",
      ],
    };

    for (const statements of Object.values(columnsByTable)) {
      for (const statement of statements) {
        await client.unsafe(statement);
      }
    }

    console.log("✅ Database schema ready");
  } catch (error) {
    console.error("❌ Schema setup failed:", error);
    throw error;
  }
}
