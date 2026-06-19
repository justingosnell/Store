# 🚀 Quick Migration Reference

## 30-Second Setup

```bash
# 1. Get your connection strings and set them
export DATABASE_URL="postgresql://postgres:PASSWORD@render-host:5432/db?sslmode=require"
export SUPABASE_DB_URL="postgresql://postgres:PASSWORD@db.XXXX.supabase.co:5432/postgres?sslmode=require"

# 2. Run migration
cd /Users/macbook/joe-main
./migrate-db.sh

# 3. Verify
./verify-migration.sh
```

## Step-by-Step Guide

### 1️⃣ Get Connection Strings

**From Render:**
1. Go to [render.com](https://render.com) → Your Service
2. Settings → Info → Database (click to reveal)
3. Copy "External Database URL"
4. Format: `postgresql://postgres:PASSWORD@your-instance.postgres.render.com:5432/postgres?sslmode=require`

**From Supabase:**
1. Go to [supabase.com](https://supabase.com) → Your Project
2. Settings → Database → Connection string
3. Select "Postgres" tab
4. Format: `postgresql://postgres:PASSWORD@db.XXXX.supabase.co:5432/postgres?sslmode=require`

### 2️⃣ Prepare Environment

```bash
# Copy and paste your actual credentials
export DATABASE_URL="PASTE_RENDER_URL_HERE"
export SUPABASE_DB_URL="PASTE_SUPABASE_URL_HERE"

# Verify they're set
echo $DATABASE_URL
echo $SUPABASE_DB_URL
```

### 3️⃣ Run Automated Migration

```bash
cd /Users/macbook/joe-main
./migrate-db.sh
```

**What it does:**
- Exports data from Render to `db_backup.dump`
- Imports data into Supabase
- Shows detailed progress

### 4️⃣ Verify Success

```bash
./verify-migration.sh
```

**What to expect:**
```
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

### 5️⃣ Update Your App

**Edit `.env.local`:**
```env
# Replace OLD Render URL with NEW Supabase URL
DATABASE_URL=postgresql://postgres:PASSWORD@db.XXXX.supabase.co:5432/postgres?sslmode=require
```

**Restart server:**
```bash
npm run dev
# or
./start-server.sh
```

## Manual Commands (If Script Fails)

### Export from Render
```bash
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-password \
  --file=db_backup.dump \
  --verbose
```

### Import to Supabase
```bash
pg_restore "$SUPABASE_DB_URL" \
  --format=custom \
  --no-password \
  --verbose \
  db_backup.dump
```

### Quick Test
```bash
# Test Render connection
psql "$DATABASE_URL" --no-password -c "SELECT COUNT(*) as total_tables FROM information_schema.tables WHERE table_schema='public';"

# Test Supabase connection
psql "$SUPABASE_DB_URL" --no-password -c "SELECT COUNT(*) as total_tables FROM information_schema.tables WHERE table_schema='public';"
```

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| `psql: command not found` | Install: `brew install postgresql` |
| `connection refused` | Add your IP to Supabase IP allowlist |
| `password authentication failed` | Check password in connection string |
| `database does not exist` | Supabase always uses `postgres` as db name |
| `permission denied` | Use `postgres` user, not `postgres_role` |
| `ERROR: relation already exists` | Tables exist but are empty - try manual drop and reimport |

## File Locations

- **Migration script:** `/Users/macbook/joe-main/migrate-db.sh`
- **Verification script:** `/Users/macbook/joe-main/verify-migration.sh`
- **Full guide:** `/Users/macbook/joe-main/DATABASE_MIGRATION_SUPABASE.md`
- **Database config:** `/Users/macbook/joe-main/drizzle.config.ts`
- **App env:** `/Users/macbook/joe-main/.env.local`

## Backup Your Data

```bash
# Keep a copy of the backup
cp db_backup.dump ~/backups/db_backup_$(date +%Y%m%d_%H%M%S).dump

# Compress it
gzip ~/backups/db_backup_*.dump
```

## Double-Check Checklist

- [ ] PostgreSQL client tools installed (`pg_dump --version`)
- [ ] Connection strings exported as environment variables
- [ ] No special characters in password (or password URL-encoded)
- [ ] Supabase project created and accessible
- [ ] IP allowlist configured in Supabase
- [ ] Migration script completed without errors
- [ ] Verification shows all tables present
- [ ] `.env.local` updated with Supabase URL
- [ ] Server restarted
- [ ] App loads without database errors

## 📊 What Gets Migrated

✅ **All Data:**
- Users
- Locations with coordinates
- Media library (URLs only - images already in Supabase Storage)
- Settings
- Categories

✅ **Schema:**
- Table structure
- Indexes
- Foreign key constraints
- Default values

✅ **Images:**
- Already in Supabase Storage
- URLs stored in database

## After Migration

```bash
# Deploy to production
cd /Users/macbook/joe-main

# 1. Update environment
cp .env.local .env.production  # or however you manage prod env

# 2. Redeploy server
# (depends on your deployment platform)

# 3. Test in production
# Try viewing locations, uploading images, etc.
```

---

**Need help?** Check `DATABASE_MIGRATION_SUPABASE.md` for detailed troubleshooting.