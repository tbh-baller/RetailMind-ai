import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: string;
  trend?: "up" | "down" | "neutral";
  icon: LucideIcon;
  accent?: "primary" | "warning" | "destructive" | "info";
}

const accentMap = {
  primary: "text-primary bg-primary/10",
  warning: "text-warning bg-warning/10",
  destructive: "text-destructive bg-destructive/10",
  info: "text-info bg-info/10",
};

export function KpiCard({ label, value, delta, trend = "neutral", icon: Icon, accent = "primary" }: KpiCardProps) {
  return (
    <div className="glow-card lift-on-hover p-5 relative overflow-hidden group">
      <div className="absolute inset-x-0 top-0 h-0.5 opacity-60" style={{ background: "var(--gradient-accent)" }} />
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", accentMap[accent])}>
          <Icon className="w-5 h-5" />
        </div>
        {delta && (
          <span className={cn("text-xs font-medium flex items-center gap-1",
            trend === "up" && "text-success",
            trend === "down" && "text-destructive",
            trend === "neutral" && "text-muted-foreground"
          )}>
            {trend === "up" && <TrendingUp className="w-3 h-3" />}
            {trend === "down" && <TrendingDown className="w-3 h-3" />}
            {delta}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold tabular-nums tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
