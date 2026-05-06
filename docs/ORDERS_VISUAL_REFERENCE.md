# Orders Page - Visual Reference

## Page Layout

### Desktop View (>1024px)
```
╔═══════════════════════════════════════════════════════════════════╗
║                        Orders Page                               ║
║                Create Sales Orders                               ║
╚═══════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────┬──────────────────────────────────┐
│                                 │                                  │
│       ADD ITEM TO CART          │       SHOPPING CART        (3)   │
│                                 │                                  │
│ Product *                       │  Item 1                       ✕  │
│ ┌──────────────────────────────┐│  • Organic Milk (MILK-001)      │
│ │ Search by name or SKU... ▼   ││  • Qty: 10 | 2026-05-05        │
│ │ ┌──────────────────────────┐ ││                                  │
│ │ │ Organic Milk (MILK-001)  │ ││  Item 2                       ✕  │
│ │ │ Cheddar Cheese (CHE-001) │ ││  • Cheddar Cheese (CHE-001)     │
│ │ │ Greek Yogurt (YOG-001)   │ ││  • Qty: 5 | 2026-05-05         │
│ │ └──────────────────────────┘ ││                                  │
│ │ Selected: Organic Milk        ││  Item 3                       ✕  │
│ │ (MILK-001)                    ││  • Butter (BUT-001)            │
│ │                                ││  • Qty: 2 | 2026-05-04         │
│ ├──────────────────────────────┐│                                  │
│ │ Quantity *                   ││  [   Clear Cart   ]             │
│ │ ┌──────────────────────────┐ ││                                  │
│ │ │ [5]                      │ ││  [→ Submit 3 Orders]          │
│ │ └──────────────────────────┘ ││                                  │
│ │                                ││  Success: ✓ Successfully        │
│ ├──────────────────────────────┐││  submitted 3 orders!           │
│ │ Sale Date *                  ││                                  │
│ │ ┌──────────────────────────┐ ││                                  │
│ │ │ [2026-05-05]             │ ││                                  │
│ │ └──────────────────────────┘ ││                                  │
│ │ Cannot be a future date      ││                                  │
│ │                                ││                                  │
│ ├──────────────────────────────┐││                                  │
│ │ [+ Add to Cart]              │││                                  │
│ └──────────────────────────────┘│                                  │
│                                 │                                  │
└─────────────────────────────────┴──────────────────────────────────┘
```

### Mobile View (<768px)
```
╔════════════════════════════════╗
║   Orders Page                  ║
║  Create Sales Orders          ║
╚════════════════════════════════╝

┌────────────────────────────────┐
│   ADD ITEM TO CART             │
├────────────────────────────────┤
│                                │
│ Product *                      │
│ ┌──────────────────────────┐   │
│ │ Search by name or SKU.. │   │
│ └──────────────────────────┘   │
│                                │
│ Quantity *                     │
│ ┌──────────────────────────┐   │
│ │ [5]                      │   │
│ └──────────────────────────┘   │
│                                │
│ Sale Date *                    │
│ ┌──────────────────────────┐   │
│ │ [2026-05-05]             │   │
│ └──────────────────────────┘   │
│                                │
│ [+ Add to Cart]                │
│                                │
└────────────────────────────────┘

┌────────────────────────────────┐
│ SHOPPING CART            (2)   │
├────────────────────────────────┤
│                                │
│ • Organic Milk             ✕   │
│   Qty: 10 | 2026-05-05        │
│                                │
│ • Cheddar Cheese           ✕   │
│   Qty: 5 | 2026-05-05         │
│                                │
│ [Clear Cart]                   │
│                                │
│ [→ Submit 2 Orders]           │
│                                │
└────────────────────────────────┘
```

---

## User Flow

### Complete Workflow

