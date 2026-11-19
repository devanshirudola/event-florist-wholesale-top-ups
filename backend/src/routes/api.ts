import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, logout, me } from "../controllers/authController";
import {
  deleteCategory,
  deleteProduct,
  deleteSupplier,
  getCategories,
  getProductById,
  getProducts,
  getSupplierById,
  getSuppliers,
  patchCategory,
  patchProduct,
  patchSupplier,
  postCategory,
  postProduct,
  postSupplier,
} from "../controllers/catalogController";
import { getDashboardSummary, getRecentActivities } from "../controllers/dashboardController";
import {
  getInventory,
  getInventoryTransactions,
  getLowStock,
  postInventoryAdjustment,
} from "../controllers/inventoryController";
import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  getPurchaseOrderById,
  getPurchaseOrders,
  getReceipts,
  markPurchaseOrderOrdered,
  patchPurchaseOrder,
  postPurchaseOrder,
  postReceipt,
  submitPurchaseOrder,
} from "../controllers/purchaseOrderController";
import {
  getInventoryReport,
  getPurchaseReport,
  getSupplierReport,
} from "../controllers/reportController";
import { createUser, listUsers } from "../controllers/userController";
import { requireAuth, requireRole } from "../middleware/auth";
import { parsePageQuery } from "../middleware/pagination";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_request, response) => {
    response.status(429).json({
      success: false,
      error: { code: "LOGIN_RATE_LIMITED", message: "Too many sign-in attempts. Try again later." },
    });
  },
});

router.post("/auth/login", loginLimiter, login);
router.use(requireAuth);
router.post("/auth/logout", logout);
router.get("/auth/me", me);

router.get("/users", requireRole("Administrator"), parsePageQuery, listUsers);
router.post("/users", requireRole("Administrator"), createUser);

router.get("/categories", parsePageQuery, getCategories);
router.post("/categories", requireRole("Administrator"), postCategory);
router.patch("/categories/:id", requireRole("Administrator"), patchCategory);
router.delete("/categories/:id", requireRole("Administrator"), deleteCategory);

router.get("/products", parsePageQuery, getProducts);
router.post("/products", requireRole("Administrator"), postProduct);
router.get("/products/:id", getProductById);
router.patch("/products/:id", requireRole("Administrator"), patchProduct);
router.delete("/products/:id", requireRole("Administrator"), deleteProduct);

router.get("/suppliers", parsePageQuery, getSuppliers);
router.post("/suppliers", requireRole("Administrator"), postSupplier);
router.get("/suppliers/:id", getSupplierById);
router.patch("/suppliers/:id", requireRole("Administrator"), patchSupplier);
router.delete("/suppliers/:id", requireRole("Administrator"), deleteSupplier);

router.get("/inventory/low-stock", parsePageQuery, getLowStock);
router.get("/inventory/transactions", parsePageQuery, getInventoryTransactions);
router.get("/inventory", parsePageQuery, getInventory);
router.post("/inventory/adjustments", requireRole("Administrator", "Staff"), postInventoryAdjustment);

router.get("/purchase-orders", parsePageQuery, getPurchaseOrders);
router.post("/purchase-orders", postPurchaseOrder);
router.get("/purchase-orders/:id", getPurchaseOrderById);
router.patch("/purchase-orders/:id", patchPurchaseOrder);
router.post("/purchase-orders/:id/submit", submitPurchaseOrder);
router.post("/purchase-orders/:id/approve", requireRole("Administrator"), approvePurchaseOrder);
router.post("/purchase-orders/:id/order", requireRole("Administrator"), markPurchaseOrderOrdered);
router.post("/purchase-orders/:id/cancel", requireRole("Administrator"), cancelPurchaseOrder);

router.get("/receipts", parsePageQuery, getReceipts);
router.post("/purchase-orders/:id/receive", requireRole("Administrator", "Staff"), postReceipt);

router.get("/dashboard/summary", getDashboardSummary);
router.get("/dashboard/recent-activities", getRecentActivities);
router.get("/reports/inventory", parsePageQuery, getInventoryReport);
router.get("/reports/purchases", parsePageQuery, getPurchaseReport);
router.get("/reports/suppliers", parsePageQuery, getSupplierReport);

export default router;
