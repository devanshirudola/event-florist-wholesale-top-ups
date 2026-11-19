import type { Request, Response } from "express";
import {
  archiveCategory,
  archiveProduct,
  archiveSupplier,
  createCategory,
  createProduct,
  createSupplier,
  getProduct,
  getSupplier,
  listCategories,
  listProducts,
  listSuppliers,
  updateCategory,
  updateProduct,
  updateSupplier,
} from "../services/catalogService";
import {
  categorySchema,
  categoryUpdateSchema,
  productSchema,
  productUpdateSchema,
  supplierSchema,
} from "../validators/schemas";
import { asyncHandler } from "../utils/asyncHandler";
import { sendData, sendPage } from "../utils/response";
import { ApiError } from "../utils/ApiError";
import { pathParam } from "../utils/pathParam";

export const getProducts = asyncHandler(async (request: Request, response: Response) => {
  const query = request.pageQuery!;
  const status = request.query.status;
  if (status !== undefined && !["LOW_STOCK", "OUT_OF_STOCK", "IN_STOCK"].includes(String(status))) {
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid product status filter");
  }
  const active = request.query.active === undefined ? true : request.query.active === "true";
  if (request.query.active !== undefined && !["true", "false"].includes(String(request.query.active))) {
    throw new ApiError(400, "VALIDATION_ERROR", "The active filter must be true or false");
  }
  const result = await listProducts({
    ...query,
    status: status === undefined ? undefined : String(status),
    categoryId: request.query.categoryId ? String(request.query.categoryId) : undefined,
    active,
  });
  sendPage(response, result.data, query.page, query.limit, result.total);
});

export const getProductById = asyncHandler(async (request, response) => {
  sendData(response, await getProduct(pathParam(request, "id")));
});

export const postProduct = asyncHandler(async (request, response) => {
  const input = productSchema.parse(request.body);
  sendData(response, await createProduct(input, request.authUser!.id), 201);
});

export const patchProduct = asyncHandler(async (request, response) => {
  const input = productUpdateSchema.parse(request.body);
  sendData(response, await updateProduct(pathParam(request, "id"), input));
});

export const deleteProduct = asyncHandler(async (request, response) => {
  sendData(response, await archiveProduct(pathParam(request, "id")));
});

export const getCategories = asyncHandler(async (request: Request, response: Response) => {
  const query = request.pageQuery!;
  const result = await listCategories(query);
  sendPage(response, result.data, query.page, query.limit, result.total);
});

export const postCategory = asyncHandler(async (request, response) => {
  const input = categorySchema.parse(request.body);
  sendData(response, await createCategory(input), 201);
});

export const patchCategory = asyncHandler(async (request, response) => {
  sendData(response, await updateCategory(pathParam(request, "id"), categoryUpdateSchema.parse(request.body)));
});

export const deleteCategory = asyncHandler(async (request, response) => {
  sendData(response, await archiveCategory(pathParam(request, "id")));
});

export const getSuppliers = asyncHandler(async (request: Request, response: Response) => {
  const query = request.pageQuery!;
  const result = await listSuppliers(query);
  sendPage(response, result.data, query.page, query.limit, result.total);
});

export const getSupplierById = asyncHandler(async (request, response) => {
  sendData(response, await getSupplier(pathParam(request, "id")));
});

export const postSupplier = asyncHandler(async (request, response) => {
  sendData(response, await createSupplier(supplierSchema.parse(request.body)), 201);
});

export const patchSupplier = asyncHandler(async (request, response) => {
  sendData(response, await updateSupplier(pathParam(request, "id"), supplierSchema.partial().parse(request.body)));
});

export const deleteSupplier = asyncHandler(async (request, response) => {
  sendData(response, await archiveSupplier(pathParam(request, "id")));
});
