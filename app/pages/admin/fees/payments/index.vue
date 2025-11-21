<script setup lang="ts">
definePageMeta({
  layout: "admin",
  middleware: "auth",
  requiresAuth: true,
  roles: ["Owner", "Admin", "Developer"],
});

import { h, computed, onMounted, watch, reactive } from "vue";
import { useHead, useToast } from "#imports";
import { useRouter } from "vue-router";
import type { TableColumn, SelectItem } from "@nuxt/ui";
import type { Payment } from "~/types/models/payment";

const UButton = resolveComponent("UButton");
const UDropdownMenu = resolveComponent("UDropdownMenu");
const UBadge = resolveComponent("UBadge");

useHead({ title: "Payments" });

const toast = useToast();
const router = useRouter();

const store = usePaymentStore();
const { payments, loading, pagination } = storeToRefs(store);

/* ✅ safe guards (prevents undefined.filter / undefined.total crash) */
const safePayments = computed<Payment[]>(() => payments.value ?? []);
const safePagination = computed(() => ({
  total: pagination.value?.total ?? 0,
  current_page: pagination.value?.current_page ?? 1,
  last_page: pagination.value?.last_page ?? 1,
  per_page: pagination.value?.per_page ?? 25,
}));

/* ---------------- Filters ---------------- */
const filters = reactive({
  q: "",
  status: "all" as "all" | "pending" | "completed" | "failed" | "refunded",
  method: "all" as
    | "all"
    | "cash"
    | "bkash"
    | "nagad"
    | "bank"
    | "card"
    | "other",
  student_id: null as number | null,
  page: 1,
  per_page: 25,
});

const statusFilterItems: SelectItem[] = [
  { label: "All Status", value: "all" },
  { label: "Completed", value: "completed" },
  { label: "Pending", value: "pending" },
  { label: "Failed", value: "failed" },
  { label: "Refunded", value: "refunded" },
];

const methodFilterItems: SelectItem[] = [
  { label: "All Methods", value: "all" },
  { label: "Cash", value: "cash" },
  { label: "bKash", value: "bkash" },
  { label: "Nagad", value: "nagad" },
  { label: "Bank", value: "bank" },
  { label: "Card", value: "card" },
  { label: "Other", value: "other" },
];

const perPageItems = computed<SelectItem[]>(() =>
  [10, 15, 25, 50].map((n) => ({ label: String(n), value: n }))
);

/* ---------------- Lifecycle ---------------- */
onMounted(async () => {
  await loadPayments();
});

watch(
  () => [filters.q, filters.status, filters.method, filters.per_page],
  () => {
    filters.page = 1;
    loadPayments();
  }
);

watch(
  () => filters.page,
  () => loadPayments()
);

/* ---------------- Fetch ---------------- */
async function loadPayments() {
  try {
    await store.fetchPayments({
      q: filters.q || undefined,
      page: filters.page,
      per_page: filters.per_page,
      ...(filters.status !== "all" && { status: filters.status }),
      ...(filters.method !== "all" && { method: filters.method }),
    });
  } catch (e: any) {
    toast.add({
      color: "error",
      title: "Failed to load payments",
      description: e?.data?.message || e?.message,
    });
  }
}

/* ---------------- Columns ---------------- */
type Row = Payment;

