import { initializeDatabase } from "./server/db";
import { storage } from "./server/storage";
import { geocodeLocation, isValidUSCoordinates } from "./server/geocoding";

async function fixInvalidLocations() {
  try {
    console.log("🔌 Initializing database...");
    await initializeDatabase();
    console.log("✅ Database initialized\n");

    console.log("🔄 Starting to fix invalid location coordinates...\n");

    try {
    // Get all locations
    const locations = await storage.getAllLocations();
    console.log(`📍 Found ${locations.length} total locations`);

    // Find invalid locations
    const invalidLocations = locations.filter(loc =>
      !isValidUSCoordinates(loc.latitude || 0, loc.longitude || 0)
    );

    console.log(`📍 Found ${invalidLocations.length} locations with invalid coordinates`);

    if (invalidLocations.length === 0) {
      console.log("✅ No locations with invalid coordinates found");
      return;
    }

    let updated = 0;

    for (const location of invalidLocations) {
      try {
        console.log(`🔄 Re-geocoding: ${location.name} (${location.city}, ${location.state})`);

        const geocoded = await geocodeLocation(location.city || "", location.state);
        if (geocoded) {
          await storage.updateLocation(location.id, {
            latitude: geocoded.latitude,
            longitude: geocoded.longitude,
          });
          updated++;
          console.log(`✅ Updated ${location.name}: (${geocoded.latitude}, ${geocoded.longitude})`);
        } else {
          console.warn(`⚠️ Failed to re-geocode ${location.name}`);
        }
      } catch (error) {
        console.error(`❌ Error re-geocoding ${location.name}:`, error);
      }
    }

      console.log(`\n✅ Fixed ${updated} locations with invalid coordinates`);
    } catch (error) {
      console.error("❌ Error fixing locations:", error);
    }
  } catch (error) {
    console.error("❌ Fatal error:", error);
  }
}

fixInvalidLocations().catch(console.error);