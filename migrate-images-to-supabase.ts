import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { resolveDatabase } from "./server/ipv4-resolver";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrateImagesToSupabase() {
  let client: postgres.Sql | null = null;
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    const supabaseBucket = process.env.SUPABASE_BUCKET || "imageStore";

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("SUPABASE_URL and SUPABASE_KEY environment variables are required");
    }

    // Connect to PostgreSQL with IPv4 resolution
    console.log("🔌 Resolving database connection...");
    const resolvedUrl = await resolveDatabase();
    console.log("✅ Database URL resolved");
    
    client = postgres(resolvedUrl, {
      ssl: "require",
      connect_timeout: 10000,
    });
    const db = drizzle(client, { schema });

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("🔗 Connected to PostgreSQL and Supabase");

    // Get all locations
    const locations = await db.select().from(schema.locations);
    console.log(`📍 Found ${locations.length} locations`);

    let migratedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const location of locations) {
      try {
        // Skip if already a Supabase Storage URL
        if (location.photoUrl.includes("supabase.co")) {
          console.log(`✓ Skipped ${location.name} - already using Supabase`);
          skippedCount++;
          continue;
        }

        // Download the image
        console.log(`⬇️  Downloading image for: ${location.name}`);
        const imageResponse = await fetch(location.photoUrl);
        
        if (!imageResponse.ok) {
          console.error(`✗ Failed to download ${location.name}: ${imageResponse.statusText}`);
          failedCount++;
          continue;
        }

        const arrayBuffer = await imageResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

        // Generate filename
        const hash = crypto.randomBytes(8).toString("hex");
        const timestamp = Date.now();
        const extension = contentType.split("/")[1] || "jpg";
        const filename = `${hash}-${timestamp}.${extension}`;
        const storagePath = `media/${filename}`;

        // Upload to Supabase Storage
        console.log(`⬆️  Uploading to Supabase: ${filename}`);
        const { error: uploadError } = await supabase.storage
          .from(supabaseBucket)
          .upload(storagePath, buffer, {
            contentType,
            cacheControl: "3600",
          });

        if (uploadError) {
          console.error(`✗ Failed to upload ${location.name}:`, uploadError);
          failedCount++;
          continue;
        }

        // Get public URL
        const { data } = supabase.storage
          .from(supabaseBucket)
          .getPublicUrl(storagePath);
        
        const newPhotoUrl = data.publicUrl;

        // Check if media record already exists
        const existingMedia = await db
          .select()
          .from(schema.media)
          .where(schema.media.url === location.photoUrl)
          .limit(1);

        if (existingMedia.length > 0) {
          // Update existing media record
          await db
            .update(schema.media)
            .set({
              url: newPhotoUrl,
              storagePath,
            })
            .where(schema.media.id === existingMedia[0].id);
        } else {
          // Create new media record
          await db.insert(schema.media).values({
            filename,
            originalName: location.name,
            url: newPhotoUrl,
            mimeType: contentType,
            size: buffer.length.toString(),
            storagePath,
          });
        }

        // Update location with new photo URL
        await db
          .update(schema.locations)
          .set({ photoUrl: newPhotoUrl })
          .where(schema.locations.id === location.id);

        console.log(`✅ Migrated: ${location.name}`);
        migratedCount++;
      } catch (error) {
        console.error(`✗ Error processing ${location.name}:`, error);
        failedCount++;
      }
    }

    console.log("\n📊 Migration Summary:");
    console.log(`✅ Migrated: ${migratedCount}`);
    console.log(`⊘ Skipped: ${skippedCount}`);
    console.log(`✗ Failed: ${failedCount}`);
    console.log(`\n✅ Image migration completed!`);

    if (client) {
      await client.end();
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    
    // Ensure client is closed
    if (client) {
      try {
        await client.end();
      } catch {
        // Ignore cleanup errors
      }
    }
    
    process.exit(1);
  }
}

migrateImagesToSupabase();
