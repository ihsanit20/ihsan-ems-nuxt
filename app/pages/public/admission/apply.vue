<script setup lang="ts">
import type { FormSubmitEvent } from "#ui/types";

definePageMeta({
  layout: "default",
});

useHead({
  title: "Apply for Admission",
});

const store = useAdmissionApplicationStore();
const { meta, metaLoading, saving } = storeToRefs(store);
const toast = useToast();
const router = useRouter();

// Form state
const state = reactive({
  // Basic info
  academic_session_id: null as number | null,
  session_grade_id: null as number | null,
  applicant_name: "",
  gender: "",
  date_of_birth: "",

  // Father info
  father_name: "",
  father_phone: "",
  father_occupation: "",

  // Mother info
  mother_name: "",
  mother_phone: "",
  mother_occupation: "",

  // Guardian info
  guardian_type: "father" as "father" | "mother" | "other",
  guardian_name: "",
  guardian_phone: "",
  guardian_relation: "",

  // Present address
  present_house: "",
  present_village: "",
  present_post_office: "",
  present_upazila: "",
  present_district: "",

  // Permanent address
  permanent_house: "",
  permanent_village: "",
  permanent_post_office: "",
  permanent_upazila: "",
  permanent_district: "",
  is_present_same_as_permanent: false,

  // Previous institution
  previous_institution_name: "",
  previous_class: "",
  previous_result: "",

  // Other
  residential_type: "" as "" | "residential" | "new_musafir" | "non_residential",
  student_phone: "",
  student_email: "",
});

// Load meta on mount
onMounted(async () => {
  try {
    await store.fetchMeta();
  } catch (error) {
    toast.add({
      title: "Error",
      description: "Failed to load form data. Please refresh the page.",
      color: "error",
    });
  }
});

// Computed options for dropdowns
const sessionOptions = computed(() => {
  return (
    meta.value?.sessions
      ?.filter((s) => s.is_active)
      .map((s) => ({ label: s.name, value: s.id })) || []
  );
});

const sessionGradeOptions = computed(() => {
  if (!state.academic_session_id) return [];
  return (
    meta.value?.session_grades
      ?.filter((sg) => sg.academic_session_id === state.academic_session_id)
      .map((sg) => ({
        label: sg.grade?.name || `Grade ${sg.grade_id}`,
        value: sg.id,
      })) || []
  );
});

const genderOptions = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
];

const guardianTypeOptions = computed(() => {
  return (
    meta.value?.guardian_types?.map((type) => ({
      label: type.charAt(0).toUpperCase() + type.slice(1),
      value: type,
    })) || []
  );
});

const residentialTypeOptions = computed(() => {
  return (
    meta.value?.residential_types?.map((type) => ({
      label: type
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
      value: type,
    })) || []
  );
});

// Auto-fill guardian info based on guardian_type
watch(
  () => state.guardian_type,
  (newType) => {
    if (newType === "father") {
      state.guardian_name = state.father_name;
      state.guardian_phone = state.father_phone;
      state.guardian_relation = "Father";
    } else if (newType === "mother") {
      state.guardian_name = state.mother_name;
      state.guardian_phone = state.mother_phone;
      state.guardian_relation = "Mother";
    } else {
      // Keep custom values for "other"
    }
  }
);

// Auto-sync guardian fields when father/mother fields change
watch(
  () => [state.father_name, state.father_phone],
  () => {
    if (state.guardian_type === "father") {
      state.guardian_name = state.father_name;
      state.guardian_phone = state.father_phone;
    }
  }
);

watch(
  () => [state.mother_name, state.mother_phone],
  () => {
    if (state.guardian_type === "mother") {
      state.guardian_name = state.mother_name;
      state.guardian_phone = state.mother_phone;
    }
  }
);

// Copy present to permanent address
watch(
  () => state.is_present_same_as_permanent,
  (isSame) => {
    if (isSame) {
      state.permanent_house = state.present_house;
      state.permanent_village = state.present_village;
      state.permanent_post_office = state.present_post_office;
      state.permanent_upazila = state.present_upazila;
      state.permanent_district = state.present_district;
    }
  }
);

