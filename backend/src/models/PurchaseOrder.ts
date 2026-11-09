import { model, models, Schema, type Model, type Types } from "mongoose";
import type { OrderStatus } from "../types";

export interface PurchaseOrderItem {
  productId: Types.ObjectId;
  productName: string;
  sku: string;
  quantity: number;
  receivedQuantity: number;
  unitCost: number;
}

export interface PurchaseOrderFields {
  orderNumber: string;
  supplierId: Types.ObjectId;
  supplierName: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  additionalCharges: number;
  totalAmount: number;
  status: OrderStatus;
  orderDate: Date;
  expectedDeliveryDate?: Date;
  notes: string;
  createdBy: Types.ObjectId;
}

const orderItemSchema = new Schema<PurchaseOrderItem>({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, min: 1, required: true },
  receivedQuantity: { type: Number, min: 0, default: 0, required: true },
  unitCost: { type: Number, min: 0, required: true },
}, { _id: false });

const purchaseOrderSchema = new Schema<PurchaseOrderFields>({
  orderNumber: { type: String, required: true, unique: true, index: true },
  supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
  supplierName: { type: String, required: true },
  items: { type: [orderItemSchema], validate: [(items: unknown[]) => items.length > 0, "At least one order item is required"] },
  subtotal: { type: Number, min: 0, required: true },
  tax: { type: Number, min: 0, default: 0, required: true },
  additionalCharges: { type: Number, min: 0, default: 0, required: true },
  totalAmount: { type: Number, min: 0, required: true },
  status: { type: String, enum: ["DRAFT", "PENDING", "APPROVED", "ORDERED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"] satisfies OrderStatus[], default: "DRAFT", required: true },
  orderDate: { type: Date, required: true, default: Date.now },
  expectedDeliveryDate: { type: Date },
  notes: { type: String, trim: true, default: "" },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

purchaseOrderSchema.index({ supplierId:  1, status: 1, orderDate: -1 });

export default (models.PurchaseOrder as Model<PurchaseOrderFields> | undefined)
  || model<PurchaseOrderFields>("PurchaseOrder", purchaseOrderSchema);
