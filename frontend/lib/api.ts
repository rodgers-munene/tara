import useSWR, { SWRConfiguration, mutate as globalMutate } from "swr";

// All browser API calls go through the /api proxy route to avoid CORS errors
// when Render's free-tier proxy returns 502s before FastAPI starts.
const BASE = typeof window !== "undefined"
  ? "/api"
  : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("tara_token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body?.detail ?? `Request failed: ${res.status}`;
    if (res.status === 402 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tara:subscription-blocked", { detail: { message } }));
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

async function upload<T>(path: string, formData: FormData): Promise<T> {
  const headers: Record<string, string> = {};
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("tara_token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  // No Content-Type here — the browser sets the multipart boundary itself.
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers, body: formData });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (path: string) => request<void>(path, { method: "DELETE" }),
  upload,
};

// Cached GET for staff-facing pages. Serves stale-while-revalidate data from
// the shared SWR cache so navigating back to a page shows instant data
// instead of a fresh loading spinner, while quietly refetching in the background.
export function useApi<T>(path: string | null, config?: SWRConfiguration) {
  return useSWR<T>(path, (p: string) => request<T>(p), config);
}

// Revalidates every cached GET whose key starts with `prefix`, e.g. after a
// mutation that affects data fetched by multiple pages (products, categories).
export function invalidateApi(prefix: string) {
  return globalMutate((key) => typeof key === "string" && key.startsWith(prefix));
}

// --- Core Types ---

export interface StaffMember {
  id: number;
  name: string;
  role: string;
}

export interface ShopInfo {
  id: number;
  name: string;
  slug: string;
  staff: StaffMember[];
}

export interface ShopBrief {
  id: number;
  name: string;
  phone: string | null;
}

export interface Category {
  id: number;
  name: string;
  color: string | null;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  buying_price: number;
  stock: number;
  min_stock: number;
  pricing_mode: "unit" | "weight";
  unit_label: string | null;
  track_stock: boolean;
  barcode: string | null;
  category_id: number | null;
  active: boolean;
}

export interface BulkImportResult {
  needs_mapping: boolean;
  headers: string[] | null;
  suggested_map: Record<string, string | null> | null;
  created: number;
  skipped: number;
  errors: string[];
}

export interface SaleItemRead {
  id: number;
  product_id: number | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Sale {
  id: number;
  receipt_number: string;
  total: number;
  discount: number;
  payment_method: "cash" | "mpesa" | "split";
  amount_paid: number;
  change_given: number;
  mpesa_ref: string | null;
  mpesa_phone: string | null;
  cash_amount: number | null;
  mpesa_amount: number | null;
  cashier_name: string | null;
  is_returned: boolean;
  created_at: string;
  items: SaleItemRead[];
}

export interface SaleReturn {
  id: number;
  return_number: string;
  sale_id: number;
  total_refunded: number;
  reason: string | null;
  processed_by: string | null;
  created_at: string;
}

export interface SaleReturnCreate {
  sale_id: number;
  reason?: string;
}

export interface SaleCreate {
  items: { product_id: number; quantity: number }[];
  payment_method: "cash" | "mpesa" | "split";
  amount_paid: number;
  discount?: number;
  mpesa_ref?: string;
  mpesa_phone?: string;
  cash_amount?: number;
  mpesa_amount?: number;
}

// --- Dashboard Types ---

export interface WeekChartItem {
  date: string;
  day: string;
  total: number;
  count: number;
}

export interface TopProduct {
  name: string;
  qty: number;
  revenue: number;
}

export interface LowStockItem {
  id: number;
  name: string;
  stock: number;
}

export interface RecentTransaction {
  id: number;
  receipt_number: string;
  total: number;
  payment_method: "cash" | "mpesa" | "split";
  cashier_name: string | null;
  item_count: number;
  is_returned: boolean;
  created_at: string;
}

export interface DashboardStats {
  today_total: number;
  today_count: number;
  today_cash: number;
  today_mpesa: number;
  today_profit: number;
  week_total: number;
  week_count: number;
  week_profit: number;
  week_chart: WeekChartItem[];
  top_products: TopProduct[];
  low_stock_count: number;
  low_stock_items: LowStockItem[];
  total_products: number;
  recent_transactions: RecentTransaction[];
}

// --- Customer / Mkopo Types ---

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  notes: string | null;
  balance: number;
  created_at: string;
}

export interface CreditEntry {
  id: number;
  customer_id: number;
  amount: number;
  note: string | null;
  sale_id: number | null;
  created_at: string;
}

// --- Day Close Types ---

export interface DayCloseSummary {
  date: string;
  total_cash_sales: number;
  total_mpesa_sales: number;
  total_sales: number;
  sale_count: number;
  already_closed: boolean;
  close_record: {
    opening_cash: number;
    closing_cash: number;
    notes: string | null;
    closed_by: string | null;
  } | null;
}

export interface DayClose {
  id: number;
  date: string;
  opening_cash: number;
  closing_cash: number;
  total_cash_sales: number;
  total_mpesa_sales: number;
  total_sales: number;
  sale_count: number;
  notes: string | null;
  closed_by: string | null;
  created_at: string;
}

// --- Helpers ---

export function fmtKES(n: number) {
  return `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
