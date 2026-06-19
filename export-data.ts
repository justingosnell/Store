import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@shared/schema";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "data.db");

async function exportData() {
  try {
    const sqlite = new Database(dbPath);
    const db = drizzle(sqlite, { schema });

    const data = {
      users: await db.select().from(schema.users),
      locations: await db.select().from(schema.locations),
      media: await db.select().from(schema.media),
      categories: await db.select().from(schema.categories),
      settings: await db.select().from(schema.settings),
    };

    const exportPath = path.resolve(__dirname, "data-export.json");
    fs.writeFileSync(exportPath, JSON.stringify(data, null, 2));

    console.log(`✅ Data exported to ${exportPath}`);
    console.log(`   Users: ${data.users.length}`);
    console.log(`   Locations: ${data.locations.length}`);
    console.log(`   Media: ${data.media.length}`);
    console.log(`   Categories: ${data.categories.length}`);
    console.log(`   Settings: ${data.settings.length}`);

    sqlite.close();
  } catch (error) {
    console.error("❌ Export failed:", error);
    process.exit(1);
  }
}

exportData();