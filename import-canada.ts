import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./shared/schema";
import { geocodeLocation, isValidUSCoordinates } from "./server/geocoding";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

async function importCanada() {
  try {
    const location = {
      city: "Fonthill",
      state: "Ontario",
      name: "Canadian MM Head",
      country: "Canada",
      date: "2025-08-31",
    };

    console.log(`🌐 Geocoding: ${location.city}, ${location.state}, ${location.country}`);
    const coords = await geocodeLocation(location.city, location.state, location.country);

    if (!coords || !isValidUSCoordinates(coords.latitude, coords.longitude)) {
      console.log(`❌ Invalid coordinates or not in valid bounds`);
      await client.end();
      return;
    }

    const newLocation = {
      name: location.name,
      city: location.city,
      state: location.state,
      category: "muffler-men",
      latitude: coords.latitude,
      longitude: coords.longitude,
      taggedDate: location.date,
      photoUrl: "",
      photoId: "",
    };

    await db.insert(schema.locations).values(newLocation);
    console.log(`✅ Imported: ${location.city}, ${location.state} - ${location.name}`);
  } catch (error) {
    console.error("Error:", (error as Error).message);
  } finally {
    await client.end();
  }
}

importCanada();
