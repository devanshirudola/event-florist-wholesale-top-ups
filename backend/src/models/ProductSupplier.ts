import { model, models, Schema } from "mongoose";

const productSupplierSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
  supplierSku: { type: String, trim: true, default: "" },
  unitCost: { type: Number, min: 0, required: true },
  leadTimeDays: { type: Number, min: 0, default: 0, required: true },
  isPreferred: { type: Boolean, default: false, required: true },
}, { timestamps: true });

productSupplierSchema.index({ productId: 1, supplierId: 1 }, { unique: true });
productSupplierSchema.index({ supplierId: 1, isPreferred: 1 });

export default models.ProductSupplier || model("ProductSupplier", productSupplierSchema);
