# Sales API Implementation Guide

## Overview

This is a production-ready Sales API module built with Node.js, Express, and PostgreSQL. It implements:

- ✅ **UPSERT logic**: Duplicate (product_id, sale_date) updates quantity instead of throwing an error
- ✅ **Parameterized queries**: SQL injection prevention with parameterized statements
- ✅ **Comprehensive validation**: UUID, date format, future date checking
- ✅ **Proper HTTP status codes**: 201 (Created), 400 (Bad Request), 422 (Unprocessable Entity), 500 (Server Error)
- ✅ **Clean architecture**: Separation of concerns (controller → service → database)
- ✅ **Async/await**: Modern async error handling
- ✅ **Production-ready**: Error handling, logging, input validation, edge cases

---

## File Structure

```
backend/src/
├── routes/
│   └── sales.routes.js         # Route definitions
├── controllers/
│   └── sales.controller.js     # HTTP request handling
├── services/
│   └── sales.service.js        # Business logic & DB queries
├── middleware/
│   └── validateSales.js        # Input validation
└── config/
    └── schema.sql              # Database schema
```

---

## Database Schema

The sales table uses a unique index on `(product_id, sale_date)` to enable efficient UPSERT operations:

```sql
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  sale_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- This index enables efficient UPSERT
CREATE UNIQUE INDEX idx_sales_product_date ON sales(product_id, sale_date);
```

---

## API Endpoints

### 1. POST /api/sales - Create Sale with UPSERT

**Request:**
```json
{
  "product_id": "550e8400-e29b-41d4-a716-446655440000",
  "qty_sold": 10,
  "sale_date": "2026-05-05"
}
```

**Response (201):**
```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6",
    "product_id": "550e8400-e29b-41d4-a716-446655440000",
    "quantity": 10,
    "sale_date": "2026-05-05",
    "created_at": "2026-05-05T14:30:00Z"
  },
  "message": "Sale created"
}
```

**UPSERT Behavior:**
If a sale already exists for the same `(product_id, sale_date)`, the quantity is updated (added):

```bash
# First call: Creates quantity=10
POST /api/sales
{ "product_id": "550e...", "qty_sold": 10, "sale_date": "2026-05-05" }

# Second call with same product_id & sale_date: Updates quantity to 15
POST /api/sales
{ "product_id": "550e...", "qty_sold": 5, "sale_date": "2026-05-05" }
```

### 2. GET /api/sales - Retrieve with Filters

**Query Parameters:**
- `product_id` - Filter by product UUID
- `start_date` - From date (YYYY-MM-DD)
- `end_date` - Until date (YYYY-MM-DD)
- `limit` - Results per page (1-1000, default 100)
- `offset` - Pagination offset (default 0)

**Example:**
```bash
GET /api/sales?product_id=550e8400-e29b-41d4-a716-446655440000&start_date=2026-05-01&end_date=2026-05-31&limit=10&offset=0
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6",
      "product_id": "550e8400-e29b-41d4-a716-446655440000",
      "quantity": 10,
      "sale_date": "2026-05-05",
      "created_at": "2026-05-05T14:30:00Z",
      "product_name": "Organic Milk",
      "sku": "MILK-001",
      "category": "Dairy",
      "total_value": "30.00"
    }
  ],
  "count": 1,
  "limit": 10,
  "offset": 0
}
```

### 3. GET /api/sales/summary - Daily Summary

**Query Parameters:**
- `start_date` - From date (YYYY-MM-DD, optional)
- `end_date` - Until date (YYYY-MM-DD, optional)

**Example:**
```bash
GET /api/sales/summary?start_date=2026-05-01&end_date=2026-05-31
```

**Response (200):**
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

### 4. POST /api/sales/bulk-upload - CSV Import

**CSV Format:**
```csv
sku,sale_date,quantity
MILK-001,2026-05-05,10
CHEESE-001,2026-05-05,5
BUTTER-001,2026-05-04,3
```

**Response (201):**
```json
{
  "message": "Bulk upload completed",
  "uploadedCount": 3,
  "errorCount": 0
}
```

