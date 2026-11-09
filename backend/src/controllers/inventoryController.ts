import type { Request, Response } from "express";
import { inventoryAdjustmentSchema } from "../validators/schemas";
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
  const status = request.query.status ? String(request.query.status) : undefined;
  if (status && !["LOW_STOCK", "OUT_OF_STOCK", "IN_STOCK"].includes(status)) {
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid inventory status filter");
  }
  const result = await listInventory({ ...query, status });
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
