<script setup lang="ts">
import { storeToRefs } from "pinia";

const props = defineProps<{
  mode?: "public" | "admin"; // public = online, admin = offline
  saving?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  showCancel?: boolean;
}>();

const emit = defineEmits<{
  (e: "submit", payload: any): void;
  (e: "cancel"): void;
}>();

const mode = computed(() => props.mode ?? "public");
const showCancel = computed(() => props.showCancel ?? true);
const submitLabel = computed(
  () =>
    props.submitLabel ??
    (mode.value === "public" ? "Submit Application" : "Create")
);
const cancelLabel = computed(() => props.cancelLabel ?? "Cancel");

// Stores
const apps = useAdmissionApplicationStore();
const { meta, metaLoading } = storeToRefs(apps);

const sessions = useSessionStore();
const { items: sessionItems, loading: loadingSessions } = storeToRefs(sessions);

const addressStore = useAddressStore();
const { divisions, loadingDivisions, loadingDistricts, loadingAreas } =
  storeToRefs(addressStore);

const divisionItems = computed(
  () => divisions.value?.map((d: any) => ({ label: d.name, value: d.id })) || []
);

// Address lists (cascading)
const presentDistricts = ref<any[]>([]);
const presentAreas = ref<any[]>([]);
const permanentDistricts = ref<any[]>([]);
const permanentAreas = ref<any[]>([]);

// Form state (covers both modes)
const state = reactive({
  // Session/Class
  academic_session_id: undefined as number | undefined, // used in public mode
  session_grade_id: undefined as number | undefined,

  // Application Type
  application_type: "new" as "new" | "re_admission",
  existing_student_id: undefined as number | undefined,

  // Applicant
  applicant_name: "",
  gender: "",
  date_of_birth: "",
  student_phone: "",
  student_email: "",

  // Parents
  father_name: "",
  father_phone: "",
  father_occupation: "",
  mother_name: "",
  mother_phone: "",
  mother_occupation: "",

  // Guardian
  guardian_type: "father" as "father" | "mother" | "other",
  guardian_name: "",
  guardian_phone: "",
  guardian_relation: "",

  // Addresses
  present_address: {
    division_id: undefined as number | undefined,
    district_id: undefined as number | undefined,
    area_id: undefined as number | undefined,
    village_house_holding: "",
  },
  permanent_address: {
    division_id: undefined as number | undefined,
    district_id: undefined as number | undefined,
    area_id: undefined as number | undefined,
    village_house_holding: "",
  },
  is_present_same_as_permanent: false,

  // Previous
  previous_institution_name: "",
  previous_class: "",
  previous_result: "",
  previous_result_division: "",

  // Other
  residential_type: "" as
    | ""
    | "residential"
    | "new_musafir"
    | "non_residential",
});

const toast = useToast();

onMounted(async () => {
  try {
    if (!meta.value) await apps.fetchMeta();
    if (!sessionItems.value?.length) await sessions.fetchList();
    await addressStore.fetchDivisions();
  } catch {
    // non-blocking; parent can handle page-level errors
  }
});

/* ------------ Select items ------------ */

const genderItems = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
];

const sessionItemsPublic = computed(() => {
  // public mode: show active sessions
  if (mode.value !== "public") return [];
  return (
    meta.value?.sessions
      ?.filter((s: any) => s.is_active)
      .map((s: any) => ({ label: s.name, value: s.id })) || []
  );
});

const sessionGradeItems = computed(() => {
  if (mode.value !== "public" || !state.academic_session_id) return [];
  return (
    meta.value?.session_grades
      ?.filter(
        (sg: any) => sg.academic_session_id === state.academic_session_id
      )
      .map((sg: any) => ({
        label: sg.grade?.name || `Grade ${sg.grade_id}`,
        value: sg.id,
      })) || []
  );
});

