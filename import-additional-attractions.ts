import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./shared/schema";
import { geocodeLocation, isValidUSCoordinates } from "./server/geocoding";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

interface LocationData {
  city: string;
  state: string;
  name: string;
}

function normalizeStateName(stateCode: string): string {
  const stateMap: Record<string, string> = {
    AL: "Alabama",
    AK: "Alaska",
    AZ: "Arizona",
    AR: "Arkansas",
    CA: "California",
    CO: "Colorado",
    CT: "Connecticut",
    DE: "Delaware",
    FL: "Florida",
    GA: "Georgia",
    HI: "Hawaii",
    ID: "Idaho",
    IL: "Illinois",
    IN: "Indiana",
    IA: "Iowa",
    KS: "Kansas",
    KY: "Kentucky",
    LA: "Louisiana",
    ME: "Maine",
    MD: "Maryland",
    MA: "Massachusetts",
    MI: "Michigan",
    MN: "Minnesota",
    MS: "Mississippi",
    MO: "Missouri",
    MT: "Montana",
    NE: "Nebraska",
    NV: "Nevada",
    NH: "New Hampshire",
    NJ: "New Jersey",
    NM: "New Mexico",
    NY: "New York",
    NC: "North Carolina",
    ND: "North Dakota",
    OH: "Ohio",
    OK: "Oklahoma",
    OR: "Oregon",
    PA: "Pennsylvania",
    RI: "Rhode Island",
    SC: "South Carolina",
    SD: "South Dakota",
    TN: "Tennessee",
    TX: "Texas",
    UT: "Utah",
    VT: "Vermont",
    VA: "Virginia",
    WA: "Washington",
    WV: "West Virginia",
    WI: "Wisconsin",
    WY: "Wyoming",
  };

  if (Object.values(stateMap).includes(stateCode)) {
    return stateCode;
  }

  return stateMap[stateCode.toUpperCase()] || stateCode;
}

function parseLocationLine(line: string): LocationData | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Pattern: City, ST Name
  const parts = trimmed.split(",");
  if (parts.length < 2) return null;

  const city = parts[0].trim().replace(/\.$/, "").trim();
  const restParts = parts[1].trim().split(/\s+/);
  if (restParts.length < 2) return null;

  const state = restParts[0].trim();
  const name = restParts
    .slice(1)
    .join(" ")
    .replace(/\s*\(odd\)$/, "")
    .trim();

  if (!name) return null;

  return {
    city,
    state: normalizeStateName(state),
    name,
  };
}

async function isLocationExists(location: LocationData, existing: any[]): Promise<boolean> {
  return existing.some(
    (l) =>
      l.name.toLowerCase() === location.name.toLowerCase() &&
      l.city.toLowerCase().trim() === location.city.toLowerCase().trim() &&
      l.state === location.state
  );
}

async function importLocations() {
  try {
    console.log("📥 Reading existing locations...");
    const existing = await db.query.locations.findMany();

    const lines = [
      "Cincinnati, OH Carpeteria Genie",
      "North Hollywood, CA Carpeteria Genie",
      "North Las Vegas, NV Carpeteria Genie",
      "New Castle, IN Marathon Man",
      "Montpolier, IN Marathon Man",
      "Linwood, NC Pioneer Man",
      "Hendersonville, NC Pioneer Man",
      "Hillsborough, NC Pioneer Man",
      "Kill Devil Hill, NC Pioneer Man",
      "Myrtle Beach, SC Pioneer Man",
      "Wytheville, VA Pioneer Man",
      "Unger, WV Surfer Dude",
      "Vincennes, IN Uncle Sam",
      "Hatch, NM Uncle Sam",
      "Convoy, OH Uncle Sam",
      "Ottawa Lake, MI Uncle Sam",
      "Virginia, MN Uncle Sam",
      "Fort Erie, Ontario, Canada Uncle Sam",
      "Rainesville, AL Wagon Ho",
      "Hayward, CA Wagon Ho",
      "Gravois Mills, MO Wagon Ho",
      "Zephyrhills, FL Wagon Ho",
    ];

    const toImport: LocationData[] = [];
    const skipped: string[] = [];
    const invalid: string[] = [];

    console.log("🔍 Parsing locations...");
    for (const line of lines) {
      // Skip Canada location
      if (line.toLowerCase().includes("canada")) {
        console.log(`⏭️  Skipping Canada location: ${line}`);
        continue;
      }

      const parsed = parseLocationLine(line);
      if (!parsed) {
        if (line.trim()) invalid.push(line);
        continue;
      }

      const exists = await isLocationExists(parsed, existing);
      if (exists) {
        skipped.push(`${parsed.city}, ${parsed.state} - ${parsed.name}`);
        continue;
      }

      toImport.push(parsed);
    }

    console.log(`\n✅ Valid locations to import: ${toImport.length}`);
    console.log(`⏭️  Already exist: ${skipped.length}`);
    if (invalid.length > 0) {
      console.log(`❌ Invalid/unparseable: ${invalid.length}`);
      invalid.forEach((l) => console.log(`   - ${l}`));
    }

    if (toImport.length === 0) {
      console.log("ℹ️  No new locations to import");
      await client.end();
      return;
    }

    console.log("\n🌐 Geocoding and importing locations...");
    let imported = 0;
    let geocodeFailed = 0;
    const failedLocations: { location: LocationData; reason: string }[] = [];

    for (const location of toImport) {
      try {
        const coords = await geocodeLocation(location.city, location.state);

        if (!coords || !isValidUSCoordinates(coords.latitude, coords.longitude)) {
          geocodeFailed++;
          failedLocations.push({
            location,
            reason: "Invalid coordinates",
          });
          console.log(
            `⚠️  Skipped: ${location.city}, ${location.state} (geocoding returned non-US coordinates)`
          );
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
        console.log(`✓ Imported: ${location.city}, ${location.state} - ${location.name}`);
      } catch (error) {
        geocodeFailed++;
        failedLocations.push({
          location,
          reason: (error as Error).message,
        });
        console.log(`✗ Failed: ${location.city}, ${location.state} - ${(error as Error).message}`);
      }
    }

    console.log(`\n📊 Import Summary:`);
    console.log(`✅ Successfully imported: ${imported}`);
    console.log(`⏭️  Already existed: ${skipped.length}`);
    console.log(`❌ Failed: ${geocodeFailed}`);
    if (failedLocations.length > 0) {
      console.log("\nFailed locations:");
      failedLocations.forEach(({ location, reason }) => {
        console.log(`  - ${location.city}, ${location.state} (${reason})`);
      });
    }
  } catch (error) {
    console.error("Error:", (error as Error).message);
  } finally {
    await client.end();
  }
}

importLocations();
