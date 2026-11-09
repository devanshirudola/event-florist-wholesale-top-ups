export type UserRole = "Administrator" | "Staff";

export type OrderStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "ORDERED"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

export type InventoryTransactionType = "OPENING_STOCK" | "ADJUSTMENT" | "RECEIPT";

export interface PageQuery {
  page: number;
  limit: number;
  search: string;
}
