// app/types/common/pagination.ts

/**
 * Standard paginated response structure from API
 */
export type Paginated<T> = {
  data: T[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
};

/**
 * Pagination state for stores
 */
export type PaginationState = {
  page: number;
  per_page: number;
  total: number;
  last_page: number;
};
