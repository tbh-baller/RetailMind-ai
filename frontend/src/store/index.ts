import { configureStore, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";
import type { Product, Order, AlertItem, Supplier } from "@/services/api";

export type Role = "Admin" | "Manager" | "Viewer";

interface AppState {
  demoMode: boolean;
  role: Role;
}
const appSlice = createSlice({
  name: "app",
  initialState: { demoMode: true, role: "Admin" as Role } as AppState,
  reducers: {
    toggleDemo: (s) => { s.demoMode = !s.demoMode; },
    setRole: (s, a: PayloadAction<Role>) => { s.role = a.payload; },
  },
});

const inventorySlice = createSlice({
  name: "inventory",
  initialState: { items: [] as Product[] },
  reducers: {
    setProducts: (s, a: PayloadAction<Product[]>) => { s.items = a.payload; },
    addProduct: (s, a: PayloadAction<Product>) => { s.items.unshift(a.payload); },
    updateProduct: (s, a: PayloadAction<Product>) => {
      const i = s.items.findIndex(p => p.id === a.payload.id);
      if (i >= 0) s.items[i] = a.payload;
    },
    deleteProduct: (s, a: PayloadAction<string>) => { s.items = s.items.filter(p => p.id !== a.payload); },
    adjustStock: (s, a: PayloadAction<{ id: string; delta: number }>) => {
      const p = s.items.find(p => p.id === a.payload.id);
      if (p) p.stock = Math.max(0, p.stock + a.payload.delta);
    },
    bulkImport: (s, a: PayloadAction<Product[]>) => { s.items = [...a.payload, ...s.items]; },
    reset: () => ({ items: [] as Product[] }),
    clearAll: (s) => { s.items = []; },
  },
});

const ordersSlice = createSlice({
  name: "orders",
  initialState: { items: [] as Order[] },
  reducers: {
    setOrders: (s, a: PayloadAction<Order[]>) => { s.items = a.payload; },
    addOrder: (s, a: PayloadAction<Order>) => { s.items.unshift(a.payload); },
    updateStatus: (s, a: PayloadAction<{ id: string; status: Order["status"] }>) => {
      const o = s.items.find(o => o.id === a.payload.id);
      if (o) o.status = a.payload.status;
    },
  },
});

const alertsSlice = createSlice({
  name: "alerts",
  initialState: { items: [] as AlertItem[] },
  reducers: {
    setAlerts: (s, a: PayloadAction<AlertItem[]>) => { s.items = a.payload; },
    markRead: (s, a: PayloadAction<string>) => {
      const x = s.items.find(x => x.id === a.payload);
      if (x) x.read = true;
    },
    markAllRead: (s) => { s.items.forEach(i => (i.read = true)); },
  },
});

const suppliersSlice = createSlice({
  name: "suppliers",
  initialState: { items: [] as Supplier[] },
  reducers: {
    setSuppliers: (s, a: PayloadAction<Supplier[]>) => { s.items = a.payload; },
    addSupplier: (s, a: PayloadAction<Supplier>) => { s.items.unshift(a.payload); },
  },
});

export const store = configureStore({
  reducer: {
    app: appSlice.reducer,
    inventory: inventorySlice.reducer,
    orders: ordersSlice.reducer,
    alerts: alertsSlice.reducer,
    suppliers: suppliersSlice.reducer,
  },
});

export const appActions = appSlice.actions;
export const inventoryActions = inventorySlice.actions;
export const ordersActions = ordersSlice.actions;
export const alertsActions = alertsSlice.actions;
export const suppliersActions = suppliersSlice.actions;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
