import type { Request, Response } from "express";
import {
  purchaseOrderSchema,
  receiveSchema,
  reportQuerySchema,
} from "../validators/schemas";
import {
  createPurchaseOrder,
  getPurchaseOrder,
  listPurchaseOrders,
  listReceipts,
  receivePurchaseOrder,
  transitionPurchaseOrder,
  updateDraftPurchaseOrder,
} from "../services/purchaseOrderService";
import type { OrderStatus } from "../types";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { sendData, sendPage } from "../utils/response";
import { pathParam } from "../utils/pathParam";

export const getPurchaseOrders = asyncHandler(async (request: Request, response: Response) => {
  const query = request.pageQuery!;
  const filters = reportQuerySchema.parse({
    from: request.query.from,
    to: request.query.to,
    status: request.query.status,
    supplierId: request.query.supplierId,
  });
  const validStatuses: OrderStatus[] = ["DRAFT", "PENDING", "APPROVED", "ORDERED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"];
  if (filters.status && !validStatuses.includes(filters.status as OrderStatus)) {
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid purchase order status filter");
  }
  const result = await listPurchaseOrders({ ...query, ...filters });
  sendPage(response, result.data, query.page, query.limit, result.total);
});

export const getPurchaseOrderById = asyncHandler(async (request, response) => {
  sendData(response, await getPurchaseOrder(pathParam(request, "id")));
});

export const postPurchaseOrder = asyncHandler(async (request, response) => {
  const input = purchaseOrderSchema.parse(request.body);
  sendData(response, await createPurchaseOrder(input, request.authUser!.id), 201);
});

export const patchPurchaseOrder = asyncHandler(async (request, response) => {
  const input = purchaseOrderSchema.parse(request.body);
  sendData(response, await updateDraftPurchaseOrder(pathParam(request, "id"), input, request.authUser!));
});

function transitionTo(status: OrderStatus) {
  return asyncHandler(async (request, response) => {
    sendData(response, await transitionPurchaseOrder(pathParam(request, "id"), status, request.authUser!));
  });
}

export const submitPurchaseOrder = transitionTo("PENDING");
export const approvePurchaseOrder = transitionTo("APPROVED");
export const markPurchaseOrderOrdered = transitionTo("ORDERED");
export const cancelPurchaseOrder = transitionTo("CANCELLED");

export const getReceipts = asyncHandler(async (request: Request, response: Response) => {
  const query = request.pageQuery!;
  const result = await listReceipts({
    ...query,
    purchaseOrderId: request.query.purchaseOrderId ? String(request.query.purchaseOrderId) : undefined,
  });
  sendPage(response, result.data, query.page, query.limit, result.total);
});

export const postReceipt = asyncHandler(async (request: Request, response: Response) => {
  const input = receiveSchema.parse(request.body);
  const key = request.get("Idempotency-Key");
  if (!key || key.length < 8 || key.length > 128 || /\s/.test(key)) {
    throw new ApiError(400, "IDEMPOTENCY_KEY_REQUIRED", "Provide a unique Idempotency-Key header for this receipt");
  }
  const result = await receivePurchaseOrder(pathParam(request, "id"), input, request.authUser!.id, key);
  sendData(response, result, result.replayed ? 200 : 201);
});
