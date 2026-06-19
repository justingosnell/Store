# Render IPv4 Connection Fix - Complete Implementation

## Problem Summary

Render deployments were failing with IPv6 connection errors:
```
Error: connect ENETUNREACH 2600:1f16:1cd0:3321:ff20:65ca:25eb:8b5a:5432
```

Additionally, after sporadic successful deployments, login attempts failed with:
```
PostgresError: column "role" does not exist
```

This indicated two issues:
1. **IPv6 Connection Error**: The postgres-js client was attempting IPv6 connections which Render's network doesn't support
2. **Schema Issue**: The "role" column migration (0003) wasn't being reliably applied to the production database

## Root Cause

When a hostname like `db.supabase.co` is passed to postgres-js, Node.js DNS resolution may return both IPv4 and IPv6 addresses. The postgres-js client was attempting IPv6 connections first, which failed on Render's network infrastructure.

**Previous incorrect approach**: Using `socket: { family: 4 }` configuration option - this option does NOT actually work with postgres-js.

**Correct approach**: Pre-resolve the hostname to an IPv4 address BEFORE passing it to the postgres client. This completely bypasses IPv6 resolution attempts.

## Implementation Details

### 1. New File: `server/ipv4-resolver.ts`

Created a robust DNS resolution utility that:
- Pre-resolves hostnames to IPv4 addresses before database connections
- Implements retry logic with exponential backoff (1s, 2s, 4s)
- Uses multiple DNS resolution methods in fallback order:
  1. `dns.lookup()` with `family: 4`
  2. `dns.resolve4()`
  3. `dns.resolve()` with IPv4 filtering
- Includes 5-second timeout for each DNS method
- Returns IPv4 address in database URL format

**Key exports:**
- `resolveHostnameToIPv4(hostname)` - Resolves a single hostname
- `resolveDatabase()` - Resolves DATABASE_URL and returns updated URL with IPv4

### 2. Updated: `server/migrate.ts`

Enhanced with:
- Explicit calls to `resolveDatabase()` to get IPv4-resolved URL
- Connection timeout configuration (10 seconds)
- Comprehensive error logging at each stage
- Process-level timeout protection (60 seconds)
- Proper error handling and connection cleanup
- Better visibility into what's happening during migrations

**Key changes:**
```typescript
// Before: Direct connection with hostname
const sql = postgres(databaseUrl, { ssl: "require" });

// After: Pre-resolved IPv4 connection
const resolvedUrl = await resolveDatabase();
const sql = postgres(resolvedUrl, { 
  ssl: { rejectUnauthorized: false },
  connect_timeout: 10000,
});
```

### 3. Updated: `server/db.ts`

Changes:
- `initializeDatabase()` now calls `resolveDatabase()` before creating connection
- Connection uses resolved IPv4 address
- Maintains backward compatibility through Proxy-based `db` export
- Removed invalid `socket: { family: 4 }` configuration

### 4. Updated: `server/routes.ts`

Changes:
- Calls `initializeDatabase()` first to establish IPv4-resolved connection
- Then calls `runMigrations()` to ensure schema is current
- Added logging for initialization progress

### 5. Updated: `migrate-images-to-supabase.ts`

Changes:
- Imports `resolveDatabase` from `server/ipv4-resolver`
- Uses resolved IPv4 URL for database connections
- Added connection timeout (10 seconds)
- Improved error handling with proper connection cleanup

### 6. Updated: `resolve-and-start.ts`

Changes:
- Removed invalid `socket: { family: 4 }` configuration from applySchemaFix()
- Added connection timeout configuration
- Properly uses the resolved IPv4 URLs

### 7. Updated: `render.yaml`

Changes:
- Added `NODE_OPTIONS=--dns-result-order=ipv4first` to startCommand
- Ensures Node.js DNS preferences IPv4 at the system level
- StartCommand now: `NODE_OPTIONS=--dns-result-order=ipv4first npx tsx resolve-and-start.ts`

## How It Works

1. **On Render Deployment:**
   - Build phase: `npm install && npm run build`
   - Start phase: `NODE_OPTIONS=--dns-result-order=ipv4first npx tsx resolve-and-start.ts`

2. **resolve-and-start.ts execution:**
   - Extracts hostname from DATABASE_URL
   - Attempts to resolve to IPv4 with retries
   - Updates DATABASE_URL environment variable with IPv4 address
   - Applies schema fixes if needed
   - Spawns `npm start` with IPv4 DNS preference

3. **npm start execution:**
   - Runs with `NODE_OPTIONS=--dns-result-order=ipv4first`
   - Loads built application from `dist/`
   - Application startup calls `registerRoutes()`

4. **registerRoutes() execution:**
   - Calls `initializeDatabase()`
   - `initializeDatabase()` calls `resolveDatabase()` again
   - Creates postgres connection with IPv4 address
   - Runs migrations to ensure schema is current
   - Starts express server

## Migration Schema Notes

The production database should have these migrations applied:
- `0000_curious_warstar.sql` - Initial schema (users, locations, media, settings, categories)
- `0001_add_description.sql` - Adds description column
- `0002_add_missing_media_fields.sql` - Adds media fields
- `0003_add_user_security_fields.sql` - **CRITICAL**: Adds "role" column and other security fields

