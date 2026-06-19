# 🖼️ Image Storage: Supabase Setup Guide

Your app is **already fully configured** to use Supabase Storage for images! Here's what's happening behind the scenes.

## ✅ Current Architecture

```
┌─────────────────┐
│   Frontend      │
│   (React)       │
└────────┬────────┘
         │
    Upload file
         │
         ▼
┌─────────────────────────────┐
│  Backend Server (Node.js)   │
│  - Receives file            │
│  - Validates type/size      │
│  - Uploads to Supabase      │
└────────┬────────────────────┘
         │
    Upload file
         │
         ▼
┌──────────────────────────────────────────┐
│   Supabase Storage                       │
│   - imageStore bucket                    │
│   - Files stored at: media/              │
│   - Public accessible URLs               │
└────────┬─────────────────────────────────┘
         │
    Store URL in DB
         │
         ▼
┌──────────────────────────────────────────┐
│   Supabase PostgreSQL                    │
│   - Database                             │
│   - Stores URLs: media.url, photo_url    │
│   - Stores metadata (size, mime type)    │
└──────────────────────────────────────────┘
```

## 📁 Storage Structure

Your Supabase Storage bucket (`imageStore`) is organized as:

```
imageStore/ (bucket)
├── media/
│   ├── 1704067200000_sunset.jpg
│   ├── 1704067300000_mountains.png
│   ├── 1704067400000_city.webp
│   └── ...
└── thumbnails/ (optional, for future use)
```

## 🔧 Configuration Files

### 1. Backend: Image Upload Handler

**File:** `/Users/macbook/joe-main/server/routes.ts`

The upload endpoint:
```typescript
POST /api/upload
- Receives file from frontend
- Validates: type, size, dimensions
- Uploads to Supabase Storage
- Returns URL and metadata
```

### 2. Supabase Client

**File:** `/Users/macbook/joe-main/server/supabase-client.ts`

```typescript
// Upload file to storage
uploadFileToSupabase(bucket, path, buffer, contentType)
// → Returns: storage path

// Get public URL
getPublicUrl(bucket, path)
// → Returns: https://XXXX.supabase.co/storage/v1/object/public/imageStore/...
```

### 3. Environment Variables

**Required in `.env.local` or `.env.production`:**

```env
# Supabase database (after migration)
DATABASE_URL=postgresql://postgres:PASSWORD@db.XXXX.supabase.co:5432/postgres?sslmode=require

# Supabase Storage
SUPABASE_URL=https://XXXX.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_BUCKET=imageStore
```

