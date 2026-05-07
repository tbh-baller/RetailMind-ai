import { useEffect, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import {
  getBestSellers,
  getCategoryPerformance,
  getForecast,
  getSlowMovers,
  type CategoryPerformance,
  type ForecastPoint,
  type ProductUnits,
} from "@/services/api";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--info))", "hsl(var(--warning))", "hsl(var(--success))", "hsl(var(--destructive))"];

export default function Analytics() {
  const [bestSellers, setBestSellers] = useState<ProductUnits[]>([]);
  const [slowMovers, setSlowMovers] = useState<ProductUnits[]>([]);
  const [categoryPerf, setCategoryPerf] = useState<CategoryPerformance[]>([]);
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
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
        setBestSellers(best);
        setSlowMovers(slow);
        setCategoryPerf(categories);
        setForecast(forecastRes);
      } catch {
        if (active) setError("Could not load analytics.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAnalytics();
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" subtitle={loading ? "Loading analytics..." : "Sales performance, trends, and category insights"} />

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glow-card p-6">
          <h2 className="text-lg font-semibold mb-4">Best-Selling Products</h2>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={bestSellers}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="units" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glow-card p-6">
          <h2 className="text-lg font-semibold mb-4">Slow-Moving Products</h2>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={slowMovers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={90} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="units" fill="hsl(var(--warning))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glow-card p-6">
          <h2 className="text-lg font-semibold mb-4">Category Performance</h2>
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={categoryPerf} dataKey="revenue" nameKey="category" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}>
                  {categoryPerf.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glow-card p-6">
          <h2 className="text-lg font-semibold mb-4">Sales Trend</h2>
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={forecast}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Line type="monotone" dataKey="forecast" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
