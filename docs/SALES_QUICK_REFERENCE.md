# Sales API - Quick Reference

## Quick Start

### 1. Create a Sale
```bash
curl -X POST http://localhost:3000/api/sales \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "550e8400-e29b-41d4-a716-446655440000",
    "qty_sold": 10,
    "sale_date": "2026-05-05"
  }'
```

**Automatic UPSERT:** Call again with same `product_id` + `sale_date` to add to quantity

### 2. Get Sales
```bash
# All sales
curl http://localhost:3000/api/sales

# Filter by product
curl "http://localhost:3000/api/sales?product_id=550e8400-e29b-41d4-a716-446655440000"

# Filter by date range
curl "http://localhost:3000/api/sales?start_date=2026-05-01&end_date=2026-05-31"

# Pagination
curl "http://localhost:3000/api/sales?limit=10&offset=0"
```

### 3. Get Daily Summary
```bash
curl "http://localhost:3000/api/sales/summary?start_date=2026-05-01&end_date=2026-05-31"
```

### 4. Bulk Upload CSV
```bash
curl -X POST http://localhost:3000/api/sales/bulk-upload \
  -F "file=@sales.csv"
```

**CSV Format:**
```csv
sku,sale_date,quantity
MILK-001,2026-05-05,10
CHEESE-001,2026-05-05,5
```

---

## Error Codes

| Code | Meaning | Fix |
|------|---------|-----|
| 201 | Created | Success |
| 200 | OK | Success |
| 400 | Bad Request | Check required fields, format |
| 422 | Invalid Data | Check UUID, qty > 0, date format, no future dates |
| 500 | Server Error | Check database connection |

---

## Validation Rules

### product_id
- **Format:** UUID v4
- **Example:** `550e8400-e29b-41d4-a716-446655440000`

### qty_sold
- **Type:** Integer
- **Range:** > 0
- **Invalid:** 0, -5, 10.5, "abc"

### sale_date
- **Format:** YYYY-MM-DD
- **Cannot:** Be in the future
- **Invalid:** 05/05/2026, 2026-05-32, future date

---

## Key Features

✅ **UPSERT:** Duplicate (product_id, sale_date) updates qty
✅ **Safe:** Parameterized queries prevent SQL injection
✅ **Validated:** UUID, date, quantity checking
✅ **Filtered:** Search by product, date range
✅ **Aggregated:** Daily totals with revenue calculation
✅ **Bulk:** CSV import with error reporting

---

## Common Scenarios

### Scenario 1: Record a Sale
```json
POST /api/sales
{
  "product_id": "550e8400-e29b-41d4-a716-446655440000",
  "qty_sold": 10,
  "sale_date": "2026-05-05"
}
```

### Scenario 2: Add More Sales (Same Product, Same Day)
```json
POST /api/sales
{
  "product_id": "550e8400-e29b-41d4-a716-446655440000",
  "qty_sold": 5,
  "sale_date": "2026-05-05"
}
```
Result: quantity becomes 15 (not duplicate)

### Scenario 3: View Sales History
```bash
GET /api/sales?product_id=550e8400-e29b-41d4-a716-446655440000
```

### Scenario 4: View Daily Revenue Report
```bash
GET /api/sales/summary?start_date=2026-05-01&end_date=2026-05-31
```

---

## Response Examples

### Success (201)
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

### Validation Error (422)
```json
{
  "message": "qty_sold must be greater than 0; sale_date cannot be in the future"
}
```

### Missing Field (422)
```json
{
  "message": "product_id is required"
}
```

---

## Testing

```bash
# Run all tests
npm test

# Run sales tests only
npm test -- sales.test.js

# Run specific test
npm test -- sales.test.js -t "should create a new sale"
```

---

## Database

### Table: sales
```sql
id               UUID (PRIMARY KEY)
product_id       UUID (FOREIGN KEY → products.id)
quantity         INTEGER (> 0)
sale_date        DATE
created_at       TIMESTAMPTZ (auto-set)
```

### Unique Index
```sql
CREATE UNIQUE INDEX idx_sales_product_date 
ON sales(product_id, sale_date);
```

This enables UPSERT functionality.

---

## Architecture

```
Request
  ↓
routes.js (POST /api/sales)
  ↓
validateSales middleware (UUID, qty, date)
  ↓
controller → createSale()
  ↓
service → upsertSale()
  ↓
Database (INSERT ON CONFLICT UPDATE)
  ↓
Response
```

---

## Code Files

| File | Purpose |
|------|---------|
| `routes/sales.routes.js` | Route definitions |
| `controllers/sales.controller.js` | HTTP handling |
| `services/sales.service.js` | Business logic & UPSERT |
| `middleware/validateSales.js` | Input validation |
| `config/schema.sql` | Database schema |

---

## File Modifications

All existing code has been updated with:
- Proper UPSERT logic using `ON CONFLICT`
- Parameterized queries (`$1, $2, etc`)
- Comprehensive input validation
- All required HTTP status codes
- Clean async/await error handling
- Production-ready error messages

---

## Notes

- All queries use parameterized statements (SQL injection safe)
- UUID validation uses regex matching
- Dates must be YYYY-MM-DD format
- UPSERT adds quantities (doesn't replace)
- Database enforces FK constraint (product must exist)
- Connection pool handles multiple concurrent requests
- Summary endpoint calculates revenue at query time

---

For full API documentation, see [SALES_API.md](./SALES_API.md)

For implementation details, see [SALES_IMPLEMENTATION.md](./SALES_IMPLEMENTATION.md)