**To find these:**
1. Go to [supabase.com](https://supabase.com) → Your Project
2. Settings → API
3. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** → `SUPABASE_KEY`

## 📤 Upload Flow

### When User Uploads Image

1. **Frontend:** User selects image
   ```typescript
   // LocationDialog.tsx or MediaLibrary.tsx
   handleFileUpload(event) {
     const file = event.target.files[0];
     // Validate type & size
     // POST to /api/upload
   }
   ```

2. **Backend:** Receive & Process
   ```typescript
   // Server receives multipart form data
   // Validates: JPEG, PNG, GIF, WebP
   // Max size: 10MB
   ```

3. **Upload to Supabase**
   ```typescript
   // server/supabase-client.ts
   uploadFileToSupabase(
     "imageStore",
     `media/${timestamp}_${originalName}`,
     buffer,
     contentType
   );
   // → Returns: "media/1704067200000_sunset.jpg"
   ```

4. **Get Public URL**
   ```typescript
   const publicUrl = getPublicUrl("imageStore", "media/1704067200000_sunset.jpg");
   // → "https://XXXX.supabase.co/storage/v1/object/public/imageStore/media/1704067200000_sunset.jpg"
   ```

5. **Store in Database**
   ```typescript
   // Save to media table
   INSERT INTO media (url, mime_type, size, ...)
   VALUES ('https://XXXX.supabase.co/storage/v1/object/public/imageStore/...', ...)
   
   // Or save to locations table
   UPDATE locations SET photo_url = '...' WHERE id = ...
   ```

6. **Frontend:** Display image
   ```typescript
   <img src="https://XXXX.supabase.co/storage/v1/object/public/imageStore/..." />
   // ✅ Image appears!
   ```

## 📊 Database Schema for Images

### media Table

```sql
CREATE TABLE media (
  id                TEXT PRIMARY KEY,           -- UUID
  filename          TEXT NOT NULL,              -- "sunset.jpg"
  original_name     TEXT NOT NULL,              -- User's original filename
  url               TEXT NOT NULL,              -- Public Supabase URL
  mime_type         TEXT NOT NULL,              -- "image/jpeg"
  size              TEXT NOT NULL,              -- File size in bytes
  width             TEXT,                       -- Image width (pixels)
  height            TEXT,                       -- Image height (pixels)
  alt               TEXT DEFAULT '',            -- Alt text for accessibility
  caption           TEXT DEFAULT '',            -- Image caption
  storage_path      TEXT,                       -- Path in bucket: "media/1704067200000_sunset.jpg"
  uploadedAt        TEXT DEFAULT CURRENT_TIMESTAMP,
  uploadedBy        TEXT,                       -- Foreign key to users.id
  FOREIGN KEY (uploadedBy) REFERENCES users(id)
);
```

### locations Table (Photo Reference)

```sql
CREATE TABLE locations (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  photo_url   TEXT NOT NULL,                    -- URL from Supabase Storage
  photo_id    TEXT NOT NULL,                    -- Reference to media entry
  ...
);
```

## 🔗 Image URL Examples

### Public Supabase Storage URL Format

```
https://XXXX.supabase.co/storage/v1/object/public/imageStore/media/1704067200000_sunset.jpg
│      │    │              │                     │           │      │
│      │    │              │                     │           │      └─ File name
│      │    │              │                     │           └─ Folder in bucket
│      │    │              │                     └─ Bucket name
│      │    │              └─ Scope: "public" = anyone can access
│      │    └─ Object storage API
│      └─ Project ID
└─ Supabase domain
```

### Your URLs Look Like

```
https://fpaxndekwubupxlubvxj.supabase.co/storage/v1/object/public/imageStore/media/1704067200000_muffler_men.jpg
```

**✅ Correct!** These are complete, absolute URLs that work from any domain.

## 🔐 Storage Security

### Public Bucket Rules

Your `imageStore` bucket is configured with:

```json
{
  "authenticated": "true",
  "role": "authenticated"
}
```

This means:
- ✅ Anyone with the URL can **view** the image
- ✅ Only authenticated users can **upload** images
- ✅ URLs are permanent and shareable
- ✅ Images persist even if you delete the database entry

### Security Best Practices

1. **Bucket Policies:** Images are public (can be viewed by anyone with URL)
2. **Upload Restrictions:** Only authenticated users can upload
3. **File Validation:** Server validates type, size, dimensions
4. **Path Organization:** Files organized by upload date/timestamp

## 🐛 Fixing Old Issues

### Previous URL Problem (NOW FIXED ✅)

**What was wrong:**
```
❌ window.location.origin + supabase_url
❌ http://localhost:3000 + https://fpaxndekwubupxlubvxj.supabase.co/storage/...
❌ Result: http://localhost:3000https://... (malformed!)
```

**What's fixed now:**
```
✅ Direct Supabase URLs
✅ https://fpaxndekwubupxlubvxj.supabase.co/storage/v1/object/public/imageStore/...
✅ Works from anywhere!
```

**Files fixed:**
- ✅ `client/src/components/LocationDialog.tsx` (line 207-208)
- ✅ `client/src/components/MediaLibrary.tsx` (line 327)
- ✅ `client/src/components/MediaLibraryPanel.tsx` (line 311)

## 📋 Verification Checklist

After migration, verify image storage is working:

### 1. Check Bucket Exists
```bash
# In Supabase dashboard:
# Storage → imageStore → Should see "media/" folder
```

### 2. Test Upload
```bash
# In app:
# 1. Go to Media Library
# 2. Upload a test image
# 3. Should see in thumbnails
```

### 3. Verify Database
```bash
# Check media table
SELECT COUNT(*) FROM media;
SELECT url FROM media LIMIT 1;
```

### 4. Check Public Access
```bash
# Copy a URL from database
# Paste in browser
# Should see image (not 404)
```

### 5. Verify in App
```bash
# 1. View media library - images should display
# 2. Create location with image - should display in list
# 3. Edit location - image should preview
```

## 🚀 Performance Tips

1. **Images are cached** by browser (far-future expires header)
2. **Supabase CDN** automatically serves images from nearest edge
3. **Lazy loading** on frontend (`loading="lazy"`)
4. **Responsive images** using CSS `object-cover`

## 📈 Storage Limits

Supabase storage limits:
- **Free tier:** 1 GB total storage
- **Pro tier:** Unlimited (pay per usage)

Monitor usage:
1. Go to Supabase dashboard → Storage
2. See total bucket size
3. Upgrade plan if needed

## 🔄 Backup Images

Your images are backed up automatically by Supabase, but for extra safety:

```bash
# List all images
aws s3 ls s3://your-bucket/media/ --recursive

# Or use Supabase CLI
supabase storage list imageStore

# Download all
supabase storage download imageStore/ ./backup/
```

## 🎯 Next Steps

1. ✅ Complete database migration (use `./migrate-db.sh`)
2. ✅ Update `.env.local` with Supabase credentials
3. ✅ Restart server
4. ✅ Test uploading a new image
5. ✅ Verify image displays in media library
6. ✅ Deploy to production

## 📞 Troubleshooting

### Images Not Displaying (404 Errors)

**Cause:** URLs being malformed (already fixed!)
**Solution:** Verify using direct Supabase URLs without prepending origin

### Upload Fails with Permission Error

**Cause:** `SUPABASE_BUCKET` or bucket policy misconfigured
**Solution:** Check environment variables and bucket policies in Supabase

### Images Won't Upload (File Validation)

**Cause:** Invalid file type or too large
**Solution:** 
- Supported: JPEG, PNG, GIF, WebP
- Max size: 10 MB

### CORS Issues

**Cause:** Supabase Storage not allowing requests from your domain
**Solution:** Add domain to CORS in Supabase bucket settings

---

**Your image storage is ready!** After database migration, everything will work seamlessly. 🎉