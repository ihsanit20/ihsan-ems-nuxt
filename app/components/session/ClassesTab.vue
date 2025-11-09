<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from "vue";
import { useToast } from "#imports";
import type { ColumnDef } from "@tanstack/vue-table";
import {
  useSessionGradeStore,
  type SessionGrade,
} from "~/stores/session-grade";

const props = defineProps<{ sessionId: number }>();
const emit = defineEmits<{ (e: "select-class", id: number): void }>();

const toast = useToast();
const classStore = useSessionGradeStore();

/** Normalize to always Array for UTable + options */
const classRows = computed<SessionGrade[]>(() => {
  const val: any = classStore.items as any;
  if (Array.isArray(val)) return val;
  if (val?.data && Array.isArray(val.data)) return val.data;
  return [];
});

/** Columns */
const columns = ref<ColumnDef<SessionGrade, any>[]>([
  {
    id: "grade",
    header: "Grade",
    cell: ({ row }) =>
      h(
        "span",
        { class: "font-medium" },
        row.original.grade?.name ?? `#${row.original.grade_id}`
      ),
  },
  { accessorKey: "shift", header: "Shift" },
  { accessorKey: "medium", header: "Medium" },
  { accessorKey: "capacity", header: "Capacity" },
  {
    id: "teacher",
    header: "Class Teacher",
    cell: ({ row }) =>
      h(
        "span",
        {},
        row.original.class_teacher?.name ??
          (row.original.class_teacher_id
            ? `#${row.original.class_teacher_id}`
            : "-")
      ),
  },
  { accessorKey: "code", header: "Code" },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) =>
      h("div", { class: "flex items-center gap-2" }, [
        h(
          "button",
          {
            class: "btn btn-outline btn-xs u-button u-button--outline",
            onClick: () => emit("select-class", row.original.id),
          },
          "Sections"
        ),
        h(
          "button",
          {
            class: "btn btn-subtle btn-xs u-button u-button--subtle",
            onClick: () => handleUpdate(row.original),
          },
          "Save"
        ),
      ]),
    meta: { class: { th: "w-[160px]" } },
  },
]);

/** Filters + forms */
const openAdd = ref(false);
const openBulk = ref(false);

const addForm = reactive({
  grade_id: null as number | null,
  shift: null as string | null,
  medium: null as string | null,
  capacity: null as number | null,
  class_teacher_id: null as number | null,
  code: null as string | null,
});
const bulkForm = reactive({
  grade_ids_input: "" as string,
  shift: null as string | null,
  medium: null as string | null,
  capacity: null as number | null,
  class_teacher_id: null as number | null,
});

onMounted(async () => {
  classStore.setSession(props.sessionId);
  await classStore.fetchList();
});

async function applyFilters() {
  await classStore.fetchList();
}
function resetFilters() {
  classStore.resetFilters();
}

async function handleCreate() {
  if (!addForm.grade_id) {
    toast.add({ title: "Grade is required", color: "error" });
    return;
  }
  try {
    await classStore.create(props.sessionId, { ...addForm });
    openAdd.value = false;
    Object.assign(addForm, {
      grade_id: null,
      shift: null,
      medium: null,
      capacity: null,
      class_teacher_id: null,
      code: null,
    });
    toast.add({ title: "Class opened" });
  } catch (e: any) {
    toast.add({
      title: e?.data?.message || "Failed to open class",
      color: "error",
    });
  }
}

async function handleBulk() {
  const grade_ids = bulkForm.grade_ids_input
    .split(/[\s,]+/)
    .map((n) => Number(n))
    .filter(Boolean);
  if (grade_ids.length === 0) {
    toast.add({ title: "Provide at least one grade id", color: "error" });
    return;
  }
  try {
    await classStore.bulkOpen(props.sessionId, {
      grade_ids,
      shift: bulkForm.shift,
      medium: bulkForm.medium,
      capacity: bulkForm.capacity,
      class_teacher_id: bulkForm.class_teacher_id,
    });
    openBulk.value = false;
    Object.assign(bulkForm, {
      grade_ids_input: "",
      shift: null,
      medium: null,
      capacity: null,
      class_teacher_id: null,
    });
    toast.add({ title: "Classes opened (bulk)" });
  } catch (e: any) {
    toast.add({
      title: e?.data?.message || "Bulk open failed",
      color: "error",
    });
  }
}

