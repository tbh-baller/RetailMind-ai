const API_BASE_URL = "http://localhost:5000/api";

export type ProductStatus = "healthy" | "low" | "expiring" | "out";

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  category: "Grocery" | "Pharmacy" | "Beverage" | "Dairy" | "Snacks" | "Household" | string;
  stock: number;
  reorderLevel: number;
  expiry: string;
  status: ProductStatus;
  velocity: number;
  image?: string;
}

export interface ReorderSuggestion {
  productId: string;
  productName: string;
  currentStock?: number;
  reorderLevel?: number;
  stockOutDays?: number;
  recommendedQty: number;
  priority: "High" | "Medium" | "Low";
}

export interface SupplierQuote {
  supplier: string;
  type: "Local" | "External";
  price: number;
  availability: number;
  deliveryDays: number;
  score: number;
}

export interface Order {
  id: string;
  productName: string;
  qty: number;
  supplier: string;
  totalCost: number;
  status: "Pending" | "Delivered" | "Shipped";
  createdAt: string;
}

export interface Sale {
  id: string;
  productId: string;
  product_id: string;
  qty_sold: number;
  unit_price?: number;
  total_sale?: number;
  totalCost?: number;
  saleDate?: string;
  sale_date?: string;
  created_at?: string;
  createdAt: string;
  updatedAt?: string;
  name?: string;
  product_name?: string;
  sku?: string;
  category?: string;
  is_deleted?: boolean;
}

export interface AlertItem {
  id: string;
  type: "low" | "expiry" | "expired" | "spike";
  message: string;
  severity: "high" | "medium" | "low";
  read: boolean;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  type: "Local" | "External";
  rating: number;
  contact: string;
  products: number;
}

export interface ForecastPoint {
  day: string;
  actual: number | null;
  forecast: number | null;
}

export interface SKUForecast {
  sku: string;
  forecast_7_days: number;
}

export interface ProcurementRecommendation {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  reorderLevel: number;
  stockOutDays?: number;
  recommendedQty: number;
  priority: "High" | "Medium" | "Low";
  sevenDayVelocity: number;
  forecastDemand: number;
  aiReasoning: string;
}

export interface ProcurementOrder {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  supplierId: string;
  supplierName: string;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  estimatedDelivery?: string;
  status: "Pending" | "Approved" | "Shipped" | "Delivered";
  aiReasoning?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SupplierProduct {
  id: string;
  supplierId: string;
  productId: string;
  supplierName: string;
  productName: string;
  sku: string;
  unitPrice: number;
  leadTimeDays: number;
  reliabilityScore: number;
  stockQty: number;
  minimumOrderQty: number;
}

export interface ProductForecast {
  productId: string;
  productName: string;
  forecast: Array<{
    day: string;
    value: number;
  }>;
}

export interface ProductUnits {
  name: string;
  units: number;
}

export interface CategoryPerformance {
  category: string;
  revenue: number;
}

export interface PaginatedProducts {
  data: Product[];
  total: number;
  page: number;
  totalPages: number;
}

export interface BulkUploadResponse {
  insertedCount: number;
  updatedCount: number;
  failedCount: number;
  errors: Array<{
    row: number;
    message: string;
  }>;
}

export type ProductCreatePayload = Omit<Product, "id" | "status" | "velocity" | "image"> & {
  reorderLevel?: number;
};

type ApiEnvelope<T> = T | { data?: T; items?: T; results?: T };

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text || undefined;
}

