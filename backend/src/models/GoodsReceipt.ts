import { model, models, Schema, type Model, type Types } from "mongoose";

export interface ReceiptItem {
  productId: Types.ObjectId;
  productName: string;
  quantity: number;
}

export interface GoodsReceiptFields {
  receiptNumber: string;
  purchaseOrderId: Types.ObjectId;
  supplierId: Types.ObjectId;
  items: ReceiptItem[];
  receivedBy: Types.ObjectId;
  receivedAt: Date;
  notes: string;
  idempotencyKey: string;
}

const receiptItemSchema = new Schema<ReceiptItem>({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, min: 1, required: true },
}, { _id: false });

const goodsReceiptSchema = new Schema<GoodsReceiptFields>({
  receiptNumber: { type: String, required: true, unique: true, index: true },
  purchaseOrderId: { type: Schema.Types.ObjectId, ref: "PurchaseOrder", required: true, index: true },
  supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
  items: { type: [receiptItemSchema], required: true },
  receivedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  receivedAt: { type: Date, required: true, default: Date.now },
  notes: { type: String, trim: true, default: "" },
  idempotencyKey: { type: String, required: true, unique: true },
}, { timestamps: true });

export default (models.GoodsReceipt as Model<GoodsReceiptFields> | undefined)
  || model<GoodsReceiptFields>("GoodsReceipt", goodsReceiptSchema);
