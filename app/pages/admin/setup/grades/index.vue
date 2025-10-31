<script setup lang="ts">
definePageMeta({
  layout: "admin",
  middleware: "auth",
  requiresAuth: true,
  roles: ["Owner", "Admin", "Developer"],
});

import { h, reactive, ref, watch, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useHead, useToast } from "#imports";
import type { TableColumn } from "@nuxt/ui";
import { useGradeStore, type Grade } from "~/stores/grade";

/* ---------------- UI component resolves ---------------- */
const UButton = resolveComponent("UButton");
const UDropdownMenu = resolveComponent("UDropdownMenu");
const UBadge = resolveComponent("UBadge");

/* ---------------- Auto-imported in template ----------------
   UTable, UCard, UInput, USelect, UModal, USwitch, UFormField, UPagination
---------------------------------------------------------------- */

useHead({ title: "Grades" });

const toast = useToast();
const store = useGradeStore();
const {
  items,
  loading,
  page,
  last_page,
  total,
  per_page,
  q,
  active,
  saving,
  removing,
} = storeToRefs(store);

/* ---------------- Fetch lifecycle ---------------- */
onMounted(() => store.fetchList().catch(() => {}));

watch([q, active, per_page], () => {
  store.setPage(1);
  store.fetchList().catch(() => {});
});
watch(page, () => store.fetchList().catch(() => {}));

/* ---------------- Helpers ---------------- */
type Row = Grade;

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
    id: "code",
    header: "Code",
    cell: ({ row }) =>
      h(
        "span",
        { class: "text-sm text-gray-700" },
        row.original.code ? String(row.original.code) : "—"
      ),
  },
  {
    id: "sort_order",
    header: "Order",
    cell: ({ row }) =>
      h(
        "span",
        { class: "text-sm" },
        row.original.sort_order ?? row.original.sort_order === 0
          ? String(row.original.sort_order)
          : "—"
      ),
  },
  {
    id: "active",
    accessorKey: "is_active",
    header: "Active",
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
        { label: "Edit", icon: "i-lucide-pencil", onSelect: () => openEdit(r) },
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
  code: string;
  sort_order: number | null;
  is_active: boolean;
};

const form = reactive<FormState>({
  name: "",
  code: "",
  sort_order: null,
  is_active: true,
});

const errors = reactive<Record<string, string>>({});

function clearErrors() {
  Object.keys(errors).forEach((k) => delete (errors as any)[k]);
}

function validate(): boolean {
  clearErrors();
  if (!form.name?.trim()) errors.name = "Name is required";
  if (
    form.sort_order !== null &&
    (isNaN(Number(form.sort_order)) || Number(form.sort_order) < 0)
  ) {
    errors.sort_order = "Order must be a non-negative number";
  }
  return Object.keys(errors).length === 0;
}

function openCreate() {
  isEdit.value = false;
  editingId.value = null;
  Object.assign(form, {
    name: "",
    code: "",
    sort_order: null,
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
    code: row.code || "",
    sort_order:
      row.sort_order ?? row.sort_order === 0
        ? (row.sort_order as number)
        : null,
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
  // Normalize payload
  const payload = {
    name: form.name.trim(),
    code: form.code?.trim() || null,
    sort_order:
      form.sort_order === null || form.sort_order === ("" as any)
        ? null
        : Number(form.sort_order),
    is_active: !!form.is_active,
  };

  try {
    if (isEdit.value && editingId.value) {
      await store.update(editingId.value, payload);
      toast.add({ title: "Grade updated" });
    } else {
      await store.create(payload);
      toast.add({ title: "Grade created" });
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
    toast.add({ title: "Grade deleted" });
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
  <div class="p-4 md:p-6 space-y-4">
    <!-- Top bar -->
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <UInput v-model="q" placeholder="Search by name/code…" class="w-64" />
        <USelect
          v-model="active"
          :options="[
            { label: 'All', value: null },
            { label: 'Active', value: true },
            { label: 'Inactive', value: false },
          ]"
          class="w-40"
        />
        <USelect
          v-model="per_page"
          :options="
            [10, 15, 25, 50].map((n) => ({ label: String(n), value: n }))
          "
          class="w-24"
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
        <UButton icon="i-lucide-plus" @click="openCreate">New Grade</UButton>
      </div>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="font-semibold">Grades</div>
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
      :title="isEdit ? 'Edit Grade' : 'New Grade'"
      :prevent-close="saving"
      :closeable="!saving"
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <div class="grid gap-4">
          <UFormField label="Name" name="name" :error="errors.name">
            <UInput v-model="form.name" placeholder="e.g., Class 6" />
          </UFormField>

          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Code" name="code">
              <UInput v-model="form.code" placeholder="e.g., C6" />
            </UFormField>

            <UFormField
              label="Order"
              name="sort_order"
              :error="errors.sort_order"
            >
              <UInput
                v-model.number="form.sort_order"
                type="number"
                min="0"
                placeholder="(optional)"
              />
            </UFormField>
          </div>

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
      title="Delete grade"
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
  </div>
</template>
