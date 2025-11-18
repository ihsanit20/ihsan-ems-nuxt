<script setup lang="ts">
definePageMeta({
  layout: "admin",
  middleware: "auth",
  requiresAuth: true,
  roles: ["Owner", "Admin", "Developer"],
});

import { useHead, useToast } from "#imports";
import type { Student } from "~/types";

type SelectItem = { label: string; value: any };

const route = useRoute();
const studentIds = computed(() => {
  const ids = route.query.ids as string;
  return ids ? ids.split(",").map(Number) : [];
});

useHead({ title: "Bulk Promote Students" });

const toast = useToast();
const router = useRouter();
const studentStore = useStudentStore();
const sessionStore = useSessionStore();
const gradeStore = useSessionGradeStore();
const sectionStore = useSectionStore();

const students = ref<Student[]>([]);
const loading = ref(true);
const promoting = ref(false);

/* ---------------- Form State ---------------- */
const form = reactive({
  target_academic_session_id: null as number | null,
  target_session_grade_id: null as number | null,
  promotion_date: new Date().toISOString().split("T")[0],
  remarks: "",
  students: [] as Array<{
    id: number;
    target_section_id: number | null;
    roll_number: string;
  }>,
});

const errors = reactive<Record<string, string>>({});

/* ---------------- Options ---------------- */
const sessionItems = computed<SelectItem[]>(() => [
  { label: "Select Session", value: null },
  ...(sessionStore.items || []).map((s) => ({
    label: s.name,
    value: s.id,
  })),
]);

const gradeItems = computed<SelectItem[]>(() => {
  if (!form.target_academic_session_id) return [];
  return [
    { label: "Select Grade", value: null },
    ...(gradeStore.items || []).map((g) => ({
      label: g.grade?.name || `Grade #${g.grade_id}`,
      value: g.id,
    })),
  ];
});

const sectionItems = computed<SelectItem[]>(() => {
  if (!form.target_session_grade_id) return [];
  const sections = sectionStore.itemsForSession(form.target_session_grade_id);
  return [
    { label: "Select Section", value: null },
    ...sections.map((s) => ({
      label: s.name,
      value: s.id,
    })),
  ];
});

/* ---------------- Watchers ---------------- */
watch(
  () => form.target_academic_session_id,
  (newVal) => {
    if (newVal) {
      gradeStore.setSession(newVal);
      gradeStore.fetchList().catch(() => {});
    }
    form.target_session_grade_id = null;
    // Reset all section assignments
    form.students.forEach((s) => {
      s.target_section_id = null;
    });
  }
);

watch(
  () => form.target_session_grade_id,
  (newVal) => {
    if (newVal) {
      sectionStore.fetchListBySession(newVal).catch(() => {});
    }
    // Reset all section assignments
    form.students.forEach((s) => {
      s.target_section_id = null;
    });
  }
);

/* ---------------- Load Students ---------------- */
async function loadStudents() {
  if (!studentIds.value.length) {
    toast.add({
      title: "No Students Selected",
      description: "Please select students from the list page",
      color: "warning",
    });
    router.push("/admin/students");
    return;
  }

  loading.value = true;
  try {
    // Fetch all selected students
    const promises = studentIds.value.map((id) => studentStore.fetchOne(id));
    students.value = await Promise.all(promises);

    // Initialize form.students array
    form.students = students.value.map((s) => ({
      id: s.id,
      target_section_id: null,
      roll_number: "",
    }));
  } catch (e: any) {
    toast.add({
      title: "Failed to load students",
      description: e?.data?.message || e.message,
      color: "error",
    });
    router.push("/admin/students");
  } finally {
    loading.value = false;
  }
}

/* ---------------- Lifecycle ---------------- */
onMounted(async () => {
  await Promise.all([loadStudents(), sessionStore.fetchList()]);
});

/* ---------------- Bulk Actions ---------------- */
const bulkSectionId = ref<number | null>(null);

function applyBulkSection() {
  if (!bulkSectionId.value) {
    toast.add({
      title: "No Section Selected",
      description: "Please select a section to apply to all students",
      color: "warning",
    });
    return;
  }

  form.students.forEach((s) => {
    s.target_section_id = bulkSectionId.value;
  });

  toast.add({
    title: "Section Applied",
    description: `Section assigned to all ${form.students.length} students`,
    color: "success",
  });
}

function clearAllSections() {
  form.students.forEach((s) => {
    s.target_section_id = null;
  });
  bulkSectionId.value = null;

  toast.add({
    title: "Sections Cleared",
    description: "All section assignments have been cleared",
    color: "info",
  });
}

/* ---------------- Remove Student ---------------- */
function removeStudent(index: number) {
  const removed = students.value.splice(index, 1)[0];
  form.students.splice(index, 1);

  if (removed) {
    toast.add({
      title: "Student Removed",
      description: `${removed.name_bn} has been removed from the list`,
      color: "info",
    });
  }
}

/* ---------------- Validation ---------------- */
function validate(): boolean {
  Object.keys(errors).forEach((k) => delete errors[k]);

  if (!form.target_academic_session_id) {
    errors.target_academic_session_id = "Target session is required";
  }
  if (!form.target_session_grade_id) {
    errors.target_session_grade_id = "Target grade is required";
  }
  if (!form.promotion_date) {
    errors.promotion_date = "Promotion date is required";
  }

  // Check if all students have sections assigned
  const missingSection = form.students.find((s) => !s.target_section_id);
  if (missingSection) {
    errors.sections = "All students must have a section assigned";
  }

  return Object.keys(errors).length === 0;
}

