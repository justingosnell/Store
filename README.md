# Tiny Treasures App

This project now has the existing custom app plus a separate Medusa ecommerce backend.

## Project Layout

Current folders:

- `client/` - existing Vite + React frontend
- `server/` - existing Node.js + Express backend for non-commerce features
- `shared/` - shared Drizzle/Zod schema used by the existing app
- `migrations/` - existing Drizzle migrations
- `medusa-store/` - new separate Medusa ecommerce backend service

Requested future layout:

```txt
project-root/
  frontend/
  backend/
  medusa-store/
```

I did not rename `client/` to `frontend/` or `server/` to `backend/` yet because that would affect scripts and deployment configuration. The existing app still uses `client/` and `server/`.

## Environment Files

Use separate env files:

- Root `.env` - existing Express backend settings
- `client/.env` - frontend/Vite settings
- `medusa-store/.env` - Medusa settings

Examples are provided in:

- `client/.env.example`
- `medusa-store/.env.example`

## Frontend Env Example

Create `client/.env` when you are ready:

```bash
VITE_API_URL=
VITE_MEDUSA_BACKEND_URL=http://localhost:9000
VITE_MEDUSA_PUBLISHABLE_KEY=pk_replace_with_medusa_publishable_key
```

`VITE_API_URL` can stay blank for same-origin Express API requests.

## Medusa Env Example

Create `medusa-store/.env`:

```bash
NODE_ENV=development
PORT=9000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/medusa-store
STORE_CORS=http://localhost:3000,http://localhost:5173
ADMIN_CORS=http://localhost:9000,http://localhost:3000
AUTH_CORS=http://localhost:9000,http://localhost:3000
JWT_SECRET=replace-with-a-long-random-value
COOKIE_SECRET=replace-with-a-long-random-value
```

Use a separate PostgreSQL database for Medusa. Do not point Medusa at the same database used by the existing Express/Drizzle app.

## Install Dependencies

Existing app:

```bash
npm install
```

Medusa service:

```bash
cd medusa-store
npm install
```

## Run Existing Frontend + Backend

From the project root:

```bash
npm run dev
```

This runs the existing Express backend and Vite frontend together on:

```txt
http://localhost:3000
```

The existing admin login still belongs to the Express app.

## Run Medusa

First create a separate PostgreSQL database for Medusa. Example:

```bash
createdb medusa-store
```

Then install and run Medusa:

```bash
cd medusa-store
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

Medusa runs at:

```txt
http://localhost:9000
```

Medusa Admin dashboard:

```txt
http://localhost:9000/app
```

Create your Medusa admin user from the Medusa dashboard, or use the Medusa CLI user command from inside `medusa-store/`.

## How React Connects to Medusa

The React app has a small Medusa Store API helper:

```txt
client/src/lib/medusa.ts
```

It reads:

- `VITE_MEDUSA_BACKEND_URL`
- `VITE_MEDUSA_PUBLISHABLE_KEY`

The homepage includes an example component:

```txt
client/src/components/MedusaProductsExample.tsx
```

That component fetches products from:

```txt
GET /store/products
```

The existing Express backend remains in place for non-commerce features. Drizzle and the existing PostgreSQL setup were not removed.

## Notes

- Medusa is separate from the current Express backend.
- Drizzle remains part of the existing app.
- Deployment files were not changed.
- Before deploying Medusa, decide where the new service and its separate PostgreSQL database will be hosted.
