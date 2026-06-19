/**
 * Script to auto-geocode existing locations that have missing coordinates (0,0)
 * Run with: tsx geocode-existing-locations.ts
 */

import { initializeDatabase } from "./server/db";
import { storage } from "./server/storage";
import { geocodeLocation } from "./server/geocoding";

async function main() {
  try {
    console.log("🔌 Initializing database...");
    await initializeDatabase();
    console.log("✅ Database initialized\n");

    console.log("📍 Fetching locations with missing coordinates...");
    const allLocations = await storage.getAllLocations();
    
    const missingCoords = allLocations.filter(
      (loc) => (loc.latitude === 0 || loc.latitude === null) && 
               (loc.longitude === 0 || loc.longitude === null)
    );

    console.log(`Found ${missingCoords.length} locations with missing coordinates\n`);

    if (missingCoords.length === 0) {
      console.log("✅ All locations have coordinates!");
      process.exit(0);
    }

    let geocodedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < missingCoords.length; i++) {
      const location = missingCoords[i];
      
      try {
        console.log(
          `[${i + 1}/${missingCoords.length}] Geocoding: ${location.name} (${location.city}, ${location.state})`
        );

        const geocoded = await geocodeLocation(location.city, location.state);

        if (geocoded) {
          await storage.updateLocation(location.id, {
            latitude: geocoded.latitude,
            longitude: geocoded.longitude,
          });
          geocodedCount++;
          console.log(
            `  ✅ Updated → (${geocoded.latitude.toFixed(4)}, ${geocoded.longitude.toFixed(4)})\n`
          );
        } else {
          failedCount++;
          console.log(`  ⚠️ Could not geocode\n`);
        }
      } catch (error) {
        failedCount++;
        console.error(`  ❌ Error:`, error instanceof Error ? error.message : error);
      }
    }

    console.log("\n📊 Geocoding Summary:");
    console.log(`  ✅ Successfully geocoded: ${geocodedCount}`);
    console.log(`  ❌ Failed to geocode: ${failedCount}`);
    console.log(`  📍 Total processed: ${geocodedCount + failedCount}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

main();