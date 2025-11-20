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
    async fetchPayments(filters?: BaseFilters) {
      this.loading = true;
      this.error = null;

      try {
        const { $api } = useNuxtApp();
        const response = await $api<Paginated<Payment>>("/payments", {
          params: filters,
        });

        this.payments = response.data;
        this.pagination = {
          current_page: response.current_page,
          last_page: response.last_page,
          per_page: response.per_page,
          total: response.total,
        };

        return response;
      } catch (error: any) {
        this.error = error.message || "Failed to fetch payments";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchPayment(id: number) {
      this.loading = true;
      this.error = null;

      try {
        const { $api } = useNuxtApp();
        const response = await $api<{ data: Payment }>(`/payments/${id}`);

        this.currentPayment = response.data;
        return response.data;
      } catch (error: any) {
        this.error = error.message || "Failed to fetch payment";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchStudentPayments(studentId: number, filters?: BaseFilters) {
      this.loading = true;
      this.error = null;

      try {
        const { $api } = useNuxtApp();
        const response = await $api<Paginated<Payment>>(
          `/students/${studentId}/payments`,
          {
            params: filters,
          }
        );

        this.payments = response.data;
        this.pagination = {
          current_page: response.current_page,
          last_page: response.last_page,
          per_page: response.per_page,
          total: response.total,
        };

        return response;
      } catch (error: any) {
        this.error = error.message || "Failed to fetch student payments";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchInvoicePayments(invoiceId: number, filters?: BaseFilters) {
      this.loading = true;
      this.error = null;

      try {
        const { $api } = useNuxtApp();
        const response = await $api<Paginated<Payment>>(
          `/invoices/${invoiceId}/payments`,
          {
            params: filters,
          }
        );

        this.payments = response.data;
        this.pagination = {
          current_page: response.current_page,
          last_page: response.last_page,
          per_page: response.per_page,
          total: response.total,
        };

        return response;
      } catch (error: any) {
        this.error = error.message || "Failed to fetch invoice payments";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createPayment(input: CreatePaymentInput) {
      this.loading = true;
      this.error = null;

      try {
        const { $api } = useNuxtApp();
        const response = await $api<{ data: Payment }>("/payments", {
          method: "POST",
          body: input,
        });

        this.payments.unshift(response.data);
        return response.data;
      } catch (error: any) {
        this.error = error.message || "Failed to create payment";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updatePayment(id: number, input: UpdatePaymentInput) {
      this.loading = true;
      this.error = null;

      try {
        const { $api } = useNuxtApp();
        const response = await $api<{ data: Payment }>(`/payments/${id}`, {
          method: "PUT",
          body: input,
        });

        const index = this.payments.findIndex((p) => p.id === id);
        if (index !== -1) {
          this.payments[index] = response.data;
        }

        if (this.currentPayment?.id === id) {
          this.currentPayment = response.data;
        }

        return response.data;
      } catch (error: any) {
        this.error = error.message || "Failed to update payment";
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
        await $api(`/payments/${id}`, {
          method: "DELETE",
        });

        this.payments = this.payments.filter((p) => p.id !== id);

        if (this.currentPayment?.id === id) {
          this.currentPayment = null;
        }
      } catch (error: any) {
        this.error = error.message || "Failed to delete payment";
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
    getPaymentById: (state) => (id: number) => {
      return state.payments.find((p) => p.id === id);
    },

    getPaymentsByStudent: (state) => (studentId: number) => {
      return state.payments.filter((p) => p.student_id === studentId);
    },

    getPaymentsByInvoice: (state) => (invoiceId: number) => {
      return state.payments.filter((p) => p.fee_invoice_id === invoiceId);
    },

    getPaymentsByStatus: (state) => (status: Payment["status"]) => {
      return state.payments.filter((p) => p.status === status);
    },

    getCompletedPayments: (state) => {
      return state.payments.filter((p) => p.status === "completed");
    },

    getTotalPaymentAmount: (state) => {
      return state.payments
        .filter((p) => p.status === "completed")
        .reduce((sum, p) => sum + p.amount, 0);
    },

    hasPayments: (state) => state.payments.length > 0,
  },
});
