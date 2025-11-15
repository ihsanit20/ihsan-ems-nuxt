<!-- app/pages/admin/settings/sessions/[id]/subjetcs.vue -->
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
import type { SessionSubject } from "~/stores/session-subject";
import type { Subject } from "~/stores/subject";

useHead({ title: "Session Subjects" });

const toast = useToast();
const router = useRouter();
const route = useRoute();

const sessionStore = useSessionStore();
const subjectStore = useSubjectStore();
const sessionSubjectStore = useSessionSubjectStore();

const { loading, saving } = storeToRefs(sessionSubjectStore);

/* ---------- basic session meta ---------- */
const sessionId = computed<number>(() => Number(route.params.id));
const sessionTitle = computed(
  () => sessionStore.current?.name ?? `Session #${sessionId.value}`
);

/* ---------- Local state for inline editor ---------- */
type LocalSubjectRow = {
  subjectId: number;
  subject: Subject;
  gradeId: number | null;
  gradeName: string;
  checked: boolean;
  book_name: string;
  sort_order: number | null;
  existingId: number | null; // session_subjects.id যদি থাকে

  // original state (ডার্টি ডিটেকশন + অপ্টিমাইজেশন)
  originalChecked: boolean;
  originalBook: string;
  originalOrder: number | null;
};

const localRows = ref<LocalSubjectRow[]>([]);

// কোন গ্রেডে এখন save হচ্ছে → শুধু সেই গ্রেডের বাটন/ইনপুট disable
const gradeSavingKey = ref<string | null>(null);

// প্রতি গ্রেডের edit state
const gradeEditing = ref<Record<string, boolean>>({});

