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
