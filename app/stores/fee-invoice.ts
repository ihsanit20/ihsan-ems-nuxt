import { defineStore } from "pinia";
import type {
  FeeInvoice,
  CreateFeeInvoiceInput,
  UpdateFeeInvoiceInput,
} from "~/types/models/fee-invoice";
import type { Paginated, BaseFilters } from "~/types/common";

interface FeeInvoiceState {
  feeInvoices: FeeInvoice[];
  currentFeeInvoice: FeeInvoice | null;
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  loading: boolean;
  error: string | null;
}

export const useFeeInvoiceStore = defineStore("feeInvoice", {
  state: (): FeeInvoiceState => ({
    feeInvoices: [],
    currentFeeInvoice: null,
    pagination: {
      current_page: 1,
      last_page: 1,
      per_page: 15,
      total: 0,
    },
    loading: false,
    error: null,
  }),

  actions: {
    async fetchFeeInvoices(filters?: BaseFilters) {
      this.loading = true;
      this.error = null;

      try {
        const { $api } = useNuxtApp();
        const response = await $api<Paginated<FeeInvoice>>("/v1/fee-invoices", {
          query: filters,
        });

        this.feeInvoices = response.data;
        this.pagination = {
          current_page: response.current_page,
          last_page: response.last_page,
          per_page: response.per_page,
          total: response.total,
        };

        return response;
      } catch (error: any) {
        this.error = error.message || "Failed to fetch fee invoices";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchFeeInvoice(id: number) {
      this.loading = true;
      this.error = null;

      try {
        const { $api } = useNuxtApp();
        const response = await $api<FeeInvoice | { data: FeeInvoice }>(
          `/v1/fee-invoices/${id}`
        );

        // API may return either { data: invoice } or bare invoice object; handle both
        const invoice = (response as any)?.data ?? response;

        // Normalize nested keys (backend returns session_fee, frontend expects sessionFee)
        const toNumber = (v: any) => (v === null || v === undefined ? 0 : Number(v));

        // Normalize nested keys (backend returns session_fee, frontend expects sessionFee)
        if (invoice?.items?.length) {
          invoice.items = invoice.items.map((item: any) => ({
            ...item,
            amount: toNumber(item.amount),
            discount_amount: toNumber(item.discount_amount),
            net_amount: toNumber(item.net_amount),
            sessionFee: item.sessionFee ?? item.session_fee ?? item.session_fee,
          }));
        }

        // Coerce totals to numbers (backend sends strings)
        invoice.total_amount = toNumber(invoice.total_amount);
        invoice.total_discount = toNumber(invoice.total_discount);
        invoice.payable_amount = toNumber(invoice.payable_amount);

        this.currentFeeInvoice = invoice ?? null;
        return invoice;
      } catch (error: any) {
        this.error = error.message || "Failed to fetch fee invoice";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchStudentInvoices(studentId: number, filters?: BaseFilters) {
      this.loading = true;
      this.error = null;

      try {
        const { $api } = useNuxtApp();
        const response = await $api<Paginated<FeeInvoice>>(
          `/v1/students/${studentId}/invoices`,
          {
            query: filters,
          }
        );

        this.feeInvoices = response.data;
        this.pagination = {
          current_page: response.current_page,
          last_page: response.last_page,
          per_page: response.per_page,
          total: response.total,
        };

        return response;
      } catch (error: any) {
        this.error = error.message || "Failed to fetch student invoices";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createFeeInvoice(input: CreateFeeInvoiceInput) {
      this.loading = true;
      this.error = null;

      try {
        const { $api } = useNuxtApp();
        const response = await $api<{ data: FeeInvoice }>("/v1/fee-invoices", {
          method: "POST",
          body: input,
        });

        this.feeInvoices.unshift(response.data);
        return response.data;
      } catch (error: any) {
        this.error = error.message || "Failed to create fee invoice";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateFeeInvoice(id: number, input: UpdateFeeInvoiceInput) {
      this.loading = true;
      this.error = null;

      try {
        const { $api } = useNuxtApp();
        const response = await $api<{ data: FeeInvoice }>(
          `/v1/fee-invoices/${id}`,
          {
            method: "PUT",
            body: input,
          }
        );

        const index = this.feeInvoices.findIndex((inv) => inv.id === id);
        if (index !== -1) {
          this.feeInvoices[index] = response.data;
        }

        if (this.currentFeeInvoice?.id === id) {
          this.currentFeeInvoice = response.data;
        }

        return response.data;
      } catch (error: any) {
        this.error = error.message || "Failed to update fee invoice";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deleteFeeInvoice(id: number) {
      this.loading = true;
      this.error = null;

      try {
        const { $api } = useNuxtApp();
        await $api(`/v1/fee-invoices/${id}`, {
          method: "DELETE",
        });

        this.feeInvoices = this.feeInvoices.filter((inv) => inv.id !== id);

        if (this.currentFeeInvoice?.id === id) {
          this.currentFeeInvoice = null;
        }
      } catch (error: any) {
        this.error = error.message || "Failed to delete fee invoice";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    clearError() {
      this.error = null;
    },

    resetState() {
      this.feeInvoices = [];
      this.currentFeeInvoice = null;
      this.pagination = {
        current_page: 1,
        last_page: 1,
        per_page: 15,
        total: 0,
      };
      this.loading = false;
      this.error = null;
    },
  },

  getters: {
    getFeeInvoiceById: (state) => (id: number) => {
      return state.feeInvoices.find((inv) => inv.id === id);
    },

    getFeeInvoicesByStudent: (state) => (studentId: number) => {
      return state.feeInvoices.filter((inv) => inv.student_id === studentId);
    },

    getFeeInvoicesByStatus: (state) => (status: FeeInvoice["status"]) => {
      return state.feeInvoices.filter((inv) => inv.status === status);
    },

    getPendingInvoices: (state) => {
      return state.feeInvoices.filter(
        (inv) => inv.status === "pending" || inv.status === "partial"
      );
    },

    getTotalPayableAmount: (state) => {
      return state.feeInvoices.reduce(
        (sum, inv) => sum + inv.payable_amount,
        0
      );
    },

    hasFeeInvoices: (state) => state.feeInvoices.length > 0,
  },
});
