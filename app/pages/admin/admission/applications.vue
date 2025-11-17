<script setup lang="ts">
import { storeToRefs } from "pinia";
import { h } from "vue";
import type { TableColumn, SelectItem } from "@nuxt/ui";

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
  academic_session_id: undefined as number | undefined,
  session_grade_id: undefined as number | undefined,
  status: undefined as
    | undefined
    | "pending"
    | "accepted"
    | "rejected"
    | "admitted",
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
    filters.session_grade_id = undefined;
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
    apps.setStatus(v ?? "");
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

const sessionOptions = computed<SelectItem[]>(() =>
  (sessionItems.value || []).map((s) => ({ label: s.name, value: s.id }))
);

const statusItems: SelectItem[] = [
  { label: "All", value: null },
  { label: "Pending", value: "pending" },
  { label: "Accepted", value: "accepted" },
  { label: "Admitted", value: "admitted" },
  { label: "Rejected", value: "rejected" },
];

const classOptions = computed<SelectItem[]>(() => {
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
  router.push(`/admin/admission/${row.id}/application-details`);
}

function onPageChange(p: number) {
  apps.setPage(p || 1);
  loadList();
}

/* ---------------- UTable (Nuxt UI v4.1.0) columns ---------------- */
const UButton = resolveComponent("UButton");
const UBadge = resolveComponent("UBadge");

type Row = any;

const columns: TableColumn<Row>[] = [
  {
    id: "application_no",
    accessorKey: "application_no",
    header: "Application No",
  },
  {
    id: "applicant_name",
    accessorKey: "applicant_name",
    header: "Applicant Name",
  },
  {
    id: "session",
    header: "Session",
    cell: ({ row }) => row.original?.session?.name || "—",
  },
  {
    id: "grade",
    header: "Class",
    cell: ({ row }) =>
      row.original?.session_grade?.grade?.name ||
      `#${row.original?.session_grade_id}`,
  },
  {
    id: "guardian_phone",
    accessorKey: "guardian_phone",
    header: "Guardian Phone",
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) =>
      h(
        UBadge as any,
        { color: statusColor(row.original?.status), variant: "soft" },
        () => String(row.original?.status || "").toUpperCase()
      ),
  },
  {
    id: "created_at",
    header: "Created",
    cell: ({ row }) => formatDate(row.original?.created_at),
  },
  {
    id: "actions",
    header: "",
    enableSorting: false,
    cell: ({ row }) =>
      h("div", { class: "flex gap-2" }, [
        h(
          UButton as any,
          {
            size: "xs",
            color: "primary",
            icon: "i-lucide-eye",
            onClick: () => goView(row.original),
          },
          { default: () => "View" }
        ),
        h(
          UButton as any,
          {
            size: "xs",
            color: "secondary",
            variant: "outline",
            icon: "i-lucide-check",
            onClick: () => goView(row.original),
          },
          { default: () => "Admit" }
        ),
      ]),
  },
];
</script>

<template>
  <UContainer>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold">Admission Applications</h1>
      <div class="flex gap-2">
        <UButton color="primary" icon="i-lucide-plus" to="/admin/admission/form"
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

    <!-- Filters Bar -->
    <div class="flex items-center gap-3 mb-4">
      <UInput
        v-model="filters.search"
        placeholder="Search by name, phone, or application no..."
        icon="i-lucide-search"
        :disabled="loading"
        class="flex-1"
      />

      <UPopover>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-filter"
          trailing-icon="i-lucide-chevron-down"
        >
          Filters
          <UBadge
            v-if="
              filters.academic_session_id ||
              filters.session_grade_id ||
              filters.status
            "
            color="primary"
            variant="solid"
            size="xs"
            class="ml-2"
          >
            {{
              [
                filters.academic_session_id,
                filters.session_grade_id,
                filters.status,
              ].filter(Boolean).length
            }}
          </UBadge>
        </UButton>

        <template #content>
          <div class="p-4 w-80 space-y-4">
            <div class="space-y-3">
              <UFormField label="Session">
                <USelect
                  v-model="filters.academic_session_id"
                  :items="sessionOptions"
                  placeholder="All Sessions"
                  :disabled="loading || sessionLoading"
                  clearable
                />
              </UFormField>

              <UFormField label="Class / Grade">
                <USelect
                  v-model="filters.session_grade_id"
                  :items="classOptions"
                  placeholder="All Classes"
                  :disabled="loading || !meta?.session_grades?.length"
                  clearable
                />
              </UFormField>

              <UFormField label="Status">
                <USelect
                  v-model="filters.status"
                  :items="statusItems"
                  placeholder="All Statuses"
                  :disabled="loading"
                />
              </UFormField>
            </div>

            <USeparator />

            <div class="flex justify-between">
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                :disabled="loading"
                @click="
                  filters.academic_session_id = undefined;
                  filters.session_grade_id = undefined;
                  filters.status = undefined;
                  apps.resetFilters();
                  loadList();
                "
              >
                Clear Filters
              </UButton>
            </div>
          </div>
        </template>
      </UPopover>

      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-refresh-cw"
        :loading="loading"
        @click="loadList"
      >
        Refresh
      </UButton>
    </div>

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
        :data="items"
        :columns="columns"
        :loading="loading"
        :ui="{ td: 'align-top' }"
      >
        <template #empty>
          <div class="py-12 text-center text-sm text-gray-500">
            No applications found.
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
