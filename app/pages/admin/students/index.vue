<script setup lang="ts">
definePageMeta({
  layout: "admin",
  middleware: "auth",
  requiresAuth: true,
  roles: ["Owner", "Admin", "Developer", "Teacher"],
});

import { h } from "vue";
import { useHead, useToast, useTemplateRef } from "#imports";
import { useDebounceFn } from "@vueuse/core";
import type { TableColumn, TableRow } from "@nuxt/ui";
import type { Student, Gender, ResidentialType, StudentStatus } from "~/types";
import { storeToRefs } from "pinia";

type SelectItem = { label: string; value: any };

/* ---------------- UI resolves ---------------- */
const UButton = resolveComponent("UButton");
const UDropdownMenu = resolveComponent("UDropdownMenu");
const UBadge = resolveComponent("UBadge");
const UAvatar = resolveComponent("UAvatar");
const UIcon = resolveComponent("UIcon");
const UCheckbox = resolveComponent("UCheckbox");

useHead({ title: "Students" });

const toast = useToast();
const router = useRouter();
const studentStore = useStudentStore();
const sessionStore = useSessionStore();
const gradeStore = useSessionGradeStore();
const sectionStore = useSectionStore();

const {
  items,
  loading,
  page,
  last_page,
  total,
  per_page,
  q,
  status,
  gender,
  residential_type,
  academic_session_id,
  session_grade_id,
  section_id,
  sort_by,
  sort_dir,
} = storeToRefs(studentStore);

/* ---------------- Filter Options ---------------- */
const statusItems: SelectItem[] = [
  { label: "All Status", value: null },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Passed", value: "passed" },
  { label: "TC Issued", value: "tc_issued" },
  { label: "Dropped", value: "dropped" },
];

const genderItems: SelectItem[] = [
  { label: "All Genders", value: null },
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
];

const residentialItems: SelectItem[] = [
  { label: "All Types", value: null },
  { label: "Residential", value: "residential" },
  { label: "New Musafir", value: "new_musafir" },
  { label: "Non Residential", value: "non_residential" },
];

const perPageItems = [15, 25, 50, 100].map((n) => ({
  label: String(n),
  value: n,
}));

/* ---------------- Session/Grade/Section Options ---------------- */
const sessionItems = computed<SelectItem[]>(() => [
  { label: "All Sessions", value: null },
  ...(sessionStore.items || []).map((s) => ({
    label: s.name,
    value: s.id,
  })),
]);

const gradeItems = computed<SelectItem[]>(() => {
  if (!academic_session_id.value) return [];
  return [
    { label: "All Grades", value: null },
    ...(gradeStore.items || []).map((g) => ({
      label: g.grade?.name || `Grade #${g.grade_id}`,
      value: g.id,
    })),
  ];
});

const sectionItems = computed<SelectItem[]>(() => {
  if (!session_grade_id.value) return [];
  const sections = sectionStore.itemsForSession(session_grade_id.value);
  return [
    { label: "All Sections", value: null },
    ...sections.map((s) => ({
      label: s.name,
      value: s.id,
    })),
  ];
});

/* ---------------- Lifecycle & Watchers ---------------- */
const debouncedFetch = useDebounceFn(
  () => studentStore.fetchList().catch(() => {}),
  300
);

watch([q], () => {
  studentStore.setPage(1);
  debouncedFetch();
});

watch(
  [
    status,
    gender,
    residential_type,
    academic_session_id,
    session_grade_id,
    section_id,
    per_page,
  ],
  () => {
    studentStore.setPage(1);
    studentStore.fetchList().catch(() => {});
  }
);

watch(page, () => studentStore.fetchList().catch(() => {}));

watch(academic_session_id, (newVal) => {
  if (newVal) {
    gradeStore.setSession(newVal);
    gradeStore.fetchList().catch(() => {});
  }
  studentStore.setSessionGradeId(null);
  studentStore.setSectionId(null);
});

watch(session_grade_id, (newVal) => {
  if (newVal) {
    sectionStore.fetchListBySession(newVal).catch(() => {});
  }
  studentStore.setSectionId(null);
});

onMounted(() => {
  studentStore.fetchList().catch(() => {});
  sessionStore.fetchList().catch(() => {});
});

/* ---------------- Helpers ---------------- */
function statusColor(s?: StudentStatus | null): string {
  switch (s) {
    case "active":
      return "green";
    case "inactive":
      return "gray";
    case "passed":
      return "blue";
    case "tc_issued":
      return "orange";
    case "dropped":
      return "red";
    default:
      return "gray";
  }
}

