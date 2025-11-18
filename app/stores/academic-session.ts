// app/stores/academic-session.ts
import { defineStore } from "pinia";
import type { AcademicSession, SessionFilters, Paginated } from "~/types";

/* ---------- Store ---------- */
export const useSessionStore = defineStore("sessions", {
  state: () => ({
    items: [] as AcademicSession[],
    current: null as AcademicSession | null,

    active: null as boolean | null,
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
    params(state): SessionFilters {
      return {
        active: state.active ?? undefined,
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

    // GET /v1/sessions (paginated)
    async fetchList() {
      const { $publicApi } = useNuxtApp(); // তুমি যেমন ইউজ করছো
      this.loading = true;
      this.error = "";
      try {
        const res = await $publicApi<Paginated<AcademicSession>>(
          "/v1/sessions",
          {
            query: this.params,
          }
        );
        this.items = res.data || [];
        this.page = res.current_page ?? 1;
        this.per_page = res.per_page ?? this.per_page;
        this.total = res.total ?? 0;
        this.last_page = res.last_page ?? 1;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to load sessions";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    // GET /v1/sessions/{id}
    async fetchOne(id: number) {
      const { $publicApi } = useNuxtApp();
      this.loading = true;
      this.error = "";
      try {
        const session = await $publicApi<AcademicSession>(`/v1/sessions/${id}`);
        this.current = session;
        return session;
      } catch (e: any) {
        this.error = e?.data?.message || e?.message || "Failed to load session";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    // POST /v1/sessions
    async create(payload: {
      name: string;
      start_date: string;
      end_date: string;
      is_active?: boolean;
    }) {
      const { $api } = useNuxtApp();
      this.saving = true;
      this.error = "";
      try {
        const created = await $api<AcademicSession>("/v1/sessions", {
          method: "POST",
          body: payload,
        });
        if (this.page === 1) this.items.unshift(created);
        return created;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to create session";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    // PATCH /v1/sessions/{id}
    async update(
      id: number,
      payload: Partial<{
        name: string;
        start_date: string;
        end_date: string;
        is_active: boolean;
      }>
    ) {
      const { $api } = useNuxtApp();
      this.saving = true;
      this.error = "";
      try {
        const updated = await $api<AcademicSession>(`/v1/sessions/${id}`, {
          method: "PATCH",
          body: payload,
        });
        const idx = this.items.findIndex((s) => s.id === id);
        if (idx !== -1) this.items[idx] = updated;
        if (this.current?.id === id) this.current = updated;
        return updated;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to update session";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    // DELETE /v1/sessions/{id}
    async remove(id: number) {
      const { $api } = useNuxtApp();
      this.removing = true;
      this.error = "";
      try {
        await $api<{ message: string }>(`/v1/sessions/${id}`, {
          method: "DELETE",
        });
        this.items = this.items.filter((s) => s.id !== id);
        if (this.current?.id === id) this.current = null;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to delete session";
        throw e;
      } finally {
        this.removing = false;
      }
    },
  },
});
