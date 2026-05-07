import { pool } from "../config/db.js";

export async function getRecentVelocity(productId, days = 7) {
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const result = await pool.query(`
    SELECT COALESCE(SUM(quantity), 0) as total_units
    FROM sales
    WHERE product_id = $1
      AND sale_date >= $2::date
      AND is_deleted = FALSE
  `, [productId, start.toISOString().split('T')[0]]);

  const totalUnits = parseInt(result.rows[0]?.total_units || 0);
  return totalUnits / Math.max(days, 1);
}

export async function calculateDaysUntilStockout(stock, velocity) {
  if (velocity <= 0) return Infinity;
  return stock / velocity;
}

export async function getProcurementRecommendations() {
  const result = await pool.query(`
    SELECT
      p.id,
      p.sku,
      p.name,
      p.stock,
      p.reorder_level AS "reorderLevel",
      p.price::float AS price,
      COUNT(s.id) as "totalSalesCount"
    FROM products p
    LEFT JOIN sales s ON p.id = s.product_id AND s.is_deleted = FALSE
    WHERE p.is_active = TRUE
    GROUP BY p.id
    ORDER BY p.reorder_level DESC, p.stock ASC
  `);

  const recommendations = [];

  for (const product of result.rows) {
    const sevenDayVelocity = await getRecentVelocity(product.id, 7);
    const fourteenDayVelocity = await getRecentVelocity(product.id, 14);
    const forecastDemand = Math.ceil(sevenDayVelocity * 7);
    const daysUntilStockout = await calculateDaysUntilStockout(product.stock, sevenDayVelocity);
    const previousVelocity = Math.max((fourteenDayVelocity * 14 - sevenDayVelocity * 7) / 7, 0);

    let priority = 'Low';
    let recommendedQty = 0;

    if (product.stock === 0) {
      priority = 'High';
      recommendedQty = Math.max(
        forecastDemand,
        product.reorderLevel * 2
      );
    } else if (Number.isFinite(daysUntilStockout) && daysUntilStockout <= 3) {
      priority = 'High';
      recommendedQty = Math.max(
        forecastDemand,
        product.reorderLevel * 2 - product.stock
      );
    } else if (daysUntilStockout > 3 && daysUntilStockout <= 7) {
      priority = 'Medium';
      if (product.stock <= product.reorderLevel) {
        recommendedQty = Math.max(
          forecastDemand,
          product.reorderLevel * 2 - product.stock
        );
      } else if (forecastDemand > product.stock) {
        recommendedQty = forecastDemand - product.stock;
      }
    } else if (daysUntilStockout > 7 && daysUntilStockout <= 14) {
      priority = 'Low';
      if (product.stock <= product.reorderLevel) {
        recommendedQty = product.reorderLevel * 2 - product.stock;
      }
    }

    // Only include if there's a recommendation
    if (recommendedQty > 0) {
      let reasoning = '';

      if (product.stock === 0) {
        reasoning = `${product.name} is out of stock. Immediate reorder of ${recommendedQty} units recommended.`;
      } else if (daysUntilStockout <= 3) {
        reasoning = `Stock may run out in ${Math.ceil(daysUntilStockout)} day${Math.ceil(daysUntilStockout) !== 1 ? 's' : ''}. Demand is ${sevenDayVelocity > previousVelocity * 1.1 ? 'increasing' : 'stable'}. Recommend reorder of ${recommendedQty} units.`;
      } else if (daysUntilStockout <= 7) {
        reasoning = `Stock available for ${Math.ceil(daysUntilStockout)} more days. Forecasted demand is ${forecastDemand} units. Recommend ${recommendedQty} units to maintain buffer stock.`;
      } else if (daysUntilStockout <= 14) {
        reasoning = `Stock healthy (${Math.ceil(daysUntilStockout)} days supply). Monitor demand trends and reorder ${recommendedQty} units as planned.`;
      }

      recommendations.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        currentStock: product.stock,
        reorderLevel: product.reorderLevel,
        stockOutDays: Number.isFinite(daysUntilStockout) ? Math.ceil(daysUntilStockout) : undefined,
        recommendedQty,
        priority,
        sevenDayVelocity: Math.round(sevenDayVelocity * 100) / 100,
        forecastDemand,
        aiReasoning: reasoning,
      });
    }
  }

  return recommendations.sort((a, b) => {
    const priorityMap = { High: 3, Medium: 2, Low: 1 };
    if (priorityMap[b.priority] !== priorityMap[a.priority]) {
      return priorityMap[b.priority] - priorityMap[a.priority];
    }
    return (a.stockOutDays || 999) - (b.stockOutDays || 999);
  });
}
