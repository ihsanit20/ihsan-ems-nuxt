<script setup lang="ts">
definePageMeta({
  layout: "admin",
  middleware: "auth",
  requiresAuth: true,
  roles: ["Owner", "Admin", "Developer"],
});

import { useHead, useToast } from "#imports";
import { computed, h, onMounted, reactive, ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import type { TableColumn } from "@nuxt/ui";
import type { FeeInvoice, FeeInvoiceItem } from "~/types/models/fee-invoice";
import type { Payment, CreatePaymentInput } from "~/types/models/payment";

const UButton = resolveComponent("UButton");
const UBadge = resolveComponent("UBadge");

useHead({ title: "Invoice Details" });

const toast = useToast();
const router = useRouter();
const route = useRoute();

const invoiceStore = useFeeInvoiceStore();
const paymentStore = usePaymentStore();

const { loading: invoiceLoading } = storeToRefs(invoiceStore);
const { loading: paymentLoading } = storeToRefs(paymentStore);

const invoiceId = computed(() => Number(route.params.id));
const invoice = ref<FeeInvoice | null>(null);
const payments = ref<Payment[]>([]);

/* ---------------- Load Data ---------------- */
onMounted(async () => {
  await loadInvoice();
  await loadPayments();

  // Check if action=payment in query params
  if (route.query.action === "payment") {
    openPaymentModal();
  }
});

async function loadInvoice() {
  try {
    const data = await invoiceStore.fetchFeeInvoice(invoiceId.value);
    invoice.value = data;
  } catch (e: any) {
    toast.add({
      color: "error",
      title: "Failed to load invoice",
      description: e?.data?.message || e?.message,
    });
  }
}

async function loadPayments() {
  try {
    await paymentStore.fetchInvoicePayments(invoiceId.value);
    payments.value = paymentStore.payments;
  } catch (e: any) {
    toast.add({
      color: "error",
      title: "Failed to load payments",
      description: e?.data?.message || e?.message,
    });
  }
}

function viewReceipt(paymentId?: number | null) {
  if (!paymentId) return;
  router.push(`/admin/fees/payments/${paymentId}/receipt`);
}

/* ---------------- Invoice Items Table ---------------- */
const itemColumns: TableColumn<FeeInvoiceItem>[] = [
  {
    id: "sessionFee",
    accessorKey: "sessionFee",
    header: "Fee Name",
    cell: ({ row }) => {
      const sessionFee = row.getValue("sessionFee") as any;
      return h("div", { class: "font-medium" }, sessionFee?.fee?.name || "—");
    },
  },
  {
    id: "description",
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => row.getValue("description") || "—",
  },
  {
    id: "amount",
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) =>
      h(
        "div",
        { class: "text-right" },
        `৳${Number(row.getValue("amount") || 0).toFixed(2)}`
      ),
  },
  {
    id: "discount_amount",
    accessorKey: "discount_amount",
    header: "Discount",
    cell: ({ row }) =>
      h(
        "div",
        { class: "text-right text-green-600" },
        `৳${Number(row.getValue("discount_amount") || 0).toFixed(2)}`
      ),
  },
  {
    id: "net_amount",
    accessorKey: "net_amount",
    header: "Net Amount",
    cell: ({ row }) =>
      h(
        "div",
        { class: "text-right font-semibold" },
        `৳${Number(row.getValue("net_amount") || 0).toFixed(2)}`
      ),
  },
];

/* ---------------- Payment Columns ---------------- */
const paymentColumns: TableColumn<Payment>[] = [
  {
    id: "payment_date",
    accessorKey: "payment_date",
    header: "Date",
    cell: ({ row }) => formatDate(row.getValue("payment_date") as string),
  },
  {
    id: "method",
    accessorKey: "method",
    header: "Method",
    cell: ({ row }) => {
      const method = row.getValue("method") as string;
      return h("div", { class: "capitalize" }, method || "—");
    },
  },
  {
    id: "amount",
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) =>
      h(
        "div",
        { class: "text-right font-semibold text-green-600" },
        `৳${Number(row.getValue("amount") || 0).toFixed(2)}`
      ),
  },
  {
    id: "reference_no",
    accessorKey: "reference_no",
    header: "Reference",
    cell: ({ row }) => row.getValue("reference_no") || "—",
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return h(
        UBadge,
        {
          color: paymentStatusColor(status),
          variant: "subtle",
          class: "capitalize",
        },
        () => status || "unknown"
      );
    },
  },

  // ✅ NEW: Receipt Button Column
  {
    id: "receipt",
    header: "Receipt",
    cell: ({ row }) => {
      const payment = row.original;
      return h(UButton, {
        label: "Receipt",
        icon: "i-lucide-receipt",
        size: "xs",
        color: "primary",
        variant: "soft",
        onClick: () => viewReceipt(payment.id),
      });
    },
  },
];

