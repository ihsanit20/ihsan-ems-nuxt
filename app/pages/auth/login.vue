<script setup lang="ts">
// definePageMeta({ middleware: ["guest"] });

const auth = useAuthStore();
const toast = useToast();

const identifier = ref("");
const password = ref("");

const onSubmit = async () => {
  if (!identifier.value || !password.value) {
    toast.add({ title: "Please fill all required fields", color: "error" });
    return;
  }
  try {
    await auth.login(identifier.value, password.value);
    await auth.fetchMe();
    toast.add({ title: "Welcome back!" });
    return navigateTo("/dashboard");
  } catch (e) {
    // auth.store already set error
  }
};
</script>

<template>
  <div class="min-h-screen grid place-items-center px-4">
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-semibold">Sign in</h1>
          <NuxtLink
            to="/auth/register"
            class="text-sm underline hover:no-underline"
          >
            Create account
          </NuxtLink>
        </div>
      </template>

      <UForm @submit.prevent="onSubmit" class="grid gap-4">
        <UFormGroup label="Email or Phone" name="identifier">
          <UInput
            v-model="identifier"
            placeholder="you@example.com or 017..."
            autofocus
            class="w-full"
          />
        </UFormGroup>

        <UFormGroup label="Password" name="password">
          <UInput
            v-model="password"
            type="password"
            placeholder="••••••••"
            class="w-full"
          />
        </UFormGroup>

        <div v-if="auth.status === 'error'" class="text-red-600 text-sm">
          {{ auth.error }}
        </div>

        <UButton
          :loading="auth.status === 'authenticating'"
          type="submit"
          block
        >
          Sign in
        </UButton>
      </UForm>

      <template #footer>
        <p class="text-sm text-gray-500">
          Forgot password? <span class="opacity-60">(coming soon)</span>
        </p>
      </template>
    </UCard>
  </div>
</template>
