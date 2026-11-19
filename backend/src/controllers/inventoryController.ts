import type { Request, Response } from "express";
import { inventoryAdjustmentSchema, PRODUCT_STATUSES } from "../validators/schemas";
import {
  adjustInventory,
  listInventory,
  listLowStock,
  listTransactions,
} from "../services/inventoryService";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { sendData, sendPage } from "../utils/response";

export const getInventory = asyncHandler(async (request: Request, response: Response) => {
  const query = request.pageQuery!;
  const status = request.query.status === undefined ? undefined : String(request.query.status);
  if (status && !(PRODUCT_STATUSES as readonly string[]).includes(status)) {
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid inventory status filter");
  }
  const result = await listInventory({ ...query, status: status || undefined });
  sendPage(response, result.data, query.page, query.limit, result.total);
});

export const getLowStock = asyncHandler(async (request: Request, response: Response) => {
  const query = request.pageQuery!;
  const result = await listLowStock(query);
  sendPage(response, result.data, query.page, query.limit, result.total);
});

export const getInventoryTransactions = asyncHandler(async (request: Request, response: Response) => {
  const query = request.pageQuery!;
  const result = await listTransactions({
    ...query,
    productId: request.query.productId ? String(request.query.productId) : undefined,
  });
  sendPage(response, result.data, query.page, query.limit, result.total);
});

export const postInventoryAdjustment = asyncHandler(async (request: Request, response: Response) => {
  const input = inventoryAdjustmentSchema.parse(request.body);
  sendData(response, await adjustInventory(input, request.authUser!.id), 201);
});
