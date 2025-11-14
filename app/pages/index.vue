<template>
  <div class="w-full">
    <!-- Loading State -->
    <div
      v-if="status === 'loading'"
      class="flex items-center justify-center min-h-screen"
    >
      <div class="text-center">
        <div
          class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"
        ></div>
        <p class="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>

    <!-- Error State -->
    <div
      v-else-if="status === 'error'"
      class="min-h-screen flex items-center justify-center px-4"
    >
      <UCard class="w-full max-w-md">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-alert-circle" class="w-5 h-5 text-red-500" />
            <h3 class="text-lg font-semibold">Error Loading</h3>
          </div>
        </template>
        <p class="text-gray-600">{{ error }}</p>
      </UCard>
    </div>

    <!-- Main Content -->
    <div v-else class="space-y-16">
      <!-- Hero Section -->
      <section class="relative overflow-hidden">
        <div
          class="absolute inset-0 bg-gradient-to-br from-primary-50 to-blue-50 -z-10"
        ></div>
        <div class="mx-auto max-w-7xl px-4 py-20 sm:py-28">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div class="space-y-6">
              <div class="space-y-2">
                <h1
                  class="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight"
                >
                  Welcome to {{ meta?.name }}
                </h1>
                <p class="text-xl text-gray-600">
                  Comprehensive Education Management System
                </p>
              </div>
              <p class="text-lg text-gray-600 leading-relaxed">
                Streamline your educational institution with our powerful and
                intuitive management platform. Manage admissions, attendance,
                fees, and more in one place.
              </p>
              <div class="flex flex-col sm:flex-row gap-4 pt-4">
                <UButton size="lg" color="primary" icon="i-lucide-arrow-right">
                  Get Started
                </UButton>
                <UButton size="lg" variant="outline" icon="i-lucide-play">
                  Watch Demo
                </UButton>
              </div>
            </div>
            <div class="hidden md:block">
              <div class="relative">
                <div
                  class="absolute inset-0 bg-gradient-to-br from-primary-400 to-blue-400 rounded-2xl blur-3xl opacity-20"
                ></div>
                <div
                  class="relative bg-gradient-to-br from-primary-500 to-blue-500 rounded-2xl p-8 text-white"
                >
                  <div class="space-y-4">
                    <div class="h-3 bg-white/20 rounded w-3/4"></div>
                    <div class="h-3 bg-white/20 rounded w-full"></div>
                    <div class="h-3 bg-white/20 rounded w-5/6"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section class="mx-auto max-w-7xl px-4 py-12">
        <div class="text-center mb-12">
          <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Powerful Features
          </h2>
          <p class="text-lg text-gray-600">
            Everything you need to manage your institution efficiently
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <!-- Feature Card 1 -->
          <UCard
            v-if="meta?.features?.admission"
            class="hover:shadow-lg transition-shadow"
          >
            <template #header>
              <div
                class="flex items-center justify-center w-12 h-12 rounded-lg bg-primary-100 mb-4"
              >
                <UIcon
                  name="i-lucide-user-plus"
                  class="w-6 h-6 text-primary-600"
                />
              </div>
            </template>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">
              Admission Management
            </h3>
            <p class="text-gray-600">
              Streamline the admission process with automated workflows and
              online applications.
            </p>
          </UCard>

          <!-- Feature Card 2 -->
          <UCard
            v-if="meta?.features?.attendance"
            class="hover:shadow-lg transition-shadow"
          >
            <template #header>
              <div
                class="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100 mb-4"
              >
                <UIcon
                  name="i-lucide-calendar-check"
                  class="w-6 h-6 text-blue-600"
                />
              </div>
            </template>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">
              Attendance Tracking
            </h3>
            <p class="text-gray-600">
              Real-time attendance monitoring with automated reports and
              notifications.
            </p>
          </UCard>

          <!-- Feature Card 3 -->
          <UCard
            v-if="meta?.features?.fees"
            class="hover:shadow-lg transition-shadow"
          >
            <template #header>
              <div
                class="flex items-center justify-center w-12 h-12 rounded-lg bg-green-100 mb-4"
              >
                <UIcon
                  name="i-lucide-credit-card"
                  class="w-6 h-6 text-green-600"
                />
              </div>
            </template>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">
              Fee Management
            </h3>
            <p class="text-gray-600">
              Manage fees, payments, and financial records with complete
              transparency.
            </p>
          </UCard>
        </div>
      </section>

      <!-- Stats Section -->
      <section
        class="mx-auto max-w-7xl px-4 py-12 bg-gradient-to-r from-primary-50 to-blue-50 rounded-2xl"
      >
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div class="text-center">
            <div class="text-3xl sm:text-4xl font-bold text-primary-600">
              {{ meta?.name?.length || 0 }}
            </div>
            <p class="text-gray-600 mt-2">Institution Name</p>
          </div>
          <div class="text-center">
            <div class="text-3xl sm:text-4xl font-bold text-blue-600">
              {{ meta?.locale?.default || "EN" }}
            </div>
            <p class="text-gray-600 mt-2">Language</p>
          </div>
          <div class="text-center">
            <div class="text-3xl sm:text-4xl font-bold text-green-600">
              {{ meta?.currency?.code || "USD" }}
            </div>
            <p class="text-gray-600 mt-2">Currency</p>
          </div>
          <div class="text-center">
            <div class="text-3xl sm:text-4xl font-bold text-purple-600">3+</div>
            <p class="text-gray-600 mt-2">Active Modules</p>
          </div>
        </div>
      </section>

      <!-- Tenant Info Section -->
      <section class="mx-auto max-w-7xl px-4 py-12">
        <UCard>
          <template #header>
            <h3 class="text-2xl font-bold text-gray-900">
              Institution Details
            </h3>
          </template>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div class="space-y-4">
              <div>
                <p class="text-sm font-medium text-gray-500 uppercase">
                  Institution Name
                </p>
                <p class="text-lg text-gray-900 font-semibold">
                  {{ meta?.name }}
                </p>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-500 uppercase">
                  Domain
                </p>
                <p class="text-lg text-gray-900 font-semibold">
                  {{ meta?.domain }}
                </p>
              </div>
            </div>
            <div class="space-y-4">
              <div>
                <p class="text-sm font-medium text-gray-500 uppercase">
                  Default Language
                </p>
                <p class="text-lg text-gray-900 font-semibold">
                  {{ meta?.locale?.default }}
                </p>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-500 uppercase">
                  Currency
                </p>
                <p class="text-lg text-gray-900 font-semibold">
                  {{ meta?.currency?.code }}
                </p>
              </div>
            </div>
          </div>
        </UCard>
      </section>

      <!-- CTA Section -->
      <section
        class="mx-auto max-w-7xl px-4 py-16 bg-gradient-to-r from-primary-600 to-blue-600 rounded-2xl text-white"
      >
        <div class="text-center space-y-6">
          <h2 class="text-3xl sm:text-4xl font-bold">
            Ready to Transform Your Institution?
          </h2>
          <p class="text-lg text-white/90 max-w-2xl mx-auto">
            Join hundreds of educational institutions using our platform to
            streamline operations and improve student outcomes.
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <UButton
              size="lg"
              color="white"
              variant="soft"
              icon="i-lucide-arrow-right"
            >
              Start Free Trial
            </UButton>
            <UButton
              size="lg"
              color="white"
              variant="outline"
              icon="i-lucide-phone"
            >
              Contact Sales
            </UButton>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";

definePageMeta({ layout: "default" });

const store = useTenantStore();
const { meta, status, error } = storeToRefs(store);
</script>
