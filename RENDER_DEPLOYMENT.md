# Deploying RoadsideMapper to Render.com

## Step 1: Prepare Your GitHub Repository

If not done already:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/RoadsideMapper.git
git push -u origin main
```

## Step 2: Create a render.yaml Configuration File

Create a file named `render.yaml` in the root of your project:

```yaml
services:
  - type: web
    name: roadsidemap
    env: node
    plan: starter
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3000
    staticPublicPath: dist/public
```

## Step 3: Update Your Build Process

Your current setup is good! The `npm run build` script already:
- Builds React frontend with Vite → `dist/public`
- Bundles server with esbuild → `dist/index.js`
- Server automatically serves static files in production

## Step 4: Connect to Render

1. Go to [render.com](https://render.com) and sign up
2. Click **"New +"** → **"Web Service"**
3. Select **"Build and deploy from a Git repository"**
4. Connect your GitHub account and select `RoadsideMapper` repository
5. Fill in the settings:
   - **Name:** `roadsidemap` (or your preferred name)
   - **Environment:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Select desired tier (Starter = free)

6. Click **"Create Web Service"**

## Step 5: Environment Variables on Render

Go to your service dashboard → **Environment** tab and add:
- `NODE_ENV`: `production`
- Any other environment variables from your `.env` file

**Important:** Do NOT add sensitive keys to render.yaml - use the dashboard instead!

## Step 6: Deploy

1. Render will automatically deploy when you push to GitHub
2. Monitor the deployment in the **Logs** tab
3. Your app will be available at: `https://roadsidemap.onrender.com`

---

## ⚠️ Important Limitations (Current Setup)

### SQLite Database
- **Problem:** Render's storage is ephemeral (resets on redeployment)
- **Impact:** Your database will be lost when:
  - Render restarts your service
  - You redeploy
  - The free tier service spins down after 15 min inactivity

**Solutions:**
1. **Recommended:** Migrate to PostgreSQL (see below)
2. **Backup strategy:** Daily exports to GitHub
3. **Accept data loss:** Treat as temporary storage

### File Uploads
- **Problem:** Local files in `/uploads` will be deleted on redeployment
- **Recommended Solution:** Integrate Cloudinary or AWS S3

---

## Upgrading to PostgreSQL (Optional)

To avoid data loss, migrate to PostgreSQL:

1. On Render dashboard, create a new PostgreSQL database:
   - Click **"New +"** → **"PostgreSQL"**
   - Select plan (Free tier available)

2. Get connection string and add to Web Service environment:
   ```
   DATABASE_URL=postgresql://user:password@host:port/database
   ```

3. Update your database connection in `server/db.ts` to use `@neondatabase/serverless`

4. Run migrations: `npm run db:push`

---

## Troubleshooting

### Build Fails
- Check logs: Service → Logs tab
- Ensure all dependencies are in `package.json` (not globally installed)
- Verify Node version compatibility

### App crashes on startup
- Check for hardcoded paths or environment variables
- Ensure PORT environment variable is used (your code does this correctly)

### Database not found
- SQLite: Expected behavior on Render (ephemeral storage)
- PostgreSQL: Check `DATABASE_URL` is set correctly

---

## Next Steps

**Phase 1 (Current):** Deploy with SQLite
- Accept data loss on redeployment
- Test functionality

**Phase 2 (Recommended):** Add PostgreSQL
- Persistent data storage
- Production-ready

**Phase 3 (Optional):** Add S3/Cloudinary
- Persistent file uploads
- Professional file handling