const columns: TableColumn<Row>[] = [
  {
    id: "payment_date",
    accessorKey: "payment_date",
    header: "Date",
    cell: ({ row }) => formatDate(row.getValue("payment_date") as string),
  },
  {
    id: "student",
    accessorKey: "student",
    header: "Student",
    cell: ({ row }) => {
      const student = row.getValue("student") as any;
      if (!student) return h("span", "—");

      return h("div", { class: "leading-tight" }, [
        h(
          "div",
          { class: "font-medium" },
          student?.name_bn || student?.name_en
        ),
        student?.student_code
          ? h("div", { class: "text-xs text-gray-500" }, student.student_code)
          : null,
      ]);
    },
  },
  {
    id: "invoice",
    accessorKey: "fee_invoice",
    header: "Invoice",
    cell: ({ row }) => {
      const invoice = row.getValue("fee_invoice") as any;
      if (!invoice) return h("span", "—");

      return h(
        "div",
        {
          class: "font-medium text-primary cursor-pointer",
          onClick: () => viewInvoice(invoice.id),
        },
        invoice.invoice_no || `#${invoice.id}`
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
    cell: ({ row }) =>
      h(
        UBadge,
        {
          color: statusColor(row.getValue("status") as string),
          variant: "subtle",
          class: "capitalize",
        },
        () => row.getValue("status") || "unknown"
      ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const payment = row.original;
      return h(
        UDropdownMenu,
        {
          items: [
            [
              {
                label: "View Invoice",
                icon: "i-lucide-file-text",
                onSelect: () => viewInvoice(payment.fee_invoice_id),
                disabled: !payment.fee_invoice_id,
              },
              {
                label: "View Receipt",
                icon: "i-lucide-receipt",
                onSelect: () => viewReceipt(payment.id),
              },
            ],
            [
              {
                label: "Update Status",
                icon: "i-lucide-edit",
                onSelect: () => updateStatus(payment.id),
                disabled: payment.status === "completed",
              },
            ],
          ],
        },
        () =>
          h(UButton, {
            icon: "i-lucide-more-horizontal",
            variant: "ghost",
            color: "neutral",
          })
      );
    },
  },
];

/* ---------------- Helpers ---------------- */
function statusColor(status?: string) {
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

/* ---------------- Actions ---------------- */
function viewInvoice(invoiceId?: number | null) {
  if (!invoiceId) return;
  router.push(`/admin/fees/invoices/${invoiceId}`);
}

function viewReceipt(paymentId: number) {
  toast.add({
    title: "Receipt",
    description: "Receipt feature coming soon",
    color: "info",
  });
}

function updateStatus(paymentId: number) {
  toast.add({
    title: "Update Status",
    description: "Status update feature coming soon",
    color: "info",
  });
}

function goBack() {
  router.back();
}

/* ---------------- Summary Stats ---------------- */
const totalCompleted = computed(() =>
  safePayments.value
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0)
);

const totalPending = computed(() =>
  safePayments.value
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0)
);
</script>

<template>
  <UContainer class="space-y-4">
    <!-- Top bar -->
    <div
      class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
    >
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-arrow-left"
          @click="goBack"
        >
          Back
        </UButton>

        <UInput
          v-model="filters.q"
          placeholder="Search by student, reference…"
          class="w-64"
        />

        <USelect
          v-model="filters.status"
          :items="statusFilterItems"
          class="w-40"
          :popper="{ strategy: 'fixed' }"
        />

        <USelect
          v-model="filters.method"
          :items="methodFilterItems"
          class="w-40"
          :popper="{ strategy: 'fixed' }"
        />

        <USelect
          v-model="filters.per_page"
          :items="perPageItems"
          class="w-24"
          :popper="{ strategy: 'fixed' }"
        />

        <UButton variant="soft" icon="i-lucide-rotate-cw" @click="loadPayments">
          Refresh
        </UButton>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-600">Total Payments</div>
            <div class="text-2xl font-bold mt-1">
              {{ safePagination.total }}
            </div>
          </div>
          <UIcon name="i-lucide-banknote" class="h-8 w-8 text-gray-400" />
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-600">Completed Amount</div>
            <div class="text-2xl font-bold text-green-600 mt-1">
              ৳{{ totalCompleted.toFixed(2) }}
            </div>
          </div>
          <UIcon name="i-lucide-check-circle" class="h-8 w-8 text-green-400" />
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-600">Pending Amount</div>
            <div class="text-2xl font-bold text-yellow-600 mt-1">
              ৳{{ totalPending.toFixed(2) }}
            </div>
          </div>
          <UIcon name="i-lucide-clock" class="h-8 w-8 text-yellow-400" />
        </div>
      </UCard>
    </div>

    <!-- Table -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="font-semibold">Payment History</div>
          <div class="text-sm text-gray-500">
            Total: {{ safePagination.total }}
          </div>
        </div>
      </template>

      <!-- ✅ use safePayments -->
      <UTable :data="safePayments" :columns="columns" :loading="loading" />

      <div
        v-if="safePagination.total > 0"
        class="flex items-center justify-between mt-4"
      >
        <div class="text-sm text-gray-500">
          Page {{ safePagination.current_page }} of
          {{ safePagination.last_page }}
        </div>

        <UPagination
          v-model="filters.page"
          :page-count="safePagination.last_page"
        />
      </div>
    </UCard>
  </UContainer>
</template>
