import { cn } from "@/lib/utils";

export function ProductImage({
  emoji,
  size = "md",
  className,
}: {
  emoji?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims = size === "sm" ? "w-9 h-9 text-lg" : size === "lg" ? "w-16 h-16 text-3xl" : "w-11 h-11 text-xl";
  return (
    <div
      className={cn(
        "shrink-0 rounded-xl flex items-center justify-center border border-border",
        "bg-gradient-to-br from-secondary to-background shadow-sm",
        dims,
        className
      )}
      aria-hidden
    >
      <span className="leading-none">{emoji || "📦"}</span>
    </div>
  );
}
