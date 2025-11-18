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
import type { Subject } from "~/types";

/* ---------------- UI component resolves ---------------- */
const UButton = resolveComponent("UButton");
const UDropdownMenu = resolveComponent("UDropdownMenu");
const UBadge = resolveComponent("UBadge");

/* ---------------- Auto-imported in template ----------------
   UTable, UCard, UInput, USelect, UModal, USwitch, UFormField, UPagination
---------------------------------------------------------------- */

useHead({ title: "Subjects" });

const toast = useToast();
const router = useRouter();
const goBack = () => router.back();

const store = useSubjectStore();
const {
  items,
  loading,
  page,
  last_page,
  total,
  per_page,
  q,
  only_active,
  saving,
  removing,
} = storeToRefs(store);

/* ---------------- Local: Grade filters/items ---------------- */
const gradeOptions = ref<SelectItem<number>[]>([]);
const gradeFilter = ref<number | null>(null);

const gradeFilterItems = computed<SelectItem[]>(() => [
  { label: "All Grades", value: null },
  ...gradeOptions.value,
]);

// grade_id -> name ম্যাপ, টেবিলে দেখানোর সুবিধার জন্য (header-এ ব্যবহার)
const gradeMap = computed<Record<number, string>>(() => {
  const m: Record<number, string> = {};
  for (const g of gradeOptions.value) {
    if (typeof g.value === "number") {
      m[g.value] = g.label as string;
    }
  }
  return m;
});

// Active filter: All / Only active
const activeItems: SelectItem[] = [
  { label: "All", value: false },
  { label: "Only active", value: true },
];

const perPageItems = computed<SelectItem<number>[]>(() =>
  [10, 15, 25, 50].map((n) => ({ label: String(n), value: n }))
);

/** Load all active grades (unpaginated) for filter + form */
async function loadGrades() {
  try {
    const { $publicApi } = useNuxtApp();
    const res = await $publicApi<{ data: { id: number; name: string }[] }>(
      "/v1/grades",
      { query: { paginate: false, is_active: true, per_page: 9999 } }
    );
    const list = Array.isArray(res?.data) ? res.data : [];
    gradeOptions.value = list.map((g) => ({ label: g.name, value: g.id }));
  } catch (e: any) {
    gradeOptions.value = [];
    toast.add({
      color: "error",
      title: "Failed to load grades",
      description: e?.data?.message || e?.message,
    });
  }
}

/* ---------------- Fetch lifecycle ---------------- */
onMounted(async () => {
  await Promise.all([loadGrades(), store.fetchList()]);
});

// search / only_active / per_page বদলালে লিস্ট রিফ্রেশ
watch([q, only_active, per_page], () => {
  store.setPage(1);
  store.fetchList().catch(() => {});
});

// page বদলালে
watch(page, () => {
  store.fetchList().catch(() => {});
});

// grade filter → store.setGrade
watch(gradeFilter, (v) => {
  store.setGrade(typeof v === "number" ? v : null);
  store.setPage(1);
  store.fetchList().catch(() => {});
});

/* ---------------- Grouped list by grade ---------------- */
type Row = Subject;

type SubjectGroup = {
  grade_id: number;
  grade_name: string;
  subjects: Subject[];
};

const groupedSubjects = computed<SubjectGroup[]>(() => {
  const byGrade: Record<number, SubjectGroup> = {};

  for (const s of items.value || []) {
    const gid = s.grade_id;
    if (!byGrade[gid]) {
      byGrade[gid] = {
        grade_id: gid,
        grade_name: gradeMap.value[gid] ?? `Grade #${gid}`,
        subjects: [],
      };
    }
    byGrade[gid].subjects.push(s);
  }

  // গ্রেড নাম অনুযায়ী sort (numeric-friendly)
  return Object.values(byGrade).sort((a, b) =>
    a.grade_name.localeCompare(b.grade_name, undefined, { numeric: true })
  );
});

