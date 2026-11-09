import { model, models, Schema, type Model, type Types } from "mongoose";

export interface ProductFields {
  name: string;
  sku: string;
  description: string;
  categoryId: Types.ObjectId;
  imageUrl: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  targetStock: number;
  averageCost: number;
  sellingPrice?: number;
  preferredSupplierId?: Types.ObjectId | null;
  isActive: boolean;
}

const productSchema = new Schema<ProductFields>({
  name: { type: String, required: true, trim: true },
  sku: { type: String, required: true, trim: true, uppercase: true, unique: true, index: true },
  description: { type: String, trim: true, default: "" },
  categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
  imageUrl: { type: String, trim: true, default: "" },
  unit: { type: String, required: true, trim: true },
  currentStock: { type: Number, required: true, min: 0, default: 0 },
  minimumStock: { type: Number, required: true, min: 0, default: 0 },
  targetStock: { type: Number, required: true, min: 0, default: 0 },
  averageCost: { type: Number, required: true, min: 0, default: 0 },
  sellingPrice: { type: Number, min: 0 },
  preferredSupplierId: { type: Schema.Types.ObjectId, ref: "Supplier" },
  isActive: { type: Boolean, default: true, required: true },
}, { timestamps: true });

productSchema.index({ isActive: 1, name: 1 });
productSchema.index({ isActive: 1, currentStock: 1, minimumStock: 1 });
productSchema.index({ categoryId: 1, isActive: 1 });

export default (models.Product as Model<ProductFields> | undefined)
  || model<ProductFields>("Product", productSchema);
