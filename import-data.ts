import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { resolveDatabase } from "./server/ipv4-resolver";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function importData() {
  try {
    // Resolve DATABASE_URL hostname to IPv4
    const resolvedUrl = await resolveDatabase();

    // Read the export file
    const exportPath = path.resolve(__dirname, "data-export.json");
    if (!fs.existsSync(exportPath)) {
      throw new Error(`Export file not found at ${exportPath}`);
    }

    const data = JSON.parse(fs.readFileSync(exportPath, "utf-8"));
    console.log("📖 Read export file");

    // Connect to PostgreSQL with resolved IPv4 address
    const client = postgres(resolvedUrl, {
      ssl: { rejectUnauthorized: false },
    });
    const db = drizzle(client, { schema });

    console.log("🔗 Connected to PostgreSQL");

    // Clear existing data (delete in reverse order of dependencies)
    console.log("🗑️  Clearing existing data...");
    await db.delete(schema.media);
    await db.delete(schema.locations);
    await db.delete(schema.categories);
    await db.delete(schema.settings);
    await db.delete(schema.users);
    console.log("✅ Cleared existing data");

    // Import categories first (no dependencies)
    if (data.categories?.length > 0) {
      await db.insert(schema.categories).values(data.categories);
      console.log(`✅ Imported ${data.categories.length} categories`);
    }

    // Import users (referenced by other tables)
    if (data.users?.length > 0) {
      await db.insert(schema.users).values(data.users);
      console.log(`✅ Imported ${data.users.length} users`);
    }

    // Import locations
    if (data.locations?.length > 0) {
      await db.insert(schema.locations).values(data.locations);
      console.log(`✅ Imported ${data.locations.length} locations`);
    }

    // Import media
    if (data.media?.length > 0) {
      await db.insert(schema.media).values(data.media);
      console.log(`✅ Imported ${data.media.length} media files`);
    }

    // Import settings
    if (data.settings?.length > 0) {
      await db.insert(schema.settings).values(data.settings);
      console.log(`✅ Imported ${data.settings.length} settings`);
    }

    console.log("\n✅ Data import completed successfully!");

    await client.end();
  } catch (error) {
    console.error("❌ Import failed:", error);
    process.exit(1);
  }
}

importData();