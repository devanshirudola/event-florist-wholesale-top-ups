import type { AppData } from "@/types";

const today = new Date();
const day = (offset: number) => new Date(today.getTime() + offset * 86400000).toISOString().slice(0, 10);

export const seedData: AppData = {
  products: [
    { id: "p1", name: "Floral binding wire rolls", sku: "WIR-042", description: "Green paper-wrapped wire for securing stems and arrangements.", category: "Mechanics", image: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=420&auto=format&fit=crop&q=80", unit: "roll", stock: 18, minimum: 12, target: 36, cost: 4.8, price: 7.5, supplier: "s1", active: true },
    { id: "p2", name: "Green wet floral foam bricks", sku: "FOA-118", description: "Water-absorbing foam bricks for fresh floral displays.", category: "Foam & bases", image: "https://images.unsplash.com/photo-1497250681960-ef046c08a56e?w=420&auto=format&fit=crop&q=80", unit: "brick", stock: 6, minimum: 10, target: 40, cost: 2.25, price: 3.5, supplier: "s2", active: true },
    { id: "p3", name: "Branch pruning shears", sku: "TOO-205", description: "Precision bypass shears for clean stem and branch cuts.", category: "Tools", image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=420&auto=format&fit=crop&q=80", unit: "each", stock: 0, minimum: 4, target: 12, cost: 13.5, supplier: "s3", active: true },
    { id: "p4", name: "Satin event ribbon spools", sku: "RIB-314", description: "Soft sage satin ribbon, 25 mm wide, for event finishing.", category: "Ribbon & wrap", image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=420&auto=format&fit=crop&q=80", unit: "spool", stock: 24, minimum: 8, target: 32, cost: 6.2, supplier: "s1", active: true },
    { id: "p5", name: "Clear plastic water pick tubes", sku: "ACC-521", description: "Clear stem water picks with secure fitted caps.", category: "Accessories", image: "https://images.unsplash.com/photo-1508610048659-a06b669e3321?w=420&auto=format&fit=crop&q=80", unit: "pack of 25", stock: 3, minimum: 8, target: 24, cost: 5.4, supplier: "s2", active: true },
  ],
  suppliers: [
    { id: "s1", name: "Stem & Co. Wholesale", contact: "Amelia Hart", email: "orders@stemandco.example", phone: "+1 (503) 555-0182", leadTime: 3, products: ["p1", "p4"], preferred: true },
    { id: "s2", name: "Verdant Supply House", contact: "Miles Chen", email: "hello@verdantsupply.example", phone: "+1 (503) 555-0114", leadTime: 5, products: ["p2", "p5"], preferred: false },
    { id: "s3", name: "Petal & Prune Tools", contact: "Sofia Bennett", email: "trade@petalandprune.example", phone: "+1 (541) 555-0191", leadTime: 7, products: ["p3"], preferred: false },
  ],
  orders: [
    { id: "PO-24018", supplierId: "s1", status: "ORDERED", date: day(-3), expected: day(2), lines: [{ productId: "p1", quantity: 24, received: 0, cost: 4.8 }, { productId: "p4", quantity: 12, received: 0, cost: 6.2 }], tax: 7.5, extra: 0, notes: "Please deliver to receiving bay." },
    { id: "PO-24017", supplierId: "s2", status: "PARTIALLY_RECEIVED", date: day(-5), expected: day(0), lines: [{ productId: "p2", quantity: 30, received: 10, cost: 2.25 }, { productId: "p5", quantity: 20, received: 0, cost: 5.4 }], tax: 7.5, extra: 12, notes: "" },
    { id: "PO-24016", supplierId: "s3", status: "PENDING", date: day(-1), expected: day(6), lines: [{ productId: "p3", quantity: 8, received: 0, cost: 13.5 }], tax: 7.5, extra: 0, notes: "" },
  ],
  transactions: [
    { id: "t1", productId: "p1", change: 12, before: 6, after: 18, reason: "Goods received · PO-24012", date: day(-1) },
    { id: "t2", productId: "p4", change: -2, before: 26, after: 24, reason: "Event studio usage", date: day(-2) },
    { id: "t3", productId: "p2", change: -5, before: 11, after: 6, reason: "Workshop usage", date: day(-3) },
    { id: "t4", productId: "p5", change: 8, before: 0, after: 8, reason: "Opening stock", date: day(-5) },
  ],
  users: [
    { id: "u1", name: "Olivia Bennett", email: "olivia@eventflorist.example", role: "Administrator" },
    { id: "u2", name: "Noah Williams", email: "noah@eventflorist.example", role: "Staff" },
    { id: "u3", name: "Mia Thompson", email: "mia@eventflorist.example", role: "Staff" },
  ],
};

export function stockState(stock: number, minimum: number) {
  if (stock === 0) return "Out of stock";
  if (stock <= minimum) return "Low stock";
  return "In stock";
}

export function orderTotal(lines: { quantity: number; cost: number }[], tax: number, extra: number) {
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.cost, 0);
  return subtotal + subtotal * tax / 100 + extra;
}