/* ---------- Session + Subjects থেকে লোকাল রো বানানো ---------- */
function initLocalRows() {
  const sessionSubjects = sessionSubjectStore.items as SessionSubject[];

  // subject_id → SessionSubject ম্যাপ
  const existingMap = new Map<number, SessionSubject>();
  sessionSubjects.forEach((ss) => {
    existingMap.set(ss.subject_id, ss);
  });

  const rows: LocalSubjectRow[] = [];
  const subjects = (subjectStore.items || []) as Subject[];

  subjects.forEach((s: any) => {
    const existing = existingMap.get(s.id) || null;

    const gradeId = (s.grade && s.grade.id) ?? s.grade_id ?? null;

    const gradeName =
      (s.grade && s.grade.name) ?? (gradeId ? `Grade #${gradeId}` : "No grade");

    const checked = !!existing;
    const book = existing?.book_name ?? "";
    const order =
      typeof existing?.sort_order === "number" ? existing.sort_order : null;

    rows.push({
      subjectId: s.id,
      subject: s,
      gradeId,
      gradeName,
      checked,
      book_name: book,
      sort_order: order,
      existingId: existing?.id ?? null,
      originalChecked: checked,
      originalBook: book,
      originalOrder: order,
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
      gradeId: number | null;
      gradeName: string;
      rows: LocalSubjectRow[];
    }
  > = {};

  for (const row of localRows.value) {
    const key = row.gradeId != null ? String(row.gradeId) : "none";
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

  // প্রতিটা গ্রেডের ভিতরে subject গুলো sort: sort_order → name
  Object.values(groups).forEach((g) => {
    g.rows.sort((a, b) => {
      const ao = a.sort_order ?? 9999;
      const bo = b.sort_order ?? 9999;
      if (ao !== bo) return ao - bo;
      return a.subject.name.localeCompare(b.subject.name);
    });
  });

  // গ্রেড group sort: gradeId অনুযায়ী
  return Object.values(groups).sort((a, b) => {
    const ag = a.gradeId ?? 99999;
    const bg = b.gradeId ?? 99999;
    if (ag !== bg) return ag - bg;
    return a.gradeName.localeCompare(b.gradeName);
  });
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
    row.book_name = row.originalBook;
    row.sort_order = row.originalOrder;
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

  const createRows: LocalSubjectRow[] = [];
  const updateRows: LocalSubjectRow[] = [];
  const deleteRows: LocalSubjectRow[] = [];

  rows.forEach((row) => {
    const changedChecked = row.checked !== row.originalChecked;
    const changedBook = row.book_name !== row.originalBook;
    const changedOrder = row.sort_order !== row.originalOrder;

    if (!changedChecked && !changedBook && !changedOrder) return;

    if (row.checked && !row.originalChecked) {
      // নতুন attach → create
      createRows.push(row);
    } else if (!row.checked && row.originalChecked) {
      // detach → delete
      if (row.existingId) deleteRows.push(row);
    } else if (row.checked && row.originalChecked) {
      // আগেও attach ছিল, এখন শুধু data পাল্টেছে → update
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
      const payload: any = {
        subject_id: row.subjectId,
      };
      if (row.sort_order != null) payload.sort_order = row.sort_order;
      if (row.book_name.trim()) payload.book_name = row.book_name.trim();

      const created = await sessionSubjectStore.create(
        sessionId.value,
        payload
      );
      const createdId = (created as any).id as number;
      row.existingId = createdId;
      row.originalChecked = true;
      row.originalBook = row.book_name;
      row.originalOrder = row.sort_order;
    }

    // UPDATE
    for (const row of updateRows) {
      if (!row.existingId) continue;
      const payload: any = {};
      if (row.sort_order != null) payload.sort_order = row.sort_order;
      if (row.book_name.trim()) payload.book_name = row.book_name.trim();
      else payload.book_name = null;

      await sessionSubjectStore.update(row.existingId, payload);
      row.originalChecked = true;
      row.originalBook = row.book_name;
      row.originalOrder = row.sort_order;
    }

    // DELETE
    for (const row of deleteRows) {
      if (!row.existingId) continue;
      await sessionSubjectStore.remove(row.existingId);
      row.existingId = null;
      row.originalChecked = false;
      row.originalBook = "";
      row.originalOrder = null;
      row.book_name = "";
      row.sort_order = null;
    }

    toast.add({
      title: "Subjects updated",
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

    sessionSubjectStore.setSession(sessionId.value);
    sessionSubjectStore.setPage(1);

    await Promise.all([
      // সব session-subject একসাথে আনতে বড় per_page পাঠালাম
      sessionSubjectStore.fetchList({ per_page: 1000 }),
      subjectStore.items?.length
        ? Promise.resolve()
        : subjectStore.fetchList({
            per_page: 1000,
            is_active: true,
          }),
    ]);

    initLocalRows();
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
          Select subjects per grade, then use <b>Edit</b> and <b>Save</b> on
          each grade to update session subjects.
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

    <!-- Grade-wise checklist -->
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
                {{ group.rows.length }} subject(s)
              </p>
            </div>
            <div class="flex items-center gap-2">
              <!-- 🔁 এখন একসাথে দুইটা বাটন দেখাবে না -->
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

          <!-- Subjects list -->
          <div class="divide-y divide-neutral-100">
            <div
              v-for="row in group.rows"
              :key="row.subjectId"
              class="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:gap-3"
            >
              <!-- Checkbox + subject info -->
              <div class="flex items-start gap-2 sm:w-1/2">
                <UCheckbox
                  v-model="row.checked"
                  :disabled="
                    !isGradeEditing(group.key) || gradeSavingKey === group.key
                  "
                />
                <div>
                  <div class="text-sm font-medium">
                    {{ row.subject.name }}
                  </div>
                  <div v-if="row.subject.code" class="text-xs text-neutral-500">
                    Code: {{ row.subject.code }}
                  </div>
                </div>
              </div>

              <!-- Order + Book -->
              <div
                class="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center"
              >
                <UFormField label="Order" class="flex-1 sm:max-w-[120px]">
                  <UInput
                    v-model.number="row.sort_order"
                    type="number"
                    min="0"
                    :disabled="
                      !isGradeEditing(group.key) ||
                      !row.checked ||
                      gradeSavingKey === group.key
                    "
                  />
                </UFormField>
                <UFormField label="Book name" class="flex-[2]">
                  <UInput
                    v-model="row.book_name"
                    placeholder="Optional book / text"
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
          No subjects found. Please create subjects first.
        </p>
      </UCard>
    </template>
  </div>
</template>
