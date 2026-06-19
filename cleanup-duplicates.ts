import "dotenv/config";
import { db } from "./server/db";
import { media } from "@shared/schema";
import { eq } from "drizzle-orm";

async function cleanup() {
  try {
    console.log("🔍 Scanning for duplicate media entries...");
    
    const allMedia = await db.select().from(media);
    console.log(`📊 Total media entries: ${allMedia.length}`);
    
    // Build map of URL -> array of media items with that URL
    const urlMap = new Map<string, typeof allMedia>();
    
    for (const item of allMedia) {
      if (!urlMap.has(item.url)) {
        urlMap.set(item.url, []);
      }
      urlMap.get(item.url)!.push(item);
    }
    
    // Find duplicates
    const duplicates: (typeof allMedia)[number][] = [];
    for (const [url, items] of urlMap) {
      if (items.length > 1) {
        console.log(`🔗 URL has ${items.length} entries: ${url}`);
        // Keep the first one, mark the rest as duplicates
        duplicates.push(...items.slice(1));
      }
    }
    
    if (duplicates.length === 0) {
      console.log("✅ No duplicates found!");
      return;
    }
    
    console.log(`\n🧹 Found ${duplicates.length} duplicate entries to remove`);
    
    // Delete all duplicates
    let deletedCount = 0;
    for (const item of duplicates) {
      try {
        await db.delete(media).where(eq(media.id, item.id));
        deletedCount++;
        console.log(`  ✓ Deleted: ${item.url}`);
      } catch (error) {
        console.error(`  ✗ Failed to delete ${item.id}:`, error);
      }
    }
    
    console.log(`\n✅ Cleanup complete! Removed ${deletedCount} duplicate entries`);
    console.log(`📊 Remaining media entries: ${allMedia.length - deletedCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    process.exit(1);
  }
}

cleanup();