function getErrorMessage(payload: unknown, response: Response): string {
  if (payload && typeof payload === "object") {
    const body = payload as { message?: unknown; error?: unknown };
    if (typeof body.message === "string" && body.message.trim()) return body.message;
    if (typeof body.error === "string" && body.error.trim()) return body.error;
  }

  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  return response.statusText || `Request failed with status ${response.status}`;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...init } = options;
  const isFormData = body instanceof FormData;

  const response = await fetch(`${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  const payload = await parseResponseBody(response);

  if (!response.ok) {
    throw new ApiError(getErrorMessage(payload, response), response.status, payload);
  }

  return payload as T;
}

const unwrap = <T>(payload: ApiEnvelope<T>): T => {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const envelope = payload as { data?: T; items?: T; results?: T };
    return (envelope.data ?? envelope.items ?? envelope.results ?? payload) as T;
  }

  return payload as T;
};

function calculateProductStatus(stock: number, reorderLevel: number, expiry: string): ProductStatus {
  if (expiry) {
    const daysUntilExpiry = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000);
    if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
      return "expiring";
    }
  }

  if (stock === 0) return "out";
  if (stock <= reorderLevel) return "low";
  return "healthy";
}

function normalizeProduct(item: any): Product {
  const stock = Number(item.stock) || 0;
  const reorderLevel = Number(item.reorder_level ?? item.reorderLevel ?? 0);
  const expiry = String(item.expiry || "");

  return {
    id: String(item.id || ""),
    name: String(item.name || ""),
    sku: String(item.sku || ""),
    price: Number(item.price) || 0,
    category: String(item.category || "Grocery"),
    stock,
    reorderLevel,
    expiry,
    status: calculateProductStatus(stock, reorderLevel, expiry),
    velocity: Number(item.velocity || 0),
    image: item.image ? String(item.image) : undefined,
  };
}

function normalizeProductsResponse(payload: unknown, fallbackPage: number): PaginatedProducts {
  const response = payload as any;
  const rawData = Array.isArray(response)
    ? response
    : response?.data || response?.items || response?.results || [];

  const products = Array.isArray(rawData) ? rawData.map(normalizeProduct) : [];

  return {
    data: products,
    total: Number(response?.total) || products.length,
    page: Number(response?.page) || fallbackPage,
    totalPages: Number(response?.totalPages ?? response?.total_pages) || 1,
  };
}

function normalizeSale(item: any): Sale {
  const productId = String(item.product_id ?? item.productId ?? "");
  const quantity = Number(item.qty_sold ?? item.qty ?? item.qtySold ?? 0);
  const saleDate = item.sale_date ?? item.saleDate ?? item.date;
  const productName = item.name ?? item.product_name;
  const unitPrice = Number(item.unit_price ?? item.unitPrice ?? item.price ?? 0);
  const totalSale = Number(item.total_sale ?? item.totalSale ?? item.total_value ?? item.totalCost ?? 0);

  return {
    id: String(item.id || ""),
    productId,
    product_id: productId,
    qty_sold: quantity,
    unit_price: unitPrice,
    total_sale: totalSale,
    totalCost: totalSale,
    saleDate,
    sale_date: saleDate,
    created_at: String(item.created_at ?? item.createdAt ?? item.date ?? ""),
    createdAt: String(item.created_at ?? item.createdAt ?? item.date ?? ""),
    updatedAt: item.updated_at ?? item.updatedAt,
    name: productName,
    product_name: productName,
    sku: item.sku,
    category: item.category,
    is_deleted: Boolean(item.is_deleted ?? false),
  };
}

// PRODUCTS
export async function getProducts(): Promise<Product[]>;
export async function getProducts(page: number, limit?: number, search?: string): Promise<PaginatedProducts>;

export async function getProducts(
  page?: number,
  limit?: number,
  search = ""
): Promise<Product[] | PaginatedProducts> {

  // PAGINATED MODE
  if (page !== undefined) {
    const params = new URLSearchParams();

    params.set("page", String(page));

    if (limit !== undefined) {
      params.set("limit", String(limit));
    }

    if (search.trim()) {
      params.set("search", search.trim());
    }

    const payload = await request<unknown>(`/products?${params.toString()}`);

    return normalizeProductsResponse(payload, page);
  }

  // FETCH ALL PRODUCTS MODE
  const firstPayload = await request<unknown>("/products");

  const firstResponse = normalizeProductsResponse(firstPayload, 1);

  let allProducts: Product[] = [...firstResponse.data];

  console.log("[API DEBUG] First page products:", firstResponse.data.length);
  console.log("[API DEBUG] Total pages:", firstResponse.totalPages);

  // FETCH REMAINING PAGES
  if (firstResponse.totalPages > 1) {

    const requests = [];

    for (let p = 2; p <= firstResponse.totalPages; p++) {
      console.log("[API DEBUG] Fetching page:", p);

      requests.push(
        request<unknown>(`/products?page=${p}`)
      );
    }

    const responses = await Promise.all(requests);

    responses.forEach((payload, index) => {
      const response = normalizeProductsResponse(payload, index + 2);

      console.log(
        `[API DEBUG] Page ${index + 2} products:`,
        response.data.length
      );

      allProducts = [...allProducts, ...response.data];
    });
  }

  console.log("[API DEBUG] FINAL TOTAL PRODUCTS:", allProducts.length);

  return allProducts;
}
export async function addProduct(product: ProductCreatePayload): Promise<Product> {
  const category = String(product.category || "").trim().toLowerCase();

  if (!category) {
    throw new Error("Category is required");
  }

  const payload = {
    sku: product.sku,
    name: product.name,
    category,
    stock: product.stock,
    reorder_level: product.reorderLevel ?? 30,
    price: product.price,
    expiry: product.expiry,
  };

  return normalizeProduct(await request<unknown>("/products", { method: "POST", body: payload }));
}

export async function updateProduct(id: string, payload: Partial<Product>): Promise<Product> {
  const transformed: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    transformed[key === "reorderLevel" ? "reorder_level" : key] = value;
  }

  return normalizeProduct(await request<unknown>(`/products/${id}`, { method: "PUT", body: transformed }));
}

export async function deleteProduct(id: string): Promise<void> {
  await request<void>(`/products/${id}`, { method: "DELETE" });
}

export async function bulkUpload(file: File): Promise<BulkUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    return await request<BulkUploadResponse>("/products/bulk-upload", {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    if (error instanceof ApiError && error.payload && typeof error.payload === "object" && "successCount" in error.payload) {
      return error.payload as unknown as BulkUploadResponse;
    }

    throw error;
  }
}

// SALES / ORDERS
export async function createSale(data: {
  product_id: string;
  qty_sold: number;
  sale_date: string;
}): Promise<any> {
  const payload = await request<ApiEnvelope<any>>("/sales", {
    method: "POST",
    body: data,
  });
  return normalizeSale(unwrap<any>(payload));
}

export async function deleteSale(id: string): Promise<void> {
  await request<void>(`/sales/${id}`, { method: "DELETE" });
}

export async function exportSalesCsv(startDate?: string, endDate?: string): Promise<void> {
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  
  const endpoint = `/sales/export${params.toString() ? `?${params.toString()}` : ""}`;
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`);
  
  if (!response.ok) {
    throw new Error(`Failed to export sales: ${response.statusText}`);
  }
  
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sales-export-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function getSales(limit = 1000, offset = 0): Promise<Sale[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const payload = await request<ApiEnvelope<any[]>>(`/sales?${params.toString()}`);
  const data = unwrap<any[]>(payload);
  return Array.isArray(data) ? data.map(normalizeSale) : [];
}

