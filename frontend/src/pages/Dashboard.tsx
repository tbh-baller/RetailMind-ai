import { Package, AlertTriangle, Clock, IndianRupee, ShoppingCart, Sparkles, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { alertsActions, inventoryActions, useAppDispatch, useAppSelector } from "@/store";
import { KpiCard } from "@/components/common/KpiCard";
import { PageHeader } from "@/components/common/PageHeader";
import { ProductImage } from "@/components/common/ProductImage";
import { getProducts, getSales, getForecast, type ForecastPoint, type Product, type ReorderSuggestion, type Sale, type SKUForecast } from "@/services/api";
import {
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Line, LineChart,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

type DashboardRecommendation = ReorderSuggestion & {
  message: string;
  score: number;
};

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getSaleDateKey(sale: Sale) {
  const dateValue = sale.sale_date || sale.createdAt;
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? "" : toDateKey(date);
}

function formatChartDate(day: string) {
  return new Date(`${day}T00:00:00`).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
  });
}

function buildForecastChartData(sales: Sale[] = [], mlForecasts: SKUForecast[] = []): ForecastPoint[] {
  const chartData = new Map<string, ForecastPoint>();

  for (const sale of sales) {
    const quantity = Number(sale.qty_sold ?? 0);
    const saleDate = sale.sale_date ?? sale.createdAt ?? sale.saleDate ?? sale.created_at ?? "";
    const parsedDate = new Date(saleDate);

    if (!Number.isFinite(quantity) || quantity <= 0 || Number.isNaN(parsedDate.getTime())) {
      continue;
    }

    const day = toDateKey(parsedDate);
    const point = chartData.get(day) ?? { day, actual: 0, forecast: 0 };
    point.actual += quantity;
    chartData.set(day, point);
  }

  const forecastValues = Array.isArray(mlForecasts)
    ? mlForecasts.map((f) => Math.max(0, Number(f?.forecast_7_days ?? 0)))
    : [];

  const totalForecastDemand = forecastValues.reduce((sum, value) => sum + value, 0);

  if (totalForecastDemand > 0) {
    const dailyForecast = Math.ceil(totalForecastDemand / 7);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 1; i <= 7; i++) {
      const forecastDate = new Date(today);
      forecastDate.setDate(today.getDate() + i);
      const day = toDateKey(forecastDate);

      const point = chartData.get(day) ?? { day, actual: 0, forecast: 0 };
      point.forecast = dailyForecast;
      chartData.set(day, point);
    }
  }

  return capExtremeChartValues(Array.from(chartData.values()).sort((a, b) => a.day.localeCompare(b.day)));
}

function getRecentVelocity(sales: Sale[], productId: string, days: number) {
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const units = sales.reduce((sum, sale) => {
    const saleDate = new Date(sale.sale_date || sale.createdAt);
    if (sale.product_id !== productId || Number.isNaN(saleDate.getTime()) || saleDate < start) {
      return sum;
    }

    return sum + Number(sale.qty_sold || 0);
  }, 0);

  return units / Math.max(days, 1);
}

function buildAiRecommendations(products: Product[], sales: Sale[]): DashboardRecommendation[] {
  const productSales = new Map<string, number>();

  for (const sale of sales) {
    productSales.set(sale.product_id, (productSales.get(sale.product_id) || 0) + Number(sale.qty_sold || 0));
  }

  const recommendations = products
    .map((product) => {
      const sevenDayVelocity = getRecentVelocity(sales, product.id, 7);
      const fourteenDayVelocity = getRecentVelocity(sales, product.id, 14);
      const previousVelocity = Math.max((fourteenDayVelocity * 14 - sevenDayVelocity * 7) / 7, 0);
      const daysUntilStockout = sevenDayVelocity > 0 ? product.stock / sevenDayVelocity : Infinity;
      const totalUnits = productSales.get(product.id) || 0;

      let message = "";
      let priority: ReorderSuggestion["priority"] = "Low";

      if (product.stock === 0) {
        message = `${product.name} is out of stock. Reorder immediately.`;
        priority = "High";
      } else if (Number.isFinite(daysUntilStockout) && daysUntilStockout <= 3) {
        message = `${product.name} may go out of stock in ${Math.max(1, Math.ceil(daysUntilStockout))} days.`;
        priority = "High";
      } else if (sevenDayVelocity > previousVelocity * 1.25 && sevenDayVelocity > 0) {
        message = `${product.name} sales are increasing rapidly. Reorder soon.`;
        priority = "High";
      } else if (product.stock <= product.reorderLevel) {
        // Only recommend reorder when stock is actually at or below reorder level
        message = `${product.name} stock is low but demand is ${sevenDayVelocity > 0 ? "active" : "stable"}.`;
        priority = product.stock <= product.reorderLevel / 2 ? "High" : "Medium";
      }

      // Calculate recommended quantity with proper business logic
      const forecastDemand = Math.ceil(sevenDayVelocity * 7);
      let recommendedQty = 0;

      // Only recommend reorder if stock is at/below reorder level
      if (product.stock <= product.reorderLevel) {
        recommendedQty = Math.max(
          forecastDemand,
          product.reorderLevel * 2 - product.stock
        );
      } 
      // Or if forecast demand exceeds current stock (for healthy products with increasing demand)
      else if (forecastDemand > product.stock) {
        recommendedQty = forecastDemand - product.stock;
      }

      return {
        productId: product.id,
        productName: product.name,
        currentStock: product.stock,
        reorderLevel: product.reorderLevel,
        stockOutDays: Number.isFinite(daysUntilStockout) ? Math.ceil(daysUntilStockout) : undefined,
        recommendedQty,
        priority,
        message,
        score: priority === "High" ? 3 : priority === "Medium" ? 2 : 1,
      };
    })
    .filter(
      (item) =>
        item.message &&
        item.score > 0 &&
        item.recommendedQty > 0
    )
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return (a.stockOutDays || 999) - (b.stockOutDays || 999);
    });

  // Only limit to top 5 recommendations to avoid too many suggestions
  return recommendations.slice(0, 5);
}