/* ---------------- Columns (grade column বাদ) ---------------- */
const columns: TableColumn<Row>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) =>
      h("div", { class: "leading-tight" }, [
        h("div", { class: "font-medium" }, row.getValue("name") as string),
        h(
          "div",
          { class: "text-xs text-gray-500" },
          `#${row.original.id} · ${row.original.code}`
        ),
      ]),
  },
  {
    id: "code",
    header: "Code",
    cell: ({ row }) =>
      h("span", { class: "text-sm text-gray-700" }, row.original.code || "—"),
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
  grade_id: number | null;
  name: string;
  code: string;
  is_active: boolean;
};

const form = reactive<FormState>({
  grade_id: null,
  name: "",
  code: "",
  is_active: true,
});

const errors = reactive<Record<string, string>>({});

function clearErrors() {
  Object.keys(errors).forEach((k) => delete (errors as any)[k]);
}

function validate(): boolean {
  clearErrors();
  if (!form.grade_id) errors.grade_id = "Grade is required";
  if (!form.name?.trim()) errors.name = "Name is required";
  if (!form.code?.trim()) errors.code = "Code is required";
  return Object.keys(errors).length === 0;
}

function openCreate() {
  isEdit.value = false;
  editingId.value = null;
  Object.assign(form, {
    grade_id: gradeFilter.value || null,
    name: "",
    code: "",
    is_active: true,
  });
  clearErrors();
  formOpen.value = true;
}

function openEdit(row: Row) {
  isEdit.value = true;
  editingId.value = row.id;
  Object.assign(form, {
    grade_id: row.grade_id,
    name: row.name,
    code: row.code || "",
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
  const payload = {
    grade_id: Number(form.grade_id),
    name: form.name.trim(),
    code: form.code.trim(),
    is_active: !!form.is_active,
  };

  try {
    if (isEdit.value && editingId.value) {
      await store.update(editingId.value, payload);
      toast.add({ title: "Subject updated" });
    } else {
      await store.create(payload);
      toast.add({ title: "Subject created" });
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
    toast.add({ title: "Subject deleted" });
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

        <UInput
          v-model="q"
          placeholder="Search by subject name/code…"
          class="w-64"
        />

        <USelect
          v-model="gradeFilter"
          :items="gradeFilterItems"
          class="w-56"
          placeholder="Filter by grade"
          :popper="{ strategy: 'fixed' }"
        />

        <USelect
          v-model="only_active"
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
        >
          Refresh
        </UButton>
      </div>

      <div class="flex items-center gap-2">
        <UButton icon="i-lucide-plus" @click="openCreate">New Subject</UButton>
      </div>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="font-semibold">Subjects (grouped by grade)</div>
          <div class="text-sm text-gray-500">Total: {{ total }}</div>
        </div>
      </template>

      <!-- Grouped list -->
      <div class="space-y-4">
        <div
          v-for="group in groupedSubjects"
          :key="group.grade_id"
          class="border border-gray-200 rounded-lg overflow-hidden"
        >
          <div
            class="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-900/40"
          >
            <div class="font-semibold">
              {{ group.grade_name }}
            </div>
            <div class="text-xs text-gray-500">
              Subjects: {{ group.subjects.length }}
            </div>
          </div>

          <UTable
            :data="group.subjects"
            :columns="columns"
            :loading="loading"
            class="min-w-max"
          />
        </div>

        <div
          v-if="!groupedSubjects.length"
          class="py-6 text-center text-sm text-gray-500"
        >
          No subjects found.
        </div>
      </div>

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
      :title="isEdit ? 'Edit Subject' : 'New Subject'"
      description="Fill in the subject details and press Save."
      :prevent-close="saving"
      :closeable="!saving"
      :ui="{ body: 'overflow-visible', footer: 'justify-end' }"
    >
      <template #body>
        <div class="grid gap-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Grade" name="grade_id" :error="errors.grade_id">
              <USelect
                v-model="form.grade_id"
                :items="gradeOptions"
                placeholder="Select a grade"
                class="w-full"
                :popper="{ strategy: 'fixed' }"
              />
            </UFormField>

            <UFormField label="Code" name="code" :error="errors.code">
              <UInput v-model="form.code" placeholder="e.g., ENG101" />
            </UFormField>
          </div>

          <UFormField label="Name" name="name" :error="errors.name">
            <UInput v-model="form.name" placeholder="e.g., English" />
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
      title="Delete subject"
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
