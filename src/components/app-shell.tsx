"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Activity, Archive, ArrowDownToLine, ArrowDownUp, ArrowLeft, ArrowRight, Bell, Boxes,
  Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, ClipboardCheck, ClipboardList,
  Clock3, Flower2, LayoutDashboard, Leaf, LogOut, Menu, Package, PackageCheck, Plus,
  Search, Settings, ShieldCheck, ShoppingBag, SlidersHorizontal, Sprout, Truck, Users,
  X, CircleAlert, TrendingUp, MoreHorizontal, Mail, Phone, CalendarDays, Download,
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { AppData, OrderStatus, Product, Role, Supplier, Transaction } from "@/types";
import { orderTotal, seedData, stockState } from "@/services/mock-data";
import { loadData, saveData } from "@/services/local-store";

const navigation = [
  { label: "Dashboard", href: "/dashboard", section: "dashboard", icon: LayoutDashboard },
  { label: "Products", href: "/products", section: "products", icon: Package },
  { label: "Inventory", href: "/inventory", section: "inventory", icon: Boxes },
  { label: "Low-stock alerts", href: "/low-stock", section: "low-stock", icon: CircleAlert },
  { label: "Suppliers", href: "/suppliers", section: "suppliers", icon: Truck },
  { label: "Purchase orders", href: "/purchase-orders", section: "purchase-orders", icon: ClipboardList },
  { label: "Goods receiving", href: "/receiving", section: "receiving", icon: PackageCheck },
  { label: "Reports", href: "/reports", section: "reports", icon: Activity },
];
const pageTitles: Record<string, string> = {
  dashboard: "Good morning, Olivia", products: "Product catalog", inventory: "Inventory",
  "low-stock": "Stock alerts", suppliers: "Suppliers", "purchase-orders": "Purchase orders",
  receiving: "Goods receiving", reports: "Reports & insights", settings: "Workspace settings", "product-detail": "Product details", "order-detail": "Purchase order details",
};
const currency = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(amount);
const shortDate = (date: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${date}T12:00:00`));
const productSupplier = (data: AppData, productId: string) => data.products.find((product) => product.id === productId)?.supplier || "";
const initialSchema = z.object({
  name: z.string().optional(), sku: z.string().optional(), category: z.string().optional(),
  unit: z.string().optional(), image: z.string().optional(), price: z.coerce.number().optional(), quantity: z.coerce.number().optional(), quantity2: z.coerce.number().optional(), minimum: z.coerce.number().optional(),
  target: z.coerce.number().optional(), cost: z.coerce.number().optional(), supplier: z.string().optional(),
  contact: z.string().optional(), email: z.string().optional(), phone: z.string().optional(),
  leadTime: z.coerce.number().optional(), productId: z.string().optional(), productId2: z.string().optional(), reason: z.string().optional(),
  expected: z.string().optional(), notes: z.string().optional(), role: z.string().optional(), tax: z.coerce.number().optional(), extra: z.coerce.number().optional(),
});
type FormValues = z.infer<typeof initialSchema>;
type DialogMode = "product" | "supplier" | "order" | "stock" | "receive" | "user";
type DialogConfig = { mode: DialogMode; productId?: string; supplierId?: string; orderId?: string } | null;

function Logo({ small = false }: { small?: boolean }) {
  return <div className="flex items-center gap-3">
    <div className={`grid ${small ? "h-9 w-9" : "h-10 w-10"} place-items-center rounded-xl bg-plum-900 text-white shadow-sm`}>
      <Flower2 size={21} strokeWidth={1.7} />
    </div>
    {!small && <div className="leading-tight"><div className="font-display text-[16px] font-semibold tracking-tight text-plum-900">Event Florist</div><div className="mt-1 text-[9px] font-semibold uppercase tracking-[.19em] text-stone-400">Wholesale top-ups</div></div>}
  </div>;
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  const styles: Record<string, string> = {
    neutral: "bg-stone-100 text-stone-600", green: "bg-sage-50 text-sage-700",
    plum: "bg-plum-50 text-plum-700", rose: "bg-blush-50 text-[#a96360]",
    amber: "bg-amber-50 text-amber-700", blue: "bg-sky-50 text-sky-700",
  };
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${styles[tone] || styles.neutral}`}><span className={`h-1.5 w-1.5 rounded-full ${tone === "green" ? "bg-sage-600" : tone === "rose" ? "bg-blush-600" : tone === "amber" ? "bg-amber-500" : tone === "plum" ? "bg-plum-500" : "bg-stone-400"}`} />{children}</span>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-[#efedeb] bg-white shadow-card ${className}`}>{children}</section>;
}

function SectionTitle({ title, detail, action }: { title: string; detail?: string; action?: React.ReactNode }) {
  return <div className="mb-4 flex items-end justify-between gap-3"><div><h2 className="text-[14px] font-semibold text-stone-800">{title}</h2>{detail && <p className="mt-1 text-[11px] text-stone-400">{detail}</p>}</div>{action}</div>;
}