```
1. USER LANDS ON PAGE
   ↓
   ⟳ Loading products...
   ↓
   Products loaded
   Show dropdown

2. USER SEARCHES FOR PRODUCT
   ↓
   Types: "milk"
   ↓
   Filter products in real-time
   Show matching results

3. USER SELECTS PRODUCT
   ↓
   Click on "Organic Milk (MILK-001)"
   ↓
   Product selected
   Search clears
   Dropdown closes
   Show "Selected: Organic Milk"

4. USER ENTERS QUANTITY & DATE
   ↓
   Quantity: 10
   Date: 2026-05-05
   ↓
   Form ready to submit

5. USER CLICKS "ADD TO CART"
   ↓
   Validation:
   ├─ Product selected? ✓
   ├─ Quantity > 0? ✓
   ├─ Date valid? ✓
   ├─ Date not future? ✓
   ↓
   Check for duplicate
   (product_id + date)
   ↓
   Duplicate found?
   ├─ YES: Merge quantities
   └─ NO: Add as new item
   ↓
   Cart updated
   Form reset
   Show item in cart

6. REPEAT STEPS 2-5 (ADD MORE ITEMS)
   ↓
   Or skip to Submit

7. USER CLICKS "SUBMIT ORDERS"
   ↓
   Disable submit button
   Show loading spinner
   
   Loop through cart items:
   ├─ Item 1: POST /api/sales
   ├─ Item 2: POST /api/sales
   └─ Item 3: POST /api/sales
   
   (All in parallel with Promise.all)
   ↓
   Check results:
   ├─ All success? 
   │  ↓ YES: Clear cart, show success
   │
   └─ Any failures?
      ↓ YES: Show error details, keep cart

8. SUCCESS STATE
   ↓
   Show: "✓ Successfully submitted 3 orders!"
   Auto-hide after 5 seconds
   Cart cleared
   Form reset

9. USER STARTS OVER OR LEAVES
```

---

## Error Scenarios

### Scenario 1: Invalid Quantity
```
User enters: 0
Click: "Add to Cart"
      ↓
      Validation fails
      ↓
      Show error: "Quantity must be greater than 0"
      ↓
      Prevent add to cart
      ↓
      User can fix and retry
```

### Scenario 2: Future Date
```
User selects: 2026-05-10 (future)
Click: "Add to Cart"
      ↓
      Validation fails
      ↓
      Show error: "Sale date cannot be in the future"
      ↓
      Prevent add to cart
      ↓
      User can fix and retry
```

### Scenario 3: Duplicate Item
```
Cart before:
[{ product_id: "MILK", qty: 10, date: "2026-05-05" }]

User adds:
product: MILK, qty: 5, date: "2026-05-05"

      ↓
      Found duplicate!
      (same product_id + date)
      ↓
      Merge quantities: 10 + 5 = 15
      ↓
Cart after:
[{ product_id: "MILK", qty: 15, date: "2026-05-05" }]
```

### Scenario 4: Submit Failure
```
Cart:
[Item 1, Item 2, Item 3]

Click: "Submit Orders"
      ↓
      Start submission...
      ├─ Item 1: ✓ Success
      ├─ Item 2: ✗ Fail (Product not found)
      └─ Item 3: ✓ Success
      ↓
      Show error:
      "Failed to submit 1 order(s):
       Item 2: product_id does not exist"
      ↓
      Cart NOT cleared
      User can fix and retry
```

---

## State Transitions

### Form State
```
Initial:
┌─────────────────────────────┐
│ selectedProductId: ""       │
│ quantity: ""                │
│ saleDate: ""                │
│ searchTerm: ""              │
└─────────────────────────────┘
         ↓ User types in search
┌─────────────────────────────┐
│ selectedProductId: ""       │
│ quantity: ""                │
│ saleDate: ""                │
│ searchTerm: "milk"          │ ← Update
│ showDropdown: true          │ ← Update
└─────────────────────────────┘
         ↓ User selects product
┌─────────────────────────────┐
│ selectedProductId: "uuid"   │ ← Update
│ quantity: ""                │
│ saleDate: ""                │
│ searchTerm: ""              │ ← Clear
│ showDropdown: false         │ ← Close
└─────────────────────────────┘
         ↓ User enters quantity & date
┌─────────────────────────────┐
│ selectedProductId: "uuid"   │
│ quantity: "10"              │ ← Update
│ saleDate: "2026-05-05"      │ ← Update
│ searchTerm: ""              │
│ showDropdown: false         │
└─────────────────────────────┘
         ↓ User clicks "Add to Cart"
         ↓ Form validates
         ↓ Item added to cart
┌─────────────────────────────┐
│ selectedProductId: ""       │ ← Reset
│ quantity: ""                │ ← Reset
│ saleDate: ""                │ ← Reset
│ searchTerm: ""              │
│ showDropdown: false         │
└─────────────────────────────┘
```

