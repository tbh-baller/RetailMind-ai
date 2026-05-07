import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingCart, Building2, BarChart3, Bell, Bot, Settings, Sparkles, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/orders", label: "Orders", icon: ShoppingCart },
  { to: "/procurement", label: "Procurement", icon: Building2 },
  { to: "/suppliers", label: "Suppliers", icon: Building2 },
  { to: "/price-comparison", label: "Price Comparison", icon: Scale, badge: "★" },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/chatbot", label: "AI Assistant", icon: Bot },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside
      className="w-64 shrink-0 hidden md:flex flex-col h-screen sticky top-0 text-sidebar-foreground border-r border-sidebar-border"
      style={{
        backgroundImage:
          "linear-gradient(180deg, hsl(var(--sidebar-background)) 0%, hsl(224 30% 5%) 100%)",
      }}
    >
      <div className="px-6 h-16 flex items-center gap-3 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "var(--gradient-accent)", boxShadow: "var(--shadow-glow)" }}>
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-base font-semibold leading-none text-white">RetailMind</div>
          <div className="text-[11px] text-sidebar-foreground/60 mt-1">AI Inventory OS</div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map(({ to, label, icon: Icon, badge }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                active
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-white hover:translate-x-0.5"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full"
                  style={{ background: "var(--gradient-accent)" }} />
              )}
              <Icon className={cn("w-4 h-4", active && "text-sidebar-primary")} />
              <span className="font-medium">{label}</span>
              {badge && <span className="ml-auto text-[10px] text-sidebar-primary">{badge}</span>}
              {active && !badge && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary" />}
            </NavLink>
          );
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border text-xs text-sidebar-foreground/50">
        v1.0 · © RetailMind AI
      </div>
    </aside>
  );
}
