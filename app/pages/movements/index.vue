<script setup lang="ts">
import type { StockMovement } from '~~/server/database/schema';

const toast = useToast();

// Pagination state
const page = ref(1);
const limit = ref(20);

// Filters - must be defined before useFetch
const filters = reactive({
  search: '',
  type: '' as '' | 'in' | 'out' | 'adjustment',
  productId: '',
  startDate: '',
  endDate: '',
});

// Fetch movements with pagination
const { data: movementsResponse, pending, refresh } = await useFetch('/api/movements', {
  query: computed(() => ({
    page: page.value,
    limit: limit.value,
    type: filters.type || undefined,
    productId: filters.productId || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
  })),
  watch: [page, limit],
});

const movements = computed(() => movementsResponse.value?.data || []);
const pagination = computed(() => movementsResponse.value?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });

// Modal state
const isModalOpen = ref(false);
const isSubmitting = ref(false);

// Form state
const form = reactive({
  productId: '',
  type: 'in' as 'in' | 'out' | 'adjustment',
  quantity: 1,
  reason: '',
  reference: '',
  supplierId: '',
});

// Fetch products and suppliers for dropdowns
const { data: productsResponse } = await useFetch('/api/products', { query: { limit: 100 } });
const products = computed(() => productsResponse.value?.data || []);
const { data: suppliers } = await useFetch('/api/suppliers');

// Since filtering is now server-side, just return movements as-is
const filteredMovements = computed(() => movements.value || []);

