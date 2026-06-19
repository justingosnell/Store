# ✅ Database Migration Checklist

Complete guide to migrate from Render PostgreSQL → Supabase PostgreSQL

## 📋 What You Have

I've created **4 helper documents and 2 scripts** for you:

### 📄 Documentation Files
- ✅ **QUICK_MIGRATION_REFERENCE.md** - Start here! 30-second quick guide
- ✅ **DATABASE_MIGRATION_SUPABASE.md** - Comprehensive guide with all details
- ✅ **IMAGE_STORAGE_SETUP.md** - How your Supabase Storage is configured
- ✅ **MIGRATION_CHECKLIST.md** - This file

### 🔧 Script Files
- ✅ **migrate-db.sh** - Automated migration (export + import)
- ✅ **verify-migration.sh** - Verify migration success

---

## 🎯 Quick Start (5 Minutes)

### 1. Open Terminal

```bash
cd /Users/macbook/joe-main
```

### 2. Get Connection Strings

**From Render:**
- Go to [render.com](https://render.com) → Your Service → Settings
- Find "Database" section
- Copy "External Database URL"
- Format: `postgresql://postgres:PASSWORD@your-instance.postgres.render.com:5432/postgres?sslmode=require`

**From Supabase:**
- Go to [supabase.com](https://supabase.com) → Your Project → Settings → Database
- Copy "Connection string" (Postgres tab)
- Format: `postgresql://postgres:PASSWORD@db.XXXX.supabase.co:5432/postgres?sslmode=require`

### 3. Set Environment Variables

```bash
export DATABASE_URL="PASTE_RENDER_CONNECTION_STRING_HERE"
export SUPABASE_DB_URL="PASTE_SUPABASE_CONNECTION_STRING_HERE"
```

**Verify:**
```bash
echo $DATABASE_URL
echo $SUPABASE_DB_URL
```

### 4. Run Migration

```bash
./migrate-db.sh
```

Expected output:
```
╔═══════════════════════════════════════════════════════════╗
║     Database Migration: Render PostgreSQL → Supabase      ║
╚═══════════════════════════════════════════════════════════╝

📦 Step 1: Exporting data from Render PostgreSQL...
✅ Export successful! Created db_backup.dump

📥 Step 2: Importing data to Supabase PostgreSQL...
✅ Import successful!

✨ Migration complete!
```

### 5. Verify Success

```bash
./verify-migration.sh
```

Expected output:
```
╔═════════════════════════════════════════════════════════╗
║     Verifying Supabase Database Migration               ║
╚═════════════════════════════════════════════════════════╝

📋 Checking tables...
users
locations
media
settings
categories

📊 Row counts by table:
  users:           X rows
  locations:       X rows
  media:           X rows
  settings:        X rows
  categories:      X rows
```

### 6. Update App Configuration

**Edit** `/Users/macbook/joe-main/.env.local`:

```env
# CHANGE THIS LINE:
DATABASE_URL=postgresql://postgres:PASSWORD@db.XXXX.supabase.co:5432/postgres?sslmode=require

# KEEP THESE (already correct):
SUPABASE_URL=https://XXXX.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_BUCKET=imageStore
```

### 7. Restart Server

```bash
npm run dev
# or
./start-server.sh
```

### 8. Test in Browser

1. Open http://localhost:3000
2. Try viewing locations
3. Try uploading an image
4. Check media library

**If everything works → Migration successful! 🎉**

---

## 📊 What Gets Migrated

### ✅ All Your Data

| Table | What's Inside |
|-------|---|
| **users** | User accounts for authentication |
| **locations** | All your Muffler Men locations with coordinates |
| **media** | Image library with metadata |
| **settings** | App configuration |
| **categories** | Location categories |

### ✅ All Your Images

- All image URLs from database are preserved
- All images in Supabase Storage are preserved
- Images display exactly as before

---

## 🔍 Detailed Steps (If Script Fails)

### Manual Step 1: Test Connections

```bash
# Test Render connection
psql "$DATABASE_URL" --no-password -c "SELECT COUNT(*) FROM locations;"

# Test Supabase connection
psql "$SUPABASE_DB_URL" --no-password -c "SELECT 1;"
```

### Manual Step 2: Export Data

```bash
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-password \
  --verbose \
  --file=db_backup.dump
```

This creates `db_backup.dump` file containing all your data.

### Manual Step 3: Import Data

```bash
pg_restore "$SUPABASE_DB_URL" \
  --format=custom \
  --no-password \
  --verbose \
  db_backup.dump
```

### Manual Step 4: Verify

```bash
psql "$SUPABASE_DB_URL" --no-password -c "
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

---

## 🚨 Troubleshooting

### ❌ "psql: command not found"

**Solution:** Install PostgreSQL client tools

```bash
# macOS
brew install postgresql

# Verify
pg_dump --version
```

### ❌ "connection refused"

**Solutions:**
1. Check you're using correct connection string
2. Add your IP to Supabase allowlist:
   - Supabase Dashboard → Settings → Database → Connection pooling
   - Add your IP address
3. Use `sslmode=require` in connection string

### ❌ "password authentication failed"

**Solutions:**
1. Verify password in connection string is correct
2. Check for special characters - may need URL encoding
3. Test password works: `psql "postgresql://user:password@host:5432/db"`

### ❌ "database does not exist"

**Solution:** Supabase always uses `postgres` as database name

Correct:
```
postgresql://postgres:PASSWORD@db.XXXX.supabase.co:5432/postgres
```

### ❌ Migration starts but fails halfway

**Solutions:**
1. Drop existing tables (if any):
   ```bash
   psql "$SUPABASE_DB_URL" --no-password -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
   ```
2. Try migration again

### ❌ Images showing as 404 after migration

**Solution:** Already fixed! Your frontend is using correct direct Supabase URLs.

Just verify by checking:
```bash
# Check one image URL in database
psql "$SUPABASE_DB_URL" --no-password -c "SELECT url FROM media LIMIT 1;"
```

Should return complete URL like:
```
https://fpaxndekwubupxlubvxj.supabase.co/storage/v1/object/public/imageStore/...
```

---

## ✅ Pre-Migration Checklist

Before you start:

- [ ] PostgreSQL client tools installed: `pg_dump --version`
- [ ] Connection strings ready (Render + Supabase)
- [ ] Backed up your Render database (optional but recommended)
- [ ] Your Supabase project is created
- [ ] You have admin access to both databases
- [ ] Internet connection is stable
- [ ] You have ~30 minutes for this process

## ✅ Post-Migration Checklist

After migration:

- [ ] All tables visible in Supabase
- [ ] Row counts match expectations
- [ ] `.env.local` updated with Supabase DATABASE_URL
- [ ] Server starts without database connection errors
- [ ] Can view existing locations in UI
- [ ] Can upload new images
- [ ] Images display in media library
- [ ] Can edit existing locations
- [ ] Can create new locations with images

## 🚀 Deployment

After testing locally:

### For Render Service

1. **Update environment variables** in Render:
   - Settings → Environment
   - Update `DATABASE_URL` to Supabase connection string

2. **Restart service:**
   - Manual Deploy

3. **Verify in production:**
   - Visit your Render URL
   - Test functionality

### Alternative: Use Supabase as Backend Too

Currently your backend is on Render and database is on Supabase. You could also:
- Deploy backend to Render with Supabase database (✅ Recommended)
- Deploy everything to Supabase Edge Functions (alternative)

Recommended: **Keep backend on Render, database on Supabase** (what you have now is good!)

---

## 📈 After Migration: Optimization

### 1. Enable Backups in Supabase

1. Go to Supabase Dashboard → Settings → Backups
2. Enable automated daily backups

### 2. Set Up Monitoring

1. Monitor database size: Supabase Dashboard → Database
2. Monitor storage usage: Supabase Dashboard → Storage

### 3. Optional: Remove Old Render Database

1. Go to Render → Service → Remove database
2. (Keep for 30 days if you want safety net)

### 4. Update Documentation

Update any internal docs that reference Render database URL.

---

## 📞 Quick Reference Commands

```bash
# Check if PostgreSQL tools are installed
pg_dump --version
psql --version

# Test Render connection
psql "$DATABASE_URL" --no-password -c "SELECT COUNT(*) FROM locations;"

# Export (step 1)
pg_dump "$DATABASE_URL" --format=custom --no-password --file=db_backup.dump

# Import (step 2)
pg_restore "$SUPABASE_DB_URL" --format=custom --no-password db_backup.dump

# Verify migration
psql "$SUPABASE_DB_URL" --no-password -c "SELECT COUNT(*) FROM locations;"

# Restart Node server
npm run dev

# Check environment variables
echo $DATABASE_URL
echo $SUPABASE_DB_URL
```

---

## 📚 Documentation Structure

```
Your Project Root
├── QUICK_MIGRATION_REFERENCE.md    ← START HERE (quick version)
├── DATABASE_MIGRATION_SUPABASE.md   ← Full comprehensive guide
├── IMAGE_STORAGE_SETUP.md           ← How images are stored
├── MIGRATION_CHECKLIST.md           ← This file
├── migrate-db.sh                    ← Run this script
├── verify-migration.sh              ← Run this to verify
└── .env.local                       ← Edit this file
```

---

## 🎯 Success Looks Like

After successful migration:

✅ Database on Supabase (not Render)  
✅ All locations visible in app  
✅ All images displaying correctly  
✅ Can upload new images  
✅ App runs without database errors  
✅ Backup of Render database saved  

---

## 🎉 You're Done!

Your database is now on Supabase, images are stored in Supabase Storage, and URLs are stored in the database.

**Next steps:**
1. Run `./migrate-db.sh`
2. Test locally
3. Update Render environment variable
4. Redeploy to Render

Any questions? Check the detailed guides:
- **QUICK_MIGRATION_REFERENCE.md** (quick)
- **DATABASE_MIGRATION_SUPABASE.md** (detailed)
- **IMAGE_STORAGE_SETUP.md** (images)

Good luck! 🚀