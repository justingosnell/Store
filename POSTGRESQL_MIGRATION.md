# PostgreSQL Migration: Render → Supabase

This guide walks you through migrating your PostgreSQL database from Render to Supabase while preserving all your data.

## Phase 1: Backup Your Current Data from Render

### Step 1: Export your data from Render PostgreSQL
```bash
npx tsx export-data.ts
```

This creates `data-export.json` with all your:
- ✅ Locations
- ✅ Users
- ✅ Media files
- ✅ Categories
- ✅ Settings

### Verify the export
```bash
ls -lh data-export.json
cat data-export.json | head -20  # Check the structure
```

---

## Phase 2: Set Up PostgreSQL on Supabase

### Step 1: Create a Supabase account
1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in with GitHub/email

### Step 2: Create a new Supabase project
1. Click "New project" in the dashboard
2. Name it: `joe-locations` (or similar)
3. Create a strong database password (save it!)
4. Select your region
5. Click "Create new project" (this takes ~2 minutes)

### Step 3: Get your database connection string
1. In Supabase dashboard, go to **Settings** → **Database**
2. Under "Connection pooling" or "Connection string", copy the PostgreSQL connection URL
3. It should look like: `postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres`
4. Keep this safe - you'll need it

---

## Phase 3: Set Up New Database Schema on Supabase

### Step 1: Create tables in Supabase (using Drizzle)
Set the DATABASE_URL to your new Supabase connection string temporarily:

```bash
export DATABASE_URL="postgresql://postgres:your_password@db.xxxxx.supabase.co:5432/postgres"
npx drizzle-kit push
```

This creates all the required tables in your Supabase database.

### Step 2: Verify tables were created
In Supabase dashboard → **SQL Editor**, you should see:
- ✅ locations
- ✅ users
- ✅ media
- ✅ categories
- ✅ settings
- ✅ Any other tables from your schema

---

## Phase 4: Import Your Data to Supabase

### Step 1: Import your data
Make sure DATABASE_URL still points to Supabase:

```bash
export DATABASE_URL="postgresql://postgres:your_password@db.xxxxx.supabase.co:5432/postgres"
npx tsx import-data.ts
```

You should see:
```
✅ Imported X categories
✅ Imported X users
✅ Imported X locations
✅ Imported X media files
✅ Imported X settings
✅ Data import completed successfully!
```

### Step 2: Verify data in Supabase
Go to Supabase dashboard → **Table Editor** and check:
- Locations table has all your data
- Photos are referenced correctly
- Categories are populated

---

## Phase 5: Update Your Application Configuration

### Step 1: Update environment variables

**For local development:**
```bash
# Update your .env file or export
export DATABASE_URL="postgresql://postgres:your_password@db.xxxxx.supabase.co:5432/postgres"
```

**For Render deployment:**
1. Go to Render dashboard
2. Find your Joe application service
3. Go to **Environment** tab
4. Update the `DATABASE_URL` variable:
   - Old value: Your Render PostgreSQL URL
   - New value: Your Supabase PostgreSQL URL
5. Save changes

### Step 2: Test locally
```bash
npm run dev
```

Verify:
- App starts without connection errors
- All locations appear on the map
- Can view location details
- Photos load correctly

### Step 3: Deploy to Render
```bash
git add -A
git commit -m "feat: migrate database from Render to Supabase"
git push origin main
```

The app will automatically redeploy with the new DATABASE_URL.

---

## Phase 6: Verification Checklist

After deployment, verify everything works:

- [ ] App loads without errors
- [ ] All locations appear on the map
- [ ] Can view location details
- [ ] All photos display correctly
- [ ] Can see all categories
- [ ] Can still login (if you have user accounts)
- [ ] All settings are preserved
- [ ] Check Render logs for any database errors

---

## Troubleshooting

### "Connection refused" errors
- Verify DATABASE_URL is correct (copy-paste from Supabase)
- Check that you can connect from your local machine:
  ```bash
  psql "postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres"
  ```
- If it's a network issue, check Supabase network settings

### "relations do not exist" errors
Tables haven't been created yet. Run:
```bash
export DATABASE_URL="your-supabase-url"
npx drizzle-kit push
```

### Data didn't import
- Check that drizzle-kit push completed successfully
- Verify DATABASE_URL is set before running import
- Look for error messages in the import output
- Check Supabase table editor to see if tables are empty

### Old Render database still being used
- Double-check the DATABASE_URL environment variable in Render dashboard
- Restart the app manually in Render
- Verify the URL has no typos

### Supabase connection timeouts in production
- Make sure you're using the correct connection pooling URL
- Check Supabase project status (sometimes services restart)
- Verify network connectivity between Render and Supabase

---

## Database Connection Best Practices for Supabase

### Use Connection Pooling (Recommended)
Supabase provides a pooled connection mode that's better for serverless apps:
1. In Supabase **Settings** → **Database** → **Connection pooling**
2. Use this URL instead of the direct PostgreSQL URL
3. It prevents connection exhaustion

### Connection String Format
- **Direct**: `postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres`
- **Pooling**: `postgresql://postgres:password@db.xxxxx.supabase.co:6543/postgres` (port 6543)

---

## Keeping Render Database as Backup

You can keep your Render PostgreSQL running as a backup:
- Don't delete the Render PostgreSQL service immediately
- Wait 24-48 hours to confirm Supabase is working perfectly
- Once confident, you can delete the Render database to save costs

---

## Next Steps After Successful Migration

1. ✅ Test all app features thoroughly
2. ✅ Monitor Render logs for any database errors
3. ✅ Check Supabase monitoring dashboard for performance
4. ✅ Delete Render PostgreSQL service (optional, to save costs)
5. ✅ Update any documentation that references database location
6. ✅ Consider setting up backups in Supabase dashboard

---

## Support Resources

- [Supabase PostgreSQL Documentation](https://supabase.com/docs/guides/database)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooling)
- [Supabase Backups](https://supabase.com/docs/guides/platform/backups)