// app/stores/session-fee.ts
import { defineStore } from "pinia";
import type { SessionFee, SessionFeeFilters, Paginated } from "~/types";

export const useSessionFeeStore = defineStore("session-fees", {
  state: () => ({
    items: [] as SessionFee[],
    current: null as SessionFee | null,

    // filters
    academic_session_id: null as number | null,
    grade_id: null as number | null,
    fee_id: null as number | null,
    q: "" as string,
    only_active: false, // false = all, true = only active fees

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
    params(state): SessionFeeFilters {
      return {
        academic_session_id: state.academic_session_id ?? undefined,
        grade_id: state.grade_id ?? undefined,
        fee_id: state.fee_id ?? undefined,
        q: state.q || undefined,
        // false হলে পাঠাবই না → সব, true হলে only_active=true
        only_active: state.only_active || undefined,
        page: state.page,
        per_page: state.per_page,
      };
    },
  },

  actions: {
    setSession(id: number | null) {
      this.academic_session_id = id;
      this.page = 1;
    },
    setGrade(id: number | null) {
      this.grade_id = id;
      this.page = 1;
    },
    setFee(id: number | null) {
      this.fee_id = id;
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
      this.academic_session_id = null;
      this.grade_id = null;
      this.fee_id = null;
      this.q = "";
      this.only_active = false;
      this.page = 1;
      this.per_page = 25;
    },

    /* ---------------------------------------------
     * READ
     * GET /v1/session-fees?academic_session_id=&grade_id=&fee_id=&q=&only_active=&page=&per_page=
     * -------------------------------------------*/
    async fetchList(extraQuery?: Record<string, any>) {
      const { $api } = useNuxtApp(); // public read OK (তুমি routes এ যা রেখেছো অনুযায়ী)
      this.loading = true;
      this.error = "";
      try {
        const res = await $api<Paginated<SessionFee>>("/v1/session-fees", {
          query: { ...this.params, ...(extraQuery || {}) },
        });
        this.items = res.data || [];
        this.page = res.current_page ?? 1;
        this.per_page = res.per_page ?? this.per_page;
        this.total = res.total ?? 0;
        this.last_page = res.last_page ?? 1;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to load session fees";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    /* ---------------------------------------------
     * CREATE
     * POST /v1/session-fees
     * -------------------------------------------*/
    async create(payload: {
      academic_session_id: number;
      grade_id: number;
      fee_id: number;
      amount: number | string;
    }) {
      const { $api } = useNuxtApp(); // Admin+
      this.saving = true;
      this.error = "";
      try {
        // Controller store() → { message, data: sessionFee }
        const res = await $api<{ message?: string; data: SessionFee }>(
          "/v1/session-fees",
          {
            method: "POST",
            body: payload,
          }
        );
        const created = res.data;
        if (this.page === 1) this.items.unshift(created);
        return created;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to create session fee";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    /* ---------------------------------------------
     * UPDATE
     * PATCH /v1/session-fees/{id}
     * -------------------------------------------*/
    async update(
      id: number,
      payload: Partial<{
        academic_session_id: number;
        grade_id: number;
        fee_id: number;
        amount: number | string;
      }>
    ) {
      const { $api } = useNuxtApp();
      this.saving = true;
      this.error = "";
      try {
        // Controller update() → { message, data: sessionFee }
        const res = await $api<{ message?: string; data: SessionFee }>(
          `/v1/session-fees/${id}`,
          {
            method: "PATCH",
            body: payload,
          }
        );
        const updated = res.data;
        const idx = this.items.findIndex((x) => x.id === id);
        if (idx !== -1) this.items[idx] = updated;
        if (this.current?.id === id) this.current = updated;
        return updated;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to update session fee";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    /* ---------------------------------------------
     * DELETE
     * DELETE /v1/session-fees/{id}
     * -------------------------------------------*/
    async remove(id: number) {
      const { $api } = useNuxtApp();
      this.removing = true;
      this.error = "";
      try {
        await $api<{ message?: string }>(`/v1/session-fees/${id}`, {
          method: "DELETE",
        });
        this.items = this.items.filter((x) => x.id !== id);
        if (this.current?.id === id) this.current = null;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to delete session fee";
        throw e;
      } finally {
        this.removing = false;
      }
    },
  },
});
