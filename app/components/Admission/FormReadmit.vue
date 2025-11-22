<!-- components/AdmissionFormReadmit.vue -->
<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useDebounceFn } from "@vueuse/core";

const props = defineProps<{
  appliedVia?: "online" | "offline";
  saving?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  showCancel?: boolean;
}>();

const emit = defineEmits<{
  (e: "submit", payload: any): void;
  (e: "cancel"): void;
}>();

const showCancel = computed(() => props.showCancel ?? true);
const submitLabel = computed(() => props.submitLabel ?? "Submit Application");
const cancelLabel = computed(() => props.cancelLabel ?? "Cancel");
const appliedVia = computed(() => props.appliedVia ?? "online");

// Stores
const apps = useAdmissionApplicationStore();
const { meta, metaLoading } = storeToRefs(apps);

const sessions = useSessionStore();
const { items: sessionItems } = storeToRefs(sessions);

const addressStore = useAddressStore();
const { divisions, loadingDivisions, loadingDistricts, loadingAreas } =
  storeToRefs(addressStore);

const students = useStudentStore();
const { items: studentItems } = storeToRefs(students);

// Select items
const divisionItems = computed(
  () => divisions.value?.map((d: any) => ({ label: d.name, value: d.id })) || []
);

const genderItems = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
];

const sessionItemsActive = computed(() => {
  return (
    meta.value?.sessions
      ?.filter((s: any) => s.is_active)
      .map((s: any) => ({ label: s.name, value: s.id })) || []
  );
});

