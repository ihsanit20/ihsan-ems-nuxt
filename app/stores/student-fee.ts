import { defineStore } from "pinia";
import type {
  StudentFee,
  CreateStudentFeeInput,
  UpdateStudentFeeInput,
  BulkAssignStudentFeesInput,
  BulkUpdateStudentFeesInput,
} from "~/types/models/student-fee";
import type { Paginated, BaseFilters } from "~/types/common";

interface StudentFeeState {
  studentFees: StudentFee[];
  currentStudentFee: StudentFee | null;
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  loading: boolean;
  error: string | null;
}

export const useStudentFeeStore = defineStore("studentFee", {
  state: (): StudentFeeState => ({
    studentFees: [],
    currentStudentFee: null,
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
    async fetchStudentFees(filters?: BaseFilters) {
      this.loading = true;
      this.error = null;

      try {
        const { $api } = useNuxtApp();
        const response = await $api<Paginated<StudentFee>>(
          "/api/v1/student-fees",
          {
            query: filters,
          }
        );

        this.studentFees = response.data;
        this.pagination = {
          current_page: response.current_page,
          last_page: response.last_page,
          per_page: response.per_page,
          total: response.total,
        };

        return response;
      } catch (error: any) {
        this.error = error.message || "Failed to fetch student fees";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchStudentFee(id: number) {
      this.loading = true;
      this.error = null;

      try {
        const { $api } = useNuxtApp();
        const response = await $api<{ data: StudentFee }>(
          `/api/v1/student-fees/${id}`
        );

        this.currentStudentFee = response.data;
        return response.data;
      } catch (error: any) {
        this.error = error.message || "Failed to fetch student fee";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createStudentFee(input: CreateStudentFeeInput) {
      this.loading = true;
      this.error = null;

      try {
        const { $api } = useNuxtApp();
        const response = await $api<{ data: StudentFee }>(
          "/api/v1/student-fees",
          {
            method: "POST",
            body: input,
          }
        );

        this.studentFees.unshift(response.data);
        return response.data;
      } catch (error: any) {
        this.error = error.message || "Failed to create student fee";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateStudentFee(id: number, input: UpdateStudentFeeInput) {
      this.loading = true;
      this.error = null;

      try {
        const { $api } = useNuxtApp();
        const response = await $api<{ data: StudentFee }>(
          `/api/v1/student-fees/${id}`,
          {
            method: "PUT",
            body: input,
          }
        );

        const index = this.studentFees.findIndex((sf) => sf.id === id);
        if (index !== -1) {
          this.studentFees[index] = response.data;
        }

        if (this.currentStudentFee?.id === id) {
          this.currentStudentFee = response.data;
        }

        return response.data;
      } catch (error: any) {
        this.error = error.message || "Failed to update student fee";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deleteStudentFee(id: number) {
      this.loading = true;
      this.error = null;

      try {
        const { $api } = useNuxtApp();
        await $api(`/api/v1/student-fees/${id}`, {
          method: "DELETE",
        });

        this.studentFees = this.studentFees.filter((sf) => sf.id !== id);

        if (this.currentStudentFee?.id === id) {
          this.currentStudentFee = null;
        }
      } catch (error: any) {
        this.error = error.message || "Failed to delete student fee";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async bulkAssignStudentFees(input: BulkAssignStudentFeesInput) {
      this.loading = true;
      this.error = null;

      try {
        const { $api } = useNuxtApp();
        const response = await $api<{ data: StudentFee[] }>(
          "/api/v1/student-fees/bulk-assign",
          {
            method: "POST",
            body: input,
          }
        );

        // Add new student fees to the beginning of the list
        this.studentFees = [...response.data, ...this.studentFees];
        return response.data;
      } catch (error: any) {
        this.error = error.message || "Failed to bulk assign student fees";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async bulkUpdateStudentFees(input: BulkUpdateStudentFeesInput) {
      this.loading = true;
      this.error = null;

      try {
        const { $api } = useNuxtApp();
        const response = await $api<{ data: StudentFee[] }>(
          "/api/v1/student-fees/bulk-update",
          {
            method: "POST",
            body: input,
          }
        );

        // Update the student fees in the list
        response.data.forEach((updatedFee) => {
          const index = this.studentFees.findIndex(
            (sf) => sf.id === updatedFee.id
          );
          if (index !== -1) {
            this.studentFees[index] = updatedFee;
          }
        });

        return response.data;
      } catch (error: any) {
        this.error = error.message || "Failed to bulk update student fees";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    clearError() {
      this.error = null;
    },

    resetState() {
      this.studentFees = [];
      this.currentStudentFee = null;
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
    getStudentFeeById: (state) => (id: number) => {
      return state.studentFees.find((sf) => sf.id === id);
    },

    getStudentFeesByStudent: (state) => (studentId: number) => {
      return state.studentFees.filter((sf) => sf.student_id === studentId);
    },

    getStudentFeesBySession: (state) => (sessionId: number) => {
      return state.studentFees.filter(
        (sf) => sf.academic_session_id === sessionId
      );
    },

    hasStudentFees: (state) => state.studentFees.length > 0,
  },
});
