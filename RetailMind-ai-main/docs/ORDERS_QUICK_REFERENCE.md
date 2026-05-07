# Orders Component - Quick Reference

## File Locations
```
frontend/src/pages/Orders.tsx        ← Main component
frontend/src/styles/Orders.css       ← Styles
docs/ORDERS_COMPONENT.md             ← Full documentation
```

---

## Component Overview

A complete React Orders page for retail sales with:
- ✅ Product search dropdown
- ✅ Add to cart with quantity
- ✅ Date picker (no future dates)
- ✅ Duplicate detection (merge by product_id + date)
- ✅ Cart management
- ✅ Bulk order submission
- ✅ Loading & error states
- ✅ Success messaging

---

## Key Features

### 1. Product Search
```typescript
// User types in search box
→ Filters products by name or SKU
→ Shows dropdown with matches
→ Click to select product
```

### 2. Form Validation
```
✓ Product: required
✓ Quantity: must be integer > 0
✓ Date: required, cannot be future
→ Shows errors inline
```

### 3. Add to Cart
```typescript
// First add
qty: 10, product: MILK, date: 2026-05-05
→ Added to cart

// Second add (same product, same date)
qty: 5, product: MILK, date: 2026-05-05
→ MERGED: qty becomes 15

// Third add (same product, different date)
qty: 8, product: MILK, date: 2026-05-06
→ NEW entry (different date)
```

### 4. Cart Management
```
- View all items
- See product name, SKU, qty, date
- Remove individual items
- Clear entire cart
- Cart count badge
```

### 5. Submit Orders
```typescript
// Submit button sends all cart items to /api/sales
→ Each item: POST /api/sales { product_id, qty_sold, sale_date }
→ Parallel submission (Promise.all)
→ Show success/error messages
→ Clear cart on success
```

---

## Usage

### Import
```typescript
import Orders from './pages/Orders';
```

### Add to Router
```typescript
<Route path="/orders" element={<Orders />} />
```

### Required APIs
```
GET /api/products
→ Expected: [{ id, name, sku, price, category }, ...]

POST /api/sales
← { product_id, qty_sold, sale_date }
→ { data: { id, product_id, quantity, sale_date, created_at }, message }
```

---

## State Structure

```typescript
// Form state
selectedProductId: string        // UUID of selected product
quantity: string                 // Quantity input
saleDate: string                 // YYYY-MM-DD
searchTerm: string              // Product search text

// Products
products: Product[]             // Fetched from API
productsLoading: boolean        // Loading indicator
productsError: string           // Error message if failed

// Cart
cart: CartItem[]                // Array of items to submit

// Submit
isSubmitting: boolean           // Submission in progress
submitMessage: string           // Success message
submitError: string             // Error message
showSuccessMessage: boolean     // Show/hide success
```

---

## Component Lifecycle

```
1. Mount
   ↓
2. Fetch products (useEffect)
   ↓
3. Display products dropdown
   ↓
4. User fills form & clicks "Add to Cart"
   ↓
5. Validate form
   → If error: show message, return
   → If OK: check for duplicates
   ↓
6. Duplicate found?
   → YES: merge quantities
   → NO: add new item
   ↓
7. Reset form, update cart display
   ↓
8. User clicks "Submit Orders"
   ↓
9. Submit all cart items via POST /api/sales
   ↓
10. Success?
    → YES: show message, clear cart
    → NO: show errors, keep cart
```

---

## Main Functions

| Function | Purpose |
|----------|---------|
| `fetchProducts()` | GET /api/products on mount |
| `validateForm()` | Check all form fields valid |
| `findProductById()` | Get product from ID |
| `getFilteredProducts()` | Filter by search term |
| `findCartItem()` | Check if item exists by product_id + date |
| `handleAddToCart()` | Add item or merge duplicate |
| `handleRemoveFromCart()` | Remove item by index |
| `handleClearCart()` | Clear all items (with confirmation) |
| `handleSubmitOrders()` | POST each cart item to /api/sales |

---

## Error Handling

### Product Loading
```
If fetch fails:
→ Show error message
→ User can still see form (empty products though)
→ Can't proceed without products
```

### Form Validation
```
If form invalid:
→ Show error message inline
→ Don't add to cart
→ User can fix and retry
```

### Order Submission
```
If any item fails:
→ Show which items failed + error details
→ Keep cart intact (user can retry)
→ Only clear if ALL succeed

If all succeed:
→ Show success message (5 sec)
→ Clear cart
→ Reset form
```

---

## Styling Classes

```css
/* Sections */
.orders-container       /* Main wrapper */
.orders-form-section    /* Left side: form */
.orders-cart-section    /* Right side: cart */

/* Form Elements */
.form-group            /* Input wrapper */
.form-input            /* Text/number inputs */
.search-input          /* Product search box */
.dropdown-menu         /* Product dropdown */
.dropdown-item         /* Single dropdown item */

/* Cart */
.cart-items            /* List of items */
.cart-item             /* Single item */
.cart-count            /* Badge showing count */
.empty-cart-message    /* Empty state */

/* Messages */
.error-message         /* Red error box */
.success-message       /* Green success box */
.loading-message       /* Blue loading box */

/* Buttons */
.btn                   /* Base button */
.btn-primary           /* Blue add button */
.btn-submit            /* Green submit button */
.btn-secondary         /* Gray clear button */
.btn-remove            /* Red remove button */
```

