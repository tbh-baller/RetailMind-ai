# Sales API Documentation

## Overview
Production-ready Sales API for tracking retail sales transactions. All endpoints use parameterized queries to prevent SQL injection and follow RESTful conventions.

## Base URL
```
/api/sales
```

## Database Schema
```sql
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  sale_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_sales_product_date ON sales(product_id, sale_date);
```

## Endpoints

---

### 1. POST /api/sales
**Create a new sale with UPSERT logic**

If a sale for the same `(product_id, sale_date)` already exists, the quantity is updated (added) instead of creating a duplicate.

#### Request

**Content-Type:** `application/json`

**Body:**
```json
{
  "product_id": "550e8400-e29b-41d4-a716-446655440000",
  "qty_sold": 10,
  "sale_date": "2026-05-05"
}
```

**Field Specifications:**
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `product_id` | UUID (string) | Yes | Valid UUID v4 format |
| `qty_sold` | integer | Yes | Must be > 0 |
| `sale_date` | string (ISO date) | Yes | Format: YYYY-MM-DD, cannot be future date |

#### Success Response

**Status Code:** `201 Created`

```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6",
    "product_id": "550e8400-e29b-41d4-a716-446655440000",
    "quantity": 15,
    "sale_date": "2026-05-05",
    "created_at": "2026-05-05T14:30:00Z"
  },
  "message": "Sale created"
}
```

#### Error Responses

**Status Code:** `400 Bad Request`
```json
{
  "message": "product_id is required"
}
```

**Status Code:** `422 Unprocessable Entity` (Validation error)
```json
{
  "message": "qty_sold must be greater than 0; sale_date cannot be in the future"
}
```

**Status Code:** `422 Unprocessable Entity` (Foreign key error)
```json
{
  "message": "product_id does not exist"
}
```

**Status Code:** `500 Internal Server Error`
```json
{
  "message": "Internal server error"
}
```

#### Example cURL

```bash
curl -X POST http://localhost:3000/api/sales \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "550e8400-e29b-41d4-a716-446655440000",
    "qty_sold": 10,
    "sale_date": "2026-05-05"
  }'
```

---

### 2. GET /api/sales
**Retrieve sales with optional filtering**

Returns paginated list of sales with product details and calculated total values.

#### Query Parameters

| Parameter | Type | Required | Default | Constraints |
|-----------|------|----------|---------|-------------|
| `product_id` | UUID | No | - | Filter by specific product |
| `start_date` | string | No | - | Format: YYYY-MM-DD |
| `end_date` | string | No | - | Format: YYYY-MM-DD |
| `limit` | integer | No | 100 | 1-1000 |
| `offset` | integer | No | 0 | Must be >= 0 |

#### Request Examples

```bash
# Get all sales (paginated)
GET /api/sales

# Filter by product
GET /api/sales?product_id=550e8400-e29b-41d4-a716-446655440000

# Filter by date range
GET /api/sales?start_date=2026-05-01&end_date=2026-05-31

# Combine filters with pagination
GET /api/sales?product_id=550e8400-e29b-41d4-a716-446655440000&start_date=2026-05-01&limit=50&offset=0
```

#### Success Response

**Status Code:** `200 OK`

```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6",
      "product_id": "550e8400-e29b-41d4-a716-446655440000",
      "quantity": 15,
      "sale_date": "2026-05-05",
      "created_at": "2026-05-05T14:30:00Z",
      "product_name": "Organic Milk",
      "sku": "MILK-001",
      "category": "Dairy",
      "total_value": "45.00"
    }
  ],
  "count": 1,
  "limit": 100,
  "offset": 0
}
```

#### Error Responses

**Status Code:** `400 Bad Request`
```json
{
  "message": "limit must be between 1 and 1000"
}
```

---

### 3. GET /api/sales/summary
**Get daily sales summary grouped by date**

Returns aggregated daily sales totals with transaction count and revenue.

#### Query Parameters

| Parameter | Type | Required | Default |
|-----------|------|----------|---------|
| `start_date` | string | No | - |
| `end_date` | string | No | - |

#### Request Examples

```bash
# Get all daily summaries
GET /api/sales/summary

# Filter by date range
GET /api/sales/summary?start_date=2026-05-01&end_date=2026-05-31
```

#### Success Response

**Status Code:** `200 OK`

```json
{
  "data": [
    {
      "sale_date": "2026-05-05",
      "transaction_count": "5",
      "total_quantity": "45",
      "total_revenue": "135.50"
    },
    {
      "sale_date": "2026-05-04",
      "transaction_count": "3",
      "total_quantity": "28",
      "total_revenue": "84.00"
    }
  ],
  "count": 2
}
```

#### Error Responses

**Status Code:** `400 Bad Request`
```json
{
  "message": "start_date must be in YYYY-MM-DD format"
}
```

---

