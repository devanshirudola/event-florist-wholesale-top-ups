import { model, models, Schema } from "mongoose";

const categorySchema = new Schema({
  name: { type: String, required: true, trim: true, unique: true },
  description: { type: String, trim: true, default: "" },
  isActive: { type: Boolean, default: true, required: true },
}, { timestamps: true });

export default models.Category || model("Category", categorySchema);
