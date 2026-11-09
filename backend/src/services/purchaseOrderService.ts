import mongoose, { type ClientSession } from "mongoose";
import Counter from "../models/Counter";
import GoodsReceipt from "../models/GoodsReceipt";
import InventoryTransaction from "../models/InventoryTransaction";
import Product from "../models/Product";
import ProductSupplier from "../models/ProductSupplier";
import PurchaseOrder from "../models/PurchaseOrder";
import Supplier from "../models/Supplier";
import type { OrderStatus, PageQuery, UserRole } from "../types";
import {
  assertOrderTransition,
  assertReceiptQuantities,
  calculateOrderTotals,
} from "./inventoryRules";
import { ApiError } from "../utils/ApiError";

type OrderInput = {
  supplierId: string;
  items: { productId: string; quantity: number }[];
  tax: number;
  additionalCharges: number;
  expectedDeliveryDate?: Date;
  notes: string;
};

function escapedSearch(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function nextNumber(name: string, prefix: string, session: ClientSession) {
  const counter = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { value: 1 } },
    { upsert: true, new: true, session },
  );
  return `${prefix}-${new Date().getFullYear()}-${String(counter.value).padStart(6, "0")}`;
}

async function orderItemsForSupplier(supplierId: string, items: OrderInput["items"]) {
  const supplier = await Supplier.findOne({ _id: supplierId, isActive: true });
  if (!supplier) throw new ApiError(400, "INVALID_SUPPLIER", "Choose an active supplier");

  const result = [];
  for (const item of items) {
    const product = await Product.findOne({ _id: item.productId, isActive: true });
    if (!product) throw new ApiError(400, "INVALID_PRODUCT", "Every ordered product must be active");
    const supplierProduct = await ProductSupplier.findOne({ supplierId, productId: product._id });
    if (!supplierProduct) {
      throw new ApiError(400, "SUPPLIER_PRODUCT_MISMATCH", `${product.name} is not available from this supplier`);
    }
    result.push({
      productId: product._id,
      productName: product.name,
      sku: product.sku,
      quantity: item.quantity,
      receivedQuantity: 0,
      unitCost: supplierProduct.unitCost,
    });
  }
  return { supplier, items: result };
}

export async function listPurchaseOrders(
  query: PageQuery & { status?: string; supplierId?: string; from?: Date; to?: Date },
) {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.supplierId) filter.supplierId = query.supplierId;
  if (query.search) filter.orderNumber = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  if (query.from || query.to) {
    filter.orderDate = {
      ...(query.from ? { $gte: query.from } : {}),
      ...(query.to ? { $lte: new Date(query.to.getTime() + 86_399_999) } : {}),
    };
  }
  const [data, total] = await Promise.all([
    PurchaseOrder.find(filter).populate("createdBy", "name email").sort({ orderDate: -1 })
      .skip((query.page - 1) * query.limit).limit(query.limit).lean(),
    PurchaseOrder.countDocuments(filter),
  ]);
  return { data, total };
}

export async function getPurchaseOrder(orderId: string) {
  const order = await PurchaseOrder.findById(orderId).populate("createdBy", "name email").lean();
  if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Purchase order was not found");
  return order;
}

export async function createPurchaseOrder(input: OrderInput, actorId: string) {
  const { supplier, items } = await orderItemsForSupplier(input.supplierId, input.items);
  const totals = calculateOrderTotals(items, input.tax, input.additionalCharges);
  const session = await mongoose.startSession();
  try {
    let orderId = "";
    await session.withTransaction(async () => {
      const orderNumber = await nextNumber("purchaseOrder", "PO", session);
      const [order] = await PurchaseOrder.create([{
        orderNumber,
        supplierId: supplier._id,
        supplierName: supplier.companyName,
        items,
        ...totals,
        tax: input.tax,
        additionalCharges: input.additionalCharges,
        status: "DRAFT",
        expectedDeliveryDate: input.expectedDeliveryDate,
        notes: input.notes,
        createdBy: actorId,
      }], { session });
      orderId = order.id;
    });
    return getPurchaseOrder(orderId);
  } finally {
    await session.endSession();
  }
}

