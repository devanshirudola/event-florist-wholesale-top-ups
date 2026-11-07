export type Role = "Administrator" | "Staff";
export type Product = {
  id: string; name: string; sku: string; description: string; category: string; image: string;
  unit: string; stock: number; minimum: number; target: number; cost: number; price?: number;
  supplier: string; active: boolean;
};
export type Supplier = {
  id: string; name: string; contact: string; email: string; phone: string; leadTime: number;
  products: string[]; preferred: boolean;
};
export type OrderStatus = "DRAFT" | "PENDING" | "APPROVED" | "ORDERED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";
export type OrderLine = { productId: string; quantity: number; received: number; cost: number };
export type PurchaseOrder = {
  id: string; supplierId: string; status: OrderStatus; date: string; expected: string;
  lines: OrderLine[]; tax: number; extra: number; notes: string;
};
export type Transaction = { id: string; productId: string; change: number; before: number; after: number; reason: string; date: string };
export type AppData = { products: Product[]; suppliers: Supplier[]; orders: PurchaseOrder[]; transactions: Transaction[]; users: { id: string; name: string; email: string; role: Role }[] };
