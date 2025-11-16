<script setup lang="ts">
definePageMeta({
  layout: "default",
});

useHead({
  title: "Application Submitted Successfully",
});

const route = useRoute();
const router = useRouter();

const applicationNo = computed(() => {
  return (route.query.application_no as string) || "N/A";
});

function printPage() {
  window.print();
}
</script>

<template>
  <UContainer>
    <div class="mx-auto max-w-2xl">
      <!-- Success Card -->
      <UCard class="text-center">
        <div class="py-8">
          <!-- Success Icon -->
          <div
            class="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-6"
          >
            <UIcon
              name="i-lucide-check-circle"
              class="h-10 w-10 text-green-600"
            />
          </div>

          <!-- Success Message -->
          <h1 class="text-2xl font-bold text-gray-900 mb-3">
            Application Submitted Successfully!
          </h1>

          <p class="text-gray-600 mb-6">
            Your admission application has been submitted and is under review by
            our admission committee.
          </p>

          <!-- Application Number -->
          <div class="bg-gray-50 rounded-lg p-6 mb-6 inline-block">
            <p class="text-sm text-gray-600 mb-2">Your Application Number</p>
            <p class="text-3xl font-bold text-primary">
              {{ applicationNo }}
            </p>
          </div>

          <!-- Important Notice -->
          <UAlert
            title="Important"
            description="Please save this application number. You will need it to check your application status."
            icon="i-lucide-info"
            color="primary"
            variant="soft"
            class="mb-6 text-left"
          />

          <!-- Next Steps -->
          <div class="text-left mb-6">
            <h2 class="text-lg font-semibold mb-3">What's Next?</h2>
            <ul class="space-y-2 text-sm text-gray-700">
              <li class="flex items-start gap-2">
                <UIcon
                  name="i-lucide-circle-check"
                  class="h-5 w-5 text-green-600 shrink-0 mt-0.5"
                />
                <span>
                  Our admission committee will review your application within
                  3-5 business days.
                </span>
              </li>
              <li class="flex items-start gap-2">
                <UIcon
                  name="i-lucide-circle-check"
                  class="h-5 w-5 text-green-600 shrink-0 mt-0.5"
                />
                <span>
                  You will be notified about the application status via phone or
                  email.
                </span>
              </li>
              <li class="flex items-start gap-2">
                <UIcon
                  name="i-lucide-circle-check"
                  class="h-5 w-5 text-green-600 shrink-0 mt-0.5"
                />
                <span>
                  You can check your application status anytime using your
                  application number and date of birth.
                </span>
              </li>
              <li class="flex items-start gap-2">
                <UIcon
                  name="i-lucide-circle-check"
                  class="h-5 w-5 text-green-600 shrink-0 mt-0.5"
                />
                <span>
                  If accepted, you will receive further instructions for
                  document submission and fee payment.
                </span>
              </li>
            </ul>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-4 justify-center">
            <UButton
              to="/public/admission/status"
              color="primary"
              icon="i-lucide-search"
            >
              Check Status
            </UButton>

            <UButton
              to="/public/admission"
              color="secondary"
              variant="outline"
              icon="i-lucide-home"
            >
              Back to Admission
            </UButton>
          </div>

          <!-- Print Application -->
          <div class="mt-6">
            <UButton
              color="secondary"
              variant="ghost"
              icon="i-lucide-printer"
              @click="printPage"
            >
              Print this Page
            </UButton>
          </div>
        </div>
      </UCard>

      <!-- Contact Info -->
      <div class="text-center mt-6 text-sm text-gray-500">
        <p>
          For any queries, please contact our admission office during working
          hours.
        </p>
      </div>
    </div>
  </UContainer>
</template>

<style>
@media print {
  .no-print {
    display: none !important;
  }
}
</style>
