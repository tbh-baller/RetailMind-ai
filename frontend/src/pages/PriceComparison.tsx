import { useEffect, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { ProductImage } from "@/components/common/ProductImage";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getProducts, getSupplierQuotes, type Product, type SupplierQuote } from "@/services/api";
import { IndianRupee, Zap, Trophy, Truck, ShoppingCart, Info, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppDispatch, ordersActions } from "@/store";
import { toast } from "sonner";
import { useCanEdit } from "@/hooks/useRole";

export default function PriceComparison() {
  const dispatch = useAppDispatch();
  const canEdit = useCanEdit();
  const [products, setProducts] = useState<Product[]>([]);
  const [quotesByProduct, setQuotesByProduct] = useState<Record<string, SupplierQuote[]>>({});
  const productIds = Object.keys(quotesByProduct);
  const [selected, setSelected] = useState("");
  const product = products.find(p => p.id === selected);
  const quotes = selected ? quotesByProduct[selected] || [] : [];
  const cheapest = quotes.length ? quotes.reduce((a, b) => (a.price < b.price ? a : b)) : null;
  const fastest = quotes.length ? quotes.reduce((a, b) => (a.deliveryDays < b.deliveryDays ? a : b)) : null;
  const best = quotes.length ? quotes.reduce((a, b) => (a.score > b.score ? a : b)) : null;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [confirming, setConfirming] = useState<{ q: SupplierQuote; qty: number } | null>(null);
  const [qty, setQty] = useState(60);

  useEffect(() => {
    let active = true;

    async function loadComparison() {
      try {
        setLoading(true);
        setError(null);
        const [productsRes, quotesRes] = await Promise.all([getProducts(), getSupplierQuotes()]);
        if (!active) return;

        const normalizedQuotes = Array.isArray(quotesRes) ? {} : quotesRes;
        const ids = Object.keys(normalizedQuotes);
        setProducts(productsRes);
        setQuotesByProduct(normalizedQuotes);
        setSelected(current => current || ids[0] || productsRes[0]?.id || "");
      } catch {
        if (active) setError("Could not load supplier quotes.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadComparison();
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Price Comparison"
        subtitle={loading ? "Loading supplier prices..." : "Compare suppliers across local distributors and quick-commerce platforms"}
      />

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      <div className="glow-card p-4 flex flex-wrap items-center gap-4">
        <Label className="text-sm">Product</Label>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-72 bg-secondary/60"><SelectValue /></SelectTrigger>
          <SelectContent>
            {productIds.map(id => {
              const p = products.find(x => x.id === id);
              return <SelectItem key={id} value={id}>{p?.image} {p?.name}</SelectItem>;
            })}
          </SelectContent>
        </Select>
        <Label className="text-sm ml-2">Qty</Label>
        <input
          type="number"
          value={qty}
          onChange={e => setQty(Math.max(1, Number(e.target.value) || 1))}
          className="w-24 h-9 px-3 rounded-md border border-border bg-secondary/60 text-sm"
        />
        <div className="ml-auto flex items-center gap-1.5 text-xs text-info bg-info/10 px-3 py-1.5 rounded-lg border border-info/30">
          <Info className="w-3.5 h-3.5" /> API / cached data — no scraping
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cheapest && <HighlightCard title="Cheapest" quote={cheapest} qty={qty} accent="info" icon={IndianRupee} />}
        {fastest && <HighlightCard title="Fastest" quote={fastest} qty={qty} accent="warning" icon={Zap} />}
        {best && <HighlightCard title="Best Overall" quote={best} qty={qty} accent="success" icon={Trophy} />}
      </div>

      <div className="glow-card overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <ProductImage emoji={product?.image} size="md" />
          <div>
            <div className="font-semibold">{product?.name || "No product selected"}</div>
            <div className="text-xs text-muted-foreground">{product ? `${product.sku} · ${product.category}` : "Waiting for quote data"}</div>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead>Tag</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.map(q => {
              const tags: { label: string; cls: string; icon: any }[] = [];
              if (q === cheapest) tags.push({ label: "Cheapest", icon: IndianRupee, cls: "bg-info/15 text-info border-info/30 shadow-[0_0_12px_hsl(var(--info)/0.35)]" });
              if (q === fastest) tags.push({ label: "Fastest", icon: Zap, cls: "bg-warning/15 text-warning border-warning/30 shadow-[0_0_12px_hsl(var(--warning)/0.35)]" });
              if (q === best) tags.push({ label: "Best", icon: Trophy, cls: "bg-success/15 text-success border-success/30 shadow-[0_0_12px_hsl(var(--success)/0.35)]" });
              return (
                <TableRow key={q.supplier} className="hover:bg-secondary/40">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-secondary border border-border flex items-center justify-center text-sm font-semibold text-muted-foreground">
                        {q.supplier.split(" ").map(s => s[0]).slice(0, 2).join("")}
                      </div>
                      <div>
                        <div className="font-medium">{q.supplier}</div>
                        <div className="text-[10px] text-muted-foreground">{q.type}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">₹{q.price.toFixed(2)}</TableCell>
                  <TableCell><Truck className="w-3 h-3 inline mr-1" />{q.deliveryDays < 1 ? `${q.deliveryDays * 24}h` : `${q.deliveryDays}d`}</TableCell>
                  <TableCell className="text-right tabular-nums">{q.availability}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{q.score}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {tags.map(t => (
                        <span key={t.label} className={cn("text-[10px] px-1.5 py-0.5 rounded-md border inline-flex items-center gap-1", t.cls)}>
                          <t.icon className="w-3 h-3" />{t.label}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" disabled={!canEdit} onClick={() => setConfirming({ q, qty })}>
                      Confirm Order
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {!loading && quotes.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-12">No quotes available.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!confirming} onOpenChange={(o) => !o && setConfirming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />Confirm Order
            </DialogTitle>
          </DialogHeader>
          {confirming && (
            <div className="p-4 rounded-lg bg-secondary/50 border border-border space-y-2 text-sm">
              <Row label="Product" value={product?.name || "Unknown product"} />
              <Row label="Quantity" value={`${confirming.qty} units`} />
              <Row label="Supplier" value={confirming.q.supplier} />
              <Row label="Unit Price" value={`₹${confirming.q.price.toFixed(2)}`} />
              <div className="border-t border-border pt-2">
                <Row label="Total" value={`₹${(confirming.qty * confirming.q.price).toFixed(2)}`} bold />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirming(null)}>Cancel</Button>
            <Button className="gap-2" onClick={() => {
              if (!confirming) return;
              dispatch(ordersActions.addOrder({
                id: `o-${Date.now()}`,
                productName: product?.name || "Unknown product",
                qty: confirming.qty,
                supplier: confirming.q.supplier,
                totalCost: Math.round(confirming.qty * confirming.q.price),
                status: "Pending",
                createdAt: new Date().toISOString(),
              }));
              toast.success("Order placed", { description: `${confirming.qty} × ${product?.name || "Unknown product"}` });
              setConfirming(null);
            }}><ShoppingCart className="w-4 h-4" />Place Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HighlightCard({
  title, quote, qty, accent, icon: Icon,
}: { title: string; quote: SupplierQuote; qty: number; accent: "info" | "warning" | "success"; icon: any }) {
  const accentMap = {
    info: "from-info/20 to-info/5 border-info/40 text-info",
    warning: "from-warning/20 to-warning/5 border-warning/40 text-warning",
    success: "from-success/20 to-success/5 border-success/40 text-success",
  };
  return (
    <div className={cn("relative rounded-xl p-5 border bg-gradient-to-br lift-on-hover", accentMap[accent])}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-foreground">
        <div className="text-lg font-semibold leading-tight">{quote.supplier}</div>
        <div className="text-3xl font-bold mt-2 tabular-nums">₹{quote.price.toFixed(2)}<span className="text-xs text-muted-foreground font-normal ml-1">/unit</span></div>
        <div className="text-xs text-muted-foreground mt-2">
          {quote.deliveryDays < 1 ? `${quote.deliveryDays * 24}h` : `${quote.deliveryDays}d`} delivery · est. ₹{(qty * quote.price).toLocaleString()} total
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn(bold && "font-semibold text-base text-primary")}>{value}</span>
    </div>
  );
}