export async function updateDraftPurchaseOrder(
  orderId: string,
  input: OrderInput,
  actor: { id: string; role: UserRole },
) {
  const order = await PurchaseOrder.findById(orderId);
  if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Purchase order was not found");
  if (order.status !== "DRAFT") throw new ApiError(409, "ORDER_NOT_DRAFT", "Only draft purchase orders can be edited");
  if (actor.role !== "Administrator" && order.createdBy.toString() !== actor.id) {
    throw new ApiError(403, "FORBIDDEN", "You can only edit purchase orders you created");
  }

  const { supplier, items } = await orderItemsForSupplier(input.supplierId, input.items);
  const totals = calculateOrderTotals(items, input.tax, input.additionalCharges);
  const result = await PurchaseOrder.updateOne(
    { _id: orderId, status: "DRAFT", __v: order.__v },
    { $set: {
      supplierId: supplier._id,
      supplierName: supplier.companyName,
      items,
      ...totals,
      tax: input.tax,
      additionalCharges: input.additionalCharges,
      expectedDeliveryDate: input.expectedDeliveryDate ?? null,
      notes: input.notes,
    }, $inc: { __v: 1 } },
    { runValidators: true },
  );
  if (result.modifiedCount !== 1) throw new ApiError(409, "ORDER_CHANGED", "Purchase order changed; reload and try again");
  return getPurchaseOrder(orderId);
}

export async function transitionPurchaseOrder(
  orderId: string,
  nextStatus: OrderStatus,
  actor: { id: string; role: UserRole },
) {
  const order = await PurchaseOrder.findById(orderId);
  if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Purchase order was not found");
  if (nextStatus === "APPROVED" || nextStatus === "ORDERED" || nextStatus === "CANCELLED") {
    if (actor.role !== "Administrator") {
      throw new ApiError(403, "FORBIDDEN", "Administrator access is required for this action");
    }
  }
  if (nextStatus === "PENDING" && actor.role !== "Administrator" && order.createdBy.toString() !== actor.id) {
    throw new ApiError(403, "FORBIDDEN", "You can only submit purchase orders you created");
  }
  assertOrderTransition(order.status, nextStatus);
  const updated = await PurchaseOrder.findOneAndUpdate(
    { _id: orderId, status: order.status, __v: order.__v },
    { $set: { status: nextStatus }, $inc: { __v: 1 } },
    { new: true, runValidators: true },
  );
  if (!updated) throw new ApiError(409, "ORDER_CHANGED", "Purchase order changed; reload and try again");
  return updated;
}

