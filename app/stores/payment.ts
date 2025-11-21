import { defineStore } from "pinia";
import type {
  Payment,
  CreatePaymentInput,
  UpdatePaymentInput,
} from "~/types/models/payment";
import type { Paginated, BaseFilters } from "~/types/common";

interface PaymentState {
  payments: Payment[];
  currentPayment: Payment | null;
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  loading: boolean;
  error: string | null;
}

export const usePaymentStore = defineStore("payment", {
  state: (): PaymentState => ({
    payments: [],
    currentPayment: null,
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
    // ✅ Laravel paginate response: { current_page, data: [...], last_page, per_page, total }
    async fetchPayments(filters?: BaseFilters) {
      this.loading = true;
      this.error = null;

      try {
        const { $api } = useNuxtApp();
        const response = await $api<Paginated<Payment>>("/v1/payments", {
          query: filters,
        });

        this.payments = response?.data ?? [];
        this.pagination = {
          current_page: response?.current_page ?? 1,
          last_page: response?.last_page ?? 1,
          per_page: response?.per_page ?? filters?.per_page ?? 15,
          total: response?.total ?? 0,
        };

        return response;
      } catch (error: any) {
        this.error =
          error?.data?.message || error.message || "Failed to fetch payments";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // ✅ show() returns a single Payment object (no data wrapper)
    async fetchPayment(id: number) {
      this.loading = true;
      this.error = null;

      try {
        const { $api } = useNuxtApp();
        const response = await $api<Payment>(`/v1/payments/${id}`);

        this.currentPayment = response ?? null;
        return response;
      } catch (error: any) {
        this.error =
          error?.data?.message || error.message || "Failed to fetch payment";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // ✅ studentPayments() returns plain array (not paginated)
    async fetchStudentPayments(studentId: number, filters?: BaseFilters) {
      this.loading = true;
      this.error = null;

      try {
        const { $api } = useNuxtApp();
        const response = await $api<Payment[]>(
          `/v1/students/${studentId}/payments`,
          {
            query: filters,
          }
        );

        this.payments = response ?? [];
        this.pagination = {
          current_page: 1,
          last_page: 1,
          per_page: this.payments.length || 15,
          total: this.payments.length,
        };

        return response;
      } catch (error: any) {
        this.error =
          error?.data?.message ||
          error.message ||
          "Failed to fetch student payments";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // ✅ invoicePayments() returns plain array (not paginated)
    async fetchInvoicePayments(invoiceId: number, filters?: BaseFilters) {
      this.loading = true;
      this.error = null;

      try {
        const { $api } = useNuxtApp();
        const response = await $api<Payment[]>(
          `/v1/fee-invoices/${invoiceId}/payments`,
          {
            query: filters,
          }
        );

        this.payments = response ?? [];
        this.pagination = {
          current_page: 1,
          last_page: 1,
          per_page: this.payments.length || 15,
          total: this.payments.length,
        };

        return response;
      } catch (error: any) {
        // Treat 404 as "no payments yet" instead of breaking the page
        if (error?.status === 404 || error?.response?.status === 404) {
          this.payments = [];
          this.pagination = {
            current_page: 1,
            last_page: 1,
            per_page: 15,
            total: 0,
          };
          this.error = null;
          return [];
        }

        this.error =
          error?.data?.message ||
          error.message ||
          "Failed to fetch invoice payments";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // ✅ store() returns { message, data: Payment }
    async createPayment(input: CreatePaymentInput) {
      this.loading = true;
      this.error = null;

      try {
        const { $api } = useNuxtApp();
        const response = await $api<{ message: string; data: Payment }>(
          "/v1/payments",
          {
            method: "POST",
            body: input,
          }
        );

        const payment = response?.data;
        if (payment) this.payments.unshift(payment);

        return payment;
      } catch (error: any) {
        this.error =
          error?.data?.message || error.message || "Failed to create payment";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // ✅ update() returns { message, data: Payment }
    async updatePayment(id: number, input: UpdatePaymentInput) {
      this.loading = true;
      this.error = null;

      try {
        const { $api } = useNuxtApp();
        const response = await $api<{ message: string; data: Payment }>(
          `/v1/payments/${id}`,
          {
            method: "PUT",
            body: input,
          }
        );

        const payment = response?.data;

        const index = this.payments.findIndex((p) => p.id === id);
        if (index !== -1 && payment) {
          this.payments[index] = payment;
        }

        if (this.currentPayment?.id === id) {
          this.currentPayment = payment;
        }

        return payment;
      } catch (error: any) {
        this.error =
          error?.data?.message || error.message || "Failed to update payment";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deletePayment(id: number) {
      this.loading = true;
      this.error = null;

      try {
        const { $api } = useNuxtApp();
        await $api(`/v1/payments/${id}`, {
          method: "DELETE",
        });

        this.payments = (this.payments ?? []).filter((p) => p.id !== id);

        if (this.currentPayment?.id === id) {
          this.currentPayment = null;
        }
      } catch (error: any) {
        this.error =
          error?.data?.message || error.message || "Failed to delete payment";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    clearError() {
      this.error = null;
    },

    resetState() {
      this.payments = [];
      this.currentPayment = null;
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
    getPaymentById: (state) => (id: number) =>
      (state.payments ?? []).find((p) => p.id === id),

    getPaymentsByStudent: (state) => (studentId: number) =>
      (state.payments ?? []).filter((p) => p.student_id === studentId),

    getPaymentsByInvoice: (state) => (invoiceId: number) =>
      (state.payments ?? []).filter((p) => p.fee_invoice_id === invoiceId),

    getPaymentsByStatus: (state) => (status: Payment["status"]) =>
      (state.payments ?? []).filter((p) => p.status === status),

    getCompletedPayments: (state) =>
      (state.payments ?? []).filter((p) => p.status === "completed"),

    getTotalPaymentAmount: (state) =>
      (state.payments ?? [])
        .filter((p) => p.status === "completed")
        .reduce((sum, p) => sum + Number(p.amount || 0), 0),

    hasPayments: (state) => (state.payments ?? []).length > 0,
  },
});
