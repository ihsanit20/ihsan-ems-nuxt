<script setup lang="ts">
definePageMeta({
  layout: "admin",
  middleware: "auth",
  requiresAuth: true,
  roles: ["Owner", "Admin", "Developer"],
});

import { useHead, useToast } from "#imports";
import type { SessionGrade, Grade } from "~/types";

useHead({ title: "Session Details" });

const toast = useToast();
const router = useRouter();
const route = useRoute();

const sessionStore = useSessionStore();
const classStore = useSessionGradeStore();
const gradeStore = useGradeStore();

const { loading, saving, removing } = storeToRefs(classStore);

const sessionId = computed<number>(() => Number(route.params.id));
const sessionTitle = computed(
  () => sessionStore.current?.name ?? `Session #${sessionId.value}`
);

/* ---------- list normalize ---------- */
const classRows = computed<SessionGrade[]>(() => {
  const val: any = classStore.items as any;
  if (Array.isArray(val)) return val;
  if (val?.data && Array.isArray(val.data)) return val.data;
  return [];
});

/* ---------- bulk open ---------- */
type GradeOption = { label: string; value: number };

const gradeItems = computed<GradeOption[]>(() =>
  (gradeStore.items || []).map((g: Grade) => ({
    label: g.level?.name ? `${g.name} · ${g.level.name}` : g.name,
    value: g.id,
  }))
);

const openBulk = ref(false);
const bulkForm = reactive<{ grade_ids: number[] }>({
  grade_ids: [],
});

function onToggleGrade(id: number, checked: any) {
  const isChecked = !!checked;
  const idx = bulkForm.grade_ids.indexOf(id);

  if (isChecked && idx === -1) {
    bulkForm.grade_ids.push(id);
  } else if (!isChecked && idx !== -1) {
    bulkForm.grade_ids.splice(idx, 1);
  }
}

async function handleBulkOpen() {
  const ids = (bulkForm.grade_ids || [])
    .map((x: any) => (x === "" || x == null ? NaN : Number(x)))
    .filter((n: number) => Number.isFinite(n));

  if (ids.length === 0) {
    toast.add({
      color: "error",
      title: "No grades selected",
      description: "Please select at least one grade to open.",
    });
    return;
  }

  try {
    await classStore.bulkOpen(sessionId.value, { grade_ids: ids as number[] });

    toast.add({
      title: "Classes opened",
      description: `${ids.length} grade(s) have been opened for this session.`,
    });
  } catch (e: any) {
    toast.add({
      color: "error",
      title: "Bulk open failed",
      description: e?.data?.message || e?.message || "Please try again.",
    });
  } finally {
    // ✅ success বা error – দুই অবস্থাতেই মোডাল ক্লোজ + ফর্ম রিসেট + লিস্ট রিফ্রেশ
    openBulk.value = false;
    bulkForm.grade_ids = [];

    try {
      await classStore.fetchList();
    } catch {
      // silently ignore fetch errors
    }
  }
}

/* ---------- lifecycle ---------- */
onMounted(async () => {
  try {
    await sessionStore.fetchOne(sessionId.value);
    classStore.setSession(sessionId.value);
    await Promise.all([
      classStore.fetchList(),
      gradeStore.items?.length
        ? Promise.resolve()
        : gradeStore.fetchList({
            per_page: 200,
            is_active: true,
            with_level: 1,
          }),
    ]);
  } catch {
    toast.add({
      color: "error",
      title: "Failed to load session",
      description: "Please reload the page and try again.",
    });
  }
});

function goBack() {
  router.back();
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <UCard>
      <div
        class="flex flex-col md:flex-row md:items-center md:justify-between gap-3"
      >
        <div class="flex items-start gap-3">
          <UButton
            icon="i-lucide-arrow-left"
            variant="ghost"
            color="neutral"
            aria-label="Go back"
            @click="goBack"
          />
          <div>
            <p class="text-sm text-neutral-500">Session</p>
            <h1 class="text-xl font-semibold">{{ sessionTitle }}</h1>
            <p class="text-xs text-neutral-500" v-if="sessionStore.current">
              {{
                new Date(sessionStore.current.start_date).toLocaleDateString(
                  "en-GB"
                )
              }}
              →
              {{
                new Date(sessionStore.current.end_date).toLocaleDateString(
                  "en-GB"
                )
              }}
              ·
              <span
                :class="
                  sessionStore.current.is_active
                    ? 'text-green-600'
                    : 'text-neutral-500'
                "
              >
                {{ sessionStore.current.is_active ? "Active" : "Inactive" }}
              </span>
            </p>
          </div>
        </div>

        <!-- Bulk Open trigger button -->
        <div class="flex items-center gap-2">
          <UButton
            icon="i-lucide-folder-plus"
            variant="soft"
            @click="openBulk = true"
          >
            Bulk Open
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Skeletons while loading -->
    <template v-if="loading">
      <div class="grid gap-4">
        <UCard v-for="i in 6" :key="i">
          <div class="space-y-3">
            <USkeleton class="h-4 w-24" />
            <USkeleton class="h-5 w-40" />
            <USkeleton class="h-4 w-full" />
            <div class="mt-4 border-t pt-4 space-y-2">
              <USkeleton class="h-4 w-3/4" />
              <USkeleton class="h-4 w-2/3" />
            </div>
          </div>
        </UCard>
      </div>
    </template>

    <!-- Grid of SessionGrade Cards (all expanded, no accordion) -->
    <template v-else>
      <div v-if="classRows.length" class="grid gap-4">
        <UCard v-for="c in classRows" :key="c.id" class="overflow-hidden">
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="text-sm text-neutral-500">Class</div>
              <div class="text-base font-semibold">
                {{ c.grade?.name || "Grade#" + c.grade_id }}
              </div>
            </div>
          </div>

          <!-- Sections panel always visible -->
          <div class="mt-4 border-t pt-4">
            <SessionSectionsPanel :session-grade-id="c.id" />
          </div>
        </UCard>
      </div>

      <UCard v-else class="text-center py-10">
        <p class="text-sm text-neutral-500">
          No classes opened for this session yet.
        </p>
      </UCard>
    </template>

    <!-- Bulk Open Modal -->
    <UModal
      :open="openBulk"
      @update:open="openBulk = $event"
      title="Bulk Open Classes"
      description="Select the grades to add in this session."
      :prevent-close="saving"
      :closeable="!saving"
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <div
          v-if="gradeItems.length"
          class="space-y-2 max-h-80 overflow-y-auto"
        >
          <div
            v-for="g in gradeItems"
            :key="g.value"
            class="flex items-center gap-2"
          >
            <UCheckbox
              :model-value="bulkForm.grade_ids.includes(g.value)"
              @update:model-value="(val) => onToggleGrade(g.value, val)"
            />
            <span class="text-sm">{{ g.label }}</span>
          </div>
        </div>
        <p v-else class="text-sm text-neutral-500">
          No grades found. Please create grades first.
        </p>
      </template>

      <template #footer>
        <UButton
          label="Cancel"
          color="neutral"
          variant="outline"
          :disabled="saving"
          @click="openBulk = false"
        />
        <UButton
          label="Open selected"
          color="primary"
          :loading="saving"
          @click="handleBulkOpen"
        />
      </template>
    </UModal>
  </div>
</template>
