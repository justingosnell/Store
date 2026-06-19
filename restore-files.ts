import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

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

// Get backup directory from argument or use most recent
let backupDir = process.argv[2];

if (!backupDir || !fs.existsSync(backupDir)) {
  // Find most recent backup
  const backupsDir = "backups";
  if (fs.existsSync(backupsDir)) {
    const backups = fs.readdirSync(backupsDir).sort().reverse();
    if (backups.length > 0) {
      backupDir = path.join(backupsDir, backups[0]);
    }
  }
}

if (!backupDir || !fs.existsSync(backupDir)) {
  console.error("❌ No backup directory found");
  console.log("Usage: npx tsx restore-files.ts [backup_directory]");
  process.exit(1);
}

const filesDir = path.join(backupDir, "files");

if (!fs.existsSync(filesDir)) {
  console.error(`❌ Files directory not found: ${filesDir}`);
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function uploadFile(filePath: string, targetPath: string): Promise<boolean> {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const mimeType = getMimeType(filePath);

    const { error } = await supabase.storage.from(BUCKET).upload(targetPath, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });

    if (error) {
      console.log(`✗ ${targetPath}: ${error.message}`);
      return false;
    }

    return true;
  } catch (error) {
    console.log(`✗ ${targetPath}: ${error instanceof Error ? error.message : "Unknown error"}`);
    return false;
  }
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".txt": "text/plain",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

async function uploadRecursive(dir: string, basePath: string = ""): Promise<[number, number]> {
  let successCount = 0;
  let failCount = 0;

  const items = fs.readdirSync(dir);

  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stats = fs.statSync(itemPath);
    const targetPath = basePath ? `${basePath}/${item}` : item;

    if (stats.isDirectory()) {
      const [success, fail] = await uploadRecursive(itemPath, targetPath);
      successCount += success;
      failCount += fail;
    } else {
      const success = await uploadFile(itemPath, targetPath);
      if (success) {
        successCount++;
        console.log(`✓ ${targetPath}`);
      } else {
        failCount++;
      }
    }
  }

  return [successCount, failCount];
}

async function restore() {
  console.log("🔄 Starting file restoration...");
  console.log(`📁 Backup directory: ${backupDir}`);
  console.log(`🪣 Target bucket: ${BUCKET}`);
  console.log(`🌐 Supabase URL: ${SUPABASE_URL}`);
  console.log("");

  try {
    // Check if bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error("❌ Failed to list buckets:", bucketsError.message);
      process.exit(1);
    }

    const bucketExists = buckets?.some((b) => b.name === BUCKET);

    if (!bucketExists) {
      console.log(`⚠️  Bucket '${BUCKET}' does not exist. Creating it...`);
      const { error: createError } = await supabase.storage.createBucket(BUCKET, {
        public: true,
      });

      if (createError) {
        console.error("❌ Failed to create bucket:", createError.message);
        process.exit(1);
      }
      console.log(`✅ Bucket created: ${BUCKET}`);
    }

    console.log(`📊 Starting file upload...`);
    const [successCount, failCount] = await uploadRecursive(filesDir);

    console.log("");
    console.log("✅ File restoration complete!");
    console.log(`   Uploaded: ${successCount} files`);
    if (failCount > 0) {
      console.log(`   Failed: ${failCount} files`);
    }

    console.log("");
    console.log("🎉 All files have been restored to the new Supabase instance!");
  } catch (error) {
    console.error("❌ Restoration error:", error);
    process.exit(1);
  }
}

restore();
