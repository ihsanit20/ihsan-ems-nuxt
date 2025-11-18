// app/types/common/filters.ts

/**
 * Base filter interface for list queries
 */
export type BaseFilters = {
  q?: string;
  page?: number;
  per_page?: number;
};

/**
 * Sort direction
 */
export type SortDirection = "asc" | "desc";

/**
 * Common filter with sorting
 */
export type SortableFilters = BaseFilters & {
  sort_by?: string;
  sort_dir?: SortDirection;
};

/**
 * Common filter with active status
 */
export type ActiveFilters = BaseFilters & {
  is_active?: boolean | null;
};
