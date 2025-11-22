<script setup lang="ts">
definePageMeta({
  layout: "guardian",
  middleware: "auth",
  requiresAuth: true,
  roles: ["Guardian", "Owner", "Admin", "Developer"],
});

import { useHead, useToast } from "#imports";
import type { FeeInvoice } from "~/types/models/fee-invoice";
import type { AdmissionApplication } from "~/types/models/admission";

useHead({ title: "Guardian Dashboard" });

const auth = useAuthStore();
const tenantStore = useTenantStore();
const invoiceStore = useFeeInvoiceStore();
const admissionStore = useAdmissionApplicationStore();
const toast = useToast();

const { meta: tenant } = storeToRefs(tenantStore);
const { feeInvoices, loading: invoiceLoading } = storeToRefs(invoiceStore);
const {
  myItems: myApplications,
  myLoading: applicationsLoading,
} = storeToRefs(admissionStore);

onMounted(async () => {
  await Promise.allSettled([loadInvoices(), loadApplications()]);
});

async function loadInvoices() {
  try {
    await invoiceStore.fetchFeeInvoices({ per_page: 50 });
  } catch (e: any) {
    toast.add({
      color: "error",
      title: "Invoices not available",
      description: e?.data?.message || e?.message,
    });
  }
}

async function loadApplications() {
  try {
    await admissionStore.fetchMyApplications();
  } catch (e: any) {
    toast.add({
      color: "error",
      title: "Applications not available",
      description: e?.data?.message || e?.message,
    });
  }
}

const guardianName = computed(() => auth.user?.name || "Guardian");
const instituteName = computed(
  () => tenant.value?.shortName || tenant.value?.name || "your institute"
);

function safeTime(val?: string | null) {
  const t = val ? Date.parse(val) : NaN;
  return Number.isFinite(t) ? t : 0;
}

