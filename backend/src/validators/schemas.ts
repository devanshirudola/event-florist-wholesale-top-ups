import { z } from "zod";
import type { OrderStatus } from "../types";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Enter a valid identifier");
const nonNegative = z.number().min(0);

export const ORDER_STATUSES = [
  "DRAFT",
  "PENDING",
  "APPROVED",
  "ORDERED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
] as const satisfies readonly OrderStatus[];

export const PRODUCT_STATUSES = ["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"] as const;

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
}).strict();

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
}).strict();

// Field shapes are declared without defaults so that `*.partial()` update
// schemas stay purely optional. In Zod 4 `.partial()` keeps `.default()`,
// which would otherwise zero out untouched fields on every PATCH.
const categoryFields = {
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500),
};

export const categorySchema = z.object({
  name: categoryFields.name,
  description: categoryFields.description.default(""),
}).strict();

export const categoryUpdateSchema = z.object(categoryFields).partial().strict();

const supplierFields = {
  name: z.string().trim().min(2).max(120),
  companyName: z.string().trim().min(2).max(160),
  contactPerson: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(50),
  address: z.string().trim().max(500),
  notes: z.string().trim().max(2000),
};

export const supplierSchema = z.object({
  name: supplierFields.name,
  companyName: supplierFields.companyName,
  contactPerson: supplierFields.contactPerson,
  email: supplierFields.email,
  phone: supplierFields.phone.default(""),
  address: supplierFields.address.default(""),
  notes: supplierFields.notes.default(""),
}).strict();

export const supplierUpdateSchema = z.object(supplierFields).partial().strict();

const supplierLinkSchema = z.object({
  supplierId: objectId,
  supplierSku: z.string().trim().max(100).default(""),
  unitCost: nonNegative,
  leadTimeDays: z.number().int().min(0).max(365).default(0),
  isPreferred: z.boolean().default(false),
}).strict();

const productFields = {
  name: z.string().trim().min(2).max(160),
  sku: z.string().trim().min(1).max(80),
  description: z.string().trim().max(2000),
  categoryId: objectId,
  imageUrl: z.string().trim().url().max(2048).or(z.literal("")),
  unit: z.string().trim().min(1).max(40),
  currentStock: nonNegative,
  minimumStock: nonNegative,
  targetStock: nonNegative,
  averageCost: nonNegative,
  sellingPrice: nonNegative.optional(),
  preferredSupplierId: objectId.optional(),
  suppliers: z.array(supplierLinkSchema).max(50),
};

export const productSchema = z.object({
  name: productFields.name,
  sku: productFields.sku,
  description: productFields.description.default(""),
  categoryId: productFields.categoryId,
  imageUrl: productFields.imageUrl.default(""),
  unit: productFields.unit,
  currentStock: productFields.currentStock.default(0),
  minimumStock: productFields.minimumStock.default(0),
  targetStock: productFields.targetStock.default(0),
  averageCost: productFields.averageCost,
  sellingPrice: productFields.sellingPrice,
  preferredSupplierId: productFields.preferredSupplierId,
  suppliers: productFields.suppliers.default([]),
}).strict().refine((value) => value.targetStock >= value.minimumStock, {
  message: "Target stock must be at least minimum stock",
  path: ["targetStock"],
});

export const productUpdateSchema = z.object(productFields)
  .partial()
  .omit({ currentStock: true })
  .strict();

export const inventoryAdjustmentSchema = z.object({
  productId: objectId,
  quantityChange: z.number().int().refine((value) => value !== 0, "Quantity change cannot be zero"),
  reason: z.string().trim().min(2).max(500),
}).strict();

export const purchaseOrderItemSchema = z.object({
  productId: objectId,
  quantity: z.number().int().min(1).max(1_000_000),
}).strict();

export const purchaseOrderSchema = z.object({
  supplierId: objectId,
  items: z.array(purchaseOrderItemSchema).min(1).max(100),
  tax: nonNegative.max(100).default(0),
  additionalCharges: nonNegative.default(0),
  expectedDeliveryDate: z.coerce.date().optional(),
  notes: z.string().trim().max(2000).default(""),
}).strict().refine((value) => new Set(value.items.map((item) => item.productId)).size === value.items.length, {
  message: "A product may only appear once on an order",
  path: ["items"],
});

export const receiveSchema = z.object({
  items: z.array(z.object({
    productId: objectId,
    quantity: z.number().int().min(1).max(1_000_000),
  }).strict()).min(1).max(100),
  notes: z.string().trim().max(2000).default(""),
}).strict().refine((value) => new Set(value.items.map((item) => item.productId)).size === value.items.length, {
  message: "A product may only appear once per receipt",
  path: ["items"],
});

export const reportQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  supplierId: objectId.optional(),
}).refine((value) => !value.from || !value.to || value.from <= value.to, {
  message: "Start date must be on or before end date",
});
