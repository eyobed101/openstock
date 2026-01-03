<script setup lang="ts">
const { loggedIn } = useUserSession();
const { isCollapsed } = useSidebar();
</script>

<template>
  <!-- Main layout when authenticated -->
  <div v-if="loggedIn" class="flex h-screen overflow-hidden bg-gray-50 dark:bg-bluerain-950 transition-colors duration-300">
    <!-- Sidebar -->
    <AppSidebar />

    <!-- Main content area -->
    <div 
      class="flex flex-1 flex-col overflow-hidden transition-all duration-300 ease-in-out"
    >
      <!-- Header -->
      <AppHeader />

      <!-- Page content -->
      <main class="flex-1 overflow-auto">
        <div class="px-4 py-6 sm:px-6 lg:px-8">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
