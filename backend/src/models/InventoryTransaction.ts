import { model, models, Schema } from "mongoose";
import type { InventoryTransactionType } from "../types";

const inventoryTransactionSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  transactionType: { type: String, enum: ["OPENING_STOCK", "ADJUSTMENT", "RECEIPT"] satisfies InventoryTransactionType[], required: true },
  previousQuantity: { type: Number, min: 0, required: true },
  quantityChanged: { type: Number, required: true },
  newQuantity: { type: Number, min: 0, required: true },
  reason: { type: String, required: true, trim: true },
  referenceId: { type: Schema.Types.ObjectId },
  performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

inventoryTransactionSchema.index({ createdAt: -1 });
inventoryTransactionSchema.index({ productId: 1, createdAt: -1 });

export default models.InventoryTransaction || model("InventoryTransaction", inventoryTransactionSchema);
