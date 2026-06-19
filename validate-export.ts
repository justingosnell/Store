import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    users: number;
    locations: number;
    media: number;
    categories: number;
    settings: number;
  };
}

async function validateExport(): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    stats: {
      users: 0,
      locations: 0,
      media: 0,
      categories: 0,
      settings: 0,
    },
  };

  try {
    const exportPath = path.resolve(__dirname, "data-export.json");
    if (!fs.existsSync(exportPath)) {
      result.isValid = false;
      result.errors.push("Export file not found");
      return result;
    }

    const fileContent = fs.readFileSync(exportPath, "utf-8");
    const data = JSON.parse(fileContent);

    // Check structure
    if (
      !data.users ||
      !data.locations ||
      !data.media ||
      !data.categories ||
      !data.settings
    ) {
      result.isValid = false;
      result.errors.push("Export missing required tables");
      return result;
    }

    // Validate Users
    if (Array.isArray(data.users)) {
      result.stats.users = data.users.length;
      for (let i = 0; i < data.users.length; i++) {
        const user = data.users[i];
        if (!user.id) result.errors.push(`User ${i}: Missing id`);
        if (!user.username) result.errors.push(`User ${i}: Missing username`);
        if (!user.password) result.errors.push(`User ${i}: Missing password`);
      }
    }

    // Validate Locations
    if (Array.isArray(data.locations)) {
      result.stats.locations = data.locations.length;
      for (let i = 0; i < data.locations.length; i++) {
        const loc = data.locations[i];
        if (!loc.id) result.errors.push(`Location ${i}: Missing id`);
        if (!loc.name) result.errors.push(`Location ${i}: Missing name`);
        if (loc.latitude === null || loc.latitude === undefined)
          result.warnings.push(`Location ${i} (${loc.name}): Missing latitude`);
        if (loc.longitude === null || loc.longitude === undefined)
          result.warnings.push(`Location ${i} (${loc.name}): Missing longitude`);
        if (!loc.category)
          result.warnings.push(`Location ${i} (${loc.name}): Missing category`);
        if (!loc.state)
          result.warnings.push(`Location ${i} (${loc.name}): Missing state`);
        if (!loc.photoUrl)
          result.errors.push(`Location ${i} (${loc.name}): Missing photoUrl`);
        if (!loc.photoId)
          result.errors.push(`Location ${i} (${loc.name}): Missing photoId`);
        if (!loc.taggedDate)
          result.errors.push(`Location ${i} (${loc.name}): Missing taggedDate`);

        // Check coordinate ranges
        if (
          loc.latitude &&
          (loc.latitude < -90 || loc.latitude > 90)
        ) {
          result.errors.push(
            `Location ${i} (${loc.name}): Invalid latitude ${loc.latitude}`
          );
        }
        if (
          loc.longitude &&
          (loc.longitude < -180 || loc.longitude > 180)
        ) {
          result.errors.push(
            `Location ${i} (${loc.name}): Invalid longitude ${loc.longitude}`
          );
        }
      }
    }

    // Validate Media
    if (Array.isArray(data.media)) {
      result.stats.media = data.media.length;
      for (let i = 0; i < data.media.length; i++) {
        const m = data.media[i];
        if (!m.id) result.errors.push(`Media ${i}: Missing id`);
        if (!m.filename)
          result.warnings.push(`Media ${i}: Missing filename`);
        if (!m.url) result.errors.push(`Media ${i}: Missing url`);
        if (!m.mimeType)
          result.warnings.push(`Media ${i}: Missing mimeType`);
      }
    }

    // Validate Categories
    if (Array.isArray(data.categories)) {
      result.stats.categories = data.categories.length;
      for (let i = 0; i < data.categories.length; i++) {
        const cat = data.categories[i];
        if (!cat.id) result.errors.push(`Category ${i}: Missing id`);
        if (!cat.name)
          result.errors.push(`Category ${i}: Missing name`);
        if (!cat.slug)
          result.errors.push(`Category ${i}: Missing slug`);
      }
    }

    // Validate Settings
    if (Array.isArray(data.settings)) {
      result.stats.settings = data.settings.length;
      for (let i = 0; i < data.settings.length; i++) {
        const setting = data.settings[i];
        if (!setting.key)
          result.errors.push(`Setting ${i}: Missing key`);
        if (!setting.value)
          result.warnings.push(`Setting ${i}: Missing value`);
      }
    }

    if (result.errors.length > 0) {
      result.isValid = false;
    }

    return result;
  } catch (error) {
    result.isValid = false;
    result.errors.push(
      `Fatal error: ${error instanceof Error ? error.message : String(error)}`
    );
    return result;
  }
}

async function main() {
  const result = await validateExport();

  console.log("\n📋 DATA VALIDATION REPORT\n");
  console.log("═".repeat(50));

  console.log("\n📊 DATA COUNTS:");
  console.log(`   Users:      ${result.stats.users}`);
  console.log(`   Locations:  ${result.stats.locations}`);
  console.log(`   Media:      ${result.stats.media}`);
  console.log(`   Categories: ${result.stats.categories}`);
  console.log(`   Settings:   ${result.stats.settings}`);

  if (result.warnings.length > 0) {
    console.log("\n⚠️  WARNINGS (non-critical):");
    result.warnings.forEach((w) => console.log(`   • ${w}`));
  }

  if (result.errors.length > 0) {
    console.log("\n❌ ERRORS (blocking):");
    result.errors.forEach((e) => console.log(`   • ${e}`));
  }

  console.log("\n" + "═".repeat(50));

  if (result.isValid) {
    console.log("\n✅ DATA IS VALID - Safe to migrate!\n");
    process.exit(0);
  } else {
    console.log("\n❌ DATA HAS ERRORS - Fix before migrating!\n");
    process.exit(1);
  }
}

main();