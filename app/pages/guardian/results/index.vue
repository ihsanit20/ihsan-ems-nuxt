<script setup lang="ts">
definePageMeta({
  layout: "guardian",
  middleware: "auth",
  requiresAuth: true,
  roles: ["Guardian", "Owner", "Admin", "Developer"],
});

useHead({ title: "Results" });

const summary = [
  { label: "Last exam", value: "Half-Yearly", icon: "i-lucide-notebook-pen" },
  { label: "Overall GPA", value: "4.80", icon: "i-lucide-award" },
  { label: "Position", value: "3rd", icon: "i-lucide-trophy" },
  { label: "Attendance", value: "92%", icon: "i-lucide-activity" },
];

const subjects = [
  { name: "Mathematics", score: 95, grade: "A+", remark: "Excellent" },
  { name: "Science", score: 89, grade: "A", remark: "Good progress" },
  { name: "English", score: 85, grade: "A", remark: "Keep practicing writing" },
  { name: "Bangla", score: 78, grade: "B+", remark: "Focus on grammar" },
  { name: "ICT", score: 92, grade: "A+", remark: "Very strong" },
];
</script>

<template>
  <UContainer class="space-y-6 pb-8">
    <UCard
      class="border-none bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 text-white"
    >
      <div class="flex flex-col md:flex-row md:items-center md:justify-between">
        <div class="space-y-2">
          <p class="text-sm text-white/80">Guardian · Results</p>
          <h1 class="text-3xl font-bold">ফলাফল ও রিপোর্ট</h1>
          <p class="text-white/80 max-w-3xl">
            এই পেজে বর্তমানে ডেমো ডাটা দেখানো হচ্ছে। যখন রেজাল্ট API যুক্ত হবে,
            এখানে পরীক্ষার ফলাফল, GPA ও মন্তব্য দেখা যাবে।
          </p>
          <div class="flex flex-wrap gap-3 pt-2">
            <UButton
              color="white"
              variant="solid"
              icon="i-lucide-bar-chart-2"
              disabled
            >
              Download PDF (coming soon)
            </UButton>
            <UButton color="white" variant="soft" icon="i-lucide-mail" disabled>
              Share with email
            </UButton>
          </div>
        </div>
        <div
          class="mt-6 md:mt-0 rounded-2xl bg-white/10 border border-white/20 px-5 py-4 text-sm space-y-2"
        >
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-calendar" class="h-4 w-4" />
            <span>পরীক্ষা: ২০২৫ হাফ ইয়ারলি (নমুনা)</span>
          </div>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-info" class="h-4 w-4" />
            <span>সম্পূর্ণ রেজাল্ট ডাটা শীঘ্রই যুক্ত হবে</span>
          </div>
        </div>
      </div>
    </UCard>

    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <UCard v-for="item in summary" :key="item.label">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">{{ item.label }}</p>
            <p class="text-2xl font-bold">{{ item.value }}</p>
          </div>
          <div
            class="h-10 w-10 rounded-lg bg-white text-primary flex items-center justify-center shadow-sm"
          >
            <UIcon :name="item.icon" class="h-5 w-5 text-primary" />
          </div>
        </div>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Subject wise</p>
            <p class="font-semibold">বিষয়ভিত্তিক নম্বর (ডেমো)</p>
          </div>
          <UBadge color="info" variant="soft">Static sample</UBadge>
        </div>
      </template>
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="text-left text-gray-500">
              <th class="py-2">Subject</th>
              <th class="py-2">Score</th>
              <th class="py-2">Grade</th>
              <th class="py-2">Remark</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="sub in subjects" :key="sub.name">
              <td class="py-2 font-medium text-gray-900">{{ sub.name }}</td>
              <td class="py-2 text-gray-600">{{ sub.score }}</td>
              <td class="py-2">
                <UBadge color="primary" variant="subtle">{{ sub.grade }}</UBadge>
              </td>
              <td class="py-2 text-gray-600">{{ sub.remark }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-check-circle" class="h-4 w-4 text-primary" />
          <p class="font-semibold">পরবর্তী আপডেট</p>
        </div>
      </template>
      <ul class="list-disc pl-5 space-y-1 text-sm text-gray-600">
        <li>রেজাল্ট হিস্ট্রি ও ডাউনলোডযোগ্য রিপোর্ট কার্ড।</li>
        <li>সাবজেক্টভিত্তিক মন্তব্য ও ফিডব্যাক।</li>
        <li>গ্রেডভিত্তিক গ্রাফ ও ট্রেন্ড চার্ট।</li>
      </ul>
    </UCard>
  </UContainer>
</template>
