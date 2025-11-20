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
  }>
>([]);

const availableSessionFees = ref<SessionFee[]>([]);
const loadingFees = ref(false);

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      await loadSessionFees();
      if (selectedFees.value.length === 0) {
        addFeeRow();
      }
    }
  }
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

function addFeeRow() {
  selectedFees.value.push({
    session_fee_id: 0,
    fee_name: "",
    grade_name: "",
    amount: null,
    discount_type: null,
    discount_value: null,
  });
}

function removeFeeRow(index: number) {
  selectedFees.value.splice(index, 1);
}

function onFeeSelect(index: number, sessionFeeId: number) {
  const fee = availableSessionFees.value.find((f) => f.id === sessionFeeId);
  const selectedFee = selectedFees.value[index];
  if (fee && selectedFee) {
    selectedFee.session_fee_id = fee.id;
    selectedFee.fee_name = fee.fee?.name || "Fee";
    selectedFee.grade_name = fee.grade?.name || "";
    selectedFee.amount =
      fee.amount !== undefined && fee.amount !== null
        ? Number(fee.amount)
        : null;
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

function calculateNetAmount(
  fee: {
    session_fee_id: number;
    amount: number | null;
    discount_type: "flat" | "percent" | null;
    discount_value: number | null;
  }
): number {
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
      description: "Please add at least one fee",
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

function skipForNow() {
  closeModal();
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
    title="Assign Fees to Student"
    :description="studentName"
    :prevent-close="loading"
    :closeable="!loading"
    :ui="{ footer: 'justify-between' }"
  >
    <template #body>
      <div class="space-y-4">
        <div
          v-for="(fee, index) in selectedFees"
          :key="index"
          class="grid grid-cols-12 gap-3 items-start p-4 border rounded-lg dark:border-gray-700"
        >
          <div class="col-span-12 sm:col-span-4">
            <USelect
              v-model="fee.session_fee_id"
              :items="
                availableSessionFees.map((f) => ({
                  label: `${f.fee?.name || 'Fee'}${
                    f.grade?.name ? ` (${f.grade.name})` : ''
                  }`,
                  value: f.id,
                }))
              "
              placeholder="Select Session Fee"
              :loading="loadingFees"
              :popper="{ strategy: 'fixed' }"
              @update:model-value="(val) => onFeeSelect(index, val as number)"
            />
          </div>

          <div class="col-span-6 sm:col-span-2">
            <UInput
              v-model.number="fee.amount"
              type="number"
              placeholder="Amount"
              min="0"
              step="0.01"
            />
          </div>

          <div class="col-span-6 sm:col-span-2">
            <USelect
              v-model="fee.discount_type"
              :items="[
                { label: 'No Discount', value: null },
                { label: 'Flat', value: 'flat' },
                { label: 'Percent', value: 'percent' },
              ]"
              placeholder="Discount"
              :popper="{ strategy: 'fixed' }"
            />
          </div>

          <div class="col-span-6 sm:col-span-2">
            <UInput
              v-model.number="fee.discount_value"
              type="number"
              :placeholder="
                fee.discount_type === 'percent' ? 'Percent' : 'Amount'
              "
              :disabled="!fee.discount_type"
              min="0"
              :step="fee.discount_type === 'percent' ? '1' : '0.01'"
            />
          </div>

          <div
            class="col-span-5 sm:col-span-1 flex items-center justify-center"
          >
            <span
              class="text-sm font-medium text-primary-600 dark:text-primary-400"
            >
              Tk {{ calculateNetAmount(fee).toFixed(0) }}
            </span>
          </div>

          <div class="col-span-1 sm:col-span-1 flex items-center justify-end">
            <UButton
              icon="i-heroicons-trash"
              variant="ghost"
              color="error"
              size="sm"
              @click="removeFeeRow(index)"
              :disabled="selectedFees.length === 1"
            />
          </div>
        </div>

        <UButton
          icon="i-heroicons-plus"
          variant="outline"
          @click="addFeeRow"
          block
        >
          Add Another Fee
        </UButton>

        <div
          v-if="selectedFees.length > 0"
          class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2"
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
      </div>
    </template>

    <template #footer>
      <UButton
        label="Skip for Now"
        variant="ghost"
        @click="skipForNow"
        :disabled="loading"
      />
      <div class="flex gap-3">
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
      </div>
    </template>
  </UModal>
</template>
