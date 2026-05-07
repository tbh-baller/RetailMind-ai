import { pool } from "../config/db.js";

const supplierSelect = `
  id,
  name,
  type,
  contact,
  rating::float AS rating,
  is_active AS "isActive"
`;

const supplierProductSelect = `
  sp.id,
  sp.supplier_id AS "supplierId",
  sp.product_id AS "productId",
  sp.unit_price::float AS "unitPrice",
  sp.lead_time_days::float AS "leadTimeDays",
  sp.reliability_score::float AS "reliabilityScore",
  sp.stock_qty AS "stockQty",
  sp.minimum_order_qty AS "minimumOrderQty",
  s.name AS "supplierName",
  p.name AS "productName",
  p.sku
`;

// SUPPLIERS
export async function getAllSuppliers() {
  const result = await pool.query(`
    SELECT ${supplierSelect}, COUNT(sp.id) as products
    FROM suppliers s
    LEFT JOIN supplier_products sp ON s.id = sp.supplier_id
    WHERE s.is_active = TRUE
    GROUP BY s.id, s.name, s.type, s.contact, s.rating, s.is_active
    ORDER BY s.created_at DESC
  `);

  return result.rows;
}

export async function getSupplierById(id) {
  const result = await pool.query(`
    SELECT ${supplierSelect}
    FROM suppliers
    WHERE id = $1 AND is_active = TRUE
  `, [id]);

  return result.rows[0] || null;
}

export async function createSupplier(supplier) {
  const result = await pool.query(`
    INSERT INTO suppliers (name, type, contact, rating)
    VALUES ($1, $2, $3, $4)
    RETURNING ${supplierSelect}
  `, [
    supplier.name,
    supplier.type,
    supplier.contact || null,
    supplier.rating || 4.0,
  ]);

  return result.rows[0];
}

export async function updateSupplier(id, supplier) {
  const result = await pool.query(`
    UPDATE suppliers
    SET
      name = COALESCE($2, name),
      type = COALESCE($3, type),
      contact = COALESCE($4, contact),
      rating = COALESCE($5, rating),
      updated_at = NOW()
    WHERE id = $1 AND is_active = TRUE
    RETURNING ${supplierSelect}
  `, [
    id,
    supplier.name || null,
    supplier.type || null,
    supplier.contact || null,
    supplier.rating || null,
  ]);

  return result.rows[0] || null;
}

export async function deleteSupplier(id) {
  const result = await pool.query(`
    UPDATE suppliers
    SET is_active = FALSE, updated_at = NOW()
    WHERE id = $1
    RETURNING id
  `, [id]);

  return result.rows.length > 0;
}

// SUPPLIER PRODUCTS
export async function getProductSuppliers(productId) {
  const result = await db.query(
    `
    SELECT
      sp.id,
      sp.product_id,
      sp.supplier_id,
      sp.unit_price,
      sp.stock_qty,
      sp.minimum_order_qty,
      sp.lead_time_days,
      sp.reliability_score,
      s.name AS supplier_name,
      s.type
    FROM supplier_products sp
    JOIN suppliers s
      ON sp.supplier_id = s.id
    WHERE sp.product_id = $1
    `,
    [productId]
  );

  return result.rows.map((r) => ({
    id: r.id,
    productId: r.product_id,
    supplierId: r.supplier_id,
    supplierName: r.supplier_name,
    type: r.type,
    unitPrice: Number(r.unit_price),
    stockQty: r.stock_qty,
    minimumOrderQty: r.minimum_order_qty,
    leadTimeDays: Number(r.lead_time_days),
    reliabilityScore: Number(r.reliability_score),
  }));
}

export async function addSupplierProduct(supplierId, productId, pricing) {
  const result = await pool.query(`
    INSERT INTO supplier_products (
      supplier_id,
      product_id,
      unit_price,
      lead_time_days,
      reliability_score,
      stock_qty,
      minimum_order_qty
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (supplier_id, product_id) DO UPDATE
    SET
      unit_price = $3,
      lead_time_days = $4,
      reliability_score = $5,
      stock_qty = $6,
      minimum_order_qty = $7,
      updated_at = NOW()
    RETURNING ${supplierProductSelect}
  `, [
    supplierId,
    productId,
    pricing.unitPrice,
    pricing.leadTimeDays || 2,
    pricing.reliabilityScore || 4.0,
    pricing.stockQty || 100,
    pricing.minimumOrderQty || 1,
  ]);

  return result.rows[0];
}

export async function removeSupplierProduct(supplierId, productId) {
  const result = await pool.query(`
    DELETE FROM supplier_products
    WHERE supplier_id = $1 AND product_id = $2
    RETURNING id
  `, [supplierId, productId]);

  return result.rows.length > 0;
}