function Modal({ config, data, onClose, onSubmit }: {
  config: Exclude<DialogConfig, null>; data: AppData; onClose: () => void; onSubmit: (mode: DialogMode, values: FormValues, config: Exclude<DialogConfig, null>) => void;
}) {
  const mode = config.mode;
  const editingProduct = mode === "product" ? data.products.find((item) => item.id === config.productId) : undefined;
  const editingSupplier = mode === "supplier" ? data.suppliers.find((item) => item.id === config.supplierId) : undefined;
  const editingOrder = mode === "order" ? data.orders.find((item) => item.id === config.orderId && item.status === "DRAFT") : undefined;
  const title = mode === "product" && editingProduct ? "Edit product" : mode === "supplier" && editingSupplier ? "Edit supplier" : mode === "order" && editingOrder ? `Edit ${editingOrder.id}` : { product: "Add a product", supplier: "Add a supplier", order: "New purchase order", stock: "Adjust stock", receive: "Receive goods", user: "Invite a teammate" }[mode];
  const initialValues: FormValues = {
    unit: editingProduct?.unit || "each", category: editingProduct?.category || "Mechanics",
    role: "Staff", reason: "Manual adjustment", tax: 7.5, extra: 0,
    ...(editingProduct ? { name: editingProduct.name, sku: editingProduct.sku, quantity: editingProduct.stock, minimum: editingProduct.minimum, target: editingProduct.target, cost: editingProduct.cost, price: editingProduct.price, image: editingProduct.image, supplier: editingProduct.supplier } : {}),
    ...(editingSupplier ? { name: editingSupplier.name, contact: editingSupplier.contact, email: editingSupplier.email, phone: editingSupplier.phone, leadTime: editingSupplier.leadTime } : {}),
    ...(editingOrder ? {
      supplier: editingOrder.supplierId, productId: editingOrder.lines[0]?.productId,
      quantity: editingOrder.lines[0]?.quantity, productId2: editingOrder.lines[1]?.productId,
      quantity2: editingOrder.lines[1]?.quantity, tax: editingOrder.tax, extra: editingOrder.extra,
      expected: editingOrder.expected, notes: editingOrder.notes,
    } : {}),
    ...(config.productId && mode === "order" ? { productId: config.productId, supplier: productSupplier(data, config.productId) } : {}),
    ...(config.supplierId && mode === "order" ? { supplier: config.supplierId } : {}),
    ...(config.productId && mode === "stock" ? { productId: config.productId } : {}),
  };
  const form = useForm<FormValues>({ resolver: zodResolver(initialSchema), defaultValues: initialValues });
  const { register, handleSubmit, formState: { errors } } = form;
  const fields: Record<DialogMode, { key: keyof FormValues; label: string; type?: string; required?: boolean; placeholder?: string }[]> = {
    product: [
      { key: "name", label: "Product name", required: true, placeholder: "e.g. Floral stem wire" },
      { key: "sku", label: "SKU", required: true, placeholder: "e.g. WIR-640" },
      { key: "category", label: "Category", required: true, placeholder: "Mechanics" },
      { key: "unit", label: "Unit", required: true, placeholder: "roll" },
      { key: "supplier", label: "Preferred supplier" },
      { key: "quantity", label: "Current stock", type: "number" },
      { key: "minimum", label: "Minimum stock", type: "number" },
      { key: "target", label: "Target stock", type: "number" },
      { key: "cost", label: "Average cost ($)", type: "number" },
      { key: "price", label: "Selling price ($)", type: "number" },
      { key: "image", label: "Image URL", placeholder: "https://…" },
    ],
    supplier: [
      { key: "name", label: "Company name", required: true }, { key: "contact", label: "Contact person", required: true },
      { key: "email", label: "Email", type: "email", required: true }, { key: "phone", label: "Phone" },
      { key: "leadTime", label: "Lead time (days)", type: "number" },
    ],
    order: [
      { key: "supplier", label: "Supplier", required: true }, { key: "productId", label: "First product", required: true },
      { key: "quantity", label: "Quantity to order", type: "number", required: true },
      { key: "productId2", label: "Add another product" }, { key: "quantity2", label: "Additional quantity", type: "number" },
      { key: "tax", label: "Tax (%)", type: "number" }, { key: "extra", label: "Additional charges ($)", type: "number" },
      { key: "expected", label: "Expected delivery", type: "date" },
      { key: "notes", label: "Order notes", type: "textarea", placeholder: "Delivery instructions or supplier notes" },
    ],
    stock: [
      ...(!config.productId ? [{ key: "productId" as const, label: "Product", required: true }] : []),
      { key: "quantity", label: "Quantity change (+ or −)", type: "number", required: true },
      { key: "reason", label: "Reason", required: true, placeholder: "e.g. Event studio usage" },
    ],
    receive: [{ key: "productId", label: "Product", required: true }, { key: "quantity", label: "New quantity received", type: "number", required: true }],
    user: [
      { key: "name", label: "Full name", required: true }, { key: "email", label: "Email", type: "email", required: true },
      { key: "role", label: "Role", required: true },
    ],
  };
  const products = data.products.filter((item) => item.active);
  const order = data.orders.find((item) => item.id === config.orderId);
  const watched = form.watch();
  const options = (field: keyof FormValues) => field === "supplier"
    ? data.suppliers.map((item) => ({ value: item.id, label: item.name }))
    : String(field).startsWith("productId")
      ? products.filter((p) => mode === "receive" ? order?.lines.some((line) => line.productId === p.id && line.quantity > line.received) : mode !== "order" || !watched.supplier || p.supplier === watched.supplier).map((p) => ({ value: p.id, label: p.name }))
      : [];
  const orderEstimate = mode === "order" ? (() => {
    const first = products.find((item) => item.id === watched.productId);
    const second = products.find((item) => item.id === watched.productId2);
    const subtotal = Number(watched.quantity || 0) * (first?.cost || 0) + Number(watched.quantity2 || 0) * (second?.cost || 0);
    return subtotal + subtotal * Number(watched.tax ?? 7.5) / 100 + Number(watched.extra || 0);
  })() : 0;
  const submit = (values: FormValues) => {
    const parsed = initialSchema.safeParse(values);
    if (!parsed.success) return;
    if (mode === "product" && (!values.name || !values.sku || Number(values.cost) < 0)) { form.setError("name", { message: "Add product details and a valid cost." }); return; }
    if (mode === "supplier" && (!values.name || !values.contact || !values.email?.includes("@"))) { form.setError("email", { message: "Enter the supplier contact details and a valid email." }); return; }
    if ((mode === "order" || mode === "receive") && (!values.productId || Number(values.quantity) <= 0)) { form.setError("quantity", { message: "Enter a quantity greater than zero." }); return; }
    if (mode === "stock" && (!Number(values.quantity) || !values.reason?.trim())) { form.setError("quantity", { message: "Enter a non-zero adjustment and a reason." }); return; }
    onSubmit(mode, parsed.data, config);
  };
  return   <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#211b22]/35 p-4 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
  <div role="dialog" aria-modal="true" aria-labelledby="action-dialog-title" className="max-h-[90vh] w-full max-w-[500px] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
    <div className="mb-5 flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-plum-500">Workspace action</p><h2 id="action-dialog-title" className="mt-1 text-xl font-semibold text-plum-900">{title}</h2></div><button onClick={onClose} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100" aria-label="Close dialog"><X size={18}/></button></div>
      {mode === "stock" && <div className="mb-4 rounded-lg bg-amber-50 p-3 text-[11px] text-amber-800">Stock cannot fall below zero. Every adjustment is recorded in inventory history.</div>}
      {mode === "receive" && <div className="mb-4 rounded-lg bg-sage-50 p-3 text-[11px] text-sage-700">Only outstanding quantities can be received. Inventory updates when you confirm.</div>}
      {mode === "order" && <div className="mb-4 rounded-lg bg-plum-50 p-3 text-[11px] text-plum-700">Creating a purchase order does not change inventory.</div>}
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {fields[mode].map((field) => <label key={field.key} className={`block ${field.key === "reason" ? "sm:col-span-2" : ""}`}>
            <span className="mb-1.5 block text-[11px] font-medium text-stone-600">{field.label}{field.required && <span className="text-blush-600"> *</span>}</span>
            {field.key === "supplier" || String(field.key).startsWith("productId") || field.key === "role"
              ? <select {...register(field.key)} className="field"><option value="">Choose…</option>{(field.key === "role" ? [{ value: "Staff", label: "Staff" }, { value: "Administrator", label: "Administrator" }] : options(field.key)).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
              : field.type === "textarea" ? <textarea {...register(field.key)} rows={2} placeholder={field.placeholder} className="field h-auto py-2" />
              : <input {...register(field.key)} type={field.type || "text"} placeholder={field.placeholder} min={field.type === "number" ? field.key === "quantity" && mode === "stock" ? undefined : "0" : undefined} step={field.type === "number" ? "any" : undefined} className="field" />}
            {errors[field.key] && <span className="mt-1 block text-[10px] text-red-600">{String(errors[field.key]?.message || "Please check this field.")}</span>}
          </label>)}
        </div>
        {mode === "order" && <div className="rounded-lg bg-stone-50 px-3 py-2 text-[10px] text-stone-600">Estimated order total <span className="float-right font-semibold text-stone-800">{currency(orderEstimate)}</span></div>}
        <div className="flex justify-end gap-2 border-t border-stone-100 pt-4"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{mode === "receive" ? "Confirm receipt" : mode === "order" ? "Create draft order" : mode === "stock" ? "Save adjustment" : mode === "user" ? "Add teammate" : `Save ${mode}`}</button></div>
      </form>
    </div>
  </div>;
}

export default function AppShell({ section, productId, orderId }: { section: string; productId?: string; orderId?: string }) {
  const router = useRouter();
  const [data, setData] = useState<AppData>(seedData);
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<Role>("Administrator");
  const [account, setAccount] = useState({ name: "Olivia Bennett", email: "olivia@eventflorist.example" });
  const [dialog, setDialog] = useState<DialogConfig>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [sortBy, setSortBy] = useState("name");
  const [view, setView] = useState<"table" | "cards">("table");
  const [page, setPage] = useState(0);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [toastError, setToastError] = useState(false);
  const [activeTab, setActiveTab] = useState("Overview");
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");
  const isAdmin = role === "Administrator";

  useEffect(() => { setData(loadData()); setReady(true); }, []);
  useEffect(() => { if (ready) saveData(data); }, [data, ready]);
  useEffect(() => {
    try {
      const savedRole = window.localStorage.getItem("event-florist-prototype-role");
      if (savedRole === "Administrator" || savedRole === "Staff") setRole(savedRole);
      const savedAccount = window.localStorage.getItem("event-florist-current-user");
      if (savedAccount) {
        const parsed = JSON.parse(savedAccount) as { name?: string; email?: string };
        if (parsed.name && parsed.email) setAccount({ name: parsed.name, email: parsed.email });
      }
    } catch {
      // The stored account was unreadable; drop it without letting a blocked
      // storage API interrupt the sign-in flow.
      try { window.localStorage.removeItem("event-florist-current-user"); } catch { /* storage unavailable */ }
    }
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem("event-florist-prototype-role", role);
    } catch {
      // Ignore storage failures; the simulated role still applies for this session.
    }
  }, [role]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 3400); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => { setPage(0); setFilter("All"); setQuery(""); }, [section]);
  useEffect(() => { setPage(0); }, [query, filter]);

  const notify = (message: string, error = false) => { setToast(message); setToastError(error); };
  const signOut = () => {
    try {
      window.localStorage.removeItem("event-florist-current-user");
      window.localStorage.removeItem("event-florist-prototype-role");
    } catch {
      // Storage may be blocked; signing out still clears the current session state.
    }
    router.replace("/");
  };
  const activeProducts = data.products.filter((p) => p.active);
  const lowProducts = activeProducts.filter((p) => p.stock > 0 && p.stock <= p.minimum);
  const outProducts = activeProducts.filter((p) => p.stock === 0);
  const openOrders = data.orders.filter((order) => !["RECEIVED", "CANCELLED"].includes(order.status));
  const inventoryValue = activeProducts.reduce((sum, p) => sum + p.stock * p.cost, 0);
  const productById = (id: string) => data.products.find((item) => item.id === id);
  const supplierById = (id: string) => data.suppliers.find((item) => item.id === id);

  const applyAction = (mode: DialogMode, values: FormValues, config: Exclude<DialogConfig, null>) => {
    if (mode === "product") {
      if (data.products.some((p) => p.id !== config.productId && p.sku.toLowerCase() === values.sku?.toLowerCase())) { notify("That SKU is already in your catalog.", true); return; }
      if ([values.quantity, values.minimum, values.target, values.cost].some((value) => Number(value) < 0)) { notify("Stock levels and costs cannot be negative.", true); return; }
      const currentProduct = data.products.find((p) => p.id === config.productId);
      const product: Product = {
        id: currentProduct?.id || `p${Date.now()}`, name: values.name!.trim(), sku: values.sku!.trim().toUpperCase(),
        description: currentProduct?.description || `${values.name} for event floral arrangements.`, category: values.category || "Other",
        image: values.image?.trim() || currentProduct?.image || "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=420&auto=format&fit=crop&q=80",
        unit: values.unit || "each", stock: Number(values.quantity || 0), minimum: Number(values.minimum || 0),
        target: Number(values.target || 0), cost: Number(values.cost || 0), price: values.price, supplier: values.supplier || data.suppliers[0]?.id || "", active: true,
      };
      setData((current) => ({ ...current, products: currentProduct ? current.products.map((item) => item.id === product.id ? product : item) : [product, ...current.products] }));
      if ((!currentProduct && product.stock > 0) || (currentProduct && product.stock !== currentProduct.stock)) {
        const before = currentProduct?.stock || 0;
        const transaction: Transaction = { id: `t${Date.now()}`, productId: product.id, change: product.stock - before, before, after: product.stock, reason: currentProduct ? "Product details adjustment" : "Opening stock", date: new Date().toISOString().slice(0, 10) };
        setData((current) => ({ ...current, transactions: [transaction, ...current.transactions] }));
      }
      notify(currentProduct ? "Product details updated." : "Product added to your catalog.");
    }
    if (mode === "supplier") {
      const supplier: Supplier = { id: `s${Date.now()}`, name: values.name!.trim(), contact: values.contact!.trim(), email: values.email!.trim(), phone: values.phone || "—", leadTime: Number(values.leadTime || 5), products: [], preferred: false };
      const currentSupplier = data.suppliers.find((item) => item.id === config.supplierId);
      if (currentSupplier) {
        setData((current) => ({ ...current, suppliers: current.suppliers.map((item) => item.id === currentSupplier.id ? { ...supplier, id: currentSupplier.id, products: currentSupplier.products, preferred: currentSupplier.preferred } : item) }));
        notify("Supplier details updated.");
      } else {
        setData((current) => ({ ...current, suppliers: [supplier, ...current.suppliers] }));
        notify("Supplier saved to your workspace.");
      }
    }
    if (mode === "user") {
      if (!values.name?.trim() || !values.email?.includes("@")) { notify("Enter a name and a valid email address.", true); return; }
      setData((current) => ({ ...current, users: [{ id: `u${Date.now()}`, name: values.name!.trim(), email: values.email!.trim(), role: (values.role || "Staff") as Role }, ...current.users] }));
      notify("Teammate added to the prototype workspace.");
    }
    if (mode === "stock") {
      const product = productById(config.productId || values.productId || "");
      if (!product) { notify("Choose a valid product to adjust.", true); return; }
      const change = Number(values.quantity);
      if (!Number.isFinite(change) || !change || product.stock + change < 0) { notify("Adjustment must be non-zero and cannot make stock negative.", true); return; }
      const transaction: Transaction = { id: `t${Date.now()}`, productId: product.id, change, before: product.stock, after: product.stock + change, reason: values.reason!.trim(), date: new Date().toISOString().slice(0, 10) };
      setData((current) => ({ ...current, products: current.products.map((item) => item.id === product.id ? { ...item, stock: transaction.after } : item), transactions: [transaction, ...current.transactions] }));
      notify("Inventory adjustment recorded.");
    }
    if (mode === "order") {
      const supplier = supplierById(values.supplier || "");
      const product = productById(values.productId || "");
      if (!supplier || !product) { notify("Select a valid supplier and product.", true); return; }
      const secondProduct = values.productId2 ? productById(values.productId2) : undefined;
      if (values.productId2 && (!secondProduct || Number(values.quantity2) <= 0)) { notify("Add a valid quantity for the additional product.", true); return; }
      const currentDraft = data.orders.find((item) => item.id === config.orderId && item.status === "DRAFT");
      const orderNumber = currentDraft?.id || `PO-${String(Date.now()).slice(-5)}`;
      const lines = [{ productId: product.id, quantity: Number(values.quantity), received: 0, cost: product.cost }];
      if (secondProduct) lines.push({ productId: secondProduct.id, quantity: Number(values.quantity2), received: 0, cost: secondProduct.cost });
      const updatedOrder = { id: orderNumber, supplierId: supplier.id, status: "DRAFT" as OrderStatus, date: currentDraft?.date || new Date().toISOString().slice(0, 10), expected: values.expected || "", lines, tax: Number(values.tax ?? 7.5), extra: Number(values.extra || 0), notes: values.notes || "" };
      setData((current) => ({ ...current, orders: currentDraft ? current.orders.map((item) => item.id === orderNumber ? updatedOrder : item) : [updatedOrder, ...current.orders] }));
      notify(currentDraft ? `${orderNumber} updated. Inventory is unchanged.` : `${orderNumber} created as a draft. Inventory is unchanged.`);
    }
    if (mode === "receive") {
      const order = data.orders.find((item) => item.id === config.orderId);
      const product = productById(values.productId || "");
      const line = order?.lines.find((item) => item.productId === values.productId);
      const quantity = Number(values.quantity);
      if (!order || order.status === "CANCELLED" || order.status === "RECEIVED" || !product || !line || quantity <= 0 || quantity > line.quantity - line.received) { notify("Receipt is invalid or exceeds the outstanding quantity.", true); return; }
      const transaction: Transaction = { id: `t${Date.now()}`, productId: product.id, change: quantity, before: product.stock, after: product.stock + quantity, reason: `Goods received · ${order.id}`, date: new Date().toISOString().slice(0, 10) };
      setData((current) => {
        const orders = current.orders.map((item) => {
          if (item.id !== order.id) return item;
          const lines = item.lines.map((l) => l.productId === product.id ? { ...l, received: l.received + quantity } : l);
          const complete = lines.every((l) => l.received >= l.quantity);
          return { ...item, lines, status: (complete ? "RECEIVED" : "PARTIALLY_RECEIVED") as OrderStatus };
        });
        return { ...current, products: current.products.map((item) => item.id === product.id ? { ...item, stock: item.stock + quantity } : item), transactions: [transaction, ...current.transactions], orders };
      });
      notify(`${quantity} ${product.unit} received and inventory updated.`);
    }
    setDialog(null);
  };

  const changeOrder = (orderId: string, status: OrderStatus) => {
    if (!isAdmin && ["APPROVED", "ORDERED", "CANCELLED"].includes(status)) { notify("Administrator access is required for this action.", true); return; }
    const order = data.orders.find((item) => item.id === orderId);
    if (!order) return;
    if (status === "CANCELLED" && !window.confirm(`Cancel ${orderId}? This cannot be undone.`)) return;
    const allowed: Record<OrderStatus, OrderStatus[]> = {
      DRAFT: ["PENDING", "CANCELLED"], PENDING: ["APPROVED", "CANCELLED"],
      APPROVED: ["ORDERED", "CANCELLED"], ORDERED: ["PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"],
      PARTIALLY_RECEIVED: ["RECEIVED"], RECEIVED: [], CANCELLED: [],
    };
    if (!allowed[order.status].includes(status)) { notify(`Cannot change ${order.status} to ${status}.`, true); return; }
    setData((current) => ({ ...current, orders: current.orders.map((item) => item.id === orderId ? { ...item, status } : item) }));
    notify(`${orderId} marked ${status.toLowerCase().replaceAll("_", " ")}.`);
  };

  const exportCsv = (rows: string[][], name: string) => {
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const link = document.createElement("a");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.href = url;
    link.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    // Revoke on the next tick so Safari/Firefox finish the download first.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify(`${name} report exported as CSV.`);
  };

  const currentTitle = section === "dashboard" ? `Good morning, ${account.name.split(" ")[0]}` : pageTitles[section] || "Workspace";
  const todayLabel = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date()).toUpperCase();
  const initials = account.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const detailProduct = section === "product-detail" ? data.products.find((product) => product.id === productId) : undefined;
  const detailOrder = section === "order-detail" ? data.orders.find((order) => order.id === orderId) : undefined;
  const matchedProducts = useMemo(() => activeProducts
    .filter((p) => `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(query.toLowerCase()))
    .filter((p) => filter === "All" || stockState(p.stock, p.minimum) === filter)
    .sort((a, b) => sortBy === "stock" ? a.stock - b.stock : sortBy === "cost" ? a.cost - b.cost : a.name.localeCompare(b.name)),
  [activeProducts, query, filter, sortBy]);
  const filteredSuppliers = data.suppliers.filter((s) => `${s.name} ${s.contact} ${s.email}`.toLowerCase().includes(query.toLowerCase()));
  const filteredOrders = data.orders.filter((o) => `${o.id} ${supplierById(o.supplierId)?.name || ""}`.toLowerCase().includes(query.toLowerCase())).filter((o) => filter === "All" || o.status === filter);
  const reportOrders = data.orders
    .filter((order) => `${order.id} ${supplierById(order.supplierId)?.name || ""}`.toLowerCase().includes(query.toLowerCase()))
    .filter((order) => (!reportFrom || order.date >= reportFrom) && (!reportTo || order.date <= reportTo));
  const pagedProducts = matchedProducts.slice(page * 6, page * 6 + 6);
  const chartData = [
    { month: "Jun", stock: 56, spend: 3800 }, { month: "Jul", stock: 62, spend: 4200 },
    { month: "Aug", stock: 59, spend: 3900 }, { month: "Sep", stock: 76, spend: 4800 },
    { month: "Oct", stock: 70, spend: 4400 }, { month: "Nov", stock: 84, spend: 5250 },
  ];

  const addButton = (label: string, mode: DialogMode, extra?: Partial<Exclude<DialogConfig, null>>) => <button onClick={() => setDialog({ mode, ...extra })} className="btn-primary"><Plus size={14}/>{label}</button>;
  const toolbar = (placeholder: string, filters: string[] = []) => <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="relative w-full sm:max-w-[300px]"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"/><input className="field pl-9" placeholder={placeholder} value={query} onChange={(e) => setQuery(e.target.value)}/></div>
    <div className="flex flex-wrap gap-2">{filters.length > 0 && <select aria-label="Filter results" className="field w-auto min-w-[125px]" value={filter} onChange={(e) => setFilter(e.target.value)}><option>All</option>{filters.map((item) => <option key={item}>{item}</option>)}</select>}
      {section === "products" && <><select aria-label="Sort products" className="field w-auto min-w-[125px]" value={sortBy} onChange={(e) => setSortBy(e.target.value)}><option value="name">Name A–Z</option><option value="stock">Lowest stock</option><option value="cost">Lowest cost</option></select><div className="flex rounded-lg border border-stone-200 p-1"><button onClick={() => setView("table")} className={`rounded-md px-2 text-[10px] ${view === "table" ? "bg-plum-50 text-plum-700" : "text-stone-400"}`}>Table</button><button onClick={() => setView("cards")} className={`rounded-md px-2 text-[10px] ${view === "cards" ? "bg-plum-50 text-plum-700" : "text-stone-400"}`}>Cards</button></div></>}
    </div>
  </div>;

  const statusTone = (status: string) => status === "RECEIVED" || status === "APPROVED" || status === "ORDERED" || status === "In stock" ? "green" : status === "DRAFT" || status === "PENDING" || status === "PARTIALLY_RECEIVED" || status === "Low stock" ? "amber" : status === "CANCELLED" || status === "Out of stock" ? "rose" : "neutral";
  const productRow = (product: Product) => <tr key={product.id} className="group border-t border-stone-100 hover:bg-[#fcfbfa]">
    <td className="py-3 pl-4 pr-3"><Link href={`/products/${product.id}`} className="flex items-center gap-3"><img src={product.image} alt="" className="h-10 w-10 rounded-lg bg-sage-50 object-cover"/><div><div className="font-medium text-stone-700 hover:text-plum-700">{product.name}</div><div className="mt-1 text-[10px] text-stone-400">{product.sku} · {product.category}</div></div></Link></td>
    <td className="px-3 py-3 text-stone-600">{product.stock} <span className="text-stone-400">{product.unit}</span></td>
    <td className="px-3 py-3"><Badge tone={statusTone(stockState(product.stock, product.minimum))}>{stockState(product.stock, product.minimum)}</Badge></td>
    <td className="px-3 py-3 text-stone-600">{product.minimum}</td><td className="px-3 py-3 text-stone-600">{currency(product.cost)}</td>
    <td className="py-3 pl-3 pr-4 text-right"><div className="flex justify-end gap-1">{isAdmin && <><button onClick={() => setDialog({ mode: "product", productId: product.id })} className="rounded-lg px-2 py-1.5 text-[10px] font-medium text-plum-700 hover:bg-plum-50">Edit</button><button title="Archive product" onClick={() => { if (!window.confirm(`Archive ${product.name}?`)) return; setData((current) => ({ ...current, products: current.products.map((item) => item.id === product.id ? { ...item, active: false } : item) })); notify("Product archived."); }} className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"><Archive size={13}/></button></>}<button onClick={() => setDialog({ mode: "stock", productId: product.id })} className="rounded-lg border border-stone-200 px-2.5 py-1.5 text-[10px] font-medium text-stone-600 hover:border-plum-200 hover:text-plum-700">Adjust</button></div></td>
  </tr>;

  const productTable = (products: Product[]) => <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-[11px]"><thead><tr className="text-[9px] font-semibold uppercase tracking-[.11em] text-stone-400"><th className="py-2 pl-4 pr-3">Product</th><th className="px-3 py-2">On hand</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Minimum</th><th className="px-3 py-2">Unit cost</th><th className="py-2 pl-3 pr-4 text-right">Action</th></tr></thead><tbody>{products.map(productRow)}</tbody></table>{products.length === 0 && <EmptyState title="No products found" detail="Try changing your search or filters."/>}</div>;

  const dashboard = <div className="space-y-5">
    <div className="relative overflow-hidden rounded-2xl bg-plum-900 px-6 py-6 text-white sm:px-8 sm:py-7">
      <div className="pointer-events-none absolute -right-6 -top-20 h-60 w-60 rounded-full border border-white/10"/><div className="pointer-events-none absolute -right-1 top-4 h-40 w-40 rounded-full border border-white/10"/>
      <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center"><div><div className="mb-2 flex items-center gap-2 text-[10px] font-medium text-plum-200"><span className="h-1.5 w-1.5 rounded-full bg-[#a8c29d]"/>{todayLabel}</div><h1 className="font-display text-[25px] font-medium">A beautiful day to get organized.</h1><p className="mt-2 max-w-[430px] text-[11px] leading-5 text-plum-100/80">Here’s your wholesale overview. You have {lowProducts.length + outProducts.length} items that may need a top-up.</p></div><div className="flex flex-wrap gap-2">{isAdmin && addButton("Add product", "product")}<Link href="/purchase-orders" className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-[11px] font-medium text-white hover:bg-white/10"><ClipboardList size={14}/>New purchase order</Link></div></div>
    </div>
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[
        { label: "Active products", value: activeProducts.length, note: "Across your catalog", icon: Package, tone: "plum" },
        { label: "Inventory value", value: currency(inventoryValue), note: "At average unit cost", icon: TrendingUp, tone: "sage" },
        { label: "Active suppliers", value: data.suppliers.length, note: "Ready to supply", icon: Truck, tone: "blush" },
        { label: "Open orders", value: openOrders.length, note: "Awaiting completion", icon: ClipboardList, tone: "amber" },
      ].map((stat) => <Card key={stat.label} className="p-4 sm:p-5"><div className="flex items-start justify-between"><div><div className="text-[10px] text-stone-400">{stat.label}</div><div className="mt-2 text-xl font-semibold tracking-tight text-stone-800">{stat.value}</div><div className="mt-1 text-[9px] text-stone-400">{stat.note}</div></div><div className={`grid h-8 w-8 place-items-center rounded-lg ${stat.tone === "plum" ? "bg-plum-50 text-plum-700" : stat.tone === "sage" ? "bg-sage-50 text-sage-700" : stat.tone === "blush" ? "bg-blush-50 text-blush-600" : "bg-amber-50 text-amber-700"}`}><stat.icon size={16}/></div></div></Card>)}
    </div>
    <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
      <Card className="p-5"><div className="mb-3 flex items-start justify-between"><div><h2 className="text-[13px] font-semibold">Inventory overview</h2><p className="mt-1 text-[10px] text-stone-400">Stock movement across the last six months</p></div><button onClick={() => window.location.assign("/reports")} className="text-[10px] font-medium text-plum-700">View report <ArrowRight size={12} className="ml-1 inline"/></button></div><div className="h-[210px] w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ left: -20, right: 5, top: 10, bottom: 0 }}><defs><linearGradient id="inventoryFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#89688c" stopOpacity={0.17}/><stop offset="95%" stopColor="#89688c" stopOpacity={0.01}/></linearGradient></defs><CartesianGrid stroke="#f1efed" vertical={false}/><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#a8a29e" }} dy={8}/><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "#a8a29e" }}/><Tooltip contentStyle={{ border: "1px solid #eee9ed", borderRadius: 10, fontSize: 11 }}/><Area type="monotone" dataKey="stock" stroke="#75577a" strokeWidth={2} fill="url(#inventoryFill)" /></AreaChart></ResponsiveContainer></div></Card>
      <Card className="p-5"><SectionTitle title="Needs attention" detail="Products at or below minimum stock" action={<Link href="/low-stock" className="text-[10px] font-medium text-plum-700">See all</Link>}/><div className="space-y-3">{[...outProducts, ...lowProducts].slice(0, 4).map((product) => <div key={product.id} className="flex items-center gap-3"><img className="h-9 w-9 rounded-lg object-cover" src={product.image} alt=""/><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-medium">{product.name}</p><p className="mt-1 text-[9px] text-stone-400">On hand {product.stock} · minimum {product.minimum}</p></div><Badge tone={statusTone(stockState(product.stock, product.minimum))}>{stockState(product.stock, product.minimum)}</Badge></div>)}{lowProducts.length + outProducts.length === 0 && <EmptyState title="All stocked up" detail="Everything is above its minimum level."/>}</div></Card>
    </div>
    <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
      <Card className="p-5"><SectionTitle title="Recent purchase orders" detail="Your latest supplier activity" action={<Link href="/purchase-orders" className="text-[10px] font-medium text-plum-700">All orders</Link>}/><div className="overflow-x-auto"><table className="w-full min-w-[390px] text-left text-[10px]"><thead className="text-[9px] uppercase tracking-wider text-stone-400"><tr><th className="pb-2">Order</th><th className="pb-2">Supplier</th><th className="pb-2">Status</th><th className="pb-2 text-right">Total</th></tr></thead><tbody>{data.orders.slice(0, 3).map((order) => <tr key={order.id} className="border-t border-stone-100"><td className="py-3 font-semibold text-plum-700">{order.id}</td><td className="py-3 text-stone-600">{supplierById(order.supplierId)?.name}</td><td className="py-3"><Badge tone={statusTone(order.status)}>{order.status.replaceAll("_", " ").toLowerCase()}</Badge></td><td className="py-3 text-right font-medium">{currency(orderTotal(order.lines, order.tax, order.extra))}</td></tr>)}</tbody></table></div></Card>
      <Card className="p-5"><SectionTitle title="Recent inventory activity" detail="Latest stock movements" action={<Link href="/inventory" className="text-[10px] font-medium text-plum-700">View history</Link>}/><ActivityList transactions={data.transactions.slice(0, 4)} productById={productById}/></Card>
    </div>
  </div>;

  const productsPage = <div>
    <SectionTitle title="Product catalog" detail={`${activeProducts.length} active products · Manage your wholesale supplies`} action={isAdmin ? addButton("Add product", "product") : undefined}/>
    {toolbar("Search by product, SKU or category", ["In stock", "Low stock", "Out of stock"])}
    {view === "table" ? <Card>{productTable(pagedProducts)}</Card> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{pagedProducts.map((p) => <Card key={p.id} className="overflow-hidden"><Link href={`/products/${p.id}`}><div className="flex gap-3 p-4"><img src={p.image} alt="" className="h-20 w-20 rounded-xl object-cover"/><div className="min-w-0 flex-1"><Badge tone={statusTone(stockState(p.stock, p.minimum))}>{stockState(p.stock, p.minimum)}</Badge><h3 className="mt-2 text-[12px] font-semibold">{p.name}</h3><p className="mt-1 text-[10px] text-stone-400">{p.sku} · {p.category}</p></div></div></Link><div className="flex items-center justify-between border-t border-stone-100 px-4 py-3 text-[10px]"><span>{p.stock} {p.unit} · {currency(p.cost)}/unit</span><button onClick={() => setDialog({ mode: "stock", productId: p.id })} className="text-plum-700">Adjust stock</button></div></Card>)}</div>}
    <Pagination page={page} count={matchedProducts.length} onChange={setPage}/>
  </div>;

  const inventoryPage = <div><SectionTitle title="Inventory overview" detail="Monitor stock, make adjustments, and review movement history" action={addButton("Adjust stock", "stock")}/><div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{[{ t: "Total units on hand", v: activeProducts.reduce((n, p) => n + p.stock, 0) }, { t: "Inventory value", v: currency(inventoryValue) }, { t: "Low stock", v: lowProducts.length }, { t: "Out of stock", v: outProducts.length }].map((x) => <Card key={x.t} className="p-4"><p className="text-[10px] text-stone-400">{x.t}</p><p className="mt-2 text-lg font-semibold">{x.v}</p></Card>)}</div>{toolbar("Search inventory", ["In stock", "Low stock", "Out of stock"])}<Card className="mb-5">{productTable(matchedProducts)}</Card><Card className="p-5"><SectionTitle title="Inventory transactions" detail="A traceable record of every stock adjustment"/><ActivityList transactions={data.transactions} productById={productById}/></Card></div>;

  const lowStockPage = <div>
    <SectionTitle title="Stock alerts" detail="Recommended top-ups based on your target stock levels" action={addButton("Create purchase order", "order")}/>
    <div className="mb-4 grid grid-cols-2 gap-3">
      <Card className="flex items-center gap-3 p-4"><div className="grid h-9 w-9 place-items-center rounded-xl bg-blush-50 text-blush-600"><CircleAlert size={18}/></div><div><p className="text-[10px] text-stone-400">Out of stock</p><p className="text-xl font-semibold">{outProducts.length}</p></div></Card>
      <Card className="flex items-center gap-3 p-4"><div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-700"><ArrowDownUp size={18}/></div><div><p className="text-[10px] text-stone-400">Low stock</p><p className="text-xl font-semibold">{lowProducts.length}</p></div></Card>
    </div>
    <Card className="p-5"><SectionTitle title="Products to replenish" detail="Reorder quantity = target stock − current stock"/>
      <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-[10px]">
        <thead className="text-[9px] uppercase tracking-wider text-stone-400"><tr><th className="pb-3">Product</th><th className="pb-3">Stock / min.</th><th className="pb-3">Supplier</th><th className="pb-3">Suggested top-up</th><th className="pb-3 text-right">Next step</th></tr></thead>
        <tbody>{[...outProducts, ...lowProducts].map((p) => <tr key={p.id} className="border-t border-stone-100">
          <td className="py-3"><Link href={`/products/${p.id}`} className="flex items-center gap-2 hover:text-plum-700"><img src={p.image} alt="" className="h-8 w-8 rounded-md object-cover"/><div><p className="font-medium">{p.name}</p><p className="mt-1 text-stone-400">{p.sku}</p></div></Link></td>
          <td><Badge tone={statusTone(stockState(p.stock, p.minimum))}>{p.stock} / {p.minimum} {p.unit}</Badge></td><td>{supplierById(p.supplier)?.name || "Not assigned"}</td>
          <td className="font-semibold">{Math.max(0, p.target - p.stock)} {p.unit}</td>
          <td className="text-right"><button onClick={() => setDialog({ mode: "order", productId: p.id, supplierId: p.supplier })} className="rounded-lg bg-plum-50 px-3 py-2 text-[10px] font-medium text-plum-700 hover:bg-plum-100">Create PO</button></td>
        </tr>)}</tbody>
      </table>
      {lowProducts.length + outProducts.length === 0 && <EmptyState title="No stock alerts" detail="Your active products are above their minimum levels."/>}
      </div>
    </Card>
  </div>;

  const suppliersPage = <div>
    <SectionTitle title="Supplier directory" detail={`${data.suppliers.length} suppliers · contacts, lead times, and product associations`} action={isAdmin ? addButton("Add supplier", "supplier") : undefined}/>
    {toolbar("Search suppliers or contacts")}
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{filteredSuppliers.map((supplier) => <Card key={supplier.id} className="p-5">
      <div className="flex items-start justify-between"><div className="grid h-10 w-10 place-items-center rounded-xl bg-plum-50 text-plum-700"><Truck size={18}/></div><div className="flex items-center gap-2">{supplier.preferred && <Badge tone="plum">Preferred</Badge>}{isAdmin && <button onClick={() => setDialog({ mode: "supplier", supplierId: supplier.id })} className="rounded-lg px-2 py-1 text-[10px] text-plum-700 hover:bg-plum-50">Edit</button>}</div></div>
      <h3 className="mt-4 text-[14px] font-semibold">{supplier.name}</h3><p className="mt-1 text-[10px] text-stone-400">Contact · {supplier.contact}</p>
      <div className="mt-4 space-y-2 border-t border-stone-100 pt-3 text-[10px] text-stone-600"><p><Mail size={12} className="mr-2 inline text-stone-400"/>{supplier.email}</p><p><Phone size={12} className="mr-2 inline text-stone-400"/>{supplier.phone}</p><p><Clock3 size={12} className="mr-2 inline text-stone-400"/>{supplier.leadTime} day lead time</p></div>
      <div className="mt-4 flex flex-wrap gap-1.5">{supplier.products.map((id) => productById(id)).filter(Boolean).map((product) => <Badge key={product!.id}>{product!.name}</Badge>)}</div>
      <button onClick={() => setDialog({ mode: "order", supplierId: supplier.id })} className="mt-4 w-full rounded-lg border border-stone-200 py-2 text-[10px] font-medium text-stone-600 hover:border-plum-200 hover:text-plum-700">Create purchase order <ArrowRight size={12} className="ml-1 inline"/></button>
    </Card>)}</div>
    {filteredSuppliers.length === 0 && <Card><EmptyState title="No suppliers found" detail="Try a different search or add a new supplier."/></Card>}
  </div>;

  const ordersPage = <div>
    <SectionTitle title="Purchase orders" detail={`${openOrders.length} open orders · Purchasing never changes inventory`} action={addButton("New purchase order", "order")}/>
    {toolbar("Search order number or supplier", ["DRAFT", "PENDING", "APPROVED", "ORDERED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"])}
    <Card><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-[10px]">
      <thead className="bg-[#fcfbfa] text-[9px] uppercase tracking-wider text-stone-400"><tr><th className="px-4 py-3">Order</th><th className="px-3 py-3">Supplier</th><th className="px-3 py-3">Placed</th><th className="px-3 py-3">Expected</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Total</th><th className="px-3 py-3 text-right">Actions</th></tr></thead>
      <tbody>{filteredOrders.map((order) => <tr key={order.id} className="border-t border-stone-100">
        <td className="px-4 py-3 font-semibold text-plum-700"><Link href={`/purchase-orders/${order.id}`} className="hover:underline">{order.id}</Link><div className="mt-1 font-normal text-stone-400">{order.lines.length} line item{order.lines.length !== 1 ? "s" : ""}</div></td>
        <td className="px-3 py-3">{supplierById(order.supplierId)?.name}</td><td className="px-3 py-3 text-stone-500">{shortDate(order.date)}</td>
        <td className="px-3 py-3 text-stone-500">{order.expected ? shortDate(order.expected) : "—"}</td>
        <td className="px-3 py-3"><Badge tone={statusTone(order.status)}>{order.status.replaceAll("_", " ")}</Badge></td>
        <td className="px-3 py-3 font-semibold">{currency(orderTotal(order.lines, order.tax, order.extra))}</td>
        <td className="px-3 py-3 text-right"><div className="flex justify-end gap-1">
          {order.status === "DRAFT" && <><button onClick={() => setDialog({ mode: "order", orderId: order.id })} className="rounded-md border border-stone-200 px-2 py-1.5 text-[9px] text-stone-600">Edit</button><button onClick={() => changeOrder(order.id, "PENDING")} className="rounded-md bg-plum-50 px-2 py-1.5 text-[9px] text-plum-700">Submit</button></>}
          {order.status === "PENDING" && isAdmin && <button onClick={() => changeOrder(order.id, "APPROVED")} className="rounded-md bg-sage-50 px-2 py-1.5 text-[9px] text-sage-700">Approve</button>}
          {order.status === "APPROVED" && isAdmin && <button onClick={() => changeOrder(order.id, "ORDERED")} className="rounded-md bg-plum-50 px-2 py-1.5 text-[9px] text-plum-700">Mark ordered</button>}
          {["ORDERED", "PARTIALLY_RECEIVED"].includes(order.status) && <button onClick={() => setDialog({ mode: "receive", orderId: order.id })} className="rounded-md bg-sage-50 px-2 py-1.5 text-[9px] text-sage-700">Receive</button>}
          {isAdmin && ["DRAFT", "PENDING", "APPROVED", "ORDERED"].includes(order.status) && <button onClick={() => changeOrder(order.id, "CANCELLED")} className="rounded-md px-2 py-1.5 text-[9px] text-red-600 hover:bg-red-50">Cancel</button>}
        </div></td>
      </tr>)}</tbody>
    </table>{filteredOrders.length === 0 && <EmptyState title="No purchase orders found" detail="Try another search or create a new order."/>}</div></Card>
  </div>;

  const receivingPage = <div><SectionTitle title="Goods receiving" detail="Confirm deliveries against open purchase orders. Partial receipts are supported."/><div className="mb-4 rounded-xl border border-sage-100 bg-sage-50 px-4 py-3 text-[10px] text-sage-700"><ShieldCheck size={15} className="mr-2 inline"/>Stock updates only when a receipt is confirmed. Over-receiving and cancelled orders are blocked.</div><div className="space-y-3">{data.orders.filter((order) => ["ORDERED", "PARTIALLY_RECEIVED"].includes(order.status)).map((order) => <Card key={order.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h3 className="text-[13px] font-semibold text-plum-700">{order.id}</h3><Badge tone={statusTone(order.status)}>{order.status.replaceAll("_", " ")}</Badge></div><p className="mt-1 text-[10px] text-stone-400">{supplierById(order.supplierId)?.name} · Expected {order.expected ? shortDate(order.expected) : "not scheduled"}</p></div><button onClick={() => setDialog({ mode: "receive", orderId: order.id })} className="btn-primary"><PackageCheck size={14}/>Receive goods</button></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[420px] text-left text-[10px]"><thead className="text-[9px] uppercase text-stone-400"><tr><th className="pb-2">Product</th><th className="pb-2">Ordered</th><th className="pb-2">Received</th><th className="pb-2">Outstanding</th></tr></thead><tbody>{order.lines.map((line) => <tr key={line.productId} className="border-t border-stone-100"><td className="py-2.5">{productById(line.productId)?.name}</td><td>{line.quantity}</td><td>{line.received}</td><td className="font-semibold">{line.quantity - line.received}</td></tr>)}</tbody></table></div></Card>)}{data.orders.filter((o) => ["ORDERED", "PARTIALLY_RECEIVED"].includes(o.status)).length === 0 && <Card><EmptyState title="Nothing to receive" detail="Orders marked as ordered will appear here."/></Card>}</div><Card className="mt-5 p-5"><SectionTitle title="Receipt history" detail="Goods received into inventory"/><ActivityList transactions={data.transactions.filter((t) => t.reason.includes("Goods received"))} productById={productById}/></Card></div>;

  const reportsPage = <div>
    <SectionTitle title="Reports & insights" detail="A clearer picture of inventory, purchasing, and supplier activity" action={<button onClick={() => exportCsv([["SKU", "Product", "Category", "Stock", "Minimum", "Unit cost", "Stock value"], ...activeProducts.filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(query.toLowerCase())).map((p) => [p.sku, p.name, p.category, String(p.stock), String(p.minimum), String(p.cost), String(p.stock * p.cost)])], "inventory-report")} className="btn-primary"><Download size={14}/>Export CSV</button>}/>
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {["Overview", "Inventory", "Purchases", "Suppliers"].map((tab) => <button onClick={() => setActiveTab(tab)} key={tab} className={`rounded-lg px-4 py-2 text-[10px] font-medium ${activeTab === tab ? "bg-plum-900 text-white" : "border border-stone-200 bg-white text-stone-600"}`}>{tab}</button>)}
      <div className="ml-auto flex flex-wrap gap-2"><input aria-label="Report start date" type="date" className="field w-auto" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)}/><input aria-label="Report end date" type="date" className="field w-auto" value={reportTo} onChange={(e) => setReportTo(e.target.value)}/></div>
    </div>
    <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">{[{ t: "Inventory value", v: currency(inventoryValue) }, { t: "Purchase orders", v: reportOrders.length }, { t: "Purchase total", v: currency(reportOrders.reduce((sum, order) => sum + orderTotal(order.lines, order.tax, order.extra), 0)) }, { t: "Suppliers", v: data.suppliers.length }].map((x) => <Card key={x.t} className="p-4"><p className="text-[10px] text-stone-400">{x.t}</p><p className="mt-2 text-xl font-semibold">{x.v}</p></Card>)}</div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5"><SectionTitle title={activeTab === "Purchases" ? "Monthly purchasing spend" : "Stock level trend"} detail="A six-month view for your workspace"/><div className="h-[240px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><CartesianGrid stroke="#f1efed" vertical={false}/><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#a8a29e" }}/><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "#a8a29e" }}/><Tooltip contentStyle={{ borderRadius: 10, fontSize: 11 }}/><Area type="monotone" dataKey={activeTab === "Purchases" ? "spend" : "stock"} stroke="#75577a" fill="#eee5f0" strokeWidth={2}/></AreaChart></ResponsiveContainer></div></Card>
      <Card className="p-5"><SectionTitle title="Inventory valuation" detail="Current value by product at average cost"/><div className="space-y-4">{activeProducts.filter((product) => `${product.name} ${product.sku}`.toLowerCase().includes(query.toLowerCase())).map((p) => <div key={p.id}><div className="mb-1.5 flex justify-between text-[10px]"><span>{p.name}</span><span className="font-medium">{currency(p.stock * p.cost)}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-plum-500" style={{ width: `${inventoryValue ? Math.max(3, p.stock * p.cost / inventoryValue * 100) : 0}%` }}/></div></div>)}</div></Card>
    </div>
    {activeTab === "Suppliers" && <Card className="mt-4 p-5"><SectionTitle title="Supplier performance overview" detail="Lead times and catalog coverage by supplier" action={<button onClick={() => exportCsv([["Supplier", "Contact", "Email", "Lead time (days)", "Products supplied"], ...data.suppliers.filter((s) => `${s.name} ${s.contact} ${s.email}`.toLowerCase().includes(query.toLowerCase())).map((s) => [s.name, s.contact, s.email, String(s.leadTime), String(s.products.length)])], "supplier-report")} className="btn-secondary"><Download size={13}/>Export suppliers</button>}/><div className="overflow-x-auto"><table className="w-full min-w-[450px] text-left text-[10px]"><thead className="text-[9px] uppercase tracking-wider text-stone-400"><tr><th className="pb-2">Supplier</th><th className="pb-2">Contact</th><th className="pb-2">Lead time</th><th className="pb-2">Products</th></tr></thead><tbody>{data.suppliers.filter((s) => `${s.name} ${s.contact} ${s.email}`.toLowerCase().includes(query.toLowerCase())).map((s) => <tr key={s.id} className="border-t border-stone-100"><td className="py-3 font-medium">{s.name}</td><td>{s.contact}</td><td>{s.leadTime} days</td><td>{s.products.length}</td></tr>)}</tbody></table></div></Card>}
    <Card className="mt-4 p-5"><SectionTitle title="Order activity" detail="Supplier purchase history" action={<button onClick={() => exportCsv([["Order", "Supplier", "Status", "Date", "Total"], ...reportOrders.map((o) => [o.id, supplierById(o.supplierId)?.name || "", o.status, o.date, String(orderTotal(o.lines, o.tax, o.extra))])], "purchase-report")} className="btn-secondary"><ArrowDownToLine size={13}/>Export purchases</button>}/>
      <div className="overflow-x-auto"><table className="w-full min-w-[500px] text-left text-[10px]"><thead className="text-[9px] uppercase tracking-wider text-stone-400"><tr><th className="pb-2">Purchase order</th><th className="pb-2">Supplier</th><th className="pb-2">Date</th><th className="pb-2">Status</th><th className="pb-2 text-right">Total</th></tr></thead>
      <tbody>{reportOrders.map((o) => <tr key={o.id} className="border-t border-stone-100"><td className="py-3 font-semibold text-plum-700">{o.id}</td><td>{supplierById(o.supplierId)?.name}</td><td>{shortDate(o.date)}</td><td><Badge tone={statusTone(o.status)}>{o.status.replaceAll("_", " ")}</Badge></td><td className="text-right font-medium">{currency(orderTotal(o.lines, o.tax, o.extra))}</td></tr>)}</tbody>
      </table>{reportOrders.length === 0 && <EmptyState title="No orders in this range" detail="Adjust the search or date range to see purchase activity."/>}</div>
    </Card>
  </div>;

  const settingsPage = <div><SectionTitle title="Workspace settings" detail="Manage access and account preferences"/><div className="mb-5 rounded-xl border border-plum-100 bg-plum-50 p-4 text-[10px] leading-5 text-plum-700"><ShieldCheck size={15} className="mr-2 inline"/>Role switching is a frontend-only simulation for review. It does not provide authentication or real authorization.</div><div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]"><Card className="p-5"><SectionTitle title="Your profile" detail="Workspace account details"/><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-full bg-plum-100 font-semibold text-plum-700">{initials}</div><div><p className="font-medium">{account.name}</p><p className="mt-1 text-[10px] text-stone-400">{account.email}</p></div></div><div className="mt-5"><label htmlFor="simulated-role" className="mb-1.5 block text-[10px] font-medium text-stone-600">Simulate role</label><select id="simulated-role" className="field" value={role} onChange={(e) => setRole(e.target.value as Role)}><option>Administrator</option><option>Staff</option></select><p className="mt-2 text-[9px] text-stone-400">Staff role hides administrator approval and team controls.</p></div></Card><Card className="p-5"><SectionTitle title="Team members" detail={`${data.users.length} people in this workspace`} action={isAdmin ? addButton("Add teammate", "user") : undefined}/><div className="overflow-x-auto"><table className="w-full min-w-[390px] text-left text-[10px]"><thead className="text-[9px] uppercase tracking-wider text-stone-400"><tr><th className="pb-2">Name</th><th className="pb-2">Email</th><th className="pb-2">Role</th></tr></thead><tbody>{data.users.map((user) => <tr key={user.id} className="border-t border-stone-100"><td className="py-3 font-medium">{user.name}</td><td className="text-stone-500">{user.email}</td><td><Badge tone={user.role === "Administrator" ? "plum" : "neutral"}>{user.role}</Badge></td></tr>)}</tbody></table></div><div className="mt-4 flex items-center gap-2 rounded-lg bg-stone-50 p-3 text-[9px] text-stone-500"><CircleHelp size={13}/>Data is stored locally in this browser for this frontend prototype.</div></Card></div><Card className="mt-4 p-5"><SectionTitle title="Prototype data" detail="Your mock data stays in browser localStorage"/><button onClick={() => { if (!window.confirm("Restore the original sample catalog and activity? Current local changes will be replaced.")) return; setData(seedData); notify("Sample data restored."); }} className="btn-secondary"><ArrowDownUp size={13}/>Restore sample data</button></Card></div>;

  const productDetailPage = detailProduct ? <div>
    <Link href="/products" className="mb-4 inline-flex items-center gap-2 text-[10px] font-medium text-stone-500 hover:text-plum-700"><ArrowLeft size={13}/>Back to product catalog</Link>
    <Card className="overflow-hidden"><div className="grid gap-0 md:grid-cols-[280px_1fr]"><img src={detailProduct.image} alt={detailProduct.name} className="h-56 w-full object-cover md:h-full"/><div className="p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><Badge tone={statusTone(stockState(detailProduct.stock, detailProduct.minimum))}>{stockState(detailProduct.stock, detailProduct.minimum)}</Badge><div className="flex gap-2">{isAdmin && <button onClick={() => setDialog({ mode: "product", productId: detailProduct.id })} className="btn-secondary">Edit product</button>}<button onClick={() => setDialog({ mode: "stock", productId: detailProduct.id })} className="btn-primary"><ArrowDownUp size={13}/>Adjust stock</button></div></div><p className="mt-5 text-[10px] font-semibold uppercase tracking-[.13em] text-stone-400">{detailProduct.category} · {detailProduct.sku}</p><h2 className="mt-2 font-display text-2xl text-plum-900">{detailProduct.name}</h2><p className="mt-3 max-w-[500px] text-[11px] leading-5 text-stone-500">{detailProduct.description}</p><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{[{ k: "On hand", v: `${detailProduct.stock} ${detailProduct.unit}` }, { k: "Minimum", v: `${detailProduct.minimum} ${detailProduct.unit}` }, { k: "Target", v: `${detailProduct.target} ${detailProduct.unit}` }, { k: "Average cost", v: currency(detailProduct.cost) }].map((stat) => <div key={stat.k} className="rounded-xl bg-[#faf9f8] p-3"><p className="text-[9px] text-stone-400">{stat.k}</p><p className="mt-1 text-[12px] font-semibold">{stat.v}</p></div>)}</div><div className="mt-5 border-t border-stone-100 pt-4 text-[10px]"><span className="text-stone-400">Preferred supplier</span><p className="mt-1 font-medium">{supplierById(detailProduct.supplier)?.name || "Not assigned"}</p></div></div></div></Card>
    <Card className="mt-4 p-5"><SectionTitle title="Product inventory history" detail="Adjustments and receipts for this product"/><ActivityList transactions={data.transactions.filter((transaction) => transaction.productId === detailProduct.id)} productById={productById}/></Card>
  </div> : <Card><EmptyState title="Product not found" detail="This product may have been archived or removed from the sample data."/></Card>;

  const orderDetailPage = detailOrder ? <div>
    <Link href="/purchase-orders" className="mb-4 inline-flex items-center gap-2 text-[10px] font-medium text-stone-500 hover:text-plum-700"><ArrowLeft size={13}/>Back to purchase orders</Link>
    <Card className="p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-stone-400">Purchase order</p><Badge tone={statusTone(detailOrder.status)}>{detailOrder.status.replaceAll("_", " ")}</Badge></div><h2 className="mt-2 font-display text-2xl text-plum-900">{detailOrder.id}</h2><p className="mt-2 text-[10px] text-stone-500">{supplierById(detailOrder.supplierId)?.name} · Created {shortDate(detailOrder.date)}</p></div><div className="flex flex-wrap gap-2">
        {detailOrder.status === "DRAFT" && <><button onClick={() => setDialog({ mode: "order", orderId: detailOrder.id })} className="btn-secondary">Edit draft</button><button onClick={() => changeOrder(detailOrder.id, "PENDING")} className="btn-primary">Submit for approval</button></>}
        {detailOrder.status === "PENDING" && isAdmin && <button onClick={() => changeOrder(detailOrder.id, "APPROVED")} className="btn-primary"><Check size={14}/>Approve</button>}
        {detailOrder.status === "APPROVED" && isAdmin && <button onClick={() => changeOrder(detailOrder.id, "ORDERED")} className="btn-primary"><Truck size={14}/>Mark ordered</button>}
        {["ORDERED", "PARTIALLY_RECEIVED"].includes(detailOrder.status) && <button onClick={() => setDialog({ mode: "receive", orderId: detailOrder.id })} className="btn-primary"><PackageCheck size={14}/>Receive goods</button>}
        {isAdmin && ["DRAFT", "PENDING", "APPROVED", "ORDERED"].includes(detailOrder.status) && <button onClick={() => changeOrder(detailOrder.id, "CANCELLED")} className="btn-secondary text-red-600">Cancel order</button>}
      </div></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-[#faf9f8] p-3"><p className="text-[9px] text-stone-400">Supplier</p><p className="mt-1 text-[11px] font-medium">{supplierById(detailOrder.supplierId)?.name}</p></div><div className="rounded-xl bg-[#faf9f8] p-3"><p className="text-[9px] text-stone-400">Expected delivery</p><p className="mt-1 text-[11px] font-medium">{detailOrder.expected ? shortDate(detailOrder.expected) : "Not scheduled"}</p></div><div className="rounded-xl bg-[#faf9f8] p-3"><p className="text-[9px] text-stone-400">Order total</p><p className="mt-1 text-[11px] font-semibold">{currency(orderTotal(detailOrder.lines, detailOrder.tax, detailOrder.extra))}</p></div></div>
      <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-[10px]"><thead className="text-[9px] uppercase tracking-wider text-stone-400"><tr><th className="pb-2">Product</th><th className="pb-2">Qty ordered</th><th className="pb-2">Received</th><th className="pb-2">Unit cost</th><th className="pb-2 text-right">Subtotal</th></tr></thead><tbody>{detailOrder.lines.map((line) => <tr key={line.productId} className="border-t border-stone-100"><td className="py-3 font-medium">{productById(line.productId)?.name || "Archived product"}</td><td>{line.quantity}</td><td>{line.received}</td><td>{currency(line.cost)}</td><td className="text-right font-medium">{currency(line.quantity * line.cost)}</td></tr>)}</tbody></table></div>
      <div className="ml-auto mt-4 max-w-[260px] space-y-2 border-t border-stone-100 pt-4 text-[10px]"><div className="flex justify-between text-stone-500"><span>Subtotal</span><span>{currency(detailOrder.lines.reduce((sum, line) => sum + line.quantity * line.cost, 0))}</span></div><div className="flex justify-between text-stone-500"><span>Tax ({detailOrder.tax}%) & charges</span><span>{currency(orderTotal(detailOrder.lines, detailOrder.tax, detailOrder.extra) - detailOrder.lines.reduce((sum, line) => sum + line.quantity * line.cost, 0))}</span></div><div className="flex justify-between border-t border-stone-100 pt-2 text-[12px] font-semibold"><span>Total</span><span>{currency(orderTotal(detailOrder.lines, detailOrder.tax, detailOrder.extra))}</span></div></div>
      {detailOrder.notes && <div className="mt-5 rounded-xl bg-plum-50 p-4 text-[10px] text-plum-700"><p className="font-semibold">Order notes</p><p className="mt-1">{detailOrder.notes}</p></div>}
    </Card>
  </div> : <Card><EmptyState title="Purchase order not found" detail="This order may no longer be in your workspace."/></Card>;

  const pageContent: Record<string, React.ReactNode> = {
    dashboard, products: productsPage, "product-detail": productDetailPage, inventory: inventoryPage, "low-stock": lowStockPage,
    "order-detail": orderDetailPage,
    suppliers: suppliersPage, "purchase-orders": ordersPage, receiving: receivingPage,
    reports: reportsPage, settings: settingsPage,
  };

  if (!ready) return <div className="grid min-h-screen place-items-center text-plum-700"><div className="flex items-center gap-2"><Flower2 className="animate-pulse" size={20}/>Loading your workspace…</div></div>;

  return <div className="min-h-screen">
    {mobileMenu && <button aria-label="Close navigation" onClick={() => setMobileMenu(false)} className="fixed inset-0 z-30 bg-black/30 lg:hidden"/>}
    <aside className={`sidebar fixed inset-y-0 left-0 z-40 flex w-[236px] flex-col border-r border-stone-200/80 bg-white transition-transform duration-200 lg:translate-x-0 ${mobileMenu ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex h-[76px] items-center justify-between border-b border-stone-100 px-5"><Logo/><button onClick={() => setMobileMenu(false)} className="rounded-md p-1 text-stone-400 lg:hidden"><X size={18}/></button></div>
      <div className="px-4 pt-5"><div className="mb-2 px-2 text-[9px] font-semibold uppercase tracking-[.16em] text-stone-400">Workspace</div><nav className="space-y-1">{navigation.map((item) => { const selected = section === item.section; return <Link key={item.section} href={item.href} onClick={() => setMobileMenu(false)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[11px] font-medium transition-colors ${selected ? "bg-plum-50 text-plum-900" : "text-stone-500 hover:bg-stone-50 hover:text-stone-800"}`}><item.icon size={16} strokeWidth={selected ? 2 : 1.7}/>{item.label}{item.section === "low-stock" && lowProducts.length + outProducts.length > 0 && <span className="ml-auto rounded-full bg-blush-50 px-2 py-0.5 text-[9px] text-blush-600">{lowProducts.length + outProducts.length}</span>}</Link>; })}</nav></div>
      <div className="mt-auto px-4 pb-4"><div className="mb-3 rounded-xl bg-[#faf8f8] p-3"><div className="mb-2 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-wider text-stone-400"><Sprout size={13} className="text-sage-600"/>Procurement flow</div><p className="text-[10px] leading-4 text-stone-600">Track each top-up from product to delivery.</p><Link href="/low-stock" className="mt-2 inline-flex items-center gap-1 text-[9px] font-semibold text-plum-700">Review stock alerts <ArrowRight size={11}/></Link></div><Link href="/settings" onClick={() => setMobileMenu(false)} className={`flex items-center gap-3 rounded-xl p-2.5 ${section === "settings" ? "bg-plum-50" : "hover:bg-stone-50"}`}><div className="grid h-8 w-8 place-items-center rounded-full bg-plum-100 text-[10px] font-semibold text-plum-800">{initials}</div><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-semibold">{account.name}</p><p className="text-[9px] text-stone-400">{role}</p></div><ChevronDown size={13} className="text-stone-400"/></Link><button onClick={signOut} className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[10px] font-medium text-stone-500 transition hover:bg-blush-50 hover:text-blush-600"><LogOut size={14}/>Log out</button></div>
    </aside>
    <main className="main-content min-h-screen lg:ml-[236px]">
      <header className="topbar sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-stone-200/80 bg-[#f8f7f6]/90 px-4 backdrop-blur-lg sm:px-7">
        <div className="flex min-w-0 items-center gap-3"><button onClick={() => setMobileMenu(true)} className="rounded-lg p-2 text-stone-600 hover:bg-white lg:hidden" aria-label="Open navigation"><Menu size={18}/></button><div className="min-w-0"><div className="hidden items-center gap-1.5 text-[9px] text-stone-400 sm:flex"><span>Workspace</span><ChevronRight size={11}/><span className="text-stone-600">{currentTitle}</span></div><h1 className="truncate text-[15px] font-semibold text-stone-800 sm:mt-1">{currentTitle}</h1></div></div>
        <div className="flex items-center gap-2 sm:gap-3"><label className="relative hidden md:block"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"/><input value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 w-[205px] rounded-lg border border-stone-200 bg-white pl-9 pr-3 text-[10px] outline-none placeholder:text-stone-400 focus:border-plum-200" placeholder="Search this page…"/></label><button onClick={() => notify("You're all caught up.")} aria-label="Notifications" className="relative rounded-lg border border-stone-200 bg-white p-2 text-stone-500 hover:text-plum-700"><Bell size={15}/><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-blush-600"/></button><button onClick={() => setRole(isAdmin ? "Staff" : "Administrator")} title="Switch simulated role" className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-2 py-1.5 hover:border-plum-200"><span className="grid h-6 w-6 place-items-center rounded-full bg-plum-100 text-[9px] font-semibold text-plum-800">{initials}</span><span className="hidden text-[10px] font-medium text-stone-600 sm:inline">{role}</span><ChevronDown size={12} className="text-stone-400"/></button></div>
      </header>
      <div className="main-content mx-auto max-w-[1500px] px-4 py-5 sm:px-7 sm:py-7">{pageContent[section] || dashboard}<footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-stone-200/70 pt-4 text-[9px] text-stone-400"><span>Event Florist Wholesale Top-Ups · Internal workspace</span><span>Frontend prototype · Local browser data only</span></footer></div>
    </main>
    {dialog && <Modal config={dialog} data={data} onClose={() => setDialog(null)} onSubmit={applyAction}/>}
    {toast && <div role="status" className={`fixed bottom-5 right-5 z-[70] flex max-w-[calc(100vw-40px)] items-center gap-2 rounded-xl px-4 py-3 text-[11px] text-white shadow-xl ${toastError ? "bg-red-700" : "bg-plum-900"}`}><Check size={15}/>{toast}<button onClick={() => setToast("")} aria-label="Dismiss notification" className="ml-2 text-white/70 hover:text-white"><X size={13}/></button></div>}
  </div>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="flex flex-col items-center justify-center px-5 py-12 text-center"><div className="grid h-10 w-10 place-items-center rounded-xl bg-plum-50 text-plum-700"><Leaf size={18}/></div><p className="mt-3 text-[11px] font-semibold text-stone-700">{title}</p><p className="mt-1 text-[10px] text-stone-400">{detail}</p></div>;
}

function ActivityList({ transactions, productById }: { transactions: Transaction[]; productById: (id: string) => Product | undefined }) {
  if (transactions.length === 0) return <EmptyState title="No activity yet" detail="Inventory transactions will appear here."/>;
  return <div className="space-y-3">{transactions.map((transaction) => <div key={transaction.id} className="flex items-center gap-3"><div className={`grid h-8 w-8 place-items-center rounded-lg ${transaction.change > 0 ? "bg-sage-50 text-sage-700" : "bg-amber-50 text-amber-700"}`}>{transaction.change > 0 ? <ArrowDownToLine size={14}/> : <ArrowDownUp size={14}/>}</div><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-medium">{productById(transaction.productId)?.name || "Catalog item"}</p><p className="mt-1 truncate text-[9px] text-stone-400">{transaction.reason} · {shortDate(transaction.date)}</p></div><span className={`text-[10px] font-semibold ${transaction.change > 0 ? "text-sage-700" : "text-stone-600"}`}>{transaction.change > 0 ? "+" : ""}{transaction.change}</span></div>)}</div>;
}

function Pagination({ page, count, onChange }: { page: number; count: number; onChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(count / 6));
  return <div className="mt-4 flex items-center justify-between text-[10px] text-stone-400"><span>Showing {count ? page * 6 + 1 : 0}–{Math.min((page + 1) * 6, count)} of {count} products</span><div className="flex gap-1"><button disabled={page === 0} onClick={() => onChange(page - 1)} className="rounded-md border border-stone-200 bg-white p-1.5 disabled:opacity-40"><ChevronLeft size={14}/></button><span className="px-2 py-1.5 text-stone-600">{page + 1} / {pages}</span><button disabled={page + 1 >= pages} onClick={() => onChange(page + 1)} className="rounded-md border border-stone-200 bg-white p-1.5 disabled:opacity-40"><ChevronRight size={14}/></button></div></div>;
}