---

## Implementation Details

### Input Validation (Middleware)

The `validateSales.js` middleware performs **pre-request validation**:

```javascript
// UUID validation using regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Date validation (YYYY-MM-DD format + not future)
function isValidDate(dateStr) { /* ... */ }
function isNotFutureDate(dateStr) { /* ... */ }
```

**Validation errors return 422 Unprocessable Entity:**

```json
{
  "message": "product_id must be a valid UUID; qty_sold must be greater than 0; sale_date cannot be in the future"
}
```

### UPSERT Logic (Service)

The `upsertSale` function uses PostgreSQL's **ON CONFLICT** clause with parameterized queries:

```javascript
const query = `
  INSERT INTO sales (product_id, quantity, sale_date)
  VALUES ($1, $2, $3)
  ON CONFLICT (product_id, sale_date)
  DO UPDATE SET
    quantity = sales.quantity + EXCLUDED.quantity
  RETURNING id, product_id, quantity, sale_date, created_at
`;

// Parameterized query - prevents SQL injection
const result = await pool.query(query, [product_id, qty_sold, sale_date]);
```

**How it works:**
1. Tries to INSERT a new sale record
2. If `(product_id, sale_date)` already exists (UNIQUE constraint violation):
   - UPDATE the quantity by ADDING the new quantity to existing quantity
   - This prevents duplicates and maintains accurate totals

### Parameterized Queries

**All queries use parameterized statements (`$1, $2, etc`) to prevent SQL injection:**

```javascript
// ✅ SAFE - Parameterized
await pool.query("SELECT * FROM sales WHERE product_id = $1", [product_id]);

// ❌ UNSAFE - String concatenation (never used)
await pool.query(`SELECT * FROM sales WHERE product_id = '${product_id}'`);
```

### Error Handling

Controller catches errors and assigns appropriate HTTP status codes:

```javascript
export async function createSale(req, res) {
  try {
    const sale = await salesService.upsertSale({
      product_id,
      qty_sold: quantityInt,
      sale_date
    });
    res.status(201).json({ data: sale, message: "Sale created" });
  } catch (error) {
    if (error.code === 'FOREIGN_KEY_VIOLATION') {
      error.statusCode = 422;  // Product doesn't exist
    }
    throw error;  // Async handler catches & error handler middleware responds
  }
}
```

**Error middleware (`errorHandler.js`):**

```javascript
export function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || "Internal server error"
  });
}
```

---

## HTTP Status Codes

| Code | Scenario | Example |
|------|----------|---------|
| **201** | Sale created successfully | POST /api/sales |
| **200** | GET request successful | GET /api/sales |
| **400** | Missing required field, invalid pagination | No file uploaded, limit > 1000 |
| **422** | Validation failed, product not found | Invalid UUID, future date, qty <= 0 |
| **500** | Database error, server error | Connection timeout |

---

## Testing

Run the test suite:

```bash
npm test -- sales.test.js
```

**Test Coverage:**
- ✅ Create sale with valid data
- ✅ UPSERT logic (duplicate handling)
- ✅ All validation rules (UUID, qty, date)
- ✅ Filtering and pagination
- ✅ Daily summary aggregation
- ✅ Bulk CSV import
- ✅ Error responses and status codes
- ✅ SQL injection prevention

---

## Code Architecture

### Clean Separation of Concerns

```
HTTP Request
    ↓
[routes.js] - Route definition
    ↓
[controller.js] - HTTP layer
    ├─ Parse request
    ├─ Call service
    └─ Return HTTP response
    ↓
[service.js] - Business logic
    ├─ UPSERT logic
    ├─ Filtering
    ├─ Aggregation
    └─ Call database
    ↓
[pool.query()] - PostgreSQL
```

### Example Flow: Create Sale

