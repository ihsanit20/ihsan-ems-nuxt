<script setup lang="ts">
definePageMeta({
  layout: "admin",
  middleware: "auth",
  requiresAuth: true,
  roles: ["Owner", "Admin", "Developer"],
});

import { useHead, useToast } from "#imports";
import { useRouter } from "vue-router";
import type {
  CreateFeeInvoiceInput,
  CreateFeeInvoiceItemInput,
} from "~/types/models/fee-invoice";
import type { SessionFee } from "~/types";

useHead({ title: "Create Invoice" });

const toast = useToast();
const router = useRouter();

const invoiceStore = useFeeInvoiceStore();
const studentStore = useStudentStore();
const sessionStore = useSessionStore();
const sessionFeeStore = useSessionFeeStore();

const { loading: invoiceLoading } = storeToRefs(invoiceStore);

/* ---------------- Form State ---------------- */
const form = reactive({
  student_id: null as number | null,
  academic_session_id: null as number | null,
  invoice_date: new Date().toISOString().split("T")[0],
  due_date: null as string | null,
  items: [] as Array<{
    session_fee_id: number;
    fee_name: string;
    amount: number;
    discount_amount: number;
    net_amount: number;
    description?: string;
  }>,
});

const errors = reactive<Record<string, string>>({});

/* ---------------- Student Search ---------------- */
const studentSearchQuery = ref("");
const studentSearchResults = ref<any[]>([]);
const studentSearchLoading = ref(false);
const selectedStudent = ref<any>(null);

// Debounced student search
let searchTimeout: ReturnType<typeof setTimeout>;
const debouncedStudentSearch = async (query: string) => {
  clearTimeout(searchTimeout);

  if (!query || query.length < 2) {
    studentSearchResults.value = [];
    return;
  }

  searchTimeout = setTimeout(async () => {
    studentSearchLoading.value = true;
    try {
      await studentStore.fetchList();
      // Filter results locally
      studentSearchResults.value = studentStore.items
        .filter(
          (s) =>
            s.name_bn?.toLowerCase().includes(query.toLowerCase()) ||
            s.name_en?.toLowerCase().includes(query.toLowerCase()) ||
            s.student_code?.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 10);
    } catch (e: any) {
      toast.add({
        color: "error",
        title: "Search failed",
        description: e?.data?.message || e?.message,
      });
    } finally {
      studentSearchLoading.value = false;
    }
  }, 500);
};

watch(studentSearchQuery, (val) => {
  debouncedStudentSearch(val);
});

function selectStudent(student: any) {
  selectedStudent.value = student;
  form.student_id = student.id;
  form.academic_session_id =
    student.enrollments?.[0]?.academic_session_id || null;
  studentSearchQuery.value =
    student.name_bn || student.name_en || student.student_code;
  studentSearchResults.value = [];

  // Load session fees after student selection
  if (form.academic_session_id) {
    loadSessionFees();
  }
}

/* ---------------- Session Fees ---------------- */
const availableSessionFees = ref<SessionFee[]>([]);
const sessionFeesLoading = ref(false);

// Filter out already added fees
const availableFeesToAdd = computed(() => {
  return availableSessionFees.value.filter(
    (sessionFee) =>
      !form.items.some((item) => item.session_fee_id === sessionFee.id)
  );
});

async function loadSessionFees() {
  if (!form.academic_session_id || !selectedStudent.value) return;

  sessionFeesLoading.value = true;
  try {
    const gradeId =
      selectedStudent.value.enrollments?.[0]?.sessionGrade?.grade?.id;

    await sessionFeeStore.fetchList({
      academic_session_id: form.academic_session_id,
      grade_id: gradeId || undefined,
      only_active: true,
      per_page: 100,
    });

    availableSessionFees.value = sessionFeeStore.items;
  } catch (e: any) {
    toast.add({
      color: "error",
      title: "Failed to load fees",
      description: e?.data?.message || e?.message,
    });
  } finally {
    sessionFeesLoading.value = false;
  }
}

/* ---------------- Add Fee Item ---------------- */
const addFeeOpen = ref(false);
const selectedSessionFee = ref<SessionFee | null>(null);

async function openAddFee() {
  if (!form.student_id || !form.academic_session_id) {
    toast.add({
      color: "warning",
      title: "Select student first",
      description: "Please select a student before adding fees",
    });
    return;
  }

  // Load fees if not already loaded
  if (availableSessionFees.value.length === 0) {
    await loadSessionFees();
  }

  addFeeOpen.value = true;
}

function addFeeToInvoice(sessionFee: SessionFee) {
  const amount = Number(sessionFee.amount) || 0;
  const existingItem = form.items.find(
    (item) => item.session_fee_id === sessionFee.id
  );

  if (existingItem) {
    toast.add({
      color: "warning",
      title: "Fee already added",
      description: "This fee is already in the invoice",
    });
    return;
  }

  form.items.push({
    session_fee_id: sessionFee.id,
    fee_name: sessionFee.fee?.name || "Fee",
    amount: amount,
    discount_amount: 0,
    net_amount: amount,
    description: undefined,
  });

  addFeeOpen.value = false;
  recalculateAmounts();
}

