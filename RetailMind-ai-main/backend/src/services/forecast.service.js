import { pool } from "../config/db.js";

const LOOKBACK_DAYS = 120;
const MIN_ML_HISTORY_DAYS = 90;
const FORECAST_DAYS = 7;
const ML_FORECAST_URL = process.env.ML_FORECAST_URL || "http://localhost:8000/forecast";
const ML_TIMEOUT_MS = Number(process.env.ML_FORECAST_TIMEOUT_MS || 5000);

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function average(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildDateRange(today, days) {
  return Array.from({ length: days }, (_, index) => {
    const offset = index - (days - 1);
    return toDateKey(addDays(today, offset));
  });
}

function buildZeroPredictions(today) {
  return Array.from({ length: FORECAST_DAYS }, (_, index) => ({
    date: toDateKey(addDays(today, index + 1)),
    value: 0,
  }));
}

function buildMovingAveragePredictions(series, today) {
  const recentSales = series.slice(-3);
  const midSales = series.slice(-6, -3);
  const oldSales = series.slice(0, -6);

  const recentAvg = average(recentSales);
  const midAvg = average(midSales);
  const oldAvg = average(oldSales);
  const baseForecast = (0.6 * recentAvg) + (0.3 * midAvg) + (0.1 * oldAvg);
  const trend = recentAvg - midAvg;
  const dampedTrend = trend * 0.3;
  const minValue = Math.max(1, Math.round(recentAvg * 0.5));

  return Array.from({ length: FORECAST_DAYS }, (_, index) => {
    const projectedValue = baseForecast + (dampedTrend * (index + 1));

    return {
      date: toDateKey(addDays(today, index + 1)),
      value: Math.max(minValue, Math.round(projectedValue)),
    };
  });
}

function getHistoryLength(series) {
  const firstSaleIndex = series.findIndex((quantity) => quantity > 0);

  if (firstSaleIndex === -1) {
    return 0;
  }

  return series.length - firstSaleIndex;
}

function extractMlPredictionValues(predictions) {
  return Array.isArray(predictions)
    ? predictions
    : Array.isArray(predictions?.predictions)
      ? predictions.predictions
      : [];
}

function normalizeMlPredictions(predictions, today) {
  const rawPredictions = extractMlPredictionValues(predictions);

  if (!rawPredictions.length) {
    return null;
  }

  return Array.from({ length: FORECAST_DAYS }, (_, index) => {
    const prediction = rawPredictions[index];
    const value = typeof prediction === "object" && prediction !== null
      ? prediction.value
      : prediction;

    return {
      date: toDateKey(addDays(today, index + 1)),
      value: Math.max(0, Math.round(Number(value) || 0)),
    };
  });
}

async function getMlPredictions(series, today) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);
  const inputData = { series };

  try {
    console.log("ML INPUT:", inputData);
    console.log("Calling ML forecast service:", ML_FORECAST_URL);

    const response = await fetch(ML_FORECAST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inputData),
      signal: controller.signal,
    });

    console.log("ML response status:", response.status);

    if (!response.ok) {
      throw new Error(`ML forecast service returned ${response.status}`);
    }

    const payload = await response.json();
    const mlResult = payload;
    console.log("ML OUTPUT:", mlResult);

    const predictions = normalizeMlPredictions(mlResult, today);

    if (predictions === null) {
      console.error("ML forecast returned empty predictions:", mlResult);
      return null;
    }

    return predictions;
  } catch (error) {
    console.error("ML forecast request error:", error);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function createForecastResponse(product, predictions, model) {
  return {
    productId: product.productId,
    productName: product.productName,
    predictions,
    model,
    forecast: predictions.map((prediction) => ({
      day: prediction.date,
      value: prediction.value,
    })),
  };
}

export async function getDemandForecast() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const lookbackDates = buildDateRange(today, LOOKBACK_DAYS);

  const result = await pool.query(`
    SELECT
      p.id AS "productId",
      p.name AS "productName",
      TO_CHAR(s.sale_date, 'YYYY-MM-DD') AS "saleDate",
      COALESCE(SUM(s.quantity), 0)::int AS quantity
    FROM products p
    LEFT JOIN sales s
      ON s.product_id = p.id
      AND s.sale_date >= CURRENT_DATE - INTERVAL '120 days'
      AND s.is_deleted = FALSE
    WHERE p.is_active = TRUE
    GROUP BY p.id, p.name, s.sale_date
    ORDER BY p.name ASC, s.sale_date ASC
  `)

  const products = new Map();

  for (const row of result.rows) {
    if (!products.has(row.productId)) {
      products.set(row.productId, {
        productId: row.productId,
        productName: row.productName,
        salesByDate: new Map(),
      });
    }

    if (row.saleDate) {
      products.get(row.productId).salesByDate.set(row.saleDate, Number(row.quantity));
    }
  }

  const forecasts = [];

  for (const product of products.values()) {
    console.log("LOOKBACK DATES:", lookbackDates.slice(-5));
    console.log("DB DATES:", [...product.salesByDate.keys()].slice(-5));

    const series = lookbackDates.map((date) => product.salesByDate.get(date) ?? 0);
    const historyLength = getHistoryLength(series);

    if (historyLength === 0) {
      console.log("Forecast generated with no sales history:", product.productId);
      forecasts.push(createForecastResponse(product, buildZeroPredictions(today), "MovingAverage"));
      continue;
    }

    try {
      console.log("Before ML call:", {
        productId: product.productId,
        historyLength,
        minMlHistoryDays: MIN_ML_HISTORY_DAYS,
      });

      const predictions = await getMlPredictions(series, today);

      if (predictions === null) {
        console.error("ML forecast failed: empty/null response, using moving average fallback", {
          productId: product.productId,
        });
        forecasts.push(createForecastResponse(product, buildMovingAveragePredictions(series, today), "MovingAverage"));
        continue;
      }

      console.log("After ML response:", {
        productId: product.productId,
        predictionCount: predictions.length,
        predictions,
      });
      console.log("LSTM forecast generated:", product.productId);
      forecasts.push(createForecastResponse(product, predictions, "LSTM"));
    } catch (error) {
      console.error("ML forecast threw error, using moving average fallback:", {
        productId: product.productId,
        error: error.message,
        stack: error.stack,
      });
      forecasts.push(createForecastResponse(product, buildMovingAveragePredictions(series, today), "MovingAverage"));
    }
  }

  console.log("Forecasts generated:", forecasts.length);
  return forecasts;
}