---

## API Response Handling

### Success Response
```json
{
  "data": {
    "id": "uuid",
    "product_id": "uuid",
    "quantity": 10,
    "sale_date": "2026-05-05",
    "created_at": "2026-05-05T14:30:00Z"
  },
  "message": "Sale created"
}
```

### Error Response
```json
{
  "message": "qty_sold must be greater than 0"
}
```

---

## Testing Scenarios

### Manual Test Checklist
- [ ] Products load on page load
- [ ] Can search products by name
- [ ] Can search products by SKU
- [ ] Product selection works
- [ ] Quantity validation (0 = error)
- [ ] Date picker works
- [ ] Future dates show error
- [ ] Add to cart works
- [ ] Duplicate items merge quantities
- [ ] Can remove items
- [ ] Can clear cart
- [ ] Cart shows correct count
- [ ] Submit with empty cart shows error
- [ ] Submit with items works
- [ ] Success message appears
- [ ] Cart clears after success
- [ ] Mobile layout responsive
- [ ] All buttons functional
- [ ] Form errors display correctly
- [ ] Loading states work

---

## Customization Examples

### Change Success Message Wait Time
```typescript
// In handleSubmitOrders
setTimeout(() => setShowSuccessMessage(false), 3000); // 3 seconds instead of 5
```

### Add Product Category Filter
```typescript
// Add state
const [selectedCategory, setSelectedCategory] = useState('');

// Update getFilteredProducts
const getFilteredProducts = (): Product[] => {
  let filtered = products;
  
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term)
    );
  }
  
  if (selectedCategory) {
    filtered = filtered.filter(p => p.category === selectedCategory);
  }
  
  return filtered;
};
```

### Add Quantity Increment/Decrement Buttons
```typescript
// Instead of text input
<button onClick={() => setQuantity(Math.max(1, parseInt(quantity) - 1))}>−</button>
<span>{quantity}</span>
<button onClick={() => setQuantity(parseInt(quantity) + 1)}>+</button>
```

### Persist Cart to localStorage
```typescript
// Save cart
useEffect(() => {
  localStorage.setItem('orders-cart', JSON.stringify(cart));
}, [cart]);

// Load cart on mount
useEffect(() => {
  const savedCart = localStorage.getItem('orders-cart');
  if (savedCart) {
    setCart(JSON.parse(savedCart));
  }
}, []);
```

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Products not showing | API endpoint wrong | Check `/api/products` URL |
| Can't select product | Products array empty | Check API response format |
| Duplicate items not merging | Cart lookup failing | Check product_id + date comparison |
| Submit button disabled | Cart empty or form error | Add items to cart, check validation |
| Success message not showing | Message cleared too fast | Check setTimeout value |
| Mobile layout broken | CSS media queries | Check Orders.css responsive section |
| Dates always rejected | Timezone issue | Ensure server/client time synced |
| Cart won't clear | localStorage blocking | Check browser storage settings |

---

## Performance Tips

- ✅ Products fetched once on mount
- ✅ Parallel submission (Promise.all)
- ✅ No unnecessary re-renders
- ✅ Efficient duplicate detection
- ✅ Optimized CSS (no external libs)

---

## Browser Support

✅ Chrome 90+
✅ Firefox 88+
✅ Safari 14+
✅ Edge 90+
✅ Mobile browsers

---

## Dependencies

```json
{
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

No external UI libraries needed!

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Tab | Navigate form elements |
| Enter | Select dropdown item / Submit form |
| Escape | Close dropdown |
| Delete | Remove cart item |

---

## Accessibility

✅ Proper `<label>` elements
✅ Semantic HTML structure
✅ ARIA labels where needed
✅ Keyboard navigation
✅ Color contrast WCAG AA
✅ Focus indicators visible

---

## Next Steps

1. **Import component:**
   ```typescript
   import Orders from './pages/Orders';
   ```

2. **Add to router:**
   ```typescript
   <Route path="/orders" element={<Orders />} />
   ```

3. **Test endpoints:**
   - Verify `/api/products` returns data
   - Verify `/api/sales` accepts POST

4. **Test component:**
   - Load page
   - Search for product
   - Add to cart
   - Submit order

5. **Customize if needed:**
   - Change colors/fonts in CSS
   - Add filters
   - Persist cart to localStorage

---

## Full Documentation

See [ORDERS_COMPONENT.md](./ORDERS_COMPONENT.md) for complete details

---

**Status:** Production Ready ✅
**Last Updated:** May 5, 2026
**Version:** 1.0.0
