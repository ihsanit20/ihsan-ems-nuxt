<script setup lang="ts">
definePageMeta({
  layout: "guardian",
  middleware: "auth",
  requiresAuth: true,
  roles: ["Guardian", "Owner", "Admin", "Developer"],
});

import { useHead, useToast } from "#imports";
import { useRouter, useRoute } from "vue-router";
import type { TableColumn } from "@nuxt/ui";
import type { FeeInvoice, FeeInvoiceItem } from "~/types/models/fee-invoice";
import type { Payment } from "~/types/models/payment";

const UBadge = resolveComponent("UBadge");
const UButton = resolveComponent("UButton");

useHead({ title: "Invoice Details" });

const toast = useToast();
const router = useRouter();
const route = useRoute();

const invoiceStore = useFeeInvoiceStore();
const paymentStore = usePaymentStore();

const { loading: invoiceLoading } = storeToRefs(invoiceStore);

const invoiceId = computed(() => Number(route.params.id));
const invoice = ref<FeeInvoice | null>(null);
const payments = ref<Payment[]>([]);

/* ---------------- Load Data ---------------- */
onMounted(async () => {
  await loadInvoice();
  await loadPayments();
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

/* ---------------- Invoice Items Table ---------------- */
const itemColumns: TableColumn<FeeInvoiceItem>[] = [
  {
    id: "fee_name",
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
    id: "discount",
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
];

/* ---------------- Computed Values ---------------- */
const totalPaid = computed(() => {
  return payments.value
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);
});

const remainingAmount = computed(() => {
  if (!invoice.value) return 0;
  return invoice.value.payable_amount - totalPaid.value;
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
  router.push("/guardian/fees");
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
            </div>
          </div>
        </UCard>

        <!-- Invoice Items -->
        <UCard>
          <template #header>
            <h3 class="text-base font-semibold">Fee Breakdown</h3>
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

      <!-- Right: Summary & Payment -->
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
                ৳{{ invoice.total_amount.toFixed(2) }}
              </span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600 dark:text-gray-400"
                >Total Discount:</span
              >
              <span class="font-medium text-green-600">
                -৳{{ invoice.total_discount.toFixed(2) }}
              </span>
            </div>
            <div class="border-t border-gray-200 dark:border-gray-700 pt-3">
              <div class="flex justify-between">
                <span class="font-semibold">Payable Amount:</span>
                <span class="font-bold text-lg">
                  ৳{{ invoice.payable_amount.toFixed(2) }}
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

        <!-- Payment Notice -->
        <UCard
          v-if="invoice.status !== 'paid' && invoice.status !== 'cancelled'"
          class="border-l-4 border-orange-500"
        >
          <div class="space-y-3">
            <div class="flex items-start gap-2">
              <UIcon
                name="i-lucide-info"
                class="h-5 w-5 text-orange-500 mt-0.5"
              />
              <div>
                <div class="font-semibold text-orange-700 dark:text-orange-400">
                  Payment Required
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Please pay the remaining amount before the due date to avoid
                  late charges.
                </div>
              </div>
            </div>

            <div class="pt-3 border-t border-gray-200 dark:border-gray-700">
              <div class="text-sm font-semibold mb-2">How to Pay:</div>
              <ul
                class="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside"
              >
                <li>Visit school office (9 AM - 4 PM)</li>
                <li>Online payment (Coming Soon)</li>
                <li>Bank transfer (Contact admin)</li>
              </ul>
            </div>
          </div>
        </UCard>

        <!-- Paid Notice -->
        <UCard
          v-else-if="invoice.status === 'paid'"
          class="border-l-4 border-green-500"
        >
          <div class="flex items-start gap-2">
            <UIcon
              name="i-lucide-check-circle"
              class="h-5 w-5 text-green-500 mt-0.5"
            />
            <div>
              <div class="font-semibold text-green-700 dark:text-green-400">
                Fully Paid
              </div>
              <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                This invoice has been fully paid. Thank you!
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </UContainer>
</template>

<style>
@media print {
  .print\:hidden {
    display: none !important;
  }
}
</style>