/* ---------------- Payment Modal ---------------- */
const paymentModalOpen = ref(false);
const paymentForm = reactive({
  payment_date: new Date().toISOString().split("T")[0],
  method: "cash",
  amount: 0,
  reference_no: "",
  status: "completed" as "completed" | "pending" | "failed",
});

const paymentErrors = reactive<Record<string, string>>({});

const paymentMethods = [
  { label: "Cash", value: "cash" },
  { label: "bKash", value: "bkash" },
  { label: "Nagad", value: "nagad" },
  { label: "Bank Transfer", value: "bank" },
  { label: "Card", value: "card" },
  { label: "Other", value: "other" },
];

function openPaymentModal() {
  if (!invoice.value) return;

  const remaining = remainingAmount.value || 0;
  paymentForm.amount = Math.max(0, remaining);
  paymentForm.payment_date = new Date().toISOString().split("T")[0];
  paymentForm.method = "cash";
  paymentForm.reference_no = "";
  paymentForm.status = "completed";

  Object.keys(paymentErrors).forEach((k) => delete (paymentErrors as any)[k]);
  paymentModalOpen.value = true;
}

function validatePayment(): boolean {
  Object.keys(paymentErrors).forEach((k) => delete (paymentErrors as any)[k]);

  if (!paymentForm.payment_date) {
    paymentErrors.payment_date = "Payment date is required";
  }
  if (!paymentForm.method) {
    paymentErrors.method = "Payment method is required";
  }
  if (!paymentForm.amount || paymentForm.amount <= 0) {
    paymentErrors.amount = "Amount must be greater than 0";
  }
  if (
    paymentForm.amount >
    (invoice.value?.payable_amount || 0) - totalPaid.value
  ) {
    paymentErrors.amount = "Amount exceeds remaining balance";
  }

  return Object.keys(paymentErrors).length === 0;
}

async function submitPayment() {
  if (!validatePayment() || !invoice.value) return;

  const payload: CreatePaymentInput = {
    student_id: invoice.value.student_id,
    fee_invoice_id: invoice.value.id,
    payment_date: (paymentForm.payment_date ||
      new Date().toISOString().split("T")[0]) as string,
    method: paymentForm.method,
    amount: paymentForm.amount,
    reference_no: paymentForm.reference_no || null,
    status: paymentForm.status,
  };

  try {
    await paymentStore.createPayment(payload);
    toast.add({ title: "Payment recorded successfully", color: "success" });
    paymentModalOpen.value = false;
    await loadPayments();
    await loadInvoice(); // Reload to update status
  } catch (e: any) {
    toast.add({
      color: "error",
      title: "Failed to record payment",
      description: e?.data?.message || e?.message,
    });
  }
}

/* ---------------- Computed Values ---------------- */
const totalPaid = computed(() => {
  return payments.value
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
});

const remainingAmount = computed(() => {
  if (!invoice.value) return 0;
  return Number(invoice.value.payable_amount || 0) - totalPaid.value;
});

/* ---------------- Helpers ---------------- */
function statusColor(status?: string) {
  switch (status) {
    case "paid":
      return "success";
    case "partial":
      return "warning";
    case "pending":
      return "info";
    case "cancelled":
      return "error";
    default:
      return "neutral";
  }
}

function paymentStatusColor(status?: string) {
  switch (status) {
    case "completed":
      return "success";
    case "pending":
      return "warning";
    case "failed":
      return "error";
    case "refunded":
      return "info";
    default:
      return "neutral";
  }
}

