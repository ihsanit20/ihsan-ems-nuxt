<script setup lang="ts">
definePageMeta({
  layout: "admin",
  middleware: "auth",
  requiresAuth: true,
  roles: ["Owner", "Admin", "Developer"],
});

import { useHead, useToast } from "#imports";
import { computed, ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";

/* যদি টাইপ দরকার হয় (আপনার প্রজেক্টে গ্লোবালি ডিফাইন্ড থাকলে বাদ দিতে পারেন) */
// import { type SessionGrade } from "~/stores/session-grade";
// import { type Grade } from "~/stores/grade";

useHead({ title: "Session Details" });

const toast = useToast();
const router = useRouter();
const route = useRoute();

const sessionStore = useSessionStore();
const classStore = useSessionGradeStore();
const gradeStore = useGradeStore();

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

/* ---------- bulk open (kept) ---------- */
const gradeItems = computed(() =>
  (gradeStore.items || []).map((g: Grade) => ({
    label: g.level?.name ? `${g.name} · ${g.level.name}` : g.name,
    value: g.id,
  }))
);

const openBulk = ref(false);
const bulkForm = ref<{ grade_ids: any[] }>({ grade_ids: [] });

async function handleBulkOpen() {
  const ids = (bulkForm.value.grade_ids || [])
    .map((x: any) => (typeof x === "object" ? x.value : x))
    .map((x: any) => (x === "" || x == null ? NaN : Number(x)))
    .filter((n: number) => Number.isFinite(n));

  if (ids.length === 0) {
    toast.add({ title: "Pick at least one grade", color: "error" });
    return;
  }
  try {
    await classStore.bulkOpen(sessionId.value, { grade_ids: ids as number[] });
    toast.add({ title: "Classes opened successfully" });
    openBulk.value = false;
    bulkForm.value.grade_ids = [];
    await classStore.fetchList();
  } catch (e: any) {
    toast.add({
      title: e?.data?.message || "Bulk open failed",
      color: "error",
    });
  }
}

/* ---------- accordion: only one card open ---------- */
const openCardId = ref<number | null>(null);
function toggleOpen(id: number) {
  openCardId.value = openCardId.value === id ? null : id;
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
    toast.add({ title: "Failed to load session", color: "error" });
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
              {{ sessionStore.current.start_date }} →
              {{ sessionStore.current.end_date }} ·
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

        <!-- Bulk Open trigger -->
        <UModal v-model="openBulk" title="Bulk Open Classes">
          <UButton
            icon="i-lucide-folder-plus"
            variant="soft"
            @click="openBulk = true"
          >
            Bulk Open
          </UButton>

          <template #body>
            <USelectMenu
              v-model="bulkForm.grade_ids"
              :items="gradeItems"
              option-attribute="label"
              value-attribute="value"
              multiple
              searchable
              placeholder="Pick grades…"
              class="w-full"
            />
          </template>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton variant="subtle" @click="openBulk = false"
                >Close</UButton
              >
              <UButton
                color="primary"
                :loading="classStore.saving"
                @click="handleBulkOpen"
              >
                Open selected
              </UButton>
            </div>
          </template>
        </UModal>
      </div>
    </UCard>

    <!-- Skeletons while loading -->
    <template v-if="classStore.loading">
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

    <!-- Grid of SessionGrade Cards (no pagination) -->
    <template v-else>
      <div v-if="classRows.length" class="grid gap-4">
        <UCard v-for="c in classRows" :key="c.id" class="overflow-hidden">
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="text-sm text-neutral-500">Class</div>
              <div class="text-base font-semibold">
                {{ c.grade?.name || "Grade#" + c.grade_id }}
                <span v-if="c.shift" class="text-neutral-500">
                  · {{ c.shift }}</span
                >
                <span v-if="c.medium" class="text-neutral-500">
                  · {{ c.medium }}</span
                >
              </div>
            </div>
            <UButton
              :icon="
                openCardId === c.id
                  ? 'i-lucide-chevron-up'
                  : 'i-lucide-chevron-down'
              "
              variant="ghost"
              @click="toggleOpen(c.id)"
              :aria-label="openCardId === c.id ? 'Collapse' : 'Expand'"
            />
          </div>

          <!-- Sections panel inside the card -->
          <Transition name="fade">
            <div v-if="openCardId === c.id" class="mt-4 border-t pt-4">
              <SessionSectionsPanel :session-grade-id="c.id" />
            </div>
          </Transition>
        </UCard>
      </div>

      <UCard v-else class="text-center py-10">
        <p class="text-sm text-neutral-500">
          No classes opened for this session yet.
        </p>
      </UCard>
    </template>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