// Form submission
async function onSubmit(event: FormSubmitEvent<any>) {
  // Basic validation
  if (!state.academic_session_id) {
    toast.add({
      title: "Validation Error",
      description: "Please select an academic session.",
      color: "error",
    });
    return;
  }

  if (!state.session_grade_id) {
    toast.add({
      title: "Validation Error",
      description: "Please select a class/grade.",
      color: "error",
    });
    return;
  }

  if (!state.applicant_name.trim()) {
    toast.add({
      title: "Validation Error",
      description: "Please enter the applicant's name.",
      color: "error",
    });
    return;
  }

  try {
    const payload = {
      academic_session_id: state.academic_session_id,
      session_grade_id: state.session_grade_id,
      applicant_name: state.applicant_name.trim(),
      gender: state.gender || null,
      date_of_birth: state.date_of_birth || null,
      student_phone: state.student_phone || null,
      student_email: state.student_email || null,

      father_name: state.father_name.trim() || null,
      father_phone: state.father_phone.trim() || null,
      father_occupation: state.father_occupation.trim() || null,

      mother_name: state.mother_name.trim() || null,
      mother_phone: state.mother_phone.trim() || null,
      mother_occupation: state.mother_occupation.trim() || null,

      guardian_type: state.guardian_type,
      guardian_name: state.guardian_name.trim() || null,
      guardian_phone: state.guardian_phone.trim() || null,
      guardian_relation: state.guardian_relation.trim() || null,

      present_address: {
        house: state.present_house.trim() || undefined,
        village: state.present_village.trim() || undefined,
        post_office: state.present_post_office.trim() || undefined,
        upazila: state.present_upazila.trim() || undefined,
        district: state.present_district.trim() || undefined,
      },

      permanent_address: {
        house: state.permanent_house.trim() || undefined,
        village: state.permanent_village.trim() || undefined,
        post_office: state.permanent_post_office.trim() || undefined,
        upazila: state.permanent_upazila.trim() || undefined,
        district: state.permanent_district.trim() || undefined,
      },

      is_present_same_as_permanent: state.is_present_same_as_permanent,

      previous_institution_name: state.previous_institution_name.trim() || null,
      previous_class: state.previous_class.trim() || null,
      previous_result: state.previous_result.trim() || null,

      residential_type: state.residential_type || null,

      applied_via: "online" as const,
      application_date: new Date().toISOString().split("T")[0],
    };

    const result = await store.createPublic(payload);

    toast.add({
      title: "Success",
      description: "Your application has been submitted successfully!",
      color: "success",
    });

    // Redirect to success page with application number
    router.push({
      path: "/public/admission/success",
      query: { application_no: result.application_no },
    });
  } catch (error: any) {
    toast.add({
      title: "Submission Failed",
      description:
        error?.data?.message ||
        "Failed to submit application. Please try again.",
      color: "error",
    });
  }
}
</script>