export async function uploadSalesCsv(file: File): Promise<{ insertedCount?: number; uploadedRows?: number; message?: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/sales/bulk-upload`, {
    method: "POST",
    body: formData,
  });

  const contentType = response.headers.get("content-type") || "";
  let data: any = {};

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = text ? { message: text } : {};
  }

  if (!response.ok) {
    const errorMessage = data?.message || data?.error || `Upload failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  return data;
}

// OPTIONAL (stub for future ML)
export async function getSalesSummary(): Promise<any[]> {
  const payload = await request<ApiEnvelope<any[]>>("/sales/summary");
  const data = unwrap<any[]>(payload);
  return Array.isArray(data) ? data : [];
}

export async function getOrders(): Promise<Order[]> {
  return [];
}

export async function getAlerts(): Promise<AlertItem[]> {
  const payload = await request<ApiEnvelope<AlertItem[]>>("/alerts");
  const data = unwrap<AlertItem[]>(payload);
  return Array.isArray(data) ? data : [];
}

export async function getForecast(): Promise<SKUForecast[]> {
  try {
    const payload = await request<{ data?: SKUForecast[] }>("/forecast");
    const response = payload as any;
    const data = response?.data || [];
    
    if (!Array.isArray(data)) {
      console.warn("getForecast: Response data is not an array", response);
      return [];
    }
    
    console.log("getForecast: Successfully retrieved", data.length, "forecasts");
    return data;
  } catch (error) {
    console.error("Forecast API error:", error instanceof ApiError ? { status: error.status, message: error.message } : error);
    return [];
  }
}

export async function getReorderSuggestions(): Promise<ReorderSuggestion[]> {
  return [];
}

export async function getBestSellers(): Promise<ProductUnits[]> {
  try {
    const response = await request<{ data?: ProductUnits[] }>("/sales/analytics/best-sellers");
    const data = (response as any)?.data || [];
    console.log("getBestSellers: Retrieved", data.length, "items");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("getBestSellers API error:", error instanceof ApiError ? { status: error.status, message: error.message } : error);
    return [];
  }
}

export async function getSlowMovers(): Promise<ProductUnits[]> {
  try {
    const response = await request<{ data?: ProductUnits[] }>("/sales/analytics/slow-movers");
    const data = (response as any)?.data || [];
    console.log("getSlowMovers: Retrieved", data.length, "items");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("getSlowMovers API error:", error instanceof ApiError ? { status: error.status, message: error.message } : error);
    return [];
  }
}

export async function getCategoryPerformance(): Promise<CategoryPerformance[]> {
  try {
    const response = await request<{ data?: CategoryPerformance[] }>("/sales/analytics/category-performance");
    const data = (response as any)?.data || [];
    console.log("getCategoryPerformance: Retrieved", data.length, "items");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("getCategoryPerformance API error:", error instanceof ApiError ? { status: error.status, message: error.message } : error);
    return [];
  }
}

