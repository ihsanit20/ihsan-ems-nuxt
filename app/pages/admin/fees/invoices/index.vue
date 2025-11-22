<script setup lang="ts">
definePageMeta({
  layout: "admin",
  middleware: "auth",
  requiresAuth: true,
  roles: ["Owner", "Admin", "Developer"],
});

import { useHead, useToast } from "#imports";
import { useRouter } from "vue-router";
import type { TableColumn, SelectItem } from "@nuxt/ui";
import type {
  FeeInvoice,
  MonthlyInvoiceGenerationResult,
} from "~/types/models/fee-invoice";

/* ---------------- UI component resolves ---------------- */
const UButton = resolveComponent("UButton");
const UDropdownMenu = resolveComponent("UDropdownMenu");
const UBadge = resolveComponent("UBadge");

useHead({ title: "Fee Invoices" });

const toast = useToast();
const router = useRouter();

const store = useFeeInvoiceStore();
const { feeInvoices, loading, pagination } = storeToRefs(store);

/* ---------------- Filters ---------------- */
const filters = reactive({
  q: "",
  status: null as null | "pending" | "partial" | "paid" | "cancelled",
  student_id: null as number | null,
  academic_session_id: null as number | null,
  page: 1,
  per_page: 25,
});

const statusFilterItems: SelectItem[] = [
  { label: "All Status", value: null },
  { label: "Pending", value: "pending" },
  { label: "Partial", value: "partial" },
  { label: "Paid", value: "paid" },
  { label: "Cancelled", value: "cancelled" },
];

const perPageItems = computed<SelectItem[]>(() =>
  [10, 15, 25, 50].map((n) => ({ label: String(n), value: n }))
);

/* ---------------- Lifecycle ---------------- */
onMounted(async () => {
  await loadInvoices();
});

watch(
  () => [filters.q, filters.status, filters.per_page],
  () => {
    filters.page = 1;
    loadInvoices();
  }
);

watch(
  () => filters.page,
  () => {
    loadInvoices();
  }
);

async function loadInvoices() {
  try {
    await store.fetchFeeInvoices({
      q: filters.q || undefined,
      page: filters.page,
      per_page: filters.per_page,
      ...(filters.status && { status: filters.status }),
    });
  } catch (e: any) {
    toast.add({
      color: "error",
      title: "Failed to load invoices",
      description: e?.data?.message || e?.message,
    });
  }
}

/* ---------------- Monthly Generation ---------------- */
const generateOpen = ref(false);
const generating = ref(false);
const generationMonth = ref<string>(getDefaultMonthKey());
const generationResult = ref<MonthlyInvoiceGenerationResult | null>(null);

function getDefaultMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function openGenerateModal() {
  generationResult.value = null;
  generationMonth.value = getDefaultMonthKey();
  generateOpen.value = true;
}

async function handleGenerateMonthly() {
  generating.value = true;
  generationResult.value = null;

  try {
    const result = await store.generateMonthlyInvoices(
      generationMonth.value?.trim() || undefined
    );

    generationResult.value = result;
    toast.add({
      title: "Monthly invoices generated",
      color: "success",
      description: `Created ${result.created}, skipped ${result.skipped}, failed ${result.failed}`,
    });
    await loadInvoices();
  } catch (e: any) {
    toast.add({
      color: "error",
      title: "Generation failed",
      description: e?.data?.message || e?.message,
    });
  } finally {
    generating.value = false;
  }
}

/* ---------------- Columns ---------------- */
type Row = FeeInvoice;

