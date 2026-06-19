# 🔴 CRITICAL: Fixing Render 503 Error - IPv6 Database Connection Issue

## The Problem

Your app is crashing because:
1. **DATABASE_URL points to IPv6** - Using `db.*.supabase.co` resolves to IPv6 addresses
2. **Render only supports IPv4** - Can't reach IPv6 connections
3. **Postgres socket error** - Connection configuration conflict

## The Solution - 3 Steps

### Step 1: Get Supabase Supavisor Connection String

Supabase Supavisor uses IPv4 and is perfect for Render.

**In Supabase Dashboard:**
1. Go to your project → **Settings** → **Database**
2. In the left sidebar, click **Connection pooler**
3. You'll see a connection string like:
   ```
   postgresql://postgres:[YOUR_PASSWORD]@pooler.supabase.com:6543/postgres
   ```
4. Copy this entire string
5. **Add `?sslmode=require` to the end**:
   ```
   postgresql://postgres:[YOUR_PASSWORD]@pooler.supabase.com:6543/postgres?sslmode=require
   ```

### Step 2: Update Render Environment Variable

**In Render Dashboard:**
1. Go to your service (joeyb)
2. Click **Environment** (sidebar)
3. Find `DATABASE_URL` 
4. Replace it with your Supabase Supavisor connection string from Step 1
5. Click **Save Changes**

### Step 3: Redeploy

1. Go to **Deployments**
2. Click the **three dots** on the latest failed deployment
3. Click **Redeploy**

Or push to git if you have auto-deploy enabled.

---

## ✅ What Should Happen

After redeploy, you should see in logs:
```
✅ Database initialized
✅ Migrations completed successfully
serving on port 3000
```

NOT:
```
❌ connect ENETUNREACH 2600:1f16:1cd0:3321:ff20:65ca:25eb:8b5a:5432
```

---

## Troubleshooting

**Still failing?**

1. **Check password encoding**: Special characters like `@`, `$`, `%` must be URL-encoded
   - `@` → `%40`
   - `$` → `%24`
   - `%` → `%25`

2. **Verify Supabase credentials in Render**:
   - Go to **Environment** on Render
   - Make sure `SUPABASE_URL` and `SUPABASE_KEY` are also set correctly

3. **Check logs**:
   - Click **Logs** to see real-time errors
   - Look for `Migration failed:` messages

4. **Manual test**:
   - Try connecting locally with the same connection string to verify it works

---

## Key Differences

| Connection Type | Host | Port | IPv6 | Render Support |
|---|---|---|---|---|
| Direct | `db.*.supabase.co` | 5432 | ✅ Yes | ❌ No |
| **Supavisor (Pooler)** | **`pooler.supabase.com`** | **6543** | ❌ No | ✅ **Yes** |

---

**Your app is now configured to use Supabase Supavisor. You just need to update the DATABASE_URL on Render.**