<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, watch } from "vue";
import { useToast } from "#imports";
import type { ColumnDef } from "@tanstack/vue-table";
import {
  useSessionGradeStore,
  type SessionGrade,
} from "~/stores/session-grade";
import { useSectionStore, type Section } from "~/stores/section";

const props = defineProps<{ sessionId: number; classId?: number | null }>();
const emit = defineEmits<{ (e: "update:class-id", id: number | null): void }>();

const toast = useToast();
const classStore = useSessionGradeStore();
const sectionStore = useSectionStore();

/** Normalize */
const classRows = computed<SessionGrade[]>(() => {
  const val: any = classStore.items as any;
  if (Array.isArray(val)) return val;
  if (val?.data && Array.isArray(val.data)) return val.data;
  return [];
});
const sectionRows = computed<Section[]>(() => {
  const val: any = sectionStore.items as any;
  if (Array.isArray(val)) return val;
  if (val?.data && Array.isArray(val.data)) return val.data;
  return [];
});

/** columns */
const columns = ref<ColumnDef<Section, any>[]>([
  { accessorKey: "name", header: "Section" },
  { accessorKey: "code", header: "Code" },
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
  {
    accessorKey: "sort_order",
    header: "Order",
    cell: ({ row }) =>
      h("input", {
        class: "u-input w-24",
        type: "number",
        value: row.original.sort_order ?? 0,
        onInput: (e: any) =>
          (row.original.sort_order = Number(e?.target?.value ?? 0)),
      }),
    meta: { class: { th: "w-[96px]" } },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) =>
      h("div", { class: "flex items-center gap-2" }, [
        h(
          "button",
          {
            class: "btn btn-subtle btn-xs u-button u-button--subtle",
            onClick: () => handleUpdate(row.original),
          },
          "Save"
        ),
        h(
          "button",
          {
            class: "btn btn-ghost btn-xs text-error u-button u-button--ghost",
            onClick: () => sectionStore.remove(row.original.id),
          },
          "Delete"
        ),
      ]),
    meta: { class: { th: "w-[140px]" } },
  },
]);

/** UI */
const selectedClassId = computed<number | null>({
  get: () => props.classId ?? null,
  set: (v) => emit("update:class-id", v),
});

const openAdd = ref(false);
const openBulk = ref(false);

const addForm = reactive({
  name: "" as string,
  code: null as string | null,
  capacity: null as number | null,
  class_teacher_id: null as number | null,
});

const bulkForm = reactive({
  names_input: "" as string,
  capacity: null as number | null,
  class_teacher_id: null as number | null,
});

onMounted(async () => {
  // Ensure classes are loaded for this session (for dropdown)
  classStore.setSession(props.sessionId);
  if (classRows.value.length === 0) {
    await classStore.fetchList();
  }
  // Auto-pick first class if none
  if (!selectedClassId.value && classRows.value.length > 0) {
    selectedClassId.value = classRows.value[0].id;
  }
});

watch(selectedClassId, async (val) => {
  if (!val) return;
  try {
    sectionStore.setSessionGrade(val);
    await sectionStore.fetchList();
  } catch {
    toast.add({ title: "Failed to load sections", color: "error" });
  }
});

async function applyFilters() {
  if (!selectedClassId.value) return;
  await sectionStore.fetchList();
}
function resetFilters() {
  sectionStore.resetFilters();
}

async function handleCreate() {
  if (!selectedClassId.value) return;
  if (!addForm.name.trim()) {
    toast.add({ title: "Section name is required", color: "error" });
    return;
  }
  try {
    await sectionStore.create({
      name: addForm.name.trim(),
      code: addForm.code,
      capacity: addForm.capacity,
      class_teacher_id: addForm.class_teacher_id,
    });
    openAdd.value = false;
    Object.assign(addForm, {
      name: "",
      code: null,
      capacity: null,
      class_teacher_id: null,
    });
    toast.add({ title: "Section created" });
  } catch (e: any) {
    toast.add({
      title: e?.data?.message || "Failed to create section",
      color: "error",
    });
  }
}

async function handleBulk() {
  if (!selectedClassId.value) return;
  const names = bulkForm.names_input
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (names.length === 0) {
    toast.add({ title: "Provide at least one section name", color: "error" });
    return;
  }
  try {
    await sectionStore.bulkCreate({
      names,
      capacity: bulkForm.capacity,
      class_teacher_id: bulkForm.class_teacher_id,
    });
    openBulk.value = false;
    Object.assign(bulkForm, {
      names_input: "",
      capacity: null,
      class_teacher_id: null,
    });
    toast.add({ title: "Sections created (bulk)" });
  } catch (e: any) {
    toast.add({
      title: e?.data?.message || "Bulk create failed",
      color: "error",
    });
  }
}

