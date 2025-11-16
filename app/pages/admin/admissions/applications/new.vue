<script setup lang="ts">
import { storeToRefs } from "pinia";

definePageMeta({
  layout: "admin",
  middleware: "auth",
  roles: ["Owner", "Admin", "Developer"],
});

useHead({ title: "Offline Application Entry" });

const router = useRouter();
const toast = useToast();

const sessions = useSessionStore();
const { items: sessionItems, loading: loadingSessions } = storeToRefs(sessions);

const apps = useAdmissionApplicationStore();
const { saving, meta } = storeToRefs(apps);

const form = reactive({
  session_grade_id: null as number | null,
  applicant_name: "",
  gender: "",
  date_of_birth: "",
  student_phone: "",
  student_email: "",
  father_name: "",
  father_phone: "",
  father_occupation: "",
  mother_name: "",
  mother_phone: "",
  mother_occupation: "",
  guardian_name: "",
  guardian_phone: "",
  guardian_relation: "",
  present_address: {
    house: "",
    road: "",
    village: "",
    post_office: "",
    upazila: "",
    district: "",
  },
  permanent_address: {
    house: "",
    road: "",
    village: "",
    post_office: "",
    upazila: "",
    district: "",
  },
  residential_type: "day" as "day" | "residential",
  previous_institution_name: "",
  previous_class: "",
  previous_result: "",
});

onMounted(async () => {
  if (!sessionItems.value.length) await sessions.fetchList();
  if (!meta.value || !(meta.value as any).session_grades?.length)
    await apps.fetchMeta();
});

const sessionOptions = computed(() => {
  // Flatten from meta.session_grades, label: Session — Class
  const grades = (meta.value?.session_grades || []) as any[];
  const opts: { label: string; value: number }[] = [];
  for (const sg of grades) {
    const sess = sessionItems.value.find(
      (s) => s.id === sg.academic_session_id
    ) as any;
    const sessionName = sess?.name || `Session #${sg.academic_session_id}`;
    const gradeName = sg?.grade?.name || `Class #${sg?.grade_id}`;
    opts.push({ label: `${sessionName} — ${gradeName}`, value: sg.id });
  }
  return opts;
});

async function submit() {
  if (!form.session_grade_id) {
    toast.add({
      title: "Missing class",
      description: "Please select session & class",
      color: "warning",
    });
    return;
  }
  try {
    const payload: any = { ...form, applied_via: "offline" };
    const res = await apps.createPublic(payload);
    toast.add({
      title: "Created",
      description: "Application created",
      color: "success",
    });
    router.push(`/admin/admissions/applications/${res?.id || ""}`);
  } catch (e: any) {
    toast.add({
      title: "Failed",
      description:
        e?.data?.message || e?.message || "Could not create application",
      color: "error",
    });
  }
}
</script>

