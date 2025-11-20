<script setup lang="ts">
definePageMeta({
  layout: "admin",
  middleware: "auth",
  requiresAuth: true,
  roles: ["Owner", "Admin", "Developer", "Teacher"],
});

import { ref, computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useHead, useToast } from "#imports";
import { useRouter, useRoute } from "vue-router";
import { useStudentStore } from "~/stores/student";
import { useAddressStore } from "~/stores/address";
import { useStudentFeeStore } from "~/stores/student-fee";
import type { Student, StudentEnrollment } from "~/types";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const studentStore = useStudentStore();
const addressStore = useAddressStore();
const studentFeeStore = useStudentFeeStore();

const {
  current: student,
  loading,
  currentEnrollments,
} = storeToRefs(studentStore);

const studentId = computed(() => Number(route.params.id));

// Fee Assignment
const feeModalOpen = ref(false);
const studentFees = ref<any[]>([]);
const loadingFees = ref(false);

useHead({
  title: computed(() => student.value?.name_bn || "Student Details"),
});

/* ---------------- Lifecycle ---------------- */
onMounted(async () => {
  try {
    await studentStore.fetchOne(studentId.value, true);
    await addressStore.fetchDivisions();
    await loadStudentFees();
  } catch (e: any) {
    toast.add({
      title: "Failed to load student",
      description: e?.data?.message || e.message,
      color: "error",
    });
    router.push("/admin/students");
  }
});

/* ---------------- Fee Management ---------------- */
async function loadStudentFees() {
  if (!studentId.value) return;
  loadingFees.value = true;
  try {
    await studentFeeStore.fetchStudentFees();
    studentFees.value = studentFeeStore.getStudentFeesByStudent(
      studentId.value
    );
  } catch (e: any) {
    console.error("Failed to load fees:", e);
  } finally {
    loadingFees.value = false;
  }
}

function onFeesSaved() {
  loadStudentFees();
}

async function deleteFee(feeId: number) {
  try {
    await studentFeeStore.deleteStudentFee(feeId);
    toast.add({
      title: "Fee removed",
      color: "success",
    });
    await loadStudentFees();
  } catch (e: any) {
    toast.add({
      title: "Failed to remove fee",
      description: e?.data?.message || e.message,
      color: "error",
    });
  }
}

const currentSessionId = computed(() => {
  // Get the student's current enrollment's academic session
  if (currentEnrollments.value && currentEnrollments.value.length > 0) {
    const firstEnrollment = currentEnrollments.value[0];
    return firstEnrollment?.academic_session_id || null;
  }
  return null;
});

function feeBaseAmount(fee: any): number {
  if (!fee) return 0;
  if (fee.amount !== null && fee.amount !== undefined) {
    const amount = Number(fee.amount);
    return Number.isFinite(amount) ? amount : 0;
  }
  const sessionFeeAmount = fee.sessionFee?.amount;
  if (sessionFeeAmount === null || sessionFeeAmount === undefined) return 0;
  const amount =
    typeof sessionFeeAmount === "string"
      ? Number(sessionFeeAmount)
      : sessionFeeAmount;
  return Number.isFinite(amount) ? Number(amount) : 0;
}

function feePayableAmount(fee: any): number {
  const amount = feeBaseAmount(fee);
  if (fee.discount_type && fee.discount_value) {
    if (fee.discount_type === "flat") {
      return Math.max(0, amount - fee.discount_value);
    }
    return Math.max(0, amount - (amount * fee.discount_value) / 100);
  }
  return amount;
}

/* ---------------- Helpers ---------------- */
function statusColor(
  s?: string | null
):
  | "primary"
  | "secondary"
  | "success"
  | "info"
  | "warning"
  | "error"
  | "neutral"
  | undefined {
  switch (s) {
    case "active":
      return "success";
    case "inactive":
      return "neutral";
    case "passed":
      return "info";
    case "tc_issued":
      return "warning";
    case "dropped":
      return "error";
    default:
      return "neutral";
  }
}

