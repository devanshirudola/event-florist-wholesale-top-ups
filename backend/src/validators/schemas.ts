import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Enter a valid identifier");
const nonNegative = z.number().finite().min(0);

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
}).strict();

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
}).strict();

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).default(""),
}).strict();

export const categoryUpdateSchema = categorySchema.partial();

export const supplierSchema = z.object({
  name: z.string().trim().min(2).max(120),
  companyName: z.string().trim().min(2).max(160),
  contactPerson: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(50).default(""),
  address: z.string().trim().max(500).default(""),
  notes: z.string().trim().max(2000).default(""),
}).strict();

export const supplierLinkSchema = z.object({
  supplierId: objectId,
  supplierSku: z.string().trim().max(100).default(""),
  unitCost: nonNegative,
  leadTimeDays: z.number().int().min(0).max(365).default(0),
  isPreferred: z.boolean().default(false),
}).strict();

const productBaseSchema = z.object({
  name: z.string().trim().min(2).max(160),
  sku: z.string().trim().min(1).max(80),
  description: z.string().trim().max(2000).default(""),
  categoryId: objectId,
  imageUrl: z.string().trim().url().max(2048).or(z.literal("")).default(""),
  unit: z.string().trim().min(1).max(40),
  currentStock: nonNegative.default(0),
  minimumStock: nonNegative.default(0),
  targetStock: nonNegative.default(0),
  averageCost: nonNegative,
  sellingPrice: nonNegative.optional(),
  preferredSupplierId: objectId.optional(),
  suppliers: z.array(supplierLinkSchema).max(50).default([]),
}).strict();

export const productSchema = productBaseSchema.refine((value) => value.targetStock >= value.minimumStock, {
  message: "Target stock must be at least minimum stock",
  path: ["targetStock"],
}).strict();

export const productUpdateSchema = productBaseSchema.partial().omit({ currentStock: true }).extend({
  suppliers: z.array(supplierLinkSchema).max(50).optional(),
}).strict();

export const inventoryAdjustmentSchema = z.object({
  productId: objectId,
  quantityChange: z.number().finite().int().refine((value) => value !== 0, "Quantity change cannot be zero"),
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
  status: z.string().optional(),
  supplierId: objectId.optional(),
}).refine((value) => !value.from || !value.to || value.from <= value.to, {
  message: "Start date must be on or before end date",
});
