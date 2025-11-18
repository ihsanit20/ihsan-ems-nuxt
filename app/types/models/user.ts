// app/types/models/user.ts
import type { BaseFilters, SortableFilters } from "../common";

/**
 * User model
 */
export type User = {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  role?: string | null;
  photo?: string | null; // stored path
  photo_url?: string | null; // accessor URL
  created_at?: string;
  updated_at?: string;
};

/**
 * Auth user (minimal info for authentication)
 */
export type AuthUser = {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  role?: string | null;
  photo?: string | null;
};

/**
 * User filters
 */
export type UserFilters = SortableFilters & {
  role?: string | null;
  sort_by?: "id" | "name" | "email" | "phone" | "role" | "created_at";
};
