# IPAM Backend (Express + Postgres)

Minimal IPAM backend scaffold using Express, raw `pg`, and `socket.io` for realtime events.

**Quickstart**

1. Create a `.env` file and fill values (at minimum set `DATABASE_URL`).
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

The server listens on `PORT` (default `5000`).

**Testing**

Set `DATABASE_URL` in `.env` to point to a test database (tests will remove created rows). Then:

```bash
npm test
```

**API (high level)**

- Auth:
  - Protected endpoints require header `Authorization: Bearer <token>`.

- Org scoping:
  - Protected endpoints require header `X-Org-Id` for org scoping.

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

If you want, I can (A) add more API docs per-resource, (B) add OpenAPI spec, or (C) refine migrations for production. Tell me which.
