// ~/stores/level.ts
import { defineStore } from "pinia";
import type { Grade } from "~/stores/grade";

/* ---------- Types ---------- */
export type Level = {
  id: number;
  name: string;
  code?: string | null;
  sort_order?: number | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  // when loaded with ?with_grades=1, controller may embed:
  grades?: Grade[];
};

export type LevelFilters = {
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
export const useLevelStore = defineStore("levels", {
  state: () => ({
    items: [] as Level[],
    current: null as Level | null,

    // filters
    active: null as boolean | null,
    q: "" as string,
    page: 1,
    per_page: 15,
    total: 0,
    last_page: 1,

    // mapped grades cache: level_id -> grades[]
    mapped: {} as Record<number, Grade[]>,

    loading: false,
    saving: false,
    removing: false,
    mapping: false,
    error: "" as string,
  }),

  getters: {
    params(state): LevelFilters {
      return {
        is_active: state.active ?? undefined,
        q: state.q || undefined,
        page: state.page,
        per_page: state.per_page,
      };
    },
    mappedOfCurrent(state): Grade[] {
      const id = state.current?.id;
      return id ? state.mapped[id] || [] : [];
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

    // GET /v1/levels (paginated)
    async fetchList(extraQuery?: Record<string, any>) {
      const { $publicApi } = useNuxtApp();
      this.loading = true;
      this.error = "";
      try {
        const res = await $publicApi<Paginated<Level>>("/v1/levels", {
          query: { ...this.params, ...(extraQuery || {}) },
        });
        this.items = res.data || [];
        this.page = res.current_page ?? 1;
        this.per_page = res.per_page ?? this.per_page;
        this.total = res.total ?? 0;
        this.last_page = res.last_page ?? 1;
      } catch (e: any) {
        this.error = e?.data?.message || e?.message || "Failed to load levels";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    // GET /v1/levels/{id}
    async fetchOne(id: number, opts?: { withGrades?: boolean }) {
      const { $publicApi } = useNuxtApp();
      this.loading = true;
      this.error = "";
      try {
        const q = opts?.withGrades ? { with_grades: 1 } : undefined;
        const level = await $publicApi<Level>(`/v1/levels/${id}`, { query: q });
        this.current = level;
        // if controller embedded grades, cache them
        if (Array.isArray(level.grades)) {
          this.mapped[id] = level.grades as Grade[];
        }
        return level;
      } catch (e: any) {
        this.error = e?.data?.message || e?.message || "Failed to load level";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    // POST /v1/levels
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
        const created = await $api<Level>("/v1/levels", {
          method: "POST",
          body: payload,
        });
        if (this.page === 1) this.items.unshift(created);
        return created;
      } catch (e: any) {
        this.error = e?.data?.message || e?.message || "Failed to create level";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    // PATCH /v1/levels/{id}
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
        const updated = await $api<Level>(`/v1/levels/${id}`, {
          method: "PATCH",
          body: payload,
        });
        const idx = this.items.findIndex((x) => x.id === id);
        if (idx !== -1) this.items[idx] = updated;
        if (this.current?.id === id) this.current = updated;
        return updated;
      } catch (e: any) {
        this.error = e?.data?.message || e?.message || "Failed to update level";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    // DELETE /v1/levels/{id}
    async remove(id: number) {
      const { $api } = useNuxtApp();
      this.removing = true;
      this.error = "";
      try {
        await $api<{ message: string }>(`/v1/levels/${id}`, {
          method: "DELETE",
        });
        this.items = this.items.filter((x) => x.id !== id);
        if (this.current?.id === id) this.current = null;
        delete this.mapped[id];
      } catch (e: any) {
        this.error = e?.data?.message || e?.message || "Failed to delete level";
        throw e;
      } finally {
        this.removing = false;
      }
    },

    // GET /v1/levels/{id}/grades  → { data: Grade[] }
    async listGrades(levelId: number) {
      const { $publicApi } = useNuxtApp();
      this.loading = true;
      this.error = "";
      try {
        const res = await $publicApi<{ data: Grade[] }>(
          `/v1/levels/${levelId}/grades`
        );
        const data = Array.isArray(res?.data) ? res.data : [];
        this.mapped[levelId] = data;
        if (this.current?.id === levelId) {
          this.current = { ...(this.current as Level), grades: data };
        }
        return data;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to load mapped grades";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    // PUT /v1/levels/{id}/grades  → body: { grade_ids: number[], sort?: { [id]: number } }
    async syncGrades(
      levelId: number,
      gradeIds: number[],
      sort?: Record<number, number | null>
    ) {
      const { $api } = useNuxtApp();
      this.mapping = true;
      this.error = "";
      try {
        const result = await $api<any>(`/v1/levels/${levelId}/grades`, {
          method: "PUT",
          body: { grade_ids: gradeIds, sort: sort || undefined },
        });
        // Controller returns Level with 'grades' relation
        const grades: Grade[] =
          (result?.grades as Grade[]) ??
          (Array.isArray(result?.data) ? (result.data as Grade[]) : []);
        if (Array.isArray(grades)) {
          this.mapped[levelId] = grades;
          if (this.current?.id === levelId) {
            this.current = { ...(this.current as Level), grades };
          }
        } else {
          // fallback: refresh mapping explicitly
          await this.listGrades(levelId);
        }
        return this.mapped[levelId] || [];
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to sync mapped grades";
        throw e;
      } finally {
        this.mapping = false;
      }
    },
  },
});
