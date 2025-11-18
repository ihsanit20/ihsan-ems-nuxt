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
const studentId = computed(() => Number(route.params.id));

useHead({ title: "Transfer Student" });

const toast = useToast();
const router = useRouter();
const studentStore = useStudentStore();
const sessionStore = useSessionStore();
const gradeStore = useSessionGradeStore();
const sectionStore = useSectionStore();

const student = ref<Student | null>(null);
const loading = ref(true);
const transferring = ref(false);

/* ---------------- Form State ---------------- */
const form = reactive({
  target_academic_session_id: null as number | null,
  target_session_grade_id: null as number | null,
  target_section_id: null as number | null,
  roll_number: "",
  transfer_date: new Date().toISOString().split("T")[0],
  remarks: "",
});

const errors = reactive<Record<string, string>>({});

/* ---------------- Current Enrollment Info ---------------- */
const currentEnrollment = computed(() => {
  if (!student.value?.enrollments?.length) return null;
  // Get the most recent enrollment (assuming last item is most recent)
  return student.value.enrollments[student.value.enrollments.length - 1];
});

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
    form.target_section_id = null;
  }
);

watch(
  () => form.target_session_grade_id,
  (newVal) => {
    if (newVal) {
      sectionStore.fetchListBySession(newVal).catch(() => {});
    }
    form.target_section_id = null;
  }
);

/* ---------------- Load Student Data ---------------- */
async function loadStudent() {
  loading.value = true;
  try {
    const data = await studentStore.fetchOne(studentId.value);
    student.value = data;
  } catch (e: any) {
    toast.add({
      title: "Failed to load student",
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
  await Promise.all([loadStudent(), sessionStore.fetchList()]);
});

/* ---------------- Validation ---------------- */
function validate(): boolean {
  Object.keys(errors).forEach((k) => delete errors[k]);

  if (!form.target_academic_session_id) {
    errors.target_academic_session_id = "Target session is required";
  }
  if (!form.target_session_grade_id) {
    errors.target_session_grade_id = "Target grade is required";
  }
  if (!form.target_section_id) {
    errors.target_section_id = "Target section is required";
  }
  if (!form.transfer_date) {
    errors.transfer_date = "Transfer date is required";
  }

  // Check if transferring to same session/grade/section
  if (
    currentEnrollment.value &&
    form.target_academic_session_id ===
      currentEnrollment.value.academic_session_id &&
    form.target_session_grade_id === currentEnrollment.value.session_grade_id &&
    form.target_section_id === currentEnrollment.value.section_id
  ) {
    errors.target_section_id = "Cannot transfer to the same section";
  }

  return Object.keys(errors).length === 0;
}

/* ---------------- Submit ---------------- */
async function handleTransfer() {
  if (!validate()) {
    toast.add({
      title: "Validation Error",
      description: "Please fill in all required fields",
      color: "error",
    });
    return;
  }

  transferring.value = true;
  try {
    await studentStore.transferStudent(studentId.value, {
      academic_session_id: form.target_academic_session_id!,
      session_grade_id: form.target_session_grade_id!,
      section_id: form.target_section_id!,
      roll_no: form.roll_number || null,
      remarks: form.remarks || null,
    });

    toast.add({
      title: "Student Transferred",
      description: "Student has been successfully transferred",
      color: "success",
    });

    router.push(`/admin/students/${studentId.value}`);
  } catch (e: any) {
    toast.add({
      title: "Transfer Failed",
      description: e?.data?.message || e.message,
      color: "error",
    });
  } finally {
    transferring.value = false;
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
    <template v-else-if="student">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            Transfer Student
          </h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {{ student.name_bn }} ({{ student.student_code }})
          </p>
        </div>
        <UButton
          icon="i-heroicons-arrow-left"
          variant="outline"
          :to="`/admin/students/${studentId}`"
        >
          Back to Details
        </UButton>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Current Information -->
        <div class="lg:col-span-1">
          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">Current Information</h3>
            </template>

            <div class="space-y-4">
              <div class="flex items-center gap-3">
                <UAvatar
                  :src="student.photo_url || undefined"
                  :alt="student.name_bn"
                  size="xl"
                />
                <div>
                  <div class="font-medium">{{ student.name_bn }}</div>
                  <div class="text-sm text-gray-500">
                    {{ student.student_code }}
                  </div>
                </div>
              </div>

              <div
                v-if="currentEnrollment"
                class="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3"
              >
                <div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    Current Session
                  </div>
                  <div class="font-medium">
                    {{ currentEnrollment.academicSession?.name || "—" }}
                  </div>
                </div>

                <div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    Current Grade
                  </div>
                  <div class="font-medium">
                    {{
                      currentEnrollment.sessionGrade?.grade?.name ||
                      `Grade #${currentEnrollment.session_grade_id}`
                    }}
                  </div>
                </div>

                <div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    Current Section
                  </div>
                  <div class="font-medium">
                    {{ currentEnrollment.section?.name || "—" }}
                  </div>
                </div>

                <div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    Roll Number
                  </div>
                  <div class="font-medium">
                    {{ currentEnrollment.roll_no || "—" }}
                  </div>
                </div>
              </div>

              <div
                v-else
                class="pt-4 border-t border-gray-200 dark:border-gray-700"
              >
                <p class="text-sm text-gray-500">No current enrollment found</p>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Transfer Form -->
        <div class="lg:col-span-2">
          <form @submit.prevent="handleTransfer">
            <UCard>
              <template #header>
                <h3 class="text-lg font-semibold">Transfer Details</h3>
              </template>

              <div class="space-y-4">
                <UAlert
                  icon="i-heroicons-information-circle"
                  color="primary"
                  variant="soft"
                  title="Transfer Information"
                  description="Transferring a student will create a new enrollment record and close the current one. The student's history will be preserved."
                />

                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

                  <USelect
                    v-model="form.target_section_id"
                    :options="sectionItems"
                    label="Target Section *"
                    :disabled="!form.target_session_grade_id"
                    :error="errors.target_section_id"
                  />

                  <UInput
                    v-model="form.roll_number"
                    label="New Roll Number"
                    placeholder="Enter roll number (optional)"
                  />

                  <UInput
                    v-model="form.transfer_date"
                    type="date"
                    label="Transfer Date *"
                    :error="errors.transfer_date"
                    class="sm:col-span-2"
                  />

                  <UTextarea
                    v-model="form.remarks"
                    label="Remarks"
                    placeholder="Enter any remarks or notes about this transfer (optional)"
                    :rows="4"
                    class="sm:col-span-2"
                  />
                </div>
              </div>

              <template #footer>
                <div class="flex justify-end gap-3">
                  <UButton
                    type="button"
                    variant="outline"
                    color="neutral"
                    @click="router.push(`/admin/students/${studentId}`)"
                  >
                    Cancel
                  </UButton>
                  <UButton
                    type="submit"
                    :loading="transferring"
                    icon="i-heroicons-arrow-right-circle"
                  >
                    Transfer Student
                  </UButton>
                </div>
              </template>
            </UCard>
          </form>
        </div>
      </div>
    </template>
  </div>
</template>
