<script setup lang="ts">
const { $publicApi } = useNuxtApp();
const auth = useAuthStore();
const toast = useToast();

const name = ref("");
const phone = ref("");
const email = ref("");
const password = ref("");

const loading = ref(false);
const error = ref("");

const onSubmit = async () => {
  error.value = "";
  if (!name.value || !phone.value || !password.value) {
    error.value = "Name, phone and password are required";
    return;
  }
  loading.value = true;
  try {
    await $publicApi("/v1/auth/register", {
      method: "POST",
      body: {
        name: name.value,
        phone: phone.value,
        email: email.value || null,
        password: password.value,
      },
    });

    // Auto-login after successful registration
    await auth.login(email.value || phone.value, password.value);
    await auth.fetchMe();
    toast.add({ title: "Account created!" });
    return navigateTo("/dashboard");
  } catch (e: any) {
    error.value =
      e?.data?.message || e?.data?.error || e?.message || "Registration failed";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen grid place-items-center px-4">
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-semibold">Create account</h1>
          <NuxtLink
            to="/auth/login"
            class="text-sm underline hover:no-underline"
          >
            Already have an account?
          </NuxtLink>
        </div>
      </template>

      <UForm @submit.prevent="onSubmit" class="grid gap-4">
        <UFormGroup label="Full name" name="name">
          <UInput v-model="name" placeholder="John Doe" class="w-full" />
        </UFormGroup>

        <UFormGroup label="Phone (required)" name="phone">
          <UInput v-model="phone" placeholder="017XXXXXXXX" class="w-full" />
        </UFormGroup>

        <UFormGroup label="Email (optional)" name="email">
          <UInput
            v-model="email"
            placeholder="you@example.com"
            class="w-full"
          />
        </UFormGroup>

        <UFormGroup
          label="Password"
          name="password"
          hint="Minimum 4 characters"
        >
          <UInput
            v-model="password"
            type="password"
            placeholder="••••"
            class="w-full"
          />
        </UFormGroup>

        <div v-if="error" class="text-red-600 text-sm">
          {{ error }}
        </div>

        <UButton :loading="loading" type="submit" block>
          Create account
        </UButton>
      </UForm>

      <template #footer>
        <p class="text-sm text-gray-500">
          By continuing you agree to our terms.
        </p>
      </template>
    </UCard>
  </div>
</template>
