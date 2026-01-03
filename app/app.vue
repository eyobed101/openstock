<script setup lang="ts">
const { settings } = useSettings();

useHead({
  titleTemplate: (titleChunk) => {
    return titleChunk ? `${titleChunk} - ${settings.value?.businessName || 'MezgebStock'}` : settings.value?.businessName || 'MezgebStock';
  }
});
</script>

<template>
  <div class="min-h-screen bg-background dark:bg-bluerain-900 transition-colors duration-300">
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <!-- Toast notification system -->
    <UiToastContainer />
  </div>
</template>
