<script setup lang="ts">
definePageMeta({
  layout: "admin",
  middleware: "auth",
  requiresAuth: true,
  roles: ["Owner", "Admin", "Developer"],
});

import { ref, reactive, computed, onMounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { useHead, useToast } from "#imports";
import type { SessionFee, Fee } from "~/types";

useHead({ title: "Session Fees" });

const toast = useToast();
const router = useRouter();
const route = useRoute();

const sessionStore = useSessionStore();
const feeStore = useFeeStore();
const sessionFeeStore = useSessionFeeStore();
const studentFeeStore = useStudentFeeStore();
const sessionGradeStore = useSessionGradeStore();

const { loading, saving } = storeToRefs(sessionFeeStore);

/* ---------- basic session meta ---------- */
const sessionId = computed<number>(() => Number(route.params.id));
const sessionTitle = computed(
  () => sessionStore.current?.name ?? `Session #${sessionId.value}`
);

/* ---------- Grades (for grouping) ---------- */
type GradeLite = { id: number; name: string };
const grades = ref<GradeLite[]>([]);

async function loadGrades() {
  try {
    const { $publicApi } = useNuxtApp();
    const res = await $publicApi<{ data: GradeLite[] }>("/v1/grades", {
      query: { paginate: false, is_active: true, per_page: 9999 },
    });
    const list = Array.isArray(res?.data) ? res.data : [];
    grades.value = list;
  } catch (e: any) {
    grades.value = [];
    toast.add({
      color: "error",
      title: "Failed to load grades",
      description: e?.data?.message || e?.message,
    });
  }
}

/* ---------- Local state for inline editor ---------- */
type LocalFeeRow = {
  feeId: number;
  fee: Fee;
  gradeId: number;
  gradeName: string;
  checked: boolean;
  amount: string;
  existingId: number | null; // session_fees.id যদি থাকে

  // original state (ডার্টি ডিটেকশন + অপ্টিমাইজেশন)
  originalChecked: boolean;
  originalAmount: string;
};

const localRows = ref<LocalFeeRow[]>([]);

// কোন গ্রেডে এখন save হচ্ছে → শুধু সেই গ্রেডের বাটন/ইনপুট disable
const gradeSavingKey = ref<string | null>(null);

// প্রতি গ্রেডের edit state
const gradeEditing = ref<Record<string, boolean>>({});

/* ---------- Session + Fees + SessionFees থেকে লোকাল রো বানানো ---------- */
function initLocalRows() {
  const sessionFees = sessionFeeStore.items as SessionFee[];

  // (grade_id, fee_id) → SessionFee ম্যাপ
  const existingMap = new Map<string, SessionFee>();
  sessionFees.forEach((sf) => {
    const key = `${sf.grade_id}|${sf.fee_id}`;
    existingMap.set(key, sf);
  });

  const rows: LocalFeeRow[] = [];
  const gradeList = grades.value || [];
  const fees = (feeStore.items || []) as Fee[];

  gradeList.forEach((g) => {
    fees.forEach((f: any) => {
      const mapKey = `${g.id}|${f.id}`;
      const existing = existingMap.get(mapKey) || null;

      const checked = !!existing;
      const amount =
        existing && typeof existing.amount !== "undefined"
          ? String(existing.amount)
          : "";

      rows.push({
        feeId: f.id,
        fee: f,
        gradeId: g.id,
        gradeName: g.name,
        checked,
        amount,
        existingId: existing?.id ?? null,
        originalChecked: checked,
        originalAmount: amount,
      });
    });
  });

  localRows.value = rows;
}

/* ---------- গ্রেড অনুযায়ী গ্রুপ ---------- */
const groupedByGrade = computed(() => {
  const groups: Record<
    string,
    {
      key: string;
      gradeId: number;
      gradeName: string;
      rows: LocalFeeRow[];
    }
  > = {};

  for (const row of localRows.value) {
    const key = String(row.gradeId);
    if (!groups[key]) {
      groups[key] = {
        key,
        gradeId: row.gradeId,
        gradeName: row.gradeName,
        rows: [],
      };
    }
    groups[key].rows.push(row);
  }

  // প্রতিটা গ্রেডের ভিতরে fee গুলো sort: fee.sort_order → fee.name
  Object.values(groups).forEach((g) => {
    g.rows.sort((a, b) => {
      const ao =
        typeof (a.fee as any).sort_order === "number"
          ? (a.fee as any).sort_order
          : 9999;
      const bo =
        typeof (b.fee as any).sort_order === "number"
          ? (b.fee as any).sort_order
          : 9999;

      if (ao !== bo) return ao - bo;
      return a.fee.name.localeCompare(b.fee.name, undefined, {
        numeric: true,
      });
    });
  });

  // গ্রেড group sort: gradeName অনুযায়ী (numeric-friendly)
  return Object.values(groups).sort((a, b) =>
    a.gradeName.localeCompare(b.gradeName, undefined, { numeric: true })
  );
});

function isGradeEditing(key: string) {
  return gradeEditing.value[key] === true;
}

function toggleGradeEdit(key: string) {
  gradeEditing.value = {
    ...gradeEditing.value,
    [key]: !gradeEditing.value[key],
  };
}

// 🔁 Cancel চাপলে গ্রুপের সব রোকে original state-এ ফিরিয়ে দেবে
function cancelGradeEdit(groupKey: string) {
  const group = groupedByGrade.value.find((g) => g.key === groupKey);
  if (!group) return;

  for (const row of group.rows) {
    row.checked = row.originalChecked;
    row.amount = row.originalAmount;
  }

  gradeEditing.value = {
    ...gradeEditing.value,
    [groupKey]: false,
  };
}

/* ---------- গ্রেড অনুযায়ী Save ---------- */
async function saveGradeForGroup(groupKey: string) {
  const group = groupedByGrade.value.find((g) => g.key === groupKey);
  if (!group) return;
  if (!sessionId.value) return;

  const rows = group.rows;

  const createRows: LocalFeeRow[] = [];
  const updateRows: LocalFeeRow[] = [];
  const deleteRows: LocalFeeRow[] = [];

  // validate: যেগুলো checked, তাদের amount numeric কিনা
  const invalidRows = rows.filter((row) => {
    if (!row.checked) return false;
    if (row.amount === "") return true;
    const n = Number(row.amount);
    return Number.isNaN(n) || n < 0;
  });

  if (invalidRows.length > 0) {
    toast.add({
      color: "error",
      title: "Invalid amounts",
      description: "Checked fees must have a non-negative numeric amount.",
    });
    return;
  }

  rows.forEach((row) => {
    const changedChecked = row.checked !== row.originalChecked;
    const changedAmount = row.amount !== row.originalAmount;

    if (!changedChecked && !changedAmount) return;

    if (row.checked && !row.originalChecked) {
      // নতুন attach → create
      createRows.push(row);
    } else if (!row.checked && row.originalChecked) {
      // detach → delete
      if (row.existingId) deleteRows.push(row);
    } else if (row.checked && row.originalChecked) {
      // আগেও attach ছিল, এখন শুধু amount পাল্টেছে → update
      if (row.existingId) updateRows.push(row);
    }
  });

  if (!createRows.length && !updateRows.length && !deleteRows.length) {
    toast.add({
      title: "No changes",
      description: "There are no changes to save for this grade.",
    });
    gradeEditing.value[groupKey] = false;
    return;
  }

  gradeSavingKey.value = groupKey;

  try {
    // CREATE
    for (const row of createRows) {
      const payload = {
        academic_session_id: sessionId.value,
        grade_id: row.gradeId,
        fee_id: row.feeId,
        amount: Number(row.amount || 0),
      };

      const created = await sessionFeeStore.create(payload);
      const createdId = (created as any).id as number;
      row.existingId = createdId;
      row.originalChecked = true;
      row.originalAmount = row.amount;
    }

    // UPDATE
    for (const row of updateRows) {
      if (!row.existingId) continue;
      const payload = {
        amount: Number(row.amount || 0),
      };

      await sessionFeeStore.update(row.existingId, payload);
      row.originalChecked = true;
      row.originalAmount = row.amount;
    }

    // DELETE
    for (const row of deleteRows) {
      if (!row.existingId) continue;
      await sessionFeeStore.remove(row.existingId);
      row.existingId = null;
      row.originalChecked = false;
      row.originalAmount = "";
      row.amount = "";
    }

    toast.add({
      title: "Fees updated",
      description: `Grade "${group.gradeName}" has been updated.`,
    });

    gradeEditing.value[groupKey] = false;
  } catch (e: any) {
    toast.add({
      color: "error",
      title: "Save failed",
      description: e?.data?.message || e?.message || "Please try again.",
    });
  } finally {
    gradeSavingKey.value = null;
  }
}

/* ---------- lifecycle ---------- */
onMounted(async () => {
  try {
    await sessionStore.fetchOne(sessionId.value);

    sessionFeeStore.setSession(sessionId.value);
    sessionFeeStore.setPage(1);
    sessionGradeStore.setSession(sessionId.value);

    await Promise.all([
      loadGrades(),
      feeStore.items?.length
        ? Promise.resolve()
        : feeStore.fetchList({
            per_page: 1000,
            is_active: true,
          } as any),
      // সব session-fee একসাথে আনতে বড় per_page পাঠালাম
      sessionFeeStore.fetchList({ per_page: 1000 }),
      sessionGradeStore.fetchList({ per_page: 500 }).catch(() => {}),
    ]);

    initLocalRows();
  } catch (e: any) {
    toast.add({
      color: "error",
      title: "Failed to load session fees",
      description:
        e?.data?.message || e?.message || "Please reload and try again.",
    });
  }
});

function goBack() {
  router.back();
}

/* ---------- Session-grade map (grade_id -> session_grade_id) ---------- */
const sessionGradeList = computed(() => {
  const raw = sessionGradeStore.items as any;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
});

const sessionGradeIdMap = computed(() => {
  const map = new Map<number, number>();
  sessionGradeList.value.forEach((sg: any) => {
    if (typeof sg.grade_id === "number" && typeof sg.id === "number") {
      map.set(sg.grade_id, sg.id);
    }
  });
  return map;
});

const bulkModalDescription = computed(() =>
  bulkForm.gradeName
    ? `Assign the selected fee to all students in ${bulkForm.gradeName} for this session.`
    : "Assign the selected fee to all students in this session grade."
);

/* ---------- Bulk assign modal state ---------- */
type BulkFeeOption = { label: string; value: number; amount: number | null };

const bulkAssignOpen = ref(false);
const bulkLoadingStudents = ref(false);
const bulkAssigning = ref(false);
const bulkStudentIds = ref<number[]>([]);
const bulkFeeOptions = ref<BulkFeeOption[]>([]);

const bulkForm = reactive<{
  gradeId: number | null;
  gradeName: string;
  sessionGradeId: number | null;
  sessionFeeId: number | null;
  amount: string;
  discount_type: "flat" | "percent" | null;
  discount_value: number | null;
}>({
  gradeId: null,
  gradeName: "",
  sessionGradeId: null,
  sessionFeeId: null,
  amount: "",
  discount_type: null,
  discount_value: null,
});

const selectedFeeOption = computed(
  () =>
    bulkFeeOptions.value.find((o) => o.value === bulkForm.sessionFeeId) || null
);

const bulkNetAmount = computed(() => {
  const base = Number(bulkForm.amount);
  if (!Number.isFinite(base) || base < 0) return 0;
  if (!bulkForm.discount_type || bulkForm.discount_value === null) return base;
  if (bulkForm.discount_type === "flat") {
    return Math.max(0, base - bulkForm.discount_value);
  }
  return Math.max(0, base - (base * bulkForm.discount_value) / 100);
});

watch(
  () => bulkForm.sessionFeeId,
  (id) => {
    if (!id) return;
    const opt = bulkFeeOptions.value.find((o) => o.value === id);
    if (opt) {
      bulkForm.amount =
        opt.amount === null || typeof opt.amount === "undefined"
          ? ""
          : String(opt.amount);
    }
    bulkForm.discount_type = null;
    bulkForm.discount_value = null;
  }
);

watch(
  () => bulkForm.discount_type,
  (type) => {
    if (!type) bulkForm.discount_value = null;
  }
);

function resetBulkModal() {
  bulkAssignOpen.value = false;
  bulkLoadingStudents.value = false;
  bulkAssigning.value = false;
  bulkStudentIds.value = [];
  bulkFeeOptions.value = [];
  Object.assign(bulkForm, {
    gradeId: null,
    gradeName: "",
    sessionGradeId: null,
    sessionFeeId: null,
    amount: "",
    discount_type: null,
    discount_value: null,
  });
}

function buildFeeOptions(rows: LocalFeeRow[]): BulkFeeOption[] {
  return rows
    .filter((row) => row.checked && row.existingId)
    .map((row) => ({
      label: row.fee.name,
      value: row.existingId as number,
      amount:
        row.amount === "" ||
        row.amount === null ||
        typeof row.amount === "undefined"
          ? null
          : Number(row.amount),
    }));
}

async function loadStudentsForGrade(sessionGradeId: number) {
  bulkLoadingStudents.value = true;
  try {
    const { $api } = useNuxtApp();
    const res = await $api<any>("/v1/students", {
      query: {
        academic_session_id: sessionId.value,
        session_grade_id: sessionGradeId,
        paginate: false,
        per_page: 5000,
      },
    });

    const list = Array.isArray(res)
      ? res
      : Array.isArray((res as any)?.data)
      ? (res as any).data
      : [];

    const ids = list
      .map((s: any) => Number((s as any)?.id))
      .filter((id: number) => Number.isFinite(id));

    // dedupe to stay safe
    bulkStudentIds.value = Array.from(new Set(ids));
  } catch (e: any) {
    toast.add({
      color: "error",
      title: "Failed to load students",
      description: e?.data?.message || e?.message || "Could not fetch students",
    });
    bulkStudentIds.value = [];
  } finally {
    bulkLoadingStudents.value = false;
  }
}

async function openBulkAssign(group: {
  gradeId: number;
  gradeName: string;
  rows: LocalFeeRow[];
}) {
  const options = buildFeeOptions(group.rows);
  const sessionGradeId = sessionGradeIdMap.value.get(group.gradeId) ?? null;
  const first = options[0] || null;

  Object.assign(bulkForm, {
    gradeId: group.gradeId,
    gradeName: group.gradeName,
    sessionGradeId,
    sessionFeeId: first?.value ?? null,
    amount:
      first && first.amount !== null && typeof first.amount !== "undefined"
        ? String(first.amount)
        : "",
    discount_type: null,
    discount_value: null,
  });

  bulkFeeOptions.value = options;
  bulkStudentIds.value = [];
  bulkAssignOpen.value = true;

  if (!sessionGradeId) {
    toast.add({
      color: "warning",
      title: "Session grade missing",
      description: "This grade is not opened in this session yet.",
    });
    return;
  }

  if (!options.length) {
    toast.add({
      color: "info",
      title: "No active fees",
      description: "Enable at least one fee for this grade before bulk assign.",
    });
  }

  await loadStudentsForGrade(sessionGradeId);
}

async function submitBulkAssign() {
  if (!bulkForm.sessionFeeId) {
    toast.add({
      color: "warning",
      title: "Select a fee",
      description: "Choose a fee to assign.",
    });
    return;
  }

  if (!bulkForm.sessionGradeId) {
    toast.add({
      color: "warning",
      title: "Missing grade",
      description: "No grade selected for bulk assign.",
    });
    return;
  }

  if (!bulkStudentIds.value.length) {
    toast.add({
      color: "warning",
      title: "No students found",
      description: "There are no students in this grade to assign.",
    });
    return;
  }

  const amountNumber =
    bulkForm.amount === "" ? null : Number.parseFloat(bulkForm.amount);
  if (
    amountNumber !== null &&
    (!Number.isFinite(amountNumber) || amountNumber < 0)
  ) {
    toast.add({
      color: "error",
      title: "Invalid amount",
      description: "Amount must be a non-negative number.",
    });
    return;
  }

  if (bulkForm.discount_value !== null && !bulkForm.discount_type) {
    toast.add({
      color: "error",
      title: "Discount type missing",
      description: "Select a discount type when providing a value.",
    });
    return;
  }

  const payload = {
    student_ids: bulkStudentIds.value,
    academic_session_id: sessionId.value,
    session_fee_id: bulkForm.sessionFeeId,
    amount:
      amountNumber === null || Number.isNaN(amountNumber)
        ? undefined
        : amountNumber,
    discount_type: bulkForm.discount_type || undefined,
    discount_value:
      bulkForm.discount_value === null ? undefined : bulkForm.discount_value,
  };

  bulkAssigning.value = true;
  try {
    await studentFeeStore.bulkAssignStudentFees(payload);
    toast.add({
      color: "success",
      title: "Fees assigned",
      description: `${bulkStudentIds.value.length} student(s) updated`,
    });
    resetBulkModal();
  } catch (e: any) {
    toast.add({
      color: "error",
      title: "Bulk assign failed",
      description: e?.data?.message || e?.message || "Please try again.",
    });
  } finally {
    bulkAssigning.value = false;
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <UCard>
      <div
        class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
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

        <div class="text-xs text-neutral-500">
          Configure fees per grade for this session. Check the fees and set
          amounts for each grade, then use <b>Edit</b> and <b>Save</b> on each
          grade.
        </div>
      </div>
    </UCard>

    <!-- Loading skeleton (initial) -->
    <template v-if="loading && !localRows.length">
      <div class="grid gap-4">
        <UCard v-for="i in 4" :key="i">
          <div class="space-y-3">
            <USkeleton class="h-4 w-24" />
            <USkeleton class="h-5 w-40" />
            <USkeleton class="h-4 w-3/4" />
            <div class="mt-4 border-t pt-4 space-y-2">
              <USkeleton class="h-4 w-1/2" />
              <USkeleton class="h-4 w-2/3" />
            </div>
          </div>
        </UCard>
      </div>
    </template>

    <!-- Grade-wise fee checklist -->
    <template v-else>
      <div v-if="groupedByGrade.length" class="space-y-4">
        <UCard
          v-for="group in groupedByGrade"
          :key="group.key"
          class="overflow-hidden"
        >
          <!-- Grade header -->
          <div class="flex items-center justify-between gap-2 mb-3">
            <div>
              <h2 class="text-base font-semibold">
                {{ group.gradeName }}
              </h2>
              <p class="text-xs text-neutral-500">
                {{ group.rows.length }} fee head(s)
              </p>
            </div>
            <div class="flex items-center gap-2">
              <UButton
                size="xs"
                color="primary"
                variant="soft"
                icon="i-lucide-users"
                :disabled="gradeSavingKey === group.key"
                @click="openBulkAssign(group)"
              >
                Bulk assign
              </UButton>
              <template v-if="!isGradeEditing(group.key)">
                <UButton
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-pencil"
                  @click="toggleGradeEdit(group.key)"
                >
                  Edit
                </UButton>
              </template>
              <template v-else>
                <UButton
                  size="xs"
                  color="primary"
                  icon="i-lucide-save"
                  :loading="gradeSavingKey === group.key"
                  :disabled="gradeSavingKey === group.key"
                  @click="saveGradeForGroup(group.key)"
                >
                  Save
                </UButton>
                <UButton
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-x"
                  :disabled="gradeSavingKey === group.key"
                  @click="cancelGradeEdit(group.key)"
                >
                  Cancel
                </UButton>
              </template>
            </div>
          </div>

          <!-- Fees list -->
          <div class="divide-y divide-neutral-100">
            <div
              v-for="row in group.rows"
              :key="`${row.gradeId}-${row.feeId}`"
              class="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:gap-3"
            >
              <!-- Checkbox + fee info -->
              <div class="flex items-start gap-2 sm:w-1/2">
                <UCheckbox
                  v-model="row.checked"
                  :disabled="
                    !isGradeEditing(group.key) || gradeSavingKey === group.key
                  "
                />
                <div>
                  <div class="text-sm font-medium">
                    {{ row.fee.name }}
                  </div>
                  <div class="text-xs text-neutral-500 flex flex-wrap gap-1">
                    <span>
                      {{
                        row.fee.billing_type === "one_time"
                          ? "One-time"
                          : "Recurring"
                      }}
                    </span>
                    <span v-if="row.fee.billing_type === 'recurring'">
                      ·
                      {{
                        row.fee.recurring_cycle === "monthly"
                          ? "Monthly"
                          : row.fee.recurring_cycle === "yearly"
                          ? "Yearly"
                          : row.fee.recurring_cycle === "term"
                          ? "Per term"
                          : ""
                      }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Amount -->
              <div
                class="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center"
              >
                <UFormField label="Amount" class="flex-1 sm:max-w-[200px]">
                  <UInput
                    v-model="row.amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    :disabled="
                      !isGradeEditing(group.key) ||
                      !row.checked ||
                      gradeSavingKey === group.key
                    "
                  />
                </UFormField>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <UCard v-else class="text-center py-10">
        <p class="text-sm text-neutral-500">
          No grades or fees found. Please create grades and fees first.
        </p>
      </UCard>
    </template>

    <!-- Bulk Assign Modal -->
    <UModal
      :open="bulkAssignOpen"
      @update:open="(v) => !v && resetBulkModal()"
      title="Bulk assign fees to students"
      :description="bulkModalDescription"
      :prevent-close="bulkAssigning"
      :closeable="!bulkAssigning"
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <div class="space-y-4">
          <div
            class="rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 bg-neutral-50 dark:bg-neutral-800/60"
          >
            <div class="text-sm text-neutral-500">Grade</div>
            <div class="font-semibold text-neutral-900 dark:text-white">
              {{ bulkForm.gradeName || "—" }}
            </div>
          </div>

          <div
            class="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300"
          >
            <UIcon name="i-lucide-users" class="text-neutral-500" />
            <span v-if="bulkLoadingStudents">Loading students…</span>
            <span v-else-if="bulkForm.sessionGradeId">
              {{ bulkStudentIds.length }} student(s) in this grade for the
              session
            </span>
            <span v-else class="text-amber-600 dark:text-amber-400">
              Session grade not found for this grade in the session
            </span>
          </div>

          <UFormField label="Fee" required>
            <USelect
              v-model="bulkForm.sessionFeeId"
              :items="bulkFeeOptions"
              placeholder="Select fee"
              :disabled="bulkAssigning"
              :popper="{ strategy: 'fixed' }"
            />
          </UFormField>

          <div class="grid gap-3 sm:grid-cols-2">
            <UFormField label="Amount">
              <UInput
                v-model="bulkForm.amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="Use fee default"
                :disabled="bulkAssigning"
              />
            </UFormField>

            <div class="grid gap-2">
              <UFormField label="Discount type">
                <USelect
                  v-model="bulkForm.discount_type"
                  :items="[
                    { label: 'None', value: null },
                    { label: 'Flat', value: 'flat' },
                    { label: 'Percent', value: 'percent' },
                  ]"
                  :disabled="bulkAssigning"
                  :popper="{ strategy: 'fixed' }"
                />
              </UFormField>
              <UFormField label="Discount value">
                <UInput
                  v-model.number="bulkForm.discount_value"
                  type="number"
                  min="0"
                  :step="bulkForm.discount_type === 'percent' ? '1' : '0.01'"
                  :placeholder="
                    bulkForm.discount_type === 'percent'
                      ? 'e.g. 10 for 10%'
                      : 'e.g. 500'
                  "
                  :disabled="bulkAssigning || !bulkForm.discount_type"
                />
              </UFormField>
            </div>
          </div>

          <div
            class="rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 space-y-2"
          >
            <div class="flex justify-between text-sm">
              <span class="text-neutral-600 dark:text-neutral-300">
                Net per student
              </span>
              <span class="font-semibold">
                Tk {{ bulkNetAmount.toFixed(2) }}
              </span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-neutral-600 dark:text-neutral-300">
                Total for {{ bulkStudentIds.length }} students
              </span>
              <span
                class="font-semibold text-primary-600 dark:text-primary-400"
              >
                Tk {{ (bulkNetAmount * bulkStudentIds.length).toFixed(2) }}
              </span>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <UButton
          label="Cancel"
          variant="outline"
          color="neutral"
          :disabled="bulkAssigning"
          @click="resetBulkModal()"
        />
        <UButton
          label="Assign to students"
          color="primary"
          :loading="bulkAssigning"
          :disabled="
            bulkAssigning ||
            bulkLoadingStudents ||
            !bulkForm.sessionFeeId ||
            !bulkForm.sessionGradeId ||
            bulkFeeOptions.length === 0
          "
          @click="submitBulkAssign"
        />
      </template>
    </UModal>
  </div>
</template>
