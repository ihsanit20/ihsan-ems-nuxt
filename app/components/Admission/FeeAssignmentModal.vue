<script setup lang="ts">
import type { Fee } from "~/types";
import type { CreateStudentFeeInput } from "~/types/models/student-fee";
import { useStudentFeeStore } from "~/stores/student-fee";

const props = defineProps<{
  open: boolean;
  studentId: number;
  studentName: string;
  academicSessionId: number;
}>();

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const toast = useToast();
const studentFeeStore = useStudentFeeStore();
const feeStore = useFeeStore();

// State
const loading = ref(false);
const selectedFees = ref<
  Array<{
    fee_id: number;
    fee_name: string;
    amount: number;
    discount_type: "flat" | "percent" | null;
    discount_value: number | null;
  }>
>([]);

// Load available fees
const availableFees = ref<Fee[]>([]);
const loadingFees = ref(false);

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      await loadFees();
      if (selectedFees.value.length === 0) {
        addFeeRow();
      }
    }
  }
);

async function loadFees() {
  loadingFees.value = true;
  try {
    await feeStore.fetchList({ is_active: true, per_page: 100 });
    availableFees.value = feeStore.items;
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

// Add fee row
function addFeeRow() {
  selectedFees.value.push({
    fee_id: 0,
    fee_name: "",
    amount: 0,
    discount_type: null,
    discount_value: null,
  });
}

// Remove fee row
function removeFeeRow(index: number) {
  selectedFees.value.splice(index, 1);
}

// Update fee selection
function onFeeSelect(index: number, feeId: number) {
  const fee = availableFees.value.find((f) => f.id === feeId);
  const selectedFee = selectedFees.value[index];
  if (fee && selectedFee) {
    selectedFee.fee_id = fee.id;
    selectedFee.fee_name = fee.name;
  }
}

// Calculate net amount after discount
function calculateNetAmount(
  amount: number,
  discountType: "flat" | "percent" | null,
  discountValue: number | null
): number {
  if (!discountType || !discountValue) return amount;

  if (discountType === "flat") {
    return Math.max(0, amount - discountValue);
  } else {
    return Math.max(0, amount - (amount * discountValue) / 100);
  }
}

// Validate and save fees
async function saveFees() {
  if (selectedFees.value.length === 0) {
    toast.add({
      title: "No fees selected",
      description: "Please add at least one fee",
      color: "warning",
    });
    return;
  }

  // Validate
  const hasInvalidFee = selectedFees.value.some(
    (f) => !f.fee_id || f.amount <= 0
  );
  if (hasInvalidFee) {
    toast.add({
      title: "Invalid fee data",
      description: "Please select a fee and enter valid amount for all rows",
      color: "error",
    });
    return;
  }

  loading.value = true;
  try {
    // Create student fees one by one
    for (const fee of selectedFees.value) {
      const input: CreateStudentFeeInput = {
        student_id: props.studentId,
        academic_session_id: props.academicSessionId,
        fee_id: fee.fee_id,
        amount: fee.amount,
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

// Skip for now
function skipForNow() {
  closeModal();
}

// Close and reset
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
        <!-- Fee Rows -->
        <div
          v-for="(fee, index) in selectedFees"
          :key="index"
          class="grid grid-cols-12 gap-3 items-start p-4 border rounded-lg dark:border-gray-700"
        >
          <!-- Fee Selection -->
          <div class="col-span-12 sm:col-span-4">
            <USelect
              v-model="fee.fee_id"
              :items="
                availableFees.map((f) => ({ label: f.name, value: f.id }))
              "
              placeholder="Select Fee"
              :loading="loadingFees"
              :popper="{ strategy: 'fixed' }"
              @update:model-value="(val) => onFeeSelect(index, val as number)"
            />
          </div>

          <!-- Amount -->
          <div class="col-span-6 sm:col-span-2">
            <UInput
              v-model.number="fee.amount"
              type="number"
              placeholder="Amount"
              min="0"
              step="0.01"
            />
          </div>

          <!-- Discount Type -->
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

          <!-- Discount Value -->
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

          <!-- Net Amount Display -->
          <div
            class="col-span-5 sm:col-span-1 flex items-center justify-center"
          >
            <span
              class="text-sm font-medium text-primary-600 dark:text-primary-400"
            >
              ৳{{
                calculateNetAmount(
                  fee.amount,
                  fee.discount_type,
                  fee.discount_value
                ).toFixed(0)
              }}
            </span>
          </div>

          <!-- Remove Button -->
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

        <!-- Add Fee Button -->
        <UButton
          icon="i-heroicons-plus"
          variant="outline"
          @click="addFeeRow"
          block
        >
          Add Another Fee
        </UButton>

        <!-- Summary -->
        <div
          v-if="selectedFees.length > 0"
          class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2"
        >
          <div class="flex justify-between text-sm">
            <span class="text-gray-600 dark:text-gray-400">Total Fees:</span>
            <span class="font-medium">{{ selectedFees.length }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600 dark:text-gray-400">
              Total Amount:
            </span>
            <span class="font-medium">
              ৳{{
                selectedFees
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
              ৳{{
                selectedFees
                  .reduce(
                    (sum, f) =>
                      sum +
                      calculateNetAmount(
                        f.amount,
                        f.discount_type,
                        f.discount_value
                      ),
                    0
                  )
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
