<script setup lang="ts">
import type { SessionFee } from "~/types";
import type { CreateStudentFeeInput } from "~/types/models/student-fee";
import { useStudentFeeStore } from "~/stores/student-fee";
import { useSessionFeeStore } from "~/stores/session-fee";

const props = defineProps<{
  open: boolean;
  studentId: number;
  studentName: string;
  academicSessionId: number;
  sessionGradeId?: number | null;
}>();

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const toast = useToast();
const studentFeeStore = useStudentFeeStore();
const sessionFeeStore = useSessionFeeStore();

const loading = ref(false);
const selectedFees = ref<
  Array<{
    session_fee_id: number;
    fee_name: string;
    grade_name?: string;
    amount: number | null;
    discount_type: "flat" | "percent" | null;
    discount_value: number | null;
    is_checked: boolean;
  }>
>([]);

const availableSessionFees = ref<SessionFee[]>([]);
const loadingFees = ref(false);

// Load fees when academicSessionId changes
watchEffect(async () => {
  if (props.academicSessionId && props.open) {
    console.log("Loading fees for session:", props.academicSessionId);
    await loadSessionFees();
    initializeFees();
  }
});

watch(
  () => props.open,
  async (isOpen) => {
    console.log("Modal opened:", isOpen, {
      academicSessionId: props.academicSessionId,
    });
    if (!isOpen) {
      // Clear when modal closes
      selectedFees.value = [];
    }
  }
);

async function loadSessionFees() {
  loadingFees.value = true;
  try {
    if (!props.academicSessionId) {
      availableSessionFees.value = [];
      loadingFees.value = false;
      return;
    }

    // Fetch session fees with filters
    const response = await sessionFeeStore.fetchList({
      academic_session_id: props.academicSessionId,
      grade_id: props.sessionGradeId ?? undefined,
      only_active: true,
      per_page: 100,
    });

    // Assign fetched items to local ref
    availableSessionFees.value = sessionFeeStore.items;

    if (availableSessionFees.value.length === 0) {
      toast.add({
        title: "No fees available",
        description: "No active session fees found for this session/grade",
        color: "info",
      });
    }
  } catch (error: any) {
    console.error("Error loading session fees:", error);
    toast.add({
      title: "Failed to load fees",
      description: error?.data?.message || error.message || "Unknown error",
      color: "error",
    });
    availableSessionFees.value = [];
  } finally {
    loadingFees.value = false;
  }
}

function initializeFees() {
  if (!availableSessionFees.value || availableSessionFees.value.length === 0) {
    selectedFees.value = [];
    return;
  }

  selectedFees.value = availableSessionFees.value.map((fee) => ({
    session_fee_id: fee.id,
    fee_name: fee.fee?.name || "Fee",
    grade_name: fee.grade?.name || "",
    amount:
      fee.amount !== undefined && fee.amount !== null
        ? Number(fee.amount)
        : null,
    discount_type: null,
    discount_value: null,
    is_checked: false,
  }));
}

function removeFeeRow(index: number) {
  selectedFees.value.splice(index, 1);
}