const columns: TableColumn<Row>[] = [
  {
    id: "invoice_no",
    accessorKey: "invoice_no",
    header: "Invoice No",
    cell: ({ row }) =>
      h(
        "div",
        { class: "font-medium text-primary" },
        row.getValue("invoice_no") as string
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
        student?.student_code
          ? h("div", { class: "text-xs text-gray-500" }, student.student_code)
          : null,
      ]);
    },
  },
  {
    id: "invoice_date",
    accessorKey: "invoice_date",
    header: "Invoice Date",
    cell: ({ row }) => formatDate(row.getValue("invoice_date") as string),
  },
  {
    id: "due_date",
    accessorKey: "due_date",
    header: "Due Date",
    cell: ({ row }) => formatDate(row.getValue("due_date") as string),
  },
  {
    id: "total_amount",
    accessorKey: "total_amount",
    header: "Total",
    cell: ({ row }) =>
      h(
        "div",
        { class: "text-right font-medium" },
        `৳${Number(row.getValue("total_amount") || 0).toFixed(2)}`
      ),
  },
  {
    id: "total_discount",
    accessorKey: "total_discount",
    header: "Discount",
    cell: ({ row }) =>
      h(
        "div",
        { class: "text-right text-green-600" },
        `৳${Number(row.getValue("total_discount") || 0).toFixed(2)}`
      ),
  },
  {
    id: "payable_amount",
    accessorKey: "payable_amount",
    header: "Payable",
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
      return h(
        UDropdownMenu,
        {
          items: [
            [
              {
                label: "View Details",
                icon: "i-lucide-eye",
                onSelect: () => viewInvoice(invoice.id),
              },
              {
                label: "Record Payment",
                icon: "i-lucide-banknote",
                onSelect: () => recordPayment(invoice.id),
                disabled:
                  invoice.status === "paid" || invoice.status === "cancelled",
              },
            ],
            [
              {
                label: "Edit Invoice",
                icon: "i-lucide-pencil",
                onSelect: () => editInvoice(invoice.id),
                disabled:
                  invoice.status === "paid" || invoice.status === "cancelled",
              },
              {
                label: "Cancel Invoice",
                icon: "i-lucide-x-circle",
                onSelect: () => cancelInvoice(invoice.id),
                disabled: invoice.status === "cancelled",
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

/* ---------------- Actions ---------------- */
function createInvoice() {
  router.push("/admin/fees/invoices/create");
}

function viewInvoice(id: number) {
  router.push(`/admin/fees/invoices/${id}`);
}

function editInvoice(id: number) {
  router.push(`/admin/fees/invoices/${id}/edit`);
}

function recordPayment(id: number) {
  router.push(`/admin/fees/invoices/${id}?action=payment`);
}

const cancelOpen = ref(false);
const cancellingId = ref<number | null>(null);

function cancelInvoice(id: number) {
  cancellingId.value = id;
  cancelOpen.value = true;
}

async function confirmCancel() {
  if (!cancellingId.value) return;

  try {
    await store.updateFeeInvoice(cancellingId.value, { status: "cancelled" });
    toast.add({ title: "Invoice cancelled successfully", color: "success" });
    cancelOpen.value = false;
    cancellingId.value = null;
    await loadInvoices();
  } catch (e: any) {
    toast.add({
      color: "error",
      title: "Failed to cancel invoice",
      description: e?.data?.message || e?.message,
    });
  }
}

function goBack() {
  router.back();
}
</script>

<template>
  <UContainer class="space-y-4">
    <!-- Top bar -->
    <div
      class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
    >
      <div class="flex flex-wrap items-center gap-2">
        <!-- Back -->
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-arrow-left"
          aria-label="Go back"
          @click="goBack"
        >
          Back
        </UButton>

        <UInput
          v-model="filters.q"
          placeholder="Search by invoice no, student…"
          class="w-64"
        />

        <USelect
          v-model="filters.status"
          :items="statusFilterItems"
          class="w-40"
          :popper="{ strategy: 'fixed' }"
        />

        <USelect
          v-model="filters.per_page"
          :items="perPageItems"
          class="w-24"
          :popper="{ strategy: 'fixed' }"
        />

        <UButton
          variant="soft"
          icon="i-lucide-rotate-cw"
          @click="loadInvoices()"
        >
          Refresh
        </UButton>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          variant="outline"
          color="neutral"
          icon="i-lucide-calendar-plus"
          @click="openGenerateModal"
        >
          Generate Monthly
        </UButton>
        <UButton icon="i-lucide-plus" @click="createInvoice">
          New Invoice
        </UButton>
      </div>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="font-semibold">Fee Invoices</div>
          <div class="text-sm text-gray-500">Total: {{ pagination.total }}</div>
        </div>
      </template>

      <UTable
        :data="feeInvoices"
        :columns="columns"
        :loading="loading"
        class="min-w-max"
      />

      <div
        v-if="pagination.total > 0"
        class="flex items-center justify-between mt-4"
      >
        <div class="text-sm text-gray-500">
          Page {{ pagination.current_page }} of {{ pagination.last_page }}
        </div>
        <UPagination
          v-model="filters.page"
          :page-count="pagination.last_page"
        />
      </div>
    </UCard>

    <!-- Monthly Generation Modal -->
    <UModal
      :open="generateOpen"
      @update:open="generateOpen = $event"
      title="Generate Monthly Invoices"
      description="Create invoices for a selected month."
      :prevent-close="generating"
      :closeable="!generating"
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Invoice date will be set to the first day of the month and the due
            date will be 10 days later. Invoice numbers use INV-YYYY-0001
            format.
          </p>

          <div class="space-y-1">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-200">
              Month (YYYY-MM)
            </label>
            <UInput
              v-model="generationMonth"
              type="month"
              placeholder="YYYY-MM"
            />
            <p class="text-xs text-gray-500">
              Leave empty to use the current month.
            </p>
          </div>

          <div
            v-if="generationResult"
            class="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-3 text-sm"
          >
            <div class="font-semibold">Last run summary</div>
            <div class="mt-2 grid grid-cols-2 gap-2">
              <div class="flex items-center justify-between">
                <span class="text-gray-600 dark:text-gray-400">Month</span>
                <span class="font-medium">{{ generationResult.month }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-600 dark:text-gray-400">Created</span>
                <span class="font-medium text-green-600 dark:text-green-400">
                  {{ generationResult.created }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-600 dark:text-gray-400">Skipped</span>
                <span class="font-medium">{{ generationResult.skipped }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-600 dark:text-gray-400">Failed</span>
                <span class="font-medium text-red-600 dark:text-red-400">
                  {{ generationResult.failed }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <UButton
          label="Close"
          color="neutral"
          variant="outline"
          :disabled="generating"
          @click="generateOpen = false"
        />
        <UButton
          label="Generate"
          icon="i-lucide-rotate-ccw"
          :loading="generating"
          @click="handleGenerateMonthly"
        />
      </template>
    </UModal>

    <!-- Cancel Confirm Modal -->
    <UModal
      :open="cancelOpen"
      @update:open="cancelOpen = $event"
      title="Cancel Invoice"
      description="This action cannot be undone."
      :prevent-close="loading"
      :closeable="!loading"
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <p class="text-sm">
          Are you sure you want to cancel this invoice? This action cannot be
          undone and the invoice will no longer be payable.
        </p>
      </template>
      <template #footer>
        <UButton
          label="Cancel"
          color="neutral"
          variant="outline"
          :disabled="loading"
          @click="cancelOpen = false"
        />
        <UButton
          label="Confirm Cancel"
          color="error"
          :loading="loading"
          @click="confirmCancel"
        />
      </template>
    </UModal>
  </UContainer>
</template>
