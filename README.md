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

`VITE_API_URL` can stay blank when the frontend and Express API are served from the same domain. For the Render deployment in this repo, leave it blank.

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

- Deploy the repo root to Render as one Node web service.
- Use `npm install && npm run build` as the Render build command.
- Use `NODE_OPTIONS=--dns-result-order=ipv4first npx tsx resolve-and-start.ts` as the Render start command.
- Use the root `.env.example` values for Render environment variables.
- Drizzle remains the database layer for the custom app.
