# Supabase Database Integration Guide

## Overview

StockFlow uses **Supabase PostgreSQL** as its primary relational database. This guide details the connection setup, Prisma configuration, schema deployment, and health monitoring.

---

## 1. Connection Architecture

Supabase provides two distinct database connection endpoints:

| Connection Type | Port | Mode | Prisma Parameter | Purpose |
|---|---|---|---|---|
| **Transaction Pooler (Supavisor)** | `6543` | Transaction | `DATABASE_URL` | Used for runtime application queries, serverless functions (Vercel), avoiding connection exhaustion. |
| **Direct Connection** | `5432` | Session | `DIRECT_URL` | Used for Prisma migrations, schema push, and CLI operations. |

### Prisma Datasource Setup

In `backend/prisma/schema.prisma` and `prisma/schema.prisma`:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

---

## 2. Environment Variables Configuration

In `.env` (and documented in `.env.example`):

```bash
# Supabase Transaction Pooler (Port 6543 with ?pgbouncer=true)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Supabase Direct Connection (Port 5432)
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# Optional Supabase API Keys (For Storage, Auth, or Edge Functions)
SUPABASE_URL="https://[PROJECT-REF].supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOi..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."
```

---

## 3. Database Deployment & Synchronization

You have two options to deploy the schema to your Supabase project:

### Option A: Via Supabase SQL Editor (Fastest / Zero Dependencies)
1. Open your Supabase Dashboard: `https://supabase.com/dashboard/project/<PROJECT-REF>/sql`
2. Create a **New query**.
3. Open `backend/prisma/supabase_schema.sql` from this repository.
4. Copy and paste the contents into the SQL Editor and click **Run**.
5. All 10 tables, enums, foreign keys, and indexes will be created immediately.

### Option B: Via Prisma CLI
Once you configure `DATABASE_URL` and `DIRECT_URL` in `.env`:
```bash
# Push schema directly to Supabase
npm run db:push

# Or deploy migration history
npm run db:migrate
```

### Seeding Initial Data
To populate demo users (Admin, Manager, Picker, Auditor), warehouses, rows, shelf bins with QR codes, products, inventory, and sample orders:
```bash
npm run seed
```

---

## 4. Database Health Monitoring

The backend health check route at `GET /api/health` automatically validates database connectivity:

```json
{
  "success": true,
  "data": {
    "status": "UP",
    "service": "StockFlow Inventory & Warehouse Tracking Backend",
    "database": {
      "provider": "Supabase / PostgreSQL",
      "connected": true,
      "latencyMs": 18
    },
    "uptimeSeconds": 142,
    "timestamp": "2026-10-23T18:45:00.000Z"
  }
}
```
If the database cannot be reached, `status` changes to `DEGRADED` and includes the connection error details for rapid debugging.
