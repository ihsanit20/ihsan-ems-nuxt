// app/types/models/subject.ts
import type { BaseFilters } from "../common";

/**
 * Subject
 */
export type Subject = {
  id: number;
  grade_id: number;
  name: string;
  code: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

/**
 * Subject filters
 */
export type SubjectFilters = BaseFilters & {
  grade_id?: number;
  only_active?: boolean;
};