/* ---------------- Submit ---------------- */
async function handlePromote() {
  if (!validate()) {
    toast.add({
      title: "Validation Error",
      description: "Please fill in all required fields",
      color: "error",
    });
    return;
  }

  promoting.value = true;
  try {
    await studentStore.bulkPromote({
      student_ids: form.students.map((s) => s.id),
      from_session_id:
        students.value[0]?.enrollments?.[
          students.value[0].enrollments.length - 1
        ]?.academic_session_id || 0,
      to_session_id: form.target_academic_session_id!,
      to_session_grade_id: form.target_session_grade_id!,
    });

    toast.add({
      title: "Students Promoted",
      description: `${form.students.length} students have been successfully promoted`,
      color: "success",
    });

    router.push("/admin/students");
  } catch (e: any) {
    toast.add({
      title: "Promotion Failed",
      description: e?.data?.message || e.message,
      color: "error",
    });
  } finally {
    promoting.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin" />
    </div>

    <!-- Main Content -->
    <template v-else>
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            Bulk Promote Students
          </h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Promoting {{ students.length }} students
          </p>
        </div>
        <UButton
          icon="i-heroicons-arrow-left"
          variant="outline"
          to="/admin/students"
        >
          Back to List
        </UButton>
      </div>

      <form @submit.prevent="handlePromote" class="space-y-6">
        <!-- Promotion Details -->
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">Promotion Details</h3>
          </template>

          <div class="space-y-4">
            <UAlert
              icon="i-heroicons-information-circle"
              color="primary"
              variant="soft"
              title="Bulk Promotion"
              description="All selected students will be promoted to the same session and grade. You can assign different sections to each student below."
            />

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <USelect
                v-model="form.target_academic_session_id"
                :options="sessionItems"
                label="Target Session *"
                :error="errors.target_academic_session_id"
              />

              <USelect
                v-model="form.target_session_grade_id"
                :options="gradeItems"
                label="Target Grade *"
                :disabled="!form.target_academic_session_id"
                :error="errors.target_session_grade_id"
              />

              <UInput
                v-model="form.promotion_date"
                type="date"
                label="Promotion Date *"
                :error="errors.promotion_date"
              />

              <UTextarea
                v-model="form.remarks"
                label="Remarks"
                placeholder="Enter any remarks about this promotion (optional)"
                :rows="3"
                class="sm:col-span-3"
              />
            </div>
          </div>
        </UCard>

        <!-- Bulk Actions -->
        <UCard v-if="form.target_session_grade_id">
          <template #header>
            <h3 class="text-lg font-semibold">Bulk Actions</h3>
          </template>

          <div class="flex items-end gap-3">
            <div class="flex-1">
              <USelect
                v-model="bulkSectionId"
                :options="sectionItems"
                label="Select Section"
                placeholder="Choose section to apply to all students"
              />
            </div>
            <UButton
              type="button"
              icon="i-heroicons-arrow-down-on-square"
              @click="applyBulkSection"
              :disabled="!bulkSectionId"
            >
              Apply to All
            </UButton>
            <UButton
              type="button"
              variant="outline"
              color="neutral"
              icon="i-heroicons-x-mark"
              @click="clearAllSections"
            >
              Clear All
            </UButton>
          </div>
        </UCard>

        <!-- Students List -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold">
                Students ({{ students.length }})
              </h3>
              <UBadge v-if="errors.sections" color="error" variant="soft">
                {{ errors.sections }}
              </UBadge>
            </div>
          </template>

          <div class="space-y-4">
            <div
              v-for="(student, index) in students"
              :key="student.id"
              class="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <!-- Student Info -->
              <div class="flex items-center gap-3 flex-1">
                <UAvatar
                  :src="student.photo_url || undefined"
                  :alt="student.name_bn"
                  size="md"
                />
                <div>
                  <div class="font-medium">{{ student.name_bn }}</div>
                  <div class="text-sm text-gray-500">
                    {{ student.student_code }}
                  </div>
                </div>
              </div>

              <!-- Current Info -->
              <div class="hidden sm:block text-sm text-gray-500">
                <div>
                  Current:
                  {{
                    student.enrollments?.[student.enrollments.length - 1]
                      ?.sessionGrade?.grade?.name || "—"
                  }}
                </div>
              </div>

              <!-- Section Assignment -->
              <div class="w-48">
                <USelect
                  v-model="form.students[index]!.target_section_id"
                  :options="sectionItems"
                  placeholder="Select Section"
                  :disabled="!form.target_session_grade_id"
                  size="sm"
                />
              </div>

              <!-- Roll Number -->
              <div class="w-32">
                <UInput
                  v-model="form.students[index]!.roll_number"
                  placeholder="Roll No."
                  size="sm"
                />
              </div>

              <!-- Remove Button -->
              <UButton
                type="button"
                icon="i-heroicons-trash"
                variant="ghost"
                color="error"
                size="sm"
                @click="removeStudent(index)"
              />
            </div>
          </div>
        </UCard>

        <!-- Actions -->
        <div class="flex justify-between items-center">
          <UButton
            type="button"
            variant="outline"
            color="neutral"
            @click="router.push('/admin/students')"
          >
            Cancel
          </UButton>

          <div class="flex items-center gap-3">
            <div class="text-sm text-gray-500">
              {{ students.length }} students ready for promotion
            </div>
            <UButton
              type="submit"
              :loading="promoting"
              icon="i-heroicons-arrow-trending-up"
              :disabled="students.length === 0"
            >
              Promote All Students
            </UButton>
          </div>
        </div>
      </form>
    </template>
  </div>
</template>
