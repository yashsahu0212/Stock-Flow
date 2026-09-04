# Stock Flow — Backend REST API Contract & Integration Guide

> **Base URL**: `http://localhost:5000/api`  
> **Target Audience**: Frontend Developer (Developer 2)  
> **Source of Truth**: All inventory, warehouse state, orders, and pick workflows are authoritatively managed by PostgreSQL via this API.

---

## 1. Global Standards & Conventions

### 1.1 Response Format
Every response adheres to a predictable JSON envelope:

#### Successful Response:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable confirmation"
}
```

#### Error Response:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error description",
    "details": [ ... ]
  }
}
```

### 1.2 Common Error Codes
| Code | HTTP Status | Description |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Missing or invalid fields in request body/query |
| `UNAUTHORIZED` | 401 | Missing, malformed, or expired JWT Bearer token |
| `FORBIDDEN` | 403 | User role lacks permission for the endpoint |
| `NOT_FOUND` | 404 | Entity (product, bin, warehouse, order) not found |
| `INSUFFICIENT_STOCK` | 400 | Bin does not have sufficient units for pick/transfer |
| `PICK_QUANTITY_EXCEEDED`| 400 | Attempted to pick more than remaining order demand |
| `WRONG_PRODUCT` | 200/400 | Scanned product SKU differs from expected SKU |
| `WRONG_LOCATION` | 200/400 | Scanned shelf/bin differs from expected location |
| `INVALID_QR` | 200/400 | QR code string is not registered in system |
| `DUPLICATE_ENTRY` | 409 | Unique constraint violated (e.g. SKU already exists) |

### 1.3 Authentication
All protected routes require an HTTP Authorization header:
```http
Authorization: Bearer <JWT_TOKEN>
```
Roles supported: `ADMIN`, `MANAGER`, `PICKER`, `AUDITOR`.

---

## 2. Authentication APIs

### 2.1 Login
- **Endpoint**: `POST /api/auth/login`
- **Auth**: Public
- **Request Body**:
  ```json
  {
    "email": "picker@stockflow.internal",
    "password": "Picker@123"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "token": "eyJhbGciOi...",
      "user": {
        "id": "c1f7b880-...",
        "email": "picker@stockflow.internal",
        "name": "Alex Rivera (Fulfillment Lead)",
        "role": "PICKER"
      }
    },
    "message": "Login successful"
  }
  ```

### 2.2 Register
- **Endpoint**: `POST /api/auth/register`
- **Auth**: Public (or Admin)
- **Request Body**:
  ```json
  {
    "email": "john.picker@warehouse.com",
    "password": "Password@123",
    "name": "John Doe",
    "role": "PICKER"
  }
  ```

### 2.3 Current Profile
- **Endpoint**: `GET /api/auth/me`
- **Auth**: Bearer Token required
- **Response `200 OK`**: Returns current authenticated user object.

---

## 3. QR Verification API (Core Feature)

### 3.1 Verify Scanned QR
Used by the mobile/handheld QR scanner during warehouse picking and shelf audits.
- **Endpoint**: `POST /api/qr/verify`
- **Auth**: Public or Bearer Token (records `userId` if authenticated)
- **Request Body**:
  ```json
  {
    "qrCode": "SKU-LOG-G502",
    "expectedSku": "LOG-G502"
  }
  ```
  *Optional shelf verification fields:*
  ```json
  {
    "qrCode": "SHELF-WH01-R03-S14",
    "expectedBinCode": "S14"
  }
  ```

#### Responses:
- **Case 1: Exact Match (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "verified": true,
      "reason": "MATCH",
      "product": {
        "id": "3d5f81...",
        "sku": "LOG-G502",
        "name": "Logitech G502 HERO Gaming Mouse",
        "category": "Peripherals"
      },
      "location": {
        "binId": "b188c0...",
        "warehouse": "WH01",
        "warehouseName": "Central Logistics Hub",
        "row": "R03",
        "shelf": "S14",
        "binQrCode": "SHELF-WH01-R03-S14",
        "quantity": 27
      },
      "availableQuantity": 27,
      "locations": [
        {
          "binId": "b188c0...",
          "warehouse": "WH01",
          "row": "R03",
          "shelf": "S14",
          "quantity": 27
        }
      ]
    }
  }
  ```

- **Case 2: Wrong Product Scanned (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "verified": false,
      "reason": "WRONG_PRODUCT",
      "expectedSku": "LOG-G502",
      "scannedSku": "LOG-G305",
      "message": "Wrong product scanned"
    }
  }
  ```

