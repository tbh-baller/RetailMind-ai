import { pool } from "../config/db.js";

const productSelect = `
  id,
  sku,
  name,
  category,
  stock,
  reorder_level AS "reorderLevel",
  price::float AS price,
  expiry::text AS expiry,
  status,
  velocity::float AS velocity,
  image,
  is_active AS "isActive"
`;

export async function getAllProducts() {
  const result = await pool.query(`
    SELECT ${productSelect}
    FROM products
    WHERE is_active = TRUE
    ORDER BY created_at DESC
  `);

  return result.rows;
}

export async function getProductsWithPagination(page = 1, limit = 10, search = "") {
  const offset = (page - 1) * limit;
  
  let whereClause = "WHERE is_active = TRUE";
  let params = [];

  if (search && search.trim()) {
    whereClause = "WHERE is_active = TRUE AND (name ILIKE $1 OR sku ILIKE $1)";
    params = [`%${search}%`];
  }

  // Get total count with search filter
  const countQuery = `
    SELECT COUNT(*) as total
    FROM products
    ${whereClause}
  `;
  const countResult = await pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0].total);
  const totalPages = Math.ceil(total / limit);

  // Get paginated products
  const dataQuery = `
    SELECT ${productSelect}
    FROM products
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
  const dataResult = await pool.query(dataQuery, [...params, limit, offset]);

  return {
    data: dataResult.rows,
    total,
    page,
    totalPages,
  };
}

export async function createProduct(product) {
  // Check if product with this SKU exists
  const existingCheck = await pool.query(
    "SELECT id, is_active FROM products WHERE sku = $1",
    [product.sku]
  );

  if (existingCheck.rows.length > 0) {
    const existing = existingCheck.rows[0];

    // If product exists and is soft-deleted, restore it
    if (!existing.is_active) {
      const result = await pool.query(
        `
          UPDATE products
          SET
            name = $2,
            category = $3,
            stock = $4,
            reorder_level = $5,
            price = $6,
            expiry = $7,
            status = $8,
            velocity = $9,
            image = $10,
            is_active = TRUE,
            updated_at = NOW()
          WHERE sku = $1
          RETURNING ${productSelect}
        `,
        [
          product.sku,
          product.name,
          product.category,
          Number(product.stock),
          Number(product.reorder_level ?? 30),
          Number(product.price),
          product.expiry,
          product.status ?? "healthy",
          Number(product.velocity ?? 0),
          product.image ?? null,
        ]
      );
      return result.rows[0];
    }

    // If product exists and is active, throw error
    const error = new Error("Product with this SKU already exists");
    error.statusCode = 400;
    throw error;
  }

  // Product doesn't exist, proceed with INSERT
  const result = await pool.query(
    `
      INSERT INTO products (
        sku, name, category, stock, reorder_level, price, expiry, status, velocity, image
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING ${productSelect}
    `,
    [
      product.sku,
      product.name,
      product.category,
      Number(product.stock),
      Number(product.reorder_level ?? 30),
      Number(product.price),
      product.expiry,
      product.status ?? "healthy",
      Number(product.velocity ?? 0),
      product.image ?? null,
    ],
  );

  return result.rows[0];
}

export async function updateProduct(id, product) {
  const allowedFields = {
    sku: "sku",
    name: "name",
    category: "category",
    stock: "stock",
    reorder_level: "reorder_level",
    price: "price",
    expiry: "expiry",
    status: "status",
    velocity: "velocity",
    image: "image",
  };

  const entries = Object.entries(product).filter(([key]) => allowedFields[key]);

  if (!entries.length) {
    const existing = await pool.query(`SELECT ${productSelect} FROM products WHERE id = $1`, [id]);
    return existing.rows[0] || null;
  }

  const values = entries.map(([, value]) => value);
  const setClause = entries
    .map(([key], index) => `${allowedFields[key]} = $${index + 1}`)
    .join(", ");

  const result = await pool.query(
    `
      UPDATE products
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${values.length + 1}
      RETURNING ${productSelect}
    `,
    [...values, id],
  );

  return result.rows[0] || null;
}

export async function deleteProduct(id) {
  const result = await pool.query("UPDATE products SET is_active = FALSE WHERE id = $1 AND is_active = TRUE RETURNING id", [id]);
  return Boolean(result.rowCount);
}

export async function bulkCreateProducts(products) {
  let insertedCount = 0;
  let updatedCount = 0;
  const errors = [];

  for (const product of products) {
    try {
      // Check if product with this SKU exists
      const existingCheck = await pool.query(
        "SELECT id, is_active FROM products WHERE sku = $1",
        [product.sku]
      );

      if (existingCheck.rows.length > 0) {
        // Product exists - UPDATE it
        const existing = existingCheck.rows[0];
        await pool.query(
          `
            UPDATE products
            SET
              name = $2,
              category = $3,
              stock = $4,
              reorder_level = $5,
              price = $6,
              expiry = $7,
              status = $8,
              velocity = $9,
              image = $10,
              is_active = TRUE,
              updated_at = NOW()
            WHERE sku = $1
          `,
          [
            product.sku,
            product.name,
            product.category,
            Number(product.stock),
            Number(product.reorder_level ?? 30),
            Number(product.price),
            product.expiry,
            product.status ?? "healthy",
            Number(product.velocity ?? 0),
            product.image ?? null,
          ]
        );
        updatedCount++;
      } else {
        // Product doesn't exist - INSERT it
        await pool.query(
          `
            INSERT INTO products (
              sku, name, category, stock, reorder_level, price, expiry, status, velocity, image
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `,
          [
            product.sku,
            product.name,
            product.category,
            Number(product.stock),
            Number(product.reorder_level ?? 30),
            Number(product.price),
            product.expiry,
            product.status ?? "healthy",
            Number(product.velocity ?? 0),
            product.image ?? null,
          ]
        );
        insertedCount++;
      }
    } catch (error) {
      errors.push({ row: product.__rowIndex, message: error.message || "Failed to process product" });
    }
  }

  console.log("UPSERT RESULT:", { inserted: insertedCount, updated: updatedCount });

  return { insertedCount, updatedCount, errors };
}
