import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./shared/schema";
import * as fs from "fs";
import * as path from "path";
import { geocodeLocation, isValidUSCoordinates } from "./server/geocoding";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

interface LocationData {
  city: string;
  state: string;
  date: string;
  name: string;
}

function parseDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split("T")[0];

  // Try to parse MM-DD-YY format
  const match = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (match) {
    const month = match[1].padStart(2, "0");
    const day = match[2].padStart(2, "0");
    let year = match[3];

    // Convert YY to YYYY
    if (year.length === 2) {
      const yearNum = parseInt(year);
      // Assume 00-25 is 2000-2025, 26-99 is 1926-1999
      year =
        yearNum <= 25
          ? `20${year}`
          : `19${year}`;
    }

    return `${year}-${month}-${day}`;
  }

  return new Date().toISOString().split("T")[0];
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

  // If it's already a full state name, return as-is
  if (Object.values(stateMap).includes(stateCode)) {
    return stateCode;
  }

  // Otherwise, try to look it up
  return stateMap[stateCode.toUpperCase()] || stateCode;
}

function parseLocationLine(line: string): LocationData | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Pattern: City, ST Date Name or City, ST Name
  // Split by comma first to get city and the rest
  const parts = trimmed.split(",");
  if (parts.length < 2) return null;

  const city = parts[0].trim().replace(/\.$/, "").trim();

  // Now parse the rest: "ST Date Name" or "ST Name"
  const restParts = parts[1].trim().split(/\s+/);
  if (restParts.length < 2) return null;

  const state = restParts[0].trim();
  let dateStr = "";
  let nameStartIdx = 1;

  // Check if the second part is a date
  if (restParts.length >= 3 && restParts[1].match(/^\d{1,2}-\d{1,2}-\d{2,4}$/)) {
    dateStr = restParts[1];
    nameStartIdx = 2;
  }

  const name = restParts
    .slice(nameStartIdx)
    .join(" ")
    .replace(/\s*\(gone\)$/, "")
    .replace(/\s*\(odd\)$/, "")
    .trim();

  if (!name) return null;

  return {
    city,
    state: normalizeStateName(state),
    date: parseDate(dateStr),
    name,
  };
}

async function isLocationExists(location: LocationData, existing: any[]): Promise<boolean> {
  // Check if exact match exists
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

    const filePath = path.resolve("locations-to-import.txt");
    console.log("📄 Reading import file...");
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    const toImport: LocationData[] = [];
    const skipped: string[] = [];
    const invalid: string[] = [];

    console.log("🔍 Parsing locations...");
    for (const line of lines) {
      const parsed = parseLocationLine(line);
      if (!parsed) {
        if (line.trim()) invalid.push(line);
        continue;
      }

      const exists = await isLocationExists(parsed, existing);
      if (exists) {
        skipped.push(
          `${parsed.city}, ${parsed.state} - ${parsed.name}`
        );
        continue;
      }

      toImport.push(parsed);
    }

    console.log(`\n✅ Valid locations to import: ${toImport.length}`);
    console.log(`⏭️  Already exist: ${skipped.length}`);
    if (invalid.length > 0 && invalid.length <= 10) {
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
          console.log(`⚠️  Skipped: ${location.city}, ${location.state} (geocoding returned non-US coordinates)`);
          continue;
        }

        // Determine category based on name
        let category = "muffler-men"; // Default category
        if (
          location.name.toLowerCase().includes("indian") ||
          location.name.toLowerCase().includes("cowboys") ||
          location.name.toLowerCase().includes("giant") ||
          location.name.toLowerCase().includes("head") ||
          location.name.toLowerCase().includes("frankenstein") ||
          location.name.toLowerCase().includes("clown") ||
          location.name.toLowerCase().includes("bunyan") ||
          location.name.toLowerCase().includes("viking") ||
          location.name.toLowerCase().includes("mini") ||
          location.name.toLowerCase().includes("uniroyal") ||
          location.name.toLowerCase().includes("boots") ||
          location.name.toLowerCase().includes("genie") ||
          location.name.toLowerCase().includes("chicken") ||
          location.name.toLowerCase().includes("friend") ||
          location.name.toLowerCase().includes("dude") ||
          location.name.toLowerCase().includes("pioneer") ||
          location.name.toLowerCase().includes("uncle sam") ||
          location.name.toLowerCase().includes("marathon")
        ) {
          category = "muffler-men";
        }

        const newLocation = {
          name: location.name,
          city: location.city,
          state: location.state,
          category,
          latitude: coords.latitude,
          longitude: coords.longitude,
          taggedDate: location.date,
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
