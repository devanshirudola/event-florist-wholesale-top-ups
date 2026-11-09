import { describe, expect, it } from "vitest";
import { ApiError } from "../utils/ApiError";
import {
  assertOrderTransition,
  assertReceiptQuantities,
  calculateOrderTotals,
  getRecommendedReorderQuantity,
  getStockStatus,
} from "./inventoryRules";

describe("inventory business rules", () => {
  it("distinguishes out-of-stock and low-stock boundaries", () => {
    expect(getStockStatus(0, 5)).toBe("OUT_OF_STOCK");
    expect(getStockStatus(5, 5)).toBe("LOW_STOCK");
    expect(getStockStatus(6, 5)).toBe("IN_STOCK");
  });

  it("never recommends a negative replenishment quantity", () => {
    expect(getRecommendedReorderQuantity(3, 10)).toBe(7);
    expect(getRecommendedReorderQuantity(12, 10)).toBe(0);
  });

  it("calculates order totals from backend line costs", () => {
    expect(calculateOrderTotals([
      { quantity: 2, unitCost: 5 },
      { quantity: 3, unitCost: 4 },
    ], 10, 2)).toEqual({ subtotal: 22, totalAmount: 26.2 });
  });

  it("allows only valid order lifecycle transitions", () => {
    expect(() => assertOrderTransition("DRAFT", "PENDING")).not.toThrow();
    expect(() => assertOrderTransition("RECEIVED", "ORDERED")).toThrow(ApiError);
  });

  it("blocks receipts larger than the outstanding order quantity", () => {
    const orderItems = [{ productId: "product-1", quantity: 8, receivedQuantity: 3 }];
    expect(() => assertReceiptQuantities(orderItems, [{ productId: "product-1", quantity: 5 }])).not.toThrow();
    expect(() => assertReceiptQuantities(orderItems, [{ productId: "product-1", quantity: 6 }])).toThrow(ApiError);
    expect(() => assertReceiptQuantities(orderItems, [{ productId: "product-2", quantity: 1 }])).toThrow(ApiError);
  });
});
