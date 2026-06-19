# Render IPv4 Fix - Deployment Checklist

## Pre-Deployment Verification

- [ ] **Code Review**
  - [ ] `server/ipv4-resolver.ts` created with timeout handling
  - [ ] `server/db.ts` uses `initializeDatabase()` with IPv4 resolution
  - [ ] `server/migrate.ts` calls `resolveDatabase()` before connecting
  - [ ] `server/routes.ts` calls `initializeDatabase()` first
  - [ ] `resolve-and-start.ts` has no `socket: { family: 4 }` config
  - [ ] `render.yaml` has IPv4 DNS option in startCommand

- [ ] **Test Locally**
  ```bash
  npm run build          # Should complete without errors
  npm run check          # TypeScript check passes
  npm start              # Starts without connection errors
  ```

- [ ] **Verify Environment**
  - [ ] DATABASE_URL is set with correct credentials
  - [ ] Database is accessible from local environment
  - [ ] Port 10000 (or configured port) is available

## Deployment Steps

### Step 1: Commit and Push Changes
```bash
git status                  # Review all changed files
git add .
git commit -m "Fix: Implement IPv4-only database connections for Render deployment"
git push
```

**Files being committed:**
- `server/ipv4-resolver.ts` (NEW)
- `server/db.ts` (MODIFIED)
- `server/migrate.ts` (MODIFIED)
- `server/routes.ts` (MODIFIED)
- `migrate-images-to-supabase.ts` (MODIFIED)
- `resolve-and-start.ts` (MODIFIED)
- `render.yaml` (MODIFIED)
- `RENDER_IPV4_FIX.md` (NEW - documentation)
- `DEPLOYMENT_FIX_SUMMARY.md` (NEW - documentation)
- `DEPLOYMENT_CHECKLIST.md` (NEW - this file)

### Step 2: Verify Render Configuration
1. Log into Render dashboard: https://render.com
2. Navigate to your service: **roadsidemap**
3. Go to **Settings** tab
4. Scroll to **Start Command** section
5. Verify it shows:
   ```
   NODE_OPTIONS=--dns-result-order=ipv4first npx tsx resolve-and-start.ts
   ```
6. If it shows something different (like `npx tsx server/migrate.ts && npm run merge-data && npm start`):
   - Click **Edit** next to the command
   - Replace with: `NODE_OPTIONS=--dns-result-order=ipv4first npx tsx resolve-and-start.ts`
   - Click **Save**

### Step 3: Trigger Deployment
**Option A: Automatic (Recommended)**
- Render will automatically detect the push and start deploying
- Check **Deployments** tab to monitor progress

**Option B: Manual**
- Click **Manual Deploy** button in Render dashboard
- Select **Deploy latest commit**

## Post-Deployment Verification

### Monitor Deployment Logs

In Render Dashboard → **Logs** tab:

**Look for these SUCCESS indicators:**
```
🔌 Resolving database connection...
🔍 Resolving db.supabase.co to IPv4...
✅ Resolved to IPv4 via dns.resolve4: [IP_ADDRESS]
✅ Database URL resolved successfully

📝 Running migrations...
✅ Migrations completed successfully

[express] serving on port 10000
```

**If you see these ERRORS, deployment failed:**
```
Error: connect ENETUNREACH 2600:1f16:1cd0:3321:ff20:65ca:25eb:8b5a:5432
❌ Migration failed
❌ Failed to resolve database URL
```

### Test Application Functionality

1. **Check Application Loads**
   - Visit: `https://your-render-url.com`
   - Should load without errors

2. **Test Login**
   - Enter credentials
   - Should NOT see: "column role does not exist"
   - Should successfully authenticate

3. **Test Database Operations**
   - View locations list
   - Create/edit a location
   - Should work without connection errors

4. **Check for IPv6 Attempts**
   - Look at Render logs
   - Should NOT see any ENETUNREACH errors
   - Should see successful IPv4 connections

## Troubleshooting

### Issue: Deployment Fails with ENETUNREACH Error

**Cause:** IPv4 resolver is not being used

