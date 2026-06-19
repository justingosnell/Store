import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL || "postgresql://localhost/joe";
const isRemoteDb = databaseUrl.includes("render.com") || databaseUrl.includes("neon.tech") || databaseUrl.includes("supabase.co");

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: isRemoteDb
    ? {
        url: databaseUrl,
        ssl: "require",
      }
    : {
        url: databaseUrl,
      },
});
