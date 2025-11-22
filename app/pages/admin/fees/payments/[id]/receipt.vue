<script setup lang="ts">
definePageMeta({
  layout: "admin",
  middleware: "auth",
  requiresAuth: true,
  roles: ["Owner", "Admin", "Developer"],
});

import { computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useHead, useToast } from "#imports";

useHead({ title: "Payment Receipt" });

const route = useRoute();
const router = useRouter();
const toast = useToast();

const paymentStore = usePaymentStore();
const { currentPayment, loading } = storeToRefs(paymentStore);

const paymentId = computed(() => Number(route.params.id));

onMounted(async () => {
  if (!paymentId.value) return;

  try {
    await paymentStore.fetchPayment(paymentId.value);
  } catch (e: any) {
    toast.add({
      color: "error",
      title: "Failed to load receipt",
      description: e?.data?.message || e?.message,
    });
  }
});

const payment = computed<any>(() => currentPayment.value);

// ✅ backend may return fee_invoice (snake) or feeInvoice (camel)
const student = computed<any>(() => payment.value?.student);
const invoice = computed<any>(
  () => payment.value?.fee_invoice || payment.value?.feeInvoice
);

// ✅ normalize invoice items for UI
const invoiceItems = computed(() => {
  const items = invoice.value?.items ?? [];
  if (!Array.isArray(items)) return [];

  const toNumber = (v: any) =>
    v === null || v === undefined || v === "" ? 0 : Number(v);

  return items.map((it: any) => {
    const studentFee = it.studentFee || it.student_fee || {};
    const sessionFee =
      studentFee.sessionFee ||
      studentFee.session_fee ||
      it.sessionFee ||
      it.session_fee ||
      {};
    const fee = sessionFee.fee || {};

    const feeName =
      fee?.name_bn ||
      fee?.name_en ||
      fee?.name || // ✅ FIX: your DB has only `name`
      it.description ||
      "—";

    return {
      id: it.id,
      feeName,
      amount: toNumber(it.amount),
      discount: toNumber(it.discount_amount),
      net: toNumber(
        it.net_amount ?? toNumber(it.amount) - toNumber(it.discount_amount)
      ),
    };
  });
});

function formatDate(date?: string | null) {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(date);
  }
}

function formatMoney(v: any) {
  return `৳${Number(v || 0).toFixed(2)}`;
}

