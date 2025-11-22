<script setup lang="ts">
definePageMeta({
  layout: "admin",
  middleware: "auth",
  requiresAuth: true,
  roles: ["Owner", "Admin", "Developer"],
});

import { h, ref, reactive, computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useHead, useToast } from "#imports";
import { useRouter } from "vue-router";
import type { TableColumn } from "@nuxt/ui";

const UButton = resolveComponent("UButton");
const UBadge = resolveComponent("UBadge");

useHead({ title: "Fee Management Dashboard" });

const toast = useToast();
const router = useRouter();

const invoiceStore = useFeeInvoiceStore();
const { loading: invoiceLoading, dashboardSummary } = storeToRefs(invoiceStore);

/* ---------------- Local UI State ---------------- */
const pendingInvoices = ref<any[]>([]);
const recentPayments = ref<any[]>([]);

const stats = reactive({
  totalInvoices: 0,
  pendingAmount: 0,
  paidAmount: 0,
  partialAmount: 0,
  totalStudentsWithDues: 0,
});

/* ---------------- Load Dashboard Data ---------------- */
onMounted(async () => {
  await loadDashboard();
});

async function loadDashboard() {
  try {
    const res = await invoiceStore.fetchDashboardSummary({
      pending_limit: 10,
      recent_limit: 10,
      // academic_session_id: optional
    });

    stats.totalInvoices = Number(res.total_invoices || 0);
    stats.pendingAmount = Number(res.pending_amount || 0);
    stats.partialAmount = Number(res.partial_amount || 0);
    stats.paidAmount = Number(res.paid_amount || 0);
    stats.totalStudentsWithDues = Number(res.students_with_dues || 0);

    pendingInvoices.value = res.pending_invoices || [];
    recentPayments.value = res.recent_payments || [];
  } catch (e: any) {
    toast.add({
      color: "error",
      title: "Failed to load dashboard",
      description: e?.data?.message || e?.message,
    });
  }
}

/* ---------------- Tables ---------------- */
const invoiceColumns: TableColumn<any>[] = [
  {
    id: "invoice_no",
    accessorKey: "invoice_no",
    header: "Invoice No",
    cell: ({ row }) =>
      h(
        "div",
        {
          class: "font-medium text-primary cursor-pointer",
          onClick: () => viewInvoice(row.original?.id),
        },
        row.getValue("invoice_no") || `#${row.original?.id}`
      ),
  },
  {
    id: "student",
    accessorKey: "student",
    header: "Student",
    cell: ({ row }) => {
      const student = row.getValue("student") as any;
      return h(
        "div",
        { class: "leading-tight" },
        student?.name_bn || student?.name_en || "—"
      );
    },
  },
  {
    id: "due_date",
    accessorKey: "due_date",
    header: "Due Date",
    cell: ({ row }) => formatDate(row.getValue("due_date") as string),
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) =>
      h(
        UBadge,
        {
          color: invoiceStatusColor(row.getValue("status") as string),
          variant: "subtle",
          class: "capitalize",
        },
        () => (row.getValue("status") as string) || "unknown"
      ),
  },
  {
    id: "amount",
    accessorKey: "payable_amount",
    header: "Amount",
    cell: ({ row }) =>
      h(
        "div",
        { class: "text-right font-semibold text-red-600" },
        `৳${Number(row.original?.payable_amount || 0).toFixed(2)}`
      ),
  },
  {
    id: "actions",
    accessorKey: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const invoice = row.original;
      return h(UButton, {
        label: "View",
        size: "sm",
        variant: "outline",
        onClick: () => viewInvoice(invoice.id),
      });
    },
  },
];

function viewReceipt(paymentId?: number | null) {
  if (!paymentId) return;
  router.push(`/admin/fees/payments/${paymentId}/receipt`);
}

