import mongoose from "mongoose";
import Category from "../models/Category";
import Product from "../models/Product";
import ProductSupplier from "../models/ProductSupplier";
import Supplier from "../models/Supplier";
import InventoryTransaction from "../models/InventoryTransaction";
import type { PageQuery } from "../types";
import type { z } from "zod";
import type { productSchema, productUpdateSchema, supplierSchema } from "../validators/schemas";
import { ApiError } from "../utils/ApiError";

type ProductInput = z.infer<typeof productSchema>;
type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
type SupplierInput = z.infer<typeof supplierSchema>;

async function ensureProductRelations(input: {
  categoryId?: string;
  supplierIds?: string[];
  preferredSupplierId?: string;
}) {
  if (input.categoryId) {
    const category = await Category.findOne({ _id: input.categoryId, isActive: true });
    if (!category) throw new ApiError(400, "INVALID_CATEGORY", "Choose an active product category");
  }
  const supplierIds = [...new Set([...(input.supplierIds || []), ...(input.preferredSupplierId ? [input.preferredSupplierId] : [])])];
  if (supplierIds.length) {
    const suppliers = await Supplier.find({ _id: { $in: supplierIds }, isActive: true }).select("_id");
    if (suppliers.length !== supplierIds.length) {
      throw new ApiError(400, "INVALID_SUPPLIER", "Choose active suppliers for this product");
    }
  }
}

