import { useEffect, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getProcurementRecommendations, getProcurementOrders, createProcurementOrder, type ProcurementRecommendation, type ProcurementOrder, getProductSuppliers } from "@/services/api";
import { ShoppingCart, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useCanEdit } from "@/hooks/useRole";

export default function Procurement() {
  const canEdit = useCanEdit();
  const [recommendations, setRecommendations] = useState<ProcurementRecommendation[]>([]);
  const [orders, setOrders] = useState<ProcurementOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<{ rec: ProcurementRecommendation } | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [recsRes, ordersRes] = await Promise.all([
          getProcurementRecommendations(),
          getProcurementOrders(),
        ]);
        if (!active) return;

        setRecommendations(Array.isArray(recsRes) ? recsRes : []);
        setOrders(Array.isArray(ordersRes) ? ordersRes : []);
      } catch (err) {
        console.error("Failed to load procurement data:", err);
        if (active) setError("Could not load procurement data");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => { active = false; };
  }, []);

  const priorityColors = {
    High: "bg-destructive/20 text-destructive border-destructive/30",
    Medium: "bg-warning/20 text-warning border-warning/30",
    Low: "bg-info/20 text-info border-info/30",
  };

  const handleConfirmOrder = async (rec: ProcurementRecommendation) => {
    try {
      const suppliers = await getProductSuppliers(rec.productId);
      if (suppliers.length === 0) {
        toast.error("No suppliers available", { description: "Add suppliers for this product first" });
        return;
      }
      setConfirming({ rec });
    } catch (err) {
      toast.error("Error loading suppliers");
    }
  };

  const handlePlaceOrder = async (rec: ProcurementRecommendation, suppliers: any[]) => {
    if (!suppliers || suppliers.length === 0) return;
    const supplier = suppliers[0];

    try {
      await createProcurementOrder({
        productId: rec.productId,
        supplierId: supplier.supplierId,
        quantity: rec.recommendedQty,
        aiReasoning: rec.aiReasoning,
      });
      toast.success("Order placed", { description: `${rec.recommendedQty} × ${rec.productName}` });
      setConfirming(null);
      const updated = await getProcurementOrders();
      setOrders(Array.isArray(updated) ? updated : []);
    } catch (err) {
      console.error("Failed to place order:", err);
      toast.error("Failed to place order");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Procurement"
        subtitle={loading ? "Loading procurement data..." : `${recommendations.length} recommendations · ${orders.length} orders`}
      />

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Tabs defaultValue="suggestions">
        <TabsList>
          <TabsTrigger value="suggestions">AI Reorder Suggestions ({recommendations.length})</TabsTrigger>
          <TabsTrigger value="history">Order History ({orders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="mt-4">
          <div className="glow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead className="text-right">Days to Stockout</TableHead>
                  <TableHead className="text-right">Recommended Qty</TableHead>
                  <TableHead className="text-center">Priority</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-12">
                      Loading procurement recommendations...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && recommendations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-12">
                      No reorder recommendations at this time. Stock levels are healthy.
                    </TableCell>
                  </TableRow>
                )}
                {!loading && recommendations.map((item) => (
                  <TableRow key={item.productId} className="hover:bg-secondary/40">
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-xs text-muted-foreground">{item.sku}</div>
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">{item.currentStock}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.stockOutDays ?? "∞"}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{item.recommendedQty}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={`${priorityColors[item.priority]}`}>{item.priority}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" disabled={!canEdit} onClick={() => handleConfirmOrder(item)} className="gap-1">
                        <ShoppingCart className="w-3 h-3" />
                        Order
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className="glow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Est. Delivery</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-12">
                      No procurement orders yet.
                    </TableCell>
                  </TableRow>
                )}
                {orders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-secondary/40">
                    <TableCell className="font-medium">{order.productName}</TableCell>
                    <TableCell className="text-right tabular-nums">{order.quantity}</TableCell>
                    <TableCell>{order.supplierName}</TableCell>
                    <TableCell className="text-right tabular-nums">Rs. {order.unitPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">Rs. {order.totalCost.toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{order.estimatedDelivery || "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={order.status === "Delivered" ? "default" : order.status === "Shipped" ? "secondary" : "outline"}
                      >
                        {order.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <ConfirmOrderDialog confirming={confirming} onConfirm={handlePlaceOrder} onOpenChange={(open) => !open && setConfirming(null)} />
    </div>
  );
}

function ConfirmOrderDialog({
  confirming,
  onConfirm,
  onOpenChange,
}: {
  confirming: { rec: ProcurementRecommendation } | null;
  onConfirm: (rec: ProcurementRecommendation, suppliers: any[]) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}) {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    let active = true;

    async function loadSuppliers() {
      try {
        setLoadingSuppliers(true);
        const { getProductSuppliers } = await import("@/services/api");
        const result = await getProductSuppliers(confirming.rec.productId);
        if (active) setSuppliers(Array.isArray(result) ? result : []);
      } catch (err) {
        console.error("Failed to load suppliers:", err);
        if (active) setSuppliers([]);
      } finally {
        if (active) setLoadingSuppliers(false);
      }
    }

    loadSuppliers();
    return () => { active = false; };
  }, [confirming]);

  if (!confirming) return null;

  const supplier = suppliers[0];
  const totalCost = confirming.rec.recommendedQty * (supplier?.unitPrice || 0);

  return (
    <Dialog open={!!confirming} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Confirm Procurement Order
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {confirming.rec.aiReasoning && (
            <div className="p-3 rounded-lg bg-info/10 border border-info/20">
              <p className="text-xs text-muted-foreground mb-1">AI Reasoning</p>
              <p className="text-info">{confirming.rec.aiReasoning}</p>
            </div>
          )}
          <div className="space-y-2 p-3 rounded-lg bg-secondary/50 border border-border">
            <Row label="Product" value={confirming.rec.productName} />
            <Row label="Quantity" value={`${confirming.rec.recommendedQty} units`} />
            {loadingSuppliers ? (
              <Row label="Supplier" value="Loading..." />
            ) : supplier ? (
              <>
                <Row label="Supplier" value={supplier.supplierName} />
                <Row label="Unit Price" value={`Rs. ${supplier.unitPrice.toFixed(2)}`} />
                <div className="border-t border-border pt-2">
                  <Row label="Total Cost" value={`Rs. ${totalCost.toLocaleString()}`} bold />
                </div>
              </>
            ) : (
              <Row label="Status" value="No suppliers available" />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(confirming.rec, suppliers)}
            disabled={loadingSuppliers || suppliers.length === 0}
            className="gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            Place Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-semibold text-base text-primary" : ""}>{value}</span>
    </div>
  );
}

