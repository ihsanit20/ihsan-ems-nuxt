<script setup lang="ts">
import { h, reactive, ref, computed, onMounted } from "vue";
import { useToast } from "#imports";
import type { ColumnDef } from "@tanstack/vue-table";

const UButton = resolveComponent("UButton");

const props = defineProps<{ sessionId: number }>();
const emit = defineEmits<{ (e: "select-class", id: number): void }>();

const toast = useToast();
const classStore = useSessionGradeStore();
const gradeStore = useGradeStore();

/** Table data normalize */
const classRows = computed<SessionGrade[]>(() => {
  const val: any = classStore.items as any;
  if (Array.isArray(val)) return val;
  if (val?.data && Array.isArray(val.data)) return val.data;
  return [];
});

/** Columns: Grade + Actions */
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
      ]),
    meta: { class: { th: "w-[130px]" } },
  },
]);

/** Grades options (Nuxt UI v4.1): { label, value } */
const gradeOptions = computed(() => {
  const items = (gradeStore.items || []) as Grade[];
  return [
    { label: "All grades", value: undefined }, // filter-এর জন্য "সব"
    ...items.map((g) => ({
      label: g.level?.name ? `${g.name} · ${g.level.name}` : g.name,
      value: g.id,
    })),
  ];
});

/** Bulk form: শুধু grade_ids */
const bulkForm = reactive({
  grade_ids: [] as number[],
});

/** Init */
onMounted(async () => {
  classStore.setSession(props.sessionId);
  await Promise.all([
    classStore.fetchList(),
    // গ্রেড লিস্ট with_level সহ আনছি যাতে অপশনে Level দেখানো যায়
    gradeStore.fetchList({ per_page: 200, is_active: true, with_level: 1 }),
  ]);
});

/** Filters (শুধু grade_id) */
async function applyFilters() {
  await classStore.fetchList();
}
function resetFilters() {
  classStore.resetFilters();
}

/** CRUD: Bulk open */
async function handleBulk() {
  const grade_ids = bulkForm.grade_ids.filter(Boolean);
  if (grade_ids.length === 0) {
    toast.add({ title: "Pick at least one grade", color: "error" });
    return;
  }
  try {
    await classStore.bulkOpen(props.sessionId, { grade_ids });
    Object.assign(bulkForm, { grade_ids: [] });
    toast.add({ title: "Classes opened (bulk)" });
  } catch (e: any) {
    toast.add({
      title: e?.data?.message || "Bulk open failed",
      color: "error",
    });
  }
}

async function handlePageChange() {
  await classStore.fetchList();
}
</script>

<template>
  <UCard class="mt-4">
    <!-- Filters -->
    <div class="flex flex-wrap items-end gap-2">
      <!-- ✅ Grade filter as select (list) -->
      <USelect
        v-model="classStore.grade_id"
        :options="gradeOptions"
        placeholder="Filter by grade"
        class="w-64"
        searchable
        clearable
      />
      <UButton
        color="primary"
        @click="applyFilters"
        :loading="classStore.loading"
      >
        Apply
      </UButton>
      <UButton variant="subtle" @click="resetFilters">Reset</UButton>

      <div class="ms-auto flex gap-2">
        <!-- 🔹 Bulk Open -->
        <UModal title="Bulk Open Classes">
          <UButton icon="i-lucide-folder-plus" variant="soft">
            Bulk Open
          </UButton>

          <template #body>
            <div class="space-y-3 pt-2">
              <USelect
                v-model="bulkForm.grade_ids"
                :options="gradeOptions.slice(1)"
                multiple
                searchable
                placeholder="Pick grades…"
                class="w-full"
              />
            </div>
          </template>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton variant="subtle">Close</UButton>
              <UButton
                color="primary"
                :loading="classStore.saving"
                @click="handleBulk"
              >
                Open
              </UButton>
            </div>
          </template>
        </UModal>
      </div>
    </div>

    <!-- Table -->
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
  </UCard>
</template>
