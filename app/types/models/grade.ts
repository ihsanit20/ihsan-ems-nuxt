// app/types/models/grade.ts
import type { ActiveFilters } from "../common";
import type { Level } from "./level";

/**
 * Grade (e.g., Class 1, Class 2)
 */
export type Grade = {
  id: number;
  level_id: number;
  name: string;
  code?: string | null;
  sort_order?: number | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;

  // optional embed if ?with=level
  level?: Level | null;
};

/**
 * Grade filters
 */
export type GradeFilters = ActiveFilters & {
  level_id?: number;
};
