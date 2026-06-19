import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./shared/schema";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

try {
  const result = await db.query.locations.findMany();
  const existing = result.map((l) => ({
    name: l.name,
    city: l.city,
    state: l.state,
    category: l.category,
    date: l.taggedDate,
  }));

  console.log(JSON.stringify(existing, null, 2));
} catch (error) {
  console.error("Error:", (error as Error).message);
} finally {
  await client.end();
}
