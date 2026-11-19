const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type Envelope<T> = { success: true; data: T; meta?: { page: number; limit: number; total: number; pages: number } };

async function request<T>(path: string, init: RequestInit = {}): Promise<Envelope<T>> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    throw new Error(body?.error?.message || `API request failed (${response.status})`);
  }
  return body as Envelope<T>;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  return (await request<T>(path, init)).data;
}

export type ApiUser = { id: string; name: string; email: string; role: "Administrator" | "Staff" };
export const signIn = (email: string, password: string) => api<{ user: ApiUser }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
export const currentUser = () => api<{ user: ApiUser }>("/auth/me");
export const signOut = () => api<{ message: string }>("/auth/logout", { method: "POST" });

export async function list<T>(path: string): Promise<T[]> {
  const results: T[] = [];
  let page = 1;
  let pages = 1;
  do {
    const separator = path.includes("?") ? "&" : "?";
    const response = await request<T[]>(`${path}${separator}page=${page}&limit=100`);
    results.push(...response.data);
    pages = response.meta?.pages || 1;
    page += 1;
  } while (page <= pages);
  return results;
}

export async function workspaceData(role?: "Administrator" | "Staff") {
  const [products, suppliers, orders, transactions, users, categories] = await Promise.all([
    list<any>("/products?active=true"), list<any>("/suppliers"), list<any>("/purchase-orders"),
    list<any>("/inventory/transactions"), role === "Administrator" ? list<any>("/users") : Promise.resolve([]),
    list<any>("/categories"),
  ]);
  const id = (value: any) => typeof value === "string" ? value : value?._id || value?.id || "";
  const categoryNames = new Map(categories.map((c) => [id(c._id), c.name]));
  return {
    products: products.map((p) => ({ id: id(p._id), name: p.name, sku: p.sku, description: p.description || "", category: categoryNames.get(id(p.categoryId)) || "Uncategorized", image: p.imageUrl || "", unit: p.unit, stock: p.currentStock, minimum: p.minimumStock, target: p.targetStock, cost: p.averageCost, price: p.sellingPrice, supplier: id(p.preferredSupplierId), active: p.isActive })),
    suppliers: suppliers.map((s) => ({ id: id(s._id), name: s.companyName || s.name, contact: s.contactPerson || "", email: s.email, phone: s.phone || "", leadTime: s.leadTimeDays || 0, products: [], preferred: false })),
    orders: orders.map((o) => ({ id: o.orderNumber, apiId: id(o._id), supplierId: id(o.supplierId), status: o.status, date: new Date(o.orderDate).toISOString().slice(0, 10), expected: o.expectedDeliveryDate ? new Date(o.expectedDeliveryDate).toISOString().slice(0, 10) : "", lines: (o.items || []).map((i: any) => ({ productId: id(i.productId), quantity: i.quantity, received: i.receivedQuantity || 0, cost: i.unitCost })), tax: o.tax || 0, extra: o.additionalCharges || 0, notes: o.notes || "" })),
    transactions: transactions.map((t) => ({ id: id(t._id), productId: id(t.productId), change: t.quantityChanged, before: t.previousQuantity, after: t.newQuantity, reason: t.reason, date: new Date(t.createdAt).toISOString().slice(0, 10) })),
    users: users.map((u) => ({ id: id(u._id), name: u.name, email: u.email, role: u.role })),
  };
}
