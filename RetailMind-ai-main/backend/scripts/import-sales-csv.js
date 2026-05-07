import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import pg from "pg";

const { Pool } = pg;
const BATCH_SIZE = 1000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function normalizeProductName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function compactProductName(name) {
  return normalizeProductName(name).replace(/[^a-z0-9]/g, "");
}

function productNameAliases(name) {
  const normalized = normalizeProductName(name);
  const compact = compactProductName(name);
  const aliases = new Set([normalized, compact]);

  if (["coke", "cocacola", "coca cola"].includes(compact)) {
    aliases.add("coke");
    aliases.add("cocacola");
  }

  return aliases;
}

function levenshteinDistance(left, right) {
  const rows = left.length + 1;
  const columns = right.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(columns).fill(0));

  for (let row = 0; row < rows; row++) {
    matrix[row][0] = row;
  }

  for (let column = 0; column < columns; column++) {
    matrix[0][column] = column;
  }

  for (let row = 1; row < rows; row++) {
    for (let column = 1; column < columns; column++) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      );
    }
  }

  return matrix[left.length][right.length];
}

function similarity(left, right) {
  const maxLength = Math.max(left.length, right.length);

  if (!maxLength) {
    return 1;
  }

  return 1 - (levenshteinDistance(left, right) / maxLength);
}

function findProductId(productName, products) {
  const normalizedCsvName = normalizeProductName(productName);
  const compactCsvName = compactProductName(productName);
  const csvAliases = productNameAliases(productName);

  if (!normalizedCsvName) {
    return null;
  }

  let bestMatch = null;

  for (const product of products) {
    if (
      product.normalizedName === normalizedCsvName ||
      product.compactName === compactCsvName ||
      [...csvAliases].some((alias) => product.aliases.has(alias))
    ) {
      return product.id;
    }

    if (
      product.normalizedName.includes(normalizedCsvName) ||
      normalizedCsvName.includes(product.normalizedName) ||
      product.compactName.includes(compactCsvName) ||
      compactCsvName.includes(product.compactName)
    ) {
      bestMatch = { product, score: 0.9 };
      continue;
    }

    const score = similarity(compactCsvName, product.compactName);

    if (score >= 0.72 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { product, score };
    }
  }

  return bestMatch?.product.id ?? null;
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === "\"" && inQuotes && nextChar === "\"") {
      current += "\"";
      index++;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function parseCsv(content) {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const row = { rowNumber: index + 2 };

    headers.forEach((header, headerIndex) => {
      row[header] = values[headerIndex] ?? "";
    });

    return row;
  });
}

function normalizeRow(row, products) {
  const date = new Date(row.date);
  const quantity = Number(row.quantity);
  const productName = String(row.product_name || "").trim();
  const productId = findProductId(productName, products);

  if (!productId) {
    return { error: `product_name not found: ${productName || "(empty)"}` };
  }

  if (Number.isNaN(date.getTime())) {
    return { error: "invalid date" };
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { error: "invalid quantity" };
  }

  return {
    productId,
    quantity,
    createdAt: date.toISOString(),
  };
}

async function getProductsForMatching() {
  const result = await pool.query("SELECT id, name FROM products");
  const products = result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    normalizedName: normalizeProductName(row.name),
    compactName: compactProductName(row.name),
    aliases: productNameAliases(row.name),
  }));

  console.log("Available products:", products.map((product) => product.normalizedName));

  return products;
}

async function insertSalesBatch(rows) {
  if (!rows.length) {
    return 0;
  }

  const values = [];
  const placeholders = rows.map((row, index) => {
    const offset = index * 3;
    values.push(row.productId, row.quantity, row.createdAt);
    return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
  });

  const result = await pool.query(
    `
      INSERT INTO sales (product_id, quantity, created_at)
      VALUES ${placeholders.join(", ")}
    `,
    values,
  );

  return result.rowCount;
}

async function main() {
  const csvPath = process.argv[2];

  if (!csvPath) {
    console.error("Usage: npm run import:sales -- <path-to-sales.csv>");
    process.exitCode = 1;
    return;
  }

  const absolutePath = path.resolve(csvPath);
  const content = await fs.readFile(absolutePath, "utf-8");
  const rawRows = parseCsv(content);
  const products = await getProductsForMatching();
  const normalizedRows = [];
  let skipped = 0;

  for (const row of rawRows) {
    const normalized = normalizeRow(row, products);

    if (normalized.error) {
      skipped++;
      console.warn(`Skipping row ${row.rowNumber}: ${normalized.error}`);
      continue;
    }

    normalizedRows.push(normalized);
  }

  let inserted = 0;

  for (let index = 0; index < normalizedRows.length; index += BATCH_SIZE) {
    const batch = normalizedRows.slice(index, index + BATCH_SIZE);
    inserted += await insertSalesBatch(batch);
    console.log(`Inserted ${inserted}/${normalizedRows.length} sales rows`);
  }

  console.log("Sales CSV import complete:", {
    file: absolutePath,
    totalRows: rawRows.length,
    inserted,
    skipped,
  });
}

main()
  .catch((error) => {
    console.error("Sales CSV import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