### 4. POST /api/sales/bulk-upload
**Bulk import sales from CSV file**

Upload multiple sales records from a CSV file. Uses UPSERT logic for each row.

#### Request

**Content-Type:** `multipart/form-data`

**Required fields:**
- `file` (multipart file upload)

**CSV Format:**
```csv
sku,sale_date,quantity
MILK-001,2026-05-05,10
MILK-002,2026-05-05,15
CHEESE-001,2026-05-04,5
```

#### Success Response

**Status Code:** `201 Created`

```json
{
  "message": "Bulk upload completed",
  "uploadedCount": 3,
  "errorCount": 0
}
```

**With errors:**

```json
{
  "message": "Bulk upload completed",
  "uploadedCount": 2,
  "errorCount": 1,
  "errors": [
    {
      "row": 4,
      "error": "Product with SKU 'INVALID-001' not found",
      "sku": "INVALID-001"
    }
  ]
}
```

#### Error Responses

**Status Code:** `400 Bad Request`
```json
{
  "message": "No file uploaded"
}
```

**Status Code:** `400 Bad Request` (Invalid CSV)
```json
{
  "message": "Missing required columns: sku, sale_date, quantity"
}
```

---

## HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| `200` | OK | Successful GET request |
| `201` | Created | Sale successfully created/updated |
| `400` | Bad Request | Missing/invalid request data |
| `422` | Unprocessable Entity | Validation failed (invalid date, product not found, etc.) |
| `500` | Internal Server Error | Database or server error |

---

## Validation Rules

### product_id
- **Type:** UUID v4 string
- **Pattern:** `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`
- **Error:** Returns `422` if invalid

### qty_sold
- **Type:** Integer
- **Constraint:** Must be > 0
- **Error:** Returns `422` if invalid or <= 0

### sale_date
- **Type:** ISO date string (YYYY-MM-DD)
- **Constraint:** Cannot be in the future
- **Error:** Returns `422` if invalid format or future date

---

## Security Features

### SQL Injection Prevention
- All queries use **parameterized statements** ($1, $2, etc.)
- No string concatenation in SQL queries
- Input sanitization at middleware level

### Error Handling
- Sensitive error details not exposed to client
- Proper HTTP status codes for different error scenarios
- Structured error responses

### Input Validation
- Strict type checking
- Format validation (UUID, date)
- Range validation (positive quantities)
- Middleware-based pre-validation before service layer

---

## Code Architecture

### Controller (`sales.controller.js`)
- HTTP request/response handling
- Query parameter parsing and validation
- Status code assignment
- Delegating to service layer

### Service (`sales.service.js`)
- Business logic
- UPSERT operations with parameterized queries
- Data aggregation (summary)
- Filtering and pagination
- Error mapping

### Middleware (`validateSales.js`)
- Request validation
- Input sanitization
- Early error response

### Database (`db.js`)
- PostgreSQL connection pool
- Query execution with parameters

---

## Examples

### Example 1: Create a Sale
```bash
curl -X POST http://localhost:3000/api/sales \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "550e8400-e29b-41d4-a716-446655440000",
    "qty_sold": 10,
    "sale_date": "2026-05-05"
  }'
```

### Example 2: Get Sales for a Product with Date Range
```bash
curl -X GET "http://localhost:3000/api/sales?product_id=550e8400-e29b-41d4-a716-446655440000&start_date=2026-05-01&end_date=2026-05-31&limit=10"
```

### Example 3: Get Daily Sales Summary
```bash
curl -X GET "http://localhost:3000/api/sales/summary?start_date=2026-05-01&end_date=2026-05-31"
```

### Example 4: Bulk Upload from CSV
```bash
curl -X POST http://localhost:3000/api/sales/bulk-upload \
  -F "file=@sales.csv"
```

---

## Testing Checklist

- [ ] POST /api/sales with valid data creates sale
- [ ] POST /api/sales with invalid UUID returns 422
- [ ] POST /api/sales with qty_sold <= 0 returns 422
- [ ] POST /api/sales with future date returns 422
- [ ] POST /api/sales with non-existent product_id returns 422
- [ ] POST /api/sales with duplicate (product_id, sale_date) updates quantity
- [ ] GET /api/sales returns paginated results
- [ ] GET /api/sales with filters works correctly
- [ ] GET /api/sales/summary returns daily aggregates
- [ ] GET /api/sales/summary with date range filters correctly
- [ ] POST /api/sales/bulk-upload imports CSV successfully
- [ ] Error responses have appropriate status codes and messages

---

## Notes

- All timestamps are in UTC (TIMESTAMPTZ)
- The UPSERT logic uses PostgreSQL's `ON CONFLICT` clause
- Unique index on (product_id, sale_date) enables efficient UPSERT operations
- Queries use connection pooling for performance
- All date comparisons exclude time component (date-only comparison)
