import type { AppData, Product, PurchaseOrder, Supplier, Transaction } from "@/types";

const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "/api/v1").replace(/\/$/, "");
const REQUEST_TIMEOUT_MS = 20_000;
type Row = Record<string, any>;
type ApiEnvelope<T> = { data?: T; error?: { message?: string }; meta?: { pages: number } };
const id = (value: any) => String(value?._id || value?.id || value || "");
const date = (value: any) => value ? new Date(value).toISOString().slice(0, 10) : "";

async function request<T = any>(path: string, options: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onAbort, { once: true });
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    if (controller.signal.aborted) {
      throw new Error(options.signal?.aborted ? "Request was cancelled." : "The server took too long to respond. Please try again.");
    }
    throw new Error("Unable to reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", onAbort);
  }
  const body = await response.json().catch(() => ({})) as ApiEnvelope<T>;
  if (!response.ok) throw new Error(body?.error?.message || `Request failed (${response.status})`);
  return body;
}

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const body = await request<T>(path, options);
  return body.data as T;
}

async function all<T>(path: string): Promise<T[]> {
  const result: T[] = [];
  for (let page = 1; ; page += 1) {
    const body = await request<T[]>(`${path}${path.includes("?") ? "&" : "?"}page=${page}&limit=100`);
    result.push(...(body.data || []));
    if (!body.meta || page >= body.meta.pages) return result;
  }
}

export async function loadWorkspace(): Promise<{ data: AppData; user: { id: string; name: string; email: string; role: "Administrator" | "Staff" } }> {
  const [me, products, suppliers, categories, orders, transactions, users] = await Promise.all([
    api<{ user: any }>("/auth/me"), all<Row>("/products?active=true"), all<Row>("/suppliers"), all<Row>("/categories"),
    all<Row>("/purchase-orders"), all<Row>("/inventory/transactions"), api<Row[]>("/users?page=1&limit=100").catch(() => []),
  ]);
  const categoryNames = new Map(categories.map((c) => [id(c), c.name]));
  const supplierRows: Supplier[] = suppliers.map((s) => ({
    id: id(s), name: s.companyName || s.name, contact: s.contactPerson || "", email: s.email || "", phone: s.phone || "",
    leadTime: s.products?.length ? Math.min(...s.products.map((link: Row) => link.leadTimeDays || 0)) : 0,
    products: (s.products || []).map((link: Row) => id(link.productId)), preferred: false,
  }));
  const productRows: Product[] = products.map((p) => ({
    id: id(p), name: p.name, sku: p.sku, description: p.description || "", category: categoryNames.get(id(p.categoryId)) || "Uncategorized",
    image: p.imageUrl || "", unit: p.unit, stock: p.currentStock, minimum: p.minimumStock, target: p.targetStock, cost: p.averageCost,
    price: p.sellingPrice, supplier: id(p.preferredSupplierId), active: p.isActive,
  }));
  const orderRows: PurchaseOrder[] = orders.map((o) => ({
    id: o.orderNumber, apiId: id(o), supplierId: id(o.supplierId), status: o.status, date: date(o.orderDate), expected: date(o.expectedDeliveryDate),
    lines: (o.items || []).map((line: Row) => ({ productId: id(line.productId), quantity: line.quantity, received: line.receivedQuantity || 0, cost: line.unitCost })),
    tax: o.tax || 0, extra: o.additionalCharges || 0, notes: o.notes || "",
  }));
  const transactionRows: Transaction[] = transactions.map((t) => ({
    id: id(t), productId: id(t.productId), change: t.quantityChanged, before: t.previousQuantity, after: t.newQuantity,
    reason: t.reason, date: date(t.createdAt),
  }));
  return { data: { products: productRows, suppliers: supplierRows, orders: orderRows, transactions: transactionRows, users: users.map((u) => ({ id: id(u), name: u.name, email: u.email, role: u.role })) }, user: me.user };
}

export function productPayload(values: Record<string, any>, supplierId?: string, preserveSuppliers = false) {
  return {
    name: values.name, sku: values.sku, description: values.description || "", categoryId: values.categoryId,
    imageUrl: values.image || "", unit: values.unit || "each", minimumStock: Number(values.minimum || 0),
    targetStock: Number(values.target || 0), averageCost: Number(values.cost || 0), sellingPrice: values.price === undefined ? undefined : Number(values.price),
    ...(!preserveSuppliers ? (supplierId ? { preferredSupplierId: supplierId, suppliers: [{ supplierId, unitCost: Number(values.cost || 0), leadTimeDays: 0, isPreferred: true }] } : { suppliers: [] }) : {}),
  };
}

export function orderPayload(values: Record<string, any>) {
  return { supplierId: values.supplier, items: [values.productId, values.productId2].filter(Boolean).map((productId, i) => ({ productId, quantity: Number(i ? values.quantity2 : values.quantity) })), tax: Number(values.tax || 0), additionalCharges: Number(values.extra || 0), expectedDeliveryDate: values.expected || undefined, notes: values.notes || "" };
}

export async function resolveCategoryId(name: string) {
  const categories = await all<Row>("/categories");
  const found = categories.find((category) => category.name.toLowerCase() === name.trim().toLowerCase());
  if (found) return id(found);
  return id(await api<Row>("/categories", { method: "POST", body: JSON.stringify({ name: name.trim() || "General", description: "" }) }));
}

export const backendId = id;
