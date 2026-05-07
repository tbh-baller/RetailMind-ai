import { PageHeader } from "@/components/common/PageHeader";
import { useAppDispatch, useAppSelector, alertsActions } from "@/store";
import { Button } from "@/components/ui/button";
import { Check, CheckCheck, AlertTriangle, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { getAlerts } from "@/services/api";

const iconMap = { low: AlertTriangle, expiry: Clock, expired: Clock, spike: TrendingUp };

export default function Alerts() {
  const dispatch = useAppDispatch();
  const alerts = useAppSelector(s => s.alerts.items);
  const unread = alerts.filter(a => !a.read).length;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadAlerts() {
      try {
        setLoading(true);
        setError(null);
        const alertsRes = await getAlerts();
        if (active) dispatch(alertsActions.setAlerts(alertsRes));
      } catch {
        if (active) setError("Could not load alerts.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAlerts();
    return () => { active = false; };
  }, [dispatch]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts"
        subtitle={loading ? "Loading alerts..." : `${unread} unread · ${alerts.length} total`}
        action={
          <Button variant="outline" className="gap-2" onClick={() => dispatch(alertsActions.markAllRead())}>
            <CheckCheck className="w-4 h-4" />Mark all read
          </Button>
        }
      />

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      <div className="space-y-2">
        {loading && <div className="glow-card p-6 text-sm text-muted-foreground text-center">Loading alerts...</div>}
        {!loading && alerts.map(a => {
          const Icon = iconMap[a?.type] || AlertTriangle;
          const severity = a?.severity || "low";
          const sevCls = severity === "high" ? "bg-destructive/15 text-destructive border-destructive/30"
            : severity === "medium" ? "bg-warning/15 text-warning border-warning/30"
            : "bg-info/15 text-info border-info/30";
          const createdDate = a?.createdAt ? new Date(a.createdAt).toLocaleString() : "Unknown";
          return (
            <div key={a?.id || Math.random()} className={cn("glow-card p-4 flex items-center gap-4 transition-opacity", a?.read && "opacity-50")}>
              <div className={cn("w-10 h-10 rounded-lg border flex items-center justify-center shrink-0", sevCls)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded border", sevCls)}>
                    {severity}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{createdDate}</span>
                </div>
                <div className="text-sm font-medium mt-1">{a?.message || "No message"}</div>
              </div>
              {!a?.read && (
                <Button variant="ghost" size="sm" className="gap-2" onClick={() => a?.id && dispatch(alertsActions.markRead(a.id))}>
                  <Check className="w-3.5 h-3.5" />Mark read
                </Button>
              )}
            </div>
          );
        })}
        {!loading && alerts.length === 0 && <div className="glow-card p-6 text-sm text-muted-foreground text-center">No alerts available.</div>}
      </div>
    </div>
  );
}
