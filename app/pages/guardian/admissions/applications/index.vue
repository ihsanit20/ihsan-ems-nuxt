<script setup lang="ts">
import { storeToRefs } from "pinia";

definePageMeta({
  layout: "guardian",
  middleware: "auth",
  requiresAuth: true,
  roles: ["Guardian", "Owner", "Admin", "Developer"],
});

useHead({ title: "My Applications" });

const store = useAdmissionApplicationStore();
const { myItems, myLoading, error: storeError } = storeToRefs(store);
const toast = useToast();
const router = useRouter();

const filters = reactive({
  sessionId: null as number | null,
  status: "" as "" | "pending" | "accepted" | "rejected" | "admitted",
});

onMounted(async () => {
  try {
    await store.fetchMyApplications();
  } catch (e: any) {
    toast.add({
      title: "Failed to load",
      description:
        e?.data?.message || e?.message || "Could not load applications",
      color: "error",
    });
  }
});

const sessionOptions = computed(() => {
  const pairs = (myItems.value || [])
    .map((it) => it.session)
    .filter((s): s is NonNullable<typeof s> => !!s);
  const map = new Map<number, string>();
  for (const s of pairs) map.set(s.id, s.name);
  return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
});

const statusOptions = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Accepted", value: "accepted" },
  { label: "Admitted", value: "admitted" },
  { label: "Rejected", value: "rejected" },
];

function statusColor(status?: string) {
  switch (status) {
    case "pending":
      return "warning";
    case "accepted":
      return "success";
    case "admitted":
      return "primary";
    case "rejected":
      return "error";
    default:
      return "neutral";
  }
}

function formatDate(d?: string | null) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d;
  }
}

const columns = [
  { key: "application_no", label: "Application No" },
  { key: "applicant_name", label: "Applicant Name" },
  { key: "sessionLabel", label: "Session" },
  { key: "gradeLabel", label: "Class" },
  { key: "status", label: "Status" },
  { key: "created_at", label: "Created" },
  { key: "actions", label: "Actions" },
] as any[];

type ApplicationRow = {
  id: number;
  application_no?: string;
  applicant_name?: string;
  status?: string;
  created_at?: string;
  session_grade?: {
    academic_session_id?: number;
    grade?: { name?: string };
  } | null;
  session_grade_id?: number;
  sessionLabel: string;
  gradeLabel: string;
};

const rows = computed<ApplicationRow[]>(() =>
  (myItems.value || []).map((it: any) => ({
    ...it,
    sessionLabel: it.session?.name || "-",
    gradeLabel: it.session_grade?.grade?.name || `#${it.session_grade_id}`,
  }))
);

const filteredRows = computed(() => {
  return rows.value.filter((r) => {
    const okSession =
      !filters.sessionId ||
      r.session_grade?.academic_session_id === filters.sessionId;
    const okStatus = !filters.status || r.status === filters.status;
    return okSession && okStatus;
  });
});

// Provide rows as any[] to make UTable slot typings lenient in template
const tableRows = computed<any[]>(() => filteredRows.value as any[]);

function goView(row: any) {
  router.push(`/guardian/admissions/applications/${row.id}`);
}
</script>

<template>
  <UContainer>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-semibold">My Applications</h1>
        <p class="text-sm text-gray-500">
          View and track your admission applications.
        </p>
      </div>
    </div>

    <UAlert
      v-if="storeError"
      title="Error"
      :description="storeError"
      color="error"
      icon="i-lucide-alert-circle"
      variant="soft"
      class="mb-4"
    />

    <!-- Filters -->
    <UCard class="mb-4">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <UFormGroup label="Session">
          <USelect
            v-model="filters.sessionId"
            :options="sessionOptions"
            placeholder="All sessions"
            :disabled="myLoading"
            clearable
          />
        </UFormGroup>
        <UFormGroup label="Status">
          <USelect
            v-model="filters.status"
            :options="statusOptions"
            :disabled="myLoading"
          />
        </UFormGroup>
        <div class="flex items-end">
          <UButton
            color="secondary"
            variant="outline"
            :disabled="myLoading"
            @click="
              filters.sessionId = null;
              filters.status = '';
            "
          >
            Reset
          </UButton>
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Applications</h2>
          <div
            v-if="myLoading"
            class="flex items-center gap-2 text-sm text-gray-500"
          >
            <UIcon name="i-lucide-loader-2" class="h-4 w-4 animate-spin" />
            Loading
          </div>
        </div>
      </template>

      <UTable :rows="tableRows" :columns="columns">
        <template #empty>
          <div class="text-center py-10 text-sm text-gray-500">
            No applications found.
          </div>
        </template>

        <template #cell-status="{ row }">
          <UBadge
            :color="statusColor((row as any).status)"
            variant="soft"
            size="sm"
          >
            {{ (row as any).status?.toUpperCase() }}
          </UBadge>
        </template>

        <template #cell-created_at="{ row }">
          {{ formatDate((row as any).created_at) }}
        </template>

        <template #cell-sessionLabel="{ row }">
          {{ (row as any).sessionLabel }}
        </template>

        <template #cell-gradeLabel="{ row }">
          {{ (row as any).gradeLabel }}
        </template>

        <template #cell-actions="{ row }">
          <UButton
            size="xs"
            color="primary"
            icon="i-lucide-eye"
            @click="goView(row as any)"
          >
            View
          </UButton>
        </template>
      </UTable>
    </UCard>
  </UContainer>
</template>
