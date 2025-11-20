<script setup lang="ts">
import { storeToRefs } from "pinia";

definePageMeta({
  layout: "admin",
  middleware: "auth",
  roles: ["Owner", "Admin", "Developer"],
});

useHead({ title: "Application Details" });

const route = useRoute();
const router = useRouter();
const id = computed(() => Number(route.params.id));

const apps = useAdmissionApplicationStore();
const { current, loading, error, saving } = storeToRefs(apps);

const sections = useSectionStore();
const toast = useToast();

const statusForm = reactive({
  status: "" as "pending" | "accepted" | "rejected" | "admitted",
  status_note: "",
});

const admitOpen = ref(false);
const admitForm = reactive({
  section_id: undefined as number | undefined,
  admission_date: new Date().toISOString().split("T")[0],
});

const statusOpen = ref(false);

// Fee Assignment Modal
const feeModalOpen = ref(false);
const studentFeeStore = useStudentFeeStore();
const assignedFees = ref<any[]>([]);

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

function statusIcon(status?: string) {
  switch (status) {
    case "pending":
      return "i-lucide-clock";
    case "accepted":
      return "i-lucide-check-circle";
    case "admitted":
      return "i-lucide-graduation-cap";
    case "rejected":
      return "i-lucide-x-circle";
    default:
      return "i-lucide-help-circle";
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

onMounted(async () => {
  if (!id.value || Number.isNaN(id.value)) {
    toast.add({
      title: "Invalid",
      description: "Invalid application id",
      color: "error",
    });
    router.replace("/admin/admission/applications");
    return;
  }
  try {
    await apps.fetchOne(id.value);
    if (apps.current) {
      if (apps.current.session_grade_id) {
        await sections.fetchListBySession(apps.current.session_grade_id);
      }
      // Load fees if student is already admitted
      if (
        apps.current.status === "admitted" &&
        apps.current.admitted_student?.id
      ) {
        loadStudentFees();
      }
    }
    statusForm.status = (apps.current?.status as any) || "pending";
    statusForm.status_note = apps.current?.status_note || "";
  } catch (e: any) {
    toast.add({
      title: "Failed",
      description:
        e?.data?.message || e?.message || "Could not load application",
      color: "error",
    });
  }
});

const sectionOptions = computed(() => {
  const sgId = apps.current?.session_grade_id || 0;
  return sections
    .itemsForSession(sgId)
    .map((s) => ({ label: s.name, value: s.id }));
});

async function submitStatus() {
  if (!id.value) return;
  try {
    await apps.updateStatus(
      id.value,
      statusForm.status,
      statusForm.status_note || undefined
    );
    toast.add({
      title: "Updated",
      description: "Status updated",
      color: "success",
    });
    statusOpen.value = false;
  } catch (e: any) {
    toast.add({
      title: "Failed",
      description: e?.data?.message || e?.message || "Could not update status",
      color: "error",
    });
  }
}

async function submitAdmit() {
  if (!id.value) return;
  try {
    await apps.admit(id.value, {
      section_id: admitForm.section_id,
      admission_date: admitForm.admission_date || undefined,
    });
    toast.add({
      title: "Admitted",
      description: "Student admitted successfully",
      color: "success",
    });
    admitOpen.value = false;
    await apps.fetchOne(id.value);

    // Auto-open fee assignment modal after admission
    if (
      apps.current?.admitted_student?.id &&
      apps.current?.academic_session_id
    ) {
      setTimeout(() => {
        feeModalOpen.value = true;
      }, 500);
    }
  } catch (e: any) {
    toast.add({
      title: "Failed",
      description: e?.data?.message || e?.message || "Could not admit student",
      color: "error",
    });
  }
}

// Load assigned fees for admitted student
async function loadStudentFees() {
  if (!apps.current?.admitted_student?.id) return;
  try {
    await studentFeeStore.fetchStudentFees({
      // You can add filter by student_id if your API supports it
    });
    assignedFees.value = studentFeeStore.studentFees.filter(
      (f) => f.student_id === apps.current?.admitted_student?.id
    );
  } catch (e: any) {
    console.error("Failed to load fees:", e);
  }
}

function onFeesSaved() {
  loadStudentFees();
}
</script>

<template>
  <UContainer>
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-2">
        <UButton
          color="secondary"
          variant="outline"
          icon="i-lucide-arrow-left"
          to="/admin/admission/applications"
          >Back</UButton
        >
        <div>
          <h1 class="text-2xl font-semibold">Application Details</h1>
          <p class="text-sm text-gray-500">
            Review and manage this application.
          </p>
        </div>
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

    <!-- Loading -->
    <UCard v-if="loading" class="mb-6">
      <div class="py-10 text-center text-gray-500">
        <UIcon
          name="i-lucide-loader-2"
          class="h-6 w-6 animate-spin inline-block mr-2"
        />
        Loading...
      </div>
    </UCard>

    <template v-else>
      <div class="space-y-4">
        <!-- Header summary -->
        <UCard class="">
          <template #header>
            <div class="flex items-center justify-between">
              <div class="space-y-1">
                <div class="text-sm text-gray-500">Application No</div>
                <div class="text-xl font-semibold">
                  {{ current?.application_no }}
                </div>
              </div>
              <UBadge
                :color="statusColor(current?.status)"
                variant="soft"
                size="lg"
              >
                <UIcon
                  :name="statusIcon(current?.status)"
                  class="h-4 w-4 mr-1"
                />
                {{ current?.status?.toUpperCase() }}
              </UBadge>
            </div>
          </template>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div class="text-sm text-gray-500">Session</div>
              <div class="font-medium">{{ current?.session?.name || "-" }}</div>
            </div>
            <div>
              <div class="text-sm text-gray-500">Class</div>
              <div class="font-medium">
                {{
                  current?.session_grade?.grade?.name ||
                  `#${current?.session_grade_id}`
                }}
              </div>
            </div>
            <div>
              <div class="text-sm text-gray-500">Applied On</div>
              <div class="font-medium">
                {{ formatDate(current?.created_at) }}
              </div>
            </div>
          </div>
        </UCard>

        <!-- Basic Info -->
        <UCard class="">
          <template #header
            ><h2 class="text-lg font-semibold">Basic Information</h2></template
          >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div class="text-sm text-gray-500">Applicant Name</div>
              <div class="font-medium">{{ current?.applicant_name }}</div>
            </div>
            <div>
              <div class="text-sm text-gray-500">Application Type</div>
              <div class="font-medium capitalize">
                {{ current?.application_type?.replace("_", " ") || "New" }}
                <span v-if="current?.application_type === 're_admission'">
                  ({{ current?.existing_student_id || "ID not found" }})
                </span>
              </div>
            </div>
            <div>
              <div class="text-sm text-gray-500">Gender</div>
              <div class="font-medium capitalize">
                {{ current?.gender || "-" }}
              </div>
            </div>
            <div>
              <div class="text-sm text-gray-500">Date of Birth</div>
              <div class="font-medium">
                {{ formatDate(current?.date_of_birth) }}
              </div>
            </div>
            <div>
              <div class="text-sm text-gray-500">Phone</div>
              <div class="font-medium">{{ current?.student_phone || "-" }}</div>
            </div>
            <div>
              <div class="text-sm text-gray-500">Email</div>
              <div class="font-medium">{{ current?.student_email || "-" }}</div>
            </div>
          </div>
        </UCard>

        <!-- Parents & Guardian -->
        <UCard class="">
          <template #header
            ><h2 class="text-lg font-semibold">Parents & Guardian</h2></template
          >
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div class="text-sm text-gray-500">Father's Name</div>
              <div class="font-medium">{{ current?.father_name || "-" }}</div>
              <div class="text-sm text-gray-500 mt-2">Phone</div>
              <div class="font-medium">{{ current?.father_phone || "-" }}</div>
              <div class="text-sm text-gray-500 mt-2">Occupation</div>
              <div class="font-medium">
                {{ current?.father_occupation || "-" }}
              </div>
            </div>
            <div>
              <div class="text-sm text-gray-500">Mother's Name</div>
              <div class="font-medium">{{ current?.mother_name || "-" }}</div>
              <div class="text-sm text-gray-500 mt-2">Phone</div>
              <div class="font-medium">{{ current?.mother_phone || "-" }}</div>
              <div class="text-sm text-gray-500 mt-2">Occupation</div>
              <div class="font-medium">
                {{ current?.mother_occupation || "-" }}
              </div>
            </div>
            <div>
              <div class="text-sm text-gray-500">Guardian</div>
              <div class="font-medium">
                {{ current?.guardian_name || "-"
                }}<span v-if="current?.guardian_type">
                  ({{ current?.guardian_type }})</span
                >
              </div>
              <div class="text-sm text-gray-500 mt-2">Phone</div>
              <div class="font-medium">
                {{ current?.guardian_phone || "-" }}
              </div>
              <div class="text-sm text-gray-500 mt-2">Relation</div>
              <div class="font-medium">
                {{ current?.guardian_relation || "-" }}
              </div>
            </div>
          </div>
        </UCard>

        <!-- Addresses -->
        <UCard class="">
          <template #header>
            <h2 class="text-lg font-semibold">Addresses</h2>
          </template>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Present Address -->
            <div class="space-y-2">
              <div class="text-sm text-gray-500">Present Address</div>
              <div class="font-medium">
                {{ current?.formatted_present_address || "-" }}
              </div>

              <div
                v-if="current?.present_address"
                class="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-500"
              >
                <div>
                  <div class="text-[11px] uppercase tracking-wide">
                    Division
                  </div>
                  <div class="font-medium text-gray-800">
                    {{ current?.present_division_name || "-" }}
                  </div>
                </div>
                <div>
                  <div class="text-[11px] uppercase tracking-wide">
                    District
                  </div>
                  <div class="font-medium text-gray-800">
                    {{ current?.present_district_name || "-" }}
                  </div>
                </div>
                <div>
                  <div class="text-[11px] uppercase tracking-wide">Area</div>
                  <div class="font-medium text-gray-800">
                    {{ current?.present_area_name || "-" }}
                  </div>
                </div>
                <div>
                  <div class="text-[11px] uppercase tracking-wide">
                    Village / Holding
                  </div>
                  <div class="font-medium text-gray-800">
                    {{ current?.present_address?.village_house_holding || "-" }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Permanent Address -->
            <div class="space-y-2">
              <div class="text-sm text-gray-500">Permanent Address</div>

              <div class="font-medium">
                <span v-if="current?.is_present_same_as_permanent">
                  Same as present address
                </span>
                <span v-else>
                  {{ current?.formatted_permanent_address || "-" }}
                </span>
              </div>

              <div
                v-if="
                  !current?.is_present_same_as_permanent &&
                  current?.permanent_address
                "
                class="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-500"
              >
                <div>
                  <div class="text-[11px] uppercase tracking-wide">
                    Division
                  </div>
                  <div class="font-medium text-gray-800">
                    {{ current?.permanent_division_name || "-" }}
                  </div>
                </div>
                <div>
                  <div class="text-[11px] uppercase tracking-wide">
                    District
                  </div>
                  <div class="font-medium text-gray-800">
                    {{ current?.permanent_district_name || "-" }}
                  </div>
                </div>
                <div>
                  <div class="text-[11px] uppercase tracking-wide">Area</div>
                  <div class="font-medium text-gray-800">
                    {{ current?.permanent_area_name || "-" }}
                  </div>
                </div>
                <div>
                  <div class="text-[11px] uppercase tracking-wide">
                    Village / Holding
                  </div>
                  <div class="font-medium text-gray-800">
                    {{
                      current?.permanent_address?.village_house_holding || "-"
                    }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Previous & Notes / Status -->
        <div class="grid md:grid-cols-2 gap-4">
          <UCard class="lg:col-span-2">
            <template #header
              ><h2 class="text-lg font-semibold">
                Previous / Additional
              </h2></template
            >
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div class="text-sm text-gray-500">Previous Institution</div>
                <div class="font-medium">
                  {{ current?.previous_institution_name || "-" }}
                </div>
              </div>
              <div>
                <div class="text-sm text-gray-500">Previous Class</div>
                <div class="font-medium">
                  {{ current?.previous_class || "-" }}
                </div>
              </div>
              <div>
                <div class="text-sm text-gray-500">Result</div>
                <div class="font-medium">
                  {{ current?.previous_result || "-" }}
                </div>
              </div>
              <div>
                <div class="text-sm text-gray-500">Division/Group</div>
                <div class="font-medium">
                  {{ current?.previous_result_division || "-" }}
                </div>
              </div>
            </div>
          </UCard>

          <UCard>
            <div>
              <div class="text-sm text-gray-500">Residential Type</div>
              <div class="font-medium capitalize">
                {{ current?.residential_type?.replace("_", " ") || "-" }}
              </div>
            </div>
          </UCard>

          <UCard>
            <div class="flex items-center justify-between">
              <div class="space-y-1">
                <h2 class="text-lg font-semibold">Update Status</h2>
                <p class="text-sm text-gray-500">
                  Change the application status.
                </p>
              </div>
              <UButton
                icon="i-lucide-edit"
                color="secondary"
                @click="statusOpen = true"
                >Update</UButton
              >
            </div>
          </UCard>
        </div>

        <!-- Admit student -->
        <UCard class="mb-10">
          <div class="flex items-center justify-between">
            <div class="space-y-1">
              <div class="text-sm text-gray-500">Admit Student</div>
              <div class="text-sm text-gray-500">
                Create student record & enrollment from this application.
              </div>
            </div>
            <UButton
              color="primary"
              icon="i-lucide-check"
              :disabled="current?.status === 'admitted'"
              @click="admitOpen = true"
              >Admit</UButton
            >
          </div>
        </UCard>

        <!-- Assign Fees (Only for admitted students) -->
        <UCard
          v-if="current?.status === 'admitted' && current?.admitted_student?.id"
          class="mb-10"
        >
          <div class="flex items-center justify-between">
            <div class="space-y-1">
              <div class="text-sm text-gray-500">Student Fees</div>
              <div class="text-sm text-gray-500">
                Assign fees to this student for the academic session.
              </div>
              <div
                v-if="assignedFees.length > 0"
                class="text-xs text-green-600 mt-1"
              >
                ✓ {{ assignedFees.length }} fee(s) already assigned
              </div>
            </div>
            <UButton
              color="secondary"
              icon="i-heroicons-currency-bangladeshi"
              @click="feeModalOpen = true"
              >{{
                assignedFees.length > 0 ? "Manage Fees" : "Assign Fees"
              }}</UButton
            >
          </div>
        </UCard>
      </div>

      <UModal
        :open="statusOpen"
        @update:open="statusOpen = $event"
        title="Update Status"
        description="Change the application status and add an optional note."
        :prevent-close="saving"
        :closeable="!saving"
        :ui="{ footer: 'justify-end' }"
      >
        <template #body>
          <div class="space-y-4">
            <UFormField label="Status">
              <USelect
                v-model="statusForm.status"
                :items="[
                  { label: 'Pending', value: 'pending' },
                  { label: 'Accepted', value: 'accepted' },
                  { label: 'Rejected', value: 'rejected' },
                ]"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Note (Optional)">
              <UTextarea
                v-model="statusForm.status_note"
                placeholder="Reason for status change"
                class="w-full"
              />
            </UFormField>
          </div>
        </template>
        <template #footer>
          <UButton
            variant="outline"
            color="secondary"
            :disabled="saving"
            @click="statusOpen = false"
            >Cancel</UButton
          >
          <UButton
            color="primary"
            :loading="saving"
            :disabled="saving"
            @click="submitStatus"
            >Save Status</UButton
          >
        </template>
      </UModal>

      <UModal
        :open="admitOpen"
        @update:open="admitOpen = $event"
        title="Admit Student"
        description="Create a student record from this application."
        :prevent-close="saving"
        :closeable="!saving"
        :ui="{ footer: 'justify-end' }"
      >
        <template #body>
          <div class="space-y-4">
            <UAlert
              v-if="!current?.session_grade_id"
              title="Missing class"
              description="Class information not available on this application."
              color="warning"
              variant="soft"
            />
            <UFormField label="Select Section" required>
              <URadioGroup
                v-model="admitForm.section_id"
                :items="sectionOptions"
                :disabled="!current?.session_grade_id || saving"
              />
            </UFormField>
            <UFormField label="Admission Date">
              <UInput
                v-model="admitForm.admission_date"
                type="date"
                class="w-full"
                :disabled="saving"
              />
            </UFormField>
          </div>
        </template>
        <template #footer>
          <UButton
            variant="outline"
            color="secondary"
            :disabled="saving"
            @click="admitOpen = false"
            >Cancel</UButton
          >
          <UButton
            color="primary"
            :loading="saving"
            :disabled="
              saving || !current?.session_grade_id || !admitForm.section_id
            "
            @click="submitAdmit"
            >Admit</UButton
          >
        </template>
      </UModal>

      <!-- Fee Assignment Modal -->
      <AdmissionFeeAssignmentModal
        v-if="current?.admitted_student?.id && current?.academic_session_id"
        :open="feeModalOpen"
        :student-id="current.admitted_student.id"
        :student-name="current.applicant_name || 'Student'"
        :academic-session-id="current.academic_session_id"
        @close="feeModalOpen = false"
        @saved="onFeesSaved"
      />
    </template>
  </UContainer>
</template>
