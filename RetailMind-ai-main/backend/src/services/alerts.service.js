import { pool } from "../config/db.js";

export async function getAlerts() {
  const result = await pool.query(`
    SELECT 
      id,
      sku,
      name,
      stock,
      reorder_level,
      expiry
    FROM products
    WHERE is_active = TRUE
    ORDER BY created_at DESC
  `);

  const products = result.rows;
  const alerts = [];
  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  for (const product of products) {
    // Check for low stock
    if (product.stock <= product.reorder_level) {
      alerts.push({
        id: `${product.id}-low-stock`,
        type: "low",
        message: `Low stock: ${product.name} (${product.sku}) has ${product.stock} units, reorder level is ${product.reorder_level}`,
        severity: "high",
        createdAt: now.toISOString(),
      });
    }

    // Check for expiry
    const expiryDate = new Date(product.expiry);
    if (expiryDate <= threeDaysLater) {
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      
      let severity = "medium";
      let alertType = "expiry";
      
      if (daysUntilExpiry <= 0) {
        severity = "high";
        alertType = "expired";
      }
      
      alerts.push({
        id: `${product.id}-expiry`,
        type: alertType,
        message: `${
          daysUntilExpiry <= 0
            ? "EXPIRED"
            : `Expiring soon`
        }: ${product.name} (${product.sku}) expires on ${product.expiry}${
          daysUntilExpiry > 0 ? ` in ${daysUntilExpiry} days` : ""
        }`,
        severity,
        createdAt: now.toISOString(),
      });
    }
  }

  console.log("Alerts generated:", alerts.length);
  return alerts;
}
