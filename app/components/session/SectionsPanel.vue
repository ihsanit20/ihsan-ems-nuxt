<!-- components/session/SectionsPanel.vue -->
<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted } from "vue";
import { useToast } from "#imports";
import { useSectionStore } from "~/stores/section";
import type { Section } from "~/types";

const props = defineProps<{ sessionGradeId: number }>();

const toast = useToast();
const sectionStore = useSectionStore();

/* ---------- list ---------- */
const rows = computed<Section[]>(() =>
  sectionStore.itemsForSession(props.sessionGradeId)
);

/* ---------- ADD form (uncontrolled modal) ---------- */
type AddForm = {
  name: string;
  code: string | null;
  capacity: number | null;
  class_teacher_id: number | null;
  sort_order: number | null;
};

const addForm = reactive<AddForm>({
  name: "",
  code: null,
  capacity: null,
  class_teacher_id: null,
  sort_order: null,
});

function resetAdd() {
  addForm.name = "";
  addForm.code = null;
  addForm.capacity = null;
  addForm.class_teacher_id = null;
  addForm.sort_order = null;
}

/* ---------- EDIT forms (uncontrolled modal per row) ---------- */
type EditForm = {
  name: string;
  code: string | null;
  capacity: number | null;
  class_teacher_id: number | null;
  sort_order: number | null;
};

const editForms = ref<Record<number, EditForm | undefined>>({});
const hasForm = (id: number) => !!editForms.value[id];

function ensureEditForm(row: Section) {
  editForms.value[row.id] = {
    name: row.name || "",
    code: row.code ?? null,
    capacity: row.capacity ?? null,
    class_teacher_id: row.class_teacher_id ?? null,
    sort_order: row.sort_order ?? null,
  };
}

/* ---------- Modal states ---------- */
const isAddModalOpen = ref(false);
const openEditModals = ref<Record<number, boolean>>({});

/* ---------- helpers ---------- */
async function load() {
  try {
    await sectionStore.fetchListBySession(props.sessionGradeId);
  } catch (e: any) {
    console.error("Failed to load sections:", e);
    toast.add({ title: "Failed to load sections", color: "error" });
  }
}

/* open/close helpers */
function openAdd() {
  isAddModalOpen.value = true;
}
function closeAdd() {
  isAddModalOpen.value = false;
}
function openEdit(row: Section) {
  ensureEditForm(row);
  openEditModals.value[row.id] = true;
}
function closeEdit(id: number) {
  openEditModals.value[id] = false;
}

/* ---------- ADD handler ---------- */
async function handleCreate() {
  if (!addForm.name.trim()) {
    toast.add({ title: "Section name is required", color: "error" });
    return;
  }
  try {
    await sectionStore.create({
      session_grade_id: props.sessionGradeId,
      name: addForm.name.trim(),
      code: addForm.code,
      capacity: addForm.capacity,
      class_teacher_id: addForm.class_teacher_id,
      sort_order: addForm.sort_order,
    });
    resetAdd();
    closeAdd();
    toast.add({ title: "Section created" });
    // store ইতিমধ্যে সঠিক session list এ prepend করে, reload এর দরকার নাই
  } catch (e: any) {
    toast.add({ title: e?.data?.message || "Create failed", color: "error" });
  }
}

/* ---------- EDIT handler ---------- */
async function handleUpdateModal(id: number) {
  const f = editForms.value[id];
  if (!f) return;

  try {
    const updated = await sectionStore.update(id, {
      name: f.name,
      code: f.code,
      capacity: f.capacity,
      class_teacher_id: f.class_teacher_id,
      sort_order: f.sort_order,
    });

    // local form sync (store already updated)
    const r = rows.value.find((x) => x.id === id);
    if (r) {
      r.name = updated.name;
      r.code = updated.code;
      r.capacity = updated.capacity;
      r.class_teacher_id = updated.class_teacher_id;
      r.sort_order = updated.sort_order;
      r.class_teacher = updated.class_teacher;
    }

    closeEdit(id);
    toast.add({ title: "Updated" });
  } catch (e: any) {
    toast.add({ title: e?.data?.message || "Update failed", color: "error" });
  }
}

/* ---------- delete ---------- */
async function removeOne(id: number) {
  try {
    await sectionStore.remove(id);
    if (editForms.value[id]) delete editForms.value[id];
    if (openEditModals.value[id]) delete openEditModals.value[id];
    toast.add({ title: "Deleted" });
  } catch (e: any) {
    toast.add({ title: e?.data?.message || "Delete failed", color: "error" });
  }
}

/* ---------- lifecycle ---------- */
onMounted(load);

watch(
  () => props.sessionGradeId,
  (newId, oldId) => {
    if (newId !== oldId) {
      editForms.value = {};
      openEditModals.value = {};
      load();
    }
  },
  { immediate: false }
);
</script>

