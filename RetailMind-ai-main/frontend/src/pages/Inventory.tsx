import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Upload, Search, Pencil, Trash2, Info, FileWarning, Download, AlertCircle } from "lucide-react";
import { useAppDispatch, useAppSelector, inventoryActions } from "@/store";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCanEdit } from "@/hooks/useRole";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";
import { ProductImage } from "@/components/common/ProductImage";
import { addProduct, bulkUpload, deleteProduct, getProducts, type BulkUploadResponse, type Product, type ProductCreatePayload, updateProduct, } from "@/services/api";

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

const PRODUCT_CATEGORIES = ["grocery", "pharmacy", "beverage", "dairy", "snacks", "household"] as const;

function formatCategoryLabel(category: string) {
  return category ? category.charAt(0).toUpperCase() + category.slice(1).toLowerCase() : "";
}

function downloadSampleCSV() {
  const sample = `name,sku,category,stock,price,expiry,reorder_level
Milk (1L),MILK-001,Dairy,50,60.00,2026-06-05,10
Whole Wheat Bread,BREAD-001,Grocery,30,40.00,2026-05-10,5
Paneer (500g),PANEER-500,Dairy,8,280.00,2026-05-25,30
Surf Excel Detergent,SURF-001,Household,15,150.00,2026-12-31,30
Paracetamol 500mg,PARA-500,Pharmacy,100,15.00,2027-05-05,20
Coca Cola 600ml,CC-600,Beverage,200,35.00,2026-08-05,50
Almonds 500g,ALMOND-500,Snacks,25,450.00,2026-12-31,5
Cough Syrup (100ml),COUGH-100,Pharmacy,0,120.00,2026-08-15,10`;

  const blob = new Blob([sample], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "sample-products.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function Inventory() {
  const dispatch = useAppDispatch();
  const products = useAppSelector(s => s.inventory.items);
  const canEdit = useCanEdit();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [expiryFilter, setExpiryFilter] = useState("all");
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvPreview, setCsvPreview] = useState<Product[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvUploadErrors, setCsvUploadErrors] = useState<BulkUploadResponse["errors"]>([]);
  const [csvUploading, setCsvUploading] = useState(false);
  const [invalidRowsMap, setInvalidRowsMap] = useState<Set<number>>(new Set());
  const [csvMessage, setCsvMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const fetchProducts = async (currentPage = 1, searchTerm = "") => {
    try {
      setLoading(true);
      setError(null);
      const productsRes = await getProducts(currentPage, 10, searchTerm);
      dispatch(inventoryActions.setProducts(productsRes.data));
      setTotal(productsRes.total);
      setTotalPages(productsRes.totalPages);
      setPage(productsRes.page);
    } catch {
      setError("Could not load inventory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      if (!active) return;
      setPage(1);
      await fetchProducts(1, debouncedSearch);
    }

    loadProducts();
    return () => { active = false; };
  }, [dispatch, debouncedSearch]);

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      if (!active) return;
      await fetchProducts(page, debouncedSearch);
    }

    loadProducts();
    return () => { active = false; };
  }, [dispatch, page, debouncedSearch]);

  const filtered = useMemo(() => {
    return products.filter(p => {
      const d = daysUntil(p.expiry);
      const matchExpiry = expiryFilter === "all" ||
        (expiryFilter === "30" && d <= 30) ||
        (expiryFilter === "7" && d <= 7) ||
        (expiryFilter === "2" && d <= 2);
      return matchExpiry;
    });
  }, [products, expiryFilter]);

  const handleCsvUpload = (file: File) => {
    setCsvError(null);
    setCsvUploadErrors([]);
    setCsvFile(file);
    setInvalidRowsMap(new Set());
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = String(e.target?.result || "");
        const lines = text.trim().split("\n");
        const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
        const required = ["name", "sku", "category", "stock", "price", "expiry"];
        const missing = required.filter(r => !headers.includes(r));
        if (missing.length) { setCsvError(`Missing columns: ${missing.join(", ")}`); return; }
        
        const allowedCategories = ["Pharmacy", "Dairy", "Grocery", "Beverage", "Snacks", "Household"];
        const invalidRows = new Set<number>();
        
        const calculateStatus = (stock: number, reorderLevel: number, expiry: string) => {
          // Check if expiring soon (within 7 days)
          if (expiry) {
            const daysUntilExpiry = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000);
            if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
              return "expiring" as const;
            }
          }
          // Stock level logic
          if (stock === 0) return "out" as const;
          if (stock <= reorderLevel) return "low" as const;
          return "healthy" as const;
        };
        
        const rows: Product[] = lines.slice(1).map((line, i) => {
          const cells = line.split(",").map(c => c.trim());
          const get = (k: string) => cells[headers.indexOf(k)];
          
          const category = get("category") || "";
          const stock = get("stock");
          const price = get("price");
          const expiry = get("expiry");
          const reorderLevelStr = get("reorder_level");
          
          // Validate category
          if (category && !allowedCategories.some(c => c.toLowerCase() === category.toLowerCase())) {
            invalidRows.add(i);
          }
          
          // Validate stock is a non-negative integer
          const stockNum = Number(stock);
          if (!Number.isInteger(stockNum) || stockNum < 0) {
            invalidRows.add(i);
          }
          
          // Validate price is a positive number
          const priceNum = Number(price);
          if (!Number.isFinite(priceNum) || priceNum <= 0) {
            invalidRows.add(i);
          }
          
          // Validate expiry is a valid date
          if (expiry && isNaN(Date.parse(expiry))) {
            invalidRows.add(i);
          }
          
          const reorderLevel = reorderLevelStr ? Number(reorderLevelStr) : 30;
          
          return {
            id: `csv-${Date.now()}-${i}`,
            sku: get("sku"),
            name: get("name"),
            category: (get("category") as any) || "Grocery",
            stock: stockNum || 0,
            reorderLevel,
            price: priceNum || 0,
            expiry: get("expiry"),
            status: calculateStatus(stockNum || 0, reorderLevel, get("expiry")),
            velocity: 5,
          };
        });
        
        setInvalidRowsMap(invalidRows);
        setCsvPreview(rows);
      } catch {
        setCsvError("Could not parse CSV. Check format.");
      }
    };
    reader.readAsText(file);
  };

  const handleCsvImport = async () => {
    if (!csvFile) {
      setCsvError("Please select a CSV file before importing.");
      return;
    }

    try {
      setCsvUploading(true);
      setError(null);
      setCsvError(null);
      setCsvUploadErrors([]);
      setCsvMessage(null);

      const response = await bulkUpload(csvFile);
      setCsvUploadErrors(response.errors || []);

      const totalProcessed = response.insertedCount + response.updatedCount;

      if (totalProcessed > 0) {
        let message = "";
        if (response.insertedCount > 0 && response.updatedCount > 0) {
          message = `${response.insertedCount} inserted, ${response.updatedCount} updated`;
        } else if (response.insertedCount > 0) {
          message = `${response.insertedCount} products inserted`;
        } else if (response.updatedCount > 0) {
          message = `${response.updatedCount} products updated`;
        }
        
        toast.success(message);
        await fetchProducts(1, debouncedSearch);
      }

      if (response.failedCount > 0) {
        const failMsg = `${response.failedCount} rows failed`;
        setCsvMessage(failMsg);
        toast.warning(failMsg);
      }

      if (totalProcessed === 0) {
        toast.error("No valid rows found in CSV");
        setCsvError("No valid rows found in CSV");
        return;
      }

      if (response.failedCount === 0) {
        setCsvOpen(false);
        setCsvPreview([]);
        setCsvFile(null);
        setInvalidRowsMap(new Set());
      }
    } catch (err: any) {
      setError(err?.message || "Could not upload CSV. Please try again.");
    } finally {
      setCsvUploading(false);
    }
  };

  const handleAddProduct = async (payload: ProductCreatePayload) => {
    try {
      setActionLoading(true);
      setError(null);
      await addProduct(payload);
      toast.success("Product added");
      await fetchProducts(1, debouncedSearch);
    } catch (err: any) {
      setError(err?.message || "Could not add product. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStock = async (product: Product) => {
    try {
      setActionLoading(true);
      setError(null);
      await updateProduct(product.id, { stock: product.stock + 10 });
      toast.success("Stock updated");
      await fetchProducts(1, debouncedSearch);
    } catch {
      setError("Could not update stock. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      setActionLoading(true);
      setError(null);
      await deleteProduct(id);
      toast.success("Product removed");
      await fetchProducts(1, debouncedSearch);
    } catch {
      setError("Could not remove product. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        subtitle={loading ? "Loading products..." : `${total} products tracked`}
        action={
          <div className="flex gap-2">
            <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={!canEdit} className="gap-2"><Upload className="w-4 h-4" />Upload CSV</Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader><DialogTitle>Bulk Import — CSV Upload</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="mb-2 block text-sm font-medium">CSV File</Label>
                      <Input type="file" accept=".csv" disabled={csvUploading} onChange={e => e.target.files?.[0] && handleCsvUpload(e.target.files[0])} />
                    </div>
                    <Button variant="outline" onClick={downloadSampleCSV} className="gap-2" size="sm">
                      <Download className="w-4 h-4" />
                      Sample CSV
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Required columns: name, sku, category, stock, price, expiry<br/>
                    Valid categories: Pharmacy, Dairy, Grocery, Beverage, Snacks, Household
                  </p>
                  {csvError && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                      <FileWarning className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{csvError}</span>
                    </div>
                  )}
                  {csvMessage && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{csvMessage}</span>
                    </div>
                  )}
                  {csvUploadErrors.length > 0 && (
                    <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
                      <div className="mb-2 text-sm font-medium text-warning">{csvUploadErrors.length} rows failed to import</div>
                      <div className="max-h-40 overflow-auto space-y-1 text-sm">
                        {csvUploadErrors.map((err, index) => (
                          <div key={`${err.row}-${index}`} className="text-foreground">
                            <span className="font-mono text-xs text-muted-foreground">Row {err.row}:</span> {err.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {csvPreview.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-2">
                        Preview {invalidRowsMap.size > 0 && `(${invalidRowsMap.size} invalid row${invalidRowsMap.size !== 1 ? "s" : ""})`}
                      </div>
                      <div className="border border-border rounded-lg max-h-80 overflow-auto">
                        <Table>
                          <TableHeader><TableRow><TableHead className="w-12">Row</TableHead><TableHead>SKU</TableHead><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Stock</TableHead><TableHead>Price</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {csvPreview.slice(0, 20).map((r, idx) => {
                              const isInvalid = invalidRowsMap.has(idx);
                              return (
                                <TableRow key={r.id} className={isInvalid ? "bg-destructive/5 hover:bg-destructive/10" : undefined}>
                                  <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                                  <TableCell className="font-mono text-xs">{r.sku}</TableCell>
                                  <TableCell className="text-sm">{r.name}</TableCell>
                                  <TableCell>
                                    <span className={`text-xs px-2 py-1 rounded-md ${isInvalid ? "bg-destructive/20 text-destructive" : "bg-secondary text-foreground"}`}>
                                      {r.category}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-xs">{r.stock}</TableCell>
                                  <TableCell className="text-xs">₹{r.price}</TableCell>
                                  {isInvalid && (
                                    <TableCell><AlertCircle className="w-4 h-4 text-destructive" /></TableCell>
                                  )}
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="ghost" disabled={csvUploading} onClick={() => { setCsvOpen(false); setCsvPreview([]); setCsvError(null); setCsvUploadErrors([]); setCsvFile(null); setInvalidRowsMap(new Set()); setCsvMessage(null); }}>Cancel</Button>
                  <Button disabled={!csvPreview.length || csvUploading} onClick={handleCsvImport}>
                    {csvUploading ? "Uploading..." : `Import ${csvPreview.length} products`}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AddProductDialog open={addOpen} onOpenChange={setAddOpen} canEdit={canEdit} onCreate={handleAddProduct} />
          </div>
        }
      />

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      <div className="glow-card p-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or SKU…" className="pl-9 bg-secondary/60" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={expiryFilter} onValueChange={setExpiryFilter}>
          <SelectTrigger className="w-48 bg-secondary/60"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All expiry</SelectItem>
            <SelectItem value="30">Expiring in 30 days</SelectItem>
            <SelectItem value="7">Expiring in 7 days</SelectItem>
            <SelectItem value="2">Expiring in 2 days</SelectItem>
          </SelectContent>
        </Select>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-xs text-warning bg-warning/10 px-3 py-2 rounded-lg border border-warning/30">
                <Info className="w-3.5 h-3.5" />FIFO: Sell older stock first
              </div>
            </TooltipTrigger>
            <TooltipContent>Items closer to expiry are flagged. Move them to the front of the shelf.</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="glow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-12">
                  <div className="inline-flex items-center gap-2 justify-center">
                    <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Loading products...
                  </div>
                </TableCell>
              </TableRow>
            )}
            {!loading && filtered.map(p => {
              const d = daysUntil(p.expiry);
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <ProductImage emoji={p.image} size="sm" />
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{p.sku}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-xs px-2 py-1 rounded-md bg-secondary">{formatCategoryLabel(p.category)}</span></TableCell>
                  <TableCell className="text-right tabular-nums">
                    <div className="font-medium">{p.stock}</div>
                    <div className="text-[10px] text-muted-foreground">reorder @ {p.reorderLevel}</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">₹{p.price}</TableCell>
                  <TableCell>
                    <span className={d <= 7 ? "text-warning text-sm" : "text-sm text-muted-foreground"}>
                      {d <= 0 ? "Expired" : `${d}d`}
                    </span>
                  </TableCell>
                  <TableCell><StatusBadge status={p.status} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" disabled={!canEdit || actionLoading} onClick={() => handleUpdateStock(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" disabled={!canEdit || actionLoading} onClick={() => handleDeleteProduct(p.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {!loading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-12">No products match your filters.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 bg-background/80 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">Page {page} of {totalPages} · {total} products</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={loading || page <= 1} onClick={() => setPage(prev => Math.max(1, prev - 1))}>Previous</Button>
            <Button variant="outline" disabled={loading || page >= totalPages} onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}>Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddProductDialog({
  open,
  onOpenChange,
  canEdit,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  canEdit: boolean;
  onCreate: (payload: ProductCreatePayload) => Promise<void>;
}) {
  const [form, setForm] = useState({ name: "", sku: "", category: "grocery", stock: 0, price: 0, expiry: "" });
  const [categoryError, setCategoryError] = useState("");

  const submit = async () => {
    if (!form.category.trim()) {
      setCategoryError("Please select a category.");
      return;
    }

    try {
      await onCreate({
        name: form.name,
        sku: form.sku,
        category: form.category as Product["category"],
        stock: form.stock,
        price: form.price,
        expiry: form.expiry || new Date().toISOString(),
        reorderLevel: 30,
      });
      onOpenChange(false);
      setForm({ name: "", sku: "", category: "grocery", stock: 0, price: 0, expiry: "" });
      setCategoryError("");
    } catch {
      // Error state is handled by the parent inventory page.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={!canEdit} className="gap-2"><Plus className="w-4 h-4" />Add Product</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Product</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>SKU</Label><Input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} /></div>
          <div><Label>Category</Label>
            <Select value={form.category} onValueChange={v => { setForm({ ...form, category: v }); setCategoryError(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRODUCT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{formatCategoryLabel(c)}</SelectItem>)}
              </SelectContent>
            </Select>
            {categoryError && <p className="mt-1 text-xs text-destructive">{categoryError}</p>}
          </div>
          <div><Label>Stock</Label><Input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: +e.target.value })} /></div>
          <div><Label>Price (₹)</Label><Input type="number" value={form.price} onChange={e => setForm({ ...form, price: +e.target.value })} /></div>
          <div className="col-span-2"><Label>Expiry</Label><Input type="date" value={form.expiry} onChange={e => setForm({ ...form, expiry: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