const adminSessionClassItems = computed(() => {
  if (mode.value !== "admin") return [];
  const grades = (meta.value?.session_grades || []) as any[];
  const opts: { label: string; value: number }[] = [];
  for (const sg of grades) {
    const sess = sessionItems.value?.find(
      (s: any) => s.id === sg.academic_session_id
    );
    const sessionName = sess?.name || `Session #${sg.academic_session_id}`;
    const gradeName = sg?.grade?.name || `Class #${sg?.grade_id}`;
    opts.push({ label: `${sessionName} — ${gradeName}`, value: sg.id });
  }
  return opts;
});

const guardianTypeItems = computed(() => {
  // only used in public mode
  if (!meta.value?.guardian_types) return [];
  return meta.value.guardian_types.map((type: string) => ({
    label: type.charAt(0).toUpperCase() + type.slice(1),
    value: type,
  }));
});

const residentialTypeItems = computed(() => {
  if (meta.value?.residential_types?.length) {
    return meta.value.residential_types.map((type: string) => ({
      label: type
        .split("_")
        .map((w) => w[0]?.toUpperCase() + w.slice(1))
        .join(" "),
      value: type,
    }));
  }
  // fallback (admin previously used static)
  return [
    { label: "Day (Non-residential)", value: "non_residential" },
    { label: "Residential", value: "residential" },
    { label: "New Musafir", value: "new_musafir" },
  ];
});

/* ------------ Guardian auto-fill (both modes) ------------ */

watch(
  () => state.guardian_type,
  (t) => {
    if (t === "father") {
      state.guardian_name = state.father_name;
      state.guardian_phone = state.father_phone;
      state.guardian_relation = "Father";
    } else if (t === "mother") {
      state.guardian_name = state.mother_name;
      state.guardian_phone = state.mother_phone;
      state.guardian_relation = "Mother";
    }
  }
);

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

/* ------------ Address cascading ------------ */

// Present
watch(
  () => state.present_address.division_id,
  async (newVal) => {
    state.present_address.district_id = undefined;
    state.present_address.area_id = undefined;
    if (newVal) {
      await addressStore.fetchDistricts(newVal);
      presentDistricts.value = addressStore
        .getDistrictsByDivision(newVal)
        .map((d: any) => ({ label: d.name, value: d.id }));
    } else {
      presentDistricts.value = [];
    }
    presentAreas.value = [];
  }
);

watch(
  () => state.present_address.district_id,
  async (newVal) => {
    state.present_address.area_id = undefined;
    if (newVal) {
      await addressStore.fetchAreas(newVal);
      presentAreas.value = addressStore
        .getAreasByDistrict(newVal)
        .map((a: any) => ({ label: a.name, value: a.id }));
    } else {
      presentAreas.value = [];
    }
  }
);

// Permanent
watch(
  () => state.permanent_address.division_id,
  async (newVal) => {
    state.permanent_address.district_id = undefined;
    state.permanent_address.area_id = undefined;
    if (newVal) {
      await addressStore.fetchDistricts(newVal);
      permanentDistricts.value = addressStore
        .getDistrictsByDivision(newVal)
        .map((d: any) => ({ label: d.name, value: d.id }));
    } else {
      permanentDistricts.value = [];
    }
    permanentAreas.value = [];
  }
);

watch(
  () => state.permanent_address.district_id,
  async (newVal) => {
    state.permanent_address.area_id = undefined;
    if (newVal) {
      await addressStore.fetchAreas(newVal);
      permanentAreas.value = addressStore
        .getAreasByDistrict(newVal)
        .map((a: any) => ({ label: a.name, value: a.id }));
    } else {
      permanentAreas.value = [];
    }
  }
);

// Copy present to permanent
watch(
  () => state.is_present_same_as_permanent,
  (isSame) => {
    if (isSame) {
      state.permanent_address = { ...state.present_address } as any;
      permanentDistricts.value = [...presentDistricts.value];
      permanentAreas.value = [...presentAreas.value];
    }
  }
);

/* ------------ Submit ------------ */