function capExtremeChartValues(data: ForecastPoint[]) {
  const values = data.flatMap(point => [point.actual, point.forecast])
    .filter((value): value is number => Number.isFinite(value) && value !== null && value > 0)
    .sort((a, b) => a - b);

  if (values.length < 4) {
    return data;
  }

  const median = values[Math.floor(values.length / 2)];
  const cap = Math.max(median * 10, values[0]);

  return data.map(point => ({
    ...point,
    actual: point.actual !== null && Number(point.actual) > cap ? cap : point.actual,
    forecast: point.forecast !== null && Number(point.forecast) > cap ? cap : point.forecast,
  }));
}

export default function Dashboard() {
  const dispatch = useAppDispatch();
  const products = useAppSelector(s => s.inventory.items);
  const alerts = useAppSelector(s => s.alerts.items);
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [reorderSuggestions, setReorderSuggestions] = useState<DashboardRecommendation[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);

      let productsRes: Product[] = [];
      let suggestionsRes: DashboardRecommendation[] = [];
      let salesRes: Sale[] = [];
      let mlForecasts: SKUForecast[] = [];

      const [productsResult, salesResult, forecastResult] = await Promise.allSettled([
        getProducts(1, 1000),
        getSales(1000),
        getForecast(),
      ]);

      if (productsResult.status === "fulfilled") {
        productsRes = productsResult.value.data ?? [];
        console.log("Products:", productsRes.length);
      } else {
        console.warn("Dashboard products API failed:", productsResult.reason);
      }

      if (salesResult.status === "fulfilled") {
        salesRes = salesResult.value;
        console.log("Sales data:", salesRes.length);
      } else {
        console.warn("Dashboard sales API failed:", salesResult.reason);
      }

      if (forecastResult.status === "fulfilled") {
        mlForecasts = Array.isArray(forecastResult.value) ? forecastResult.value : [];
        console.log("ML Forecasts:", mlForecasts.length);
      } else {
        console.warn("Dashboard forecast API failed:", forecastResult.reason);
      }

      if (!active) return;

      suggestionsRes = buildAiRecommendations(productsRes, salesRes);

const generatedAlerts = [];

for (const product of productsRes) {
  if (product.stock === 0) {
    generatedAlerts.push({
      id: `${product.id}-out`,
      type: "low",
      message: `${product.name} is out of stock`,
      severity: "high",
      read: false,
      createdAt: new Date().toISOString(),
    });
  } else if (product.stock <= product.reorderLevel) {
    generatedAlerts.push({
      id: `${product.id}-low`,
      type: "low",
      message: `${product.name} stock is low`,
      severity: "medium",
      read: false,
      createdAt: new Date().toISOString(),
    });
  }

  const expiryDate = new Date(product.expiry);
  const daysLeft =
    (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);

  if (daysLeft > 0 && daysLeft <= 7) {
    generatedAlerts.push({
      id: `${product.id}-expiry`,
      type: "expiry",
      message: `${product.name} expires in ${Math.ceil(daysLeft)} days`,
      severity: "medium",
      read: false,
      createdAt: new Date().toISOString(),
    });
  }
}

dispatch(inventoryActions.setProducts(productsRes));
dispatch(alertsActions.setAlerts(generatedAlerts));
setForecast(buildForecastChartData(salesRes, mlForecasts));
setReorderSuggestions(suggestionsRes);
      setSales(salesRes);
      setLoading(false);
    }

    loadDashboard();

    const handleSalesUpdated = () => {
      loadDashboard();
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "retailmind:sales-updated") {
        loadDashboard();
      }
    };

    window.addEventListener("retailmind:sales-updated", handleSalesUpdated);
    window.addEventListener("storage", handleStorage);

    return () => {
      active = false;
      window.removeEventListener("retailmind:sales-updated", handleSalesUpdated);
      window.removeEventListener("storage", handleStorage);
    };
  }, [dispatch]);

  const today = new Date();
  const sevenDaysLater = new Date(today);
