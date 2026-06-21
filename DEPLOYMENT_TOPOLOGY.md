# Deployment Topology

This app is deployed as one frontend plus one custom Express backend.

## 1. Vercel Frontend

Deploy the repo root to Vercel.

Settings:

```txt
Build command: npm run build
Output directory: dist/public
```

Environment variables:

```env
VITE_API_URL=https://your-express-backend-url
```

`VITE_API_URL` points to the deployed Express backend. Leave it blank only when the frontend and API are served from the same domain.

## 2. Express Backend

Deploy the repo root as a backend web service.

Settings:

```txt
Root directory: .
Build command: npm install && npm run build:backend
Start command: npm run start:backend
Port: 3000
```

Environment variables:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=your_neon_database_url
FRONTEND_URLS=https://your-vercel-storefront-url
SESSION_SECRET=replace-with-a-long-random-value
INIT_ADMIN_USERNAME=admin
INIT_ADMIN_PASSWORD=replace-with-a-secure-password
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
CLOUDINARY_URL=your_cloudinary_url
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_REDIRECT_URI=https://your-express-backend-url/api/google/search-console/callback
```

For the `/admin` Analytics panel, add the same `GOOGLE_REDIRECT_URI` to the OAuth client's authorized redirect URIs in Google Cloud Console. The Analytics panel imports Search Console metrics: impressions, clicks, CTR, and average position.
