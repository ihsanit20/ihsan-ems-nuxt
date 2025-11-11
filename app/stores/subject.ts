// app/stores/subject.ts
import { defineStore } from "pinia";

/* ---------- Types ---------- */
export type Subject = {
  id: number;
  grade_id: number;
  name: string;
  code: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type SubjectFilters = {
  grade_id?: number;
  q?: string; // search (name/code)
  only_active?: boolean;
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

export const useSubjectStore = defineStore("subjects", {
  state: () => ({
    items: [] as Subject[],
    current: null as Subject | null,

    // filters
    grade_id: null as number | null,
    q: "" as string,
    only_active: false,

    page: 1,
    per_page: 25,
    total: 0,
    last_page: 1,

    loading: false,
    saving: false,
    removing: false,
    error: "" as string,
  }),

  getters: {
    params(state): SubjectFilters {
      return {
        grade_id: state.grade_id ?? undefined,
        q: state.q || undefined,
        only_active: state.only_active || undefined,
        page: state.page,
        per_page: state.per_page,
      };
    },
  },

  actions: {
    setGrade(id: number | null) {
      this.grade_id = id;
      this.page = 1;
    },
    setSearch(s: string) {
      this.q = s;
      this.page = 1;
    },
    setOnlyActive(v: boolean) {
      this.only_active = !!v;
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
      this.q = "";
      this.only_active = false;
      this.page = 1;
      this.per_page = 25;
    },

    /* ---------------------------------------------
     * READ
     * GET /v1/subjects?grade_id=&q=&only_active=&page=&per_page=
     * -------------------------------------------*/
    async fetchList(extraQuery?: Record<string, any>) {
      const { $api } = useNuxtApp(); // public read OK
      this.loading = true;
      this.error = "";
      try {
        const res = await $api<Paginated<Subject>>("/v1/subjects", {
          query: { ...this.params, ...(extraQuery || {}) },
        });
        this.items = res.data || [];
        this.page = res.current_page ?? 1;
        this.per_page = res.per_page ?? this.per_page;
        this.total = res.total ?? 0;
        this.last_page = res.last_page ?? 1;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to load subjects";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    /* ---------------------------------------------
     * CREATE
     * POST /v1/subjects
     * -------------------------------------------*/
    async create(payload: {
      grade_id: number;
      name: string;
      code: string;
      is_active?: boolean;
    }) {
      const { $api } = useNuxtApp(); // needs Admin+
      this.saving = true;
      this.error = "";
      try {
        const created = await $api<Subject>("/v1/subjects", {
          method: "POST",
          body: payload,
        });
        if (this.page === 1) this.items.unshift(created);
        return created;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to create subject";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    /* ---------------------------------------------
     * UPDATE
     * PATCH /v1/subjects/{id}
     * -------------------------------------------*/
    async update(
      id: number,
      payload: Partial<{
        grade_id: number;
        name: string;
        code: string;
        is_active: boolean;
      }>
    ) {
      const { $api } = useNuxtApp();
      this.saving = true;
      this.error = "";
      try {
        const updated = await $api<Subject>(`/v1/subjects/${id}`, {
          method: "PATCH",
          body: payload,
        });
        const idx = this.items.findIndex((x) => x.id === id);
        if (idx !== -1) this.items[idx] = updated;
        if (this.current?.id === id) this.current = updated;
        return updated;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to update subject";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    /* ---------------------------------------------
     * DELETE
     * DELETE /v1/subjects/{id}
     * -------------------------------------------*/
    async remove(id: number) {
      const { $api } = useNuxtApp();
      this.removing = true;
      this.error = "";
      try {
        await $api<{ message?: string }>(`/v1/subjects/${id}`, {
          method: "DELETE",
        });
        this.items = this.items.filter((x) => x.id !== id);
        if (this.current?.id === id) this.current = null;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to delete subject";
        throw e;
      } finally {
        this.removing = false;
      }
    },
  },
});