If migrations have not run:
- Migrations are automatically run on app startup in `registerRoutes()`
- Or can be manually run with: `npx tsx server/migrate.ts`

## Deployment Steps

1. **Push code changes:**
   ```bash
   git add .
   git commit -m "Fix: IPv4-only connections for Render deployment"
   git push
   ```

2. **Verify render.yaml is deployed:**
   - Check Render dashboard that startCommand shows IPv4 options
   - If UI shows different command, update it to match:
   ```
   NODE_OPTIONS=--dns-result-order=ipv4first npx tsx resolve-and-start.ts
   ```

3. **Trigger deployment:**
   - Render should automatically deploy on push
   - Or manually trigger from Render dashboard

4. **Monitor logs:**
   - Look for "✅ Database URL resolved successfully" 
   - Look for "✅ Migrations completed successfully"
   - Look for "serving on port"

## Troubleshooting

### Still getting ENETUNREACH errors?

1. Check that renderYAML startCommand is correct
2. Verify Render hasn't overridden it in the UI
3. Check DATABASE_URL environment variable is set
4. Look for DNS resolution errors in logs before ENETUNREACH

### Login failing with "column role does not exist"?

1. This means migration 0003 didn't run
2. Check migration logs - should show "✅ Migrations completed successfully"
3. If migrations appear to run but role column is still missing:
   - The production database might have a different __drizzle_migrations table
   - May need to manually apply migration 0003:
   ```sql
   ALTER TABLE "users" ADD COLUMN "role" text NOT NULL DEFAULT 'manager';
   ALTER TABLE "users" ADD COLUMN "is_locked" text NOT NULL DEFAULT 'false';
   ALTER TABLE "users" ADD COLUMN "failed_login_attempts" text NOT NULL DEFAULT '0';
   ALTER TABLE "users" ADD COLUMN "last_failed_login" text;
   ALTER TABLE "users" ADD COLUMN "last_password_change" text NOT NULL DEFAULT CURRENT_TIMESTAMP;
   ALTER TABLE "users" ADD COLUMN "must_change_password" text NOT NULL DEFAULT 'false';
   ALTER TABLE "users" ADD COLUMN "created_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP;
   ```

### Connection timeout errors?

1. Verify DATABASE_URL is correct and the host is reachable
2. Check network connectivity from Render to database
3. Increase timeout values if database is slow:
   - In `server/migrate.ts`: change `connect_timeout: 10000` to higher value
   - In `server/ipv4-resolver.ts`: change `5000` timeout to higher value

## Files Modified

- `server/ipv4-resolver.ts` - **NEW** - IPv4 resolution utility
- `server/db.ts` - Initialize with IPv4 resolution
- `server/migrate.ts` - Enhanced error handling and IPv4 resolution
- `server/routes.ts` - Call database initialization first
- `migrate-images-to-supabase.ts` - Use IPv4 resolution
- `resolve-and-start.ts` - Remove invalid socket config
- `render.yaml` - Update startCommand with IPv4 options

## Testing Locally

To test the IPv4 resolution logic locally:

```bash
# Set a test DATABASE_URL
export DATABASE_URL="postgresql://user:password@host.supabase.co:5432/db"

# Run migrations with IPv4 resolution
npx tsx server/migrate.ts

# Run the full startup process
NODE_OPTIONS=--dns-result-order=ipv4first npx tsx resolve-and-start.ts
```

## Technical Details

### Why pre-resolution works:

1. When postgres-js receives a string hostname, it passes it to Node.js DNS resolution
2. DNS can return multiple addresses (both IPv4 and IPv6)
3. postgres-js may attempt IPv6 first
4. By pre-resolving to IPv4 before passing to postgres-js, we ensure only IPv4 is ever attempted

### Why socket configuration doesn't work:

- The `socket: { family: 4 }` option is for Node.js raw sockets
- postgres-js does its own socket management
- The option has no effect on postgres-js DNS resolution behavior

### DNS Resolution Fallback Chain:

1. `dns.lookup()` - Uses OS resolver, best for system-level DNS preferences
2. `dns.resolve4()` - Direct DNS query for A records
3. `dns.resolve()` - Generic resolver, filtered to IPv4

This multi-method approach ensures resolution works across different network environments.

### Timeout Protection:

- Each DNS method has a 5-second timeout
- Retries with exponential backoff: 1s, 2s, 4s
- Total maximum time for full resolution: ~20 seconds
- Entire migration process has 60-second timeout
- Prevents indefinite hangs from network issues

## Success Indicators

After deployment, you should see in the logs:

```
🔌 Resolving database connection...
🔍 Resolving db.supabase.co to IPv4...
✅ Resolved to IPv4 via dns.resolve4: 192.0.2.123
✅ Database URL resolved successfully

🔌 Creating database connection...
✅ Database connection created

📝 Running migrations...
{...NOTICE messages about migrations...}
✅ Migrations completed successfully

10:16:52 PM [express] serving on port 10000
```

Then you should be able to:
- Access the application
- Perform login without "column role does not exist" errors
- Use all database functionality without IPv6 connection errors