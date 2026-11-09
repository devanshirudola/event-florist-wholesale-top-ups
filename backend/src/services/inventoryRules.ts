import type { OrderStatus } from "../types";
import { ApiError } from "../utils/ApiError";

export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export function getStockStatus(currentStock: number, minimumStock: number): StockStatus {
  if (currentStock === 0) return "OUT_OF_STOCK";
  return currentStock <= minimumStock ? "LOW_STOCK" : "IN_STOCK";
}

export function getRecommendedReorderQuantity(currentStock: number, targetStock: number): number {
  return Math.max(0, targetStock - currentStock);
}

export function calculateOrderTotals(
  items: { quantity: number; unitCost: number }[],
  tax: number,
  additionalCharges: number,
) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  return { subtotal, totalAmount: subtotal + subtotal * tax / 100 + additionalCharges };
}

const transitions: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ["PENDING", "CANCELLED"],
  PENDING: ["APPROVED", "CANCELLED"],
  APPROVED: ["ORDERED", "CANCELLED"],
  ORDERED: ["PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"],
  PARTIALLY_RECEIVED: ["RECEIVED"],
  RECEIVED: [],
  CANCELLED: [],
};

export function assertOrderTransition(current: OrderStatus, next: OrderStatus): void {
  if (!transitions[current].includes(next)) {
    throw new ApiError(409, "INVALID_ORDER_TRANSITION", `Cannot change order status from ${current} to ${next}`);
  }
}

export function assertReceiptQuantities(
  orderItems: { productId: string; quantity: number; receivedQuantity: number }[],
  receiptItems: { productId: string; quantity: number }[],
): void {
  for (const receiptItem of receiptItems) {
    const orderItem = orderItems.find((item) => item.productId === receiptItem.productId);
    if (!orderItem) throw new ApiError(400, "PRODUCT_NOT_ON_ORDER", "A receipt item is not on this purchase order");
    if (receiptItem.quantity > orderItem.quantity - orderItem.receivedQuantity) {
      throw new ApiError(409, "OVER_RECEIPT", "A receipt quantity exceeds the outstanding order quantity");
    }
  }
}
