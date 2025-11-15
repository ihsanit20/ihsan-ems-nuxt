<script setup lang="ts">
definePageMeta({
  layout: "admin",
  middleware: "auth",
  requiresAuth: true,
  roles: ["Owner", "Admin", "Developer"],
});

import { ref, reactive, computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useHead, useToast } from "#imports";
import type { SessionFee } from "~/stores/session-fee";
import type { Fee } from "~/stores/fee";

useHead({ title: "Session Fees" });

const toast = useToast();
const router = useRouter();
const route = useRoute();

const sessionStore = useSessionStore();
const feeStore = useFeeStore();
const sessionFeeStore = useSessionFeeStore();

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
  </div>
</template>