```javascript
// 1. ROUTE - registers endpoint
router.post("/", validateCreateSale, asyncHandler(createSale));

// 2. MIDDLEWARE - validates input
validateCreateSale(req, res, next) {
  // Check UUID format, qty > 0, date not future
}

// 3. CONTROLLER - handles HTTP
createSale(req, res) {
  const sale = await salesService.upsertSale(req.body);
  res.status(201).json({ data: sale });
}

// 4. SERVICE - implements business logic
upsertSale(saleData) {
  const query = `
    INSERT INTO sales (...) VALUES ($1, $2, $3)
    ON CONFLICT (...) DO UPDATE SET ...
  `;
  return pool.query(query, [product_id, qty_sold, sale_date]);
}
```

---

## Security Features

### 1. **SQL Injection Prevention**
- All queries use parameterized statements
- No string concatenation in SQL
- Input validation before database queries

### 2. **Input Validation**
- UUID format validation (regex)
- Date format validation (YYYY-MM-DD)
- Future date prevention
- Type checking (integer, string)
- Range validation (qty > 0, limit 1-1000)

### 3. **Error Handling**
- Sensitive errors not exposed (no stack traces)
- Proper HTTP status codes
- Structured error responses
- Database constraint errors mapped to appropriate codes

### 4. **Foreign Key Constraints**
- `product_id` references `products(id)` with `ON DELETE RESTRICT`
- Prevents orphaned sales records
- Returns 422 if product doesn't exist

---

## Performance Considerations

### Indexing
```sql
CREATE UNIQUE INDEX idx_sales_product_date ON sales(product_id, sale_date);
CREATE INDEX idx_sales_product_id ON sales(product_id);
CREATE INDEX idx_sales_created_at ON sales(created_at);
```

- **Unique index on (product_id, sale_date)**: Enables efficient UPSERT
- **Index on product_id**: Fast filtering by product
- **Index on created_at**: Fast sorting by timestamp

### Connection Pooling
- PostgreSQL connection pool (pg library)
- Reuses connections, reduces overhead
- Better performance under load

### Query Optimization
- Parameterized queries (can be cached)
- Selective column retrieval (no SELECT *)
- Pagination to limit result sets
- Aggregation at database level (summary)

---

## Examples

### Create a Sale
```bash
curl -X POST http://localhost:3000/api/sales \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "550e8400-e29b-41d4-a716-446655440000",
    "qty_sold": 10,
    "sale_date": "2026-05-05"
  }'
```

### Get Sales for a Product
```bash
curl -X GET "http://localhost:3000/api/sales?product_id=550e8400-e29b-41d4-a716-446655440000&start_date=2026-05-01&end_date=2026-05-31"
```

### Get Daily Summary
```bash
curl -X GET "http://localhost:3000/api/sales/summary?start_date=2026-05-01&end_date=2026-05-31"
```

### Bulk Upload CSV
```bash
curl -X POST http://localhost:3000/api/sales/bulk-upload \
  -F "file=@sales.csv"
```

---

## Environment Setup

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- npm or yarn

### Installation
```bash
cd backend
npm install
```

### Database Setup
```bash
# Run schema.sql to create tables
psql -U postgres -d retailmind < src/config/schema.sql
```

### Run Server
```bash
npm start
# or development with auto-reload
npm run dev
```

### Run Tests
```bash
npm test -- sales.test.js
```

---

## Troubleshooting

### Issue: Foreign Key Constraint Violation
**Error:** `product_id does not exist`
**Solution:** Ensure product exists in database before creating sale

### Issue: Duplicate Key Violation on UPSERT
**Error:** `Duplicate key value violates unique constraint`
**Solution:** This shouldn't happen; check for race conditions or schema changes

### Issue: Invalid Date
**Error:** `sale_date must be in YYYY-MM-DD format`
**Solution:** Use format YYYY-MM-DD, e.g., "2026-05-05"

### Issue: Future Date Rejected
**Error:** `sale_date cannot be in the future`
**Solution:** sale_date must be today or in the past

---

## Related Documentation

- [SALES_API.md](./SALES_API.md) - Complete API reference with examples
- [Backend README](../README.md) - General backend documentation
- PostgreSQL [ON CONFLICT](https://www.postgresql.org/docs/current/sql-insert.html#SQL-ON-CONFLICT) documentation
