<script setup lang="ts">
interface Props {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'page-change': [page: number];
}>();

// Calculate visible page numbers (show max 5 pages)
const visiblePages = computed(() => {
  const pages: number[] = [];
  const maxVisible = 5;
  
  if (props.totalPages <= maxVisible) {
    // Show all pages if total is less than max
    for (let i = 1; i <= props.totalPages; i++) {
      pages.push(i);
    }
  } else {
    // Show pages around current page
    let start = Math.max(1, props.currentPage - 2);
    let end = Math.min(props.totalPages, start + maxVisible - 1);
    
    // Adjust start if we're near the end
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
  }
  
  return pages;
});

const showFirstPage = computed(() => visiblePages.value[0] > 1);
const showLastPage = computed(() => visiblePages.value[visiblePages.value.length - 1] < props.totalPages);

const startItem = computed(() => (props.currentPage - 1) * props.itemsPerPage + 1);
const endItem = computed(() => Math.min(props.currentPage * props.itemsPerPage, props.totalItems));

function goToPage(page: number) {
  if (page >= 1 && page <= props.totalPages && page !== props.currentPage) {
    emit('page-change', page);
  }
}
</script>

<template>
  <div v-if="totalPages > 1" class="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 sm:px-6 rounded-b-lg">
    <!-- Mobile view -->
    <div class="flex flex-1 justify-between sm:hidden">
      <button
        :disabled="currentPage === 1"
        class="relative inline-flex items-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        @click="goToPage(currentPage - 1)"
      >
        Previous
      </button>
      <button
        :disabled="currentPage === totalPages"
        class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        @click="goToPage(currentPage + 1)"
      >
        Next
      </button>
    </div>

    <!-- Desktop view -->
    <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
      <div>
        <p class="text-sm text-gray-700 dark:text-gray-400">
          Showing
          <span class="font-medium">{{ startItem }}</span>
          to
          <span class="font-medium text-gray-900 dark:text-gray-100">{{ endItem }}</span>
          of
          <span class="font-medium text-gray-900 dark:text-gray-100">{{ totalItems }}</span>
          results
        </p>
      </div>
      <div>
        <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
          <!-- Previous button -->
          <button
            :disabled="currentPage === 1"
            class="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 dark:text-gray-500 ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            @click="goToPage(currentPage - 1)"
          >
            <span class="sr-only">Previous</span>
            <Icon name="lucide:chevron-left" class="h-5 w-5" />
          </button>

          <!-- First page -->
          <button
            v-if="showFirstPage"
            class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 focus:z-20 focus:outline-offset-0 transition-colors"
            @click="goToPage(1)"
          >
            1
          </button>
          <span v-if="showFirstPage && visiblePages[0] > 2" class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-gray-700">
            ...
          </span>

          <!-- Visible pages -->
          <button
            v-for="page in visiblePages"
            :key="page"
            :class="[
              'relative inline-flex items-center px-4 py-2 text-sm font-semibold transition-colors focus:z-20 focus:outline-offset-0',
              page === currentPage
                ? 'z-10 bg-primary-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600'
                : 'text-gray-900 dark:text-gray-100 ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            ]"
            @click="goToPage(page)"
          >
            {{ page }}
          </button>

          <!-- Last page -->
          <span v-if="showLastPage && visiblePages[visiblePages.length - 1] < totalPages - 1" class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-gray-700">
            ...
          </span>
          <button
            v-if="showLastPage"
            class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 focus:z-20 focus:outline-offset-0 transition-colors"
            @click="goToPage(totalPages)"
          >
            {{ totalPages }}
          </button>

          <!-- Next button -->
          <button
            :disabled="currentPage === totalPages"
            class="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 dark:text-gray-500 ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            @click="goToPage(currentPage + 1)"
          >
            <span class="sr-only">Next</span>
            <Icon name="lucide:chevron-right" class="h-5 w-5" />
          </button>
        </nav>
      </div>
    </div>
  </div>
</template>