function formatDate(date?: string | null): string {
  if (!date) return "—";
  const formatted = new Date(date);
  return Number.isNaN(formatted.getTime())
    ? date
    : formatted.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function statusColor(status?: string) {
  switch (status) {
    case "paid":
      return "success";
    case "partial":
      return "warning";
    case "pending":
      return "info";
    case "accepted":
    case "admitted":
      return "success";
    case "rejected":
      return "error";
    default:
      return "neutral";
  }
}

const childCount = computed(() => {
  const ids = new Set<number>();
  for (const inv of feeInvoices.value || []) {
    if (inv?.student_id) ids.add(inv.student_id);
  }
  return ids.size;
});

const invoiceStats = computed(() => {
  const invoices = feeInvoices.value || [];
  let pending = 0;
  let partial = 0;
  let paid = 0;
  let dueAmount = 0;

  for (const inv of invoices) {
    if (inv.status === "pending") pending += 1;
    if (inv.status === "partial") partial += 1;
    if (inv.status === "paid") paid += 1;
    if (inv.status === "pending" || inv.status === "partial") {
      dueAmount += Number(inv.payable_amount || 0);
    }
  }

  return { pending, partial, paid, dueAmount };
});

const nextDueInvoice = computed<FeeInvoice | null>(() => {
  const dues = (feeInvoices.value || []).filter(
    (inv) => inv.status === "pending" || inv.status === "partial"
  );
  if (!dues.length) return null;
  return dues
    .slice()
    .sort(
      (a, b) =>
        (safeTime(a.due_date || a.invoice_date) || 0) -
        (safeTime(b.due_date || b.invoice_date) || 0)
    )[0];
});

const recentInvoices = computed<FeeInvoice[]>(() => {
  return (feeInvoices.value || [])
    .slice()
    .sort(
      (a, b) =>
        (safeTime(b.invoice_date || b.created_at) || 0) -
        (safeTime(a.invoice_date || a.created_at) || 0)
    )
    .slice(0, 4);
});

const applicationStats = computed(() => {
  const apps = myApplications.value || [];
  let pending = 0;
  let accepted = 0;
  let admitted = 0;
  let rejected = 0;

  for (const app of apps) {
    if (app.status === "pending") pending += 1;
    if (app.status === "accepted") accepted += 1;
    if (app.status === "admitted") admitted += 1;
    if (app.status === "rejected") rejected += 1;
  }

  return { pending, accepted, admitted, rejected };
});

const latestApplications = computed<AdmissionApplication[]>(() => {
  return (myApplications.value || [])
    .slice()
    .sort(
      (a, b) =>
        (safeTime(b.created_at || b.application_date) || 0) -
        (safeTime(a.created_at || a.application_date) || 0)
    )
    .slice(0, 4);
});
</script>

<template>
  <UContainer class="space-y-6 pb-10">
    <div class="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <!-- Hero -->
      <div
        class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-600 via-blue-600 to-indigo-600 text-white"
      >
        <div
          class="absolute inset-0 opacity-20"
          style="
            background-image: radial-gradient(circle at 20% 20%, #fff 2px, transparent 0),
              radial-gradient(circle at 80% 0%, #fff 2px, transparent 0);
            background-size: 120px 120px;
          "
        />
        <div class="relative p-6 sm:p-8 space-y-4">
          <div class="flex items-center gap-2 text-sm text-white/80">
            <UIcon name="i-lucide-shield-check" class="h-4 w-4" />
            <span>Guardian Portal</span>
          </div>
          <div class="space-y-2">
            <h1 class="text-3xl sm:text-4xl font-bold">
              হ্যালো, {{ guardianName }}
            </h1>
            <p class="text-white/80 text-sm sm:text-base max-w-2xl">
              আপনার সন্তানের অগ্রগতি, ফি এবং ভর্তি আবেদন—সবকিছু একসাথে দেখুন।
              {{ instituteName }} থেকে নতুন আপডেট এই প্যানেলে।
            </p>
          </div>

          <div class="flex flex-wrap gap-3 pt-2">
            <UButton
              color="white"
              variant="solid"
              icon="i-lucide-banknote"
              to="/guardian/fees"
            >
              ফি ড্যাশবোর্ড
            </UButton>
            <UButton
              color="white"
              variant="soft"
              icon="i-lucide-graduation-cap"
              to="/guardian/admissions/applications"
            >
              ভর্তি আবেদনগুলো
            </UButton>
          </div>
        </div>
      </div>

      <!-- Next steps -->
      <UCard class="h-full">
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">আপনার পরবর্তী কাজ</p>
              <p class="font-semibold">Action Center</p>
            </div>
            <UIcon name="i-lucide-bell" class="h-5 w-5 text-primary" />
          </div>
        </template>

        <div class="space-y-4">
          <div class="flex items-start gap-3">
            <div
              class="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center"
            >
              <UIcon name="i-lucide-calendar-clock" class="h-4 w-4" />
            </div>
            <div class="flex-1">
              <p class="font-medium">
                {{
                  nextDueInvoice
                    ? "আগামী ফি জমা দিন"
                    : "কোনো বকেয়া নেই"
                }}
              </p>
              <p class="text-sm text-gray-500">
                {{
                  nextDueInvoice
                    ? `Invoice #${nextDueInvoice.invoice_no} — ${formatDate(
                        nextDueInvoice.due_date || nextDueInvoice.invoice_date
                      )}`
                    : "সব ফি পরিশোধিত আছে।"
                }}
              </p>
            </div>
            <UButton
              variant="ghost"
              size="xs"
              color="primary"
              :disabled="!nextDueInvoice"
              :to="
                nextDueInvoice
                  ? `/guardian/fees/invoices/${nextDueInvoice.id}`
                  : undefined
              "
            >
              দেখুন
            </UButton>
          </div>

          <div class="flex items-start gap-3">
            <div
              class="h-9 w-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center"
            >
              <UIcon name="i-lucide-clipboard-list" class="h-4 w-4" />
            </div>
            <div class="flex-1">
              <p class="font-medium">ভর্তি আবেদনের অগ্রগতি</p>
              <p class="text-sm text-gray-500">
                {{
                  applicationStats.pending || applicationStats.accepted
                    ? "চলমান আবেদনের স্ট্যাটাস চেক করুন।"
                    : "কোনো নতুন আবেদন নেই।"
                }}
              </p>
            </div>
            <UButton
              variant="ghost"
              size="xs"
              color="primary"
              to="/guardian/admissions/applications"
            >
              ম্যানেজ
            </UButton>
          </div>

          <div class="flex items-start gap-3">
            <div
              class="h-9 w-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center"
            >
              <UIcon name="i-lucide-messages-square" class="h-4 w-4" />
            </div>
            <div class="flex-1">
              <p class="font-medium">নোটিফিকেশন</p>
              <p class="text-sm text-gray-500">
                নতুন কোনো নোটিফিকেশন নেই। স্কুল থেকে মেসেজ এলে এখানে দেখাবে।
              </p>
            </div>
            <UButton variant="ghost" size="xs" color="neutral"> Refresh </UButton>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">সংযুক্ত সন্তান</p>
            <p class="text-2xl font-bold">{{ childCount }}</p>
          </div>
          <div
            class="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"
          >
            <UIcon name="i-lucide-users" class="h-5 w-5" />
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">মোট বকেয়া</p>
            <p class="text-2xl font-bold text-red-600">
              ৳{{ invoiceStats.dueAmount.toFixed(2) }}
            </p>
          </div>
          <div
            class="h-10 w-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center"
          >
            <UIcon name="i-lucide-alert-circle" class="h-5 w-5" />
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">পেন্ডিং ইনভয়েস</p>
            <p class="text-2xl font-bold">
              {{ invoiceStats.pending + invoiceStats.partial }}
            </p>
          </div>
          <div
            class="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center"
          >
            <UIcon name="i-lucide-clock-3" class="h-5 w-5" />
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">আবেদন চলছে</p>
            <p class="text-2xl font-bold">
              {{ applicationStats.pending + applicationStats.accepted }}
            </p>
          </div>
          <div
            class="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"
          >
            <UIcon name="i-lucide-clipboard-check" class="h-5 w-5" />
          </div>
        </div>
      </UCard>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <!-- Recent invoices -->
      <UCard class="xl:col-span-2">
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">শেষ ৪টি ইনভয়েস</p>
              <p class="font-semibold">Recent Invoices</p>
            </div>
            <UButton
              to="/guardian/fees"
              variant="ghost"
              color="primary"
              size="sm"
              icon="i-lucide-arrow-right"
            >
              সব দেখুন
            </UButton>
          </div>
        </template>

        <div v-if="invoiceLoading" class="space-y-3">
          <USkeleton v-for="i in 3" :key="i" class="h-14" />
        </div>
        <div
          v-else-if="recentInvoices.length === 0"
          class="text-center py-10 text-sm text-gray-500"
        >
          কোনো ইনভয়েস পাওয়া যায়নি।
        </div>
        <div v-else class="divide-y divide-gray-100">
          <div
            v-for="invoice in recentInvoices"
            :key="invoice.id"
            class="flex items-center justify-between gap-4 py-3"
          >
            <div class="min-w-0">
              <p class="font-semibold truncate">
                Invoice #{{ invoice.invoice_no }}
              </p>
              <p class="text-xs text-gray-500">
                {{ formatDate(invoice.due_date || invoice.invoice_date) }}
              </p>
              <p class="text-xs text-gray-500" v-if="invoice.student?.name_bn">
                {{ invoice.student.name_bn }}
              </p>
            </div>
            <div class="text-right">
              <p class="font-semibold">
                ৳{{ Number(invoice.payable_amount || 0).toFixed(2) }}
              </p>
              <UBadge
                :color="statusColor(invoice.status)"
                variant="subtle"
                class="capitalize mt-1"
              >
                {{ invoice.status || "unknown" }}
              </UBadge>
            </div>
            <UButton
              size="xs"
              variant="outline"
              color="primary"
              :to="`/guardian/fees/invoices/${invoice.id}`"
            >
              Details
            </UButton>
          </div>
        </div>
      </UCard>

      <!-- Applications -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">ভর্তি আপডেট</p>
              <p class="font-semibold">Applications</p>
            </div>
            <UButton
              to="/guardian/admissions/applications"
              variant="ghost"
              size="sm"
              color="primary"
            >
              ম্যানেজ
            </UButton>
          </div>
        </template>

        <div v-if="applicationsLoading" class="space-y-3">
          <USkeleton v-for="i in 3" :key="i" class="h-12" />
        </div>
        <div
          v-else-if="latestApplications.length === 0"
          class="text-center py-10 text-sm text-gray-500"
        >
          কোনো আবেদন নেই। নতুন আবেদন শুরু করুন।
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="app in latestApplications"
            :key="app.id"
            class="rounded-xl border border-gray-100 p-3"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="font-semibold truncate">
                {{ app.applicant_name || "Applicant" }}
              </p>
              <UBadge
                :color="statusColor(app.status)"
                variant="soft"
                class="capitalize"
              >
                {{ app.status }}
              </UBadge>
            </div>
            <p class="text-xs text-gray-500">
              {{ app.application_no }} · {{ formatDate(app.created_at) }}
            </p>
            <p class="text-xs text-gray-500">
              {{ app.session?.name || "Session" }} —
              {{ app.session_grade?.grade?.name || "Class" }}
            </p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Quick links -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-compass" class="h-4 w-4 text-primary" />
          <p class="font-semibold">Quick Links</p>
        </div>
      </template>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <UButton
          to="/guardian/fees"
          variant="soft"
          color="primary"
          icon="i-lucide-wallet"
          class="justify-start"
        >
          Fee overview
        </UButton>
        <UButton
          to="/guardian/attendance"
          variant="soft"
          color="neutral"
          icon="i-lucide-calendar-days"
          class="justify-start"
        >
          Attendance
        </UButton>
        <UButton
          to="/guardian/results"
          variant="soft"
          color="neutral"
          icon="i-lucide-file-bar-chart"
          class="justify-start"
        >
          Results
        </UButton>
        <UButton
          to="/guardian/students"
          variant="soft"
          color="neutral"
          icon="i-lucide-badge-check"
          class="justify-start"
        >
          Student profiles
        </UButton>
      </div>
    </UCard>
  </UContainer>
</template>
