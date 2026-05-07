CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (
  category IN (
    'Grocery',
    'Pharmacy',
    'Beverage',
    'Dairy',
    'Snacks',
    'Household'
  )
),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  reorder_level INTEGER NOT NULL DEFAULT 30 CHECK (reorder_level >= 0),
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  expiry DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'healthy' CHECK (status IN ('healthy', 'low', 'expiring', 'out')),
  velocity NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (velocity >= 0),
  image TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_expiry ON products(expiry);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_sku ON products(sku) WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  -- API exposes quantity as qty_sold for the Orders/ML pipeline.
  sale_date DATE NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sales ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_is_deleted ON sales(is_deleted);
DROP INDEX IF EXISTS idx_sales_product_date;
ALTER TABLE sales DROP CONSTRAINT IF EXISTS unique_sale_per_day;
DROP INDEX IF EXISTS unique_sale_per_day;
CREATE UNIQUE INDEX IF NOT EXISTS unique_sale_per_day_active
  ON sales(product_id, sale_date)
  WHERE is_deleted = FALSE;

-- SUPPLIERS MANAGEMENT
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Local', 'External')),
  contact TEXT,
  rating NUMERIC(3, 1) NOT NULL DEFAULT 4.0 CHECK (rating >= 0 AND rating <= 5),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_type ON suppliers(type);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON suppliers(is_active);

-- SUPPLIER PRODUCT PRICING
CREATE TABLE IF NOT EXISTS supplier_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  lead_time_days NUMERIC(3, 1) NOT NULL DEFAULT 2 CHECK (lead_time_days >= 0),
  reliability_score NUMERIC(3, 1) NOT NULL DEFAULT 4.0 CHECK (reliability_score >= 0 AND reliability_score <= 5),
  stock_qty INTEGER NOT NULL DEFAULT 100 CHECK (stock_qty >= 0),
  minimum_order_qty INTEGER NOT NULL DEFAULT 1 CHECK (minimum_order_qty >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier_id ON supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_product_id ON supplier_products(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS unique_supplier_product ON supplier_products(supplier_id, product_id);

-- PROCUREMENT ORDERS
CREATE TABLE IF NOT EXISTS procurement_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  total_cost NUMERIC(12, 2) NOT NULL CHECK (total_cost >= 0),
  estimated_delivery DATE,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Shipped', 'Delivered')),
  ai_reasoning TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add updated_at column if it doesn't exist
ALTER TABLE procurement_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Update status constraint to include 'Approved'
-- Note: PostgreSQL doesn't easily allow altering constraints, so this is handled during table creation above

CREATE INDEX IF NOT EXISTS idx_procurement_orders_product_id ON procurement_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_procurement_orders_supplier_id ON procurement_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_procurement_orders_status ON procurement_orders(status);
CREATE INDEX IF NOT EXISTS idx_procurement_orders_created_at ON procurement_orders(created_at);
