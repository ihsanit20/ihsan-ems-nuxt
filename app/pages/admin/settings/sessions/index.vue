<!-- app/pages/admin/settings/sessions/index.vue -->
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
import { useRouter } from "vue-router";
import type { SelectItem } from "@nuxt/ui";
import {
  useSessionStore,
  type AcademicSession,
} from "~/stores/academic-session";

/* ---------------- UI resolves ---------------- */
const UButton = resolveComponent("UButton");
const UDropdownMenu = resolveComponent("UDropdownMenu");
const UBadge = resolveComponent("UBadge");
const UCard = resolveComponent("UCard");

useHead({ title: "Academic Sessions" });

const toast = useToast();
const router = useRouter();
const store = useSessionStore();
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

/* ---------------- Filters ---------------- */
const activeItems: SelectItem[] = [
  { label: "All", value: null },
  { label: "Active", value: true },
  { label: "Inactive", value: false },
];
const perPageItems = [10, 15, 25, 50].map((n) => ({
  label: String(n),
  value: n,
}));

/* ---------------- Lifecycle ---------------- */
onMounted(() => store.fetchList().catch(() => {}));
watch([q, active, per_page], () => {
  store.setPage(1);
  store.fetchList().catch(() => {});
});
watch(page, () => store.fetchList().catch(() => {}));

