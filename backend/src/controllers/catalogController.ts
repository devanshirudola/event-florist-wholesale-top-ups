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
  PRODUCT_STATUSES,
  supplierSchema,
  supplierUpdateSchema,
} from "../validators/schemas";
import { asyncHandler } from "../utils/asyncHandler";
import { sendData, sendPage } from "../utils/response";
import { ApiError } from "../utils/ApiError";
import { pathParam } from "../utils/pathParam";

export const getProducts = asyncHandler(async (request: Request, response: Response) => {
  const query = request.pageQuery!;
  // Query values are normalised with String() so repeated parameters
  // (?active=true&active=true) cannot slip past validation as arrays.
  const status = request.query.status === undefined ? undefined : String(request.query.status);
  if (status && !(PRODUCT_STATUSES as readonly string[]).includes(status)) {
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid product status filter");
  }
  const activeParam = request.query.active === undefined ? undefined : String(request.query.active);
  if (activeParam !== undefined && activeParam !== "" && !["true", "false"].includes(activeParam)) {
    throw new ApiError(400, "VALIDATION_ERROR", "The active filter must be true or false");
  }
  const result = await listProducts({
    ...query,
    status: status || undefined,
    categoryId: request.query.categoryId ? String(request.query.categoryId) : undefined,
    active: activeParam === undefined || activeParam === "" ? true : activeParam === "true",
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
  sendData(response, await updateSupplier(pathParam(request, "id"), supplierUpdateSchema.parse(request.body)));
});

export const deleteSupplier = asyncHandler(async (request, response) => {
  sendData(response, await archiveSupplier(pathParam(request, "id")));
});