// PROCUREMENT ORDERS
export async function createProcurementOrder(order) {
  // Validate product exists
  const productResult = await pool.query(
    `SELECT id, stock, reorder_level FROM products WHERE id = $1`,
    [order.productId]
  );

  if (productResult.rows.length === 0) {
    throw new Error(`Product not found: ${order.productId}`);
  }

  // Validate supplier exists
  const supplierResult = await pool.query(
    `SELECT id FROM suppliers WHERE id = $1 AND is_active = TRUE`,
    [order.supplierId]
  );

  if (supplierResult.rows.length === 0) {
    throw new Error(`Invalid or inactive supplier: ${order.supplierId}`);
  }

  // Validate supplier product pricing exists
  const supplierProductResult = await pool.query(
    `SELECT id, minimum_order_qty, stock_qty FROM supplier_products 
     WHERE supplier_id = $1 AND product_id = $2`,
    [order.supplierId, order.productId]
  );

  if (supplierProductResult.rows.length === 0) {
    throw new Error(`Supplier product pricing not found`);
  }

  const { minimum_order_qty, stock_qty } = supplierProductResult.rows[0];

  // Validate minimum order quantity
  if (order.quantity < minimum_order_qty) {
    throw new Error(`Quantity ${order.quantity} is below minimum order quantity of ${minimum_order_qty}`);
  }

  // Validate supplier has sufficient stock
  if (order.quantity > stock_qty) {
    throw new Error(`Insufficient supplier stock. Available: ${stock_qty}, Requested: ${order.quantity}`);
  }

  // Create the procurement order
  const result = await pool.query(`
    INSERT INTO procurement_orders (
      product_id,
      supplier_id,
      quantity,
      unit_price,
      total_cost,
      estimated_delivery,
      status,
      ai_reasoning
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING
      id,
      product_id AS "productId",
      supplier_id AS "supplierId",
      quantity,
      unit_price::float AS "unitPrice",
      total_cost::float AS "totalCost",
      estimated_delivery AS "estimatedDelivery",
      status,
      ai_reasoning AS "aiReasoning",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `, [
    order.productId,
    order.supplierId,
    order.quantity,
    order.unitPrice,
    order.totalCost,
    order.estimatedDelivery || null,
    order.status || 'Pending',
    order.aiReasoning || null,
  ]);

  return result.rows[0];
}

export async function getProcurementOrders(limit = 100) {
  const result = await pool.query(`
    SELECT
      po.id,
      po.product_id AS "productId",
      po.supplier_id AS "supplierId",
      po.quantity,
      po.unit_price::float AS "unitPrice",
      po.total_cost::float AS "totalCost",
      po.estimated_delivery AS "estimatedDelivery",
      po.status,
      po.ai_reasoning AS "aiReasoning",
      po.created_at AS "createdAt",
      po.updated_at AS "updatedAt",
      p.name AS "productName",
      p.sku,
      s.name AS "supplierName"
    FROM procurement_orders po
    JOIN products p ON po.product_id = p.id
    JOIN suppliers s ON po.supplier_id = s.id
    ORDER BY po.created_at DESC
    LIMIT $1
  `, [limit]);

  return result.rows;
}

export async function getProcurementOrdersByProduct(productId, limit = 50) {
  const result = await pool.query(`
    SELECT
      po.id,
      po.product_id AS "productId",
      po.supplier_id AS "supplierId",
      po.quantity,
      po.unit_price::float AS "unitPrice",
      po.total_cost::float AS "totalCost",
      po.estimated_delivery AS "estimatedDelivery",
      po.status,
      po.ai_reasoning AS "aiReasoning",
      po.created_at AS "createdAt",
      po.updated_at AS "updatedAt",
      p.name AS "productName",
      p.sku,
      s.name AS "supplierName"
    FROM procurement_orders po
    JOIN products p ON po.product_id = p.id
    JOIN suppliers s ON po.supplier_id = s.id
    WHERE po.product_id = $1
    ORDER BY po.created_at DESC
    LIMIT $2
  `, [productId, limit]);

  return result.rows;
}

export async function updateProcurementOrderStatus(id, status) {
  // Validate status
  const validStatuses = ['Pending', 'Approved', 'Shipped', 'Delivered'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const result = await pool.query(`
    UPDATE procurement_orders
    SET status = $2, updated_at = NOW()
    WHERE id = $1
    RETURNING
      id,
      product_id AS "productId",
      supplier_id AS "supplierId",
      quantity,
      unit_price::float AS "unitPrice",
      total_cost::float AS "totalCost",
      estimated_delivery AS "estimatedDelivery",
      status,
      ai_reasoning AS "aiReasoning",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `, [id, status]);

  if (result.rows.length === 0) {
    throw new Error(`Procurement order not found: ${id}`);
  }

  return result.rows[0];
}

export async function getProcurementOrderById(id) {
  const result = await pool.query(`
    SELECT
      po.id,
      po.product_id AS "productId",
      po.supplier_id AS "supplierId",
      po.quantity,
      po.unit_price::float AS "unitPrice",
      po.total_cost::float AS "totalCost",
      po.estimated_delivery AS "estimatedDelivery",
      po.status,
      po.ai_reasoning AS "aiReasoning",
      po.created_at AS "createdAt",
      po.updated_at AS "updatedAt",
      p.name AS "productName",
      p.sku,
      s.name AS "supplierName"
    FROM procurement_orders po
    JOIN products p ON po.product_id = p.id
    JOIN suppliers s ON po.supplier_id = s.id
    WHERE po.id = $1
  `, [id]);

  return result.rows[0] || null;
}