function formatDate(date?: string | null): string {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

function getAddressText(address?: any): string {
  if (!address) return "—";

  const parts: string[] = [];
  if (address.village_house_holding) parts.push(address.village_house_holding);

  // Try to get division/district/area names
  if (address.division_id) {
    const div = addressStore.getDivisionById(address.division_id);
    if (div) parts.push(div.name);
  }
  if (address.district_id) {
    const dist = addressStore.getDistrictById(address.district_id);
    if (dist) parts.push(dist.name);
  }
  if (address.area_id) {
    const area = addressStore.getAreaById(address.area_id);
    if (area) parts.push(area.name);
  }

  return parts.length > 0 ? parts.join(", ") : "—";
}

/* ---------------- Actions ---------------- */
const photoUploadOpen = ref(false);
const selectedPhoto = ref<File | null>(null);

function openPhotoUpload() {
  photoUploadOpen.value = true;
  selectedPhoto.value = null;
}

function onPhotoSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    selectedPhoto.value = input.files[0];
  }
}

async function uploadPhoto() {
  if (!selectedPhoto.value || !student.value) return;

  try {
    await studentStore.uploadPhoto(student.value.id, selectedPhoto.value);
    toast.add({
      title: "Photo uploaded successfully",
      color: "success",
    });
    photoUploadOpen.value = false;
  } catch (e: any) {
    toast.add({
      title: "Failed to upload photo",
      description: e?.data?.message || e.message,
      color: "error",
    });
  }
}

function editStudent() {
  router.push(`/admin/students/${studentId.value}/edit`);
}

function transferStudent() {
  router.push(`/admin/students/${studentId.value}/transfer`);
}

const issueTCOpen = ref(false);
const tcRemarks = ref("");

async function issueTC() {
  if (!student.value) return;

  try {
    await studentStore.issueTC(student.value.id, tcRemarks.value || null);
    toast.add({
      title: "Transfer Certificate issued",
      color: "success",
    });
    issueTCOpen.value = false;
    tcRemarks.value = "";
  } catch (e: any) {
    toast.add({
      title: "Failed to issue TC",
      description: e?.data?.message || e.message,
      color: "error",
    });
  }
}

const createAccountOpen = ref(false);
const accountForm = ref({
  phone: "",
  email: "",
  password: "",
});