async function handleUpdate(row: SessionGrade) {
  try {
    await classStore.update(row.id, {
      shift: row.shift ?? null,
      medium: row.medium ?? null,
      capacity: row.capacity ?? null,
      class_teacher_id: row.class_teacher_id ?? null,
      code: row.code ?? null,
      meta_json: row.meta_json ?? null,
    });
    toast.add({ title: "Updated" });
  } catch (e: any) {
    toast.add({ title: e?.data?.message || "Update failed", color: "error" });
  }
}

async function handlePageChange() {
  await classStore.fetchList();
}
</script>

<template>
  <UCard class="mt-4">
    <div class="flex flex-wrap items-end gap-2">
      <UInput
        v-model="classStore.shift"
        placeholder="Shift (e.g., morning/evening)"
        class="w-60"
      />
      <UInput
        v-model="classStore.medium"
        placeholder="Medium (bn/en/ar)"
        class="w-52"
      />
      <UInput
        v-model.number="classStore.grade_id"
        placeholder="Grade ID"
        type="number"
        class="w-40"
      />
      <UButton
        color="primary"
        @click="applyFilters"
        :loading="classStore.loading"
        >Apply</UButton
      >
      <UButton variant="subtle" @click="resetFilters">Reset</UButton>

      <div class="ms-auto flex gap-2">
        <UButton icon="i-lucide-plus" color="primary" @click="openAdd = true"
          >Add Class</UButton
        >
        <UButton
          icon="i-lucide-folder-plus"
          variant="soft"
          @click="openBulk = true"
          >Bulk Open</UButton
        >
      </div>
    </div>

    <div class="mt-4">
      <UTable
        :columns="columns"
        :data="classRows"
        :loading="classStore.loading"
        empty="No classes opened yet."
      />
      <div class="flex items-center justify-between mt-4">
        <div class="text-xs text-neutral-500">
          {{ classStore.total }} items · page {{ classStore.page }} /
          {{ classStore.last_page }}
        </div>
        <UPagination
          v-model="classStore.page"
          :page-count="classStore.last_page"
          @update:modelValue="handlePageChange"
        />
      </div>
    </div>

    <!-- Add modal -->
    <UModal v-model="openAdd">
      <UCard>
        <div class="text-lg font-semibold mb-2">Open Class (Session)</div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <UInput
            v-model.number="addForm.grade_id"
            type="number"
            placeholder="Grade ID *"
          />
          <UInput v-model="addForm.shift" placeholder="Shift (optional)" />
          <UInput v-model="addForm.medium" placeholder="Medium (optional)" />
          <UInput
            v-model.number="addForm.capacity"
            type="number"
            placeholder="Capacity"
          />
          <UInput
            v-model.number="addForm.class_teacher_id"
            type="number"
            placeholder="Class Teacher ID"
          />
          <UInput v-model="addForm.code" placeholder="Code" />
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <UButton variant="subtle" @click="openAdd = false">Cancel</UButton>
          <UButton
            color="primary"
            :loading="classStore.saving"
            @click="handleCreate"
            >Save</UButton
          >
        </div>
      </UCard>
    </UModal>

    <!-- Bulk modal -->
    <UModal v-model="openBulk">
      <UCard>
        <div class="text-lg font-semibold mb-2">Bulk Open Classes</div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <UInput
            v-model="bulkForm.grade_ids_input"
            placeholder="Grade IDs: e.g. 1,2,3"
          />
          <UInput v-model="bulkForm.shift" placeholder="Shift (same for all)" />
          <UInput
            v-model="bulkForm.medium"
            placeholder="Medium (same for all)"
          />
          <UInput
            v-model.number="bulkForm.capacity"
            type="number"
            placeholder="Capacity (same for all)"
          />
          <UInput
            v-model.number="bulkForm.class_teacher_id"
            type="number"
            placeholder="Class Teacher ID (optional)"
          />
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <UButton variant="subtle" @click="openBulk = false">Cancel</UButton>
          <UButton
            color="primary"
            :loading="classStore.saving"
            @click="handleBulk"
            >Open</UButton
          >
        </div>
      </UCard>
    </UModal>
  </UCard>
</template>
