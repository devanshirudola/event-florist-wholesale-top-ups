import mongoose from "mongoose";
import Category from "../models/Category";
import Counter from "../models/Counter";
import GoodsReceipt from "../models/GoodsReceipt";
import InventoryTransaction from "../models/InventoryTransaction";
import Product from "../models/Product";
import ProductSupplier from "../models/ProductSupplier";
import PurchaseOrder from "../models/PurchaseOrder";
import Supplier from "../models/Supplier";
import User from "../models/User";
import { env } from "./env";

export async function connectDatabase(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI, {
    autoIndex: false,
    serverSelectionTimeoutMS: 10_000,
  });
  await Promise.all([
    User.createIndexes(),
    Category.createIndexes(),
    Supplier.createIndexes(),
    Product.createIndexes(),
    ProductSupplier.createIndexes(),
    PurchaseOrder.createIndexes(),
    InventoryTransaction.createIndexes(),
    GoodsReceipt.createIndexes(),
    Counter.createIndexes(),
  ]);
}
