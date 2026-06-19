# Medusa Store Service

This folder is a separate Medusa ecommerce backend.

It is not part of the existing Express backend in `server/`.

## Setup

```bash
cd medusa-store
npm install
cp .env.example .env
```

Edit `.env` and set `DATABASE_URL` to a PostgreSQL database created for Medusa.

## Database

Run Medusa migrations:

```bash
npm run db:migrate
```

## Development

```bash
npm run dev
```

Medusa backend:

```txt
http://localhost:9000
```

Medusa Admin:

```txt
http://localhost:9000/app
```

## Frontend Connection

The React/Vite frontend reads Medusa settings from `client/.env`:

```bash
VITE_MEDUSA_BACKEND_URL=http://localhost:9000
VITE_MEDUSA_PUBLISHABLE_KEY=pk_replace_with_medusa_publishable_key
```

Create a publishable API key in Medusa Admin and paste it into `client/.env`.
