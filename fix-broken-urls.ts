import "dotenv/config";
import { db } from "./server/db";
import { media } from "@shared/schema";
import { eq } from "drizzle-orm";

async function fixBrokenUrls() {
  try {
    console.log("🔍 Scanning for broken media URLs...");
    
    const allMedia = await db.select().from(media);
    console.log(`📊 Total media entries: ${allMedia.length}`);
    
    // Find entries with undefined in URL
    const brokenMedia = allMedia.filter(m => m.url.includes("undefined"));
    console.log(`❌ Found ${brokenMedia.length} entries with broken URLs`);
    
    if (brokenMedia.length === 0) {
      console.log("✅ No broken URLs found!");
      process.exit(0);
    }
    
    // Fix each broken URL
    const supabaseUrl = process.env.SUPABASE_URL || "https://fpaxndekwubupxlubvxj.supabase.co";
    const bucket = process.env.SUPABASE_BUCKET || "imageStore";
    
    console.log(`\n🔧 Fixing URLs with: ${supabaseUrl}/${bucket}`);
    
    let fixedCount = 0;
    for (const item of brokenMedia) {
      // Extract the storage path from the broken URL
      // From: undefined/storage/v1/object/public/undefined/media/...
      // Extract: media/...
      const storagePathMatch = item.url.match(/media\/.*$/);
      if (!storagePathMatch) {
        console.log(`  ⚠️  Could not extract storage path from: ${item.url}`);
        continue;
      }
      
      const storagePath = storagePathMatch[0];
      const fixedUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${storagePath}`;
      
      try {
        await db.update(media).set({ url: fixedUrl }).where(eq(media.id, item.id));
        fixedCount++;
        console.log(`  ✓ Fixed: ${item.originalName}`);
      } catch (error) {
        console.error(`  ✗ Failed to fix ${item.id}:`, error);
      }
    }
    
    console.log(`\n✅ Fixed ${fixedCount} broken URLs!`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Fix failed:", error);
    process.exit(1);
  }
}

fixBrokenUrls();
