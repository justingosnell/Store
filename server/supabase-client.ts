import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseBucket = process.env.SUPABASE_BUCKET;
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey && supabaseBucket);

console.log("Supabase initialization:", {
  url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : "MISSING",
  key: supabaseKey ? "SET" : "MISSING",
  bucket: supabaseBucket || "MISSING",
});

if (!isSupabaseConfigured) {
  console.warn(
    "Supabase storage is not configured. The server will start, but media upload and recovery endpoints require SUPABASE_URL, SUPABASE_KEY, and SUPABASE_BUCKET."
  );
}

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function getSupabaseClient() {
  if (!supabase || !supabaseBucket) {
    throw new Error(
      "Supabase storage is not configured. Set SUPABASE_URL, SUPABASE_KEY, and SUPABASE_BUCKET to enable media uploads."
    );
  }

  return supabase;
}

export async function uploadFileToSupabase(
  bucket: string,
  path: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<string> {
  const client = getSupabaseClient();
  const { data, error } = await client.storage
    .from(bucket)
    .upload(path, fileBuffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  return data.path;
}

export function getPublicUrl(bucket: string, path: string): string {
  const client = getSupabaseClient();
  const { data } = client.storage.from(bucket).getPublicUrl(path);
  console.log("Public URL generated:", {
    input: { bucket, path: path.substring(0, 30) },
    output: data.publicUrl.substring(0, 50),
  });
  return data.publicUrl;
}
