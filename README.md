# Tiny Treasures App

Custom storefront and admin app built with Vite, React, Express, and Drizzle.

## Project Layout

- `client/` - Vite + React frontend
- `server/` - Node.js + Express backend
- `shared/` - shared Drizzle/Zod schema
- `migrations/` - Drizzle migrations

## Environment Files

Use separate env files for local development:

- Root `.env` - Express backend settings
- `client/.env` - frontend/Vite settings

Examples are provided in:

- `.env.example`
- `client/.env.example`

For production setup, see `DEPLOYMENT_TOPOLOGY.md`.

## Frontend Env Example

Create `client/.env` when you are ready:

```bash
VITE_API_URL=http://localhost:3000
```

`VITE_API_URL` can stay blank only when the frontend and Express API are served from the same domain. On Vercel, set it to the deployed Express backend URL.

## Install Dependencies

```bash
npm install
```

## Run Frontend + Backend

From the project root:

```bash
npm run dev
```

This runs the Express backend and Vite frontend together on:

```txt
http://localhost:3000
```

The admin login belongs to the Express app.

## Production Notes

- Deploy the frontend and Express backend separately if your host requires separate services.
- Use the root `.env.example` values for the backend service.
- Use `client/.env.example` for the frontend service.
- Drizzle remains the database layer for the custom app.
