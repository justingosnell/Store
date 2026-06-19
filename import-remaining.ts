import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./shared/schema";
import { geocodeLocation, isValidUSCoordinates } from "./server/geocoding";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

async function importRemaining() {
  try {
    const locations = [
      { city: "Virginia", state: "Minnesota", name: "Uncle Sam" },
      { city: "Rainesville", state: "Alabama", name: "Wagon Ho" },
      { city: "Hayward", state: "California", name: "Wagon Ho" },
      { city: "Gravois Mills", state: "Missouri", name: "Wagon Ho" },
      { city: "Zephyrhills", state: "Florida", name: "Wagon Ho" },
    ];

    let imported = 0;
    for (const location of locations) {
      try {
        const coords = await geocodeLocation(location.city, location.state);

        if (!coords || !isValidUSCoordinates(coords.latitude, coords.longitude)) {
          console.log(`⚠️  Skipped: ${location.city}, ${location.state}`);
          continue;
        }

        const newLocation = {
          name: location.name,
          city: location.city,
          state: location.state,
          category: "muffler-men",
          latitude: coords.latitude,
          longitude: coords.longitude,
          taggedDate: new Date().toISOString().split("T")[0],
          photoUrl: "",
          photoId: "",
        };

        await db.insert(schema.locations).values(newLocation);
        imported++;
        console.log(`✓ ${location.city}, ${location.state} - ${location.name}`);
      } catch (error) {
        console.log(`✗ ${location.city}, ${location.state} - ${(error as Error).message}`);
      }
    }

    console.log(`\n✅ Imported: ${imported} locations`);
  } finally {
    await client.end();
  }
}

importRemaining();