function removeFeeItem(index: number) {
  form.items.splice(index, 1);
  recalculateAmounts();
}

/* ---------------- Calculations ---------------- */
const totalAmount = computed(() =>
  form.items.reduce((sum, item) => sum + item.amount, 0)
);

const totalDiscount = computed(() =>
  form.items.reduce((sum, item) => sum + item.discount_amount, 0)
);

const payableAmount = computed(() => totalAmount.value - totalDiscount.value);

function updateItemDiscount(index: number, discount: number) {
  const item = form.items[index];
  if (!item) return;
  item.discount_amount = Math.max(0, Math.min(discount, item.amount));
  item.net_amount = item.amount - item.discount_amount;
  recalculateAmounts();
}

function recalculateAmounts() {
  form.items.forEach((item) => {
    item.net_amount = item.amount - item.discount_amount;
  });
}

/* ---------------- Validation & Submit ---------------- */
function clearErrors() {
  Object.keys(errors).forEach((k) => delete (errors as any)[k]);
}

function validate(): boolean {
  clearErrors();

  if (!form.student_id) errors.student_id = "Student is required";
  if (!form.academic_session_id)
    errors.academic_session_id = "Session is required";
  if (!form.invoice_date) errors.invoice_date = "Invoice date is required";
  if (form.items.length === 0) errors.items = "Add at least one fee item";

  return Object.keys(errors).length === 0;
}

async function submitForm() {
  if (!validate()) {
    toast.add({ title: "Fix form errors", color: "error" });
    return;
  }

  const payload: CreateFeeInvoiceInput = {
    student_id: form.student_id!,
    academic_session_id: form.academic_session_id!,
    invoice_date: (form.invoice_date ||
      new Date().toISOString().split("T")[0]) as string,
    due_date: form.due_date || null,
    items: form.items.map((item) => ({
      session_fee_id: item.session_fee_id,
      description: item.description || null,
      amount: item.amount,
      discount_amount: item.discount_amount,
    })),
  };

  try {
    const created = await invoiceStore.createFeeInvoice(payload);
    toast.add({ title: "Invoice created successfully", color: "success" });
    router.push(`/admin/fees/invoices/${created.id}`);
  } catch (e: any) {
    toast.add({
      color: "error",
      title: "Create failed",
      description: e?.data?.message || e?.message || "Please try again",
    });
  }
}

function goBack() {
  router.back();
}
</script>

