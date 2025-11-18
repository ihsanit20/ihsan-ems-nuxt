// app/types/models/section.ts
import type { BaseFilters } from "../common";

/**
 * Section
 */
export type Section = {
  id: number;
  session_grade_id: number;
  name: string;
  code?: string | null;
  capacity?: number | null;
  class_teacher_id?: number | null;
  sort_order?: number | null;
  created_at?: string;
  updated_at?: string;

  class_teacher?: { id: number; name: string } | null;
};

/**
 * Section filters
 */
export type SectionFilters = BaseFilters & {
  session_grade_id?: number;
};
