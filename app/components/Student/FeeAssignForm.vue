<script setup lang="ts">
import type { SessionFee } from "~/types";
import type { CreateStudentFeeInput } from "~/types/models/student-fee";
import { useStudentFeeStore } from "~/stores/student-fee";
import { useSessionFeeStore } from "~/stores/session-fee";

const props = defineProps<{
  studentId: number;
  studentName?: string;
  academicSessionId: number;
  sessionGradeId?: number | null;
  showActions?: boolean;
}>();

const emit = defineEmits<{
  saved: [];
  cancel: [];
}>();

const toast = useToast();
const studentFeeStore = useStudentFeeStore();
const sessionFeeStore = useSessionFeeStore();

const loading = ref(false);
const checkedFees = ref<Set<number>>(new Set());
const selectedFees = ref<
  Array<{
    session_fee_id: number;
    fee_name: string;
    grade_name?: string;
    amount: number | null;
    discount_type: "flat" | "percent" | null;
    discount_value: number | null;
  }>
>([]);

const availableSessionFees = ref<SessionFee[]>([]);
const loadingFees = ref(false);

// Auto load when mounted or props change
watch(
  [() => props.academicSessionId, () => props.sessionGradeId],
  async () => {
    await loadSessionFees();
  },
  { immediate: true }
);

async function loadSessionFees() {
  loadingFees.value = true;
  try {
    if (!props.academicSessionId) {
      availableSessionFees.value = [];
      return;
    }
    await sessionFeeStore.fetchList({
      academic_session_id: props.academicSessionId,
      grade_id: props.sessionGradeId ?? undefined,
      only_active: true,
      per_page: 100,
    });
    availableSessionFees.value = sessionFeeStore.items;
  } catch (error: any) {
    toast.add({
      title: "Failed to load fees",
      description: error.message,
      color: "error",
    });
  } finally {
    loadingFees.value = false;
  }
}

function toggleFeeSelection(sessionFeeId: number) {
  if (checkedFees.value.has(sessionFeeId)) {
    checkedFees.value.delete(sessionFeeId);
    selectedFees.value = selectedFees.value.filter(
      (f) => f.session_fee_id !== sessionFeeId
    );
  } else {
    checkedFees.value.add(sessionFeeId);
    const fee = availableSessionFees.value.find((f) => f.id === sessionFeeId);
    if (fee) {
      selectedFees.value.push({
        session_fee_id: fee.id,
        fee_name: fee.fee?.name || "Fee",
        grade_name: fee.grade?.name || "",
        amount:
          fee.amount !== undefined && fee.amount !== null
            ? Number(fee.amount)
            : null,
        discount_type: null,
        discount_value: null,
      });
    }
  }
}

function getSessionFeeAmount(sessionFeeId: number): number {
  const fee = availableSessionFees.value.find((f) => f.id === sessionFeeId);
  const amount = fee?.amount;
  const asNumber = typeof amount === "string" ? Number(amount) : amount;
  return asNumber ? Number(asNumber) : 0;
}

function getRowAmount(fee: {
  session_fee_id: number;
  amount: number | null;
}): number {
  if (fee.amount !== null && fee.amount !== undefined) {
    return Number(fee.amount) || 0;
  }
  return getSessionFeeAmount(fee.session_fee_id);
}

function calculateNetAmount(fee: {
  session_fee_id: number;
  amount: number | null;
  discount_type: "flat" | "percent" | null;
  discount_value: number | null;
}): number {
  const amount = getRowAmount(fee);
  if (!fee.discount_type || !fee.discount_value) return amount;

  if (fee.discount_type === "flat") {
    return Math.max(0, amount - fee.discount_value);
  }

  return Math.max(0, amount - (amount * fee.discount_value) / 100);
}

