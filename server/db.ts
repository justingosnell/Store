import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, "..", "migrations");

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
    if (!_db) {
      throw new Error("Database not initialized");
    }
    console.log("🔄 Running database migrations...");
    await migrate(_db, { migrationsFolder });
    console.log("✅ Migrations completed successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}