function statusLabel(s?: StudentStatus | null): string {
  if (!s) return "Unknown";
  return s
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function residentialLabel(r?: ResidentialType | null): string {
  switch (r) {
    case "residential":
      return "Residential";
    case "new_musafir":
      return "New Musafir";
    case "non_residential":
      return "Non Residential";
    default:
      return "—";
  }
}

/* ---------------- Row Actions ---------------- */
const feeModalOpen = ref(false);
const selectedStudentForFee = ref<Student | null>(null);

function assignFees(row: Student) {
  selectedStudentForFee.value = row;
  feeModalOpen.value = true;
}

function onFeesSaved() {
  feeModalOpen.value = false;
  selectedStudentForFee.value = null;
}

function viewStudent(row: Student) {
  router.push(`/admin/students/${row.id}`);
}

function editStudent(row: Student) {
  router.push(`/admin/students/${row.id}/edit`);
}

const deletingStudent = ref<Student | null>(null);
const confirmDelete = ref(false);

function askDelete(row: Student) {
  deletingStudent.value = row;
  confirmDelete.value = true;
}

async function doDelete() {
  if (!deletingStudent.value) return;
  try {
    await studentStore.remove(deletingStudent.value.id);
    toast.add({
      title: "Student deleted",
      color: "success",
    });
    confirmDelete.value = false;
    deletingStudent.value = null;
  } catch (e: any) {
    toast.add({
      title: "Failed to delete student",
      description: e?.data?.message || e.message,
      color: "error",
    });
  }
}

/* ---------------- Table (Nuxt UI v4) ---------------- */
const table = useTemplateRef<{ tableApi?: any }>("table");
const rowSelection = ref<Record<string, boolean>>({});

const selectedRows = computed<Student[]>(() => {
  const rows =
    (table.value?.tableApi?.getFilteredSelectedRowModel().rows as
      | TableRow<Student>[]
      | undefined) || [];
  return rows.map((r) => r.original as Student);
});

const columns: TableColumn<Student>[] = [
  // Checkbox column
  {
    id: "select",
    header: ({ table }) =>
      h(UCheckbox as any, {
        modelValue: table.getIsSomePageRowsSelected()
          ? "indeterminate"
          : table.getIsAllPageRowsSelected(),
        "onUpdate:modelValue": (value: boolean | "indeterminate") =>
          table.toggleAllPageRowsSelected(!!value),
        "aria-label": "Select all",
      }),
    cell: ({ row }) =>
      h(UCheckbox as any, {
        modelValue: row.getIsSelected(),
        "onUpdate:modelValue": (value: boolean | "indeterminate") =>
          row.toggleSelected(!!value),
        "aria-label": "Select row",
      }),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "student_code",
    header: "Code",
    cell: ({ row }) => {
      const s = row.original as Student;
      return h(
        "div",
        { class: "flex items-center gap-3" },
        [
          h(UAvatar as any, {
            src: (s as any).photo_url,
            alt: (s as any).name_bn,
            size: "sm",
          }),
          h(
            "div",
            { class: "font-medium text-gray-900 dark:text-white" },
            s.student_code
          ),
        ].filter(Boolean)
      );
    },
  },
  {
    accessorKey: "name_bn",
    header: "Name",
    cell: ({ row }) => {
      const s = row.original as Student;
      return h("div", {}, [
        h(
          "div",
          { class: "font-medium text-gray-900 dark:text-white" },
          (s as any).name_bn
        ),
        (s as any).name_en
          ? h(
              "div",
              { class: "text-xs text-gray-500 dark:text-gray-400" },
              (s as any).name_en
            )
          : null,
      ]);
    },
  },
  {
    accessorKey: "gender",
    header: "Gender",
    cell: ({ row }) => {
      const g = row.getValue("gender") as Gender | null;
      return h(
        "span",
        { class: "capitalize" },
        g && String(g).length ? g : "—"
      );
    },
  },
  {
    id: "contact",
    header: "Contact",
    cell: ({ row }) => {
      const s = row.original as any;
      const phone = s.father_phone || s.guardian_phone || s.student_phone;
      return h(
        "div",
        { class: "text-sm" },
        phone || h("span", { class: "text-gray-400" }, "—")
      );
    },
  },
  {
    accessorKey: "residential_type",
    header: "Type",
    cell: ({ row }) => {
      const r = row.getValue("residential_type") as ResidentialType | null;
      return residentialLabel(r);
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const s = row.getValue("status") as StudentStatus | null;
      return h(
        UBadge as any,
        {
          color: statusColor(s),
          variant: "subtle",
        },
        () => statusLabel(s)
      );
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const s = row.original as Student;
      const items = [
        { type: "label" as const, label: "Actions" },
        { type: "separator" as const },
        {
          label: "View Details",
          icon: "i-lucide-eye",
          onSelect: () => viewStudent(s),
        },
        {
          label: "Edit",
          icon: "i-lucide-pencil",
          onSelect: () => editStudent(s),
        },
        {
          label: "Assign Fees",
          icon: "i-heroicons-currency-bangladeshi",
          onSelect: () => assignFees(s),
        },
        { type: "separator" as const },
        {
          label: "Delete",
          icon: "i-lucide-trash-2",
          color: "error" as const,
          onSelect: () => askDelete(s),
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

/* ---------------- Bulk Actions ---------------- */
function bulkPromote() {
  if (selectedRows.value.length === 0) {
    toast.add({
      title: "No students selected",
      color: "warning",
    });
    return;
  }
  router.push({
    path: "/admin/students/bulk-promote",
    query: {
      ids: selectedRows.value.map((s: Student) => s.id).join(","),
    },
  });
}

async function exportStudents() {
  try {
    const result = await studentStore.exportStudents();
    toast.add({
      title: "Export successful",
      description: `${result.count} students exported`,
      color: "success",
    });
    // TODO: Download CSV/Excel file
  } catch (e: any) {
    toast.add({
      title: "Export failed",
      description: e?.data?.message || e.message,
      color: "error",
    });
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Students
        </h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage all students and their information
        </p>
      </div>
      <div class="flex items-center gap-3">
        <UButton
          icon="i-heroicons-arrow-up-tray"
          variant="outline"
          :loading="studentStore.exporting"
          @click="exportStudents"
        >
          Export
        </UButton>
        <UButton
          v-if="selectedRows.length > 0"
          icon="i-heroicons-arrow-trending-up"
          color="blue"
          @click="bulkPromote"
        >
          Promote ({{ selectedRows.length }})
        </UButton>
      </div>
    </div>

    <!-- Filters -->
    <UCard>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UInput
          v-model="q"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search students..."
        />

        <USelect v-model="status" :items="statusItems" placeholder="Status" />

        <USelect v-model="gender" :items="genderItems" placeholder="Gender" />

        <USelect
          v-model="residential_type"
          :items="residentialItems"
          placeholder="Residential Type"
        />

        <USelect
          v-model="academic_session_id"
          :items="sessionItems"
          placeholder="Session"
        />

        <USelect
          v-model="session_grade_id"
          :items="gradeItems"
          placeholder="Grade"
          :disabled="!academic_session_id"
        />

        <USelect
          v-model="section_id"
          :items="sectionItems"
          placeholder="Section"
          :disabled="!session_grade_id"
        />

        <UButton
          variant="outline"
          color="neutral"
          @click="studentStore.resetFilters()"
        >
          Reset Filters
        </UButton>
      </div>
    </UCard>

    <!-- Table -->
    <UCard>
      <UTable
        ref="table"
        v-model:row-selection="rowSelection"
        :data="items"
        :columns="columns"
        :loading="loading"
        class="w-full"
      />

      <!-- Pagination -->
      <div
        class="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-700"
      >
        <div class="flex items-center gap-3">
          <span class="text-sm text-gray-700 dark:text-gray-300">
            Rows per page:
          </span>
          <USelect
            v-model="per_page"
            :items="perPageItems"
            size="xs"
            class="w-20"
          />
        </div>

        <div class="flex items-center gap-3">
          <span class="text-sm text-gray-700 dark:text-gray-300">
            {{ total === 0 ? 0 : (page - 1) * per_page + 1 }} -
            {{ Math.min(page * per_page, total) }} of {{ total }}
          </span>
          <UPagination
            v-model:page="page"
            :items-per-page="per_page"
            :total="total"
            size="xs"
          />
        </div>
      </div>
    </UCard>

    <!-- Delete Confirmation Modal -->
    <UModal
      :open="confirmDelete"
      @update:open="confirmDelete = $event"
      title="Delete Student"
      description="This action cannot be undone."
      :prevent-close="studentStore.removing"
      :closeable="!studentStore.removing"
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <p class="text-sm">
          Are you sure you want to delete student
          <strong>{{ deletingStudent?.name_bn }}</strong>
          ({{ deletingStudent?.student_code }})? This action cannot be undone.
        </p>
      </template>

      <template #footer>
        <UButton
          label="Cancel"
          color="neutral"
          variant="outline"
          :disabled="studentStore.removing"
          @click="confirmDelete = false"
        />
        <UButton
          label="Delete"
          color="error"
          :loading="studentStore.removing"
          @click="doDelete"
        />
      </template>
    </UModal>

    <!-- Fee Assignment Modal -->
    <StudentFeeAssignmentModal
      v-if="selectedStudentForFee"
      :open="feeModalOpen"
      :student-id="selectedStudentForFee.id"
      :student-name="
        selectedStudentForFee.name_bn ||
        selectedStudentForFee.name_en ||
        'Student'
      "
      :academic-session-id="
        selectedStudentForFee.enrollments?.[0]?.academic_session_id ||
        academic_session_id ||
        0
      "
      :session-grade-id="
        selectedStudentForFee.enrollments?.[0]?.session_grade_id || null
      "
      @close="feeModalOpen = false"
      @saved="onFeesSaved"
    />
  </div>
</template>
<style scoped>
/* Add any component-specific styles here if needed */
</style>
