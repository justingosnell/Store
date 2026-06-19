import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./shared/schema";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

async function verify() {
  const result = await db.query.locations.findMany();
  console.log("Total locations in database:", result.length);

  const byDate = new Map<string, number>();
  result.forEach((l) => {
    const month = l.taggedDate?.substring(0, 7) || "unknown";
    byDate.set(month, (byDate.get(month) || 0) + 1);
  });

  console.log("Locations by date (last 12 months):");
  Array.from(byDate)
    .sort()
    .slice(-12)
    .forEach(([date, count]) => {
      console.log("  " + date + ": " + count);
    });

  // Show count of specific new attractions
  const attractions = ["Pioneer Man", "Carpeteria Genie", "Marathon Man", "Surfer Dude", "Uncle Sam"];
  console.log("\nNew attraction types imported:");
  attractions.forEach((attr) => {
    const count = result.filter((l) => l.name === attr).length;
    if (count > 0) {
      console.log("  " + attr + ": " + count);
    }
  });

  await client.end();
}

verify();
