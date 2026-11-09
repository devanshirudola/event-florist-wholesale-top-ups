import type { Request, Response } from "express";
import PurchaseOrder from "../models/PurchaseOrder";
import Supplier from "../models/Supplier";
import { listInventory } from "../services/inventoryService";
import { asyncHandler } from "../utils/asyncHandler";
import { sendData, sendPage } from "../utils/response";
import { reportQuerySchema } from "../validators/schemas";

export const getInventoryReport = asyncHandler(async (request: Request, response: Response) => {
  const query = request.pageQuery!;
  const result = await listInventory({ ...query });
  sendPage(response, result.data.map((product) => ({
    product,
    inventoryValue: product.currentStock * product.averageCost,
  })), query.page, query.limit, result.total);
});

export const getPurchaseReport = asyncHandler(async (request: Request, response: Response) => {
  const query = request.pageQuery!;
  const filters = reportQuerySchema.parse({
    from: request.query.from,
    to: request.query.to,
    status: request.query.status,
    supplierId: request.query.supplierId,
  });
  const match: Record<string, unknown> = {};
  if (filters.status) match.status = filters.status;
  if (filters.supplierId) match.supplierId = filters.supplierId;
  if (filters.from || filters.to) {
    match.orderDate = {
      ...(filters.from ? { $gte: filters.from } : {}),
      ...(filters.to ? { $lte: new Date(filters.to.getTime() + 86_399_999) } : {}),
    };
  }
  const [data, total] = await Promise.all([
    PurchaseOrder.find(match).sort({ orderDate: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
    PurchaseOrder.countDocuments(match),
  ]);
  sendPage(response, data, query.page, query.limit, total);
});

export const getSupplierReport = asyncHandler(async (request: Request, response: Response) => {
  const query = request.pageQuery!;
  const filters = reportQuerySchema.parse({
    from: request.query.from,
    to: request.query.to,
  });
  const match: Record<string, unknown> = {};
  if (filters.from || filters.to) {
    match.orderDate = {
      ...(filters.from ? { $gte: filters.from } : {}),
      ...(filters.to ? { $lte: new Date(filters.to.getTime() + 86_399_999) } : {}),
    };
  }

  const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const search = query.search ? {
    $or: [
      { name: new RegExp(escaped, "i") },
      { companyName: new RegExp(escaped, "i") },
      { email: new RegExp(escaped, "i") },
    ],
  } : {};
  const [data, total] = await Promise.all([
    Supplier.aggregate([
      { $match: search },
      {
        $lookup: {
          from: PurchaseOrder.collection.name,
          let: { supplierId: "$_id" },
          pipeline: [
            { $match: { ...match, $expr: { $eq: ["$supplierId", "$$supplierId"] } } },
            { $group: { _id: null, orderCount: { $sum: 1 }, purchasingValue: { $sum: "$totalAmount" } } },
          ],
          as: "purchasing",
        },
      },
      { $set: { orderCount: { $ifNull: [{ $first: "$purchasing.orderCount" }, 0] }, purchasingValue: { $ifNull: [{ $first: "$purchasing.purchasingValue" }, 0] } } },
      { $unset: "purchasing" },
      { $sort: { companyName: 1 } },
      { $skip: (query.page - 1) * query.limit },
      { $limit: query.limit },
    ]),
    Supplier.countDocuments(search),
  ]);
  sendPage(response, data, query.page, query.limit, total);
});

export const getPurchasesOverview = asyncHandler(async (_request: Request, response: Response) => {
  const [result] = await PurchaseOrder.aggregate([
    { $group: { _id: null, orderCount: { $sum: 1 }, purchasingValue: { $sum: "$totalAmount" } } },
  ]);
  sendData(response, { orderCount: result?.orderCount || 0, purchasingValue: result?.purchasingValue || 0 });
});
