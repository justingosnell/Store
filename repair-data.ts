import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface ExportData {
  users: any[];
  locations: any[];
  media: any[];
  categories: any[];
  settings: any[];
}

async function repairData() {
  try {
    const exportPath = path.resolve(__dirname, "data-export.json");
    if (!fs.existsSync(exportPath)) {
      throw new Error("Export file not found");
    }

    const data: ExportData = JSON.parse(fs.readFileSync(exportPath, "utf-8"));

    let repaired = 0;
    const issues: string[] = [];

    console.log("\n🔧 REPAIRING DATA...\n");

    // Fix locations with missing/invalid photo data
    data.locations = data.locations.map((loc, idx) => {
      let changed = false;

      // Fix empty photoId - generate one based on ID or index
      if (!loc.photoId || loc.photoId.trim() === "") {
        loc.photoId = `auto_${loc.id.substring(0, 8)}`;
        changed = true;
        issues.push(`Location ${idx} (${loc.name}): Generated photoId`);
      }

      // Fix localhost photoUrl
      if (loc.photoUrl && loc.photoUrl.includes("localhost:3000")) {
        loc.photoUrl = `https://via.placeholder.com/300x200?text=${encodeURIComponent(
          loc.name.substring(0, 20)
        )}`;
        changed = true;
        issues.push(
          `Location ${idx} (${loc.name}): Replaced localhost URL with placeholder`
        );
      }

      // Fix 127.0.0.1 photoUrl
      if (loc.photoUrl && loc.photoUrl.includes("127.0.0.1")) {
        loc.photoUrl = `https://via.placeholder.com/300x200?text=${encodeURIComponent(
          loc.name.substring(0, 20)
        )}`;
        changed = true;
        issues.push(
          `Location ${idx} (${loc.name}): Replaced 127.0.0.1 URL with placeholder`
        );
      }

      // Fix missing photoUrl completely
      if (!loc.photoUrl || loc.photoUrl.trim() === "") {
        loc.photoUrl = `https://via.placeholder.com/300x200?text=${encodeURIComponent(
          loc.name.substring(0, 20)
        )}`;
        changed = true;
        issues.push(
          `Location ${idx} (${loc.name}): Generated placeholder photoUrl`
        );
      }

      if (changed) {
        repaired++;
      }
      return loc;
    });

    // Save repaired data
    fs.writeFileSync(exportPath, JSON.stringify(data, null, 2));

    console.log("📊 REPAIR SUMMARY:");
    console.log(`   ✅ Locations repaired: ${repaired}\n`);

    if (issues.length > 0) {
      console.log("📝 CHANGES MADE:");
      issues.forEach((issue) => console.log(`   • ${issue}`));
    }

    console.log("\n✅ Data repaired and saved!");

  } catch (error) {
    console.error("❌ Repair failed:", error);
    process.exit(1);
  }
}

repairData();