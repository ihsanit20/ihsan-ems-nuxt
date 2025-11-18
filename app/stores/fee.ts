// app/stores/fee.ts
import { defineStore } from "pinia";
import type {
  Fee,
  FeeFilters,
  BillingType,
  RecurringCycle,
  Paginated,
} from "~/types";

export const useFeeStore = defineStore("fees", {
  state: () => ({
    items: [] as Fee[],
    current: null as Fee | null,

    // filters
    q: "" as string,
    billing_type: null as BillingType | null,
    recurring_cycle: null as RecurringCycle | null,
    is_active: null as boolean | null, // null = all, true = only active, false = only inactive

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
    params(state): FeeFilters {
      return {
        q: state.q || undefined,
        billing_type: state.billing_type || undefined,
        recurring_cycle: state.recurring_cycle || undefined,
        is_active: state.is_active ?? undefined,
        page: state.page,
        per_page: state.per_page,
      };
    },
  },

  actions: {
    setSearch(s: string) {
      this.q = s;
      this.page = 1;
    },
    setBillingType(v: BillingType | null) {
      this.billing_type = v;
      this.page = 1;
    },
    setRecurringCycle(v: RecurringCycle | null) {
      this.recurring_cycle = v;
      this.page = 1;
    },
    // v = true (only active), false (only inactive), null (all)
    setIsActive(v: boolean | null) {
      this.is_active = v;
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
      this.billing_type = null;
      this.recurring_cycle = null;
      this.is_active = null;
      this.page = 1;
      this.per_page = 25;
    },

    /* ---------------------------------------------
     * READ
     * GET /v1/fees?q=&billing_type=&recurring_cycle=&is_active=&page=&per_page=
     * -------------------------------------------*/
    async fetchList(extraQuery?: Record<string, any>) {
      const { $api } = useNuxtApp(); // public read OK
      this.loading = true;
      this.error = "";
      try {
        const res = await $api<Paginated<Fee>>("/v1/fees", {
          query: { ...this.params, ...(extraQuery || {}) },
        });
        this.items = res.data || [];
        this.page = res.current_page ?? 1;
        this.per_page = res.per_page ?? this.per_page;
        this.total = res.total ?? 0;
        this.last_page = res.last_page ?? 1;
      } catch (e: any) {
        this.error = e?.data?.message || e?.message || "Failed to load fees";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    /* ---------------------------------------------
     * CREATE
     * POST /v1/fees
     * -------------------------------------------*/
    async create(payload: {
      name: string;
      billing_type: BillingType;
      recurring_cycle?: RecurringCycle | null;
      sort_order?: number;
      is_active?: boolean;
    }) {
      const { $api } = useNuxtApp(); // needs Admin+
      this.saving = true;
      this.error = "";
      try {
        // FeeController store() returns { message, data: fee }
        const res = await $api<{ message?: string; data: Fee }>("/v1/fees", {
          method: "POST",
          body: payload,
        });
        const created = res.data;
        if (this.page === 1) this.items.unshift(created);
        return created;
      } catch (e: any) {
        this.error = e?.data?.message || e?.message || "Failed to create fee";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    /* ---------------------------------------------
     * UPDATE
     * PATCH /v1/fees/{id}
     * -------------------------------------------*/
    async update(
      id: number,
      payload: Partial<{
        name: string;
        billing_type: BillingType;
        recurring_cycle: RecurringCycle | null;
        sort_order: number;
        is_active: boolean;
      }>
    ) {
      const { $api } = useNuxtApp();
      this.saving = true;
      this.error = "";
      try {
        // FeeController update() returns { message, data: fee }
        const res = await $api<{ message?: string; data: Fee }>(
          `/v1/fees/${id}`,
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
        this.error = e?.data?.message || e?.message || "Failed to update fee";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    /* ---------------------------------------------
     * DELETE
     * DELETE /v1/fees/{id}
     * -------------------------------------------*/
    async remove(id: number) {
      const { $api } = useNuxtApp();
      this.removing = true;
      this.error = "";
      try {
        await $api<{ message?: string }>(`/v1/fees/${id}`, {
          method: "DELETE",
        });
        this.items = this.items.filter((x) => x.id !== id);
        if (this.current?.id === id) this.current = null;
      } catch (e: any) {
        this.error = e?.data?.message || e?.message || "Failed to delete fee";
        throw e;
      } finally {
        this.removing = false;
      }
    },
  },
});
