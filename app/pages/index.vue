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
        <p class="mt-4 text-gray-600">দয়া করে অপেক্ষা করুন…</p>
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
            <h3 class="text-lg font-semibold">ডেটা লোড করা যাচ্ছে না</h3>
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
                  {{ meta?.name }} এ স্বাগতম
                </h1>
                <p class="text-xl text-gray-600">
                  একটি সমন্বিত শিক্ষা ব্যবস্থাপনা প্ল্যাটফর্ম
                </p>
              </div>
              <p class="text-lg text-gray-600 leading-relaxed">
                আমাদের সহজ‑ব্যবহারযোগ্য প্ল্যাটফর্মে ভর্তি, উপস্থিতি, ফি—সবকিছুই
                এক জায়গায়, ঝামেলামুক্তভাবে পরিচালনা করুন।
              </p>
              <div class="flex flex-col sm:flex-row gap-4 pt-4">
                <UButton size="lg" color="primary" icon="i-lucide-arrow-right">
                  শুরু করুন
                </UButton>
                <UButton size="lg" variant="outline" icon="i-lucide-play">
                  ডেমো দেখুন
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
            আমাদের সুবিধাগুলো
          </h2>
          <p class="text-lg text-gray-600">
            আপনার প্রতিষ্ঠান পরিচালনায় যা যা দরকার—সব একসাথে।
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
              ভর্তি ব্যবস্থাপনা
            </h3>
            <p class="text-gray-600">
              অনলাইন আবেদন ও স্বয়ংক্রিয় ধাপের মাধ্যমে ভর্তি প্রক্রিয়া সহজ ও
              দ্রুত করুন।
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
              উপস্থিতি ট্র্যাকিং
            </h3>
            <p class="text-gray-600">
              রিয়েল–টাইম উপস্থিতি, স্বয়ংক্রিয় রিপোর্ট আর নোটিফিকেশন—সব একসাথে।
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
              ফি ব্যবস্থাপনা
            </h3>
            <p class="text-gray-600">
              ফি ও পেমেন্ট ট্র্যাকিং, রিপোর্ট—সবকিছু স্বচ্ছভাবে।
            </p>
          </UCard>
        </div>
      </section>

      <!-- Admission Section -->
      <section class="mx-auto max-w-7xl px-4 py-12">
        <div
          class="relative overflow-hidden bg-gradient-to-br from-primary-500 via-primary-600 to-blue-600 rounded-3xl shadow-2xl"
        >
          <!-- Background Pattern -->
          <div
            class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYtMi42ODYgNi02cy0yLjY4Ni02LTYtNi02IDIuNjg2LTYgNiAyLjY4NiA2IDYgNm0wIDEyYzMuMzE0IDAgNi0yLjY4NiA2LTZzLTIuNjg2LTYtNi02LTYgMi42ODYtNiA2IDIuNjg2IDYgNiA2bTAgMTJjMy4zMTQgMCA2LTIuNjg2IDYtNnMtMi42ODYtNi02LTYtNiAyLjY4Ni02IDYgMi42ODYgNiA2IDZ6IiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iLjUiIG9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-10"
          ></div>

          <div class="relative px-6 py-16 sm:px-12 sm:py-20">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <!-- Left Content -->
              <div class="text-white space-y-6">
                <div
                  class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm"
                >
                  <UIcon name="i-lucide-sparkles" class="w-4 h-4" />
                  <span class="text-sm font-medium">অনলাইনে আবেদন চলছে</span>
                </div>

                <h2
                  class="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight"
                >
                  আজই ভর্তির আবেদন করুন<br />
                  <span class="text-white/90">শুরু হোক নতুন পথচলা</span>
                </h2>

                <p class="text-lg text-white/90 leading-relaxed">
                  কয়েক মিনিটেই অনলাইনে আবেদন করা যাবে। প্রক্রিয়াটা সহজ, দ্রুত আর
                  ঝামেলামুক্ত।
                </p>

                <!-- Features List -->
                <ul class="space-y-3 text-white/90">
                  <li class="flex items-start gap-3">
                    <UIcon
                      name="i-lucide-check-circle"
                      class="w-5 h-5 shrink-0 mt-0.5"
                    />
                    <span>দ্রুত, সহজ অনলাইন আবেদন</span>
                  </li>
                  <li class="flex items-start gap-3">
                    <UIcon
                      name="i-lucide-check-circle"
                      class="w-5 h-5 shrink-0 mt-0.5"
                    />
                    <span>আবেদনের অবস্থা তাৎক্ষণিকভাবে দেখুন</span>
                  </li>
                  <li class="flex items-start gap-3">
                    <UIcon
                      name="i-lucide-check-circle"
                      class="w-5 h-5 shrink-0 mt-0.5"
                    />
                    <span>নিরাপদে ডকুমেন্ট জমা</span>
                  </li>
                </ul>

                <!-- Action Buttons -->
                <div class="flex flex-col sm:flex-row gap-4 pt-4">
                  <UButton
                    to="/public/admission"
                    size="xl"
                    color="white"
                    icon="i-lucide-graduation-cap"
                    class="shadow-lg hover:shadow-xl transition-shadow"
                  >
                    ভর্তির জন্য আবেদন করুন
                  </UButton>

                  <UButton
                    to="/public/admission/status"
                    size="xl"
                    color="white"
                    variant="outline"
                    icon="i-lucide-search"
                    class="border-white/30 hover:bg-white/10"
                  >
                    স্ট্যাটাস দেখুন
                  </UButton>
                </div>
              </div>

              <!-- Right Content - Stats/Info Cards -->
              <div class="hidden lg:block space-y-4">
                <div
                  class="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
                >
                  <div class="flex items-center gap-4">
                    <div
                      class="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20"
                    >
                      <UIcon name="i-lucide-users" class="w-6 h-6 text-white" />
                    </div>
                    <div class="text-white">
                      <p class="text-2xl font-bold">১০০০+</p>
                      <p class="text-sm text-white/80">ভর্তিকৃত শিক্ষার্থী</p>
                    </div>
                  </div>
                </div>

                <div
                  class="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
                >
                  <div class="flex items-center gap-4">
                    <div
                      class="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20"
                    >
                      <UIcon name="i-lucide-award" class="w-6 h-6 text-white" />
                    </div>
                    <div class="text-white">
                      <p class="text-2xl font-bold">৯৫%</p>
                      <p class="text-sm text-white/80">সন্তুষ্টির হার</p>
                    </div>
                  </div>
                </div>

                <div
                  class="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
                >
                  <div class="flex items-center gap-4">
                    <div
                      class="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20"
                    >
                      <UIcon name="i-lucide-clock" class="w-6 h-6 text-white" />
                    </div>
                    <div class="text-white">
                      <p class="text-2xl font-bold">২৪/৭</p>
                      <p class="text-sm text-white/80">আবেদন সহায়তা</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Mobile Stats -->
            <div
              class="lg:hidden grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-white/20"
            >
              <div class="text-center text-white">
                <p class="text-2xl font-bold">১০০০+</p>
                <p class="text-xs text-white/80 mt-1">শিক্ষার্থী</p>
              </div>
              <div class="text-center text-white">
                <p class="text-2xl font-bold">৯৫%</p>
                <p class="text-xs text-white/80 mt-1">সন্তুষ্টি</p>
              </div>
              <div class="text-center text-white">
                <p class="text-2xl font-bold">২৪/৭</p>
                <p class="text-xs text-white/80 mt-1">সহায়তা</p>
              </div>
            </div>
          </div>
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
            <p class="text-gray-600 mt-2">প্রতিষ্ঠানের নাম</p>
          </div>
          <div class="text-center">
            <div class="text-3xl sm:text-4xl font-bold text-blue-600">
              {{ meta?.locale?.default || "EN" }}
            </div>
            <p class="text-gray-600 mt-2">ভাষা</p>
          </div>
          <div class="text-center">
            <div class="text-3xl sm:text-4xl font-bold text-green-600">
              {{ meta?.currency?.code || "USD" }}
            </div>
            <p class="text-gray-600 mt-2">মুদ্রা</p>
          </div>
          <div class="text-center">
            <div class="text-3xl sm:text-4xl font-bold text-purple-600">৩+</div>
            <p class="text-gray-600 mt-2">সক্রিয় মডিউল</p>
          </div>
        </div>
      </section>

      <!-- Tenant Info Section -->
      <section class="mx-auto max-w-7xl px-4 py-12">
        <UCard>
          <template #header>
            <h3 class="text-2xl font-bold text-gray-900">প্রতিষ্ঠানের বিবরণ</h3>
          </template>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div class="space-y-4">
              <div>
                <p class="text-sm font-medium text-gray-500 uppercase">
                  প্রতিষ্ঠানের নাম
                </p>
                <p class="text-lg text-gray-900 font-semibold">
                  {{ meta?.name }}
                </p>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-500 uppercase">
                  ডোমেইন
                </p>
                <p class="text-lg text-gray-900 font-semibold">
                  {{ meta?.domain }}
                </p>
              </div>
            </div>
            <div class="space-y-4">
              <div>
                <p class="text-sm font-medium text-gray-500 uppercase">
                  ডিফল্ট ভাষা
                </p>
                <p class="text-lg text-gray-900 font-semibold">
                  {{ meta?.locale?.default }}
                </p>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-500 uppercase">
                  মুদ্রা
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
            প্রতিষ্ঠান পরিচালনা আরও সহজ করতে প্রস্তুত?
          </h2>
          <p class="text-lg text-white/90 max-w-2xl mx-auto">
            সারা দেশের শত শত প্রতিষ্ঠান আমাদের প্ল্যাটফর্মে কাজ করছে—আপনিও
            কাজগুলো গুছিয়ে নিন, ফলও মিলবে দ্রুত।
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <UButton
              size="lg"
              color="white"
              variant="soft"
              icon="i-lucide-arrow-right"
            >
              বিনামূল্যে ট্রায়াল শুরু করুন
            </UButton>
            <UButton
              size="lg"
              color="white"
              variant="outline"
              icon="i-lucide-phone"
            >
              সেলস টিমের সাথে কথা বলুন
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