function escapedSearch(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listProducts(query: PageQuery & { categoryId?: string; status?: string; active?: boolean }) {
  const filter: Record<string, unknown> = {};
  if (query.active !== undefined) filter.isActive = query.active;
  if (query.categoryId) filter.categoryId = query.categoryId;
  if (query.status === "LOW_STOCK") {
    filter.currentStock = { $gt: 0 };
    filter.$expr = { $lte: ["$currentStock", "$minimumStock"] };
  } else if (query.status === "OUT_OF_STOCK") filter.currentStock = 0;
  else if (query.status === "IN_STOCK") filter.$expr = { $gt: ["$currentStock", "$minimumStock"] };
  if (query.search) {
    const search = new RegExp(escapedSearch(query.search), "i");
    filter.$or = [{ name: search }, { sku: search }, { description: search }];
  }

  const [data, total] = await Promise.all([
    Product.find(filter).sort({ name: 1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
    Product.countDocuments(filter),
  ]);
  return { data, total };
}

export async function getProduct(productId: string) {
  const product = await Product.findById(productId).lean();
  if (!product) throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product was not found");
  const suppliers = await ProductSupplier.find({ productId }).populate("supplierId").lean();
  return { ...product, suppliers };
}

export async function createProduct(input: ProductInput, actorId: string) {
  await ensureProductRelations({
    categoryId: input.categoryId,
    supplierIds: input.suppliers.map((supplier) => supplier.supplierId),
    preferredSupplierId: input.preferredSupplierId,
  });
  const requestedPreferred = input.suppliers.find((supplier) => supplier.isPreferred)?.supplierId;
  const preferredSupplierId = input.preferredSupplierId || requestedPreferred;
  if (input.suppliers.filter((supplier) => supplier.isPreferred).length > 1) {
    throw new ApiError(400, "MULTIPLE_PREFERRED_SUPPLIERS", "Only one preferred supplier is allowed per product");
  }
  if (preferredSupplierId && !input.suppliers.some((supplier) => supplier.supplierId === preferredSupplierId)) {
    throw new ApiError(400, "PREFERRED_SUPPLIER_NOT_LINKED", "Preferred supplier must be linked to the product with a unit cost");
  }

  const session = await mongoose.startSession();
  try {
    let createdId = "";
    await session.withTransaction(async () => {
      const { suppliers, ...productFields } = input;
      const [product] = await Product.create([{
        ...productFields,
        sku: input.sku.trim().toUpperCase(),
        preferredSupplierId,
      }], { session });
      createdId = product.id;

      if (suppliers.length) {
        await ProductSupplier.insertMany(suppliers.map((supplier) => ({
          ...supplier,
          isPreferred: supplier.supplierId === preferredSupplierId,
          productId: product._id,
        })), { session });
      }

      if (product.currentStock > 0) {
        await InventoryTransaction.create([{
          productId: product._id,
          transactionType: "OPENING_STOCK",
          previousQuantity: 0,
          quantityChanged: product.currentStock,
          newQuantity: product.currentStock,
          reason: "Opening stock",
          performedBy: actorId,
        }], { session });
      }
    });
    return getProduct(createdId);
  } finally {
    await session.endSession();
  }
}

export async function updateProduct(productId: string, input: ProductUpdateInput) {
  const current = await Product.findById(productId);
  if (!current) throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product was not found");
  const updatedMinimum = input.minimumStock ?? current.minimumStock;
  const updatedTarget = input.targetStock ?? current.targetStock;
  if (updatedTarget < updatedMinimum) {
    throw new ApiError(400, "INVALID_STOCK_THRESHOLDS", "Target stock must be at least minimum stock");
  }

  const supplierIds = input.suppliers?.map((supplier) => supplier.supplierId);
  await ensureProductRelations({
    categoryId: input.categoryId,
    supplierIds,
    preferredSupplierId: input.preferredSupplierId,
  });

  if (input.suppliers && input.suppliers.filter((supplier) => supplier.isPreferred).length > 1) {
    throw new ApiError(400, "MULTIPLE_PREFERRED_SUPPLIERS", "Only one preferred supplier is allowed per product");
  }

  const currentLinks = input.suppliers
    ? undefined
    : await ProductSupplier.find({ productId }).select("supplierId").lean();
  const linkedSupplierIds = input.suppliers?.map((supplier) => supplier.supplierId)
    || currentLinks?.map((link) => link.supplierId.toString())
    || [];
  const preferredSupplierId = input.preferredSupplierId
    || input.suppliers?.find((supplier) => supplier.isPreferred)?.supplierId
    || (input.suppliers ? undefined : current.preferredSupplierId?.toString());
  if (preferredSupplierId && !linkedSupplierIds.includes(preferredSupplierId)) {
    throw new ApiError(400, "PREFERRED_SUPPLIER_NOT_LINKED", "Preferred supplier must be linked to the product with a unit cost");
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { suppliers, ...fields } = input;
      const update = {
        ...fields,
        ...(suppliers || Object.hasOwn(input, "preferredSupplierId")
          ? { preferredSupplierId: preferredSupplierId || null }
          : {}),
      };
      const result = await Product.updateOne(
        { _id: productId, __v: current.__v },
        { $set: update, $inc: { __v: 1 } },
        { runValidators: true, session },
      );
      if (result.modifiedCount !== 1) throw new ApiError(409, "PRODUCT_CHANGED", "Product changed while it was being edited; reload and try again");

      if (suppliers) {
        await ProductSupplier.deleteMany({ productId }, { session });
        if (suppliers.length) {
          await ProductSupplier.insertMany(suppliers.map((supplier) => ({
            ...supplier,
            isPreferred: supplier.supplierId === preferredSupplierId,
            productId,
          })), { session });
        }
      }
    });
  } finally {
    await session.endSession();
  }
  return getProduct(productId);
}

export async function archiveProduct(productId: string) {
  const product = await Product.findByIdAndUpdate(productId, { $set: { isActive: false } }, { new: true });
  if (!product) throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product was not found");
  return product;
}

export async function listCategories(query: PageQuery) {
  const filter = query.search ? { name: new RegExp(escapedSearch(query.search), "i") } : {};
  const [data, total] = await Promise.all([
    Category.find(filter).sort({ name: 1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
    Category.countDocuments(filter),
  ]);
  return { data, total };
}

export async function createCategory(input: { name: string; description: string }) {
  return Category.create(input);
}

export async function updateCategory(categoryId: string, input: { name?: string; description?: string }) {
  const category = await Category.findByIdAndUpdate(categoryId, { $set: input }, { new: true, runValidators: true });
  if (!category) throw new ApiError(404, "CATEGORY_NOT_FOUND", "Category was not found");
  return category;
}

export async function archiveCategory(categoryId: string) {
  const category = await Category.findByIdAndUpdate(categoryId, { $set: { isActive: false } }, { new: true });
  if (!category) throw new ApiError(404, "CATEGORY_NOT_FOUND", "Category was not found");
  return category;
}

export async function listSuppliers(query: PageQuery) {
  const filter = query.search ? {
    $or: [
      { name: new RegExp(escapedSearch(query.search), "i") },
      { companyName: new RegExp(escapedSearch(query.search), "i") },
      { contactPerson: new RegExp(escapedSearch(query.search), "i") },
      { email: new RegExp(escapedSearch(query.search), "i") },
    ],
  } : {};
  const [data, total] = await Promise.all([
    Supplier.find(filter).sort({ companyName: 1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
    Supplier.countDocuments(filter),
  ]);
  return { data, total };
}

export async function getSupplier(supplierId: string) {
  const supplier = await Supplier.findById(supplierId).lean();
  if (!supplier) throw new ApiError(404, "SUPPLIER_NOT_FOUND", "Supplier was not found");
  const products = await ProductSupplier.find({ supplierId }).populate("productId").lean();
  return { ...supplier, products };
}

export async function createSupplier(input: SupplierInput) {
  return Supplier.create(input);
}

export async function updateSupplier(supplierId: string, input: Partial<SupplierInput>) {
  const supplier = await Supplier.findByIdAndUpdate(supplierId, { $set: input }, { new: true, runValidators: true });
  if (!supplier) throw new ApiError(404, "SUPPLIER_NOT_FOUND", "Supplier was not found");
  return supplier;
}

export async function archiveSupplier(supplierId: string) {
  const supplier = await Supplier.findByIdAndUpdate(supplierId, { $set: { isActive: false } }, { new: true });
  if (!supplier) throw new ApiError(404, "SUPPLIER_NOT_FOUND", "Supplier was not found");
  return supplier;
}