function formatDate(date?: string | null): string {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

function goBack() {
  router.push("/admin/fees/invoices");
}

function printInvoice() {
  window.print();
}
</script>

<template>
  <UContainer class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between print:hidden">
      <div class="flex items-center gap-4">
        <UButton icon="i-lucide-arrow-left" variant="ghost" @click="goBack" />
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            Invoice Details
          </h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {{ invoice?.invoice_no }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-printer"
          variant="outline"
          @click="printInvoice"
        >
          Print
        </UButton>
        <UButton
          v-if="invoice?.status !== 'paid' && invoice?.status !== 'cancelled'"
          icon="i-lucide-banknote"
          :disabled="invoiceLoading || !invoice"
          @click="openPaymentModal"
        >
          Record Payment
        </UButton>
      </div>
    </div>

    <div v-if="invoiceLoading" class="flex items-center justify-center py-12">
      <UIcon
        name="i-lucide-loader-2"
        class="h-8 w-8 animate-spin text-primary"
      />
    </div>

    <div v-else-if="invoice" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left: Invoice Details -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Invoice Info -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-base font-semibold">Invoice Information</h3>
              <UBadge
                :color="statusColor(invoice.status)"
                variant="subtle"
                size="lg"
                class="capitalize"
              >
                {{ invoice.status }}
              </UBadge>
            </div>
          </template>

          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-600 dark:text-gray-400">Invoice No:</span>
              <div class="font-medium mt-1">{{ invoice.invoice_no }}</div>
            </div>
            <div>
              <span class="text-gray-600 dark:text-gray-400"
                >Invoice Date:</span
              >
              <div class="font-medium mt-1">
                {{ formatDate(invoice.invoice_date) }}
              </div>
            </div>
            <div>
              <span class="text-gray-600 dark:text-gray-400">Due Date:</span>
              <div class="font-medium mt-1">
                {{ formatDate(invoice.due_date) }}
              </div>
            </div>
            <div>
              <span class="text-gray-600 dark:text-gray-400">Session:</span>
              <div class="font-medium mt-1">
                {{ invoice.academic_session?.name || "—" }}
              </div>
            </div>
          </div>
        </UCard>

        <!-- Student Info -->
        <UCard>
          <template #header>
            <h3 class="text-base font-semibold">Student Information</h3>
          </template>

          <div class="flex items-start gap-4">
            <UAvatar
              :src="invoice.student?.photo_url"
              :alt="invoice.student?.name_bn"
              size="lg"
            />
            <div>
              <div class="font-semibold">
                {{
                  invoice.student?.name_bn || invoice.student?.name_en || "—"
                }}
              </div>
              <div class="text-sm text-gray-600 dark:text-gray-400">
                {{ invoice.student?.student_code }}
              </div>
              <div class="text-sm text-gray-500 mt-1">
                Phone: {{ invoice.student?.student_phone || "—" }}
              </div>
            </div>
          </div>
        </UCard>

        <!-- Invoice Items -->
        <UCard>
          <template #header>
            <h3 class="text-base font-semibold">Fee Items</h3>
          </template>

          <UTable
            :data="invoice.items || []"
            :columns="itemColumns"
            class="min-w-max"
          />
        </UCard>

        <!-- Payments -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-base font-semibold">Payment History</h3>
              <UBadge variant="subtle">
                {{ payments.length }} payment(s)
              </UBadge>
            </div>
          </template>

          <div
            v-if="payments.length === 0"
            class="text-center py-8 text-gray-500"
          >
            No payments recorded yet
          </div>

          <UTable
            v-else
            :data="payments"
            :columns="paymentColumns"
            class="min-w-max"
          />
        </UCard>
      </div>

      <!-- Right: Summary -->
      <div class="space-y-6">
        <UCard>
          <template #header>
            <h3 class="text-base font-semibold">Amount Summary</h3>
          </template>

          <div class="space-y-3">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600 dark:text-gray-400"
                >Total Amount:</span
              >
              <span class="font-medium">
                ৳{{ Number(invoice.total_amount || 0).toFixed(2) }}
              </span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600 dark:text-gray-400"
                >Total Discount:</span
              >
              <span class="font-medium text-green-600">
                -৳{{ Number(invoice.total_discount || 0).toFixed(2) }}
              </span>
            </div>
            <div class="border-t border-gray-200 dark:border-gray-700 pt-3">
              <div class="flex justify-between">
                <span class="font-semibold">Payable Amount:</span>
                <span class="font-bold text-lg">
                  ৳{{ Number(invoice.payable_amount || 0).toFixed(2) }}
                </span>
              </div>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600 dark:text-gray-400">Total Paid:</span>
              <span class="font-medium text-green-600">
                ৳{{ totalPaid.toFixed(2) }}
              </span>
            </div>
            <div class="border-t border-gray-200 dark:border-gray-700 pt-3">
              <div class="flex justify-between">
                <span class="font-semibold">Remaining:</span>
                <span
                  class="font-bold text-lg"
                  :class="
                    remainingAmount > 0 ? 'text-red-600' : 'text-green-600'
                  "
                >
                  ৳{{ remainingAmount.toFixed(2) }}
                </span>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Payment Modal -->
    <UModal
      :open="paymentModalOpen"
      @update:open="paymentModalOpen = $event"
      title="Record Payment"
      description="Enter payment details"
      :prevent-close="paymentLoading"
      :closeable="!paymentLoading"
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <div class="grid gap-4">
          <UFormField
            label="Payment Date"
            name="payment_date"
            :error="paymentErrors.payment_date"
            required
          >
            <UInput
              v-model="paymentForm.payment_date"
              type="date"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Payment Method"
            name="method"
            :error="paymentErrors.method"
            required
          >
            <USelect
              v-model="paymentForm.method"
              :items="paymentMethods"
              class="w-full"
              :popper="{ strategy: 'fixed' }"
            />
          </UFormField>

          <UFormField
            label="Amount"
            name="amount"
            :error="paymentErrors.amount"
            required
          >
            <UInput
              v-model="paymentForm.amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Reference No" name="reference_no">
            <UInput
              v-model="paymentForm.reference_no"
              placeholder="Transaction ID or reference"
              class="w-full"
            />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <UButton
          label="Cancel"
          color="neutral"
          variant="outline"
          :disabled="paymentLoading"
          @click="paymentModalOpen = false"
        />
        <UButton
          label="Record Payment"
          color="primary"
          :loading="paymentLoading"
          @click="submitPayment"
        />
      </template>
    </UModal>
  </UContainer>
</template>

<style>
@media print {
  .print\:hidden {
    display: none !important;
  }
}
</style>