<template>
  <div class="space-y-3">
    <!-- Top actions -->
    <div class="flex flex-wrap items-center gap-2">
      <!-- ADD modal -->
      <UModal
        v-model:open="isAddModalOpen"
        title="Add Section"
        :ui="{ footer: 'justify-end' }"
      >
        <template #body>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
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
            <UInput
              v-model.number="addForm.sort_order"
              type="number"
              placeholder="Sort Order (optional)"
            />
          </div>
        </template>

        <template #footer>
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            @click="closeAdd"
          />
          <UButton
            label="Create"
            color="primary"
            :loading="sectionStore.saving"
            @click="handleCreate"
          />
        </template>
      </UModal>
    </div>

    <!-- Error display -->
    <div
      v-if="sectionStore.error"
      class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
    >
      {{ sectionStore.error }}
    </div>

    <!-- Loading skeleton -->
    <template v-if="sectionStore.loading">
      <div class="space-y-2">
        <div class="rounded-xl border p-3">
          <div class="flex items-center gap-3">
            <USkeleton class="h-5 w-12" />
            <USkeleton class="h-4 w-24" />
          </div>
          <div class="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
            <USkeleton class="h-9 w-full" />
            <USkeleton class="h-9 w-full" />
            <USkeleton class="h-9 w-full" />
            <USkeleton class="h-9 w-full" />
          </div>
          <div class="mt-3 flex gap-2">
            <USkeleton class="h-8 w-20" />
            <USkeleton class="h-8 w-20" />
          </div>
        </div>
      </div>
    </template>

    <!-- Rows -->
    <template v-else>
      <div v-if="rows.length" class="space-y-2">
        <div v-for="s in rows" :key="s.id" class="rounded-xl p-3 bg-gray-100">
          <div class="flex items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-sm text-neutral-500">Section</span>
              <span class="font-medium">{{ s.name }}</span>

              <span v-if="s.code" class="text-neutral-400">•</span>
              <span v-if="s.code" class="text-neutral-600">{{ s.code }}</span>

              <span v-if="s.capacity != null" class="text-neutral-400">•</span>
              <span v-if="s.capacity != null" class="text-neutral-600">
                Cap: {{ s.capacity }}
              </span>

              <span v-if="s.class_teacher?.name" class="text-neutral-400"
                >•</span
              >
              <span v-if="s.class_teacher?.name" class="text-neutral-600">
                Teacher: {{ s.class_teacher?.name }}
              </span>
            </div>

            <div class="flex items-center gap-2">
              <!-- Edit trigger -->
              <UButton
                size="xs"
                variant="subtle"
                icon="i-lucide-pencil"
                label="Edit"
                @click="openEdit(s)"
              />

              <!-- Edit modal per row -->
              <UModal
                v-model:open="openEditModals[s.id]"
                :title="`Edit Section #${s.id}`"
                :ui="{ footer: 'justify-end' }"
              >
                <template #body>
                  <div
                    v-if="hasForm(s.id)"
                    class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2"
                  >
                    <UInput
                      v-model="editForms[s.id]!.name"
                      placeholder="Name *"
                    />
                    <UInput
                      v-model="editForms[s.id]!.code"
                      placeholder="Code (optional)"
                    />
                    <UInput
                      v-model.number="editForms[s.id]!.capacity"
                      type="number"
                      placeholder="Capacity"
                    />
                    <UInput
                      v-model.number="editForms[s.id]!.class_teacher_id"
                      type="number"
                      placeholder="Class Teacher ID"
                    />
                    <UInput
                      v-model.number="editForms[s.id]!.sort_order"
                      type="number"
                      placeholder="Sort Order"
                    />
                  </div>
                  <div v-else class="text-sm text-neutral-500 py-2">
                    Loading form…
                  </div>
                </template>

                <template #footer>
                  <UButton
                    label="Cancel"
                    color="neutral"
                    variant="outline"
                    @click="closeEdit(s.id)"
                  />
                  <UButton
                    label="Save"
                    color="primary"
                    :loading="sectionStore.saving"
                    @click="handleUpdateModal(s.id)"
                  />
                </template>
              </UModal>

              <UButton
                size="xs"
                variant="ghost"
                color="warning"
                :loading="sectionStore.removing"
                icon="i-lucide-trash-2"
                @click="removeOne(s.id)"
              >
                Delete
              </UButton>
            </div>
          </div>

          <div class="mt-2 text-xs text-neutral-500">ID: {{ s.id }}</div>
        </div>
      </div>

      <UCard v-else class="text-center py-10">
        <p class="text-sm text-neutral-500">No sections yet.</p>
      </UCard>

      <div class="flex justify-center">
        <UButton
          icon="i-lucide-plus"
          color="primary"
          variant="outline"
          label="Add Section"
          @click="openAdd"
        />
      </div>
    </template>
  </div>
</template>
