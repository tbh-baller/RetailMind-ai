import { useEffect, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ProcurementSuggestion = {
  productId: string;
  productName: string;
  stockOutDays: number;
  recommendedQty: number;
  priority: "High" | "Medium" | "Low";
};

type ProcurementOrder = {
  id: string;
  productName: string;
  qty: number;
  supplier: string;
  totalCost: number;
  status: "Pending" | "Delivered" | "Shipped";
};

export default function Procurement() {
  const [suggestions, setSuggestions] = useState<ProcurementSuggestion[]>([]);
  const [orders, setOrders] = useState<ProcurementOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      setSuggestions([]);
      setOrders([]);
    } catch (error) {
      console.warn("Procurement fallback failed:", error);
      setSuggestions([]);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Procurement"
        subtitle={loading ? "Loading procurement data..." : "No procurement data available"}
      />

      <Tabs defaultValue="suggestions">
        <TabsList>
          <TabsTrigger value="suggestions">AI Reorder Suggestions</TabsTrigger>
          <TabsTrigger value="history">Order History ({orders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="mt-4">
          <div className="glow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Stock-out</TableHead>
                  <TableHead className="text-right">Recommended Qty</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-12">
                      Loading procurement data...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && suggestions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-12">
                      No procurement data available
                    </TableCell>
                  </TableRow>
                )}
                {!loading && suggestions.map((item) => (
                  <TableRow key={item.productId}>
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell>in {item.stockOutDays} day{item.stockOutDays !== 1 ? "s" : ""}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.recommendedQty}</TableCell>
                    <TableCell>{item.priority}</TableCell>
                    <TableCell className="text-right">Unavailable</TableCell>
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
                  <TableHead>Order ID</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-12">
                      No procurement data available
                    </TableCell>
                  </TableRow>
                )}
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">{order.id.toUpperCase()}</TableCell>
                    <TableCell className="font-medium">{order.productName}</TableCell>
                    <TableCell className="text-right">{order.qty}</TableCell>
                    <TableCell>{order.supplier}</TableCell>
                    <TableCell className="text-right tabular-nums">Rs. {order.totalCost.toLocaleString()}</TableCell>
                    <TableCell>{order.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