/* ---------------- Helpers ---------------- */
function fmtDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
function toDateInput(v?: string) {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

/* ---------------- Navigation ---------------- */
const openDetails = (r: AcademicSession) =>
  router.push(`/admin/settings/sessions/${r.id}/details`);

/* ---------------- Add/Edit modal (same as before) ---------------- */
const formOpen = ref(false);
const isEdit = ref(false);
const editingId = ref<number | null>(null);

type FormState = {
  name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  is_active: boolean;
};
const form = reactive<FormState>({
  name: "",
  start_date: "",
  end_date: "",
  is_active: true,
});

const errors = reactive<Record<string, string>>({});
function clearErrors() {
  Object.keys(errors).forEach((k) => delete errors[k]);
}
function validate(): boolean {
  clearErrors();
  if (!form.name?.trim()) errors.name = "Name is required";
  if (!form.start_date) errors.start_date = "Start date is required";
  if (!form.end_date) errors.end_date = "End date is required";
  if (form.start_date && form.end_date) {
    const sd = new Date(form.start_date);
    const ed = new Date(form.end_date);
    if (ed < sd) errors.end_date = "End date must be after start date";
  }
  return Object.keys(errors).length === 0;
}
function openCreate() {
  isEdit.value = false;
  editingId.value = null;
  Object.assign(form, {
    name: "",
    start_date: "",
    end_date: "",
    is_active: true,
  });
  clearErrors();
  formOpen.value = true;
}
function openEdit(row: AcademicSession) {
  isEdit.value = true;
  editingId.value = row.id;
  Object.assign(form, {
    name: row.name,
    start_date: toDateInput(row.start_date),
    end_date: toDateInput(row.end_date),
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
  try {
    if (isEdit.value && editingId.value) {
      await store.update(editingId.value, { ...form });
      toast.add({ title: "Session updated" });
    } else {
      await store.create({ ...form });
      toast.add({ title: "Session created" });
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

/* ---------------- Delete modal + actions ---------------- */
const deleteOpen = ref(false);
const deleting = reactive<{ id: number | null; name: string }>({
  id: null,
  name: "",
});

function askDelete(row: AcademicSession) {
  deleting.id = row.id;
  deleting.name = row.name;
  deleteOpen.value = true;
}
async function confirmDelete() {
  if (!deleting.id) return;
  try {
    await store.remove(deleting.id);
    toast.add({ title: "Session deleted" });
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
async function toggleActive(row: AcademicSession) {
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

/* ---------------- Card menu factory ---------------- */
function cardMenuItems(r: AcademicSession) {
  return [
    { type: "label", label: "Actions" },
    { label: "Details", icon: "i-lucide-eye", onSelect: () => openDetails(r) },
    { label: "Edit", icon: "i-lucide-pencil", onSelect: () => openEdit(r) },
    {
      label: r.is_active ? "Deactivate" : "Activate",
      icon: r.is_active ? "i-lucide-pause" : "i-lucide-check",
      onSelect: () => toggleActive(r),
    },
    { type: "separator" as const },
    {
      label: "Delete",
      icon: "i-lucide-trash-2",
      color: "error",
      onSelect: () => askDelete(r),
    },
  ];
}
</script>

<template>
  <div class="p-4 md:p-6 space-y-4">
    <!-- Top bar: filters stay same -->
    <div
      class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
    >
      <div class="flex flex-wrap items-center gap-2">
        <UInput v-model="q" placeholder="Search by name…" class="w-64" />
        <USelect
          v-model="active"
          :items="activeItems"
          class="w-40"
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
          >Refresh</UButton
        >
      </div>

      <div class="flex items-center gap-2">
        <UButton icon="i-lucide-plus" @click="openCreate">New Session</UButton>
      </div>
    </div>

    <!-- Cards grid -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="font-semibold">Sessions</div>
          <div class="text-sm text-gray-500">Total: {{ total }}</div>
        </div>
      </template>

      <div
        v-if="loading"
        class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
      >
        <UCard v-for="i in 6" :key="i">
          <USkeleton class="h-5 w-2/3 mb-2" />
          <USkeleton class="h-4 w-1/2 mb-4" />
          <USkeleton class="h-9 w-24" />
        </UCard>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <UCard
          v-for="s in items"
          :key="s.id"
          class="hover:shadow-md transition-shadow"
        >
          <!-- Card header: name + menu -->
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <h3 class="font-medium truncate">{{ s.name }}</h3>
              <p class="text-xs text-gray-500">#{{ s.id }}</p>
            </div>

            <UDropdownMenu
              :items="cardMenuItems(s)"
              :content="{ align: 'end' }"
            >
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-ellipsis-vertical"
                aria-label="Actions"
              />
            </UDropdownMenu>
          </div>

          <!-- Meta: dates + active -->
          <div class="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span class="px-2 py-1 rounded border bg-white/70">
              {{ fmtDate(s.start_date) }} → {{ fmtDate(s.end_date) }}
            </span>
            <UBadge
              :label="s.is_active ? 'Active' : 'Inactive'"
              :color="s.is_active ? 'primary' : 'neutral'"
            />
          </div>

          <!-- Footer: quick actions -->
          <div class="mt-4 flex items-center gap-2">
            <UButton
              color="primary"
              variant="solid"
              size="sm"
              icon="i-lucide-eye"
              @click="openDetails(s)"
            >
              Details
            </UButton>
          </div>
        </UCard>
      </div>

      <template #footer>
        <div class="flex items-center justify-between">
          <div class="text-sm text-gray-500">
            Page {{ page }} of {{ last_page }}
          </div>
          <UPagination v-model="page" :page-count="last_page" />
        </div>
      </template>
    </UCard>

    <!-- Add/Edit Modal -->
    <UModal
      :open="formOpen"
      @update:open="formOpen = $event"
      :title="isEdit ? 'Edit Session' : 'New Session'"
      :prevent-close="saving"
      :closeable="!saving"
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <div class="grid gap-4">
          <UFormField label="Name" name="name" :error="errors.name">
            <UInput v-model="form.name" placeholder="e.g., 2025–26 JD" />
          </UFormField>

          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField
              label="Start date"
              name="start_date"
              :error="errors.start_date"
            >
              <UInput v-model="form.start_date" type="date" />
            </UFormField>
            <UFormField
              label="End date"
              name="end_date"
              :error="errors.end_date"
            >
              <UInput v-model="form.end_date" type="date" />
            </UFormField>
          </div>

          <UFormField label="Status" name="is_active">
            <div class="flex items-center gap-2">
              <USwitch v-model="form.is_active" />
              <span class="text-sm">{{
                form.is_active ? "Active" : "Inactive"
              }}</span>
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
      title="Delete session"
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
