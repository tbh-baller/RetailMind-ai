import { useEffect, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import {
  getBestSellers,
  getCategoryPerformance,
  getForecast,
  getSlowMovers,
  type CategoryPerformance,
  type SKUForecast,
  type ProductUnits,
} from "@/services/api";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--info))", "hsl(var(--warning))", "hsl(var(--success))", "hsl(var(--destructive))"];

function truncateText(value: string | undefined, maxLength: number) {
  const text = String(value ?? "");
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

export default function Analytics() {
  const [bestSellers, setBestSellers] = useState<ProductUnits[]>([]);
  const [slowMovers, setSlowMovers] = useState<ProductUnits[]>([]);
  const [categoryPerf, setCategoryPerf] = useState<CategoryPerformance[]>([]);
  const [forecast, setForecast] = useState<SKUForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadAnalytics() {
      try {
        setLoading(true);
        setError(null);
        const [best, slow, categories, forecastRes] = await Promise.all([
          getBestSellers(),
          getSlowMovers(),
          getCategoryPerformance(),
          getForecast(),
        ]);

        if (!active) return;
        setBestSellers(best || []);
        setSlowMovers(slow || []);
        setCategoryPerf(categories || []);
        // Ensure forecast is always an array
        setForecast(Array.isArray(forecastRes) ? forecastRes : []);
        console.log("Analytics: Data loaded successfully", { bestSellers: best?.length, slowMovers: slow?.length, categories: categories?.length, forecasts: forecastRes?.length });
      } catch (err) {
        console.error("Analytics: Error loading analytics", err);
        if (active) setError("Could not load analytics.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAnalytics();
    return () => { active = false; };
  }, []);

  const safeBestSellers = Array.isArray(bestSellers) ? bestSellers : [];
  const safeSlowMovers = Array.isArray(slowMovers) ? slowMovers : [];
  const safeCategoryPerf = Array.isArray(categoryPerf) ? categoryPerf : [];
  const safeForecast = Array.isArray(forecast) ? forecast : [];
  const topForecasts = [...safeForecast].sort((a, b) => (b?.forecast_7_days || 0) - (a?.forecast_7_days || 0)).slice(0, 6);
  const maxForecastValue = Math.max(...safeForecast.map((item) => Number(item?.forecast_7_days ?? 0)), 1);
  const categoryData = safeCategoryPerf.filter((item) => Number(item.revenue ?? 0) > 0);
  const categoryTotal = categoryData.reduce((sum, item) => sum + Number(item.revenue ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Analytics" 
        subtitle={loading ? "Loading analytics..." : "Sales performance, trends, and demand forecasts"} 
      />

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glow-card p-6 animate-pulse">
              <div className="h-8 bg-muted rounded mb-4 w-1/3" />
              <div className="h-72 bg-muted rounded" />
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glow-card p-6">
              <h2 className="text-lg font-semibold mb-4">Best-Selling Products</h2>
              <div className="h-72">
                {safeBestSellers.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={safeBestSellers} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="name"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickFormatter={(value) => truncateText(String(value), 14)}
                      />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip
                        formatter={(value) => [typeof value === "number" ? value.toLocaleString() : value, "Units"]}
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      />
                      <Bar dataKey="units" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    No sales data available
                  </div>
                )}
              </div>
            </div>

            <div className="glow-card p-6">
              <h2 className="text-lg font-semibold mb-4">Slow-Moving Products</h2>
              <div className="h-72">
                <ResponsiveContainer>
                  <BarChart data={safeSlowMovers} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tick={{ fontSize: 12 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      width={120}
                      tickFormatter={(value) => truncateText(String(value), 18)}
                    />
                    <Tooltip
                      formatter={(value) => [typeof value === "number" ? value.toLocaleString() : value, "Units"]}
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    />
                    <Bar dataKey="units" fill="hsl(var(--warning))" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glow-card p-6">
              <h2 className="text-lg font-semibold mb-4">Category Performance</h2>
              <div className="h-72">
                {categoryData.length > 0 ? (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="revenue"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        label={({ name }) => truncateText(String(name), 10)}
                      >
                        {categoryData.map((entry, i) => (
                          <Cell key={entry.category ?? i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [typeof value === "number" ? value.toLocaleString() : value, "Revenue"]}
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    No category performance data available
                  </div>
                )}
              </div>
            </div>

            {/* AI Forecast Summary */}
            <div className="glow-card p-6">
              <h2 className="text-lg font-semibold mb-4">Forecast Summary</h2>
              <div className="space-y-4">
                {forecast && forecast.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
                        <p className="text-xs text-muted-foreground mb-1">Total 7-Day Demand</p>
                        <p className="text-2xl font-bold text-primary">{forecast.reduce((sum, f) => sum + (f?.forecast_7_days || 0), 0)}</p>
                        <p className="text-xs text-muted-foreground mt-1">units forecasted</p>
                      </div>
                      <div className="bg-success/10 rounded-lg p-4 border border-success/20">
                        <p className="text-xs text-muted-foreground mb-1">SKUs Analyzed</p>
                        <p className="text-2xl font-bold text-success">{forecast.length}</p>
                        <p className="text-xs text-muted-foreground mt-1">with sufficient history</p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground text-center pt-2">
                      <p>AI-powered demand forecast using Prophet ML</p>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No forecast data available</p>
                    <p className="text-xs mt-2">Ensure database has sufficient sales history</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top Forecasted Products */}
          {topForecasts.length > 0 && (
            <div className="glow-card p-6">
              <h2 className="text-lg font-semibold mb-4">Top Forecasted Products (7-Day Demand)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topForecasts.map((item) => {
                  if (!item?.sku) return null;
                  const itemForecast = Number(item?.forecast_7_days ?? 0);
                  const percentage = maxForecastValue > 0 ? ((itemForecast / maxForecastValue) * 100).toFixed(0) : "0";
                  const percentNum = parseInt(percentage, 10) || 0;
                  const trend = percentNum > 50 ? "↑ High" : percentNum > 25 ? "→ Medium" : "↓ Low";
                  const trendColor = percentNum > 50 ? "text-success" : percentNum > 25 ? "text-info" : "text-warning";

                  return (
                    <div key={item.sku} className="border border-border rounded-lg p-4 bg-card/50 hover:bg-card/80 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-sm">{truncateText(item.sku, 18)}</p>
                          <p className="text-xs text-muted-foreground">SKU Code</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${percentNum > 50 ? 'bg-success/20 text-success' : percentNum > 25 ? 'bg-info/20 text-info' : 'bg-warning/20 text-warning'}`}>
                          {percentage}%
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Predicted Demand</p>
                          <p className="text-xl font-bold">{itemForecast.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">units (7 days)</p>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-primary rounded-full h-2 transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className={`text-xs font-semibold ${trendColor}`}>
                          {trend} Demand
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