const paymentColumns: TableColumn<any>[] = [
  {
    id: "date",
    accessorKey: "payment_date",
    header: "Date",
    cell: ({ row }) => {
      const raw =
        (row.getValue("payment_date") as string) ||
        row.original?.payment_date ||
        row.original?.paid_at ||
        row.original?.created_at ||
        null;

      return formatDate(raw);
    },
  },
  {
    id: "student",
    accessorKey: "student",
    header: "Student",
    cell: ({ row }) => {
      const student = row.getValue("student") as any;
      return h(
        "div",
        { class: "leading-tight" },
        student?.name_bn || student?.name_en || "—"
      );
    },
  },
  {
    id: "method",
    accessorKey: "method",
    header: "Method",
    cell: ({ row }) =>
      h("div", { class: "capitalize" }, row.getValue("method") || "—"),
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

/* ---------------- Helpers ---------------- */
function invoiceStatusColor(status?: string) {
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

function formatDate(date?: string | null): string {
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

function viewInvoice(invoiceId?: number | null) {
  if (!invoiceId) return;
  router.push(`/admin/fees/invoices/${invoiceId}`);
}

function goBack() {
  router.back();
}
</script>

<template>
  <UContainer class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <UButton icon="i-lucide-arrow-left" variant="ghost" @click="goBack" />
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            Fee Management
          </h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Overview of fee collection and invoices
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-file-text"
          variant="outline"
          to="/admin/fees/invoices"
        >
          All Invoices
        </UButton>
        <UButton icon="i-lucide-plus" to="/admin/fees/invoices/create">
          New Invoice
        </UButton>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-600 dark:text-gray-400">
              Total Invoices
            </div>
            <div class="text-2xl font-bold mt-1">{{ stats.totalInvoices }}</div>
          </div>
          <UIcon name="i-lucide-file-text" class="h-10 w-10 text-blue-500" />
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-600 dark:text-gray-400">
              Pending Amount
            </div>
            <div class="text-2xl font-bold text-red-600 mt-1">
              ৳{{ stats.pendingAmount.toFixed(2) }}
            </div>
          </div>
          <UIcon name="i-lucide-alert-circle" class="h-10 w-10 text-red-500" />
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-600 dark:text-gray-400">
              Partial Paid
            </div>
            <div class="text-2xl font-bold text-yellow-600 mt-1">
              ৳{{ stats.partialAmount.toFixed(2) }}
            </div>
          </div>
          <UIcon name="i-lucide-clock" class="h-10 w-10 text-yellow-500" />
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-600 dark:text-gray-400">
              Total Collected
            </div>
            <div class="text-2xl font-bold text-green-600 mt-1">
              ৳{{ stats.paidAmount.toFixed(2) }}
            </div>
          </div>
          <UIcon
            name="i-lucide-check-circle"
            class="h-10 w-10 text-green-500"
          />
        </div>
      </UCard>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-600 dark:text-gray-400">
              Students with Dues
            </div>
            <div class="text-3xl font-bold text-orange-600 mt-2">
              {{ stats.totalStudentsWithDues }}
            </div>
          </div>
          <UIcon name="i-lucide-users" class="h-12 w-12 text-orange-400" />
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-600 dark:text-gray-400">
              Collection Rate
            </div>
            <div class="text-3xl font-bold text-blue-600 mt-2">
              {{
                stats.totalInvoices > 0
                  ? Math.round(
                      (stats.paidAmount /
                        (stats.paidAmount +
                          stats.pendingAmount +
                          stats.partialAmount)) *
                        100
                    )
                  : 0
              }}%
            </div>
          </div>
          <UIcon name="i-lucide-trending-up" class="h-12 w-12 text-blue-400" />
        </div>
      </UCard>
    </div>

    <!-- Quick Actions -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <UCard class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
        <NuxtLink to="/admin/fees/invoices" class="block">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <UIcon name="i-lucide-file-text" class="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div class="font-semibold">Manage Invoices</div>
              <div class="text-sm text-gray-500">
                View and manage all invoices
              </div>
            </div>
          </div>
        </NuxtLink>
      </UCard>

      <UCard class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
        <NuxtLink to="/admin/fees/payments" class="block">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <UIcon name="i-lucide-banknote" class="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div class="font-semibold">Payment History</div>
              <div class="text-sm text-gray-500">View all payment records</div>
            </div>
          </div>
        </NuxtLink>
      </UCard>

      <UCard class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
        <NuxtLink to="/admin/settings/basic-settings/fees" class="block">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <UIcon name="i-lucide-settings" class="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <div class="font-semibold">Fee Settings</div>
              <div class="text-sm text-gray-500">Configure fee types</div>
            </div>
          </div>
        </NuxtLink>
      </UCard>
    </div>

    <!-- Pending Invoices -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold">Pending Invoices (Due Soon)</h3>
          <UButton
            label="View All"
            size="sm"
            variant="ghost"
            to="/admin/fees/invoices?status=pending"
          />
        </div>
      </template>

      <div v-if="invoiceLoading" class="text-center py-8">
        <UIcon
          name="i-lucide-loader-2"
          class="h-8 w-8 animate-spin text-primary"
        />
      </div>

      <div
        v-else-if="pendingInvoices.length === 0"
        class="text-center py-8 text-gray-500"
      >
        No pending invoices
      </div>

      <UTable
        v-else
        :data="pendingInvoices"
        :columns="invoiceColumns"
        class="min-w-max"
      />
    </UCard>

    <!-- Recent Payments -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold">Recent Payments</h3>
          <UButton
            label="View All"
            size="sm"
            variant="ghost"
            to="/admin/fees/payments"
          />
        </div>
      </template>

      <div v-if="invoiceLoading" class="text-center py-8">
        <UIcon
          name="i-lucide-loader-2"
          class="h-8 w-8 animate-spin text-primary"
        />
      </div>

      <div
        v-else-if="recentPayments.length === 0"
        class="text-center py-8 text-gray-500"
      >
        No recent payments
      </div>

      <UTable
        v-else
        :data="recentPayments"
        :columns="paymentColumns"
        class="min-w-max"
      />
    </UCard>
  </UContainer>
</template>
