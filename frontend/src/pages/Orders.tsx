import React, { useState, useEffect, useMemo } from 'react';
import '../styles/Orders.css';
import { createSale, deleteSale, exportSalesCsv, getProducts, getSales, uploadSalesCsv, type Product, type Sale } from '../services/api';

interface CartItem {
  product_id: string;
  productName: string;
  sku: string;
  qty_sold: number;
  sale_date: string;
}

const Orders: React.FC = () => {
  // Form state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [saleDate, setSaleDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');
  const [apiAvailable, setApiAvailable] = useState(true);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);

  // Sales history state
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [salesError, setSalesError] = useState('');
  const [salesSearch, setSalesSearch] = useState('');
  const [historyPage, setHistoryPage] = useState(1);

  // CSV Upload state
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');
  const [showUploadSuccess, setShowUploadSuccess] = useState(false);

  // ============================================================================
  // FETCH PRODUCTS
  // ============================================================================

  const loadProducts = async () => {
    try {
      setProductsLoading(true);
      setProductsError('');
      const res = await getProducts() as Product[] | { data?: Product[] };
      const productList = Array.isArray(res) ? res : res.data || [];
      const productsArray = Array.isArray(productList) ? productList : [];
      console.log("[DEBUG] Total products fetched from backend:", productsArray.length);
      console.log("[DEBUG] Loaded products:", productsArray);
      setProducts(productsArray);
      setApiAvailable(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load products';
      setProductsError(errorMessage);
      setProducts([]);
      setApiAvailable(false);
      console.error('Error fetching products:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const loadSales = async () => {
    try {
      setSalesLoading(true);
      setSalesError('');
      const response: any = await getSales();
      console.log('Sales data:', response);
      setSales(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load order history';
      setSalesError(errorMessage);
      setSales([]);
      console.error('Error fetching sales:', error);
    } finally {
      setSalesLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Get today's date in YYYY-MM-DD format
   */
  const getTodayDate = (): string => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const formatDateKey = (value: string | undefined): string => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value.slice(0, 10) : date.toISOString().split('T')[0];
  };

  const isValidDateKey = (value: string): boolean => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00`);
    return !Number.isNaN(date.getTime()) && value <= getTodayDate();
  };

 const formatSubmitDate = (value: string): string => {
  return value;
};

  /**
   * Get max date (today) for date picker
   */
  const getMaxDate = (): string => {
    return getTodayDate();
  };

  /**
   * Find product by ID
   */
  const findProductById = (id: string): Product | undefined => {
    return products.find((p) => p.id === id);
  };

  const findProductForSale = (sale: Sale): Product | undefined => {
    return products.find((p) => p.id === sale.product_id || p.sku === sale.sku);
  };



  /**
   * Check if item exists in cart (by product_id and sale_date)
   */
  const findCartItem = (productId: string, date: string): CartItem | undefined => {
    return cart.find((item) => item.product_id === productId && item.sale_date === date);
  };

  /**
   * Validate form inputs
   */
  const validateForm = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const fields: string[] = [];

    if (!selectedProductId) {
      errors.push('Please select a product');
      fields.push('product');
    }

    if (!quantity || parseInt(quantity) <= 0) {
      errors.push('Quantity must be greater than 0');
      fields.push('quantity');
    }

    if (!saleDate) {
      errors.push('Please select a sale date');
      fields.push('saleDate');
    } else {
      const formattedDate = formatSubmitDate(saleDate);
      if (!formattedDate || formattedDate > getTodayDate()) {
        errors.push('Sale date cannot be in the future');
        fields.push('saleDate');
      }
    }

    setInvalidFields(fields);

    return {
      valid: errors.length === 0,
      errors,
    };
  };

  // ============================================================================
  // FORM HANDLERS
  // ============================================================================

  const handleProductSelect = (product: Product) => {
  setSelectedProductId(product.id);
  setSearchTerm(product.name);
  setShowDropdown(false);

  setInvalidFields((fields) =>
    fields.filter((field) => field !== 'product')
  );

  document.getElementById('quantity')?.focus();
};

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value;

  setSearchTerm(value);
  setShowDropdown(true);

  // Clear selected product ONLY if user manually edits field
  if (selectedProductId && value !== selectedProduct?.name) {
    setSelectedProductId('');
  }

  setInvalidFields((fields) =>
    fields.filter((field) => field !== 'product')
  );
};

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuantity(e.target.value);
    setInvalidFields((fields) => fields.filter((field) => field !== 'quantity'));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSaleDate(e.target.value);
    setInvalidFields((fields) => fields.filter((field) => field !== 'saleDate'));
  };

  /**
   * Handle Add to Cart button click
   */
  const handleAddToCart = () => {
    const validation = validateForm();

    if (!validation.valid) {
      setSubmitError(validation.errors.join('; '));
      return;
    }

    const product = findProductById(selectedProductId);
    if (!product) {
      setSubmitError('Product not found');
      return;
    }

    const qty = parseInt(quantity);

    // Prevent overselling - validate against available stock
    const existingQtyInCart = cart
      .filter((i) => i.product_id === selectedProductId)
      .reduce((sum, i) => sum + i.qty_sold, 0);

    if (qty + existingQtyInCart > product.stock) {
      setSubmitError(
        `Cannot sell more than available stock. Available: ${product.stock}, ` +
        `Already in cart: ${existingQtyInCart}, Trying to add: ${qty}`
      );
      return;
    }

    setSubmitError('');

    // Check if item already exists in cart
    const existingItem = findCartItem(selectedProductId, saleDate);

    if (existingItem) {
      // Merge quantities
      setCart((prevCart) =>
        prevCart.map((item) =>
          item.product_id === selectedProductId && item.sale_date === saleDate
            ? { ...item, qty_sold: item.qty_sold + qty }
            : item
        )
      );
    } else {
      // Add new item
      setCart((prevCart) => [
        ...prevCart,
        {
          product_id: selectedProductId,
          productName: product.name,
          sku: product.sku,
          qty_sold: qty,
          sale_date: formatSubmitDate(saleDate),
        },
      ]);
    }

    // Reset form
    setSelectedProductId('');
    setQuantity('');
    setSaleDate('');
    setSearchTerm('');
    setInvalidFields([]);
  };

  /**
   * Handle Remove from Cart
   */
  const handleRemoveFromCart = (index: number) => {
    setCart((prevCart) => prevCart.filter((_, i) => i !== index));
  };

  /**
   * Handle Clear Cart
   */
  const handleClearCart = () => {
    if (window.confirm('Clear all items from cart?')) {
      setCart([]);
    }
  };

  const escapeCsvValue = (value: string | number): string => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const buildCsvRows = (): string[][] => {
    if (cart.length > 0) {
      return cart.map((item) => [
        item.productName,
        item.sku,
        String(item.qty_sold),
        formatDateKey(item.sale_date),
      ]);
    }

    return sales.map((sale) => {
      const product = findProductForSale(sale);
      return [
        sale.name || product?.name || 'Unknown product',
        sale.sku || product?.sku || '',
        String(sale.qty_sold || 0),
        formatDateKey(sale.sale_date || sale.createdAt),
      ];
    });
  };

  const buildSalesTrainingCsvRows = (): string[][] => {
    return sales.map((sale) => {
      const product = findProductForSale(sale);
      return [
        sale.sku || product?.sku || '',
        formatDateKey(sale.sale_date || sale.createdAt),
        String(sale.qty_sold || 0),
      ];
    });
  };

  const handleExportCsv = () => {
    const rows = buildCsvRows();
    if (rows.length === 0) {
      setSubmitError('No cart or order history data available to export');
      return;
    }

    const csv = [
      ['product_name', 'sku', 'quantity', 'sale_date'],
      ...rows,
    ]
      .map((row) => row.map(escapeCsvValue).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders-${getTodayDate()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportSalesCsv = () => {
    exportSalesCsv()
      .then(() => {
        console.log("CSV exported successfully");
      })
      .catch((error) => {
        setSubmitError(`Failed to export CSV: ${error.message}`);
      });
  };

  /**
   * Delete a sale from history
   */
  const handleDeleteSale = async (saleId: string, productName: string) => {
    if (!window.confirm(`Are you sure you want to delete the sale for ${productName}? Stock will be restored.`)) {
      return;
    }

    try {
      await deleteSale(saleId);
      setSubmitMessage(`✓ Deleted sale for ${productName}`);
      setShowSuccessMessage(true);
      
      // Reload sales
      await loadSales();
      window.dispatchEvent(new CustomEvent('retailmind:sales-updated'));
      localStorage.setItem('retailmind:sales-updated', String(Date.now()));

      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete sale';
      setSubmitError(`Failed to delete sale: ${errorMessage}`);
    }
  };

  /**
   * Handle CSV file upload
   */
  const handleCsvFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) {
      return;
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setUploadError('Please select a valid CSV file');
      return;
    }

    setIsUploadingCsv(true);
    setUploadError('');
    setUploadMessage('');
    setShowUploadSuccess(false);

    try {
      const response = await uploadSalesCsv(file);
      const rowCount = response.insertedCount ?? response.uploadedRows ?? 0;
      
      setUploadMessage(`✓ Uploaded ${rowCount} sales row${rowCount !== 1 ? 's' : ''}`);
      setShowUploadSuccess(true);

      // Reload sales history
      await loadSales();
      window.dispatchEvent(new CustomEvent('retailmind:sales-updated'));
      localStorage.setItem('retailmind:sales-updated', String(Date.now()));

      // Hide success message after 5 seconds
      setTimeout(() => {
        setShowUploadSuccess(false);
      }, 5000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload CSV';
      setUploadError(`CSV upload failed: ${errorMessage}`);
    } finally {
      setIsUploadingCsv(false);
      // Reset file input
      event.target.value = '';
    }
  };

  // ============================================================================
  // SUBMIT ORDERS
  // ============================================================================

  /**
   * Submit all orders to the server
   */
  const handleSubmitOrders = async () => {
    if (cart.length === 0) {
      setSubmitError('Cart is empty');
      return;
    }

    const validationErrors = cart.flatMap((item, index) => {
      const errors: string[] = [];
      const formattedDate = formatSubmitDate(item.sale_date);

      if (!item.product_id) {
        errors.push(`Line ${index + 1}: product is required`);
      }

      if (!Number.isFinite(item.qty_sold) || item.qty_sold <= 0) {
        errors.push(`Line ${index + 1}: quantity must be greater than 0`);
      }

      if (!formattedDate || formattedDate > getTodayDate()) {
        errors.push(`Line ${index + 1}: sale date must be valid and cannot be in the future`);
      }

      return errors;
    });

    if (validationErrors.length > 0) {
      setSubmitError(validationErrors.join('\n'));
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    setSubmitMessage('');
    setShowSuccessMessage(false);

    try {
      const results = await Promise.all(
        cart.map((item) => {
          const payload = {
            product_id: item.product_id,
            qty_sold: Number(item.qty_sold),
            sale_date: formatSubmitDate(item.sale_date),
          };

          console.log("Submitting:", payload);

          return createSale(payload)
            .then((data) => ({
              success: true,
              item: item.productName,
              data,
            }))
            .catch((error) => ({
              success: false,
              item: item.productName,
              error: error.message,
            }))
        })
      );

      console.log("Order submitted:", results);

      // Check for failures
      const failures = results.filter((r) => !r.success);
      const successCount = results.filter((r) => r.success).length;

      if (failures.length > 0) {
        const errorMessages = failures
          .map((f) => `${f.item}: ${(f as { success: false; item: string; error: any }).error}`)
          .join('\n');
        setSubmitError(`Failed to submit ${failures.length} order(s):\n${errorMessages}`);
      } else {
        setApiAvailable(true);
        // All succeeded
        setSubmitMessage(`✓ Successfully submitted ${successCount} order(s)!`);
        setShowSuccessMessage(true);

        // Clear cart after success
        setCart([]);
        await loadProducts();
        await loadSales();
        window.dispatchEvent(new CustomEvent('retailmind:sales-updated'));
        localStorage.setItem('retailmind:sales-updated', String(Date.now()));

        // Hide success message after 5 seconds
        setTimeout(() => {
          setShowSuccessMessage(false);
        }, 5000);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit orders';
      setSubmitError(`Error submitting orders: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  const historyPageSize = 10;
  const selectedProduct = selectedProductId ? findProductById(selectedProductId) : null;
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) {
      console.log("[DEBUG] Showing ALL products:", products.length);
      return products;
    }

    const term = searchTerm.toLowerCase().trim();

    const filtered = products.filter((p) => {
      return (
        p.name?.toLowerCase().includes(term) ||
        p.sku?.toLowerCase().includes(term) ||
        p.category?.toLowerCase().includes(term)
      );
    });

    console.log("[DEBUG] Filtered products:", filtered.length);

    return filtered;
  }, [products, searchTerm]);
  const todayDate = getTodayDate();
  const maxDate = getMaxDate();
  const cartTotalItems = cart.reduce((sum, item) => sum + item.qty_sold, 0);
  const historyRows = useMemo(() => {
    const term = salesSearch.trim().toLowerCase();

    return sales
      .map((sale) => {
        const product = findProductForSale(sale);
        return {
          id: sale.id || `${sale.product_id}-${sale.sale_date}-${sale.qty_sold}`,
          productName: sale.name || product?.name || 'Unknown product',
          sku: sale.sku || product?.sku || '',
          quantity: sale.qty_sold || 0,
          saleDate: formatDateKey(sale.sale_date || sale.createdAt),
          saleId: sale.id,
        };
      })
      .filter((row) => {
        if (!term) return true;
        return row.productName.toLowerCase().includes(term) || row.sku.toLowerCase().includes(term);
      });
  }, [sales, products, salesSearch]);
  const totalHistoryPages = Math.max(1, Math.ceil(historyRows.length / historyPageSize));
  const currentHistoryPage = Math.min(historyPage, totalHistoryPages);
  const paginatedHistoryRows = historyRows.slice(
    (currentHistoryPage - 1) * historyPageSize,
    currentHistoryPage * historyPageSize
  );

  return (
    <div className="orders-container">
      <div className="orders-header">
        <h1>Create Sales Orders</h1>
        <p className="orders-subtitle">Add items to cart and submit orders to inventory</p>
      </div>

      <div className="orders-toolbar">
        <button type="button" className="btn btn-secondary toolbar-btn" onClick={handleExportSalesCsv}>
          Export Sales CSV
        </button>
      </div>

      <div className="orders-layout">
        {/* LEFT: FORM */}
        <div className="orders-form-section">
          <h2>Add Item to Cart</h2>

          {/* Product Selection */}
          <div className="form-group">
            <label htmlFor="product-search">Product</label>
            <div className="product-search-wrapper">
              <input
               id="product-search"
                 type="text"
                 placeholder="Search by product name or SKU..."
                 value={searchTerm}
                 onChange={handleSearchChange}
                onFocus={() => setShowDropdown(true)}
                className={`search-input ${invalidFields.includes('product') ? 'input-error' : ''}`}
               />
              {selectedProduct && !searchTerm && (
                <button
                  type="button"
                  className="clear-product-btn"
                  onClick={() => {
                  setSelectedProductId('');
                    setSearchTerm('');
                      }}
                  title="Clear selection"
                >
                  ✕
                </button>
              )}
              {showDropdown && filteredProducts.length > 0 && (
                <div className="dropdown-menu">
                  {(() => {
                    console.log("[DEBUG] Rendering dropdown with", filteredProducts.length, "products");
                    return filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        className={`dropdown-item ${selectedProductId === product.id ? 'selected' : ''}`}
                        onClick={() => handleProductSelect(product)}
                      >
                        <div className="dropdown-item-name">{product.name}</div>
                        <div className="dropdown-item-sku">SKU: {product.sku}</div>
                        {product.category && <div className="dropdown-item-category">Category: {product.category}</div>}
                      </div>
                    ));
                  })()}
                </div>
              )}
              {showDropdown && filteredProducts.length === 0 && (
                <div className="dropdown-no-results">
                  {products.length === 0 ? 'No products available' : 'No products found'}
                </div>
              )}
            </div>
            {selectedProduct && (
              <div className="product-info">
                <span className="product-info-label">Selected:</span>
                <span className="product-info-value">{selectedProduct.name}</span>
                <span className="product-info-sku">({selectedProduct.sku})</span>
              </div>
            )}
          </div>

          {/* Quantity Input */}
          <div className="form-group">
            <label htmlFor="quantity">Quantity</label>
            <input
              id="quantity"
              type="number"
              min="1"
              placeholder="Enter quantity (must be > 0)"
              value={quantity}
              onChange={handleQuantityChange}
              className={`form-input ${invalidFields.includes('quantity') ? 'input-error' : ''}`}
            />
          </div>

          {/* Date Picker */}
          <div className="form-group">
            <label htmlFor="sale-date">Sale Date</label>
            <input
              id="sale-date"
              type="date"
              max={maxDate}
              value={saleDate}
              onChange={handleDateChange}
              className={`form-input ${invalidFields.includes('saleDate') ? 'input-error' : ''}`}
            />
            <small className="form-help-text">Cannot be a future date</small>
          </div>

          {/* Error Messages */}
          {submitError && (
            <div className="error-message">
              <span className="error-icon">⚠</span>
              {submitError}
            </div>
          )}

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={isSubmitting || !apiAvailable}
            className="btn btn-primary"
          >
            {isSubmitting ? 'Submitting...' : '+ Add to Cart'}
          </button>

          {/* Products Loading Error */}
          {productsError && (
            <div className="error-message">
              <span className="error-icon">⚠</span>
              Failed to load products: {productsError}
            </div>
          )}

          {/* Products Loading State */}
          {productsLoading && (
            <div className="loading-message">
              <span className="loading-spinner">⟳</span>
              Loading products...
            </div>
          )}
        </div>

        {/* RIGHT: CART */}
        <div className="orders-cart-section">
          <div className="cart-header">
            <h2>Shopping Cart</h2>
            <span className="cart-count">{cart.length} line{cart.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="cart-total-items">
            <span>Cart Total Items</span>
            <strong>{cartTotalItems}</strong>
          </div>

          {cart.length === 0 ? (
            <div className="empty-cart-message">
              <div className="empty-icon">📦</div>
              <p>No active sales order</p>
              <small>Select products from inventory to build a checkout cart.</small>
            </div>
          ) : (
            <>
              <div className="cart-items">
                {cart.map((item, index) => (
                  <div key={index} className="cart-item">
                    <div className="cart-item-content">
                      <div className="cart-item-name">{item.productName}</div>
                      <div className="cart-item-details">
                        <span className="cart-item-sku">SKU: {item.sku}</span>
                        <span className="cart-item-separator">•</span>
                        <span className="cart-item-qty">Qty: {item.qty_sold}</span>
                        <span className="cart-item-separator">•</span>
                        <span className="cart-item-date">{item.sale_date}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromCart(index)}
                      className="btn btn-remove"
                      title="Remove item"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Cart Actions */}
              <div className="cart-actions">
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="btn btn-secondary"
                >
                  Clear Cart
                </button>
              </div>

              {/* Success Message */}
              {showSuccessMessage && (
                <div className="success-message">
                  <span className="success-icon">✓</span>
                  {submitMessage}
                </div>
              )}

              {/* Submit Button */}
              <div className="sticky-submit-bar">
              <button
                onClick={handleSubmitOrders}
                disabled={isSubmitting || cart.length === 0 || !apiAvailable}
                className={`btn btn-submit ${isSubmitting ? 'loading' : ''}`}
              >
                {isSubmitting ? (
                  <>
                    <span className="submit-spinner">⟳</span>
                    Submitting {cart.length} order{cart.length !== 1 ? 's' : ''}...
                  </>
                ) : (
                  <>
                    <span className="submit-icon">→</span>
                    Submit {cart.length} Order{cart.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="orders-history-section">
        <div className="history-header">
          <div>
            <h2>Order History</h2>
            <p>Recent sales synced from backend</p>
          </div>
          <input
            type="text"
            value={salesSearch}
            onChange={(event) => {
              setSalesSearch(event.target.value);
              setHistoryPage(1);
            }}
            placeholder="Search by product or SKU..."
            className="history-search"
          />
        </div>

        {/* CSV Upload Section */}
        <div className="csv-upload-section">
          <label htmlFor="csv-upload" className="csv-upload-button">
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleCsvFileUpload}
              disabled={isUploadingCsv}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              disabled={isUploadingCsv}
              className={`btn btn-secondary ${isUploadingCsv ? 'loading' : ''}`}
              onClick={() => document.getElementById('csv-upload')?.click()}
            >
              {isUploadingCsv ? (
                <>
                  <span className="submit-spinner">⟳</span>
                  Uploading...
                </>
              ) : (
                <>📤 Upload Sales CSV</>
              )}
            </button>
          </label>

          {uploadError && (
            <div className="error-message">
              <span className="error-icon">⚠</span>
              <span>{uploadError}</span>
            </div>
          )}

          {showUploadSuccess && (
            <div className="success-message">
              <span className="success-icon">✓</span>
              {uploadMessage}
            </div>
          )}

          {salesError && (
            <div className="error-message">
              <span className="error-icon">⚠</span>
              {salesError}
            </div>
          )}
        </div>
        <div className="history-table-wrapper">
          <table className="history-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>SKU</th>
                <th>Qty</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {salesLoading && (
                <tr>
                  <td colSpan={5} className="history-empty">Loading order history...</td>
                </tr>
              )}
              {!salesLoading && paginatedHistoryRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="history-empty">No order history available</td>
                </tr>
              )}
              {!salesLoading && paginatedHistoryRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.productName}</td>
                  <td>{row.sku || '-'}</td>
                  <td>{row.quantity}</td>
                  <td>{row.saleDate || '-'}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleDeleteSale(row.saleId, row.productName)}
                      className="btn btn-delete-small"
                      title="Delete this sale"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="history-pagination">
          <span>Page {currentHistoryPage} of {totalHistoryPages}</span>
          <div className="history-pagination-actions">
            <button
              type="button"
              className="btn btn-secondary history-page-btn"
              disabled={currentHistoryPage <= 1}
              onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn btn-secondary history-page-btn"
              disabled={currentHistoryPage >= totalHistoryPages}
              onClick={() => setHistoryPage((page) => Math.min(totalHistoryPages, page + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Orders;
