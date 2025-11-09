// app/stores/section.ts
import { defineStore } from "pinia";

/* ---------- Types ---------- */
export type Section = {
  id: number;
  session_grade_id: number;
  name: string;
  code?: string | null;
  capacity?: number | null;
  class_teacher_id?: number | null;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;

  class_teacher?: { id: number; name: string } | null;
};

export type SectionFilters = {
  session_grade_id?: number; // required to list
  search?: string;
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

export const useSectionStore = defineStore("sections", {
  state: () => ({
    items: [] as Section[],
    current: null as Section | null,

    // filters
    session_grade_id: null as number | null,
    search: "" as string,
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
    params(state): SectionFilters {
      return {
        session_grade_id: state.session_grade_id ?? undefined,
        search: state.search || undefined,
        page: state.page,
        per_page: state.per_page,
      };
    },
  },

  actions: {
    setSessionGrade(id: number | null) {
      this.session_grade_id = id;
      this.page = 1;
    },
    setSearch(s: string) {
      this.search = s;
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
      this.search = "";
      this.page = 1;
      this.per_page = 25;
    },

    /* ---------------------------------------------
     * READ list (by class)
     * GET /v1/session-classes/{sessionGrade}/sections
     * -------------------------------------------*/
    async fetchList(extraQuery?: Record<string, any>) {
      if (!this.session_grade_id)
        throw new Error("session_grade_id is required");
      const { $api } = useNuxtApp(); // needs auth (Admin+)
      this.loading = true;
      this.error = "";
      try {
        const res = await $api<Paginated<Section>>(
          `/v1/session-classes/${this.session_grade_id}/sections`,
          { query: { ...this.params, ...(extraQuery || {}) } }
        );
        this.items = res.data || [];
        this.page = res.current_page ?? 1;
        this.per_page = res.per_page ?? this.per_page;
        this.total = res.total ?? 0;
        this.last_page = res.last_page ?? 1;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to load sections";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    /* ---------------------------------------------
     * CREATE single
     * POST /v1/session-classes/{sessionGrade}/sections
     * -------------------------------------------*/
    async create(payload: {
      name: string;
      code?: string | null;
      capacity?: number | null;
      class_teacher_id?: number | null;
      sort_order?: number | null;
    }) {
      if (!this.session_grade_id)
        throw new Error("session_grade_id is required");
      const { $api } = useNuxtApp();
      this.saving = true;
      this.error = "";
      try {
        const created = await $api<Section>(
          `/v1/session-classes/${this.session_grade_id}/sections`,
          { method: "POST", body: payload }
        );
        if (this.page === 1) this.items.unshift(created);
        return created;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to create section";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    /* ---------------------------------------------
     * BULK create
     * POST /v1/session-classes/{sessionGrade}/sections/bulk
     * -------------------------------------------*/
    async bulkCreate(payload: {
      names: string[]; // e.g. ["A","B","C"]
      capacity?: number | null;
      class_teacher_id?: number | null;
    }) {
      if (!this.session_grade_id)
        throw new Error("session_grade_id is required");
      const { $api } = useNuxtApp();
      this.saving = true;
      this.error = "";
      try {
        const res = await $api<{
          created_count: number;
          items: Section[];
        }>(`/v1/session-classes/${this.session_grade_id}/sections/bulk`, {
          method: "POST",
          body: payload,
        });
        if (this.page === 1) this.items = [...(res.items || []), ...this.items];
        return res;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to bulk create sections";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    /* ---------------------------------------------
     * UPDATE
     * PATCH /v1/sections/{section}
     * -------------------------------------------*/
    async update(
      id: number,
      payload: Partial<{
        name: string;
        code: string | null;
        capacity: number | null;
        class_teacher_id: number | null;
        sort_order: number | null;
      }>
    ) {
      const { $api } = useNuxtApp();
      this.saving = true;
      this.error = "";
      try {
        const updated = await $api<Section>(`/v1/sections/${id}`, {
          method: "PATCH",
          body: payload,
        });
        const idx = this.items.findIndex((x) => x.id === id);
        if (idx !== -1) this.items[idx] = updated;
        if (this.current?.id === id) this.current = updated;
        return updated;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to update section";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    /* ---------------------------------------------
     * DELETE
     * DELETE /v1/sections/{section}
     * -------------------------------------------*/
    async remove(id: number) {
      const { $api } = useNuxtApp();
      this.removing = true;
      this.error = "";
      try {
        await $api<{ message: string }>(`/v1/sections/${id}`, {
          method: "DELETE",
        });
        this.items = this.items.filter((x) => x.id !== id);
        if (this.current?.id === id) this.current = null;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to delete section";
        throw e;
      } finally {
        this.removing = false;
      }
    },

    /* ---------------------------------------------
     * REORDER within class
     * PATCH /v1/session-classes/{sessionGrade}/sections/reorder
     * -------------------------------------------*/
    async reorder(items: { id: number; sort_order: number }[]) {
      if (!this.session_grade_id)
        throw new Error("session_grade_id is required");
      const { $api } = useNuxtApp();
      this.saving = true;
      this.error = "";
      try {
        await $api<{ message: string }>(
          `/v1/session-classes/${this.session_grade_id}/sections/reorder`,
          { method: "PATCH", body: { items } }
        );
        // local sort update
        const map = new Map(items.map((x) => [x.id, x.sort_order]));
        this.items = this.items
          .map((s) => ({
            ...s,
            sort_order: map.get(s.id) ?? s.sort_order,
          }))
          .sort(
            (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id
          );
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to reorder sections";
        throw e;
      } finally {
        this.saving = false;
      }
    },
  },
});