<template>
  <UContainer class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <UButton icon="i-lucide-arrow-left" variant="ghost" @click="goBack" />
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            Create Fee Invoice
          </h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Generate a new fee invoice for a student
          </p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left: Form -->
      <div class="lg:col-span-2 space-y-4">
        <UCard>
          <template #header>
            <h3 class="text-base font-semibold">Invoice Details</h3>
          </template>

          <div class="grid gap-4">
            <!-- Student Search -->
            <UFormField
              label="Student"
              name="student_id"
              :error="errors.student_id"
              required
            >
              <div class="relative">
                <UInput
                  v-model="studentSearchQuery"
                  placeholder="Search student by name or code..."
                  class="w-full"
                  :loading="studentSearchLoading"
                />

                <!-- Search Results Dropdown -->
                <div
                  v-if="studentSearchResults.length > 0"
                  class="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto"
                >
                  <button
                    v-for="student in studentSearchResults"
                    :key="student.id"
                    type="button"
                    class="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                    @click="selectStudent(student)"
                  >
                    <div class="font-medium">
                      {{ student.name_bn || student.name_en }}
                    </div>
                    <div class="text-xs text-gray-500">
                      {{ student.student_code }}
                    </div>
                  </button>
                </div>
              </div>

              <!-- Selected Student Display -->
              <div
                v-if="selectedStudent"
                class="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-md"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <div class="font-medium">
                      {{ selectedStudent.name_bn || selectedStudent.name_en }}
                    </div>
                    <div class="text-sm text-gray-500">
                      {{ selectedStudent.student_code }}
                    </div>
                  </div>
                  <UButton
                    icon="i-lucide-x"
                    variant="ghost"
                    size="sm"
                    @click="
                      selectedStudent = null;
                      form.student_id = null;
                      studentSearchQuery = '';
                    "
                  />
                </div>
              </div>
            </UFormField>

            <div class="grid grid-cols-2 gap-4">
              <UFormField
                label="Invoice Date"
                name="invoice_date"
                :error="errors.invoice_date"
                required
              >
                <UInput
                  v-model="form.invoice_date"
                  type="date"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Due Date" name="due_date">
                <UInput v-model="form.due_date" type="date" class="w-full" />
              </UFormField>
            </div>
          </div>
        </UCard>

        <!-- Fee Items -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-base font-semibold">Fee Items</h3>
              <UButton
                icon="i-lucide-plus"
                size="sm"
                @click="openAddFee"
                :disabled="!form.student_id"
              >
                Add Fee
              </UButton>
            </div>
          </template>

          <div
            v-if="form.items.length === 0"
            class="text-center py-8 text-gray-500"
          >
            No fees added yet. Click "Add Fee" to start.
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="(item, index) in form.items"
              :key="index"
              class="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div class="flex items-start justify-between mb-3">
                <div>
                  <div class="font-medium">{{ item.fee_name }}</div>
                  <div class="text-sm text-gray-500">
                    Amount: ৳{{ item.amount.toFixed(2) }}
                  </div>
                </div>
                <UButton
                  icon="i-lucide-trash-2"
                  variant="ghost"
                  color="error"
                  size="sm"
                  @click="removeFeeItem(index)"
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <UFormField
                  label="Discount Amount"
                  :name="`item_${index}_discount`"
                >
                  <UInput
                    :model-value="item.discount_amount"
                    @update:model-value="
                      updateItemDiscount(index, Number($event))
                    "
                    type="number"
                    min="0"
                    :max="item.amount"
                    placeholder="0.00"
                  />
                </UFormField>

                <UFormField label="Net Amount" :name="`item_${index}_net`">
                  <UInput
                    :model-value="item.net_amount.toFixed(2)"
                    disabled
                    class="bg-gray-50 dark:bg-gray-800"
                  />
                </UFormField>
              </div>

              <UFormField
                label="Description (Optional)"
                :name="`item_${index}_desc`"
                class="mt-3"
              >
                <UTextarea
                  v-model="item.description"
                  placeholder="Add a note..."
                />
              </UFormField>
            </div>
          </div>

          <div v-if="errors.items" class="mt-2 text-sm text-red-500">
            {{ errors.items }}
          </div>
        </UCard>
      </div>

      <!-- Right: Summary -->
      <div class="space-y-4">
        <UCard>
          <template #header>
            <h3 class="text-base font-semibold">Summary</h3>
          </template>

          <div class="space-y-3">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600 dark:text-gray-400"
                >Total Amount:</span
              >
              <span class="font-medium">৳{{ totalAmount.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600 dark:text-gray-400"
                >Total Discount:</span
              >
              <span class="font-medium text-green-600">
                -৳{{ totalDiscount.toFixed(2) }}
              </span>
            </div>
            <div class="border-t border-gray-200 dark:border-gray-700 pt-3">
              <div class="flex justify-between">
                <span class="font-semibold">Payable Amount:</span>
                <span class="font-bold text-lg text-primary">
                  ৳{{ payableAmount.toFixed(2) }}
                </span>
              </div>
            </div>
          </div>

          <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <UButton
              label="Create Invoice"
              color="primary"
              block
              :loading="invoiceLoading"
              :disabled="form.items.length === 0"
              @click="submitForm"
            />
          </div>
        </UCard>
      </div>
    </div>

    <!-- Add Fee Modal -->
    <UModal
      :open="addFeeOpen"
      @update:open="addFeeOpen = $event"
      title="Add Fee to Invoice"
      :description="
        selectedStudent
          ? `Adding fees for ${
              selectedStudent.name_bn || selectedStudent.name_en
            }`
          : 'Select a fee to add to this invoice'
      "
      :ui="{ body: 'max-h-96 overflow-y-auto' }"
    >
      <template #body>
        <div v-if="sessionFeesLoading" class="text-center py-8">
          <UIcon
            name="i-lucide-loader-2"
            class="h-8 w-8 animate-spin text-primary"
          />
          <p class="mt-2 text-sm text-gray-500">Loading available fees...</p>
        </div>

        <div
          v-else-if="!form.student_id"
          class="text-center py-8 text-gray-500"
        >
          <UIcon name="i-lucide-user-x" class="h-12 w-12 mx-auto mb-2" />
          <p class="font-medium">No Student Selected</p>
          <p class="text-sm mt-1">Please select a student first</p>
        </div>

        <div
          v-else-if="availableFeesToAdd.length === 0"
          class="text-center py-8 text-gray-500"
        >
          <UIcon name="i-lucide-inbox" class="h-12 w-12 mx-auto mb-2" />
          <p class="font-medium">
            {{
              availableSessionFees.length === 0
                ? "No fees available"
                : "All fees added"
            }}
          </p>
          <p class="text-sm mt-1">
            {{
              availableSessionFees.length === 0
                ? "No fees found for this student's grade/session"
                : "All available fees have been added to the invoice"
            }}
          </p>
        </div>

        <div v-else class="space-y-2">
          <button
            v-for="sessionFee in availableFeesToAdd"
            :key="sessionFee.id"
            type="button"
            class="w-full p-3 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            @click="addFeeToInvoice(sessionFee)"
          >
            <div class="flex justify-between items-start">
              <div>
                <div class="font-medium">{{ sessionFee.fee?.name }}</div>
                <div class="text-sm text-gray-500">
                  {{
                    sessionFee.fee?.billing_type === "recurring"
                      ? "Recurring"
                      : "One-time"
                  }}
                </div>
              </div>
              <div class="text-right">
                <div class="font-semibold">
                  ৳{{ Number(sessionFee.amount).toFixed(2) }}
                </div>
              </div>
            </div>
          </button>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
