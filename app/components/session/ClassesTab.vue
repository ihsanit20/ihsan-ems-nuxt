<script setup lang="ts">
import {
  h,
  reactive,
  ref,
  computed,
  onMounted,
  onServerPrefetch,
  watch,
} from "vue";
import { useToast } from "#imports";
import type { ColumnDef } from "@tanstack/vue-table";

const UButton = resolveComponent("UButton");

const props = defineProps<{ sessionId: number }>();
const emit = defineEmits<{ (e: "select-class", id: number): void }>();

const toast = useToast();
const classStore = useSessionGradeStore();
const gradeStore = useGradeStore();

/* ---------- helpers: ensure grades loaded ---------- */
async function ensureGradesLoaded() {
  if (!Array.isArray(gradeStore.items) || gradeStore.items.length === 0) {
    await gradeStore.fetchList({
      per_page: 200,
      is_active: true,
      with_level: 1,
    });
  }
}

/* ---------- table normalize ---------- */
const classRows = computed<SessionGrade[]>(() => {
  const val: any = classStore.items as any;
  if (Array.isArray(val)) return val;
  if (val?.data && Array.isArray(val.data)) return val.data;
  return [];
});

/* ---------- columns ---------- */
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

/* ---------- Select items [{label, value}] ---------- */
const gradeItems = computed(() =>
  (gradeStore.items || []).map((g: Grade) => ({
    label: g.level?.name ? `${g.name} · ${g.level.name}` : g.name,
    value: g.id,
  }))
);

/* ---------- filter model proxy (clear => undefined) ---------- */
const gradeFilterModel = computed<number | null>({
  get: () => classStore.grade_id ?? null,
  set: (v) => classStore.setGrade(v ?? undefined),
});

/* ---------- bulk form ---------- */
const bulkForm = reactive({
  grade_ids: [] as any[], // we coerce to number[] on submit
});

/* ---------- modal state ---------- */
const openBulk = ref(false);
watch(openBulk, async (v) => {
  if (v) await ensureGradesLoaded();
  if (!v) {
    // reset form when modal closes
    bulkForm.grade_ids = [];
  }
});

/* ---------- lifecycle ---------- */
onServerPrefetch(async () => {
  classStore.setSession(props.sessionId);
  await Promise.all([classStore.fetchList(), ensureGradesLoaded()]);
});

onMounted(async () => {
  classStore.setSession(props.sessionId);
  await Promise.all([classStore.fetchList(), ensureGradesLoaded()]);
});

/* ---------- actions ---------- */
async function applyFilters() {
  await classStore.fetchList();
}

function resetFilters() {
  classStore.resetFilters();
}

function firstErrorOf(e: any): string | undefined {
  const errors = e?.data?.errors;
  if (errors && typeof errors === "object") {
    const arr = Object.values(errors) as any[];
    if (arr?.length && Array.isArray(arr[0]) && arr[0][0]) return arr[0][0];
  }
  return e?.data?.message || e?.message;
}

async function handleBulk() {
  // normalize: object/string → number
  const grade_ids: number[] = (bulkForm.grade_ids || [])
    .map((x: any) => (typeof x === "object" && x !== null ? x.value : x))
    .map((x: any) =>
      x === "" || x === null || x === undefined ? NaN : Number(x)
    )
    .filter((n: number) => Number.isFinite(n));

  if (grade_ids.length === 0) {
    toast.add({ title: "Pick at least one grade", color: "error" });
    return;
  }

  try {
    await classStore.bulkOpen(props.sessionId, { grade_ids });
    toast.add({ title: "Classes opened successfully", color: "success" });
    openBulk.value = false; // ✅ close modal on success
  } catch (e: any) {
    toast.add({
      title: firstErrorOf(e) || "Bulk open failed",
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
      <USelectMenu
        v-model="gradeFilterModel"
        :items="gradeItems"
        option-attribute="label"
        value-attribute="value"
        :loading="gradeStore.loading"
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
        Apply Filters
      </UButton>

      <UButton variant="subtle" @click="resetFilters">Reset</UButton>

      <div class="ms-auto flex gap-2">
        <!-- 🔹 Bulk Open trigger -->
        <UModal v-model="openBulk" title="Bulk Open Classes">
          <UButton
            icon="i-lucide-folder-plus"
            variant="soft"
            @click="openBulk = true"
          >
            Bulk Open
          </UButton>

          <template #body>
            <div class="space-y-3 pt-2">
              <USelectMenu
                v-model="bulkForm.grade_ids"
                :items="gradeItems"
                option-attribute="label"
                value-attribute="value"
                :loading="gradeStore.loading"
                multiple
                searchable
                placeholder="Pick grades…"
                class="w-full"
              />
            </div>
          </template>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton variant="subtle" @click="openBulk = false">
                Close
              </UButton>
              <UButton
                color="primary"
                :loading="classStore.saving"
                :disabled="(bulkForm.grade_ids?.length || 0) === 0"
                @click="handleBulk"
              >
                Open selected
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
