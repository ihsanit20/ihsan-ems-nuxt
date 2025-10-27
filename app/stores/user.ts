// app/stores/user.ts
import { defineStore } from "pinia";

/** Basic User shape (matches your API) */
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

export type UserFilters = {
  q?: string;
  role?: string | null;
  page?: number;
  per_page?: number;
  sort_by?: "id" | "name" | "email" | "phone" | "role" | "created_at";
  sort_dir?: "asc" | "desc";
};

type Paginated<T> = {
  data: T[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
};

function toFormData(payload: Record<string, any>): FormData {
  const fd = new FormData();
  Object.entries(payload).forEach(([k, v]) => {
    if (v === undefined) return;
    // booleans/number as string; null -> empty
    if (v === null) fd.append(k, "");
    else fd.append(k, v as any);
  });
  return fd;
}

export const useUserStore = defineStore("users", {
  state: () => ({
    items: [] as User[],
    current: null as User | null,

    // pagination
    page: 1,
    per_page: 15,
    total: 0,
    last_page: 1,

    // filters/sort
    q: "" as string,
    role: null as string | null,
    sort_by: "id" as UserFilters["sort_by"],
    sort_dir: "asc" as UserFilters["sort_dir"],

    // flags
    loading: false,
    saving: false,
    removing: false,
    error: "" as string,
  }),

  getters: {
    params(state): UserFilters {
      return {
        q: state.q || undefined,
        role: state.role || undefined,
        page: state.page,
        per_page: state.per_page,
        sort_by: state.sort_by,
        sort_dir: state.sort_dir,
      };
    },
  },

  actions: {
    setQuery(q: string) {
      this.q = q;
      this.page = 1;
    },
    setRole(role: string | null) {
      this.role = role;
      this.page = 1;
    },
    setPage(p: number) {
      this.page = Math.max(1, p || 1);
    },
    setPerPage(n: number) {
      this.per_page = Math.max(1, n || 1);
      this.page = 1;
    },
    setSort(by: UserFilters["sort_by"], dir: UserFilters["sort_dir"] = "asc") {
      this.sort_by = by || "id";
      this.sort_dir = dir === "desc" ? "desc" : "asc";
      this.page = 1;
    },
    resetFilters() {
      this.q = "";
      this.role = null;
      this.page = 1;
      this.per_page = 15;
      this.sort_by = "id";
      this.sort_dir = "asc";
    },

    /* --------------------------- API calls --------------------------- */

    async fetchList() {
      const { $api } = useNuxtApp();
      this.loading = true;
      this.error = "";
      try {
        const res = await $api<Paginated<User>>("/v1/users", {
          query: this.params,
        });
        this.items = res.data || [];
        this.page = res.current_page ?? 1;
        this.per_page = res.per_page ?? this.per_page;
        this.total = res.total ?? 0;
        this.last_page = res.last_page ?? 1;
      } catch (e: any) {
        this.error =
          e?.data?.message ||
          e?.data?.error ||
          e?.message ||
          "Failed to load users";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async fetchOne(id: number) {
      const { $api } = useNuxtApp();
      this.loading = true;
      this.error = "";
      try {
        const user = await $api<User>(`/v1/users/${id}`);
        this.current = user;
        return user;
      } catch (e: any) {
        this.error =
          e?.data?.message ||
          e?.data?.error ||
          e?.message ||
          "Failed to load user";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async create(payload: {
      name: string;
      phone: string;
      email?: string | null;
      role?: string | null;
      password?: string | null; // nullable per API
      photo?: File | null;
    }) {
      const { $api } = useNuxtApp();
      this.saving = true;
      this.error = "";
      try {
        const { photo, ...rest } = payload || {};
        const body = photo ? toFormData({ ...rest, photo }) : rest;
        const created = await $api<User>("/v1/users", {
          method: "POST",
          body,
        });
        // optional: prepend to list if on first page
        if (this.page === 1) this.items.unshift(created);
        return created;
      } catch (e: any) {
        this.error =
          e?.data?.message ||
          e?.data?.error ||
          e?.message ||
          "Failed to create user";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    async update(
      id: number,
      payload: {
        name?: string;
        phone?: string;
        email?: string | null;
        role?: string | null;
        password?: string | null; // nullable allowed
        photo?: File | null;
        remove_photo?: boolean;
      }
    ) {
      const { $api } = useNuxtApp();
      this.saving = true;
      this.error = "";
      try {
        const { photo, ...rest } = payload || {};
        const body = photo ? toFormData({ ...rest, photo }) : rest;

        const updated = await $api<User>(`/v1/users/${id}`, {
          method: "PATCH",
          body,
        });

        // sync in list
        const idx = this.items.findIndex((u) => u.id === id);
        if (idx !== -1) this.items[idx] = updated;
        // sync current
        if (this.current?.id === id) this.current = updated;

        return updated;
      } catch (e: any) {
        this.error =
          e?.data?.message ||
          e?.data?.error ||
          e?.message ||
          "Failed to update user";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    async remove(id: number) {
      const { $api } = useNuxtApp();
      this.removing = true;
      this.error = "";
      try {
        await $api<{ message: string }>(`/v1/users/${id}`, {
          method: "DELETE",
        });
        this.items = this.items.filter((u) => u.id !== id);
        if (this.current?.id === id) this.current = null;
      } catch (e: any) {
        this.error =
          e?.data?.message ||
          e?.data?.error ||
          e?.message ||
          "Failed to delete user";
        throw e;
      } finally {
        this.removing = false;
      }
    },
  },
});