- **Case 3: Wrong Shelf/Location Scanned (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "verified": false,
      "reason": "WRONG_LOCATION",
      "expectedBinCode": "S14",
      "scannedBinCode": "S01",
      "message": "Wrong location/shelf scanned"
    }
  }
  ```

- **Case 4: Invalid/Unregistered QR (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "verified": false,
      "reason": "INVALID_QR",
      "message": "QR code is not registered"
    }
  }
  ```

---

## 4. Picking & Inventory Operations (Transaction-Safe)

### 4.1 Pick Item from Shelf
Decrements bin stock, updates order item progress, logs `OUTWARD` stock movement, and transitions order status atomically.
- **Endpoint**: `POST /api/inventory/pick`
- **Auth**: Optional/Bearer Token
- **Request Body**:
  ```json
  {
    "orderId": "38a8e1b2-...",
    "productId": "79b3c4a1-...",
    "binId": "b188c0d9-...",
    "quantity": 2
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "orderId": "38a8e1b2-...",
      "orderNumber": "ORD-2026-8801",
      "orderStatus": "PICKING",
      "product": {
        "id": "79b3c4a1-...",
        "sku": "LOG-G502",
        "name": "Logitech G502 HERO Gaming Mouse"
      },
      "bin": {
        "id": "b188c0d9-...",
        "code": "S14",
        "qrCode": "SHELF-WH01-R03-S14",
        "warehouse": "WH01",
        "remainingBinStock": 25
      },
      "pickedQuantity": 2,
      "orderItem": {
        "totalRequired": 2,
        "totalPicked": 2,
        "isCompleted": true
      },
      "movementId": "a1f94b..."
    },
    "message": "Pick operation completed successfully"
  }
  ```
- **Error Responses**:
  - `INSUFFICIENT_STOCK` (400): When bin has fewer units than requested.
  - `PICK_QUANTITY_EXCEEDED` (400): When picking more than required for the order item.
  - `ORDER_ALREADY_COMPLETED` (400): Order is already complete.

### 4.2 Stock Inward (Receipt)
- **Endpoint**: `POST /api/inventory/inward`
- **Request Body**:
  ```json
  {
    "productId": "...",
    "binId": "...",
    "quantity": 50,
    "reason": "Supplier shipment #PO-9921"
  }
  ```
- **Response `201 Created`**: Returns new bin quantity and movement ID.

### 4.3 Stock Transfer
- **Endpoint**: `POST /api/inventory/transfer`
- **Request Body**:
  ```json
  {
    "productId": "...",
    "fromBinId": "...",
    "toBinId": "...",
    "quantity": 10,
    "reason": "Reorganizing fast pick aisle"
  }
  ```

### 4.4 Stock Adjustment (Cycle Count / Damaged Goods)
- **Endpoint**: `POST /api/inventory/adjust`
- **Request Body**:
  ```json
  {
    "productId": "...",
    "binId": "...",
    "quantity": 12,
    "reason": "Damaged water leak write-off"
  }
  ```

---

## 5. Product APIs

