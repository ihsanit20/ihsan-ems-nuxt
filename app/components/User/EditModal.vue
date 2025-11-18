<script setup lang="ts">
import { reactive, watch, computed } from "vue";
import { useUserStore } from "@/stores/user";
import type { User } from "~/types";
import { useToast } from "#imports";
import type { FormError, FormSubmitEvent } from "@nuxt/ui";

const props = defineProps<{
  open: boolean;
  roles: string[];
  user: User | null;
}>();
const emit = defineEmits<{
  (e: "update:open", v: boolean): void;
  (e: "updated"): void;
}>();

const store = useUserStore();
const toast = useToast();

const modalOpen = computed({
  get: () => props.open,
  set: (v) => emit("update:open", v),
});

type FormState = {
  name: string;
  phone: string;
  email?: string | null;
  role?: string | null;
  password?: string | null;
  photo?: File | null;
  remove_photo?: boolean;
};
const state = reactive<FormState>({
  name: "",
  phone: "",
  email: "",
  role: null,
  password: "",
  photo: null,
  remove_photo: false,
});

watch(
  () => props.user,
  (u) => {
    if (!u) return;
    state.name = u.name;
    state.phone = u.phone;
    state.email = u.email ?? "";
    state.role = u.role ?? null;
    state.password = "";
    state.photo = null;
    state.remove_photo = false;
  },
  { immediate: true }
);

function validate(s: FormState): FormError[] {
  const e: FormError[] = [];
  if (!s.name?.trim()) e.push({ name: "name", message: "Name is required" });
  if (!s.phone?.trim()) e.push({ name: "phone", message: "Phone is required" });
  return e;
}

async function onSubmit(_: FormSubmitEvent<FormState>) {
  try {
    if (!props.user?.id) throw new Error("Invalid user");
    await store.update(props.user.id, { ...state });
    emit("updated");
    modalOpen.value = false;
  } catch {
    toast.add({
      color: "error",
      title: "Failed",
      description: store.error || "Something went wrong",
    });
  }
}
</script>

<template>
  <UModal
    :open="modalOpen"
    @update:open="emit('update:open', $event)"
    title="Edit User"
    :prevent-close="store.saving"
    :closeable="!store.saving"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <UForm
        :state="state"
        :validate="validate"
        id="user-edit-form"
        class="grid grid-cols-1 md:grid-cols-2 gap-4"
        @submit="onSubmit"
      >
        <UFormField label="Name" name="name">
          <UInput v-model="state.name" placeholder="Full name" />
        </UFormField>

        <UFormField label="Phone" name="phone">
          <UInput v-model="state.phone" placeholder="e.g., 017..." />
        </UFormField>

        <UFormField label="Email" name="email">
          <UInput
            v-model="state.email"
            type="email"
            placeholder="name@example.com"
          />
        </UFormField>

        <UFormField label="Role" name="role">
          <USelect
            v-model="state.role"
            :items="[
              { label: '(none)', value: null },
              ...props.roles.map((r) => ({ label: r, value: r })),
            ]"
            placeholder="Select role"
          />
        </UFormField>

        <UFormField
          label="Password (optional)"
          name="password"
          help="Leave blank to keep unchanged"
        >
          <UInput
            v-model="state.password"
            type="password"
            placeholder="••••••••"
          />
        </UFormField>

        <UFormField label="Photo" name="photo">
          <input
            type="file"
            class="block w-full text-sm"
            @change="(e:any)=>{ state.photo = e?.target?.files?.[0] || null }"
          />
          <div class="mt-2">
            <UCheckbox
              v-model="state.remove_photo"
              label="Remove existing photo"
            />
          </div>
        </UFormField>
      </UForm>
    </template>

    <template #footer="{ close }">
      <UButton
        label="Cancel"
        color="neutral"
        variant="outline"
        @click="
          () => {
            close();
            emit('update:open', false);
          }
        "
      />
      <UButton
        label="Save changes"
        color="primary"
        :loading="store.saving"
        type="submit"
        form="user-edit-form"
      />
    </template>
  </UModal>
</template>
