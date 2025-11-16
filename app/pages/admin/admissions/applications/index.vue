<script setup lang="ts">
import { storeToRefs } from "pinia";

definePageMeta({
  layout: "admin",
  middleware: "auth",
  roles: ["Owner", "Admin", "Developer"],
});

useHead({ title: "Admission Applications" });

const sessions = useSessionStore();
const { items: sessionItems, loading: sessionLoading } = storeToRefs(sessions);

const apps = useAdmissionApplicationStore();
const { meta, items, loading, error, page, per_page, total, last_page } =
  storeToRefs(apps);

const toast = useToast();
const router = useRouter();

// Local filters bound to store
const filters = reactive({
  academic_session_id: null as number | null,
  session_grade_id: null as number | null,
  status: "" as "" | "pending" | "accepted" | "rejected" | "admitted",
  search: "",
});

async function loadList() {
  try {
    await apps.fetchList();
  } catch (e: any) {
    toast.add({
      title: "Failed",
      description:
        e?.data?.message || e?.message || "Could not load applications",
      color: "error",
    });
  }
}

onMounted(async () => {
  try {
    if (!sessionItems.value?.length) await sessions.fetchList();
    await apps.fetchMeta();
    await loadList();
  } catch (e: any) {
    toast.add({
      title: "Load failed",
      description: e?.data?.message || e?.message || "Could not load data",
      color: "error",
    });
  }
});

watch(
  () => filters.academic_session_id,
  (v) => {
    apps.setSessionId(v || null);
    if (!v) apps.setSessionGradeId(null);
    // Clear class if session changed
    filters.session_grade_id = null;
    apps.setPage(1);
    loadList();
  }
);

watch(
  () => filters.session_grade_id,
  (v) => {
    apps.setSessionGradeId(v || null);
    apps.setPage(1);
    loadList();
  }
);

watch(
  () => filters.status,
  (v) => {
    apps.setStatus(v || "");
    apps.setPage(1);
    loadList();
  }
);

let searchTimer: any = null;
watch(
  () => filters.search,
  (q) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      apps.setSearch(q || "");
      apps.setPage(1);
      loadList();
    }, 400);
  }
);

const sessionOptions = computed(() =>
  (sessionItems.value || []).map((s) => ({ label: s.name, value: s.id }))
);

const statusOptions = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Accepted", value: "accepted" },
  { label: "Admitted", value: "admitted" },
  { label: "Rejected", value: "rejected" },
];

const classOptions = computed(() => {
  const list = meta.value?.session_grades || [];
  return list
    .filter(
      (sg) =>
        !filters.academic_session_id ||
        sg.academic_session_id === filters.academic_session_id
    )
    .map((sg) => ({
      label: sg.grade?.name || `#${sg.grade_id}`,
      value: sg.id,
    }));
});

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
    return d as string;
  }
}

function goView(row: any) {
  router.push(`/admin/admissions/applications/${row.id}`);
}

function onPageChange(p: number) {
  apps.setPage(p || 1);
  loadList();
}
</script>

<template>
  <UContainer>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold">Admission Applications</h1>
      <div class="flex gap-2">
        <UButton
          color="primary"
          icon="i-lucide-plus"
          to="/admin/admissions/applications/new"
          >Offline Entry</UButton
        >
      </div>
    </div>

    <UAlert
      v-if="error"
      title="Error"
      :description="error"
      color="error"
      icon="i-lucide-alert-circle"
      variant="soft"
      class="mb-4"
    />

    <!-- Filters -->
    <UCard class="mb-4">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <UFormGroup label="Session">
          <USelect
            v-model="filters.academic_session_id"
            :options="sessionOptions"
            placeholder="All"
            :disabled="loading || sessionLoading"
            clearable
          />
        </UFormGroup>
        <UFormGroup label="Class">
          <USelect
            v-model="filters.session_grade_id"
            :options="classOptions"
            placeholder="All"
            :disabled="loading || !meta?.session_grades?.length"
            clearable
          />
        </UFormGroup>
        <UFormGroup label="Status">
          <USelect
            v-model="filters.status"
            :options="statusOptions"
            :disabled="loading"
          />
        </UFormGroup>
        <UFormGroup label="Search">
          <UInput
            v-model="filters.search"
            placeholder="Name / Phone / Application No"
            :disabled="loading"
          />
        </UFormGroup>
        <div class="flex items-end">
          <UButton
            color="secondary"
            variant="outline"
            :disabled="loading"
            @click="
              filters.academic_session_id = null;
              filters.session_grade_id = null;
              filters.status = '';
              filters.search = '';
              apps.resetFilters();
              loadList();
            "
            >Reset</UButton
          >
        </div>
      </div>
    </UCard>

    <!-- Table -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Applications</h2>
          <div
            v-if="loading"
            class="text-sm text-gray-500 flex items-center gap-1"
          >
            <UIcon name="i-lucide-loader-2" class="h-4 w-4 animate-spin" />
            Loading
          </div>
        </div>
      </template>

      <UTable
        :rows="(items as any)"
        :columns="[
          { key: 'application_no', label: 'Application No' },
          { key: 'applicant_name', label: 'Applicant Name' },
          { key: 'session', label: 'Session' },
          { key: 'grade', label: 'Class' },
          { key: 'guardian_phone', label: 'Guardian Phone' },
          { key: 'status', label: 'Status' },
          { key: 'created_at', label: 'Created' },
          { key: 'actions', label: 'Actions' },
        ] as any[]"
        :ui="{ td: 'align-top' }"
      >
        <template #empty>
          <div class="py-12 text-center text-sm text-gray-500">
            No applications found.
          </div>
        </template>

        <template #cell-session="{ row }">
          {{ (row as any).session?.name || "-" }}
        </template>
        <template #cell-grade="{ row }">
          {{
            (row as any).session_grade?.grade?.name ||
            `#${(row as any).session_grade_id}`
          }}
        </template>
        <template #cell-status="{ row }">
          <UBadge :color="statusColor((row as any).status)" variant="soft">{{
            (row as any).status?.toUpperCase()
          }}</UBadge>
        </template>
        <template #cell-created_at="{ row }">
          {{ formatDate((row as any).created_at) }}
        </template>
        <template #cell-actions="{ row }">
          <div class="flex gap-2">
            <UButton
              size="xs"
              color="primary"
              icon="i-lucide-eye"
              @click="goView(row)"
              >View</UButton
            >
            <UButton
              size="xs"
              color="secondary"
              variant="outline"
              icon="i-lucide-check"
              @click="goView(row)"
              >Admit</UButton
            >
          </div>
        </template>
      </UTable>

      <template #footer>
        <div class="flex items-center justify-between">
          <div class="text-sm text-gray-500">Total: {{ total }}</div>
          <UPagination
            :page="page"
            :page-count="last_page"
            @update:page="onPageChange"
          />
        </div>
      </template>
    </UCard>
  </UContainer>
</template>