async function handleUpdate(row: Section) {
  try {
    await sectionStore.update(row.id, {
      name: row.name,
      code: row.code ?? null,
      capacity: row.capacity ?? null,
      class_teacher_id: row.class_teacher_id ?? null,
      sort_order: row.sort_order ?? null,
    });
    toast.add({ title: "Updated" });
  } catch (e: any) {
    toast.add({ title: e?.data?.message || "Update failed", color: "error" });
  }
}

async function handleReorder() {
  const items = sectionRows.value.map((s) => ({
    id: s.id,
    sort_order: s.sort_order ?? 0,
  }));
  try {
    await sectionStore.reorder(items);
    toast.add({ title: "Reordered" });
  } catch (e: any) {
    toast.add({ title: e?.data?.message || "Reorder failed", color: "error" });
  }
}
</script>

<template>
  <UCard class="mt-4 space-y-4">
    <div class="flex flex-wrap items-end gap-2">
      <USelect
        v-model.number="selectedClassId"
        :options="
          classRows.map((c) => ({
            label:
              (c.grade?.name || 'Grade#' + c.grade_id) +
              (c.shift ? ' · ' + c.shift : '') +
              (c.medium ? ' · ' + c.medium : ''),
            value: c.id,
          }))
        "
        placeholder="Pick a class"
        class="w-[360px]"
      />
      <UInput
        v-model="sectionStore.search"
        placeholder="Search section..."
        class="w-64"
      />
      <UButton
        color="primary"
        @click="applyFilters"
        :loading="sectionStore.loading"
        >Apply</UButton
      >
      <UButton variant="subtle" @click="resetFilters">Reset</UButton>

      <div class="ms-auto flex gap-2">
        <UButton
          icon="i-lucide-plus"
          color="primary"
          :disabled="!selectedClassId"
          @click="openAdd = true"
          >Add Section</UButton
        >
        <UButton
          icon="i-lucide-list-plus"
          variant="soft"
          :disabled="!selectedClassId"
          @click="openBulk = true"
          >Bulk Add</UButton
        >
        <UButton
          icon="i-lucide-arrow-up-n-arrow-down"
          variant="outline"
          :disabled="!selectedClassId"
          @click="handleReorder"
        >
          Save Order
        </UButton>
      </div>
    </div>

    <div>
      <UTable
        :columns="columns"
        :data="sectionRows"
        :loading="sectionStore.loading"
        :empty="
          selectedClassId
            ? 'No sections yet.'
            : 'Pick a class to view sections.'
        "
      />
      <div class="flex items-center justify-between mt-4">
        <div class="text-xs text-neutral-500">
          {{ sectionStore.total }} items · page {{ sectionStore.page }} /
          {{ sectionStore.last_page }}
        </div>
        <UPagination
          v-model="sectionStore.page"
          :page-count="sectionStore.last_page"
          @update:modelValue="applyFilters"
        />
      </div>
    </div>

    <!-- Add modal -->
    <UModal v-model="openAdd">
      <UCard>
        <div class="text-lg font-semibold mb-2">Add Section</div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <UInput v-model="addForm.name" placeholder="Name * e.g. A" />
          <UInput v-model="addForm.code" placeholder="Code (optional)" />
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
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <UButton variant="subtle" @click="openAdd = false">Cancel</UButton>
          <UButton
            color="primary"
            :loading="sectionStore.saving"
            @click="handleCreate"
            >Save</UButton
          >
        </div>
      </UCard>
    </UModal>

    <!-- Bulk modal -->
    <UModal v-model="openBulk">
      <UCard>
        <div class="text-lg font-semibold mb-2">Bulk Add Sections</div>
        <div class="space-y-3">
          <UInput
            v-model="bulkForm.names_input"
            placeholder="Names (A,B,C) or each on new line"
          />
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <UInput
              v-model.number="bulkForm.capacity"
              type="number"
              placeholder="Capacity (optional)"
            />
            <UInput
              v-model.number="bulkForm.class_teacher_id"
              type="number"
              placeholder="Class Teacher ID (optional)"
            />
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <UButton variant="subtle" @click="openBulk = false">Cancel</UButton>
          <UButton
            color="primary"
            :loading="sectionStore.saving"
            @click="handleBulk"
            >Create</UButton
          >
        </div>
      </UCard>
    </UModal>
  </UCard>
</template>
