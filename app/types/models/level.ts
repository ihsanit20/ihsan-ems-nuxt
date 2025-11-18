// app/types/models/level.ts
import type { ActiveFilters } from "../common";

/**
 * Level (e.g., Primary, Secondary)
 */
export type Level = {
  id: number;
  name: string;
  code?: string | null;
  sort_order?: number | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

/**
 * Level filters
 */
export type LevelFilters = ActiveFilters;
