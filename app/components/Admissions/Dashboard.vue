<script setup lang="ts">
import { storeToRefs } from "pinia";

// Internal fetch logic encapsulated; parent just renders component
const sessions = useSessionStore();
const {
  items: sessionItems,
  loading: sessionLoading,
  error: sessionError,
} = storeToRefs(sessions);

const apps = useAdmissionApplicationStore();
const { stats, statsLoading, error: appError } = storeToRefs(apps);

const toast = useToast();

const filter = reactive({
  academic_session_id: undefined as number | undefined,
});

onMounted(async () => {
  try {
    if (!sessionItems.value?.length) await sessions.fetchList();
    await loadStats();
  } catch (e: any) {
    toast.add({
      title: "Admissions load failed",
      description:
        e?.data?.message || e?.message || "Could not load admissions dashboard",
      color: "error",
    });
  }
});

watch(
  () => filter.academic_session_id,
  () => loadStats()
);

async function loadStats() {
  try {
    await apps.fetchStats(
      filter.academic_session_id
        ? { academic_session_id: filter.academic_session_id }
        : {}
    );
  } catch (e: any) {
    toast.add({
      title: "Stats failed",
      description: e?.data?.message || e?.message || "Could not load stats",
      color: "error",
    });
  }
}

const statusCount = computed(() => {
  const by = stats.value?.by_status || [];
  const map = new Map<string, number>();
  for (const s of by) map.set(s.status, s.count);
  return {
    total: stats.value?.total || 0,
    pending: map.get("pending") || 0,
    accepted: map.get("accepted") || 0,
    rejected: map.get("rejected") || 0,
    admitted: map.get("admitted") || 0,
  };
});

const sessionMap = computed(() => {
  const m = new Map<number, string>();
  for (const s of sessionItems.value || []) m.set(s.id, s.name);
  return m;
});

const bySessionRows = computed(() => {
  const data = stats.value?.by_session || [];
  if (!data.length) return [];
  return data.map((row) => ({
    session:
      sessionMap.value.get(row.academic_session_id) ||
      `#${row.academic_session_id}`,
    count: row.count || 0,
  }));
});

const sessionOptions = computed(() =>
  (sessionItems.value || []).map((s) => ({ label: s.name, value: s.id }))
);

function colorFor(key: string) {
  switch (key) {
    case "pending":
      return "warning";
    case "accepted":
      return "success";
    case "rejected":
      return "error";
    case "admitted":
      return "primary";
    default:
      return "neutral";
  }
}
</script>

<template>
  <div class="space-y-6">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Admissions Overview</h2>
        </div>
      </template>
      <!-- Filters -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <UFormField label="Academic Session">
          <USelect
            v-model="filter.academic_session_id"
            :items="sessionOptions"
            placeholder="All sessions"
            :disabled="sessionLoading || statsLoading"
            :popper="{ strategy: 'fixed' }"
            clearable
          />
        </UFormField>
      </div>
      <template #footer>
        <div class="text-xs text-gray-500 flex items-center gap-2">
          <UIcon
            v-if="statsLoading"
            name="i-lucide-loader-2"
            class="h-3 w-3 animate-spin"
          />
          <span>Updated admissions statistics</span>
        </div>
      </template>
    </UCard>

    <UAlert
      v-if="sessionError || appError"
      title="Error"
      :description="sessionError || appError"
      color="error"
      icon="i-lucide-alert-circle"
      variant="soft"
    />

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
      <UCard>
        <div class="text-sm text-gray-500">Total</div>
        <div class="text-2xl font-bold">{{ statusCount.total }}</div>
      </UCard>
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500">Pending</div>
            <div class="text-2xl font-bold">{{ statusCount.pending }}</div>
          </div>
          <UBadge :color="colorFor('pending')" variant="soft">Pending</UBadge>
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500">Accepted</div>
            <div class="text-2xl font-bold">{{ statusCount.accepted }}</div>
          </div>
          <UBadge :color="colorFor('accepted')" variant="soft">Accepted</UBadge>
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500">Rejected</div>
            <div class="text-2xl font-bold">{{ statusCount.rejected }}</div>
          </div>
          <UBadge :color="colorFor('rejected')" variant="soft">Rejected</UBadge>
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500">Admitted</div>
            <div class="text-2xl font-bold">{{ statusCount.admitted }}</div>
          </div>
          <UBadge :color="colorFor('admitted')" variant="soft">Admitted</UBadge>
        </div>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold">Applications by Session</h3>
          <div
            v-if="statsLoading"
            class="text-xs text-gray-500 flex items-center gap-1"
          >
            <UIcon name="i-lucide-loader-2" class="h-3 w-3 animate-spin" />
            Loading
          </div>
        </div>
      </template>
      <UTable
        :rows="bySessionRows || []"
        :columns="[
          { key: 'session', label: 'Session', id: 'session' },
          { key: 'count', label: 'Count', id: 'count' }
        ] as any[]"
      >
        <template #empty>
          <div class="text-center py-8 text-gray-500 text-sm">No data</div>
        </template>
      </UTable>
    </UCard>
  </div>
</template>
