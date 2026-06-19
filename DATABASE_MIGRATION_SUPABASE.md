# Database Migration: Render → Supabase

Complete guide to migrate your PostgreSQL database from Render to Supabase.

## 📋 Prerequisites

- PostgreSQL client tools installed (`pg_dump`, `pg_restore`, `psql`)
  ```bash
  # macOS
  brew install postgresql
  
  # Linux
  sudo apt-get install postgresql-client
  
  # Windows: Download from postgresql.org
  ```
- Render database connection string (from Render dashboard)
- Supabase project created (from supabase.com)

## 🚀 Quick Start (Automated)

### 1. Set Environment Variables

```bash
# Export your Render database URL
export DATABASE_URL="postgresql://postgres:PASSWORD@your-instance.postgres.render.com:5432/your_db?sslmode=require"

# Export your Supabase database URL
export SUPABASE_DB_URL="postgresql://postgres:PASSWORD@db.XXXX.supabase.co:5432/postgres?sslmode=require"
```

**To find these URLs:**
- **Render**: Settings → Database → Internal Database URL or External Database URL
- **Supabase**: Settings → Database → Connection String (Postgres driver)

### 2. Make Script Executable

```bash
chmod +x migrate-db.sh verify-migration.sh
```

### 3. Run Migration

```bash
./migrate-db.sh
```

This will:
1. ✅ Export data from Render with `pg_dump`
2. ✅ Import data to Supabase with `pg_restore`
3. ✅ Verify the connection

### 4. Verify Success

```bash
./verify-migration.sh
```

## 🔧 Manual Migration Steps (If Script Fails)

### Step 1: Export from Render

```bash
# Using pg_dump with custom format (recommended)
pg_dump "postgresql://postgres:PASSWORD@your-instance.postgres.render.com:5432/your_db?sslmode=require" \
  --format=custom \
  --no-password \
  --verbose \
  --file=db_backup.dump
```

**This creates:** `db_backup.dump` file (~MB)

### Step 2: Import to Supabase

```bash
# Using pg_restore
pg_restore "postgresql://postgres:PASSWORD@db.XXXX.supabase.co:5432/postgres?sslmode=require" \
  --format=custom \
  --no-password \
  --verbose \
  db_backup.dump
```

### Step 3: Verify Tables

```bash
psql "postgresql://postgres:PASSWORD@db.XXXX.supabase.co:5432/postgres?sslmode=require" \
  --no-password \
  -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"
```

Expected tables:
- `users`
- `locations`
- `media`
- `settings`
- `categories`

## 🔄 Update Application Configuration

### 1. Update `.env.local`

Replace your Render database URL with Supabase:

```env
# OLD (Render)
DATABASE_URL=postgresql://postgres:PASSWORD@your-instance.postgres.render.com:5432/your_db?sslmode=require

# NEW (Supabase)
DATABASE_URL=postgresql://postgres:PASSWORD@db.XXXX.supabase.co:5432/postgres?sslmode=require

# Keep your Supabase Storage config
SUPABASE_URL=https://XXXX.supabase.co
SUPABASE_KEY=your_anon_key
SUPABASE_BUCKET=imageStore
```

### 2. Update `drizzle.config.ts` (if needed)

Current config already supports Supabase:

```typescript
const isRemoteDb = databaseUrl.includes("render.com") || databaseUrl.includes("supabase.co");
```

✅ Already configured! No changes needed.

### 3. Restart Server

```bash
npm run dev
# or
./start-server.sh
```

## 🖼️ Image Storage Setup

Your app already uses Supabase Storage for images! Here's the current flow:

### Current Configuration

1. **Upload Flow:**
   - User uploads image → Server receives it
   - Image saved to Supabase Storage (`imageStore` bucket)
   - URL stored in database (`media.url` and `locations.photo_url`)

2. **Retrieval Flow:**
   - App fetches URLs from database
   - Frontend displays images directly from Supabase

3. **Frontend URLs:**
   - Already configured to use public Supabase URLs (not prepended with origin)
   - Format: `https://XXXX.supabase.co/storage/v1/object/public/imageStore/...`

### Storage Path Example

```
imageStore/
├── media/
│   ├── 1234567890_filename.jpg
│   ├── 1234567890_another.png
│   └── ...
└── (other locations)
```

## ✅ Verification Checklist

After migration, verify:

- [ ] Database connection working
- [ ] All tables present: `SELECT COUNT(*) FROM pg_tables WHERE schemaname='public';`
- [ ] User count: `SELECT COUNT(*) FROM users;`
- [ ] Location count: `SELECT COUNT(*) FROM locations;`
- [ ] Media count: `SELECT COUNT(*) FROM media;`
- [ ] Foreign keys intact: `SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type='FOREIGN KEY';`
- [ ] Server starts without errors
- [ ] Can view locations in UI
- [ ] Can upload new images
- [ ] Images display in media library

### Quick Verification Query

```bash
psql "your_supabase_db_url" --no-password -c "
SELECT 
  'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'locations', COUNT(*) FROM locations
UNION ALL
SELECT 'media', COUNT(*) FROM media
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'settings', COUNT(*) FROM settings;
"
```

## 🚨 Troubleshooting

### Connection Refused
- Check IP allowlist in Supabase settings
- Ensure `sslmode=require` is in connection string
- Verify credentials are correct

### Import Fails with Foreign Key Errors
- This usually means tables exist but are empty
- First drop all tables: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`
- Then try import again

### Permission Denied
- Ensure you're using the `postgres` user, not `postgres_role`
- Check that your Supabase password is correct

### Connection String Issues

**Render format:**
```
postgresql://postgres:PASSWORD@your-instance.postgres.render.com:5432/your_db?sslmode=require
```

**Supabase format:**
```
postgresql://postgres:PASSWORD@db.XXXX.supabase.co:5432/postgres?sslmode=require
```

Note: Supabase always uses `postgres` as database name.

## 📊 Database Schema

Your schema is compatible with both Render and Supabase:

### Tables
1. **users** - Authentication and user management
2. **locations** - Muffler Men locations with coordinates
3. **media** - Image library (URLs point to Supabase Storage)
4. **settings** - App configuration
5. **categories** - Location categories

### Key Features
- Text-based IDs (UUIDs, not integers)
- ISO date strings (platform independent)
- Foreign key constraints
- Default values using `CURRENT_TIMESTAMP`

## 🔐 Security Notes

1. **Never commit** `.env` files with database passwords
2. **Rotate credentials** after migration
3. **Enable backups** in Supabase settings
4. **Restrict IP** access in database settings

## 💾 Backup Your Data

Keep `db_backup.dump` safe:

```bash
# Move to safe location
cp db_backup.dump ~/backups/db_backup_$(date +%Y%m%d).dump

# Compress for storage
gzip ~/backups/db_backup_*.dump
```

To restore from backup later:

```bash
pg_restore "postgresql://..." \
  --format=custom \
  --no-password \
  db_backup.dump
```

## 📞 Support

If migrations fail:

1. Check PostgreSQL tools are installed: `pg_dump --version`
2. Test connection: `psql "connection_string" -c "SELECT 1"`
3. Check error messages carefully
4. Try manual steps instead of script

## 🎉 Next Steps

After successful migration:

1. ✅ Deploy updated `.env.local` to Render
2. ✅ Restart the Render service
3. ✅ Test the application in production
4. ✅ Monitor logs for any connection issues
5. ✅ Remove old Render database (optional)

---

**Migration completed!** Your database is now on Supabase with images stored in Supabase Storage. 🚀