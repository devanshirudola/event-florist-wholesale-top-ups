import { model, models, Schema } from "mongoose";

const counterSchema = new Schema({
  _id: { type: String, required: true },
  value: { type: Number, default: 0, required: true },
});

export default models.Counter || model("Counter", counterSchema);
