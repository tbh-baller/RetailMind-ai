/**
 * Mock External Pricing Data
 * Generates realistic pricing data for external suppliers (quick-commerce platforms)
 * Used for PriceComparison feature - no actual scraping or APIs
 */

const EXTERNAL_SUPPLIERS = [
  { name: "Blinkit", type: "External", avgLeadTime: 0.25, avgReliability: 4.8 },
  { name: "Zepto", type: "External", avgLeadTime: 0.25, avgReliability: 4.7 },
  { name: "Apollo 24/7", type: "External", avgLeadTime: 0.5, avgReliability: 4.5 },
  { name: "Tata 1mg", type: "External", avgLeadTime: 1, avgReliability: 4.6 },
];

const PRICE_VARIANCE = 0.15; // 15% variance from internal price

function getRandomVariance(basePrice, variance = PRICE_VARIANCE) {
  const minPrice = basePrice * (1 - variance);
  const maxPrice = basePrice * (1 + variance);
  return Math.random() * (maxPrice - minPrice) + minPrice;
}

function getRandomLeadTime(baseLeadTime, variance = 0.1) {
  const minDays = Math.max(0.25, baseLeadTime * (1 - variance));
  const maxDays = baseLeadTime * (1 + variance);
  return Math.random() * (maxDays - minDays) + minDays;
}

function getRandomAvailability(baseAvailability = 100, variance = 10) {
  const minStock = Math.max(0, baseAvailability - variance);
  const maxStock = baseAvailability + variance;
  return Math.round(Math.random() * (maxStock - minStock) + minStock);
}

/**
 * Generate mock external quotes for a product
 * @param {Object} product - Product with id, name, sku, price, reorderLevel
 * @returns {Array} Array of supplier quotes
 */
export function generateMockExternalQuotes(product) {
  return EXTERNAL_SUPPLIERS.map(supplier => ({
    supplier: supplier.name,
    type: supplier.type,
    productId: product.id,
    productSku: product.sku,
    productName: product.name,
    price: Math.round(getRandomVariance(product.price) * 100) / 100,
    deliveryDays: getRandomLeadTime(supplier.avgLeadTime),
    availability: getRandomAvailability(product.reorderLevel * 2),
    reliability: Math.round((supplier.avgReliability + (Math.random() - 0.5) * 0.4) * 10) / 10,
    stock_qty: getRandomAvailability(product.reorderLevel * 3),
  }));
}

/**
 * Calculate score for a supplier quote
 * Weighted formula:
 * - Price: 40% (normalized inverse)
 * - Delivery: 25% (normalized inverse)
 * - Availability: 20% (normalized direct)
 * - Reliability: 15% (normalized direct)
 * @param {Object} quote - Supplier quote with price, deliveryDays, availability, reliability
 * @param {Array} allQuotes - All quotes for normalization
 * @returns {number} Score between 0-100
 */
export function calculateQuoteScore(quote, allQuotes) {
  const prices = allQuotes.map(q => q.price);
  const deliveryTimes = allQuotes.map(q => q.deliveryDays);
  const availabilities = allQuotes.map(q => q.availability);
  const reliabilities = allQuotes.map(q => q.reliability);

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minDelivery = Math.min(...deliveryTimes);
  const maxDelivery = Math.max(...deliveryTimes);
  const minAvailability = Math.min(...availabilities);
  const maxAvailability = Math.max(...availabilities);
  const minReliability = Math.min(...reliabilities);
  const maxReliability = Math.max(...reliabilities);

  // Normalize to 0-1 (inverse for price and delivery, direct for availability and reliability)
  const priceScore = maxPrice === minPrice ? 0.5 : (maxPrice - quote.price) / (maxPrice - minPrice);
  const deliveryScore = maxDelivery === minDelivery ? 0.5 : (maxDelivery - quote.deliveryDays) / (maxDelivery - minDelivery);
  const availabilityScore = maxAvailability === minAvailability ? 0.5 : (quote.availability - minAvailability) / (maxAvailability - minAvailability);
  const reliabilityScore = maxReliability === minReliability ? 0.5 : (quote.reliability - minReliability) / (maxReliability - minReliability);

  // Weighted sum (0-100)
  const score = (
    priceScore * 0.40 +
    deliveryScore * 0.25 +
    availabilityScore * 0.20 +
    reliabilityScore * 0.15
  ) * 100;

  return Math.round(score);
}

/**
 * Generate AI insight for price comparison
 * @param {Array} quotes - All supplier quotes
 * @param {Object} product - Product details
 * @returns {string} Plain-English recommendation
 */
export function generatePriceComparisonInsight(quotes, product) {
  if (!quotes || quotes.length === 0) {
    return "No pricing data available. Please add suppliers for this product.";
  }

  const cheapest = quotes.reduce((a, b) => a.price < b.price ? a : b);
  const fastest = quotes.reduce((a, b) => a.deliveryDays < b.deliveryDays ? a : b);
  const best = quotes.reduce((a, b) => (b.score || 0) > (a.score || 0) ? b : a);

  const cheapestCheaper = cheapest.price < product.price ? cheapest.price : null;
  const mostExpensive = Math.max(...quotes.map(q => q.price));
  const priceDiff = ((mostExpensive - cheapest.price) / cheapest.price * 100).toFixed(0);

  let insight = `${best.supplier} offers the best overall value`;
  
  if (cheapest !== best) {
    insight += ` with a more balanced profile than ${cheapest.supplier}.`;
  } else {
    insight += `.`;
  }

  if (fastest !== best) {
    insight += ` ${fastest.supplier} is faster (${fastest.deliveryDays < 1 ? Math.round(fastest.deliveryDays * 24) + 'h' : fastest.deliveryDays.toFixed(1) + 'd'}) if speed is critical.`;
  }

  if (cheapestCheaper) {
    insight += ` Prices vary by ${priceDiff}% across suppliers.`;
  }

  insight += ` Recommended for procurement: ${best.supplier}.`;

  return insight;
}

/**
 * Get all mock external quotes for internal suppliers
 * Combines internal supplier data with mock external pricing
 * @param {Array} internalSuppliers - Internal supplier products
 * @returns {Array} Combined quotes with scores
 */
export function getCombinedQuotesWithMock(internalSuppliers) {
  let quotes = [...internalSuppliers];

  // Add mock external quotes if not already present
  const externalNames = quotes.filter(q => q.type === "External").map(q => q.supplier);
  const missingExternal = EXTERNAL_SUPPLIERS.filter(s => !externalNames.includes(s.name));

  missingExternal.forEach(supplier => {
    quotes.push({
      supplier: supplier.name,
      type: "External",
      price: internalSuppliers.length > 0 ? internalSuppliers[0].price * (1 + (Math.random() - 0.5) * 0.3) : 0,
      deliveryDays: supplier.avgLeadTime,
      availability: 100,
      reliability: supplier.avgReliability,
    });
  });

  // Calculate scores for all
  return quotes.map(q => ({
    ...q,
    score: calculateQuoteScore(q, quotes),
  }));
}
