import type { Request, Response } from "express";
import InventoryTransaction from "../models/InventoryTransaction";
import Product from "../models/Product";
import PurchaseOrder from "../models/PurchaseOrder";
import Supplier from "../models/Supplier";
import {
  getRecommendedReorderQuantity,
  getStockStatus,
} from "../services/inventoryRules";
import { asyncHandler } from "../utils/asyncHandler";
import { sendData } from "../utils/response";

export const getDashboardSummary = asyncHandler(async (_request: Request, response: Response) => {
  const [activeProducts, activeSuppliers, lowStockCount, outOfStockCount, openOrders, inventoryValue, lowStockProducts] = await Promise.all([
    Product.countDocuments({ isActive: true }),
    Supplier.countDocuments({ isActive: true }),
    Product.countDocuments({ isActive: true, currentStock: { $gt: 0 }, $expr: { $lte: ["$currentStock", "$minimumStock"] } }),
    Product.countDocuments({ isActive: true, currentStock: 0 }),
    PurchaseOrder.countDocuments({ status: { $in: ["DRAFT", "PENDING", "APPROVED", "ORDERED", "PARTIALLY_RECEIVED"] } }),
    Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, value: { $sum: { $multiply: ["$currentStock", "$averageCost"] } } } },
    ]),
    Product.find({
      isActive: true,
      $or: [
        { currentStock: 0 },
        { $expr: { $lte: ["$currentStock", "$minimumStock"] } },
      ],
    }).populate("preferredSupplierId", "name companyName").sort({ currentStock: 1, name: 1 }).limit(10).lean(),
  ]);
  sendData(response, {
    activeProducts,
    activeSuppliers,
    inventoryValue: inventoryValue[0]?.value || 0,
    lowStockProducts: lowStockCount,
    outOfStockProducts: outOfStockCount,
    openPurchaseOrders: openOrders,
    replenishment: lowStockProducts.map((product) => ({
      ...product,
      stockStatus: getStockStatus(product.currentStock, product.minimumStock),
      recommendedReorderQuantity: getRecommendedReorderQuantity(product.currentStock, product.targetStock),
    })),
  });
});

export const getRecentActivities = asyncHandler(async (_request: Request, response: Response) => {
  const [inventory, orders] = await Promise.all([
    InventoryTransaction.find().populate("productId", "name sku unit").populate("performedBy", "name")
      .sort({ createdAt: -1 }).limit(10).lean(),
    PurchaseOrder.find().populate("supplierId", "name companyName").sort({ updatedAt: -1 }).limit(10).lean(),
  ]);
  sendData(response, { inventory, purchaseOrders: orders });
});
