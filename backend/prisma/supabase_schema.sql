-- ==============================================================================
-- StockFlow - Supabase / PostgreSQL Schema Definition
-- Run this in the Supabase Dashboard SQL Editor (or via psql / prisma db push)
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean existing types if running afresh (comment out in production)
DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'PICKER', 'AUDITOR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PICKING', 'PICKED', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "OrderPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "OrderItemStatus" AS ENUM ('PENDING', 'PICKED', 'SHORTAGE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "MovementType" AS ENUM ('INWARD', 'OUTWARD', 'TRANSFER', 'ADJUSTMENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ScanType" AS ENUM ('PRODUCT', 'SHELF_BIN', 'UNKNOWN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ScanResult" AS ENUM ('MATCH', 'WRONG_PRODUCT', 'WRONG_LOCATION', 'INVALID_QR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "email" TEXT UNIQUE NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PICKER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Warehouses Table
CREATE TABLE IF NOT EXISTS "warehouses" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "code" TEXT UNIQUE NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Warehouse Rows Table
CREATE TABLE IF NOT EXISTS "rows" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "code" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rows_warehouseId_code_key" UNIQUE ("warehouseId", "code")
);

-- 4. Shelf Bins Table
CREATE TABLE IF NOT EXISTS "shelf_bins" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "code" TEXT NOT NULL,
    "qrCode" TEXT UNIQUE NOT NULL,
    "rowId" TEXT NOT NULL REFERENCES "rows"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "zone" TEXT,
    "capacity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shelf_bins_rowId_code_key" UNIQUE ("rowId", "code")
);

-- 5. Products Table
CREATE TABLE IF NOT EXISTS "products" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "sku" TEXT UNIQUE NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "minStockLevel" INTEGER NOT NULL DEFAULT 10,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "qrCode" TEXT UNIQUE,
    "barcode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Inventories Table
CREATE TABLE IF NOT EXISTS "inventories" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "productId" TEXT NOT NULL REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "binId" TEXT NOT NULL REFERENCES "shelf_bins"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventories_productId_binId_key" UNIQUE ("productId", "binId")
);

CREATE INDEX IF NOT EXISTS "inventories_productId_idx" ON "inventories"("productId");
CREATE INDEX IF NOT EXISTS "inventories_binId_idx" ON "inventories"("binId");

-- 7. Orders Table
CREATE TABLE IF NOT EXISTS "orders" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "orderNumber" TEXT UNIQUE NOT NULL,
    "customerName" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "OrderPriority" NOT NULL DEFAULT 'NORMAL',
    "assignedToUserId" TEXT REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Order Items Table
CREATE TABLE IF NOT EXISTS "order_items" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "orderId" TEXT NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "productId" TEXT NOT NULL REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "quantity" INTEGER NOT NULL,
    "pickedQuantity" INTEGER NOT NULL DEFAULT 0,
    "status" "OrderItemStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_items_orderId_productId_key" UNIQUE ("orderId", "productId")
);

-- 9. Stock Movements Table
CREATE TABLE IF NOT EXISTS "stock_movements" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "productId" TEXT NOT NULL REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "type" "MovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "fromBinId" TEXT REFERENCES "shelf_bins"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "toBinId" TEXT REFERENCES "shelf_bins"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "orderId" TEXT REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "userId" TEXT REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "stock_movements_productId_idx" ON "stock_movements"("productId");
CREATE INDEX IF NOT EXISTS "stock_movements_createdAt_idx" ON "stock_movements"("createdAt");

-- 10. Scan Events Table
CREATE TABLE IF NOT EXISTS "scan_events" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "qrCode" TEXT NOT NULL,
    "scannedType" "ScanType" NOT NULL,
    "expectedSku" TEXT,
    "scannedSku" TEXT,
    "expectedBinCode" TEXT,
    "scannedBinCode" TEXT,
    "verified" BOOLEAN NOT NULL,
    "reason" "ScanResult" NOT NULL,
    "userId" TEXT REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "scan_events_createdAt_idx" ON "scan_events"("createdAt");
