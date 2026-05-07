import { useEffect, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { useAppDispatch, useAppSelector, suppliersActions } from "@/store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Star, Info } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getProducts, getSupplierQuotes, getSuppliers, type Product, type SupplierQuote } from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useCanEdit } from "@/hooks/useRole";

export default function Suppliers() {
  const dispatch = useAppDispatch();
  const suppliers = useAppSelector(s => s.suppliers.items);
  const canEdit = useCanEdit();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "Local", contact: "" });
  const [selectedProduct, setSelectedProduct] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [quotesByProduct, setQuotesByProduct] = useState<Record<string, SupplierQuote[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const internal = suppliers.filter(s => s.type === "Local");
  const external = suppliers.filter(s => s.type === "External");
  const quotes = selectedProduct ? quotesByProduct[selectedProduct] || [] : [];

  useEffect(() => {
    let active = true;

    async function loadSuppliers() {
      try {
        setLoading(true);
        setError(null);
        const [suppliersRes, productsRes, quotesRes] = await Promise.all([
          getSuppliers(),
          getProducts(),
          getSupplierQuotes(),
        ]);
        if (!active) return;

        const normalizedQuotes = Array.isArray(quotesRes) ? {} : quotesRes;
        const ids = Object.keys(normalizedQuotes);
        dispatch(suppliersActions.setSuppliers(suppliersRes));
        setProducts(productsRes);
        setQuotesByProduct(normalizedQuotes);
        setSelectedProduct(current => current || ids[0] || productsRes[0]?.id || "");
      } catch {
        if (active) setError("Could not load suppliers.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSuppliers();
    return () => { active = false; };
  }, [dispatch]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers & Price Comparison"
        subtitle={loading ? "Loading suppliers..." : "Manage supplier network and compare prices across platforms"}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={!canEdit} className="gap-2"><Plus className="w-4 h-4" />Add Supplier</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Supplier</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Type</Label>
                  <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Local">Local</SelectItem>
                      <SelectItem value="External">External</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Contact</Label><Input value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={() => {
                  dispatch(suppliersActions.addSupplier({
                    id: `s-${Date.now()}`, name: form.name, type: form.type as any,
                    contact: form.contact, rating: 4.0, products: 0,
                  }));
                  toast.success("Supplier added");
                  setOpen(false); setForm({ name: "", type: "Local", contact: "" });
                }}>Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      <div className="flex items-center gap-2 text-xs text-info bg-info/10 px-3 py-2 rounded-lg border border-info/30 w-fit">
        <Info className="w-3.5 h-3.5" />This system uses API/cached data. No scraping is used.
      </div>

      <Tabs defaultValue="comparison">
        <TabsList>
          <TabsTrigger value="comparison">Price Comparison</TabsTrigger>
          <TabsTrigger value="internal">Internal ({internal.length})</TabsTrigger>
          <TabsTrigger value="external">External ({external.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="mt-4 space-y-4">
          <div className="glow-card p-4 flex items-center gap-3">
            <Label className="text-sm">Compare prices for:</Label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="w-64 bg-secondary/60"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(quotesByProduct).map(id => {
                  const p = products.find(x => x.id === id);
                  return <SelectItem key={id} value={id}>{p?.name || id}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quotes.map(q => {
              const cheapest = quotes.reduce((a, b) => a.price < b.price ? a : b);
              return (
                <div key={q.supplier} className="glow-card p-5 hover:border-primary/40 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-semibold">{q.supplier}</div>
                      <Badge variant="outline" className="text-[10px] mt-1">{q.type}</Badge>
                    </div>
                    {q === cheapest && <Badge className="bg-info/20 text-info border-info/30">Cheapest</Badge>}
                  </div>
                  <div className="text-3xl font-bold tabular-nums text-primary">₹{q.price.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground mt-1">per unit</div>
                  <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Delivery</div>
                      <div className="text-sm font-medium">{q.deliveryDays < 1 ? `${q.deliveryDays * 24}h` : `${q.deliveryDays}d`}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Stock</div>
                      <div className="text-sm font-medium">{q.availability}</div>
                    </div>
                  </div>
                </div>
              );
            })}
            {!loading && quotes.length === 0 && (
              <div className="text-sm text-muted-foreground py-12 text-center lg:col-span-3">No quotes available.</div>
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
          {suppliers.map(s => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.name}</TableCell>
              <TableCell><Badge variant="outline">{s.type}</Badge></TableCell>
              <TableCell className="text-sm text-muted-foreground">{s.contact}</TableCell>
              <TableCell className="text-right tabular-nums">{s.products}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-warning">
                  <Star className="w-3.5 h-3.5 fill-current" /><span className="text-sm font-medium">{s.rating}</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
