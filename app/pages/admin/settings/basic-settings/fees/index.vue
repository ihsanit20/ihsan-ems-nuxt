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
import type { Fee, BillingType, RecurringCycle } from "~/stores/fee";

/* ---------------- UI component resolves ---------------- */
const UButton = resolveComponent("UButton");
const UDropdownMenu = resolveComponent("UDropdownMenu");
const UBadge = resolveComponent("UBadge");

/* ---------------- Auto-imported in template ----------------
   ref, reactive, computed, watch, onMounted, h, storeToRefs
   UTable, UCard, UInput, USelect, UModal, USwitch, UFormField, UPagination
---------------------------------------------------------------- */

useHead({ title: "Fees" });

const toast = useToast();
const router = useRouter();
const goBack = () => router.back();

const store = useFeeStore();
const {
  items,
  loading,
  page,
  last_page,
  total,
  per_page,
  q,
  billing_type,
  recurring_cycle,
  is_active,
  saving,
  removing,
} = storeToRefs(store);

/* ---------------- Filters ---------------- */

// Filter dropdowns (with "All" option)
const billingTypeFilterItems: SelectItem[] = [
  { label: "All types", value: null },
  { label: "One-time", value: "one_time" },
  { label: "Recurring", value: "recurring" },
];

const recurringCycleFilterItems: SelectItem[] = [
  { label: "All cycles", value: null },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
  { label: "Per term", value: "term" },
];

const activeItems: SelectItem[] = [
  { label: "All", value: null },
  { label: "Active", value: true },
  { label: "Inactive", value: false },
];

// Per page dropdown
const perPageItems = computed<SelectItem[]>(() =>
  [10, 15, 25, 50].map((n) => ({ label: String(n), value: n }))
);

/* ---------------- Lifecycle ---------------- */

onMounted(async () => {
  await store.fetchList();
});

// search / filters / per_page বদলালে রিফ্রেশ
watch([q, billing_type, recurring_cycle, is_active, per_page], () => {
  store.setPage(1);
  store.fetchList().catch(() => {});
});

// page বদলালে
watch(page, () => {
  store.fetchList().catch(() => {});
});

/* ---------------- Columns ---------------- */
type Row = Fee;

const columns: TableColumn<Row>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) =>
      h("div", { class: "leading-tight" }, [
        h("div", { class: "font-medium" }, row.getValue("name") as string),
        h("div", { class: "text-xs text-gray-500" }, `#${row.original.id}`),
      ]),
  },
  {
    id: "billing_type",
    header: "Type",
    cell: ({ row }) => {
      const r = row.original as Row;
      const label = r.billing_type === "one_time" ? "One-time" : "Recurring";
      return h(UBadge as any, {
        label,
        color: r.billing_type === "one_time" ? "neutral" : "primary",
      });
    },
  },
  {
    id: "cycle",
    header: "Cycle",
    cell: ({ row }) => {
      const r = row.original as Row;
      if (r.billing_type === "one_time") {
        return h("span", { class: "text-sm text-gray-500" }, "—");
      }
      let label = "—";
      if (r.recurring_cycle === "monthly") label = "Monthly";
      else if (r.recurring_cycle === "yearly") label = "Yearly";
      else if (r.recurring_cycle === "term") label = "Per term";
      return h("span", { class: "text-sm text-gray-700" }, label);
    },
  },
  {
    id: "sort_order",
    header: "Order",
    cell: ({ row }) =>
      h(
        "span",
        { class: "text-sm tabular-nums text-gray-700" },
        String((row.original as Row).sort_order ?? 0)
      ),
  },
  {
    id: "active",
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => {
      const isActive = !!(row.original as Row).is_active;
      return h(UBadge as any, {
        label: isActive ? "Active" : "Inactive",
        color: isActive ? "primary" : "neutral",
      });
    },
  },
  {
    id: "actions",
    header: "",
    enableSorting: false,
    cell: ({ row }) => {
      const r = row.original as Row;
      const items = [
        { type: "label", label: "Actions" },
        { type: "separator" as const },
        {
          label: "Edit",
          icon: "i-lucide-pencil",
          onSelect: () => openEdit(r),
        },
        {
          label: r.is_active ? "Deactivate" : "Activate",
          icon: r.is_active ? "i-lucide-pause" : "i-lucide-check",
          onSelect: () => toggleActive(r),
        },
        {
          label: "Delete",
          icon: "i-lucide-trash-2",
          color: "error",
          onSelect: () => askDelete(r),
        },
      ];
      return h("div", { class: "flex justify-end" }, [
        h(
          UDropdownMenu as any,
          { items, content: { align: "end" } },
          {
            default: () =>
              h(UButton as any, {
                color: "neutral",
                variant: "ghost",
                icon: "i-lucide-ellipsis-vertical",
                "aria-label": "Actions",
              }),
          }
        ),
      ]);
    },
  },
];

