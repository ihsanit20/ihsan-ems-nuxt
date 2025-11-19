<script setup lang="ts">
definePageMeta({
  layout: "admin",
  middleware: "auth",
  requiresAuth: true,
  roles: ["Owner", "Admin", "Developer"],
});

import { useHead, useToast } from "#imports";
import type { Student, Gender, ResidentialType, GuardianType } from "~/types";

type SelectItem = { label: string; value: number | string | null };

const route = useRoute();
const studentId = computed(() => Number(route.params.id));

useHead({ title: "Edit Student" });

const toast = useToast();
const router = useRouter();
const studentStore = useStudentStore();
const sessionStore = useSessionStore();
const gradeStore = useSessionGradeStore();
const sectionStore = useSectionStore();
const addressStore = useAddressStore();

const student = ref<Student | null>(null);
const loading = ref(true);
const saving = ref(false);

/* ---------------- Form State ---------------- */
const form = reactive({
  // Basic Information (student_code is not editable)
  name_bn: "",
  name_en: "",
  date_of_birth: "",
  birth_certificate_no: "",
  gender: "" as Gender | "",
  blood_group: "",
  religion: "",
  nationality: "",
  residential_type: "" as ResidentialType | "",

  // Academic Information
  academic_session_id: null as number | null,
  session_grade_id: null as number | null,
  section_id: null as number | null,
  roll_number: "",
  admission_date: "",

  // Father Information
  father_name: "",
  father_phone: "",
  father_occupation: "",

  // Mother Information
  mother_name: "",
  mother_phone: "",
  mother_occupation: "",

  // Guardian Information
  guardian_type: null as GuardianType | null,
  guardian_name: "",
  guardian_phone: "",
  guardian_relation: "",

  // Present Address
  present_division_id: null as number | null,
  present_district_id: null as number | null,
  present_area_id: null as number | null,
  present_address_details: "",

  // Permanent Address
  permanent_division_id: null as number | null,
  permanent_district_id: null as number | null,
  permanent_area_id: null as number | null,
  permanent_address_details: "",
  same_as_present: false,

  // Previous School Information
  previous_institution: "",
  previous_class: "",
  previous_result: "",

  // Photo
  photo: null as File | null,
});

const errors = reactive<Record<string, string>>({});

/* ---------------- Options (same as create page) ---------------- */
const genderItems: SelectItem[] = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
];

const residentialItems: SelectItem[] = [
  { label: "Residential", value: "residential" },
  { label: "New Musafir", value: "new_musafir" },
  { label: "Non Residential", value: "non_residential" },
];

const guardianTypeItems: SelectItem[] = [
  { label: "Father", value: "father" },
  { label: "Mother", value: "mother" },
  { label: "Other", value: "other" },
];

const sessionItems = computed<SelectItem[]>(() => [
  { label: "Select Session", value: null },
  ...(sessionStore.items || []).map((s) => ({
    label: s.name,
    value: s.id,
  })),
]);

const gradeItems = computed<SelectItem[]>(() => {
  if (!form.academic_session_id) return [];
  return [
    { label: "Select Grade", value: null },
    ...(gradeStore.items || []).map((g) => ({
      label: g.grade?.name || `Grade #${g.grade_id}`,
      value: g.id,
    })),
  ];
});

const sectionItems = computed<SelectItem[]>(() => {
  if (!form.session_grade_id) return [];
  const sections = sectionStore.itemsForSession(form.session_grade_id);
  return [
    { label: "Select Section", value: null },
    ...sections.map((s) => ({
      label: s.name,
      value: s.id,
    })),
  ];
});

const divisionItems = computed<SelectItem[]>(() => [
  { label: "Select Division", value: null },
  ...(addressStore.divisions || []).map((d) => ({
    label: d.name,
    value: d.id,
  })),
]);

const presentDistrictItems = computed<SelectItem[]>(() => {
  if (!form.present_division_id) return [];
  return [
    { label: "Select District", value: null },
    ...(
      addressStore.getDistrictsByDivision(form.present_division_id) || []
    ).map((d) => ({
      label: d.name,
      value: d.id,
    })),
  ];
});

const presentAreaItems = computed<SelectItem[]>(() => {
  if (!form.present_district_id) return [];
  return [
    { label: "Select Area", value: null },
    ...(addressStore.getAreasByDistrict(form.present_district_id) || []).map(
      (u: { id: number; name: string }) => ({
        label: u.name,
        value: u.id,
      })
    ),
  ];
});

const permanentDistrictItems = computed<SelectItem[]>(() => {
  if (!form.permanent_division_id) return [];
  return [
    { label: "Select District", value: null },
    ...(
      addressStore.getDistrictsByDivision(form.permanent_division_id) || []
    ).map((d) => ({
      label: d.name,
      value: d.id,
    })),
  ];
});

