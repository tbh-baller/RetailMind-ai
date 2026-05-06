import { pool } from "../config/db.js";

export async function getReorderSuggestions() {
  const result = await pool.query(`
    SELECT
      id,
      name,
      stock,
      reorder_level AS "reorderLevel",
      velocity::float AS velocity
    FROM products
    ORDER BY created_at DESC
  `);

  const suggestions = result.rows.reduce((items, product) => {
    const stock = Number(product.stock);
    const reorderLevel = Number(product.reorderLevel);
    const velocity = Number(product.velocity ?? 0);

    if (stock >= reorderLevel) {
      return items;
    }

    let priority = "Medium";

    if (stock === 0 || stock < reorderLevel / 2) {
      priority = "High";
    }

    items.push({
      productId: product.id,
      productName: product.name,
      currentStock: stock,
      reorderLevel,
      recommendedQty: reorderLevel - stock + velocity,
      priority,
    });

    return items;
  }, []);

  console.log("Reorder suggestions generated:", suggestions.length);
  return suggestions;
}
