import type { Response } from "express";

export function sendData<T>(response: Response, data: T, status = 200): void {
  response.status(status).json({ success: true, data });
}

export function sendPage<T>(
  response: Response,
  data: T[],
  page: number,
  limit: number,
  total: number,
): void {
  response.status(200).json({
    success: true,
    data,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
