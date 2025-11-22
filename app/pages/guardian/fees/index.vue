<script setup lang="ts">
definePageMeta({
  layout: "guardian",
  middleware: "auth",
  requiresAuth: true,
  roles: ["Guardian", "Owner", "Admin", "Developer"],
});

import { useHead } from "#imports";
import { useRouter } from "vue-router";
import type { TableColumn } from "@nuxt/ui";

useHead({ title: "Fees" });

const UButton = resolveComponent("UButton");
const UBadge = resolveComponent("UBadge");

const router = useRouter();

const loading = ref(false);

/* ---------------- Demo data (static) ---------------- */
const myInvoices = ref<any[]>([
  {
    id: 1,
    invoice_no: "INV-2025-001",
    student: { name_bn: "নুসরাত জাহান", student_code: "STU-2025-101" },
    invoice_date: "2025-02-01",
    due_date: "2025-02-10",
    payable_amount: 4500,
    status: "pending",
  },
  {
    id: 2,
    invoice_no: "INV-2025-002",
    student: { name_bn: "তাহমিদ রহমান", student_code: "STU-2025-077" },
    invoice_date: "2025-01-05",
    due_date: "2025-01-15",
    payable_amount: 3800,
    status: "partial",
  },
  {
    id: 3,
    invoice_no: "INV-2024-215",
    student: { name_bn: "নুসরাত জাহান", student_code: "STU-2025-101" },
    invoice_date: "2024-12-01",
    due_date: "2024-12-10",
    payable_amount: 4200,
    status: "paid",
  },
]);
const stats = reactive({
  totalPending: 0,
  totalPaid: 0,
  totalDue: 0,
});

/* ---------------- Stats from demo data ---------------- */
onMounted(() => {
  calculateStats();
});

function calculateStats() {
  stats.totalPending = myInvoices.value
    .filter((inv) => inv.status === "pending")
    .reduce((sum, inv) => sum + inv.payable_amount, 0);

  stats.totalDue = myInvoices.value
    .filter((inv) => inv.status === "pending" || inv.status === "partial")
    .reduce((sum, inv) => sum + inv.payable_amount, 0);

  stats.totalPaid = myInvoices.value
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + inv.payable_amount, 0);
}

/* ---------------- Filter ---------------- */
const filterStatus = ref<string>("all");

const filteredInvoices = computed(() => {
  if (filterStatus.value === "all") return myInvoices.value;
  return myInvoices.value.filter((inv) => inv.status === filterStatus.value);
});

const statusOptions = [
  { label: "All Invoices", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Partial", value: "partial" },
  { label: "Paid", value: "paid" },
];

/* ---------------- Columns ---------------- */
const columns: TableColumn<any>[] = [
  {
    id: "invoice_no",
    accessorKey: "invoice_no",
    header: "Invoice No",
    cell: ({ row }) =>
      h(
        "div",
        { class: "font-medium text-primary" },
        row.getValue("invoice_no")
      ),
  },
  {
    id: "student",
    accessorKey: "student",
    header: "Student",
    cell: ({ row }) => {
      const student = row.getValue("student") as any;
      return h("div", { class: "leading-tight" }, [
        h(
          "div",
          { class: "font-medium" },
          student?.name_bn || student?.name_en || "—"
        ),
        h("div", { class: "text-xs text-gray-500" }, student?.student_code),
      ]);
    },
  },
  {
    id: "invoice_date",
    accessorKey: "invoice_date",
    header: "Date",
    cell: ({ row }) => formatDate(row.getValue("invoice_date") as string),
  },
  {
    id: "due_date",
    accessorKey: "due_date",
    header: "Due Date",
    cell: ({ row }) => formatDate(row.getValue("due_date") as string),
  },
  {
    id: "payable_amount",
    accessorKey: "payable_amount",
    header: "Amount",
    cell: ({ row }) =>
      h(
        "div",
        { class: "text-right font-semibold" },
        `৳${Number(row.getValue("payable_amount") || 0).toFixed(2)}`
      ),
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
          color: statusColor(status),
          variant: "subtle",
          class: "capitalize",
        },
        () => status || "unknown"
      );
    },
  },
  {
    id: "actions",
    accessorKey: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const invoice = row.original;
      return h(UButton, {
        label: "View Details",
        size: "sm",
        variant: "outline",
        onClick: () => router.push(`/guardian/fees/invoices/${invoice.id}`),
      });
    },
  },
];

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
</script>

