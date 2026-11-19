import mongoose from "mongoose";
import InventoryTransaction from "../models/InventoryTransaction";
import Product from "../models/Product";
import { getRecommendedReorderQuantity, getStockStatus } from "./inventoryRules";
import { ApiError } from "../utils/ApiError";
import type { PageQuery } from "../types";

function escapedSearch(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listInventory(query: PageQuery & { status?: string }) {
  const filter: Record<string, unknown> = { isActive: true };
  if (query.status === "LOW_STOCK") {
    filter.currentStock = { $gt: 0 };
    filter.$expr = { $lte: ["$currentStock", "$minimumStock"] };
  } else if (query.status === "OUT_OF_STOCK") filter.currentStock = 0;
  else if (query.status === "IN_STOCK") filter.$expr = { $gt: ["$currentStock", "$minimumStock"] };
  if (query.search) {
    const search = new RegExp(escapedSearch(query.search), "i");
    filter.$or = [{ name: search }, { sku: search }];
  }
  const [products, total] = await Promise.all([
    Product.find(filter).sort({ name: 1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
    Product.countDocuments(filter),
  ]);
  return {
    data: products.map((product) => ({
      ...product,
      stockStatus: getStockStatus(product.currentStock, product.minimumStock),
      recommendedReorderQuantity: getRecommendedReorderQuantity(product.currentStock, product.targetStock),
    })),
    total,
  };
}

export async function listLowStock(query: PageQuery) {
  return listInventory({ ...query, status: "LOW_STOCK" });
}

export async function listTransactions(query: PageQuery & { productId?: string }) {
  const filter: Record<string, unknown> = {};
  if (query.productId) filter.productId = query.productId;
  if (query.search) filter.reason = new RegExp(escapedSearch(query.search), "i");
  const [data, total] = await Promise.all([
    InventoryTransaction.find(filter)
      .populate("productId", "name sku unit")
      .populate("performedBy", "name email")
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    InventoryTransaction.countDocuments(filter),
  ]);
  return { data, total };
}

export async function adjustInventory(
  input: { productId: string; quantityChange: number; reason: string },
  actorId: string,
) {
  const session = await mongoose.startSession();
  try {
    let transactionId = "";
    await session.withTransaction(async () => {
      const product = await Product.findOne({ _id: input.productId, isActive: true }).session(session);
      if (!product) throw new ApiError(404, "PRODUCT_NOT_FOUND", "Active product was not found");
      const newQuantity = product.currentStock + input.quantityChange;
      if (newQuantity < 0) throw new ApiError(409, "INSUFFICIENT_STOCK", "An adjustment cannot reduce stock below zero");

      const updated = await Product.updateOne(
        { _id: product._id, currentStock: product.currentStock },
        { $inc: { currentStock: input.quantityChange, __v: 1 } },
        { session },
      );
      if (updated.modifiedCount !== 1) {
        throw new ApiError(409, "STOCK_CHANGED", "Inventory changed during this adjustment; reload and try again");
      }

      const [transaction] = await InventoryTransaction.create([{
        productId: product._id,
        transactionType: "ADJUSTMENT",
        previousQuantity: product.currentStock,
        quantityChanged: input.quantityChange,
        newQuantity,
        reason: input.reason,
        performedBy: actorId,
      }], { session });
      transactionId = transaction.id;
    });
    return InventoryTransaction.findById(transactionId).populate("productId", "name sku unit").lean();
  } finally {
    await session.endSession();
  }
}