async function saveFees() {
  if (selectedFees.value.length === 0) {
    toast.add({
      title: "No fees selected",
      description: "Please select at least one fee",
      color: "warning",
    });
    return;
  }

  const hasInvalidFee = selectedFees.value.some((f) => {
    const amount = getRowAmount(f);
    return !f.session_fee_id || amount <= 0;
  });

  if (hasInvalidFee) {
    toast.add({
      title: "Invalid fee data",
      description:
        "Please select a session fee and ensure the amount is greater than zero.",
      color: "error",
    });
    return;
  }

  loading.value = true;
  try {
    for (const fee of selectedFees.value) {
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
      description: `${selectedFees.value.length} fee(s) assigned successfully`,
      color: "success",
    });

    emit("saved");
    resetForm();
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

function resetForm() {
  selectedFees.value = [];
  checkedFees.value.clear();
}

function handleCancel() {
  resetForm();
  emit("cancel");
}

// Expose methods for parent components
defineExpose({
  saveFees,
  resetForm,
});
</script>

<template>
  <div class="space-y-4">
    <div v-if="loadingFees" class="flex items-center justify-center py-8">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin" />
      <span class="ml-2 text-sm text-gray-600 dark:text-gray-400">
        Loading fees...
      </span>
    </div>

    <div v-else-if="availableSessionFees.length === 0" class="text-center py-8">
      <p class="text-sm text-gray-500 dark:text-gray-400">
        No fees available for this session
      </p>
    </div>

    <template v-else>
      <div class="space-y-3 max-h-[60vh] overflow-y-auto">
        <div
          v-for="fee in availableSessionFees"
          :key="fee.id"
          class="flex flex-col gap-2 py-3 px-4 border rounded-lg dark:border-gray-700 transition-colors"
          :class="{
            'bg-primary-50 dark:bg-primary-950 border-primary-200 dark:border-primary-800':
              checkedFees.has(fee.id),
          }"
        >
          <!-- Checkbox + Fee Info -->
          <div class="flex items-start gap-3">
            <UCheckbox
              :checked="checkedFees.has(fee.id)"
              @update:checked="toggleFeeSelection(fee.id)"
              :disabled="loading"
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{ fee.fee?.name || "Fee" }}
                <span
                  v-if="fee.grade?.name"
                  class="text-xs text-gray-600 dark:text-gray-400 ml-1"
                >
                  ({{ fee.grade.name }})
                </span>
              </p>
              <p class="text-xs text-gray-600 dark:text-gray-400">
                Default Amount: Tk {{ Number(fee.amount || 0).toFixed(0) }}
              </p>
            </div>
          </div>

          <!-- Amount & Discount Fields -->
          <div class="grid grid-cols-12 gap-3 pl-7">
            <div class="col-span-12 sm:col-span-3">
              <UInput
                :model-value="
                  selectedFees.find((f) => f.session_fee_id === fee.id)
                    ?.amount || ''
                "
                @update:model-value="
                  (val) => {
                    const selectedFee = selectedFees.find(
                      (f) => f.session_fee_id === fee.id
                    );
                    if (selectedFee)
                      selectedFee.amount = val ? Number(val) : null;
                  }
                "
                type="number"
                label="Amount"
                placeholder="Amount"
                min="0"
                step="0.01"
                :disabled="!checkedFees.has(fee.id) || loading"
                size="sm"
              />
            </div>

            <div class="col-span-12 sm:col-span-3">
              <USelect
                :model-value="
                  selectedFees.find((f) => f.session_fee_id === fee.id)
                    ?.discount_type || null
                "
                @update:model-value="
                  (val) => {
                    const selectedFee = selectedFees.find(
                      (f) => f.session_fee_id === fee.id
                    );
                    if (selectedFee) {
                      selectedFee.discount_type = val as
                        | 'flat'
                        | 'percent'
                        | null;
                      if (!val) selectedFee.discount_value = null;
                    }
                  }
                "
                label="Discount Type"
                :items="[
                  { label: 'No Discount', value: null },
                  { label: 'Flat', value: 'flat' },
                  { label: 'Percent', value: 'percent' },
                ]"
                placeholder="No Discount"
                :popper="{ strategy: 'fixed' }"
                :disabled="!checkedFees.has(fee.id) || loading"
                size="sm"
              />
            </div>

            <div class="col-span-12 sm:col-span-3">
              <UInput
                :model-value="
                  selectedFees.find((f) => f.session_fee_id === fee.id)
                    ?.discount_value || ''
                "
                @update:model-value="
                  (val) => {
                    const selectedFee = selectedFees.find(
                      (f) => f.session_fee_id === fee.id
                    );
                    if (selectedFee)
                      selectedFee.discount_value = val ? Number(val) : null;
                  }
                "
                type="number"
                label="Discount Value"
                :placeholder="
                  selectedFees.find((f) => f.session_fee_id === fee.id)
                    ?.discount_type === 'percent'
                    ? 'Percent'
                    : 'Amount'
                "
                :disabled="
                  !checkedFees.has(fee.id) ||
                  !selectedFees.find((f) => f.session_fee_id === fee.id)
                    ?.discount_type ||
                  loading
                "
                min="0"
                :step="
                  selectedFees.find((f) => f.session_fee_id === fee.id)
                    ?.discount_type === 'percent'
                    ? '1'
                    : '0.01'
                "
                size="sm"
              />
            </div>

            <div class="col-span-12 sm:col-span-3">
              <div>
                <label
                  class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Net Amount
                </label>
                <div
                  class="text-base font-semibold"
                  :class="
                    checkedFees.has(fee.id)
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-gray-400 dark:text-gray-600'
                  "
                >
                  Tk
                  {{
                    checkedFees.has(fee.id)
                      ? calculateNetAmount(
                          selectedFees.find(
                            (f) => f.session_fee_id === fee.id
                          ) || {
                            session_fee_id: fee.id,
                            amount: Number(fee.amount || 0),
                            discount_type: null,
                            discount_value: null,
                          }
                        ).toFixed(0)
                      : "0"
                  }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <div
        v-if="selectedFees.length > 0"
        class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2 border dark:border-gray-700"
      >
        <div class="flex justify-between text-sm">
          <span class="text-gray-600 dark:text-gray-400">Total Fees:</span>
          <span class="font-medium">{{ selectedFees.length }}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-gray-600 dark:text-gray-400">Total Amount:</span>
          <span class="font-medium">
            Tk
            {{
              selectedFees
                .reduce((sum, f) => sum + getRowAmount(f), 0)
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
                .reduce((sum, f) => sum + calculateNetAmount(f), 0)
                .toFixed(0)
            }}
          </span>
        </div>
      </div>

      <!-- Actions (optional) -->
      <div v-if="showActions" class="flex justify-end gap-3 pt-4">
        <UButton
          label="Cancel"
          variant="outline"
          color="neutral"
          @click="handleCancel"
          :disabled="loading"
        />
        <UButton
          label="Assign Fees"
          color="primary"
          :loading="loading"
          @click="saveFees"
        />
      </div>
    </template>
  </div>
</template>
