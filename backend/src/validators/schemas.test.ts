import { describe, expect, it } from "vitest";
import {
  categoryUpdateSchema,
  productSchema,
  productUpdateSchema,
  purchaseOrderSchema,
  reportQuerySchema,
  supplierUpdateSchema,
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

  it("rejects unknown fields on product creation", () => {
    const result = productSchema.safeParse({
      name: "Floral wire",
      sku: "WIR-001",
      categoryId: "507f1f77bcf86cd799439011",
      unit: "roll",
      averageCost: 4.5,
      unexpectedField: "nope",
    });
    expect(result.success).toBe(false);
  });

  it("keeps product edits partial so stock thresholds are never reset", () => {
    const parsed = productUpdateSchema.parse({ sellingPrice: 12.5 });
    expect(parsed).toEqual({ sellingPrice: 12.5 });
    expect(parsed).not.toHaveProperty("minimumStock");
    expect(parsed).not.toHaveProperty("targetStock");
    expect(parsed).not.toHaveProperty("description");
    expect(parsed).not.toHaveProperty("imageUrl");
    expect(parsed).not.toHaveProperty("suppliers");
  });

  it("keeps category edits partial so descriptions survive", () => {
    expect(categoryUpdateSchema.parse({ name: "Foam" })).toEqual({ name: "Foam" });
  });

  it("keeps supplier edits partial so contact details survive", () => {
    expect(supplierUpdateSchema.parse({ name: "New name" })).toEqual({ name: "New name" });
  });

  it("accepts a full product update payload", () => {
    const result = productUpdateSchema.safeParse({
      name: "Floral wire",
      sku: "WIR-001",
      description: "Green paper-wrapped wire",
      categoryId: "507f1f77bcf86cd799439011",
      imageUrl: "",
      unit: "roll",
      minimumStock: 4,
      targetStock: 20,
      averageCost: 4.5,
      suppliers: [{
        supplierId: "507f1f77bcf86cd799439012",
        supplierSku: "SUP-1",
        unitCost: 4.2,
        leadTimeDays: 5,
        isPreferred: true,
      }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown purchase-order status filters", () => {
    expect(reportQuerySchema.safeParse({ status: "APPROVEDX" }).success).toBe(false);
    expect(reportQuerySchema.safeParse({ status: "PARTIALLY_RECEIVED" }).success).toBe(true);
  });

  it("rejects report ranges where the start follows the end", () => {
    expect(reportQuerySchema.safeParse({ from: "2026-05-10", to: "2026-05-01" }).success).toBe(false);
  });
});
