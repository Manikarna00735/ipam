# IPAM Backend (Express + Postgres)

Minimal IPAM backend scaffold using Express, raw `pg`, JWT auth, and `socket.io` for realtime events.

**Quickstart**

1. Copy `.env.example` to `.env` and fill values (set `DATABASE_URL`).
2. Install dependencies:

```bash
npm install
```


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

