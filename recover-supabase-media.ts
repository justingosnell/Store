import { initializeDatabase, db } from "./server/db";
import { media } from "@shared/schema";
import { supabase, getPublicUrl } from "./server/supabase-client";

async function recoverSupabaseMedia() {
  console.log("🔍 Starting Supabase media recovery process...\n");

  await initializeDatabase();

  const bucket = process.env.SUPABASE_BUCKET;
  if (!bucket) {
    console.error("❌ SUPABASE_BUCKET not set!");
    return;
  }

  try {
    // List all files in Supabase bucket
    const { data: files, error } = await supabase.storage.from(bucket).list();

    if (error) {
      console.error("❌ Error listing files from Supabase:", error);
      return;
    }

    console.log(`📁 Found ${files.length} files in Supabase bucket\n`);

    // Get all existing media records from database
    const existingMedia = await db.select().from(media);
    const existingUrls = new Set(existingMedia.map((m) => m.url));

    console.log(`💾 Found ${existingMedia.length} media records in database\n`);

    // Filter files that aren't in the database
    const newFiles = files.filter((file) => {
      const fileUrl = getPublicUrl(bucket, file.name);
      return !existingUrls.has(fileUrl);
    });

    if (newFiles.length === 0) {
      console.log("✅ All Supabase files are already in database!");
      return;
    }

    console.log(`🆕 Found ${newFiles.length} new files to add to database\n`);

    // Add new files to database
    let addedCount = 0;
    for (const file of newFiles) {
      try {
        const fileUrl = getPublicUrl(bucket, file.name);
        await db.insert(media).values({
          filename: file.name,
          originalName: file.name,
          url: fileUrl,
          mimeType: getMimeType(file.name),
          size: String(file.metadata?.size || 0),
          width: file.metadata?.size ? undefined : undefined,
          height: undefined,
          alt: "",
          caption: "",
          uploadedAt: new Date().toISOString(),
        });
        addedCount++;
        console.log(`✅ Added: ${file.name}`);
      } catch (err) {
        console.error(`❌ Failed to add ${file.name}:`, err);
      }
    }

    console.log(`\n✨ Recovery complete! Added ${addedCount} media entries to database.`);
  } catch (error) {
    console.error("❌ Recovery error:", error);
  }

  process.exit(0);
}

function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop();
  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
  };
  return mimeTypes[ext || ""] || "application/octet-stream";
}

recoverSupabaseMedia().catch(console.error);