const permanentAreaItems = computed<SelectItem[]>(() => {
  if (!form.permanent_district_id) return [];
  return [
    { label: "Select Area", value: null },
    ...(addressStore.getAreasByDistrict(form.permanent_district_id) || []).map(
      (u: { id: number; name: string }) => ({
        label: u.name,
        value: u.id,
      })
    ),
  ];
});

/* ---------------- Load Student Data ---------------- */
async function loadStudent() {
  loading.value = true;
  try {
    const data = await studentStore.fetchOne(studentId.value);
    student.value = data;

    // Map basic fields
    form.name_bn = data.name_bn || "";
    form.name_en = data.name_en || "";
    form.date_of_birth = data.date_of_birth?.split("T")[0] || "";
    form.birth_certificate_no = (data as any).birth_certificate_no || "";
    form.gender = (data.gender as Gender) || "";
    form.blood_group = (data as any).blood_group || "";
    form.religion = (data as any).religion || "";
    form.nationality = (data as any).nationality || "";
    form.residential_type = (data.residential_type as ResidentialType) || "";

    // Map parent/guardian fields
    form.father_name = data.father_name || "";
    form.father_phone = data.father_phone || "";
    form.father_occupation = data.father_occupation || "";
    form.mother_name = data.mother_name || "";
    form.mother_phone = data.mother_phone || "";
    form.mother_occupation = data.mother_occupation || "";
    form.guardian_type = (data.guardian_type as GuardianType) || null;
    form.guardian_name = data.guardian_name || "";
    form.guardian_phone = data.guardian_phone || "";
    form.guardian_relation = data.guardian_relation || "";

    // Map enrollment data (from first active enrollment)
    const enrollment = data.enrollments?.[0];
    if (enrollment) {
      form.academic_session_id = enrollment.academic_session_id || null;
      form.session_grade_id = enrollment.session_grade_id || null;
      form.section_id = enrollment.section_id ?? null;
      form.roll_number = enrollment.roll_no || "";
      form.admission_date = enrollment.enrollment_date?.split("T")[0] || "";
    }
    // Load session grades for the selected session
    if (form.academic_session_id) {
      await gradeStore.fetchList();
    }
    // Map present address
    if (data.present_address) {
      form.present_division_id = data.present_address.division_id || null;
      form.present_district_id = data.present_address.district_id || null;
      form.present_area_id = data.present_address.area_id || null;
      form.present_address_details =
        data.present_address.village_house_holding || "";
    }

    // Map permanent address
    if (data.permanent_address) {
      form.permanent_division_id = data.permanent_address.division_id || null;
      form.permanent_district_id = data.permanent_address.district_id || null;
      form.permanent_area_id = data.permanent_address.area_id || null;
      form.permanent_address_details =
        data.permanent_address.village_house_holding || "";
    }

    // Map previous school info
    form.previous_institution = (data as any).previous_institution || "";
    form.previous_class = (data as any).previous_class || "";
    form.previous_result = (data as any).previous_result || "";

    // Load related data if needed
    if (form.academic_session_id) {
      gradeStore.setSession(form.academic_session_id);
      await gradeStore.fetchList();
    }
    if (form.session_grade_id) {
      await sectionStore.fetchListBySession(form.session_grade_id);
    }
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

/* ---------------- Watchers (same as create page) ---------------- */
watch(
  () => form.academic_session_id,
  (newVal, oldVal) => {
    if (newVal && newVal !== oldVal) {
      gradeStore.setSession(newVal);
      gradeStore.fetchList().catch(() => {});
      form.session_grade_id = null;
      form.section_id = null;
    }
  }
);

watch(
  () => form.session_grade_id,
  (newVal, oldVal) => {
    if (newVal && newVal !== oldVal) {
      sectionStore.fetchListBySession(newVal).catch(() => {});
      form.section_id = null;
    }
  }
);

watch(
  () => form.present_division_id,
  () => {
    form.present_district_id = null;
    form.present_area_id = null;
  }
);

watch(
  () => form.present_district_id,
  () => {
    form.present_area_id = null;
  }
);

watch(
  () => form.permanent_division_id,
  () => {
    form.permanent_district_id = null;
    form.permanent_area_id = null;
  }
);

watch(
  () => form.permanent_district_id,
  () => {
    form.permanent_area_id = null;
  }
);

watch(
  () => form.same_as_present,
  (val) => {
    if (val) {
      form.permanent_division_id = form.present_division_id;
      form.permanent_district_id = form.present_district_id;
      form.permanent_area_id = form.present_area_id;
      form.permanent_address_details = form.present_address_details;
    }
  }
);

/* ---------------- Lifecycle ---------------- */
onMounted(async () => {
  await Promise.all([
    loadStudent(),
    sessionStore.fetchList(),
    addressStore.fetchDivisions(),
  ]);
});

/* ---------------- Photo Upload ---------------- */
const photoPreview = ref<string | null>(null);

function handlePhotoChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    form.photo = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      photoPreview.value = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
}

/* ---------------- Validation ---------------- */
function validate(): boolean {
  Object.keys(errors).forEach((k) => delete errors[k]);

  if (!form.name_bn?.trim()) errors.name_bn = "Bengali name is required";
  if (!form.date_of_birth) errors.date_of_birth = "Date of birth is required";
  if (!form.gender) errors.gender = "Gender is required";
  if (!form.residential_type)
    errors.residential_type = "Residential type is required";
  if (!form.academic_session_id)
    errors.academic_session_id = "Session is required";
  if (!form.session_grade_id) errors.session_grade_id = "Grade is required";
  if (!form.section_id) errors.section_id = "Section is required";
  if (!form.father_name?.trim())
    errors.father_name = "Father's name is required";
  if (!form.father_phone?.trim())
    errors.father_phone = "Father's phone is required";
  if (!form.mother_name?.trim())
    errors.mother_name = "Mother's name is required";

  return Object.keys(errors).length === 0;
}

/* ---------------- Submit ---------------- */
async function handleSubmit() {
  if (!validate()) {
    toast.add({
      title: "Validation Error",
      description: "Please fill in all required fields",
      color: "error",
    });
    return;
  }

  saving.value = true;
  try {
    const formData = new FormData();

    // Append all form fields
    Object.entries(form).forEach(([key, value]) => {
      if (
        value !== null &&
        value !== "" &&
        key !== "photo" &&
        key !== "same_as_present"
      ) {
        formData.append(key, String(value));
      }
    });

    // Append photo if selected
    if (form.photo) {
      formData.append("photo", form.photo);
    }

    await studentStore.update(studentId.value, formData as any);

    toast.add({
      title: "Student Updated",
      description: "Student information has been successfully updated",
      color: "success",
    });

    router.push(`/admin/students/${studentId.value}`);
  } catch (e: any) {
    toast.add({
      title: "Failed to update student",
      description: e?.data?.message || e.message,
      color: "error",
    });
  } finally {
    saving.value = false;
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
            Edit Student: {{ student.name_bn }}
          </h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Student Code: {{ student.student_code }}
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

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Basic Information -->
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">Basic Information</h3>
          </template>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <!-- Photo Upload -->
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium mb-2">Photo</label>
              <div class="flex items-center gap-4">
                <UAvatar
                  :src="photoPreview || student.photo_url || undefined"
                  alt="Student Photo"
                  size="xl"
                />
                <UInput
                  type="file"
                  accept="image/*"
                  @change="handlePhotoChange"
                />
              </div>
            </div>

            <UInput
              :model-value="student.student_code"
              label="Student Code"
              disabled
              class="bg-gray-50"
            />

            <UInput
              v-model="form.name_bn"
              label="Name (Bengali) *"
              placeholder="নাম (বাংলায়)"
              :error="errors.name_bn"
            />

            <UInput
              v-model="form.name_en"
              label="Name (English)"
              placeholder="Name in English"
            />

            <UInput
              v-model="form.date_of_birth"
              type="date"
              label="Date of Birth *"
              :error="errors.date_of_birth"
            />

            <UInput
              v-model="form.birth_certificate_no"
              label="Birth Certificate No"
              placeholder="Enter birth certificate number"
            />

            <USelect
              v-model="form.gender"
              :items="genderItems"
              label="Gender *"
              :error="errors.gender"
            />

            <UInput
              v-model="form.blood_group"
              label="Blood Group"
              placeholder="e.g., A+"
            />

            <UInput
              v-model="form.religion"
              label="Religion"
              placeholder="Enter religion"
            />

            <UInput
              v-model="form.nationality"
              label="Nationality"
              placeholder="Enter nationality"
            />

            <USelect
              v-model="form.residential_type"
              :items="residentialItems"
              label="Residential Type *"
              :error="errors.residential_type"
            />
          </div>
        </UCard>

        <!-- Academic Information -->
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">Academic Information</h3>
          </template>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <USelect
              v-model="form.academic_session_id"
              :items="sessionItems"
              label="Academic Session *"
              :error="errors.academic_session_id"
            />

            <USelect
              v-model="form.session_grade_id"
              :items="gradeItems"
              label="Grade *"
              :disabled="!form.academic_session_id"
              :error="errors.session_grade_id"
            />

            <USelect
              v-model="form.section_id"
              :items="sectionItems"
              label="Section *"
              :disabled="!form.session_grade_id"
              :error="errors.section_id"
            />

            <UInput
              v-model="form.roll_number"
              label="Roll Number"
              placeholder="Enter roll number"
            />

            <UInput
              v-model="form.admission_date"
              type="date"
              label="Admission Date"
            />
          </div>
        </UCard>

        <!-- Father Information -->
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">Father Information</h3>
          </template>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <UInput
              v-model="form.father_name"
              label="Father's Name *"
              placeholder="পিতার নাম"
              :error="errors.father_name"
            />

            <UInput
              v-model="form.father_phone"
              label="Father's Phone *"
              placeholder="01XXXXXXXXX"
              :error="errors.father_phone"
            />

            <UInput
              v-model="form.father_occupation"
              label="Father's Occupation"
              placeholder="Enter occupation"
            />
          </div>
        </UCard>

        <!-- Mother Information -->
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">Mother Information</h3>
          </template>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <UInput
              v-model="form.mother_name"
              label="Mother's Name *"
              placeholder="মাতার নাম"
              :error="errors.mother_name"
            />

            <UInput
              v-model="form.mother_phone"
              label="Mother's Phone"
              placeholder="01XXXXXXXXX"
            />

            <UInput
              v-model="form.mother_occupation"
              label="Mother's Occupation"
              placeholder="Enter occupation"
            />
          </div>
        </UCard>

        <!-- Guardian Information -->
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">
              Guardian Information (Optional)
            </h3>
          </template>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <USelect
              v-model="form.guardian_type"
              :items="guardianTypeItems"
              label="Guardian Type"
            />

            <UInput
              v-model="form.guardian_name"
              label="Guardian Name"
              placeholder="অভিভাবকের নাম"
            />

            <UInput
              v-model="form.guardian_phone"
              label="Guardian Phone"
              placeholder="01XXXXXXXXX"
            />

            <UInput
              v-model="form.guardian_relation"
              label="Relation with Student"
              placeholder="e.g., Uncle, Brother"
            />
          </div>
        </UCard>

        <!-- Present Address -->
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">Present Address</h3>
          </template>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <USelect
              v-model="form.present_division_id"
              :items="divisionItems"
              label="Division"
            />

            <USelect
              v-model="form.present_district_id"
              :items="presentDistrictItems"
              label="District"
              :disabled="!form.present_division_id"
            />

            <USelect
              v-model="form.present_area_id"
              :items="presentAreaItems"
              label="Area"
              :disabled="!form.present_district_id"
            />

            <UTextarea
              v-model="form.present_address_details"
              label="Address Details"
              placeholder="Enter full address"
              class="sm:col-span-3"
            />
          </div>
        </UCard>

        <!-- Permanent Address -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold">Permanent Address</h3>
              <UCheckbox
                v-model="form.same_as_present"
                label="Same as present address"
              />
            </div>
          </template>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <USelect
              v-model="form.permanent_division_id"
              :items="divisionItems"
              label="Division"
              :disabled="form.same_as_present"
            />

            <USelect
              v-model="form.permanent_district_id"
              :items="permanentDistrictItems"
              label="District"
              :disabled="form.same_as_present || !form.permanent_division_id"
            />

            <USelect
              v-model="form.permanent_area_id"
              :items="permanentAreaItems"
              label="Area"
              :disabled="form.same_as_present || !form.permanent_district_id"
            />

            <UTextarea
              v-model="form.permanent_address_details"
              label="Address Details"
              placeholder="Enter full address"
              class="sm:col-span-3"
              :disabled="form.same_as_present"
            />
          </div>
        </UCard>

        <!-- Previous School Information -->
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">
              Previous School Information (Optional)
            </h3>
          </template>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <UInput
              v-model="form.previous_institution"
              label="Previous Institution"
              placeholder="Enter school name"
            />

            <UInput
              v-model="form.previous_class"
              label="Previous Class"
              placeholder="Enter class"
            />

            <UInput
              v-model="form.previous_result"
              label="Previous Result"
              placeholder="Enter result/GPA"
            />
          </div>
        </UCard>

        <!-- Actions -->
        <div class="flex justify-end gap-3">
          <UButton
            type="button"
            variant="outline"
            color="neutral"
            @click="router.push(`/admin/students/${studentId}`)"
          >
            Cancel
          </UButton>
          <UButton type="submit" :loading="saving">Update Student</UButton>
        </div>
      </form>
    </template>
  </div>
</template>