async function saveFees() {
  const checkedFees = selectedFees.value.filter((f) => f.is_checked);

  if (checkedFees.length === 0) {
    toast.add({
      title: "No fees selected",
      description: "Please select at least one fee",
      color: "warning",
    });
    return;
  }

  loading.value = true;
  try {
    for (const fee of checkedFees) {
      const input: CreateStudentFeeInput = {
        student_id: props.studentId,
        academic_session_id: props.academicSessionId,
        session_fee_id: fee.session_fee_id,
        amount: fee.amount ?? undefined,
        discount_type: fee.discount_type,
        discount_value: fee.discount_value,
      };
      await studentFeeStore.createStudentFee(input);
    }

    toast.add({
      title: "Fees Assigned",
      description: `${checkedFees.length} fee(s) assigned successfully`,
      color: "success",
    });

    emit("saved");
    closeModal();
  } catch (error: any) {
    toast.add({
      title: "Failed to assign fees",
      description: error.message,
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

function closeModal() {
  selectedFees.value = [];
  emit("close");
}
</script>

<template>
  <UModal
    :open="open"
    @update:open="(val) => !val && closeModal()"
    title="Assign Fees"
    :description="studentName"
    :prevent-close="loading"
    :closeable="!loading"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <div class="space-y-4">
        <div v-if="loadingFees" class="text-center py-4">
          <p class="text-gray-600 dark:text-gray-400">Loading fees...</p>
        </div>

        <div v-else-if="selectedFees.length === 0" class="text-center py-4">
          <p class="text-gray-600 dark:text-gray-400">No fees available</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="(fee, index) in selectedFees"
            :key="index"
            class="border rounded-lg p-4 dark:border-gray-700"
            :class="
              fee.is_checked
                ? 'bg-primary-50 dark:bg-primary-950'
                : 'bg-gray-50 dark:bg-gray-800'
            "
          >
            <!-- Checkbox Row -->
            <div class="flex items-start gap-3">
              <UCheckbox v-model="fee.is_checked" class="mt-1" />

              <div class="flex-1">
                <!-- Fee Name and Amount -->
                <div class="mb-3">
                  <p class="font-semibold text-gray-900 dark:text-white">
                    {{ fee.fee_name }}
                    <span
                      v-if="fee.grade_name"
                      class="text-sm font-normal text-gray-500 dark:text-gray-400"
                    >
                      ({{ fee.grade_name }})
                    </span>
                  </p>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Amount: <span class="font-medium">Tk {{ fee.amount }}</span>
                  </p>
                </div>

                <!-- Discount Section (Only visible when checked) -->
                <div
                  v-if="fee.is_checked"
                  class="space-y-3 pt-3 border-t dark:border-gray-600"
                >
                  <div class="grid grid-cols-2 gap-2">
                    <USelect
                      v-model="fee.discount_type"
                      :items="[
                        { label: 'No Discount', value: null },
                        { label: 'Flat', value: 'flat' },
                        { label: 'Percent', value: 'percent' },
                      ]"
                      placeholder="Discount Type"
                      :popper="{ strategy: 'fixed' }"
                      size="sm"
                    />

                    <UInput
                      v-model.number="fee.discount_value"
                      type="number"
                      :placeholder="
                        fee.discount_type === 'percent'
                          ? 'Percent %'
                          : 'Amount Tk'
                      "
                      :disabled="!fee.discount_type"
                      min="0"
                      :step="fee.discount_type === 'percent' ? '1' : '0.01'"
                      size="sm"
                    />
                  </div>

                  <!-- Net Amount Display -->
                  <div
                    v-if="fee.discount_type && fee.discount_value"
                    class="bg-white dark:bg-gray-700 p-2 rounded flex justify-between items-center"
                  >
                    <span class="text-sm text-gray-600 dark:text-gray-300">
                      Net Amount:
                    </span>
                    <span
                      class="font-semibold text-primary-600 dark:text-primary-400"
                    >
                      Tk
                      {{
                        (fee.discount_type === "flat"
                          ? Math.max(0, fee.amount! - fee.discount_value)
                          : Math.max(
                              0,
                              fee.amount! -
                                (fee.amount! * fee.discount_value) / 100
                            )
                        ).toFixed(0)
                      }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Summary -->
        <div
          v-if="selectedFees.some((f) => f.is_checked)"
          class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2 mt-4"
        >
          <div class="flex justify-between text-sm">
            <span class="text-gray-600 dark:text-gray-400">Selected Fees:</span>
            <span class="font-medium">{{
              selectedFees.filter((f) => f.is_checked).length
            }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600 dark:text-gray-400">Total Amount:</span>
            <span class="font-medium">
              Tk
              {{
                selectedFees
                  .filter((f) => f.is_checked)
                  .reduce((sum, f) => sum + (f.amount || 0), 0)
                  .toFixed(0)
              }}
            </span>
          </div>
          <div
            class="flex justify-between text-base border-t pt-2 dark:border-gray-700"
          >
            <span class="font-semibold text-gray-700 dark:text-gray-300">
              Total Payable:
            </span>
            <span
              class="font-bold text-primary-600 dark:text-primary-400 text-lg"
            >
              Tk
              {{
                selectedFees
                  .filter((f) => f.is_checked)
                  .reduce((sum, f) => {
                    const amount = f.amount || 0;
                    if (!f.discount_type || !f.discount_value)
                      return sum + amount;
                    if (f.discount_type === "flat") {
                      return sum + Math.max(0, amount - f.discount_value);
                    }
                    return (
                      sum +
                      Math.max(0, amount - (amount * f.discount_value) / 100)
                    );
                  }, 0)
                  .toFixed(0)
              }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <UButton
        label="Cancel"
        variant="outline"
        color="neutral"
        @click="closeModal"
        :disabled="loading"
      />
      <UButton
        label="Assign Fees"
        color="primary"
        :loading="loading"
        @click="saveFees"
      />
    </template>
  </UModal>
</template>
