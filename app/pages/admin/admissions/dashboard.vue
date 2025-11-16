<script setup lang="ts">
import { storeToRefs } from "pinia";

definePageMeta({
  layout: "admin",
  middleware: "auth",
  roles: ["Owner", "Admin", "Developer"],
});

useHead({ title: "Admissions Dashboard" });

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
  academic_session_id: null as number | null,
});

onMounted(async () => {
  try {
    if (!sessionItems.value?.length) await sessions.fetchList();
    await apps.fetchStats(
      filter.academic_session_id
        ? { academic_session_id: filter.academic_session_id }
        : {}
    );
  } catch (e: any) {
    toast.add({
      title: "Load failed",
      description: e?.data?.message || e?.message || "Could not load dashboard",
      color: "error",
    });
  }
});

watch(
  () => filter.academic_session_id,
  async (id) => {
    try {
      await apps.fetchStats(id ? { academic_session_id: id } : {});
    } catch (e: any) {
      toast.add({
        title: "Failed",
        description: e?.data?.message || e?.message || "Could not load stats",
        color: "error",
      });
    }
  }
);

const statusCount = computed(() => {
  const by = apps.stats?.by_status || [];
  const map = new Map<string, number>();
  for (const s of by) map.set(s.status, s.count);
  return {
    total: apps.stats?.total || 0,
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
  return (apps.stats?.by_session || []).map((row) => ({
    session:
      sessionMap.value.get(row.academic_session_id) ||
      `#${row.academic_session_id}`,
    count: row.count,
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
  <UContainer>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold">Admissions Dashboard</h1>
    </div>

    <UAlert
      v-if="sessionError || appError"
      title="Error"
      :description="sessionError || appError"
      color="error"
      icon="i-lucide-alert-circle"
      variant="soft"
      class="mb-4"
    />

    <!-- Filters -->
    <UCard class="mb-6">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <UFormGroup label="Academic Session">
          <USelect
            v-model="filter.academic_session_id"
            :options="sessionOptions"
            placeholder="All sessions"
            :disabled="sessionLoading || statsLoading"
            clearable
          />
        </UFormGroup>
      </div>
    </UCard>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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

    <!-- By Session Summary -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Applications by Session</h2>
          <div
            v-if="statsLoading"
            class="text-sm text-gray-500 flex items-center gap-1"
          >
            <UIcon name="i-lucide-loader-2" class="h-4 w-4 animate-spin" />
            Loading
          </div>
        </div>
      </template>
      <UTable
        :rows="bySessionRows"
        :columns="[{ key: 'session', label: 'Session' }, { key: 'count', label: 'Count' }] as any[]"
      >
        <template #empty>
          <div class="text-center py-8 text-gray-500 text-sm">No data</div>
        </template>
      </UTable>
    </UCard>
  </UContainer>
</template>
