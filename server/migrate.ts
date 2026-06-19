import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, "..", "migrations");

async function runMigrations() {
  let client: postgres.Sql | null = null;
  
  try {
    console.log("📋 Starting database migrations...");
    
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    
    // Create connection
    try {
      console.log("🔗 Creating database connection...");
      console.log("⚠️  For Render compatibility, ensure DATABASE_URL uses Supabase Supavisor (pooler.supabase.com)");
      client = postgres(databaseUrl, { 
        ssl: { rejectUnauthorized: false },
      });
      console.log("✅ Database connection created");
    } catch (connError) {
      console.error("❌ Failed to create database connection:", connError);
      throw connError;
    }
    
    const db = drizzle(client);
    
    try {
      console.log("📝 Running migrations...");
      await migrate(db, { migrationsFolder });
      console.log("✅ Migrations completed successfully");
    } catch (migrateError) {
      console.error("❌ Migration execution failed:", migrateError);
      throw migrateError;
    }
    
    try {
      console.log("🔌 Closing database connection...");
      await client.end();
      console.log("✅ Connection closed");
    } catch (closeError) {
      console.error("⚠️  Error closing connection:", closeError);
      // Don't throw, we already succeeded with migrations
    }
    
  } catch (error) {
    console.error("\n❌ MIGRATION FAILED ❌");
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    
    // Try to close connection if it exists
    if (client) {
      try {
        await client.end();
      } catch {
        // Ignore cleanup errors
      }
    }
    
    process.exit(1);
  }
}

// Run migrations with timeout protection
const migrationTimeout = setTimeout(() => {
  console.error("❌ Migration timeout - process exceeded 60 seconds");
  process.exit(1);
}, 60000); // 60 second timeout for entire migration process

runMigrations()
  .then(() => {
    clearTimeout(migrationTimeout);
    console.log("\n✅ All done!\n");
  })
  .catch((error) => {
    clearTimeout(migrationTimeout);
    console.error("Unhandled error:", error);
    process.exit(1);
  });