async function createUserAccount() {
  if (!student.value) return;

  try {
    await studentStore.createUserAccount(student.value.id, accountForm.value);
    toast.add({
      title: "User account created",
      color: "success",
    });
    createAccountOpen.value = false;
    accountForm.value = { phone: "", email: "", password: "" };
  } catch (e: any) {
    toast.add({
      title: "Failed to create account",
      description: e?.data?.message || e.message,
      color: "error",
    });
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <UButton
          icon="i-heroicons-arrow-left"
          variant="ghost"
          to="/admin/students"
        />
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ student?.name_bn || "Student Details" }}
          </h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {{ student?.student_code }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <UButton
          icon="i-heroicons-pencil-square"
          variant="outline"
          @click="editStudent"
        >
          Edit
        </UButton>
        <UDropdownMenu
          :items="[
            [
              {
                label: 'Upload Photo',
                icon: 'i-heroicons-camera',
                click: openPhotoUpload,
              },
              {
                label: 'Transfer Student',
                icon: 'i-heroicons-arrow-right-circle',
                click: transferStudent,
              },
            ],
            [
              {
                label: 'Create User Account',
                icon: 'i-heroicons-user-plus',
                click: () => (createAccountOpen = true),
                disabled: !!student?.user_id,
              },
              {
                label: 'Issue TC',
                icon: 'i-heroicons-document-text',
                click: () => (issueTCOpen = true),
              },
            ],
          ]"
        >
          <UButton
            icon="i-heroicons-ellipsis-horizontal"
            variant="ghost"
            color="secondary"
          />
        </UDropdownMenu>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon
        name="i-heroicons-arrow-path"
        class="h-8 w-8 animate-spin text-primary"
      />
    </div>

    <div v-else-if="student" class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Left Column - Photo & Quick Info -->
      <div class="space-y-6">
        <UCard>
          <div class="flex flex-col items-center space-y-4">
            <UAvatar
              :src="student.photo_url ?? undefined"
              :alt="student.name_bn"
              size="3xl"
            />
            <div class="text-center">
              <h3 class="text-lg font-semibold">{{ student.name_bn }}</h3>
              <p v-if="student.name_en" class="text-sm text-gray-500">
                {{ student.name_en }}
              </p>
              <p class="mt-1 text-sm font-medium text-gray-600">
                {{ student.student_code }}
              </p>
            </div>
            <UBadge
              :color="statusColor(student.status)"
              variant="subtle"
              size="lg"
            >
              {{ student.status || "Unknown" }}
            </UBadge>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h3 class="text-base font-semibold">Quick Info</h3>
          </template>
          <div class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Gender:</span>
              <span class="font-medium capitalize">{{
                student.gender || "—"
              }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">DOB:</span>
              <span class="font-medium">{{
                formatDate(student.date_of_birth)
              }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Residential:</span>
              <span class="font-medium capitalize">
                {{ student.residential_type?.replace("_", " ") || "—" }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Phone:</span>
              <span class="font-medium">{{
                student.student_phone || "—"
              }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Email:</span>
              <span class="font-medium">{{
                student.student_email || "—"
              }}</span>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Right Column - Details -->
      <div class="space-y-6 lg:col-span-2">
        <!-- Parent Information -->
        <UCard>
          <template #header>
            <h3 class="text-base font-semibold">Parent Information</h3>
          </template>
          <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h4
                class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300"
              >
                Father
              </h4>
              <div class="space-y-2 text-sm">
                <div>
                  <span class="text-gray-600 dark:text-gray-400">Name:</span>
                  <span class="ml-2 font-medium">{{
                    student.father_name || "—"
                  }}</span>
                </div>
                <div>
                  <span class="text-gray-600 dark:text-gray-400">Phone:</span>
                  <span class="ml-2 font-medium">{{
                    student.father_phone || "—"
                  }}</span>
                </div>
                <div>
                  <span class="text-gray-600 dark:text-gray-400"
                    >Occupation:</span
                  >
                  <span class="ml-2 font-medium">{{
                    student.father_occupation || "—"
                  }}</span>
                </div>
              </div>
            </div>
            <div>
              <h4
                class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300"
              >
                Mother
              </h4>
              <div class="space-y-2 text-sm">
                <div>
                  <span class="text-gray-600 dark:text-gray-400">Name:</span>
                  <span class="ml-2 font-medium">{{
                    student.mother_name || "—"
                  }}</span>
                </div>
                <div>
                  <span class="text-gray-600 dark:text-gray-400">Phone:</span>
                  <span class="ml-2 font-medium">{{
                    student.mother_phone || "—"
                  }}</span>
                </div>
                <div>
                  <span class="text-gray-600 dark:text-gray-400"
                    >Occupation:</span
                  >
                  <span class="ml-2 font-medium">{{
                    student.mother_occupation || "—"
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Guardian Information -->
        <UCard v-if="student.guardian_type">
          <template #header>
            <h3 class="text-base font-semibold">Guardian Information</h3>
          </template>
          <div class="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            <div>
              <span class="text-gray-600 dark:text-gray-400">Type:</span>
              <span class="ml-2 font-medium capitalize">{{
                student.guardian_type
              }}</span>
            </div>
            <div>
              <span class="text-gray-600 dark:text-gray-400">Name:</span>
              <span class="ml-2 font-medium">{{
                student.guardian_name || "—"
              }}</span>
            </div>
            <div>
              <span class="text-gray-600 dark:text-gray-400">Phone:</span>
              <span class="ml-2 font-medium">{{
                student.guardian_phone || "—"
              }}</span>
            </div>
            <div>
              <span class="text-gray-600 dark:text-gray-400">Relation:</span>
              <span class="ml-2 font-medium">{{
                student.guardian_relation || "—"
              }}</span>
            </div>
          </div>
        </UCard>

        <!-- Address Information -->
        <UCard>
          <template #header>
            <h3 class="text-base font-semibold">Address</h3>
          </template>
          <div class="space-y-4 text-sm">
            <div>
              <h4 class="mb-2 font-medium text-gray-700 dark:text-gray-300">
                Present Address
              </h4>
              <p class="text-gray-600 dark:text-gray-400">
                {{ getAddressText(student.present_address) }}
              </p>
            </div>
            <div>
              <h4 class="mb-2 font-medium text-gray-700 dark:text-gray-300">
                Permanent Address
              </h4>
              <p class="text-gray-600 dark:text-gray-400">
                {{ getAddressText(student.permanent_address) }}
              </p>
            </div>
          </div>
        </UCard>

        <!-- Student Fees -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-base font-semibold">Assigned Fees</h3>
              <UButton
                v-if="currentSessionId"
                icon="i-heroicons-plus"
                size="sm"
                @click="feeModalOpen = true"
              >
                Assign Fees
              </UButton>
            </div>
          </template>

          <div v-if="loadingFees" class="text-center py-8 text-gray-500">
            <UIcon
              name="i-heroicons-arrow-path"
              class="h-6 w-6 animate-spin inline-block"
            />
            Loading fees...
          </div>

          <div v-else-if="studentFees.length === 0" class="text-center py-8">
            <UIcon
              name="i-heroicons-currency-dollar"
              class="h-12 w-12 mx-auto text-gray-400 mb-3"
            />
            <p class="text-gray-500">No fees assigned yet</p>
            <UButton
              v-if="currentSessionId"
              class="mt-4"
              variant="outline"
              @click="feeModalOpen = true"
            >
              Assign Fees
            </UButton>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="fee in studentFees"
              :key="fee.id"
              class="flex items-center justify-between p-4 border rounded-lg dark:border-gray-700"
            >
              <div class="flex-1">
                <div class="font-medium">
                  {{ fee.sessionFee?.fee?.name || "Fee" }}
                  <span
                    v-if="fee.sessionFee?.grade?.name"
                    class="text-xs text-gray-500 ml-2"
                  >
                    ({{ fee.sessionFee.grade.name }})
                  </span>
                </div>
                <div class="text-sm text-gray-500">
                  Amount: Tk {{ feeBaseAmount(fee).toFixed(0) }}
                  <span v-if="fee.discount_value" class="text-green-600 ml-2">
                    ({{
                      fee.discount_type === "percent"
                        ? fee.discount_value + "%"
                        : "Tk " + fee.discount_value
                    }}
                    discount)
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <div class="text-right">
                  <div class="text-sm text-gray-500">Payable</div>
                  <div class="font-semibold text-primary-600">
                    Tk {{ feePayableAmount(fee).toFixed(0) }}
                  </div>
                </div>
                <UButton
                  icon="i-heroicons-trash"
                  color="error"
                  variant="ghost"
                  size="sm"
                  @click="deleteFee(fee.id)"
                />
              </div>
            </div>

            <!-- Total Summary -->
            <div class="border-t pt-3 mt-4 dark:border-gray-700">
              <div class="flex justify-between items-center">
                <span class="font-semibold text-gray-700 dark:text-gray-300">
                  Total Payable:
                </span>
                <span
                  class="text-xl font-bold text-primary-600 dark:text-primary-400"
                >
                  Tk
                  {{
                    studentFees
                      .reduce((sum, fee) => sum + feePayableAmount(fee), 0)
                      .toFixed(0)
                  }}
                </span>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Enrollment History -->
        <UCard>
          <template #header>
            <h3 class="text-base font-semibold">Enrollment History</h3>
          </template>
          <div
            v-if="currentEnrollments && currentEnrollments.length > 0"
            class="space-y-3"
          >
            <div
              v-for="enrollment in currentEnrollments"
              :key="enrollment.id"
              class="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
            >
              <div class="flex items-start justify-between">
                <div class="space-y-1">
                  <div class="font-medium">
                    {{
                      enrollment.academicSession?.name ||
                      `Session #${enrollment.academic_session_id}`
                    }}
                  </div>
                  <div class="text-sm text-gray-600 dark:text-gray-400">
                    Grade:
                    {{
                      enrollment.sessionGrade?.grade?.name ||
                      `#${enrollment.session_grade_id}`
                    }}
                    <span v-if="enrollment.section">
                      · Section: {{ enrollment.section.name }}
                    </span>
                    <span v-if="enrollment.roll_no">
                      · Roll: {{ enrollment.roll_no }}
                    </span>
                  </div>
                  <div v-if="enrollment.remarks" class="text-xs text-gray-500">
                    {{ enrollment.remarks }}
                  </div>
                </div>
                <UBadge v-if="enrollment.status" variant="subtle">
                  {{ enrollment.status }}
                </UBadge>
              </div>
            </div>
          </div>
          <div v-else class="py-8 text-center text-gray-500">
            No enrollment history
          </div>
        </UCard>
      </div>
    </div>

    <!-- Photo Upload Modal -->
    <UModal v-model="photoUploadOpen">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">Upload Photo</h3>
            <UButton
              icon="i-heroicons-x-mark"
              variant="ghost"
              color="secondary"
              @click="photoUploadOpen = false"
            />
          </div>
        </template>

        <div class="space-y-4">
          <div>
            <input type="file" accept="image/*" @change="onPhotoSelect" />
          </div>
          <div v-if="selectedPhoto" class="text-sm text-gray-600">
            Selected: {{ selectedPhoto.name }}
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton variant="outline" @click="photoUploadOpen = false">
              Cancel
            </UButton>
            <UButton
              :disabled="!selectedPhoto"
              :loading="studentStore.saving"
              @click="uploadPhoto"
            >
              Upload
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Issue TC Modal -->
    <UModal v-model="issueTCOpen">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">Issue Transfer Certificate</h3>
            <UButton
              icon="i-heroicons-x-mark"
              variant="ghost"
              color="secondary"
              @click="issueTCOpen = false"
            />
          </div>
        </template>

        <div class="space-y-4">
          <UFormGroup label="Remarks (Optional)">
            <UTextarea v-model="tcRemarks" placeholder="Enter any remarks..." />
          </UFormGroup>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton variant="outline" @click="issueTCOpen = false">
              Cancel
            </UButton>
            <UButton
              color="warning"
              :loading="studentStore.saving"
              @click="issueTC"
            >
              Issue TC
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Create Account Modal -->
    <UModal v-model="createAccountOpen">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">Create User Account</h3>
            <UButton
              icon="i-heroicons-x-mark"
              variant="ghost"
              color="secondary"
              @click="createAccountOpen = false"
            />
          </div>
        </template>

        <div class="space-y-4">
          <UFormGroup label="Phone" required>
            <UInput
              v-model="accountForm.phone"
              placeholder="Enter phone number"
            />
          </UFormGroup>
          <UFormGroup label="Email">
            <UInput
              v-model="accountForm.email"
              type="email"
              placeholder="Enter email (optional)"
            />
          </UFormGroup>
          <UFormGroup label="Password" required>
            <UInput
              v-model="accountForm.password"
              type="password"
              placeholder="Enter password"
            />
          </UFormGroup>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton variant="outline" @click="createAccountOpen = false">
              Cancel
            </UButton>
            <UButton :loading="studentStore.saving" @click="createUserAccount">
              Create Account
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Fee Assignment Modal -->
      <StudentFeeAssignmentModal
      v-if="student && currentSessionId"
      :open="feeModalOpen"
      :student-id="student.id"
      :student-name="student.name_bn || student.name_en || 'Student'"
      :academic-session-id="currentSessionId"
      :session-grade-id="currentEnrollments?.[0]?.session_grade_id || null"
      @close="feeModalOpen = false"
      @saved="onFeesSaved"
    />
  </div>
</template>
