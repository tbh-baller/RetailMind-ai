import { useEffect, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Star, Info, Truck } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getProducts,
  getSuppliers,
  getProductSuppliers,
  createSupplier,
  type Product,
  type SupplierProduct,
} from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useCanEdit } from "@/hooks/useRole";

export default function Suppliers() {
  const canEdit = useCanEdit();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quotes, setQuotes] = useState<SupplierProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "Local", contact: "" });

  const internal = suppliers.filter((s) => s.type === "Local");
  const external = suppliers.filter((s) => s.type === "External");

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [suppliersRes, productsRes] = await Promise.all([
          getSuppliers(),
          getProducts(),
        ]);
        if (!active) return;

        const normalizedSuppliers = Array.isArray(suppliersRes) ? suppliersRes : [];
        const normalizedProducts = Array.isArray(productsRes) ? productsRes : [];

        setSuppliers(normalizedSuppliers);
        setProducts(normalizedProducts);
        if (normalizedProducts.length > 0) {
          setSelectedProduct(normalizedProducts[0].id);
        }
      } catch (err) {
        console.error("Failed to load data:", err);
        if (active) setError("Could not load suppliers or products");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedProduct) return;
    let active = true;

    async function loadQuotes() {
      try {
        const quotesRes = await getProductSuppliers(selectedProduct);
        if (!active) return;
        setQuotes(Array.isArray(quotesRes) ? quotesRes : []);
      } catch (err) {
        console.error("Failed to load quotes:", err);
      }
    }

    loadQuotes();
    return () => { active = false; };
  }, [selectedProduct]);

  const product = products.find((p) => p.id === selectedProduct);
  const cheapest = quotes.length ? quotes.reduce((a, b) => a.unitPrice < b.unitPrice ? a : b) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers & Price Comparison"
        subtitle={loading ? "Loading suppliers..." : "Manage supplier network and compare prices"}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={!canEdit} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Supplier</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Supplier name"
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Local">Local Distributor</SelectItem>
                      <SelectItem value="External">External/Quick-Commerce</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Contact</Label>
                  <Input
                    value={form.contact}
                    onChange={(e) => setForm({ ...form, contact: e.target.value })}
                    placeholder="Email or phone"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      await createSupplier({
                        name: form.name,
                        type: form.type as "Local" | "External",
                        contact: form.contact,
                      });
                      toast.success("Supplier added");
                      setOpen(false);
                      setForm({ name: "", type: "Local", contact: "" });
                      // Reload suppliers
                      const suppliersRes = await getSuppliers();
                      setSuppliers(Array.isArray(suppliersRes) ? suppliersRes : []);
                    } catch (err) {
                      console.error("Failed to add supplier:", err);
                      toast.error("Failed to add supplier");
                    }
                  }}
                >
                  Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-info bg-info/10 px-3 py-2 rounded-lg border border-info/30 w-fit">
        <Info className="w-3.5 h-3.5" />
        Real suppliers from database + mock external pricing
      </div>

      <Tabs defaultValue="comparison">
        <TabsList>
          <TabsTrigger value="comparison">Price Comparison</TabsTrigger>
          <TabsTrigger value="internal">Internal ({internal.length})</TabsTrigger>
          <TabsTrigger value="external">External ({external.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="mt-4 space-y-4">
          <div className="glow-card p-4 flex items-center gap-3">
            <Label className="text-sm">Product:</Label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="w-80 bg-secondary/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.image} {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {product && (
            <div className="glow-card p-4 border border-border/50 bg-secondary/20">
              <div className="text-sm text-muted-foreground">
                {product.sku} · {product.category}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quotes.map((q) => (
              <div
                key={q.id}
                className="glow-card p-5 hover:border-primary/40 transition-colors relative"
              >
                {q === cheapest && (
                  <Badge className="absolute top-3 right-3 bg-info/20 text-info border-info/30">
                    Cheapest
                  </Badge>
                )}
                <div className="mb-3">
                  <div className="font-semibold text-base">{q.supplierName}</div>
                  <Badge variant="outline" className="text-[10px] mt-1">
                    Local
                  </Badge>
                </div>
                <div className="text-3xl font-bold tabular-nums text-primary">
                  ₹{q.unitPrice.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">per unit</div>
                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border">
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      Delivery
                    </div>
                    <div className="text-sm font-medium">
                      {q.leadTimeDays < 1
                        ? `${Math.round(q.leadTimeDays * 24)}h`
                        : `${q.leadTimeDays.toFixed(1)}d`}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase">Stock</div>
                    <div className="text-sm font-medium">{q.stockQty} units</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      Reliability
                    </div>
                    <div className="text-sm font-medium">{q.reliabilityScore.toFixed(1)}/5</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase">Min Order</div>
                    <div className="text-sm font-medium">{q.minimumOrderQty} units</div>
                  </div>
                </div>
              </div>
            ))}
            {!loading && quotes.length === 0 && (
              <div className="text-sm text-muted-foreground py-12 text-center lg:col-span-3">
                No suppliers available for this product.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="internal" className="mt-4">
          <SupplierTable suppliers={internal} />
        </TabsContent>

        <TabsContent value="external" className="mt-4">
          <SupplierTable suppliers={external} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SupplierTable({ suppliers }: { suppliers: any[] }) {
  return (
    <div className="glow-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead className="text-right">Products</TableHead>
            <TableHead>Rating</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((s) => (
            <TableRow key={s.id} className="hover:bg-secondary/40">
              <TableCell className="font-medium">{s.name}</TableCell>
              <TableCell>
                <Badge variant="outline">{s.type}</Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{s.contact}</TableCell>
              <TableCell className="text-right tabular-nums text-sm">{s.productCount || 0}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-warning">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span className="text-sm font-medium">{(s.rating || 4).toFixed(1)}</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {suppliers.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                No suppliers of this type.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}