function doSubmit() {
  // Basic validation differences
  if (mode.value === "public") {
    if (!state.academic_session_id) {
      toast.add({
        title: "Validation Error",
        description: "Please select an academic session.",
        color: "error",
      });
      return;
    }
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

  // Extract academic_session_id from session_grade_id in admin mode
  let academicSessionId = state.academic_session_id;
  if (mode.value === "admin" && state.session_grade_id) {
    const selectedSessionGrade = meta.value?.session_grades?.find(
      (sg: any) => sg.id === state.session_grade_id
    );
    if (selectedSessionGrade) {
      academicSessionId = selectedSessionGrade.academic_session_id;
    }
  }

  const payload = {
    academic_session_id: academicSessionId,
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

    present_address: state.present_address,
    permanent_address: state.permanent_address,
    is_present_same_as_permanent: state.is_present_same_as_permanent,

    previous_institution_name: state.previous_institution_name.trim() || null,
    previous_class: state.previous_class.trim() || null,
    previous_result: state.previous_result.trim() || null,
    previous_result_division: state.previous_result_division.trim() || null,

    residential_type: state.residential_type || null,

    applied_via: mode.value === "public" ? "online" : "offline",
    application_date: new Date().toISOString().split("T")[0],
  } as any;

  emit("submit", payload);
}
</script>

<template>
  <div class="space-y-6">
    <!-- Basic info -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">Basic Information</h2>
      </template>

      <div class="space-y-4">
        <div v-if="mode === 'public'" class="space-y-4">
          <UFormField label="Application Type" name="application_type">
            <URadioGroup
              v-model="state.application_type"
              :options="[
                { label: 'New Admission', value: 'new' },
                { label: 'Re-admission', value: 're_admission' },
              ]"
            />
          </UFormField>

          <UFormField
            v-if="state.application_type === 're_admission'"
            label="Existing Student ID"
            name="existing_student_id"
          >
            <UInput
              v-model="state.existing_student_id"
              class="w-full"
              type="number"
              placeholder="Enter existing student ID"
              :disabled="saving"
            />
          </UFormField>

          <UFormField
            label="Academic Session"
            required
            name="academic_session_id"
          >
            <USelect
              v-model="state.academic_session_id"
              class="w-full"
              :items="sessionItemsPublic"
              placeholder="Select session"
              :disabled="saving || metaLoading"
            />
          </UFormField>

          <UFormField label="Class / Grade" required name="session_grade_id">
            <USelect
              v-model="state.session_grade_id"
              class="w-full"
              :items="sessionGradeItems"
              placeholder="Select class"
              :disabled="!state.academic_session_id || saving || metaLoading"
            />
          </UFormField>
        </div>

        <div v-else class="space-y-4">
          <UFormField label="Session & Class" required name="session_grade_id">
            <USelect
              v-model="state.session_grade_id"
              class="w-full"
              :items="adminSessionClassItems"
              :loading="loadingSessions || metaLoading"
              placeholder="Select session and class"
            />
          </UFormField>
        </div>

        <UFormField label="Applicant Name" required name="applicant_name">
          <UInput
            v-model="state.applicant_name"
            class="w-full"
            placeholder="Enter full name"
            :disabled="saving"
          />
        </UFormField>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField label="Gender" name="gender">
            <USelect
              v-model="state.gender"
              class="w-full"
              :items="genderItems"
              placeholder="Select gender"
              :disabled="saving"
            />
          </UFormField>
          <UFormField label="Date of Birth" name="date_of_birth">
            <UInput
              v-model="state.date_of_birth"
              class="w-full"
              type="date"
              :disabled="saving"
            />
          </UFormField>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField label="Student Phone" name="student_phone">
            <UInput
              v-model="state.student_phone"
              class="w-full"
              placeholder="01XXXXXXXXX"
              :disabled="saving"
            />
          </UFormField>
          <UFormField label="Student Email" name="student_email">
            <UInput
              v-model="state.student_email"
              class="w-full"
              type="email"
              placeholder="student@example.com"
              :disabled="saving"
            />
          </UFormField>
        </div>
      </div>
    </UCard>

    <!-- Parents & Guardian -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">Parents & Guardian</h2>
      </template>

      <div class="space-y-6">
        <div class="space-y-4">
          <UFormField label="Father's Name" name="father_name">
            <UInput
              v-model="state.father_name"
              class="w-full"
              placeholder="Enter father's name"
              :disabled="saving"
            />
          </UFormField>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField label="Father's Phone" name="father_phone">
              <UInput
                v-model="state.father_phone"
                class="w-full"
                placeholder="01XXXXXXXXX"
                :disabled="saving"
              />
            </UFormField>
            <UFormField label="Father's Occupation" name="father_occupation">
              <UInput
                v-model="state.father_occupation"
                class="w-full"
                placeholder="Enter occupation"
                :disabled="saving"
              />
            </UFormField>
          </div>
        </div>

        <div class="space-y-4">
          <UFormField label="Mother's Name" name="mother_name">
            <UInput
              v-model="state.mother_name"
              class="w-full"
              placeholder="Enter mother's name"
              :disabled="saving"
            />
          </UFormField>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField label="Mother's Phone" name="mother_phone">
              <UInput
                v-model="state.mother_phone"
                class="w-full"
                placeholder="01XXXXXXXXX"
                :disabled="saving"
              />
            </UFormField>
            <UFormField label="Mother's Occupation" name="mother_occupation">
              <UInput
                v-model="state.mother_occupation"
                class="w-full"
                placeholder="Enter occupation"
                :disabled="saving"
              />
            </UFormField>
          </div>
        </div>

        <div class="space-y-4">
          <UFormField
            label="Guardian Type"
            :required="mode === 'public'"
            name="guardian_type"
          >
            <USelect
              v-model="state.guardian_type"
              class="w-full"
              :items="guardianTypeItems"
              :disabled="saving"
            />
          </UFormField>

          <UFormField label="Guardian Name" name="guardian_name">
            <UInput
              v-model="state.guardian_name"
              class="w-full"
              placeholder="Name"
              :disabled="
                saving ||
                state.guardian_type === 'father' ||
                state.guardian_type === 'mother'
              "
            />
          </UFormField>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField label="Guardian Phone" name="guardian_phone">
              <UInput
                v-model="state.guardian_phone"
                class="w-full"
                placeholder="01XXXXXXXXX"
                :disabled="
                  saving ||
                  state.guardian_type === 'father' ||
                  state.guardian_type === 'mother'
                "
              />
            </UFormField>
            <UFormField label="Relation" name="guardian_relation">
              <UInput
                v-model="state.guardian_relation"
                class="w-full"
                placeholder="Relation with student"
                :disabled="
                  saving ||
                  state.guardian_type === 'father' ||
                  state.guardian_type === 'mother'
                "
              />
            </UFormField>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Present Address -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">Present Address</h2>
      </template>

      <div class="space-y-4">
        <UFormField
          label="Division"
          required
          name="present_address.division_id"
        >
          <USelect
            v-model="state.present_address.division_id"
            class="w-full"
            :items="divisionItems"
            :loading="loadingDivisions"
            placeholder="Select division"
            :disabled="saving"
            :popper="{ strategy: 'fixed' }"
          />
        </UFormField>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField
            label="District"
            required
            name="present_address.district_id"
          >
            <USelect
              v-model="state.present_address.district_id"
              class="w-full"
              :items="presentDistricts"
              :loading="loadingDistricts"
              :disabled="!state.present_address.division_id || saving"
              placeholder="Select district"
              :popper="{ strategy: 'fixed' }"
            />
          </UFormField>

          <UFormField label="Area/Upazila" name="present_address.area_id">
            <USelect
              v-model="state.present_address.area_id"
              class="w-full"
              :items="presentAreas"
              :loading="loadingAreas"
              :disabled="!state.present_address.district_id || saving"
              placeholder="Select area (optional)"
              :popper="{ strategy: 'fixed' }"
            />
          </UFormField>
        </div>

        <UFormField
          label="Village/House/Holding"
          name="present_address.village_house_holding"
        >
          <UTextarea
            v-model="state.present_address.village_house_holding"
            class="w-full"
            placeholder="Enter village, house no, holding no, etc."
            :rows="3"
            :maxlength="500"
            :disabled="saving"
          />
        </UFormField>
      </div>
    </UCard>

    <!-- Permanent Address -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Permanent Address</h2>
          <UCheckbox
            v-model="state.is_present_same_as_permanent"
            :disabled="saving"
            label="Same as present address"
          />
        </div>
      </template>

      <div class="space-y-4">
        <UFormField
          label="Division"
          required
          name="permanent_address.division_id"
        >
          <USelect
            v-model="state.permanent_address.division_id"
            class="w-full"
            :items="divisionItems"
            :loading="loadingDivisions"
            :disabled="state.is_present_same_as_permanent || saving"
            placeholder="Select division"
            :popper="{ strategy: 'fixed' }"
          />
        </UFormField>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField
            label="District"
            required
            name="permanent_address.district_id"
          >
            <USelect
              v-model="state.permanent_address.district_id"
              class="w-full"
              :items="permanentDistricts"
              :loading="loadingDistricts"
              :disabled="
                !state.permanent_address.division_id ||
                state.is_present_same_as_permanent ||
                saving
              "
              placeholder="Select district"
              :popper="{ strategy: 'fixed' }"
            />
          </UFormField>

          <UFormField label="Area/Upazila" name="permanent_address.area_id">
            <USelect
              v-model="state.permanent_address.area_id"
              class="w-full"
              :items="permanentAreas"
              :loading="loadingAreas"
              :disabled="
                !state.permanent_address.district_id ||
                state.is_present_same_as_permanent ||
                saving
              "
              placeholder="Select area (optional)"
              :popper="{ strategy: 'fixed' }"
            />
          </UFormField>
        </div>

        <UFormField
          label="Village/House/Holding"
          name="permanent_address.village_house_holding"
        >
          <UTextarea
            v-model="state.permanent_address.village_house_holding"
            class="w-full"
            placeholder="Enter village, house no, holding no, etc."
            :rows="3"
            :maxlength="500"
            :disabled="state.is_present_same_as_permanent || saving"
          />
        </UFormField>
      </div>
    </UCard>

    <!-- Previous Institution -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">Previous Institution Information</h2>
      </template>

      <div class="space-y-4">
        <UFormField
          label="Previous Institution Name"
          name="previous_institution_name"
        >
          <UInput
            v-model="state.previous_institution_name"
            class="w-full"
            placeholder="Enter institution name"
            :disabled="saving"
          />
        </UFormField>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <UFormField label="Class" name="previous_class">
            <UInput
              v-model="state.previous_class"
              class="w-full"
              placeholder="Enter class"
              :disabled="saving"
            />
          </UFormField>
          <UFormField label="Result" name="previous_result">
            <UInput
              v-model="state.previous_result"
              class="w-full"
              placeholder="e.g., GPA 5.00"
              :disabled="saving"
            />
          </UFormField>
          <UFormField label="Division/Group" name="previous_result_division">
            <UInput
              v-model="state.previous_result_division"
              class="w-full"
              placeholder="e.g., Science"
              :disabled="saving"
            />
          </UFormField>
        </div>
      </div>
    </UCard>

    <!-- Other Information -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">Other Information</h2>
      </template>
      <div class="space-y-4">
        <UFormField label="Residential Type" name="residential_type">
          <USelect
            v-model="state.residential_type"
            class="w-full"
            :items="residentialTypeItems"
            placeholder="Select residential type"
            :disabled="saving"
          />
        </UFormField>
      </div>
    </UCard>

    <!-- Actions -->
    <div class="flex gap-4 justify-end">
      <UButton
        v-if="showCancel"
        type="button"
        color="secondary"
        variant="outline"
        :disabled="saving"
        @click="emit('cancel')"
      >
        {{ cancelLabel }}
      </UButton>

      <UButton
        type="button"
        color="primary"
        :loading="saving"
        :disabled="saving"
        @click="doSubmit"
      >
        {{ submitLabel }}
      </UButton>
    </div>
  </div>
</template>
