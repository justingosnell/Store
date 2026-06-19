import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import { URL } from "url";

// Load environment variables
const envPath = ".env.backend";
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, "utf-8");
  envFile.split("\n").forEach((line) => {
    const [key, value] = line.split("=");
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const BUCKET = process.env.SUPABASE_BUCKET || "imageStore";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_KEY in environment");
  process.exit(1);
}

// Create backup directory
const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
const backupDir = path.join("backups", timestamp);
const filesDir = path.join(backupDir, "files");

if (!fs.existsSync(filesDir)) {
  fs.mkdirSync(filesDir, { recursive: true });
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function downloadFile(
  filePath: string,
  localPath: string
): Promise<boolean> {
  return new Promise((resolve) => {
    const fileUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filePath}`;
    const url = new URL(fileUrl);

    const file = fs.createWriteStream(localPath);
    const protocol = url.protocol === "https:" ? https : https;

    protocol
      .get(fileUrl, (response) => {
        if (response.statusCode === 200) {
          response.pipe(file);
          file.on("finish", () => {
            file.close();
            resolve(true);
          });
        } else {
          file.close();
          fs.unlink(localPath, () => {});
          resolve(false);
        }
      })
      .on("error", () => {
        file.close();
        fs.unlink(localPath, () => {});
        resolve(false);
      });
  });
}

async function backupFiles() {
  console.log("🔄 Starting file backup...");
  console.log(`📁 Backup directory: ${backupDir}`);
  console.log(`🪣 Bucket: ${BUCKET}`);

  try {
    // List all files in bucket
    const { data: fileList, error: listError } = await supabase.storage
      .from(BUCKET)
      .list("", { limit: 10000 });

    if (listError || !fileList) {
      console.error("❌ Failed to list files:", listError?.message);
      process.exit(1);
    }

    console.log(`\n📊 Found ${fileList.length} files to backup`);

    let successCount = 0;
    let failCount = 0;

    // Download files recursively
    async function downloadRecursive(folder: string, prefixPath: string = "") {
      const { data: items, error } = await supabase.storage
        .from(BUCKET)
        .list(folder, { limit: 10000 });

      if (error || !items) {
        console.error(`⚠️  Failed to list folder ${folder}`);
        return;
      }

      for (const item of items) {
        const itemPath = prefixPath ? `${prefixPath}/${item.name}` : item.name;

        if (item.id === null) {
          // It's a folder
          await downloadRecursive(itemPath, itemPath);
        } else {
          // It's a file
          const localPath = path.join(filesDir, itemPath);
          const localDir = path.dirname(localPath);

          if (!fs.existsSync(localDir)) {
            fs.mkdirSync(localDir, { recursive: true });
          }

          const success = await downloadFile(itemPath, localPath);
          if (success) {
            successCount++;
            console.log(`✓ ${itemPath}`);
          } else {
            failCount++;
            console.log(`✗ ${itemPath}`);
          }
        }
      }
    }

    await downloadRecursive("");

    // Create manifest
    const manifest = {
      backup_date: new Date().toISOString(),
      supabase_url: SUPABASE_URL,
      bucket: BUCKET,
      database_dump: "database.sql",
      files_directory: "files",
      files_backed_up: successCount,
      files_failed: failCount,
      total_files: fileList.length,
    };

    fs.writeFileSync(
      path.join(backupDir, "manifest.json"),
      JSON.stringify(manifest, null, 2)
    );

    console.log("\n✅ File backup complete!");
    console.log(`   Downloaded: ${successCount}/${fileList.length} files`);
    if (failCount > 0) {
      console.log(`   Failed: ${failCount} files`);
    }

    // Create archive
    console.log("\n📦 Creating archive...");
    const { spawnSync } = await import("child_process");
    const archiveName = `joe-main-backup-${timestamp}.tar.gz`;

    const result = spawnSync("tar", ["-czf", archiveName, "-C", "backups", path.basename(backupDir)], {
      cwd: process.cwd(),
      encoding: "utf-8",
    });

    if (result.status === 0) {
      const stats = fs.statSync(archiveName);
      const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`✅ Archive created: ${archiveName} (${sizeInMB} MB)`);
      console.log(`\n🎉 Backup complete! Location: ./${archiveName}`);
    } else {
      console.error("❌ Failed to create archive");
    }
  } catch (error) {
    console.error("❌ Backup error:", error);
    process.exit(1);
  }
}

backupFiles();
