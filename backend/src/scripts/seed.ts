import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database";
import { env } from "../config/env";
import Category from "../models/Category";
import InventoryTransaction from "../models/InventoryTransaction";
import Product from "../models/Product";
import ProductSupplier from "../models/ProductSupplier";
import Supplier from "../models/Supplier";
import User from "../models/User";

async function seed() {
  await connectDatabase();
  const adminEmail = env.ADMIN_EMAIL;
  const adminPassword = env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword || !env.ADMIN_NAME) {
    throw new Error("Set ADMIN_EMAIL, ADMIN_NAME, and ADMIN_PASSWORD before seeding");
  }
  const admin = await User.findOneAndUpdate(
    { email: adminEmail.toLowerCase() },
    { $setOnInsert: {
      email: adminEmail.toLowerCase(),
      name: env.ADMIN_NAME,
      role: "Administrator",
      passwordHash: await bcrypt.hash(adminPassword, 12),
    } },
    { upsert: true, new: true },
  );

  const categoryNames = ["Mechanics", "Foam & bases", "Tools", "Ribbon & wrap", "Accessories"];
  const categories = new Map<string, string>();
  for (const name of categoryNames) {
    const category = await Category.findOneAndUpdate(
      { name },
      { $setOnInsert: { name, description: `${name} floral supplies` } },
      { upsert: true, new: true },
    );
    categories.set(name, category.id);
  }

  const supplierSeeds = [
    { name: "Stem & Co. Wholesale", companyName: "Stem & Co. Wholesale", contactPerson: "Amelia Hart", email: "orders@stemandco.example", phone: "+1 (503) 555-0182", address: "", notes: "" },
    { name: "Verdant Supply House", companyName: "Verdant Supply House", contactPerson: "Miles Chen", email: "hello@verdantsupply.example", phone: "+1 (503) 555-0114", address: "", notes: "" },
    { name: "Petal & Prune Tools", companyName: "Petal & Prune Tools", contactPerson: "Sofia Bennett", email: "trade@petalandprune.example", phone: "+1 (541) 555-0191", address: "", notes: "" },
  ];
  const suppliers = new Map<string, string>();
  for (const details of supplierSeeds) {
    const supplier = await Supplier.findOneAndUpdate(
      { companyName: details.companyName },
      { $setOnInsert: details },
      { upsert: true, new: true },
    );
    suppliers.set(details.companyName, supplier.id);
  }

  const products = [
    { name: "Floral binding wire rolls", sku: "WIR-042", description: "Green paper-wrapped wire for securing stems and arrangements.", category: "Mechanics", unit: "roll", stock: 18, minimum: 12, target: 36, cost: 4.8, supplier: "Stem & Co. Wholesale" },
    { name: "Green wet floral foam bricks", sku: "FOA-118", description: "Water-absorbing foam bricks for fresh floral displays.", category: "Foam & bases", unit: "brick", stock: 6, minimum: 10, target: 40, cost: 2.25, supplier: "Verdant Supply House" },
    { name: "Branch pruning shears", sku: "TOO-205", description: "Precision bypass shears for clean stem and branch cuts.", category: "Tools", unit: "each", stock: 0, minimum: 4, target: 12, cost: 13.5, supplier: "Petal & Prune Tools" },
    { name: "Satin event ribbon spools", sku: "RIB-314", description: "Soft sage satin ribbon, 25 mm wide, for event finishing.", category: "Ribbon & wrap", unit: "spool", stock: 24, minimum: 8, target: 32, cost: 6.2, supplier: "Stem & Co. Wholesale" },
    { name: "Clear plastic water pick tubes", sku: "ACC-521", description: "Clear stem water picks with secure fitted caps.", category: "Accessories", unit: "pack of 25", stock: 3, minimum: 8, target: 24, cost: 5.4, supplier: "Verdant Supply House" },
  ];

  for (const details of products) {
    const product = await Product.findOneAndUpdate(
      { sku: details.sku },
      { $setOnInsert: {
        name: details.name,
        sku: details.sku,
        description: details.description,
        categoryId: categories.get(details.category),
        unit: details.unit,
        currentStock: details.stock,
        minimumStock: details.minimum,
        targetStock: details.target,
        averageCost: details.cost,
        preferredSupplierId: suppliers.get(details.supplier),
      } },
      { upsert: true, new: true },
    );
    const supplierId = suppliers.get(details.supplier)!;
    await ProductSupplier.findOneAndUpdate(
      { productId: product._id, supplierId },
      { $setOnInsert: { productId: product._id, supplierId, unitCost: details.cost, leadTimeDays: 5, isPreferred: true } },
      { upsert: true },
    );
    const openingStockExists = await InventoryTransaction.exists({
      productId: product._id,
      transactionType: "OPENING_STOCK",
    });
    if (details.stock > 0 && !openingStockExists) {
      await InventoryTransaction.create({
        productId: product._id,
        transactionType: "OPENING_STOCK",
        previousQuantity: 0,
        quantityChanged: details.stock,
        newQuantity: details.stock,
        reason: "Seeded opening stock",
        performedBy: admin._id,
      });
    }
  }

  console.info("Seed data is ready");
  await mongoose.disconnect();
}

void seed().catch(async (error: unknown) => {
  console.error("Failed to seed Event Florist data", error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