<template>
  <UContainer class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        Fee Management
      </h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        ডেমো ইনভয়েস লিস্ট (স্ট্যাটিক). লাইভ ডেটা সংযোগের আগে প্রিভিউ দেখানো হচ্ছে।
      </p>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-600 dark:text-gray-400">
              Total Pending
            </div>
            <div class="text-2xl font-bold text-orange-600 mt-1">
              ৳{{ stats.totalPending.toFixed(2) }}
            </div>
          </div>
          <UIcon
            name="i-lucide-alert-circle"
            class="h-10 w-10 text-orange-400"
          />
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-600 dark:text-gray-400">
              Total Due
            </div>
            <div class="text-2xl font-bold text-red-600 mt-1">
              ৳{{ stats.totalDue.toFixed(2) }}
            </div>
          </div>
          <UIcon name="i-lucide-clock" class="h-10 w-10 text-red-400" />
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-600 dark:text-gray-400">
              Total Paid
            </div>
            <div class="text-2xl font-bold text-green-600 mt-1">
              ৳{{ stats.totalPaid.toFixed(2) }}
            </div>
          </div>
          <UIcon
            name="i-lucide-check-circle"
            class="h-10 w-10 text-green-400"
          />
        </div>
      </UCard>
    </div>

    <!-- Important Notice -->
    <UCard v-if="stats.totalDue > 0" class="border-l-4 border-orange-500">
      <div class="flex items-start gap-3">
        <UIcon name="i-lucide-info" class="h-5 w-5 text-orange-500 mt-0.5" />
        <div>
          <div class="font-semibold text-orange-700 dark:text-orange-400">
            Outstanding Balance
          </div>
          <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            You have
            <span class="font-semibold">৳{{ stats.totalDue.toFixed(2) }}</span>
            in outstanding fees. Please make payment to avoid late charges.
          </div>
        </div>
      </div>
    </UCard>

    <!-- Invoices List -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <h3 class="text-base font-semibold">Fee Invoices</h3>
            <UBadge color="info" variant="soft">Demo</UBadge>
          </div>
          <USelect
            v-model="filterStatus"
            :items="statusOptions"
            class="w-40"
            :popper="{ strategy: 'fixed' }"
          />
        </div>
      </template>

      <div v-if="loading" class="text-center py-8">
        <UIcon
          name="i-lucide-loader-2"
          class="h-8 w-8 animate-spin text-primary"
        />
      </div>

      <div
        v-else-if="filteredInvoices.length === 0"
        class="text-center py-8 text-gray-500"
      >
        No invoices found
      </div>

      <UTable
        v-else
        :data="filteredInvoices"
        :columns="columns"
        class="min-w-max"
      />
    </UCard>

    <!-- Payment Instructions -->
    <UCard>
      <template #header>
        <h3 class="text-base font-semibold">How to Pay</h3>
      </template>

      <div class="space-y-4 text-sm">
        <div class="flex items-start gap-3">
          <div
            class="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold"
          >
            1
          </div>
          <div>
            <div class="font-medium">Online Payment</div>
            <div class="text-gray-600 dark:text-gray-400">
              Use bKash, Nagad, or credit card to pay online (Coming Soon)
            </div>
          </div>
        </div>

        <div class="flex items-start gap-3">
          <div
            class="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold"
          >
            2
          </div>
          <div>
            <div class="font-medium">Pay at School</div>
            <div class="text-gray-600 dark:text-gray-400">
              Visit the school office during working hours (9 AM - 4 PM)
            </div>
          </div>
        </div>

        <div class="flex items-start gap-3">
          <div
            class="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold"
          >
            3
          </div>
          <div>
            <div class="font-medium">Bank Transfer</div>
            <div class="text-gray-600 dark:text-gray-400">
              Contact school administration for bank account details
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </UContainer>
</template>
