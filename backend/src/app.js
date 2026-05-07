import express from "express";
import cors from "cors";
import productsRouter from "./routes/products.routes.js";
import salesRouter from "./routes/sales.routes.js";
import alertsRouter from "./routes/alerts.routes.js";
import reorderRouter from "./routes/reorder.routes.js";
import forecastRouter from "./routes/forecast.routes.js";
import suppliersRouter from "./routes/suppliers.routes.js";
import procurementRouter from "./routes/procurement.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFoundHandler.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "RetailMind API running" });
});

app.use("/api/products", productsRouter);
app.use("/api/sales", salesRouter);
app.use("/api/alerts", alertsRouter);
app.use("/api/reorder-suggestions", reorderRouter);
app.use("/api/forecast", forecastRouter);
app.use("/api/suppliers", suppliersRouter);
app.use("/api/procurement", procurementRouter);

// Log initialization
console.log("Forecast API initialized");

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