<template>
  <UContainer>
    <div class="mx-auto max-w-3xl">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold mb-2">Admission Application Form</h1>
        <p class="text-sm text-gray-600">
          Please fill in all required fields marked with
          <span class="text-red-500">*</span>
        </p>
      </div>

      <!-- Loading State -->
      <UCard v-if="metaLoading" class="mb-6">
        <div class="text-center py-8">
          <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin mx-auto" />
          <p class="text-gray-500 mt-2">Loading form...</p>
        </div>
      </UCard>

      <!-- Form -->
      <UForm v-else :state="state" @submit="onSubmit" class="space-y-6">
        <!-- Basic Information -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Basic Information</h2>
          </template>

          <div class="space-y-4">
            <UFormGroup label="Academic Session" required name="academic_session_id">
              <USelect
                v-model="state.academic_session_id"
                :options="sessionOptions"
                placeholder="Select session"
                :disabled="saving"
              />
            </UFormGroup>

            <UFormGroup label="Class / Grade" required name="session_grade_id">
              <USelect
                v-model="state.session_grade_id"
                :options="sessionGradeOptions"
                placeholder="Select class"
                :disabled="!state.academic_session_id || saving"
              />
            </UFormGroup>

            <UFormGroup label="Applicant Name" required name="applicant_name">
              <UInput
                v-model="state.applicant_name"
                placeholder="Enter full name"
                :disabled="saving"
              />
            </UFormGroup>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormGroup label="Gender" name="gender">
                <USelect
                  v-model="state.gender"
                  :options="genderOptions"
                  placeholder="Select gender"
                  :disabled="saving"
                />
              </UFormGroup>

              <UFormGroup label="Date of Birth" name="date_of_birth">
                <UInput
                  v-model="state.date_of_birth"
                  type="date"
                  :disabled="saving"
                />
              </UFormGroup>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormGroup label="Student Phone" name="student_phone">
                <UInput
                  v-model="state.student_phone"
                  placeholder="01XXXXXXXXX"
                  :disabled="saving"
                />
              </UFormGroup>

              <UFormGroup label="Student Email" name="student_email">
                <UInput
                  v-model="state.student_email"
                  type="email"
                  placeholder="student@example.com"
                  :disabled="saving"
                />
              </UFormGroup>
            </div>
          </div>
        </UCard>

        <!-- Father Information -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Father's Information</h2>
          </template>

          <div class="space-y-4">
            <UFormGroup label="Father's Name" name="father_name">
              <UInput
                v-model="state.father_name"
                placeholder="Enter father's name"
                :disabled="saving"
              />
            </UFormGroup>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormGroup label="Father's Phone" name="father_phone">
                <UInput
                  v-model="state.father_phone"
                  placeholder="01XXXXXXXXX"
                  :disabled="saving"
                />
              </UFormGroup>

              <UFormGroup label="Father's Occupation" name="father_occupation">
                <UInput
                  v-model="state.father_occupation"
                  placeholder="Enter occupation"
                  :disabled="saving"
                />
              </UFormGroup>
            </div>
          </div>
        </UCard>

        <!-- Mother Information -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Mother's Information</h2>
          </template>

          <div class="space-y-4">
            <UFormGroup label="Mother's Name" name="mother_name">
              <UInput
                v-model="state.mother_name"
                placeholder="Enter mother's name"
                :disabled="saving"
              />
            </UFormGroup>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormGroup label="Mother's Phone" name="mother_phone">
                <UInput
                  v-model="state.mother_phone"
                  placeholder="01XXXXXXXXX"
                  :disabled="saving"
                />
              </UFormGroup>

              <UFormGroup label="Mother's Occupation" name="mother_occupation">
                <UInput
                  v-model="state.mother_occupation"
                  placeholder="Enter occupation"
                  :disabled="saving"
                />
              </UFormGroup>
            </div>
          </div>
        </UCard>

        <!-- Guardian Information -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Guardian Information</h2>
          </template>

          <div class="space-y-4">
            <UFormGroup label="Guardian Type" required name="guardian_type">
              <USelect
                v-model="state.guardian_type"
                :options="guardianTypeOptions"
                :disabled="saving"
              />
            </UFormGroup>

            <UFormGroup label="Guardian Name" name="guardian_name">
              <UInput
                v-model="state.guardian_name"
                placeholder="Auto-filled based on guardian type"
                :disabled="
                  saving ||
                  state.guardian_type === 'father' ||
                  state.guardian_type === 'mother'
                "
              />
            </UFormGroup>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormGroup label="Guardian Phone" name="guardian_phone">
                <UInput
                  v-model="state.guardian_phone"
                  placeholder="Auto-filled based on guardian type"
                  :disabled="
                    saving ||
                    state.guardian_type === 'father' ||
                    state.guardian_type === 'mother'
                  "
                />
              </UFormGroup>

              <UFormGroup label="Relation" name="guardian_relation">
                <UInput
                  v-model="state.guardian_relation"
                  placeholder="Relation with student"
                  :disabled="
                    saving ||
                    state.guardian_type === 'father' ||
                    state.guardian_type === 'mother'
                  "
                />
              </UFormGroup>
            </div>
          </div>
        </UCard>

        <!-- Present Address -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Present Address</h2>
          </template>

          <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormGroup label="House/Flat" name="present_house">
                <UInput
                  v-model="state.present_house"
                  placeholder="House/Flat no."
                  :disabled="saving"
                />
              </UFormGroup>

              <UFormGroup label="Village/Area" name="present_village">
                <UInput
                  v-model="state.present_village"
                  placeholder="Village/Area"
                  :disabled="saving"
                />
              </UFormGroup>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <UFormGroup label="Post Office" name="present_post_office">
                <UInput
                  v-model="state.present_post_office"
                  placeholder="Post Office"
                  :disabled="saving"
                />
              </UFormGroup>

              <UFormGroup label="Upazila" name="present_upazila">
                <UInput
                  v-model="state.present_upazila"
                  placeholder="Upazila"
                  :disabled="saving"
                />
              </UFormGroup>

              <UFormGroup label="District" name="present_district">
                <UInput
                  v-model="state.present_district"
                  placeholder="District"
                  :disabled="saving"
                />
              </UFormGroup>
            </div>
          </div>
        </UCard>

        <!-- Permanent Address -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold">Permanent Address</h2>
              <UCheckbox
                v-model="state.is_present_same_as_permanent"
                label="Same as present address"
                :disabled="saving"
              />
            </div>
          </template>

          <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormGroup label="House/Flat" name="permanent_house">
                <UInput
                  v-model="state.permanent_house"
                  placeholder="House/Flat no."
                  :disabled="saving || state.is_present_same_as_permanent"
                />
              </UFormGroup>

              <UFormGroup label="Village/Area" name="permanent_village">
                <UInput
                  v-model="state.permanent_village"
                  placeholder="Village/Area"
                  :disabled="saving || state.is_present_same_as_permanent"
                />
              </UFormGroup>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <UFormGroup label="Post Office" name="permanent_post_office">
                <UInput
                  v-model="state.permanent_post_office"
                  placeholder="Post Office"
                  :disabled="saving || state.is_present_same_as_permanent"
                />
              </UFormGroup>

              <UFormGroup label="Upazila" name="permanent_upazila">
                <UInput
                  v-model="state.permanent_upazila"
                  placeholder="Upazila"
                  :disabled="saving || state.is_present_same_as_permanent"
                />
              </UFormGroup>

              <UFormGroup label="District" name="permanent_district">
                <UInput
                  v-model="state.permanent_district"
                  placeholder="District"
                  :disabled="saving || state.is_present_same_as_permanent"
                />
              </UFormGroup>
            </div>
          </div>
        </UCard>

        <!-- Previous Institution -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Previous Institution (if any)</h2>
          </template>

          <div class="space-y-4">
            <UFormGroup label="Institution Name" name="previous_institution_name">
              <UInput
                v-model="state.previous_institution_name"
                placeholder="Previous school/institution name"
                :disabled="saving"
              />
            </UFormGroup>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormGroup label="Previous Class" name="previous_class">
                <UInput
                  v-model="state.previous_class"
                  placeholder="e.g., Class 5"
                  :disabled="saving"
                />
              </UFormGroup>

              <UFormGroup label="Result/Grade" name="previous_result">
                <UInput
                  v-model="state.previous_result"
                  placeholder="e.g., A+, 85%"
                  :disabled="saving"
                />
              </UFormGroup>
            </div>
          </div>
        </UCard>

        <!-- Other Information -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Other Information</h2>
          </template>

          <div class="space-y-4">
            <UFormGroup label="Residential Type" name="residential_type">
              <USelect
                v-model="state.residential_type"
                :options="residentialTypeOptions"
                placeholder="Select residential type"
                :disabled="saving"
              />
            </UFormGroup>
          </div>
        </UCard>

        <!-- Submit Buttons -->
        <div class="flex gap-4 justify-end">
          <UButton
            type="button"
            color="secondary"
            variant="outline"
            :disabled="saving"
            @click="router.back()"
          >
            Cancel
          </UButton>

          <UButton
            type="submit"
            color="primary"
            :loading="saving"
            :disabled="saving"
          >
            Submit Application
          </UButton>
        </div>
      </UForm>
    </div>
  </UContainer>
</template>