<template>
  <UContainer>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-semibold">Offline Entry</h1>
        <p class="text-sm text-gray-500">
          Record an application received offline.
        </p>
      </div>
      <UButton
        color="secondary"
        variant="outline"
        icon="i-lucide-arrow-left"
        to="/admin/admissions/applications"
        >Back</UButton
      >
    </div>

    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">Applicant Information</h2>
      </template>

      <div class="space-y-8">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <UFormGroup label="Session & Class" required>
            <USelect
              v-model="form.session_grade_id"
              :loading="loadingSessions"
              :options="sessionOptions"
              placeholder="Select session and class"
            />
          </UFormGroup>
          <UFormGroup label="Applicant Name" required>
            <UInput
              v-model="form.applicant_name"
              placeholder="Applicant full name"
            />
          </UFormGroup>
          <UFormGroup label="Gender">
            <USelect
              v-model="form.gender"
              :options="[
                { label: 'Male', value: 'male' },
                { label: 'Female', value: 'female' },
                { label: 'Other', value: 'other' },
              ]"
            />
          </UFormGroup>
          <UFormGroup label="Date of Birth">
            <UInput v-model="form.date_of_birth" type="date" />
          </UFormGroup>
          <UFormGroup label="Student Phone">
            <UInput v-model="form.student_phone" placeholder="01XXXXXXXXX" />
          </UFormGroup>
          <UFormGroup label="Student Email">
            <UInput
              v-model="form.student_email"
              type="email"
              placeholder="name@example.com"
            />
          </UFormGroup>
        </div>

        <UDivider label="Parents & Guardian" />
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="space-y-4">
            <UFormGroup label="Father's Name"
              ><UInput v-model="form.father_name"
            /></UFormGroup>
            <UFormGroup label="Phone"
              ><UInput v-model="form.father_phone"
            /></UFormGroup>
            <UFormGroup label="Occupation"
              ><UInput v-model="form.father_occupation"
            /></UFormGroup>
          </div>
          <div class="space-y-4">
            <UFormGroup label="Mother's Name"
              ><UInput v-model="form.mother_name"
            /></UFormGroup>
            <UFormGroup label="Phone"
              ><UInput v-model="form.mother_phone"
            /></UFormGroup>
            <UFormGroup label="Occupation"
              ><UInput v-model="form.mother_occupation"
            /></UFormGroup>
          </div>
          <div class="space-y-4">
            <UFormGroup label="Guardian Name"
              ><UInput v-model="form.guardian_name"
            /></UFormGroup>
            <UFormGroup label="Phone"
              ><UInput v-model="form.guardian_phone"
            /></UFormGroup>
            <UFormGroup label="Relation"
              ><UInput v-model="form.guardian_relation"
            /></UFormGroup>
          </div>
        </div>

        <UDivider label="Addresses" />
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-4">
            <h3 class="font-medium">Present Address</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormGroup label="House"
                ><UInput v-model="form.present_address.house"
              /></UFormGroup>
              <UFormGroup label="Road"
                ><UInput v-model="form.present_address.road"
              /></UFormGroup>
              <UFormGroup label="Village"
                ><UInput v-model="form.present_address.village"
              /></UFormGroup>
              <UFormGroup label="Post Office"
                ><UInput v-model="form.present_address.post_office"
              /></UFormGroup>
              <UFormGroup label="Upazila"
                ><UInput v-model="form.present_address.upazila"
              /></UFormGroup>
              <UFormGroup label="District"
                ><UInput v-model="form.present_address.district"
              /></UFormGroup>
            </div>
          </div>
          <div class="space-y-4">
            <h3 class="font-medium">Permanent Address</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormGroup label="House"
                ><UInput v-model="form.permanent_address.house"
              /></UFormGroup>
              <UFormGroup label="Road"
                ><UInput v-model="form.permanent_address.road"
              /></UFormGroup>
              <UFormGroup label="Village"
                ><UInput v-model="form.permanent_address.village"
              /></UFormGroup>
              <UFormGroup label="Post Office"
                ><UInput v-model="form.permanent_address.post_office"
              /></UFormGroup>
              <UFormGroup label="Upazila"
                ><UInput v-model="form.permanent_address.upazila"
              /></UFormGroup>
              <UFormGroup label="District"
                ><UInput v-model="form.permanent_address.district"
              /></UFormGroup>
            </div>
          </div>
        </div>

        <UDivider label="Other Details" />
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <UFormGroup label="Residential Type">
            <USelect
              v-model="form.residential_type"
              :options="[
                { label: 'Day', value: 'day' },
                { label: 'Residential', value: 'residential' },
              ]"
            />
          </UFormGroup>
          <UFormGroup label="Previous Institution"
            ><UInput v-model="form.previous_institution_name"
          /></UFormGroup>
          <UFormGroup label="Previous Class"
            ><UInput v-model="form.previous_class"
          /></UFormGroup>
          <UFormGroup label="Previous Result"
            ><UInput v-model="form.previous_result"
          /></UFormGroup>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            variant="outline"
            color="secondary"
            to="/admin/admissions/applications"
            >Cancel</UButton
          >
          <UButton
            color="primary"
            :loading="saving"
            :disabled="saving"
            icon="i-lucide-save"
            @click="submit"
            >Create</UButton
          >
        </div>
      </div>
    </UCard>
  </UContainer>
</template>