const sessionGradeItems = computed(() => {
  if (!state.academic_session_id) return [];
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

const guardianTypeItems = computed(() => {
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
  return [
    { label: "Day (Non-residential)", value: "non_residential" },
    { label: "Residential", value: "residential" },
    { label: "New Musafir", value: "new_musafir" },
  ];
});

// Address lists
const presentDistricts = ref<any[]>([]);
const presentAreas = ref<any[]>([]);
const permanentDistricts = ref<any[]>([]);
const permanentAreas = ref<any[]>([]);

// Student search
const studentSearch = ref("");
const studentOptions = ref<{ label: string; value: number; raw: any }[]>([]);
const studentLoading = ref(false);
const selectedStudentId = ref<number | undefined>(undefined);
const selectedStudent = ref<any | null>(null);

// Prefill guard (so cascade watchers don't erase prefilled ids)
const isPrefilling = ref(false);

// Form state
const state = reactive({
  academic_session_id: undefined as number | undefined,
  session_grade_id: undefined as number | undefined,

  existing_student_id: undefined as number | undefined,

  applicant_name: "",
  gender: "",
  date_of_birth: "", // keep string only
  student_phone: "",
  student_email: "",

  father_name: "",
  father_phone: "",
  father_occupation: "",
  mother_name: "",
  mother_phone: "",
  mother_occupation: "",

  guardian_type: "father" as "father" | "mother" | "other",
  guardian_name: "",
  guardian_phone: "",
  guardian_relation: "",

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

  previous_institution_name: "",
  previous_class: "",
  previous_result: "",
  previous_result_division: "",

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
  } catch {}
});

/* ---------------- Student search using StudentStore ---------------- */

const fetchStudents = useDebounceFn(async (q: string) => {
  studentOptions.value = [];
  selectedStudentId.value = undefined;
  selectedStudent.value = null;

  if (!q?.trim()) return;

  // snapshot prev student store state
  const prev = {
    q: students.q,
    page: students.page,
    per_page: students.per_page,
    status: students.status,
    gender: students.gender,
    residential_type: students.residential_type,
    academic_session_id: students.academic_session_id,
    session_grade_id: students.session_grade_id,
    section_id: students.section_id,
    with: [...students.with],
    sort_by: students.sort_by,
    sort_dir: students.sort_dir,
  };

  studentLoading.value = true;
  try {
    students.setQuery(q);
    students.setPerPage(10);
    students.setPage(1);

    // ✅ allowed by controller, and helps if with_latest_enrollment toggle ever changes
    students.setWith([
      "enrollments.academicSession",
      "enrollments.sessionGrade",
      "enrollments.section",
    ]);

    await students.fetchList();

    const rows = studentItems.value || [];
    studentOptions.value = rows.map((s: any) => {
      // Controller returns latest enrollment inside enrollments (limit 1) for index
      const le =
        s.latest_enrollment ||
        (Array.isArray(s.enrollments) ? s.enrollments[0] : null);

      const currSession = le?.academicSession?.name || "";
      const currGrade =
        le?.sessionGrade?.grade?.name || le?.sessionGrade?.grade_id || "";
      const currSection = le?.section?.name || "";
      const currRoll = le?.roll_no ? `Roll ${le.roll_no}` : "";

      const currText =
        currSession || currGrade || currSection || currRoll
          ? ` (${[currSession, currGrade, currSection, currRoll]
              .filter(Boolean)
              .join(" • ")})`
          : "";

      return {
        label: `${s.student_code} — ${s.name_bn}${currText}`,
        value: s.id,
        raw: s,
      };
    });
  } catch {
    // silent
  } finally {
    // restore old filters
    students.setQuery(prev.q);
    students.setPerPage(prev.per_page);
    students.setPage(prev.page);
    students.setStatus(prev.status);
    students.setGender(prev.gender);
    students.setResidentialType(prev.residential_type);
    students.setAcademicSessionId(prev.academic_session_id);
    students.setSessionGradeId(prev.session_grade_id);
    students.setSectionId(prev.section_id);
    students.setWith(prev.with);
    students.setSort(prev.sort_by, prev.sort_dir);

    studentLoading.value = false;
  }
}, 400);

watch(
  () => studentSearch.value,
  (q) => fetchStudents(q)
);

watch(
  () => selectedStudentId.value,
  async (id) => {
    if (!id) return;
    const opt = studentOptions.value.find((o) => o.value === id);
    if (opt?.raw) {
      selectedStudent.value = opt.raw;
      await applyStudentToForm(opt.raw);
    }
  }
);

/* ---------------- Prefill student to form (FIX address cascade) ---------------- */

async function applyStudentToForm(stu: any) {
  if (!stu) return;

  isPrefilling.value = true;
  try {
    state.existing_student_id = stu.id;

    state.applicant_name = stu.name_bn || "";
    state.gender = stu.gender || "";
    state.date_of_birth = stu.date_of_birth
      ? String(stu.date_of_birth).slice(0, 10)
      : "";

    state.student_phone = stu.student_phone || "";
    state.student_email = stu.student_email || "";

    state.father_name = stu.father_name || "";
    state.father_phone = stu.father_phone || "";
    state.father_occupation = stu.father_occupation || "";

    state.mother_name = stu.mother_name || "";
    state.mother_phone = stu.mother_phone || "";
    state.mother_occupation = stu.mother_occupation || "";

    state.guardian_type = stu.guardian_type || "father";
    state.guardian_name = stu.guardian_name || "";
    state.guardian_phone = stu.guardian_phone || "";
    state.guardian_relation = stu.guardian_relation || "";

    // ---- Present address cascade prefill ----
    const pa = stu.present_address || {};
    state.present_address.village_house_holding =
      pa.village_house_holding || "";

    state.present_address.division_id = pa.division_id ?? undefined;
    state.present_address.district_id = undefined;
    state.present_address.area_id = undefined;
    presentDistricts.value = [];
    presentAreas.value = [];

    if (pa.division_id) {
      try {
        await addressStore.fetchDistricts(pa.division_id);
        presentDistricts.value = addressStore
          .getDistrictsByDivision(pa.division_id)
          .map((d: any) => ({ label: d.name, value: d.id }));
      } catch {}

      state.present_address.district_id = pa.district_id ?? undefined;

      if (pa.district_id) {
        try {
          await addressStore.fetchAreas(pa.district_id);
          presentAreas.value = addressStore
            .getAreasByDistrict(pa.district_id)
            .map((a: any) => ({ label: a.name, value: a.id }));
        } catch {}

        state.present_address.area_id = pa.area_id ?? undefined;
      }
    }

    // ---- Permanent address cascade prefill ----
    const pma = stu.permanent_address || {};
    state.permanent_address.village_house_holding =
      pma.village_house_holding || "";

    state.permanent_address.division_id = pma.division_id ?? undefined;
    state.permanent_address.district_id = undefined;
    state.permanent_address.area_id = undefined;
    permanentDistricts.value = [];
    permanentAreas.value = [];

    if (pma.division_id) {
      try {
        await addressStore.fetchDistricts(pma.division_id);
        permanentDistricts.value = addressStore
          .getDistrictsByDivision(pma.division_id)
          .map((d: any) => ({ label: d.name, value: d.id }));
      } catch {}

      state.permanent_address.district_id = pma.district_id ?? undefined;

      if (pma.district_id) {
        try {
          await addressStore.fetchAreas(pma.district_id);
          permanentAreas.value = addressStore
            .getAreasByDistrict(pma.district_id)
            .map((a: any) => ({ label: a.name, value: a.id }));
        } catch {}

        state.permanent_address.area_id = pma.area_id ?? undefined;
      }
    }

    state.residential_type = stu.residential_type || state.residential_type;
  } finally {
    isPrefilling.value = false;
  }
}

/* ------------ Guardian auto-fill ------------ */

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

/* ------------ Address cascading (skip while prefill) ------------ */

// Present
watch(
  () => state.present_address.division_id,
  async (newVal) => {
    if (isPrefilling.value) return;

    state.present_address.district_id = undefined;
    state.present_address.area_id = undefined;

    if (newVal) {
      try {
        await addressStore.fetchDistricts(newVal);
        presentDistricts.value = addressStore
          .getDistrictsByDivision(newVal)
          .map((d: any) => ({ label: d.name, value: d.id }));
      } catch {}
    } else {
      presentDistricts.value = [];
    }
    presentAreas.value = [];
  }
);

watch(
  () => state.present_address.district_id,
  async (newVal) => {
    if (isPrefilling.value) return;

    state.present_address.area_id = undefined;

    if (newVal) {
      try {
        await addressStore.fetchAreas(newVal);
        presentAreas.value = addressStore
          .getAreasByDistrict(newVal)
          .map((a: any) => ({ label: a.name, value: a.id }));
      } catch {}
    } else {
      presentAreas.value = [];
    }
  }
);

// Permanent
watch(
  () => state.permanent_address.division_id,
  async (newVal) => {
    if (isPrefilling.value) return;

    state.permanent_address.district_id = undefined;
    state.permanent_address.area_id = undefined;

    if (newVal) {
      try {
        await addressStore.fetchDistricts(newVal);
        permanentDistricts.value = addressStore
          .getDistrictsByDivision(newVal)
          .map((d: any) => ({ label: d.name, value: d.id }));
      } catch {}
    } else {
      permanentDistricts.value = [];
    }
    permanentAreas.value = [];
  }
);

watch(
  () => state.permanent_address.district_id,
  async (newVal) => {
    if (isPrefilling.value) return;

    state.permanent_address.area_id = undefined;

    if (newVal) {
      try {
        await addressStore.fetchAreas(newVal);
        permanentAreas.value = addressStore
          .getAreasByDistrict(newVal)
          .map((a: any) => ({ label: a.name, value: a.id }));
      } catch {}
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
  if (!state.existing_student_id) {
    toast.add({
      title: "Validation Error",
      description: "Please select an existing student (by code).",
      color: "error",
    });
    return;
  }

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

  const payload = {
    academic_session_id: state.academic_session_id,
    session_grade_id: state.session_grade_id,

    application_type: "re_admission",
    existing_student_id: state.existing_student_id,

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

    applied_via: appliedVia.value,
    application_date: new Date().toISOString().split("T")[0],
  };

  emit("submit", payload);
}
</script>

<template>
  <div class="space-y-6">
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">Existing Student</h2>
      </template>

      <div class="space-y-3">
        <UFormField label="Student Code / Name / Phone" name="student_search">
          <UInput
            v-model="studentSearch"
            class="w-full"
            placeholder="Type student code (e.g. 250045) to search"
            :disabled="saving"
          />
        </UFormField>

        <UFormField label="Select Student" name="existing_student_id">
          <USelect
            v-model="selectedStudentId"
            class="w-full"
            :items="studentOptions"
            :loading="studentLoading"
            placeholder="Select student"
            :disabled="saving"
          />
        </UFormField>

        <!-- Current + Expected enrollment highlight -->
        <UCard v-if="selectedStudent" class="bg-gray-50">
          <div class="text-sm space-y-3">
            <div class="font-semibold">Enrollment Summary</div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <!-- Current -->
              <div class="p-3 rounded-xl bg-white border border-gray-200">
                <div class="font-semibold mb-2 flex items-center gap-2">
                  Current
                  <UBadge color="neutral" variant="soft" size="xs">
                    Existing
                  </UBadge>
                </div>

                <div>
                  Session:
                  <span class="font-medium">
                    {{
                      (
                        selectedStudent.latest_enrollment ||
                        selectedStudent.enrollments?.[0]
                      )?.academic_session?.name || "—"
                    }}
                  </span>
                </div>

                <div>
                  Class:
                  <span class="font-medium">
                    {{
                      (
                        selectedStudent.latest_enrollment ||
                        selectedStudent.enrollments?.[0]
                      )?.session_grade?.grade?.name ||
                      (
                        selectedStudent.latest_enrollment ||
                        selectedStudent.enrollments?.[0]
                      )?.session_grade?.grade_id ||
                      "—"
                    }}
                  </span>
                </div>

                <div>
                  Section:
                  <span class="font-medium">
                    {{
                      (
                        selectedStudent.latest_enrollment ||
                        selectedStudent.enrollments?.[0]
                      )?.section?.name || "—"
                    }}
                  </span>
                </div>

                <div>
                  Roll:
                  <span class="font-medium">
                    {{
                      (
                        selectedStudent.latest_enrollment ||
                        selectedStudent.enrollments?.[0]
                      )?.roll_no || "—"
                    }}
                  </span>
                </div>
              </div>

              <!-- Expected -->
              <div
                class="p-3 rounded-xl bg-primary-50 border border-primary-200 ring-1 ring-primary-300"
              >
                <div class="font-semibold mb-2 flex items-center gap-2">
                  Expected / Target
                  <UBadge color="primary" variant="solid" size="xs">
                    Selected
                  </UBadge>
                </div>

                <div>
                  Session:
                  <span class="font-medium">
                    {{
                      sessionItemsActive.find(
                        (s) => s.value === state.academic_session_id
                      )?.label || "—"
                    }}
                  </span>
                </div>

                <div>
                  Class:
                  <span class="font-medium">
                    {{
                      sessionGradeItems.find(
                        (g) => g.value === state.session_grade_id
                      )?.label || "—"
                    }}
                  </span>
                </div>

                <div class="text-xs text-primary-700 mt-2">
                  You are applying for re-admission to this selected session &
                  class.
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </UCard>

    <!-- Basic info -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">Basic Information</h2>
      </template>

      <div class="space-y-4">
        <UFormField
          label="Academic Session"
          required
          name="academic_session_id"
        >
          <USelect
            v-model="state.academic_session_id"
            class="w-full"
            :items="sessionItemsActive"
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
          <UFormField label="Guardian Type" required name="guardian_type">
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

    <!-- Other Info -->
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