### Cart State
```
Initial:
┌──────────────────────────────┐
│ cart: []                     │
│ Empty cart message shown     │
└──────────────────────────────┘

After 1st Add:
┌──────────────────────────────┐
│ cart: [                      │
│   {                          │
│     product_id: "milk-id",   │
│     productName: "Milk",     │
│     qty_sold: 10,            │
│     sale_date: "2026-05-05"  │
│   }                          │
│ ]                            │
│ Cart count: 1                │
│ Items shown                  │
└──────────────────────────────┘

After 2nd Add (duplicate):
┌──────────────────────────────┐
│ cart: [                      │
│   {                          │
│     product_id: "milk-id",   │
│     productName: "Milk",     │
│     qty_sold: 15,  ← Merged! │
│     sale_date: "2026-05-05"  │
│   }                          │
│ ]                            │
│ Cart count: 1                │
│ Still 1 item (merged)        │
└──────────────────────────────┘

After 3rd Add (different product):
┌──────────────────────────────┐
│ cart: [                      │
│   {                          │
│     product_id: "milk-id",   │
│     productName: "Milk",     │
│     qty_sold: 15,            │
│     sale_date: "2026-05-05"  │
│   },                         │
│   {                          │
│     product_id: "cheese-id", │
│     productName: "Cheese",   │
│     qty_sold: 5,             │
│     sale_date: "2026-05-05"  │
│   }                          │
│ ]                            │
│ Cart count: 2                │
│ 2 items shown                │
└──────────────────────────────┘
```

---

## Messages

### Validation Errors
```
❌ "Please select a product"
❌ "Quantity must be greater than 0"
❌ "Please select a sale date"
❌ "Sale date cannot be in the future"
```

### Submit Errors
```
❌ "Failed to submit 1 order(s):
   Item: Product Name
   Error: product_id does not exist"

❌ "Error submitting orders: Network timeout"
```

### Success Messages
```
✓ "Successfully submitted 3 orders!"
(Auto-hides after 5 seconds)
```

### Loading States
```
⟳ "Loading products..."
⟳ "Submitting 3 orders..."
```

---

## Color Codes

| Element | Color | Hex | Use |
|---------|-------|-----|-----|
| Primary Button | Blue | #3b82f6 | "Add to Cart" |
| Submit Button | Green | #10b981 | "Submit Orders" |
| Remove Button | Red | #ef4444 | Remove item |
| Clear Button | Gray | #6b7280 | "Clear Cart" |
| Error Background | Light Red | #fef2f2 | Error box |
| Error Text | Dark Red | #991b1b | Error message |
| Success Background | Light Green | #f0fdf4 | Success box |
| Success Text | Dark Green | #047857 | Success message |
| Input Border | Gray | #d1d5db | Form inputs |
| Input Focus | Blue | #3b82f6 | Focused input |
| Badge | Blue | #3b82f6 | Cart count badge |

---

## Responsive Breakpoints

```
Desktop:        >1024px  Two-column layout
                         (Form | Cart)

Tablet:         768-1024px Two-column layout
                         (tighter spacing)

Mobile:         <768px   Single column
                         (Form above Cart)
                         Touch-optimized
```

---

## Animation Timings

```
Success message fade-in:     0.3s ease-out
Loading spinner rotate:      1s linear (infinite)
Button hover transition:     0.2s
Focus box shadow:            0.2s
Dropdown slide:              Instant (faster on mobile)
```

---

## Keyboard Shortcuts

| Key | Function |
|-----|----------|
| Tab | Navigate to next field |
| Shift+Tab | Navigate to previous field |
| Enter | Select dropdown item / Submit form |
| Escape | Close dropdown |
| ArrowUp/Down | Navigate dropdown items (optional) |

---

## Testing Scenarios

### Happy Path
```
1. Page loads → Products shown ✓
2. Search product → Results shown ✓
3. Select product → Product shown ✓
4. Enter qty/date → Form filled ✓
5. Click Add → Item in cart ✓
6. Click Submit → Success message ✓
7. Cart cleared → Page reset ✓
```

### Duplicate Detection
```
1. Add: MILK, 10, 2026-05-05 → Cart count = 1 ✓
2. Add: MILK, 5, 2026-05-05 → Cart count = 1, qty = 15 ✓
3. Add: MILK, 8, 2026-05-06 → Cart count = 2 ✓
```

### Error Handling
```
1. Empty product field → Show error ✓
2. Qty = 0 → Show error ✓
3. Future date → Show error ✓
4. Submit fails → Show error details ✓
5. Cart stays → Can retry ✓
```

---

## Summary

The Orders page provides a complete retail sales interface with:

✅ Intuitive product selection
✅ Smart duplicate detection (merge quantities)
✅ Comprehensive form validation
✅ Real-time visual feedback
✅ Smooth error handling
✅ Responsive mobile design
✅ Accessible to all users
✅ Production-ready code

**Ready to use!** 🚀
