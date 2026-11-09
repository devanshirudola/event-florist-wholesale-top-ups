import { model, models, Schema } from "mongoose";

const supplierSchema = new Schema({
  name: { type: String, required: true, trim: true },
  companyName: { type: String, required: true, trim: true },
  contactPerson: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true, default: "" },
  address: { type: String, trim: true, default: "" },
  notes: { type: String, trim: true, default: "" },
  isActive: { type: Boolean, default: true, required: true },
}, { timestamps: true });

supplierSchema.index({ name: 1, companyName: 1 });

export default models.Supplier || model("Supplier", supplierSchema);
