# UPSERT Logic - Visual Guide

## What is UPSERT?

**UPSERT** = **UP**date or in**SERT**

It's a single operation that:
- **INSERT**s a new record if it doesn't exist
- **UPDATE**s an existing record if it already exists

---

## Sales Table UPSERT Setup

### Unique Constraint
```sql
CREATE UNIQUE INDEX idx_sales_product_date 
ON sales(product_id, sale_date);
```

This index ensures:
- Only ONE sale record per `(product_id, sale_date)` combination
- Multiple sales of same product on same day → UPDATE the quantity
- Different dates or different products → INSERT new records

---

## Visual Example: UPSERT in Action

### Scenario: Milk Sales on 2026-05-05

#### Step 1: First Sale (Insert)
```
POST /api/sales
{
  "product_id": "550e8400-e29b-41d4-a716-446655440000",
  "qty_sold": 10,
  "sale_date": "2026-05-05"
}

Database (Before):
(empty)

Database (After):
┌─────────────────────────────────────────────────────┐
│ id  │ product_id │ quantity │ sale_date  │ created_at │
├─────────────────────────────────────────────────────┤
│ 001 │ 550e8400.. │   10     │ 2026-05-05 │ 2026-05-05 │
└─────────────────────────────────────────────────────┘

Response: 201 Created
{
  "id": "001",
  "quantity": 10,
  ...
}
```

#### Step 2: Second Sale - Same Product, Same Day (Update)
```
POST /api/sales
{
  "product_id": "550e8400-e29b-41d4-a716-446655440000",
  "qty_sold": 5,
  "sale_date": "2026-05-05"
}

Database (Before):
┌─────────────────────────────────────────────────────┐
│ id  │ product_id │ quantity │ sale_date  │ created_at │
├─────────────────────────────────────────────────────┤
│ 001 │ 550e8400.. │   10     │ 2026-05-05 │ 2026-05-05 │
└─────────────────────────────────────────────────────┘

Database (After):
┌─────────────────────────────────────────────────────┐
│ id  │ product_id │ quantity │ sale_date  │ created_at │
├─────────────────────────────────────────────────────┤
│ 001 │ 550e8400.. │   15     │ 2026-05-05 │ 2026-05-05 │  ← Updated!
└─────────────────────────────────────────────────────┘

Response: 201 Created (still 201, even though it updated)
{
  "id": "001",
  "quantity": 15,  ← Quantity increased by 5
  ...
}
```

#### Step 3: Third Sale - Same Product, Different Day (Insert)
```
POST /api/sales
{
  "product_id": "550e8400-e29b-41d4-a716-446655440000",
  "qty_sold": 8,
  "sale_date": "2026-05-06"
}

Database (Before):
┌─────────────────────────────────────────────────────┐
│ id  │ product_id │ quantity │ sale_date  │ created_at │
├─────────────────────────────────────────────────────┤
│ 001 │ 550e8400.. │   15     │ 2026-05-05 │ 2026-05-05 │
└─────────────────────────────────────────────────────┘

Database (After):
┌─────────────────────────────────────────────────────┐
│ id  │ product_id │ quantity │ sale_date  │ created_at │
├─────────────────────────────────────────────────────┤
│ 001 │ 550e8400.. │   15     │ 2026-05-05 │ 2026-05-05 │
│ 002 │ 550e8400.. │    8     │ 2026-05-06 │ 2026-05-06 │  ← New record!
└─────────────────────────────────────────────────────┘

Response: 201 Created
{
  "id": "002",
  "quantity": 8,
  ...
}
```

---

## How UPSERT Works (SQL)

### The Query
```sql
INSERT INTO sales (product_id, quantity, sale_date)
VALUES ($1, $2, $3)
ON CONFLICT (product_id, sale_date)
DO UPDATE SET quantity = sales.quantity + EXCLUDED.quantity
RETURNING id, product_id, quantity, sale_date, created_at
```

### Step-by-Step Breakdown

1. **INSERT Attempt**
   ```sql
   INSERT INTO sales (product_id, quantity, sale_date)
   VALUES ($1, $2, $3)
   ```
   Try to insert a new record

2. **Conflict Detection**
   ```sql
   ON CONFLICT (product_id, sale_date)
   ```
   If this combination already exists (unique constraint violation)

3. **Update Instead**
   ```sql
   DO UPDATE SET quantity = sales.quantity + EXCLUDED.quantity
   ```
   Add the new quantity to the existing quantity
   - `sales.quantity` = current quantity in table
   - `EXCLUDED.quantity` = quantity we tried to insert
   - Result = old quantity + new quantity

4. **Return Result**
   ```sql
   RETURNING id, product_id, quantity, sale_date, created_at
   ```
   Return the record (either new or updated)

---

## Parameter Safety (SQL Injection Prevention)

### ✅ SAFE - Parameterized Query
```javascript
const query = `
  INSERT INTO sales (product_id, quantity, sale_date)
  VALUES ($1, $2, $3)
  ON CONFLICT (product_id, sale_date)
  DO UPDATE SET quantity = sales.quantity + EXCLUDED.quantity
  RETURNING ...