function paymentStatusBadgeColor(status?: string) {
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

// ✅ invoice statuses: pending/partial/paid/cancelled/failed
function invoiceStatusBadgeColor(status?: string) {
  switch (status) {
    case "paid":
      return "success";
    case "pending":
      return "warning";
    case "partial":
      return "info";
    case "cancelled":
    case "failed":
      return "error";
    default:
      return "neutral";
  }
}

function printReceipt() {
  window.print();
}

function goBack() {
  router.back();
}
</script>

<template>
  <UContainer class="space-y-4">
    <!-- Top actions (not printed) -->
    <div class="flex items-center justify-between print:hidden">
      <UButton icon="i-lucide-arrow-left" variant="ghost" @click="goBack">
        Back
      </UButton>

      <div class="flex gap-2">
        <UButton
          icon="i-lucide-printer"
          color="primary"
          variant="soft"
          @click="printReceipt"
        >
          Print
        </UButton>
      </div>
    </div>

    <UCard>
      <div v-if="loading" class="py-10 text-center">
        <UIcon
          name="i-lucide-loader-2"
          class="h-8 w-8 animate-spin text-primary"
        />
        <p class="mt-2 text-sm text-gray-500">Loading receipt…</p>
      </div>

      <div v-else-if="!payment" class="py-10 text-center text-gray-500">
        No payment found
      </div>

      <div v-else class="space-y-6">
        <!-- Header -->
        <div class="flex items-start justify-between border-b pb-4">
          <div>
            <h1 class="text-2xl font-bold">Payment Receipt</h1>
            <p class="text-sm text-gray-500">
              Receipt No: <span class="font-medium">#{{ payment.id }}</span>
            </p>
          </div>

          <div class="text-right text-sm">
            <div class="text-gray-500">Payment Date</div>
            <div class="font-semibold">
              {{ formatDate(payment.payment_date || payment.created_at) }}
            </div>
          </div>
        </div>

        <!-- Student + Invoice -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
            <h3 class="font-semibold mb-2">Student Info</h3>
            <div class="text-sm space-y-1">
              <div>
                <span class="text-gray-500">Name:</span>
                <span class="font-medium ml-1">
                  {{ student?.name_bn || student?.name_en || "—" }}
                </span>
              </div>
              <div>
                <span class="text-gray-500">Student Code:</span>
                <span class="font-medium ml-1">
                  {{ student?.student_code || "—" }}
                </span>
              </div>
            </div>
          </div>

          <div class="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
            <h3 class="font-semibold mb-2">Invoice Info</h3>
            <div class="text-sm space-y-1">
              <div>
                <span class="text-gray-500">Invoice No:</span>
                <span class="font-medium ml-1">
                  {{ invoice?.invoice_no || `#${invoice?.id || "—"}` }}
                </span>
              </div>
              <div>
                <span class="text-gray-500">Invoice Date:</span>
                <span class="font-medium ml-1">
                  {{ formatDate(invoice?.invoice_date) }}
                </span>
              </div>
              <div>
                <span class="text-gray-500">Invoice Status:</span>
                <UBadge
                  :color="invoiceStatusBadgeColor(invoice?.status)"
                  variant="subtle"
                  class="capitalize ml-1"
                >
                  {{ invoice?.status || "—" }}
                </UBadge>
              </div>
            </div>
          </div>
        </div>

        <!-- ✅ Invoice Items (Fee Names) -->
        <div class="border rounded-lg overflow-hidden">
          <div class="bg-gray-100 dark:bg-gray-900 px-4 py-2 font-semibold">
            Invoice Items
          </div>

          <div
            v-if="invoiceItems.length === 0"
            class="p-4 text-sm text-gray-500"
          >
            No invoice items found
          </div>

          <div v-else class="p-4">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-gray-500 border-b">
                  <th class="py-2">Fee</th>
                  <th class="py-2 text-right">Amount</th>
                  <th class="py-2 text-right">Discount</th>
                  <th class="py-2 text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="it in invoiceItems"
                  :key="it.id"
                  class="border-b last:border-b-0"
                >
                  <td class="py-2 font-medium">{{ it.feeName }}</td>
                  <td class="py-2 text-right">{{ formatMoney(it.amount) }}</td>
                  <td class="py-2 text-right">
                    {{ formatMoney(it.discount) }}
                  </td>
                  <td class="py-2 text-right font-semibold">
                    {{ formatMoney(it.net) }}
                  </td>
                </tr>
              </tbody>

              <!-- totals row -->
              <tfoot>
                <tr class="border-t">
                  <td class="py-2 font-semibold text-right" colspan="3">
                    Total Payable
                  </td>
                  <td class="py-2 text-right font-bold">
                    {{ formatMoney(invoice?.payable_amount) }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Payment details -->
        <div class="border rounded-lg overflow-hidden">
          <div class="bg-gray-100 dark:bg-gray-900 px-4 py-2 font-semibold">
            Payment Details
          </div>

          <div class="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div class="text-gray-500">Method</div>
              <div class="font-medium capitalize">
                {{ payment.method || "—" }}
              </div>
            </div>

            <div>
              <div class="text-gray-500">Reference No</div>
              <div class="font-medium">{{ payment.reference_no || "—" }}</div>
            </div>

            <div>
              <div class="text-gray-500">Status</div>
              <UBadge
                :color="paymentStatusBadgeColor(payment.status)"
                variant="subtle"
                class="capitalize"
              >
                {{ payment.status || "—" }}
              </UBadge>
            </div>
          </div>

          <div class="px-4 py-3 border-t flex justify-between items-center">
            <div class="text-gray-600 font-semibold">Paid Amount</div>
            <div class="text-xl font-bold text-green-600">
              {{ formatMoney(payment.amount) }}
            </div>
          </div>
        </div>

        <!-- Footer note -->
        <div class="text-center text-xs text-gray-500 pt-4 border-t">
          This is a system generated receipt. No signature required.
        </div>
      </div>
    </UCard>
  </UContainer>
</template>

<style>
@media print {
  body {
    background: white !important;
  }
  .print\\:hidden {
    display: none !important;
  }
}
</style>
