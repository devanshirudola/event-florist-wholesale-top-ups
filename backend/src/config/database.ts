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

let databaseConnection: Promise<void> | undefined;

async function ensureIndexes() {
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

// The connection is memoised so a warm serverless instance (or a long-running
// server) opens a single pool instead of one per request. A failed attempt is
// forgotten so the next request can retry.
export function connectDatabase(): Promise<void> {
  if (!databaseConnection) {
    databaseConnection = (async () => {
      await mongoose.connect(env.MONGODB_URI, {
        autoIndex: false,
        serverSelectionTimeoutMS: 10_000,
      });
      await ensureIndexes();
    })().catch((error: unknown) => {
      databaseConnection = undefined;
      throw error;
    });
  }
  return databaseConnection;
}

export async function disconnectDatabase(): Promise<void> {
  databaseConnection = undefined;
  await mongoose.disconnect();
}