/* ---------------- Add/Edit modal ---------------- */

const formOpen = ref(false);
const isEdit = ref(false);
const editingId = ref<number | null>(null);

type FormState = {
  name: string;
  billing_type: BillingType | null;
  recurring_cycle: RecurringCycle | null;
  sort_order: number | null;
  is_active: boolean;
};

const form = reactive<FormState>({
  name: "",
  billing_type: "one_time",
  recurring_cycle: null,
  sort_order: 0,
  is_active: true,
});

const errors = reactive<Record<string, string>>({});

// Form dropdown items (without "All")
const billingTypeFormItems: SelectItem[] = [
  { label: "One-time", value: "one_time" },
  { label: "Recurring", value: "recurring" },
];

const recurringCycleFormItems: SelectItem[] = [
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
  { label: "Per term", value: "term" },
];

function clearErrors() {
  Object.keys(errors).forEach((k) => delete (errors as any)[k]);
}

function validate(): boolean {
  clearErrors();
  if (!form.name?.trim()) errors.name = "Name is required";
  if (!form.billing_type) errors.billing_type = "Type is required";
  if (form.billing_type === "recurring" && !form.recurring_cycle) {
    errors.recurring_cycle = "Cycle is required for recurring fees";
  }
  return Object.keys(errors).length === 0;
}

function openCreate() {
  isEdit.value = false;
  editingId.value = null;
  Object.assign(form, {
    name: "",
    billing_type: "one_time" as BillingType,
    recurring_cycle: null,
    sort_order: 0,
    is_active: true,
  });
  clearErrors();
  formOpen.value = true;
}

function openEdit(row: Row) {
  isEdit.value = true;
  editingId.value = row.id;
  Object.assign(form, {
    name: row.name,
    billing_type: row.billing_type,
    recurring_cycle: row.recurring_cycle,
    sort_order: row.sort_order ?? 0,
    is_active: !!row.is_active,
  });
  clearErrors();
  formOpen.value = true;
}

async function submitForm() {
  if (!validate()) {
    toast.add({ title: "Fix form errors", color: "error" });
    return;
  }

  const payload: {
    name: string;
    billing_type: BillingType;
    recurring_cycle: RecurringCycle | null;
    sort_order: number;
    is_active: boolean;
  } = {
    name: form.name.trim(),
    billing_type: form.billing_type as BillingType,
    recurring_cycle:
      form.billing_type === "recurring" ? form.recurring_cycle : null,
    sort_order: Number(form.sort_order || 0),
    is_active: !!form.is_active,
  };

  try {
    if (isEdit.value && editingId.value) {
      await store.update(editingId.value, payload);
      toast.add({ title: "Fee updated" });
    } else {
      await store.create(payload);
      toast.add({ title: "Fee created" });
    }
    formOpen.value = false;
    await store.fetchList();
  } catch (e: any) {
    toast.add({
      color: "error",
      title: isEdit.value ? "Update failed" : "Create failed",
      description: e?.data?.message || e?.message || "Please try again",
    });
  }
}

/* ---------------- Delete modal ---------------- */

const deleteOpen = ref(false);
const deleting = reactive<{ id: number | null; name: string }>({
  id: null,
  name: "",
});

function askDelete(row: Row) {
  deleting.id = row.id;
  deleting.name = row.name;
  deleteOpen.value = true;
}

async function confirmDelete() {
  if (!deleting.id) return;
  try {
    await store.remove(deleting.id);
    toast.add({ title: "Fee deleted" });
  } catch (e: any) {
    toast.add({
      color: "error",
      title: "Delete failed",
      description: e?.data?.message || e?.message,
    });
  } finally {
    deleteOpen.value = false;
    deleting.id = null;
    deleting.name = "";
  }
}

/* ---------------- Quick toggle ---------------- */