export async function listReceipts(query: PageQuery & { purchaseOrderId?: string }) {
  const filter: Record<string, unknown> = {};
  if (query.purchaseOrderId) filter.purchaseOrderId = query.purchaseOrderId;
  if (query.search) {
    const search = new RegExp(escapedSearch(query.search), "i");
    filter.$or = [{ receiptNumber: search }, { "items.productName": search }];
  }
  const [data, total] = await Promise.all([
    GoodsReceipt.find(filter).populate("supplierId", "name companyName").populate("receivedBy", "name email")
      .sort({ receivedAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
    GoodsReceipt.countDocuments(filter),
  ]);
  return { data, total };
}

export async function receivePurchaseOrder(
  orderId: string,
  input: { items: { productId: string; quantity: number }[]; notes: string },
  actorId: string,
  idempotencyKey: string,
) {
  const previousReceipt = await GoodsReceipt.findOne({ idempotencyKey }).lean();
  if (previousReceipt) {
    if (previousReceipt.purchaseOrderId.toString() !== orderId) {
      throw new ApiError(409, "IDEMPOTENCY_KEY_REUSED", "This receipt key was already used for another order");
    }
    return { receipt: previousReceipt, replayed: true };
  }

  const session = await mongoose.startSession();
  let receiptId = "";
  try {
    await session.withTransaction(async () => {
      const order = await PurchaseOrder.findById(orderId).session(session);
      if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Purchase order was not found");
      if (!["ORDERED", "PARTIALLY_RECEIVED"].includes(order.status)) {
        throw new ApiError(409, "ORDER_NOT_RECEIVABLE", "Only ordered, un-cancelled purchase orders can be received");
      }

      assertReceiptQuantities(order.items.map((item) => ({
        productId: item.productId.toString(),
        quantity: item.quantity,
        receivedQuantity: item.receivedQuantity,
      })), input.items);

      const updatedItems = order.items.map((item) => {
        const received = input.items.find((line) => line.productId === item.productId.toString());
        return {
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          receivedQuantity: item.receivedQuantity + (received?.quantity || 0),
          unitCost: item.unitCost,
        };
      });

      for (const receiptItem of input.items) {
        const orderItem = order.items.find((item) => item.productId.toString() === receiptItem.productId);
        if (!orderItem) throw new ApiError(400, "PRODUCT_NOT_ON_ORDER", "A receipt item is not on this purchase order");
        const product = await Product.findById(orderItem.productId).session(session);
        if (!product) throw new ApiError(409, "PRODUCT_NOT_FOUND", "A product on this order no longer exists");
        const updated = await Product.updateOne(
          { _id: product._id, currentStock: product.currentStock },
          {
            $inc: { currentStock: receiptItem.quantity, __v: 1 },
            $set: {
              averageCost: (
                product.currentStock * product.averageCost
                + receiptItem.quantity * orderItem.unitCost
              ) / (product.currentStock + receiptItem.quantity),
            },
          },
          { session },
        );
        if (updated.modifiedCount !== 1) throw new ApiError(409, "STOCK_CHANGED", "Inventory changed while receiving; retry the receipt");

        await InventoryTransaction.create([{
          productId: product._id,
          transactionType: "RECEIPT",
          previousQuantity: product.currentStock,
          quantityChanged: receiptItem.quantity,
          newQuantity: product.currentStock + receiptItem.quantity,
          reason: `Goods received · ${order.orderNumber}`,
          referenceId: order._id,
          performedBy: actorId,
        }], { session });
      }

      const fullyReceived = updatedItems.every((item) => item.receivedQuantity >= item.quantity);
      const updatedOrder = await PurchaseOrder.updateOne(
        { _id: order._id, status: order.status, __v: order.__v },
        { $set: { items: updatedItems, status: fullyReceived ? "RECEIVED" : "PARTIALLY_RECEIVED" }, $inc: { __v: 1 } },
        { session, runValidators: true },
      );
      if (updatedOrder.modifiedCount !== 1) throw new ApiError(409, "ORDER_CHANGED", "Purchase order changed while receiving; retry the receipt");

      const receiptNumber = await nextNumber("goodsReceipt", "GR", session);
      const [receipt] = await GoodsReceipt.create([{
        receiptNumber,
        purchaseOrderId: order._id,
        supplierId: order.supplierId,
        items: input.items.map((item) => ({
          productId: item.productId,
          productName: order.items.find((line) => line.productId.toString() === item.productId)!.productName,
          quantity: item.quantity,
        })),
        receivedBy: actorId,
        notes: input.notes,
        idempotencyKey,
      }], { session });
      receiptId = receipt.id;
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      const existing = await GoodsReceipt.findOne({ idempotencyKey }).lean();
      if (existing?.purchaseOrderId.toString() === orderId) return { receipt: existing, replayed: true };
      if (existing) throw new ApiError(409, "IDEMPOTENCY_KEY_REUSED", "This receipt key was already used for another order");
    }
    throw error;
  } finally {
    await session.endSession();
  }
  const receipt = await GoodsReceipt.findById(receiptId).lean();
  if (!receipt) throw new ApiError(500, "RECEIPT_CREATION_FAILED", "The receipt transaction completed without a receipt record");
  return { receipt, replayed: false };
}
