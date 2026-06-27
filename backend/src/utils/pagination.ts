import type { ParsedQs } from "qs";

export type PaginationInput = {
  page: number;
  pageSize: number;
  offset: number;
};

export type PaginatedResult<T> = {
  items: T;
  total: number;
  page: number;
  pageSize: number;
};

export function getPagination(query: ParsedQs): PaginationInput {
  const page = clampPositiveInt(query.page, 1, 1, 100000);
  const pageSize = clampPositiveInt(query.pageSize, 10, 1, 100);

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
  };
}

export function getStringFilter(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function getExactFilter(value: unknown, allValue = "Todos"): string {
  const clean = getStringFilter(value);
  return clean && clean !== allValue && clean !== "Todas" ? clean : "";
}

function clampPositiveInt(
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  const raw = typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(raw)) return fallback;
  return Math.min(Math.max(raw, min), max);
}