### 5.1 List All Products
- **Endpoint**: `GET /api/products`
- **Query Params**:
  - `category` (optional): Filter by category (e.g. `Peripherals`, `Monitors`)
  - `lowStock` (optional): `true` to return only products below minimum stock level
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "...",
        "sku": "LOG-G502",
        "name": "Logitech G502 HERO Gaming Mouse",
        "category": "Peripherals",
        "price": 79.99,
        "minStockLevel": 15,
        "unit": "pcs",
        "qrCode": "SKU-LOG-G502",
        "totalQuantity": 27,
        "isLowStock": false,
        "locations": [
          {
            "binId": "...",
            "binCode": "S14",
            "qrCode": "SHELF-WH01-R03-S14",
            "rowCode": "R03",
            "warehouseCode": "WH01",
            "warehouseName": "Central Logistics Hub",
            "quantity": 27
          }
        ]
      }
    ]
  }
  ```

### 5.2 Search Products
- **Endpoint**: `GET /api/products/search?q=g502`
- **Response `200 OK`**: Matches product name, SKU, or category.

### 5.3 Product by SKU
- **Endpoint**: `GET /api/products/sku/:sku`
- **Example**: `GET /api/products/sku/LOG-G502`

### 5.4 Product by ID
- **Endpoint**: `GET /api/products/:id`

---

## 6. Warehouse & Visualization APIs

### 6.1 List Warehouses
- **Endpoint**: `GET /api/warehouses`
- **Response `200 OK`**: Summary with `totalRows`, `totalBins`, `totalUnits`.

### 6.2 Warehouse Complete Hierarchy (For 2D/3D Floorplans)
- **Endpoint**: `GET /api/warehouses/:id/rows`
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "id": "...",
      "code": "WH01",
      "name": "Central Logistics Hub",
      "rows": [
        {
          "id": "...",
          "code": "R03",
          "bins": [
            {
              "id": "...",
              "code": "S14",
              "qrCode": "SHELF-WH01-R03-S14",
              "zone": "STANDARD_STORAGE",
              "capacity": 100,
              "totalUnits": 27,
              "occupancyRate": 27,
              "products": [
                {
                  "productId": "...",
                  "sku": "LOG-G502",
                  "name": "Logitech G502 HERO Gaming Mouse",
                  "quantity": 27
                }
              ]
            }
          ]
        }
      ]
    }
  }
  ```

### 6.3 Bin Details & Inventory
- **Endpoint**: `GET /api/bins/:id`
- **Endpoint**: `GET /api/bins/:id/inventory`

---

## 7. Order APIs

### 7.1 List Orders
- **Endpoint**: `GET /api/orders`
- **Query Params**:
  - `status` (optional): `PENDING`, `PICKING`, `PICKED`, `COMPLETED`, `CANCELLED`
  - `priority` (optional): `LOW`, `NORMAL`, `HIGH`, `URGENT`
- **Response `200 OK`**: Includes `totalItems`, `totalPicked`, `progressPercent`.

### 7.2 Order Details & Pick Suggestions
- **Endpoint**: `GET /api/orders/:id`
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "id": "...",
      "orderNumber": "ORD-2026-8801",
      "customerName": "AeroTech Systems Inc.",
      "status": "PENDING",
      "priority": "HIGH",
      "totalItems": 3,
      "totalPicked": 0,
      "progressPercent": 0,
      "items": [
        {
          "orderItemId": "...",
          "productId": "...",
          "sku": "LOG-G502",
          "name": "Logitech G502 HERO Gaming Mouse",
          "requestedQuantity": 2,
          "pickedQuantity": 0,
          "status": "PENDING",
          "suggestedBins": [
            {
              "binId": "...",
              "binCode": "S14",
              "qrCode": "SHELF-WH01-R03-S14",
              "rowCode": "R03",
              "warehouseCode": "WH01",
              "availableQuantity": 27
            }
          ]
        }
      ]
    }
  }
  ```

### 7.3 Update Order Status
- **Endpoint**: `PATCH /api/orders/:id/status`
- **Request Body**: `{ "status": "COMPLETED" }`

---

## 8. Dashboard APIs (Authoritative Backend Metrics)

### 8.1 Summary KPI Cards
- **Endpoint**: `GET /api/dashboard/summary`
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "totalProducts": 27,
      "totalUnits": 782,
      "lowStockProducts": 3,
      "outOfStockProducts": 0,
      "pendingOrders": 2,
      "completedOrders": 1,
      "todayMovements": 32,
      "todayPicks": 4,
      "timestamp": "2026-09-05T03:30:00.000Z"
    }
  }
  ```

### 8.2 Low Stock Alert List
- **Endpoint**: `GET /api/dashboard/low-stock`
- **Response `200 OK`**: List of products where stock <= `minStockLevel`, sorted by highest urgency.

### 8.3 Recent Stock Movements Audit
- **Endpoint**: `GET /api/dashboard/recent-movements?limit=20`
- **Response `200 OK`**: Audited timeline of inward, outward, transfer, and adjustment operations.
