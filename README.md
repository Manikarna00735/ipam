# IPAM Backend (Express + Postgres)

Minimal IPAM backend scaffold using Express, raw `pg`, JWT auth, and `socket.io` for realtime events.

**Quickstart**

1. Copy `.env.example` to `.env` and fill values (set `DATABASE_URL`).
2. Install dependencies:

```bash
npm install
```

3. Create the Postgres database and run migrations:

```bash
# Example: create database with psql
psql -c "CREATE DATABASE ipamdb;"
# Run SQL migrations (reads DATABASE_URL)
node scripts/runMigrations.js
```

4. Start the server (dev):

```bash
npm run dev
```

The server listens on `PORT` (default `3000`).

**Testing**

Set `DATABASE_URL` in `.env` to point to a test database (tests will remove created rows). Then:

```bash
npm test
```

**API (high level)**

- Auth:
  - `POST /api/auth/register` — body: `{ email, password }`
  - `POST /api/auth/login` — body: `{ email, password }` → returns `{ token }`
  - Protected endpoints require header `Authorization: Bearer <token>` and `X-Org-Id` for org scoping.

- Generic resources (examples): mounted under `/api/ipam/{resource}` — support `POST`, `GET`, `GET /:id`, `PUT /:id`, `DELETE /:id`.

- IPAM nested routes (prefixes/subnets/ips):
  - `POST /api/ipam/prefixes`
  - `GET /api/ipam/prefixes`
  - `PUT /api/ipam/prefixes/:id`
  - `DELETE /api/ipam/prefixes/:id`
  - `POST /api/ipam/prefixes/:id/subnets`
  - `GET /api/ipam/prefixes/:id/subnets`
  - `PUT /api/ipam/prefixes/:id/subnets/:subnetId`
  - `DELETE /api/ipam/prefixes/:id/subnets/:subnetId`
  - `POST /api/ipam/prefixes/:id/subnets/:subnetId/ips`
  - `POST /api/ipam/prefixes/:id/subnets/:subnetId/ips/batch`
  - `GET /api/ipam/prefixes/:id/subnets/:subnetId/ips`
  - `PUT /api/ipam/prefixes/:id/subnets/:subnetId/ips/:ipId`
  - `DELETE /api/ipam/prefixes/:id/subnets/:subnetId/ips/:ipId`

See the source for exact request/response shapes in the controllers under `src/controllers`.

**Realtime (WebSocket)**

The app exposes a Socket.IO server. Clients can connect to receive events like `prefixes:created`, `subnets:updated`, `ips:deleted`, etc. Events are emitted globally; payloads include created/updated rows or `{ id, org_id }` on deletes.

**Notes & Next steps**

- Run `node scripts/runMigrations.js` to apply the SQL in `migrations/` (requires `psql` and `DATABASE_URL`).
- The project includes basic input validation and integration tests in `tests/` as examples — expand tests for other modules as needed.
- Review `migrations/002_resources.sql` to tune schema, constraints, and indexes for production workloads.

If you want, I can (A) add more API docs per-resource, (B) add OpenAPI spec, or (C) refine migrations for production. Tell me which.
# IPAM Backend (Express + Postgres)

Quick scaffold: Express app using raw `pg` and JWT auth.

Setup

1. Copy `.env.example` to `.env` and fill values.
2. Install dependencies:

```bash
npm install
```

3. Create the database and run the SQL in `migrations/001_init.sql`.

Run

```bash
npm run dev
```

Tests

Set `DATABASE_URL` in your `.env` to point to a test Postgres database (tests will delete created rows). Then run:

```bash
npm install
npm test
```

API

- `POST /api/auth/register` - register user (email, password)
- `POST /api/auth/login` - login (email, password) -> returns `token`
- `GET /api/me` - protected, requires `Authorization: Bearer <token>`
