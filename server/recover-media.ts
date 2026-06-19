import { db } from "./db";
import { media } from "../shared/schema";
import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";

interface ImageMetadata {
  width?: number;
  height?: number;
}

async function getImageMetadata(filePath: string): Promise<ImageMetadata> {
  try {
    // For now, we'll return empty metadata
    // In a production app, you'd use a library like 'sharp' to get actual dimensions
    return {};
  } catch (error) {
    console.error(`Error getting metadata for ${filePath}:`, error);
    return {};
  }
}

async function recoverOrphanedMedia() {
  console.log("🔍 Starting media recovery process...\n");

  const uploadsDir = path.resolve(import.meta.dirname, "..", "uploads");
  
  if (!fs.existsSync(uploadsDir)) {
    console.error("❌ Uploads directory not found!");
    return;
  }

  // Get all files in uploads directory
  const files = fs.readdirSync(uploadsDir);
  const imageFiles = files.filter(file => 
    /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
  );

  console.log(`📁 Found ${imageFiles.length} image files in uploads directory`);

  // Get all existing media records
  const existingMedia = await db.select().from(media);
  const existingFilenames = new Set(existingMedia.map(m => m.filename));

  console.log(`💾 Found ${existingMedia.length} images already in database\n`);

  // Find orphaned files
  const orphanedFiles = imageFiles.filter(file => !existingFilenames.has(file));

  if (orphanedFiles.length === 0) {
    console.log("✅ No orphaned files found! All images are registered.");
    return;
  }

  console.log(`🔧 Found ${orphanedFiles.length} orphaned images to recover:\n`);

  let recovered = 0;
  let failed = 0;

  for (const filename of orphanedFiles) {
    try {
      const filePath = path.join(uploadsDir, filename);
      const stats = fs.statSync(filePath);
      const metadata = await getImageMetadata(filePath);

      // Extract original name from filename (remove timestamp prefix)
      // Format: 1760486879046-445836981.jpg
      const originalName = filename.replace(/^\d+-\d+\./, "image.");

      const mediaRecord = {
        filename,
        originalName,
        url: `/uploads/${filename}`,
        mimeType: filename.endsWith('.png') ? 'image/png' : 
                  filename.endsWith('.gif') ? 'image/gif' :
                  filename.endsWith('.webp') ? 'image/webp' : 'image/jpeg',
        size: stats.size.toString(),
        width: metadata.width?.toString(),
        height: metadata.height?.toString(),
        alt: "",
        caption: "",
        uploadedBy: null,
      };

      await db.insert(media).values(mediaRecord);
      
      console.log(`  ✅ Recovered: ${filename} (${(stats.size / 1024).toFixed(2)} KB)`);
      recovered++;
    } catch (error) {
      console.error(`  ❌ Failed to recover ${filename}:`, error);
      failed++;
    }
  }

  console.log(`\n📊 Recovery Summary:`);
  console.log(`   ✅ Successfully recovered: ${recovered} images`);
  if (failed > 0) {
    console.log(`   ❌ Failed: ${failed} images`);
  }
  console.log(`   💾 Total in media library: ${existingMedia.length + recovered} images`);
  console.log(`\n🎉 Media recovery complete!`);
}

// Run the recovery
recoverOrphanedMedia()
  .then(() => {
    console.log("\n✨ Done! You can now see all images in your Media Library.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Recovery failed:", error);
    process.exit(1);
  });