`;

const result = await pool.query(query, [product_id, qty_sold, sale_date]);
```

Parameters are passed separately:
- `$1` = product_id (safely escaped)
- `$2` = qty_sold (safely typed)
- `$3` = sale_date (safely escaped)

### ❌ UNSAFE - String Concatenation (Never Used)
```javascript
// NEVER DO THIS!
const query = `
  INSERT INTO sales VALUES (
    '${product_id}',
    '${qty_sold}',
    '${sale_date}'
  )
`;
```

Attacker could inject SQL:
```
product_id = "'; DROP TABLE sales; --"
```

---

## Decision Tree: Insert vs Update

```
                  POST /api/sales
                       │
                       ▼
              Extract parameters
         (product_id, qty_sold, sale_date)
                       │
                       ▼
                Try to INSERT
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
   No conflict            Unique constraint
   (First time)            violated (Duplicate)
         │                           │
         ▼                           ▼
    INSERT new              UPDATE existing
    quantity = X          quantity = X + Y
         │                           │
         └─────────────┬─────────────┘
                       │
                       ▼
              RETURN result record
                       │
                       ▼
            Response 201 Created
          (same for both insert & update)
```

---

## Real-World Example

### Morning Sales
```
Time:     08:00 AM
Request:  POST /api/sales
Body:     qty_sold=10, product_id="MILK-UUID", sale_date="2026-05-05"
Action:   INSERT (first sale of the day)
DB:       quantity = 10
```

### Mid-Day Restock Check
```
Time:     02:00 PM
Request:  POST /api/sales
Body:     qty_sold=5, product_id="MILK-UUID", sale_date="2026-05-05"
Action:   UPDATE (same product, same day)
DB:       quantity = 10 + 5 = 15
```

### Next Day
```
Time:     08:00 AM (next day)
Request:  POST /api/sales
Body:     qty_sold=12, product_id="MILK-UUID", sale_date="2026-05-06"
Action:   INSERT (new day, new record)
DB:       Two records:
          - 2026-05-05: quantity = 15
          - 2026-05-06: quantity = 12
```

---

## Why UPSERT is Better Than Alternatives

### Without UPSERT (What We Avoid)
```javascript
// BAD: Multiple queries, race conditions possible
async function addSale(product_id, qty, sale_date) {
  // Check if exists
  const exists = await pool.query(
    "SELECT id FROM sales WHERE product_id = $1 AND sale_date = $2",
    [product_id, sale_date]
  );
  
  if (exists.rows.length > 0) {
    // Update
    await pool.query(
      "UPDATE sales SET quantity = quantity + $1 WHERE product_id = $2 AND sale_date = $3",
      [qty, product_id, sale_date]
    );
  } else {
    // Insert
    await pool.query(
      "INSERT INTO sales (product_id, quantity, sale_date) VALUES ($1, $2, $3)",
      [product_id, qty, sale_date]
    );
  }
}
```

**Problems:**
- Race condition: Record deleted between check and insert
- Multiple queries = slower
- More application code = more bugs
- Not atomic (not all-or-nothing)

### With UPSERT (What We Use)
```javascript
// GOOD: Single atomic operation
async function addSale(product_id, qty, sale_date) {
  const query = `
    INSERT INTO sales (product_id, quantity, sale_date)
    VALUES ($1, $2, $3)
    ON CONFLICT (product_id, sale_date)
    DO UPDATE SET quantity = sales.quantity + EXCLUDED.quantity
    RETURNING *
  `;
  
  return await pool.query(query, [product_id, qty, sale_date]);
}
```

**Advantages:**
- ✅ Atomic (no race conditions)
- ✅ Single query (faster)
- ✅ Less code (easier to understand)
- ✅ Guaranteed consistency
- ✅ PostgreSQL handles all edge cases

---

## Testing UPSERT

```bash
# First request - INSERT
curl -X POST http://localhost:3000/api/sales \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "550e8400-e29b-41d4-a716-446655440000",
    "qty_sold": 10,
    "sale_date": "2026-05-05"
  }'

# Response: quantity = 10

# Second request - UPDATE (same product, same date)
curl -X POST http://localhost:3000/api/sales \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "550e8400-e29b-41d4-a716-446655440000",
    "qty_sold": 5,
    "sale_date": "2026-05-05"
  }'

# Response: quantity = 15 (10 + 5)

# Check the database
SELECT * FROM sales WHERE product_id = '550e8400-e29b-41d4-a716-446655440000';

# Result: Only ONE record with quantity = 15
```

---

## Summary

| Aspect | Behavior |
|--------|----------|
| **Same (product_id, sale_date)** | Quantities ADD together |
| **Different date, same product** | Creates NEW record |
| **Different product, same date** | Creates NEW record |
| **Atomic operation** | Yes (no race conditions) |
| **Performance** | Optimized (single query) |
| **Code safety** | Parameterized queries |
| **HTTP Status** | Always 201 (same for insert & update) |

---

For more details, see [SALES_IMPLEMENTATION.md](./SALES_IMPLEMENTATION.md#upsert-logic-service)
