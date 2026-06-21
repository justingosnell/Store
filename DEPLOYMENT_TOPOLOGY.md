# Deployment Topology

This app is deployed to Render as one custom Express web service that serves both the React frontend and the API.

## Render Web Service

Deploy the repo root to Render as a Node web service.

Settings:

```txt
Root directory: .
Build command: npm install && npm run build
Start command: NODE_OPTIONS=--dns-result-order=ipv4first npx tsx resolve-and-start.ts
Port: 3000
```

The frontend and backend are served from the same Render domain, so `VITE_API_URL` should be left blank unless you intentionally split them into separate Render services.

Environment variables:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=your_database_url
FRONTEND_URL=https://your-render-service.onrender.com
FRONTEND_URLS=https://your-render-service.onrender.com
SESSION_SECRET=replace-with-a-long-random-value
SESSION_COOKIE_NAME=connect.sid
INIT_ADMIN_USERNAME=admin
INIT_ADMIN_PASSWORD=replace-with-a-secure-password
RESET_ADMIN_PASSWORD=false
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
CLOUDINARY_URL=your_cloudinary_url
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_REDIRECT_URI=https://your-render-service.onrender.com/api/google/search-console/callback
```

For the `/admin` Analytics panel, add the same `GOOGLE_REDIRECT_URI` to the OAuth client's authorized redirect URIs in Google Cloud Console. The Analytics panel imports Search Console metrics: impressions, clicks, CTR, and average position.

If the seeded admin password needs to be recovered, set `RESET_ADMIN_PASSWORD=true` in Render, deploy once, confirm login works, then set it back to `false` and redeploy. The reset uses `INIT_ADMIN_USERNAME` and `INIT_ADMIN_PASSWORD`, clears failed login attempts, and unlocks that account.

## Blueprint

The repo includes `render.yaml` for Render Blueprint deploys. You can either use that file or mirror its settings manually in the Render dashboard.
