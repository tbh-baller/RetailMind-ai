import { cn } from "@/lib/utils";
import type { ProductStatus } from "@/services/api";

const map: Record<ProductStatus, { label: string; cls: string }> = {
  healthy: { label: "Healthy", cls: "bg-success/15 text-success border-success/30" },
  low: { label: "Low Stock", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  expiring: { label: "Expiring Soon", cls: "bg-warning/15 text-warning border-warning/30" },
  out: { label: "Out of Stock", cls: "bg-destructive/25 text-destructive border-destructive/40" },
};

export function StatusBadge({ status }: { status: ProductStatus }) {
  const m = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border", m.cls)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {m.label}
    </span>
  );
}