function handlePageChange(newPage: number) {
  page.value = newPage;
  // Scroll to top of table
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearFilters() {
  filters.search = '';
  filters.type = '';
  filters.productId = '';
  filters.startDate = '';
  filters.endDate = '';
  page.value = 1;
  refresh();
}

function applyFilters() {
  page.value = 1;
  refresh();
}

const hasActiveFilters = computed(() => {
  return filters.search || filters.type || filters.productId || filters.startDate || filters.endDate;
});

// Table columns
const columns = [
  { key: 'date', label: 'Date' },
  { key: 'product', label: 'Product' },
  { key: 'type', label: 'Type' },
  { key: 'quantity', label: 'Qty', class: 'text-right' },
  { key: 'stock', label: 'After', class: 'text-right' },
  { key: 'reference', label: 'Reference' },
];

const movementTypes = [
  {
    value: 'in',
    label: 'In',
    description: 'Receive',
    icon: 'lucide:arrow-down',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  {
    value: 'out',
    label: 'Out',
    description: 'Sales',
    icon: 'lucide:arrow-up',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  {
    value: 'adjustment',
    label: 'Adjust',
    description: 'Correction',
    icon: 'lucide:settings-2',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
];

function openCreateModal() {
  resetForm();
  isModalOpen.value = true;
}

function resetForm() {
  Object.assign(form, {
    productId: '',
    type: 'in',
    quantity: 1,
    reason: '',
    reference: '',
    supplierId: '',
  });
}

// Get selected product details
const selectedProduct = computed(() => {
  if (!form.productId || !products.value) return null;
  return products.value.find(p => p.id === form.productId);
});

// Calculate stock after movement
const stockAfterMovement = computed(() => {
  if (!selectedProduct.value) return null;
  const currentStock = selectedProduct.value.stockQuantity || 0;
  const qty = form.quantity || 0;
  
  if (form.type === 'in') {
    return currentStock + qty;
  } else if (form.type === 'out') {
    return currentStock - qty;
  } else {
    return currentStock; // adjustment will be handled differently
  }
});

async function createMovement() {
  if (!form.productId) {
    toast.warning('Select a product');
    return;
  }

  isSubmitting.value = true;
  try {
    await $fetch('/api/movements', {
      method: 'POST',
      body: form,
    });
    toast.success('Movement recorded');
    isModalOpen.value = false;
    refresh();
  } catch (error) {
    toast.error('Failed to record');
    console.error('Failed to create movement:', error);
  } finally {
    isSubmitting.value = false;
  }
}

function getMovementType(type: string) {
  return movementTypes.find((t) => t.value === type) || movementTypes[0];
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg font-semibold text-gray-900">Stock Movements</h1>
        <p class="text-xs text-gray-500">Track inventory changes</p>
      </div>
      <button 
        class="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2" 
        @click="openCreateModal"
      >
        <Icon name="lucide:plus" class="h-4 w-4" />
        New Movement
      </button>
    </div>

    <!-- Quick action buttons -->
    <div class="flex gap-2">
      <button
        class="flex items-center gap-1.5 rounded border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
        @click="
          openCreateModal();
          form.type = 'in';
        "
      >
        <Icon name="lucide:arrow-down" class="h-3.5 w-3.5" />
        Stock In
      </button>
      <button
        class="flex items-center gap-1.5 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
        @click="
          openCreateModal();
          form.type = 'out';
        "
      >
        <Icon name="lucide:arrow-up" class="h-3.5 w-3.5" />
        Stock Out
      </button>
      <button
        class="flex items-center gap-1.5 rounded border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
        @click="
          openCreateModal();
          form.type = 'adjustment';
        "
      >
        <Icon name="lucide:settings-2" class="h-3.5 w-3.5" />
        Adjust
      </button>
    </div>

    <!-- Filters -->
    <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-gray-100">
        <div class="flex items-center gap-2">
          <div class="p-1.5 bg-gray-50 rounded-lg text-gray-500">
            <Icon name="lucide:filter" class="h-4 w-4" />
          </div>
          <h3 class="text-sm font-semibold text-gray-900">Search & Filters</h3>
        </div>
        <button
          v-if="hasActiveFilters"
          class="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors border border-gray-200 shadow-sm"
          @click="clearFilters"
        >
          <Icon name="lucide:rotate-ccw" class="h-3.5 w-3.5" />
          Clear All
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Date Range -->
        <div class="lg:col-span-2">
          <label class="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">Date Range</label>
          <div class="grid grid-cols-2 gap-3">
            <div class="relative">
              <Icon name="lucide:calendar" class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                v-model="filters.startDate"
                type="date"
                class="flex h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:border-transparent"
                @change="applyFilters"
              />
            </div>
            <div class="relative">
              <Icon name="lucide:calendar" class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                v-model="filters.endDate"
                type="date"
                class="flex h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:border-transparent"
                @change="applyFilters"
              />
            </div>
          </div>
        </div>

        <!-- Type filter -->
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">Movement Type</label>
          <div class="relative">
            <Icon name="lucide:list" class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <select
              v-model="filters.type"
              class="flex h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-10 py-2.5 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:border-transparent appearance-none"
              @change="applyFilters"
            >
              <option value="">All Types</option>
              <option value="in">Stock In</option>
              <option value="out">Stock Out</option>
              <option value="adjustment">Adjustment</option>
            </select>
            <Icon name="lucide:chevron-down" class="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <!-- Product filter -->
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">Select Product</label>
          <div class="relative">
            <Icon name="lucide:package" class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <select
              v-model="filters.productId"
              class="flex h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-10 py-2.5 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:border-transparent appearance-none"
              @change="applyFilters"
            >
              <option value="">All Products</option>
              <option
                v-for="product in products"
                :key="product.id"
                :value="product.id"
              >
                {{ product.name }}
              </option>
            </select>
            <Icon name="lucide:chevron-down" class="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <!-- Results info -->
      <div v-if="movements" class="flex items-center justify-between pt-3 border-t border-gray-100">
        <div class="flex items-center gap-2 text-xs text-gray-500">
          <Icon name="lucide:info" class="h-3.5 w-3.5" />
          <span>Showing {{ pagination.page * pagination.limit - pagination.limit + 1 }}-{{ Math.min(pagination.page * pagination.limit, pagination.total) }} of {{ pagination.total }} records</span>
        </div>
        <button
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors"
          @click="refresh"
        >
          <Icon name="lucide:refresh-cw" class="h-3.5 w-3.5" :class="{ 'animate-spin': pending }" />
          Reload Data
        </button>
      </div>
    </div>

    <!-- Movements Table -->
    <div class="card overflow-hidden">
      <UiDataTable
        :columns="columns"
        :data="filteredMovements"
        :loading="pending"
        empty-title="No movements"
        empty-description="Record stock changes here."
        empty-icon="lucide:arrow-left-right"
      >
        <template #date="{ item }">
          <span class="text-xs text-gray-500 font-mono">{{
            formatDate(item.createdAt)
          }}</span>
        </template>

        <template #product="{ item }">
          <div class="flex items-center gap-2">
            <div
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gray-100"
            >
              <Icon name="lucide:package" class="h-3 w-3 text-gray-500" />
            </div>
            <div class="min-w-0">
              <p class="truncate text-xs font-medium text-gray-900">
                {{ item.product?.name || 'Unknown' }}
              </p>
              <p
                v-if="item.product?.sku"
                class="truncate text-xs text-gray-400 font-mono"
              >
                {{ item.product.sku }}
              </p>
            </div>
          </div>
        </template>

        <template #type="{ item }">
          <div class="flex items-center gap-1.5">
            <div
              class="flex h-5 w-5 items-center justify-center rounded"
              :class="getMovementType(item.type).bgColor"
            >
              <Icon
                :name="getMovementType(item.type).icon"
                class="h-3 w-3"
                :class="getMovementType(item.type).color"
              />
            </div>
            <span class="text-xs font-medium">{{
              getMovementType(item.type).label
            }}</span>
          </div>
        </template>

        <template #quantity="{ item }">
          <span
            class="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium font-mono tabular-nums"
            :class="
              item.type === 'in'
                ? 'bg-green-50 text-green-700'
                : item.type === 'out'
                ? 'bg-red-50 text-red-700'
                : 'bg-gray-100 text-gray-600'
            "
          >
            {{ item.type === 'in' ? '+' : item.type === 'out' ? '-' : ''
            }}{{ Math.abs(item.quantity) }}
          </span>
        </template>

        <template #stock="{ item }">
          <span class="font-mono text-xs tabular-nums text-gray-600">{{
            item.stockAfter
          }}</span>
        </template>

        <template #reference="{ item }">
          <div class="max-w-[150px]">
            <p
              v-if="item.reference"
              class="truncate text-xs font-medium text-gray-900"
            >
              {{ item.reference }}
            </p>
            <p v-if="item.reason" class="truncate text-xs text-gray-500">
              {{ item.reason }}
            </p>
            <span v-if="!item.reference && !item.reason" class="text-gray-400"
              >—</span
            >
          </div>
        </template>
      </UiDataTable>
      
      <!-- Pagination -->
      <UiPagination
        :current-page="pagination.page"
        :total-pages="pagination.totalPages"
        :total-items="pagination.total"
        :items-per-page="pagination.limit"
        @page-change="handlePageChange"
      />
    </div>

    <!-- Create Modal -->
    <UiModal 
      v-model:open="isModalOpen" 
      title="New Movement"
      description="Record a stock movement for inventory tracking."
      size="lg"
    >
      <form
        id="movement-form"
        class="space-y-6"
        @submit.prevent="createMovement"
      >
        <!-- Product Selection -->
        <div class="bg-gray-50/50 p-5 rounded-xl border border-gray-100 space-y-4">
          <div class="flex items-center gap-2 pb-2 border-b border-gray-200/60">
            <div class="p-1.5 bg-blue-50 rounded-lg text-blue-600">
              <Icon name="lucide:package" class="h-4 w-4" />
            </div>
            <h3 class="text-sm font-semibold text-gray-900">
              Product
            </h3>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
              Select Product <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <select 
                v-model="form.productId" 
                class="block w-full rounded-lg border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm h-11 px-4 py-2.5 bg-white" 
                required
              >
                <option value="">Choose a product...</option>
                <option
                  v-for="product in products"
                  :key="product.id"
                  :value="product.id"
                >
                  {{ product.name }} ({{ product.stockQuantity }} in stock)
                </option>
              </select>
              <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <Icon name="lucide:chevron-down" class="h-4 w-4 text-gray-400" />
              </div>
            </div>
            
            <!-- Stock Information Display -->
            <div v-if="selectedProduct" class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div class="flex items-center justify-between text-sm">
                <div class="flex items-center gap-2">
                  <Icon name="lucide:package" class="h-4 w-4 text-blue-600" />
                  <span class="font-medium text-blue-900">Current Stock:</span>
                </div>
                <span class="font-mono font-bold text-blue-700">{{ selectedProduct.stockQuantity }}</span>
              </div>
              
              <div v-if="form.quantity > 0 && (form.type === 'in' || form.type === 'out')" class="mt-2 pt-2 border-t border-blue-200 flex items-center justify-between text-sm">
                <div class="flex items-center gap-2">
                  <Icon 
                    :name="form.type === 'in' ? 'lucide:arrow-down' : 'lucide:arrow-up'" 
                    class="h-4 w-4"
                    :class="form.type === 'in' ? 'text-green-600' : 'text-red-600'"
                  />
                  <span class="font-medium text-blue-900">After {{ form.type === 'in' ? 'Stock In' : 'Stock Out' }}:</span>
                </div>
                <span 
                  class="font-mono font-bold"
                  :class="stockAfterMovement < 0 ? 'text-red-600' : stockAfterMovement < (selectedProduct.stockMin || 0) ? 'text-amber-600' : 'text-green-600'"
                >
                  {{ stockAfterMovement }}
                </span>
              </div>
              
              <div v-if="form.type === 'out' && stockAfterMovement < 0" class="mt-2 flex items-start gap-2 text-xs text-red-700">
                <Icon name="lucide:alert-triangle" class="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>Warning: This will result in negative stock!</span>
              </div>
              
              <div v-if="stockAfterMovement < (selectedProduct.stockMin || 0) && stockAfterMovement >= 0" class="mt-2 flex items-start gap-2 text-xs text-amber-700">
                <Icon name="lucide:alert-circle" class="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>Notice: Stock will be below minimum level ({{ selectedProduct.stockMin }})</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Movement Details -->
        <div class="bg-gray-50/50 p-5 rounded-xl border border-gray-100 space-y-4">
          <div class="flex items-center gap-2 pb-2 border-b border-gray-200/60">
            <div class="p-1.5 bg-purple-50 rounded-lg text-purple-600">
              <Icon name="lucide:arrow-left-right" class="h-4 w-4" />
            </div>
            <h3 class="text-sm font-semibold text-gray-900">
              Movement Details
            </h3>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                Type <span class="text-red-500">*</span>
              </label>
              <div class="grid grid-cols-3 gap-3">
                <button
                  v-for="type in movementTypes"
                  :key="type.value"
                  type="button"
                  class="flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:shadow-sm"
                  :class="
                    form.type === type.value
                      ? `${type.bgColor} ${type.borderColor} shadow-sm`
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  "
                  @click="form.type = type.value as 'in' | 'out' | 'adjustment'"
                >
                  <div
                    class="flex h-8 w-8 items-center justify-center rounded-lg"
                    :class="form.type === type.value ? type.bgColor : 'bg-gray-100'"
                  >
                    <Icon :name="type.icon" class="h-4 w-4" :class="type.color" />
                  </div>
                  <span class="text-xs font-semibold">{{ type.label }}</span>
                  <span class="text-xs text-gray-500">{{ type.description }}</span>
                </button>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                Quantity <span class="text-red-500">*</span>
              </label>
              <input
                v-model.number="form.quantity"
                type="number"
                min="1"
                class="flex h-11 w-full rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-500 font-mono"
                required
                placeholder="Enter quantity"
              />
            </div>

            <div v-if="form.type === 'in'">
              <label class="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">Supplier (Optional)</label>
              <div class="relative">
                <select 
                  v-model="form.supplierId" 
                  class="block w-full rounded-lg border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm h-11 px-4 py-2.5 bg-white"
                >
                  <option value="">None</option>
                  <option
                    v-for="supplier in suppliers"
                    :key="supplier.id"
                    :value="supplier.id"
                  >
                    {{ supplier.name }}
                  </option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Icon name="lucide:chevron-down" class="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Additional Information -->
        <div class="bg-gray-50/50 p-5 rounded-xl border border-gray-100 space-y-4">
          <div class="flex items-center gap-2 pb-2 border-b border-gray-200/60">
            <div class="p-1.5 bg-amber-50 rounded-lg text-amber-600">
              <Icon name="lucide:file-text" class="h-4 w-4" />
            </div>
            <h3 class="text-sm font-semibold text-gray-900">
              Additional Information
            </h3>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Reference</label>
              <input
                v-model="form.reference"
                class="flex h-11 w-full rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-500"
                placeholder="Order #, Invoice #, etc."
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
              <textarea
                v-model="form.reason"
                class="flex w-full rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-500 min-h-[80px] resize-none"
                placeholder="Optional notes about this movement..."
              />
            </div>
          </div>
        </div>
      </form>

      <template #footer>
        <button
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="isModalOpen = false"
        >
          Cancel
        </button>
        <button
          type="submit"
          form="movement-form"
          class="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="isSubmitting"
        >
          <Icon
            v-if="isSubmitting"
            name="lucide:loader-2"
            class="h-4 w-4 animate-spin"
          />
          <Icon
            v-else
            name="lucide:check"
            class="h-4 w-4"
          />
          Record Movement
        </button>
      </template>
    </UiModal>
  </div>
</template>
