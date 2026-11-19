import { describe, expect, it } from "vitest";
import {
  productUpdateSchema,
  purchaseOrderSchema,
} from "./schemas";

describe("API request validation", () => {
  it("rejects stock changes sent through product edits", () => {
    expect(productUpdateSchema.safeParse({ name: "Updated name", currentStock: 500 }).success).toBe(false);
  });

  it("rejects client-supplied purchase-order prices and totals", () => {
    const result = purchaseOrderSchema.safeParse({
      supplierId: "507f1f77bcf86cd799439011",
      items: [{
        productId: "507f1f77bcf86cd799439012",
        quantity: 5,
        unitCost: 0.01,
      }],
      subtotal: 0.05,
      totalAmount: 0.05,
    });
    expect(result.success).toBe(false);
  });
});