sevenDaysLater.setDate(today.getDate() + 7);

  const hasProducts = products.length >= 1;
  const validSales = sales.filter(sale => {
    const quantity = Number(sale.qty_sold ?? 0);
    return Number.isFinite(quantity) && quantity > 0;
  });
  const hasSalesData = validSales.length > 0;
  const lowStock = products.filter(p => p.stock <= p.reorderLevel).length;
  const expiring = products.filter(p => {
    const expiryDate = new Date(p.expiry);
    return !Number.isNaN(expiryDate.getTime()) && expiryDate >= today && expiryDate <= sevenDaysLater
  }).length;
  const totalSales = validSales.reduce((sum, sale) => {
    const product = products.find(p => p.id === sale.product_id);
    const price = product?.price || 0;
    return sum + price * Number(sale.qty_sold || 0);
  }, 0);
  const pendingReorders = reorderSuggestions.length;
  const chartData = Array.isArray(forecast) ? forecast : [];
  const hasChartData = chartData.some(point => Number(point.actual ?? 0) > 0 || Number(point.forecast ?? 0) > 0);
  const hasActualSalesData = chartData.some(point => Number(point.actual ?? 0) > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={loading ? "Loading live overview..." : "Live overview of your store - synced just now"}
        action={
          <Link to="/procurement">
            <Button className="gap-2"><ShoppingCart className="w-4 h-4" />New Procurement</Button>
          </Link>
        }
      />

      {!loading && !hasProducts ? (
        <div className="glow-card p-10 text-center">
          <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h2 className="text-lg font-semibold">No products available</h2>
          <p className="mt-1 text-sm text-muted-foreground">Add products to view dashboard charts and sales insights.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard label="Total Products" value={products.length} icon={Package} />
            <KpiCard label="Low Stock Items" value={lowStock} icon={AlertTriangle} accent="destructive" />
            <KpiCard label="Expiring Soon" value={expiring} icon={Clock} accent="warning" />
            <KpiCard label="Total Sales" value={hasSalesData ? `Rs. ${totalSales.toLocaleString()}` : "No sales data"} icon={IndianRupee} />
            <KpiCard label="Pending Reorders" value={pendingReorders} icon={ShoppingCart} accent="info" />
          </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">7-Day Demand Forecast</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Units sold (actual) vs AI projection</p>
            </div>
            <Badge variant="outline" className="border-primary/40 text-primary">AI Model</Badge>
          </div>
          <div className="h-72">
            {loading ? (
              <div className="h-full rounded-lg bg-secondary/40 animate-pulse" />
            ) : !hasChartData ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No forecast data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tickFormatter={formatChartDate} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    labelFormatter={formatChartDate}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  />
                  <Line type="monotone" dataKey="actual" name="Actual sales" stroke="hsl(var(--info))" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                  <Line type="monotone" dataKey="forecast" name="Forecast" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="glow-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center"><Sparkles className="w-4 h-4 text-primary" /></div>
            <h2 className="text-lg font-semibold">AI Recommendation</h2>
          </div>
          <div className="space-y-3">
            {reorderSuggestions.slice(0, 3).map(s => {
              const prod = products.find(p => p.id === s.productId);
              return (
              <div key={s.productId} className="p-3 rounded-lg bg-secondary/50 border border-border lift-on-hover">
                <div className="flex items-start gap-3">
                  <ProductImage emoji={prod?.image} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-semibold truncate">{s.productName}</div>
                      <Badge variant={s.priority === "High" ? "destructive" : "secondary"} className="text-[10px] shrink-0">{s.priority}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Stock <span className="text-destructive font-medium">{s.currentStock ?? prod?.stock ?? 0}</span> / reorder at <span className="text-primary font-medium">{s.reorderLevel ?? prod?.reorderLevel ?? 0}</span> - suggest <span className="text-primary font-medium">{s.recommendedQty}</span>
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
            {!loading && reorderSuggestions.length === 0 && (
              <div className="text-sm text-muted-foreground py-6 text-center">No reorder suggestions available.</div>
            )}
            <Link to="/procurement">
              <Button variant="outline" className="w-full gap-2">View all reorder suggestions <ArrowRight className="w-4 h-4" /></Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glow-card p-6">
          <h2 className="text-lg font-semibold mb-4">Sales Velocity (last 7 days)</h2>
          <div className="h-56">
            {loading ? (
              <div className="h-full rounded-lg bg-secondary/40 animate-pulse" />
            ) : !hasSalesData || !hasActualSalesData ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No sales data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecast}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tickFormatter={formatChartDate} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    labelFormatter={formatChartDate}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  />
                  <Line type="monotone" dataKey="actual" name="Actual sales" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="glow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Alerts</h2>
            <Link to="/alerts" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {alerts.slice(0, 5).map(a => (
              <div key={a.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-secondary/50 transition-colors">
                <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${
                  a.severity === "high" ? "bg-destructive" : a.severity === "medium" ? "bg-warning" : "bg-info"
                }`} />
                <div className="text-xs leading-snug">{a.message}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