async function toggleActive(row: Row) {
  try {
    await store.update(row.id, { is_active: !row.is_active });
    toast.add({ title: "Status updated" });
  } catch (e: any) {
    toast.add({
      color: "error",
      title: "Update failed",
      description: e?.data?.message || e?.message,
    });
  }
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

        <UInput v-model="q" placeholder="Search by fee name…" class="w-64" />

        <USelect
          v-model="billing_type"
          :items="billingTypeFilterItems"
          class="w-40"
          :popper="{ strategy: 'fixed' }"
        />

        <USelect
          v-model="recurring_cycle"
          :items="recurringCycleFilterItems"
          class="w-40"
          :disabled="billing_type === 'one_time'"
          :popper="{ strategy: 'fixed' }"
        />

        <USelect
          v-model="is_active"
          :items="activeItems"
          class="w-32"
          :popper="{ strategy: 'fixed' }"
        />

        <USelect
          v-model="per_page"
          :items="perPageItems"
          class="w-24"
          :popper="{ strategy: 'fixed' }"
        />

        <UButton
          variant="soft"
          icon="i-lucide-rotate-cw"
          @click="store.fetchList()"
        >
          Refresh
        </UButton>
      </div>

      <div class="flex items-center gap-2">
        <UButton icon="i-lucide-plus" @click="openCreate">New Fee</UButton>
      </div>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="font-semibold">Fees</div>
          <div class="text-sm text-gray-500">Total: {{ total }}</div>
        </div>
      </template>

      <UTable
        :data="items"
        :columns="columns"
        :loading="loading"
        class="min-w-max"
      />

      <div class="flex items-center justify-between mt-4">
        <div class="text-sm text-gray-500">
          Page {{ page }} of {{ last_page }}
        </div>
        <UPagination v-model="page" :page-count="last_page" />
      </div>
    </UCard>

    <!-- Add/Edit Modal -->
    <UModal
      :open="formOpen"
      @update:open="formOpen = $event"
      :title="isEdit ? 'Edit Fee' : 'New Fee'"
      description="Define fee settings and press Save."
      :prevent-close="saving"
      :closeable="!saving"
      :ui="{ body: 'overflow-visible', footer: 'justify-end' }"
    >
      <template #body>
        <div class="grid gap-4">
          <UFormField label="Name" name="name" :error="errors.name">
            <UInput
              v-model="form.name"
              placeholder="e.g., Tuition Fee"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Type"
            name="billing_type"
            :error="errors.billing_type"
          >
            <USelect
              v-model="form.billing_type"
              :items="billingTypeFormItems"
              placeholder="Select type"
              class="w-full"
              :popper="{ strategy: 'fixed' }"
            />
          </UFormField>

          <UFormField
            label="Cycle"
            name="recurring_cycle"
            :error="errors.recurring_cycle"
          >
            <USelect
              v-model="form.recurring_cycle"
              :items="recurringCycleFormItems"
              placeholder="Select cycle"
              class="w-full"
              :disabled="form.billing_type !== 'recurring'"
              :popper="{ strategy: 'fixed' }"
            />
          </UFormField>

          <UFormField label="Sort order" name="sort_order">
            <UInput
              v-model="form.sort_order"
              type="number"
              min="0"
              placeholder="0"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Status" name="is_active">
            <div class="flex items-center gap-2">
              <USwitch v-model="form.is_active" />
              <span class="text-sm">
                {{ form.is_active ? "Active" : "Inactive" }}
              </span>
            </div>
          </UFormField>
        </div>
      </template>

      <template #footer>
        <UButton
          label="Cancel"
          color="neutral"
          variant="outline"
          :disabled="saving"
          @click="formOpen = false"
        />
        <UButton
          label="Save"
          color="primary"
          :loading="saving"
          @click="submitForm"
        />
      </template>
    </UModal>

    <!-- Delete Confirm -->
    <UModal
      :open="deleteOpen"
      @update:open="deleteOpen = $event"
      title="Delete fee"
      description="This action cannot be undone."
      :prevent-close="removing || saving"
      :closeable="!(removing || saving)"
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <p class="text-sm">
          Are you sure you want to delete <b>{{ deleting.name }}</b
          >? This action cannot be undone.
        </p>
      </template>
      <template #footer>
        <UButton
          label="Cancel"
          color="neutral"
          variant="outline"
          :disabled="removing"
          @click="deleteOpen = false"
        />
        <UButton
          label="Delete"
          color="error"
          :loading="removing"
          @click="confirmDelete"
        />
      </template>
    </UModal>
  </UContainer>
</template>
