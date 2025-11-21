<script setup lang="ts">
const props = defineProps<{
  open: boolean;
  studentId: number;
  studentName: string;
  academicSessionId: number;
  sessionGradeId?: number | null;
}>();

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const formRef = ref<any>(null);

function handleSaved() {
  emit("saved");
  closeModal();
}

function skipForNow() {
  closeModal();
}

function closeModal() {
  if (formRef.value) {
    formRef.value.resetForm();
  }
  emit("close");
}
</script>

<template>
  <UModal
    :open="open"
    @update:open="(val) => !val && closeModal()"
    title="Assign Fees to Student"
    :description="studentName"
    :ui="{ footer: 'justify-between' }"
  >
    <template #body>
      <StudentFeeAssignForm
        ref="formRef"
        :student-id="studentId"
        :student-name="studentName"
        :academic-session-id="academicSessionId"
        :session-grade-id="sessionGradeId"
        @saved="handleSaved"
      />
    </template>

    <template #footer>
      <UButton label="Skip for Now" variant="ghost" @click="skipForNow" />
      <div class="flex gap-3">
        <UButton
          label="Cancel"
          variant="outline"
          color="neutral"
          @click="closeModal"
        />
        <UButton
          label="Assign Fees"
          color="primary"
          @click="formRef?.saveFees()"
        />
      </div>
    </template>
  </UModal>
</template>