// SUPPLIERS
export async function getSuppliers(): Promise<Supplier[]> {
  try {
    const response = await request<{ data?: Supplier[] }>("/suppliers");
    const data = (response as any)?.data || [];
    console.log("getSuppliers: Retrieved", data.length, "suppliers");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("getSuppliers API error:", error instanceof ApiError ? { status: error.status, message: error.message } : error);
    return [];
  }
}

export async function createSupplier(supplier: { name: string; type: "Local" | "External"; contact?: string; rating?: number }): Promise<Supplier> {
  const response = await request<{ data?: Supplier }>("/suppliers", {
    method: "POST",
    body: supplier,
  });
  return (response as any)?.data as Supplier;
}

export async function updateSupplier(id: string, supplier: Partial<Supplier>): Promise<Supplier> {
  const response = await request<{ data?: Supplier }>(`/suppliers/${id}`, {
    method: "PUT",
    body: supplier,
  });
  return (response as any)?.data as Supplier;
}

export async function deleteSupplier(id: string): Promise<void> {
  await request<void>(`/suppliers/${id}`, { method: "DELETE" });
}

export async function getSupplierProducts(supplierId: string): Promise<SupplierProduct[]> {
  try {
    const response = await request<{ data?: SupplierProduct[] }>(`/suppliers/${supplierId}/products`);
    const data = (response as any)?.data || [];
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("getSupplierProducts API error:", error);
    return [];
  }
}

export async function addSupplierProduct(
  supplierId: string,
  productId: string,
  pricing: {
    unitPrice: number;
    leadTimeDays?: number;
    reliabilityScore?: number;
    stockQty?: number;
    minimumOrderQty?: number;
  }
): Promise<SupplierProduct> {
  const response = await request<{ data?: SupplierProduct }>(`/suppliers/${supplierId}/products/${productId}`, {
    method: "POST",
    body: pricing,
  });
  return (response as any)?.data as SupplierProduct;
}

export async function removeSupplierProduct(supplierId: string, productId: string): Promise<void> {
  await request<void>(`/suppliers/${supplierId}/products/${productId}`, { method: "DELETE" });
}

export async function getProductSuppliers(productId: string): Promise<SupplierProduct[]> {
  try {
    const response = await request<{ data?: SupplierProduct[] }>(`/suppliers/products/${productId}/suppliers`);
    const data = (response as any)?.data || [];
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("getProductSuppliers API error:", error);
    return [];
  }
}

// PROCUREMENT
export async function getProcurementRecommendations(): Promise<ProcurementRecommendation[]> {
  try {
    const response = await request<{ data?: ProcurementRecommendation[] }>("/procurement/recommendations");
    const data = (response as any)?.data || [];
    console.log("getProcurementRecommendations: Retrieved", data.length, "recommendations");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("getProcurementRecommendations API error:", error instanceof ApiError ? { status: error.status, message: error.message } : error);
    return [];
  }
}

export async function getProcurementOrders(productId?: string): Promise<ProcurementOrder[]> {
  try {
    const url = productId 
      ? `/procurement/orders?productId=${productId}`
      : "/procurement/orders";
    
    const response = await request<{ data?: ProcurementOrder[] }>(url);
    const data = (response as any)?.data || [];
    console.log("getProcurementOrders: Retrieved", data.length, "orders");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("getProcurementOrders API error:", error instanceof ApiError ? { status: error.status, message: error.message } : error);
    return [];
  }
}

export async function getProcurementOrderById(orderId: string): Promise<ProcurementOrder | null> {
  try {
    const response = await request<{ data?: ProcurementOrder }>(`/procurement/orders/${orderId}`);
    const data = (response as any)?.data;
    return data || null;
  } catch (error) {
    console.error("getProcurementOrderById API error:", error instanceof ApiError ? { status: error.status, message: error.message } : error);
    return null;
  }
}

export async function createProcurementOrder(order: {
  productId: string;
  supplierId: string;
  quantity: number;
  aiReasoning?: string;
}): Promise<ProcurementOrder> {
  const response = await request<{ data?: ProcurementOrder }>("/procurement/orders", {
    method: "POST",
    body: order,
  });
  return (response as any)?.data as ProcurementOrder;
}

export async function updateProcurementOrderStatus(
  id: string, 
  status: "Pending" | "Approved" | "Shipped" | "Delivered"
): Promise<ProcurementOrder> {
  const response = await request<{ data?: ProcurementOrder }>(`/procurement/orders/${id}`, {
    method: "PUT",
    body: { status },
  });
  return (response as any)?.data as ProcurementOrder;
}