**Solution:**
1. Check Render startCommand in dashboard
2. Verify it includes: `NODE_OPTIONS=--dns-result-order=ipv4first npx tsx resolve-and-start.ts`
3. If not, manually update it in Render UI Settings
4. Restart deployment

### Issue: Login Fails with "column role does not exist"

**Cause:** Migration 0003 didn't run

**Solution - Option 1: Check Logs**
- Look for "✅ Migrations completed successfully"
- If missing, migrations didn't run properly

**Solution - Option 2: Manually Apply Migration**
1. Connect to database with psql or query tool
2. Run these commands:
```sql
ALTER TABLE "users" ADD COLUMN "role" text NOT NULL DEFAULT 'manager';
ALTER TABLE "users" ADD COLUMN "is_locked" text NOT NULL DEFAULT 'false';
ALTER TABLE "users" ADD COLUMN "failed_login_attempts" text NOT NULL DEFAULT '0';
ALTER TABLE "users" ADD COLUMN "last_failed_login" text;
ALTER TABLE "users" ADD COLUMN "last_password_change" text NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "users" ADD COLUMN "must_change_password" text NOT NULL DEFAULT 'false';
ALTER TABLE "users" ADD COLUMN "created_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP;
```
3. Restart application

**Solution - Option 3: Clear and Redeploy**
1. In Render dashboard, click **Environment**
2. Add/update variable: `FORCE_MIGRATE=true`
3. Click **Manual Deploy** → **Deploy latest commit**
4. This forces fresh migrations
5. Remove `FORCE_MIGRATE` variable after successful deployment

### Issue: Connection Timeout

**Cause:** Database taking too long to respond

**Solution:**
1. Increase connection timeout in `server/migrate.ts`:
   ```typescript
   connect_timeout: 20000  // Change from 10000 to 20000
   ```
2. Increase DNS timeout in `server/ipv4-resolver.ts`:
   ```typescript
   5000  // Change timeout value to 10000
   ```
3. Redeploy

### Issue: DNS Resolution Fails

**Cause:** DNS queries not working in Render environment

**Symptoms:**
- Logs show: "dns.lookup() failed"
- Logs show: "dns.resolve4() failed"
- Logs show: "dns.resolve() failed"

**Solution:**
1. Check DATABASE_URL is valid
2. Try manual DNS lookup:
   ```bash
   nslookup db.supabase.co
   ```
3. Verify database host is reachable from Render
4. Contact database provider support if DNS is unresponsive

## Rollback Plan

If deployment causes issues:

1. **Quick Rollback:**
   ```bash
   git revert HEAD
   git push
   # Render will redeploy with previous code
   ```

2. **Manual Render Rollback:**
   - In Render dashboard
   - Go to **Deployments**
   - Find the previous successful deployment
   - Click **Redeploy**

## Success Criteria

Your deployment is **SUCCESSFUL** when:

✅ Application loads in browser  
✅ Logs show "✅ Database URL resolved successfully"  
✅ Logs show "✅ Migrations completed successfully"  
✅ Logs show "[express] serving on port"  
✅ Login works without errors  
✅ Database queries work normally  
✅ No ENETUNREACH errors in logs  
✅ No "column role does not exist" errors  

## Post-Deployment Monitoring

- [ ] Watch logs for first 5 minutes
- [ ] Test application functionality
- [ ] Check for any error patterns
- [ ] Monitor database connections
- [ ] Verify login system works
- [ ] Test file uploads/downloads
- [ ] Check location editing

## Documentation References

For more details, see:
- `RENDER_IPV4_FIX.md` - Technical details of the fix
- `DEPLOYMENT_FIX_SUMMARY.md` - Summary of all changes
- `render.yaml` - Render configuration

## Questions or Issues?

1. Check logs in Render dashboard
2. Review troubleshooting section above
3. Refer to technical documentation in RENDER_IPV4_FIX.md
4. Check database connectivity and credentials

---

**Deployment Date:** _____________  
**Status:** ☐ Success ☐ Pending ☐ Failed  
**Notes:** ____________________________________________