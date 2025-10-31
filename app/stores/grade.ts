import { defineStore } from "pinia";

/* ---------- Types ---------- */
export type Grade = {
  id: number;
  name: string;
  code?: string | null;
  sort_order?: number | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type GradeFilters = {
  is_active?: boolean | null;
  q?: string;
  page?: number;
  per_page?: number;
};

type Paginated<T> = {
  data: T[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
};

/* ---------- Store ---------- */
export const useGradeStore = defineStore("grades", {
  state: () => ({
    items: [] as Grade[],
    current: null as Grade | null,

    active: null as boolean | null, // UI: All/Active/Inactive
    q: "" as string,
    page: 1,
    per_page: 15,
    total: 0,
    last_page: 1,

    loading: false,
    saving: false,
    removing: false,
    error: "" as string,
  }),

  getters: {
    params(state): GradeFilters {
      return {
        is_active: state.active ?? undefined, // API expects is_active
        q: state.q || undefined,
        page: state.page,
        per_page: state.per_page,
      };
    },
  },

  actions: {
    setActive(active: boolean | null) {
      this.active = active;
      this.page = 1;
    },
    setQuery(q: string) {
      this.q = q;
      this.page = 1;
    },
    setPage(p: number) {
      this.page = Math.max(1, p || 1);
    },
    setPerPage(n: number) {
      this.per_page = Math.max(1, n || 1);
      this.page = 1;
    },
    resetFilters() {
      this.active = null;
      this.q = "";
      this.page = 1;
      this.per_page = 15;
    },

    // GET /v1/grades (paginated)
    async fetchList() {
      const { $publicApi } = useNuxtApp();
      this.loading = true;
      this.error = "";
      try {
        const res = await $publicApi<Paginated<Grade>>("/v1/grades", {
          query: this.params,
        });
        this.items = res.data || [];
        this.page = res.current_page ?? 1;
        this.per_page = res.per_page ?? this.per_page;
        this.total = res.total ?? 0;
        this.last_page = res.last_page ?? 1;
      } catch (e: any) {
        this.error = e?.data?.message || e?.message || "Failed to load grades";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    // GET /v1/grades/{id}
    async fetchOne(id: number) {
      const { $publicApi } = useNuxtApp();
      this.loading = true;
      this.error = "";
      try {
        const grade = await $publicApi<Grade>(`/v1/grades/${id}`);
        this.current = grade;
        return grade;
      } catch (e: any) {
        this.error = e?.data?.message || e?.message || "Failed to load grade";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    // POST /v1/grades
    async create(payload: {
      name: string;
      code?: string | null;
      sort_order?: number | null;
      is_active?: boolean;
    }) {
      const { $api } = useNuxtApp();
      this.saving = true;
      this.error = "";
      try {
        const created = await $api<Grade>("/v1/grades", {
          method: "POST",
          body: payload,
        });
        if (this.page === 1) this.items.unshift(created);
        return created;
      } catch (e: any) {
        this.error = e?.data?.message || e?.message || "Failed to create grade";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    // PATCH /v1/grades/{id}
    async update(
      id: number,
      payload: Partial<{
        name: string;
        code: string | null;
        sort_order: number | null;
        is_active: boolean;
      }>
    ) {
      const { $api } = useNuxtApp();
      this.saving = true;
      this.error = "";
      try {
        const updated = await $api<Grade>(`/v1/grades/${id}`, {
          method: "PATCH",
          body: payload,
        });
        const idx = this.items.findIndex((g) => g.id === id);
        if (idx !== -1) this.items[idx] = updated;
        if (this.current?.id === id) this.current = updated;
        return updated;
      } catch (e: any) {
        this.error = e?.data?.message || e?.message || "Failed to update grade";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    // DELETE /v1/grades/{id}
    async remove(id: number) {
      const { $api } = useNuxtApp();
      this.removing = true;
      this.error = "";
      try {
        await $api<{ message: string }>(`/v1/grades/${id}`, {
          method: "DELETE",
        });
        this.items = this.items.filter((g) => g.id !== id);
        if (this.current?.id === id) this.current = null;
      } catch (e: any) {
        this.error = e?.data?.message || e?.message || "Failed to delete grade";
        throw e;
      } finally {
        this.removing = false;
      }
    },
  },
});
