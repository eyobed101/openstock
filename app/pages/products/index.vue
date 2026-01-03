<script setup lang="ts">
import type {
  Product,
  Category,
  Supplier,
  Tax,
  ProductVariant as DBProductVariant,
} from '~~/server/database/schema';

const toast = useToast();
const router = useRouter();
const { currencySymbol, currencyIcon } = useSettings();

function navigateToProduct(id: string) {
  router.push(`/products/${id}`);
}

// Pagination & Filtering state
const page = ref(1);
const limit = ref(20);
const filters = reactive({
  search: '',
  categoryId: '',
  isActive: true,
});

const {
  data: productsResponse,
  pending,
  refresh,
} = await useFetch<{
  data: (Product & { variants?: DBProductVariant[]; category?: Category })[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}>('/api/products', {
  query: computed(() => ({
    page: page.value,
    limit: limit.value,
    search: filters.search || undefined,
    categoryId: filters.categoryId || undefined,
    isActive: filters.isActive,
  })),
  watch: [page, limit],
});

const products = computed(() => productsResponse.value?.data || []);
const pagination = computed(() => productsResponse.value?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });

function handlePageChange(newPage: number) {
  page.value = newPage;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearFilters() {
  filters.search = '';
  filters.categoryId = '';
  page.value = 1;
  refresh();
}

function applyFilters() {
  page.value = 1;
  // useFetch watches the query so it will auto-refetch
}

const hasActiveFilters = computed(() => {
  return filters.search || filters.categoryId !== '';
});

const isModalOpen = ref(false);
const editingProduct = ref<Product | null>(null);
const isSubmitting = ref(false);

const expandedProducts = ref<Set<string>>(new Set());

function toggleProduct(productId: string) {
  if (expandedProducts.value.has(productId)) {
    expandedProducts.value.delete(productId);
  } else {
    expandedProducts.value.add(productId);
  }
  expandedProducts.value = new Set(expandedProducts.value);
}

function isExpanded(productId: string) {
  return expandedProducts.value.has(productId);
}

const hasVariants = ref(false);

interface VariantOption {
  name: string;
  valuesInput: string;
  values: string[];
}

interface ProductVariant {
  id?: string;
  name: string;
  sku: string | null;
  price: number;
  stockQuantity: number | null;
  costPrice: number;
  stockMin: number | null;
}

const form = reactive({
  name: '',
  sku: '',
  barcode: '',
  description: '',
  categoryId: '',
  costPrice: 0,
  marginPercent: 30,
  sellingPrice: 0,
  taxId: '',
  stockQuantity: 0,
  stockMin: 0,
  unit: 'unit',
  supplierId: '',
  options: [] as VariantOption[],
  variants: [] as ProductVariant[],
});

const { data: categories } = await useFetch<Category[]>('/api/categories');
const { data: suppliers } = await useFetch<Supplier[]>('/api/suppliers');
const { data: taxes } = await useFetch<Tax[]>('/api/taxes');

watch([() => form.costPrice, () => form.marginPercent], ([cost, margin]) => {
  if (cost != null && margin != null) {
    form.sellingPrice = Number((cost * (1 + margin / 100)).toFixed(2));
  }
});

function openCreateModal() {
  editingProduct.value = null;
  resetForm();
  isModalOpen.value = true;
}

function openEditModal(product: Product & { variants?: ProductVariant[] }) {
  editingProduct.value = product;

  resetForm();

  Object.assign(form, {
    name: product.name,
    sku: product.sku || '',
    barcode: product.barcode || '',
    description: product.description || '',
    categoryId: product.categoryId || '',
    costPrice: product.costPrice || 0,
    marginPercent: product.marginPercent || 30,
    sellingPrice: product.sellingPrice || 0,
    taxId: product.taxId || '',
    stockQuantity: product.stockQuantity || 0,
    stockMin: product.stockMin || 0,
    unit: product.unit || 'unit',
    supplierId: product.supplierId || '',
  });

  if (
    product.options &&
    Array.isArray(product.options) &&
    product.options.length > 0
  ) {
    hasVariants.value = true;
    form.options = product.options.map((opt: any) => ({
      name: opt.name,
      values: opt.values,
      valuesInput: opt.values.join(', '),
    }));

    if (product.variants && product.variants.length > 0) {
      form.variants = product.variants.map((v: any) => ({
        id: v.id,
        name: v.name,
        sku: v.sku || '',
        price: v.price || 0,
        costPrice: v.costPrice || 0,
        stockQuantity: v.stockQuantity || 0,
        stockMin: v.stockMin || 0,
      }));
    }
  } else {
    hasVariants.value = false;
  }

  isModalOpen.value = true;
}

function resetForm() {
  hasVariants.value = false;
  Object.assign(form, {
    name: '',
    sku: '',
    barcode: '',
    description: '',
    categoryId: '',
    costPrice: 0,
    marginPercent: 30,
    sellingPrice: 0,
    taxId: '',
    stockQuantity: 0,
    stockMin: 0,
    unit: 'unit',
    supplierId: '',
    options: [],
    variants: [],
  });
}

function addOption() {
  form.options.push({ name: '', valuesInput: '', values: [] });
}

function removeOption(index: number) {
  form.options.splice(index, 1);
}

function updateOptionValues(index: number) {
  const opt = form.options[index];
  if (opt && opt.valuesInput) {
    opt.values = opt.valuesInput
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v);
  } else if (opt) {
    opt.values = [];
  }
}

function removeVariant(index: number) {
  form.variants.splice(index, 1);
}

function generateVariants() {
  if (form.options.length === 0) return;

  const groupedOptions = new Map<string, Set<string>>();

  form.options.forEach((opt) => {
    const name = opt.name.trim();
    if (!name) return;

    if (!groupedOptions.has(name)) {
      groupedOptions.set(name, new Set());
    }

    opt.values.forEach((v) => groupedOptions.get(name)!.add(v));
  });

  const newOptions: VariantOption[] = [];
  groupedOptions.forEach((valuesSet, name) => {
    const values = Array.from(valuesSet);
    newOptions.push({
      name,
      values,
      valuesInput: values.join(', '),
    });
  });

  if (newOptions.length > 0) {
    form.options = newOptions;
  }

  const optionValues = form.options.map((opt) => opt.values);
  if (optionValues.some((vals) => vals.length === 0)) {
    toast.error('Incomplete Options', 'Please add values for all options.');
    return;
  }

  const cartesian = (...a: any[]) =>
    a.reduce((a, b) => a.flatMap((d: any) => b.map((e: any) => [d, e].flat())));

  let combinations: string[][] = [];
  if (optionValues.length === 1 && optionValues[0]) {
    combinations = optionValues[0].map((v) => [v]);
  } else {
    combinations = cartesian(...optionValues);
  }

  form.variants = combinations.map((combo) => {
    const name = combo.join(' / ');
    const existing = form.variants.find((v) => v.name === name);
    if (existing) return existing;

    return {
      name,
      sku: `${form.sku}-${combo.join('-').toUpperCase()}`,
      price: form.sellingPrice,
      costPrice: form.costPrice,
      stockQuantity: 0,
      stockMin: 0,
    };
  });
}

async function saveProduct() {
  if (!form.name.trim()) {
    toast.error('Validation error', 'Product name is required');
    return;
  }

  isSubmitting.value = true;
  try {
    const payload: any = { ...form };

    if (hasVariants.value) {
      payload.options = form.options.map((o) => ({
        name: o.name,
        values: o.values,
      }));
      // Ensure variants are included
      payload.variants = form.variants;
    } else {
      payload.options = null;
      payload.variants = [];
    }

    const method = editingProduct.value ? 'PUT' : 'POST';
    const url = editingProduct.value
      ? `/api/products/${editingProduct.value.id}`
      : '/api/products';

    await $fetch(url, { method, body: payload });

    toast.success(
      editingProduct.value ? 'Product updated' : 'Product created',
      `"${form.name}" has been saved.`
    );

    isModalOpen.value = false;
    refresh();
  } catch (error) {
    console.error(error);
    toast.error('Error', 'Failed to save product.');
  } finally {
    isSubmitting.value = false;
  }
}

async function deleteProduct(product: Product) {
  if (!confirm(`Delete "${product.name}"?`)) return;
  try {
    await $fetch(`/api/products/${product.id}`, { method: 'DELETE' });
    toast.success('Deleted', `"${product.name}" removed.`);
    refresh();
  } catch (error) {
    toast.error('Error', 'Failed to delete product.');
  }
}

function getStockStatus(product: Product & { variants?: ProductVariant[] }) {
  const stock = getTotalStock(product);
  const stockMin = getMinStock(product);

  if (stock <= 0) {
    return {
      class: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/50',
      label: 'Out of stock',
    };
  }
  if (stockMin && stock <= stockMin) {
    return {
      class: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50',
      label: 'Low stock',
    };
  }
  return {
    class: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900/50',
    label: 'In stock',
  };
}

function getTotalStock(product: Product & { variants?: ProductVariant[] }) {
  if (product.variants && product.variants.length > 0) {
    return product.variants.reduce((acc, v) => acc + (v.stockQuantity || 0), 0);
  }
  return product.stockQuantity || 0;
}

function getMinStock(product: Product & { variants?: ProductVariant[] }) {
  if (product.variants && product.variants.length > 0) {
    return product.variants.reduce((acc, v) => acc + (v.stockMin || 0), 0);
  }
  return product.stockMin || 0;
}

function hasProductVariants(
  product: Product & { variants?: ProductVariant[] }
) {
  return product.variants && product.variants.length > 0;
}

function getVariantStockStatus(variant: ProductVariant) {
  const stock = variant.stockQuantity || 0;
  if (stock <= 0) {
    return {
      class: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/50',
      label: 'Out of stock',
    };
  }
  if (variant.stockMin && stock <= variant.stockMin) {
    return {
      class: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50',
      label: 'Low stock',
    };
  }
  return {
    class: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900/50',
    label: 'In stock',
  };
}

const isVariantModalOpen = ref(false);
const editingVariant = ref<ProductVariant | null>(null);
const editingVariantParent = ref<
  (Product & { variants?: ProductVariant[] }) | null
>(null);
const isVariantSubmitting = ref(false);

const variantForm = reactive({
  id: '',
  name: '',
  sku: '',
  barcode: '',
  costPrice: 0,
  marginPercent: 30,
  price: 0,
  taxId: '',
  stockQuantity: 0,
  stockMin: 0,
  supplierId: '',
});

// Calculate selling price for variant
watch(
  [() => variantForm.costPrice, () => variantForm.marginPercent],
  ([cost, margin]) => {
    if (cost != null && margin != null) {
      variantForm.price = Number((cost * (1 + margin / 100)).toFixed(2));
    }
  }
);

function openVariantModal(
  variant: ProductVariant,
  parentProduct: Product & { variants?: ProductVariant[] }
) {
  editingVariant.value = variant;
  editingVariantParent.value = parentProduct;

  Object.assign(variantForm, {
    id: variant.id || '',
    name: variant.name || '',
    sku: variant.sku || '',
    barcode: (variant as any).barcode || '',
    costPrice: variant.costPrice || 0,
    marginPercent: (variant as any).marginPercent || 30,
    price: variant.price || 0,
    taxId: (variant as any).taxId || '',
    stockQuantity: variant.stockQuantity || 0,
    stockMin: variant.stockMin || 0,
    supplierId: (variant as any).supplierId || '',
  });

  isVariantModalOpen.value = true;
}

async function saveVariant() {
  if (!editingVariant.value || !editingVariantParent.value) return;

  isVariantSubmitting.value = true;
  try {
    await $fetch(
      `/api/products/${editingVariantParent.value.id}/variants/${variantForm.id}`,
      {
        method: 'PUT',
        body: variantForm,
      }
    );

    toast.success('Variant updated', `"${variantForm.name}" has been saved.`);
    isVariantModalOpen.value = false;
    refresh();
  } catch (error) {
    console.error(error);
    toast.error('Error', 'Failed to save variant.');
  } finally {
    isVariantSubmitting.value = false;
  }
}

function getSupplierName(supplierId: string | null | undefined) {
  if (!supplierId || !suppliers.value) return null;
  const supplier = suppliers.value.find((s) => s.id === supplierId);
  return supplier?.name || null;
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-white/10 pb-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
          Products
        </h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-bluerain-300">
          Manage your inventory catalog and pricing strategies.
        </p>
      </div>
      <UiButton @click="openCreateModal" class="bg-bluerain-500 hover:bg-bluerain-600 shadow-lg shadow-bluerain-500/20">
        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
        New Product
      </UiButton>
    </div>

    <!-- Filters -->
    <div class="glass-card bg-white/70 dark:bg-bluerain-900/40 p-5 space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10">
        <div class="flex items-center gap-2">
          <div class="p-1.5 bg-gray-50 dark:bg-white/5 rounded-lg text-gray-500 dark:text-bluerain-300">
            <Icon name="lucide:filter" class="h-4 w-4" />
          </div>
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Search & Filters</h3>
        </div>
        <button
          v-if="hasActiveFilters"
          class="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-bluerain-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors border border-gray-200 dark:border-white/10 shadow-sm"
          @click="clearFilters"
        >
          <Icon name="lucide:rotate-ccw" class="h-3.5 w-3.5" />
          Clear All
        </button>
      </div>

      <div class="flex flex-col md:flex-row gap-4">
        <!-- Search -->
        <div class="flex-1">
          <label class="block text-xs font-medium text-gray-700 dark:text-bluerain-300 mb-2 uppercase tracking-wide">Search Products</label>
          <div class="relative">
            <Icon name="lucide:search" class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <input
              v-model="filters.search"
              type="text"
              placeholder="Search by name or SKU..."
              class="flex h-11 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-bluerain-950/40 pl-10 pr-4 py-2.5 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bluerain-500 focus-visible:border-transparent dark:text-white dark:placeholder:text-bluerain-600"
              @input="applyFilters"
            />
          </div>
        </div>

        <!-- Category Filter -->
        <div class="w-full md:w-64">
          <label class="block text-xs font-medium text-gray-700 dark:text-bluerain-300 mb-2 uppercase tracking-wide">Category</label>
          <div class="relative">
            <Icon name="lucide:layers" class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <select
              v-model="filters.categoryId"
              class="flex h-11 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-bluerain-950/40 pl-10 pr-10 py-2.5 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bluerain-500 focus-visible:border-transparent appearance-none dark:text-white"
              @change="applyFilters"
            >
              <option value="">All Categories</option>
              <option
                v-for="category in categories"
                :key="category.id"
                :value="category.id"
              >
                {{ category.name }}
              </option>
            </select>
            <Icon name="lucide:chevron-down" class="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
          </div>
        </div>
      </div>

      <!-- Results info -->
      <div v-if="productsResponse" class="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/10">
        <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-bluerain-400">
          <Icon name="lucide:info" class="h-3.5 w-3.5" />
          <span>Showing {{ pagination.page * pagination.limit - pagination.limit + 1 }}-{{ Math.min(pagination.page * pagination.limit, pagination.total) }} of {{ pagination.total }} products</span>
        </div>
        <button
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-bluerain-600 dark:text-bluerain-400 hover:text-bluerain-700 dark:hover:text-bluerain-200 hover:bg-bluerain-50 dark:hover:bg-bluerain-900/40 px-3 py-1.5 rounded-lg transition-colors"
          @click="refresh"
        >
          <Icon name="lucide:refresh-cw" class="h-3.5 w-3.5" :class="{ 'animate-spin': pending }" />
          Reload Data
        </button>
      </div>
    </div>

    <!-- Custom Accordion Table -->
    <div
      class="w-full overflow-hidden glass-card bg-white/70 dark:bg-bluerain-900/40"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm whitespace-nowrap">
          <thead class="bg-gray-50/50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
            <tr>
              <th
                class="h-9 px-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-bluerain-300 w-8"
              ></th>
              <th
                class="h-9 px-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-bluerain-300"
              >
                Product
              </th>
              <th
                class="h-9 px-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-bluerain-300"
              >
                SKU
              </th>
              <th
                class="h-9 px-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-bluerain-300"
              >
                Category
              </th>
              <th
                class="h-9 px-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-bluerain-300 text-right"
              >
                Stock
              </th>
              <th
                class="h-9 px-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-bluerain-300 text-right"
              >
                Cost
              </th>
              <th
                class="h-9 px-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-bluerain-300 text-right"
              >
                Price
              </th>
              <th
                class="h-9 px-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 w-20"
              ></th>
            </tr>
          </thead>

          <tbody class="divide-y divide-gray-100 dark:divide-white/5 bg-transparent">
            <!-- Loading State -->
            <tr v-if="pending">
              <td colspan="8" class="h-32 text-center">
                <div class="flex flex-col items-center justify-center gap-3">
                  <Icon
                    name="lucide:loader-2"
                    class="h-5 w-5 animate-spin text-gray-900 dark:text-gray-100"
                  />
                  <span class="text-xs font-medium text-gray-500 dark:text-gray-400 animate-pulse"
                    >Loading data...</span
                  >
                </div>
              </td>
            </tr>

            <!-- Empty State -->
            <tr v-else-if="!products?.length">
              <td colspan="8" class="p-0">
                <div
                  class="flex flex-col items-center justify-center py-12 text-center bg-gray-50/30 dark:bg-gray-800/10"
                >
                  <div class="rounded-full bg-gray-100 dark:bg-gray-800 p-3 mb-3">
                    <Icon
                      name="lucide:package-open"
                      class="h-5 w-5 text-gray-400 dark:text-gray-500"
                    />
                  </div>
                  <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Inventory empty
                  </h3>
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Get started by adding your first product.
                  </p>
                </div>
              </td>
            </tr>

            <!-- Product Rows -->
            <template v-else v-for="(item, index) in products" :key="item.id">
              <!-- Main Product Row -->
              <tr
                class="group transition-colors duration-150 ease-in-out hover:bg-gray-50 dark:hover:bg-gray-800/50"
                :class="{ 'bg-gray-50/50 dark:bg-gray-800/30': isExpanded(item.id) }"
              >
                <!-- Expand Button -->
                <td class="h-10 px-4 py-2">
                  <button
                    v-if="hasProductVariants(item)"
                    type="button"
                    class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    @click="toggleProduct(item.id)"
                  >
                    <Icon
                      name="lucide:chevron-right"
                      class="h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform duration-200"
                      :class="{ 'rotate-90': isExpanded(item.id) }"
                    />
                  </button>
                </td>

                <!-- Product Name -->
                <td class="h-10 px-4 py-2">
                  <NuxtLink
                    :to="`/products/${item.id}`"
                    class="flex items-center gap-3 text-left w-full group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors"
                  >
                    <div
                      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-bluerain-800/50"
                    >
                      <Icon
                        name="lucide:box"
                        class="h-4.5 w-4.5 text-gray-400 dark:text-bluerain-300"
                      />
                    </div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-2">
                        <p class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                          {{ item.name }}
                        </p>
                        <span
                          v-if="hasProductVariants(item)"
                          class="inline-flex items-center rounded-full bg-primary-50 dark:bg-primary-950/30 px-1.5 py-0.5 text-[10px] font-medium text-primary-700 dark:text-primary-400 border border-primary-100 dark:border-primary-900/50"
                        >
                          {{ item.variants?.length }} variants
                        </span>
                      </div>
                      <p
                        v-if="item.barcode"
                        class="truncate text-xs text-gray-500 dark:text-gray-400 font-mono tracking-tight"
                      >
                        {{ item.barcode }}
                      </p>
                    </div>
                  </NuxtLink>
                </td>

                <!-- SKU -->
                <td class="h-10 px-4 py-2">
                  <span
                    class="font-mono text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-100 dark:border-gray-700"
                    >{{ item.sku || '—' }}</span
                  >
                </td>

                <!-- Category -->
                <td class="h-10 px-4 py-2">
                  <div
                    v-if="item.category"
                    class="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-300"
                  >
                    <span
                      class="h-1.5 w-1.5 rounded-full"
                      :style="{
                        backgroundColor: item.category.color || '#9CA3AF',
                      }"
                    />
                    {{ item.category.name }}
                  </div>
                  <span v-else class="text-gray-400 dark:text-gray-600 text-xs">—</span>
                </td>

                <!-- Stock -->
                <td class="h-10 px-4 py-2 text-right">
                  <div class="flex flex-col items-end">
                    <span class="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
                      {{ getTotalStock(item) }}
                      <span class="text-gray-400 dark:text-gray-500 text-xs">{{ item.unit }}</span>
                    </span>
                    <span
                      :class="[
                        'text-[10px] px-1.5 py-0.5 rounded border mt-0.5',
                        getStockStatus(item).class,
                      ]"
                    >
                      {{ getStockStatus(item).label }}
                    </span>
                  </div>
                </td>

                <!-- Cost Price -->
                <td class="h-10 px-4 py-2 text-right">
                  <span class="font-mono text-xs text-gray-500 dark:text-gray-400"
                    >{{ item.costPrice?.toFixed(2) }} {{ currencySymbol }}</span
                  >
                </td>

                <!-- Selling Price -->
                <td class="h-10 px-4 py-2 text-right">
                  <span class="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100"
                    >{{ item.sellingPrice?.toFixed(2) }}
                    {{ currencySymbol }}</span
                  >
                </td>

                <!-- Actions -->
                <td class="h-10 px-4 py-2">
                  <div class="flex justify-end gap-1">
                    <button
                      class="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                      @click="openEditModal(item)"
                    >
                      <Icon name="lucide:pencil" class="h-4 w-4" />
                    </button>
                    <button
                      class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      @click="deleteProduct(item)"
                    >
                      <Icon name="lucide:trash-2" class="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>

              <!-- Expanded Variants Section -->
              <tr v-if="hasProductVariants(item) && isExpanded(item.id)">
                <td colspan="8" class="p-0">
                  <div class="bg-gray-50/80 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800">
                    <table class="w-full">
                      <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                        <tr
                          v-for="variant in item.variants"
                          :key="variant.id"
                          class="hover:bg-white/80 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                          @click="openVariantModal(variant, item)"
                        >
                          <!-- Empty cell for alignment -->
                          <td class="h-9 px-4 py-2 w-8"></td>

                          <!-- Variant Name -->
                          <td class="h-9 px-4 py-2">
                            <div class="flex items-center gap-3 pl-6">
                              <div
                                class="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                              >
                                <Icon
                                  name="lucide:git-branch"
                                  class="h-3.5 w-3.5 text-gray-400 dark:text-gray-500"
                                />
                              </div>
                              <div class="min-w-0">
                                <span class="text-sm text-gray-700 dark:text-gray-300">{{
                                  variant.name
                                }}</span>
                                <div
                                  v-if="getSupplierName((variant as any).supplierId)"
                                  class="text-[10px] text-gray-400 dark:text-gray-500 truncate"
                                >
                                  <Icon
                                    name="lucide:truck"
                                    class="h-2.5 w-2.5 inline mr-0.5"
                                  />
                                  {{
                                    getSupplierName((variant as any).supplierId)
                                  }}
                                </div>
                              </div>
                            </div>
                          </td>

                          <!-- Variant SKU -->
                          <td class="h-9 px-4 py-2">
                            <span
                              class="font-mono text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-100 dark:border-gray-700"
                              >{{ variant.sku || '—' }}</span
                            >
                          </td>

                          <!-- Barcode for variant -->
                          <td class="h-9 px-4 py-2">
                            <span
                              v-if="(variant as any).barcode"
                              class="font-mono text-xs text-gray-400 dark:text-gray-500"
                            >
                              {{ (variant as any).barcode }}
                            </span>
                          </td>

                          <!-- Variant Stock -->
                          <td class="h-9 px-4 py-2 text-right">
                            <div class="flex flex-col items-end">
                              <span class="font-mono text-sm text-gray-700 dark:text-gray-300">
                                {{ variant.stockQuantity || 0 }}
                                <span class="text-gray-400 dark:text-gray-500 text-xs">{{
                                  item.unit
                                }}</span>
                              </span>
                              <span
                                :class="[
                                  'text-[10px] px-1.5 py-0.5 rounded border mt-0.5',
                                  getVariantStockStatus(variant).class,
                                ]"
                              >
                                {{ getVariantStockStatus(variant).label }}
                              </span>
                            </div>
                          </td>

                          <!-- Variant Cost -->
                          <td class="h-9 px-4 py-2 text-right">
                            <span class="font-mono text-xs text-gray-500 dark:text-gray-400"
                              >{{ variant.costPrice?.toFixed(2) }}
                              {{ currencySymbol }}</span
                            >
                          </td>

                          <!-- Variant Price -->
                          <td class="h-9 px-4 py-2 text-right">
                            <span class="font-mono text-sm text-gray-700 dark:text-gray-300"
                              >{{ variant.price?.toFixed(2) }}
                              {{ currencySymbol }}</span
                            >
                          </td>

                          <!-- Edit action -->
                          <td class="h-9 px-4 py-2 w-20">
                            <div class="flex justify-end">
                              <button
                                class="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                @click.stop="openVariantModal(variant, item)"
                              >
                                <Icon
                                  name="lucide:pencil"
                                  class="h-3.5 w-3.5"
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div v-if="pagination.totalPages > 1" class="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 px-4 py-3">
        <UiPagination
          :current-page="pagination.page"
          :total-pages="pagination.totalPages"
          :total-items="pagination.total"
          :items-per-page="pagination.limit"
          @page-change="handlePageChange"
        />
      </div>
    </div>

    <!-- Variant Edit Modal -->
    <UiModal
      v-model:open="isVariantModalOpen"
      title="Edit Variant"
      :description="`Configure pricing, stock, and supplier for ${variantForm.name}`"
      size="lg"
    >
      <form id="variant-form" class="space-y-6" @submit.prevent="saveVariant">
        <!-- Identification -->
        <div>
          <h3
            class="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-3 border-b border-gray-100 dark:border-gray-800 pb-2"
          >
            Identification
          </h3>
          <div class="grid grid-cols-12 gap-4">
            <div class="col-span-12">
              <UiInput
                v-model="variantForm.name"
                label="Variant Name"
                placeholder="Ex: Red / XL"
                disabled
              />
            </div>

            <div class="col-span-6">
              <UiInput
                v-model="variantForm.sku"
                label="SKU / Ref"
                placeholder="PRO-001-RED"
              />
            </div>

            <div class="col-span-6">
              <UiInput
                v-model="variantForm.barcode"
                label="Barcode (EAN)"
                placeholder="Scan..."
                icon="lucide:scan-barcode"
              />
            </div>
          </div>
        </div>

        <!-- Financials -->
        <div>
          <h3
            class="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-3 border-b border-gray-100 dark:border-gray-800 pb-2"
          >
            Financials
          </h3>
          <div class="grid grid-cols-12 gap-4">
            <div class="col-span-4">
              <UiInput
                v-model.number="variantForm.costPrice"
                type="number"
                label="Cost Price"
                placeholder="0.00"
                :icon="currencyIcon"
              />
            </div>

            <div class="col-span-4">
              <UiInput
                v-model.number="variantForm.marginPercent"
                type="number"
                label="Margin (%)"
              />
            </div>

            <div class="col-span-4">
              <UiInput
                v-model.number="variantForm.price"
                type="number"
                label="Selling Price"
                :icon="currencyIcon"
                class="font-bold"
              />
            </div>

            <div class="col-span-6">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >Tax Rate</label
              >
              <select
                v-model="variantForm.taxId"
                class="block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm h-9 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
              >
                <option value="">No Tax (0%)</option>
                <option v-for="tax in taxes" :key="tax.id" :value="tax.id">
                  {{ tax.name }} ({{ tax.rate * 100 }}%)
                </option>
              </select>
            </div>

            <div class="col-span-6">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >Supplier</label
              >
              <select
                v-model="variantForm.supplierId"
                class="block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm h-9 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select supplier...</option>
                <option v-for="sup in suppliers" :key="sup.id" :value="sup.id">
                  {{ sup.name }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Inventory Control -->
        <div>
          <h3
            class="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-3 border-b border-gray-100 dark:border-gray-800 pb-2"
          >
            Inventory Control
          </h3>
          <div
            class="grid grid-cols-12 gap-4 bg-gray-50/50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200/50 dark:border-gray-700/50"
          >
            <div class="col-span-6">
              <UiInput
                v-model.number="variantForm.stockQuantity"
                type="number"
                label="Current Stock"
                placeholder="0"
              />
            </div>

            <div class="col-span-6">
              <UiInput
                v-model.number="variantForm.stockMin"
                type="number"
                label="Low Stock Alert"
                placeholder="0"
              />
            </div>
          </div>
        </div>
      </form>

      <template #footer>
        <UiButton variant="secondary" @click="isVariantModalOpen = false">
          Cancel
        </UiButton>

        <UiButton
          type="submit"
          form="variant-form"
          :loading="isVariantSubmitting"
        >
          <Icon
            v-if="!isVariantSubmitting"
            name="lucide:save"
            class="mr-2 h-4 w-4"
          />
          Save Variant
        </UiButton>
      </template>
    </UiModal>

    <UiModal
      v-model:open="isModalOpen"
      :title="editingProduct ? 'Edit Product' : 'New Product'"
      :description="
        editingProduct
          ? 'Make changes to the product details below.'
          : 'Add a new product to your inventory.'
      "
      size="4xl"
    >
      <form id="product-form" class="space-y-6" @submit.prevent="saveProduct">
        <!-- Identification Section -->
        <div class="bg-gray-50/50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-100 dark:border-gray-800 space-y-4">
          <div class="flex items-center gap-2 pb-2 border-b border-gray-200/60 dark:border-gray-700">
            <div class="p-1.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-blue-600 dark:text-blue-400">
              <Icon name="lucide:fingerprint" class="h-4 w-4" />
            </div>
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Identification
            </h3>
          </div>

          <div class="grid grid-cols-12 gap-x-4 gap-y-5">
            <div class="col-span-12">
              <UiInput
                v-model="form.name"
                label="Product Name"
                placeholder="Ex: Wireless Mouse M100"
                required
                class="font-medium"
              />
            </div>

            <div class="col-span-12 sm:col-span-6">
              <UiInput
                v-model="form.sku"
                label="SKU / Ref"
                placeholder="PRO-001"
              />
            </div>

            <div class="col-span-12 sm:col-span-6">
              <UiInput
                v-model="form.barcode"
                label="Barcode (EAN)"
                placeholder="Scan..."
                icon="lucide:scan-barcode"
              />
            </div>

            <div class="col-span-12">
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-400 mb-1.5 uppercase tracking-wide"
                >Category</label
              >
              <div class="relative">
                <select
                  v-model="form.categoryId"
                  class="block w-full rounded-lg border-gray-300 dark:border-gray-700 shadow-sm focus:border-gray-900 dark:focus:border-gray-100 focus:ring-gray-900 dark:focus:ring-gray-100 sm:text-sm h-11 px-4 py-2.5 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Uncategorized</option>
                  <option
                    v-for="cat in categories"
                    :key="cat.id"
                    :value="cat.id"
                  >
                    {{ cat.name }}
                  </option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Icon name="lucide:chevron-down" class="h-4 w-4 text-gray-400 dark:text-gray-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Variants Section -->
        <div class="bg-gray-50/50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-100 dark:border-gray-800 space-y-4">
          <div class="flex items-center justify-between pb-2 border-b border-gray-200/60 dark:border-gray-700">
            <div class="flex items-center gap-2">
               <div class="p-1.5 bg-purple-50 dark:bg-purple-950/30 rounded-lg text-purple-600 dark:text-purple-400">
                <Icon name="lucide:layers" class="h-4 w-4" />
              </div>
              <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Product Variants
              </h3>
            </div>
            
            <div class="flex items-center gap-3">
              <span class="text-sm font-medium text-gray-600 dark:text-gray-400">Enable Variants</span>
              <button
                type="button"
                class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
                :class="hasVariants ? 'bg-gray-900 dark:bg-gray-400' : 'bg-gray-200 dark:bg-gray-700'"
                @click="hasVariants = !hasVariants"
              >
                <span
                  class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-gray-100 shadow ring-0 transition duration-200 ease-in-out"
                  :class="hasVariants ? 'translate-x-5' : 'translate-x-0'"
                />
              </button>
            </div>
          </div>

          <div v-if="hasVariants" class="space-y-6 animate-in slide-in-from-top-2 duration-300">
            <!-- Options Builder -->
            <div class="bg-white dark:bg-gray-950 p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
              <div class="flex justify-between items-center">
                <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Icon name="lucide:list-tree" class="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  Define Options
                </h4>
                <button
                  type="button"
                  class="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-950/30 px-2 py-1 rounded-md transition-colors"
                  @click="addOption"
                >
                  + Add Option
                </button>
              </div>

              <div class="space-y-3">
                <div
                  v-for="(option, idx) in form.options"
                  :key="idx"
                  class="flex gap-3 items-start p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700"
                >
                  <div class="w-1/3">
                    <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Option Name</label>
                    <input
                      v-model="option.name"
                      type="text"
                      placeholder="e.g. Color"
                      class="block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-gray-900 dark:focus:border-gray-100 focus:ring-gray-900 dark:focus:ring-gray-100 sm:text-sm h-11 px-4 py-2.5 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div class="flex-1">
                    <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Values</label>
                    <div class="flex gap-2">
                        <input
                        v-model="option.valuesInput"
                        type="text"
                        placeholder="Comma separated (e.g. Red, Blue, Green)"
                        class="block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-gray-900 dark:focus:border-gray-100 focus:ring-gray-900 dark:focus:ring-gray-100 sm:text-sm h-11 px-4 py-2.5 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
                        @blur="updateOptionValues(idx)"
                        />
                        <button
                            type="button"
                            class="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 p-2 rounded-md transition-colors"
                            @click="removeOption(idx)"
                            title="Remove Option"
                        >
                            <Icon name="lucide:trash-2" class="h-4 w-4" />
                        </button>
                    </div>
                  </div>
                </div>
                
                <div
                  v-if="form.options.length === 0"
                  class="text-center py-6 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700"
                >
                  <Icon name="lucide:tags" class="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <p>No options added yet.</p>
                  <p class="text-xs mt-1">Click "Add Option" to start defining variants like Color or Size.</p>
                </div>
              </div>

              <div class="pt-2 flex justify-end">
                <button
                  type="button"
                  class="text-sm font-medium bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 shadow-sm transition-colors flex items-center gap-2"
                  @click="generateVariants"
                >
                  <Icon name="lucide:wand-2" class="h-4 w-4" />
                  Generate Variants
                </button>
              </div>
            </div>

            <!-- Variants List -->
            <div
              v-if="form.variants.length > 0"
              class="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm"
            >
              <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead class="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th
                      scope="col"
                      class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Variant
                    </th>
                    <th
                      scope="col"
                      class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32"
                    >
                      Price
                    </th>
                    <th
                      scope="col"
                      class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32"
                    >
                      Stock
                    </th>
                    <th
                      scope="col"
                      class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-40"
                    >
                      SKU
                    </th>
                    <th scope="col" class="relative px-4 py-3 w-10">
                      <span class="sr-only">Delete</span>
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  <tr v-for="(variant, idx) in form.variants" :key="idx" class="group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      <input
                        v-model="variant.name"
                        type="text"
                        class="block w-full border-0 p-0 text-gray-900 placeholder-gray-400 focus:ring-0 sm:text-sm bg-transparent font-medium"
                      />
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      <div class="relative rounded-md shadow-sm">
                        <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
                            <span class="text-gray-400 dark:text-gray-500 sm:text-xs">$</span>
                        </div>
                        <input
                            v-model.number="variant.price"
                            type="number"
                            class="block w-full rounded-md border-gray-300 dark:border-gray-700 pl-7 focus:border-gray-500 dark:focus:border-gray-400 focus:ring-gray-500 dark:focus:ring-gray-400 sm:text-sm h-10 py-2 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
                            placeholder="0.00"
                        />
                      </div>
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      <input
                        v-model.number="variant.stockQuantity"
                        type="number"
                        class="block w-full rounded-md border-gray-300 dark:border-gray-700 focus:border-gray-500 dark:focus:border-gray-400 focus:ring-gray-500 dark:focus:ring-gray-400 sm:text-sm h-10 px-3 py-2 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
                        placeholder="0"
                      />
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        <input
                            v-model="variant.sku"
                            type="text"
                            class="block w-full rounded-md border-gray-300 dark:border-gray-700 focus:border-gray-500 dark:focus:border-gray-400 focus:ring-gray-500 dark:focus:ring-gray-400 sm:text-sm h-10 px-3 py-2 font-mono text-xs bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
                            placeholder="SKU..."
                        />
                    </td>
                    <td class="px-4 py-3 text-right text-sm font-medium">
                      <button
                        type="button"
                        class="text-gray-300 dark:text-gray-600 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1"
                        @click="removeVariant(idx)"
                      >
                        <Icon name="lucide:trash-2" class="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Financials Section -->
        <div v-if="!hasVariants" class="bg-gray-50/50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-100 dark:border-gray-800 space-y-4">
          <div class="flex items-center gap-2 pb-2 border-b border-gray-200/60 dark:border-gray-700">
             <div class="p-1.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg text-emerald-600 dark:text-emerald-400">
              <Icon name="lucide:coins" class="h-4 w-4" />
            </div>
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Financials
            </h3>
          </div>
          <div class="grid grid-cols-12 gap-x-4 gap-y-5">
            <div class="col-span-12 sm:col-span-4">
              <UiInput
                v-model.number="form.costPrice"
                type="number"
                label="Cost Price"
                placeholder="0.00"
                :icon="currencyIcon"
              />
            </div>

            <div class="col-span-12 sm:col-span-4">
              <UiInput
                v-model.number="form.marginPercent"
                type="number"
                label="Margin (%)"
              />
            </div>

            <div class="col-span-12 sm:col-span-4">
              <UiInput
                v-model.number="form.sellingPrice"
                type="number"
                label="Selling Price"
                :icon="currencyIcon"
                class="font-bold"
              />
            </div>

            <div class="col-span-12 sm:col-span-6">
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide"
                >Tax Rate</label
              >
              <div class="relative">
                <select
                  v-model="form.taxId"
                  class="block w-full rounded-lg border-gray-300 dark:border-gray-700 shadow-sm focus:border-gray-900 dark:focus:border-gray-100 focus:ring-gray-900 dark:focus:ring-gray-100 sm:text-sm h-11 px-4 py-2.5 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 line-clamp-1"
                >
                  <option value="">No Tax (0%)</option>
                  <option v-for="tax in taxes" :key="tax.id" :value="tax.id">
                    {{ tax.name }} ({{ tax.rate * 100 }}%)
                  </option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Icon name="lucide:chevron-down" class="h-4 w-4 text-gray-400 dark:text-gray-500" />
                </div>
              </div>
            </div>

            <div class="col-span-12 sm:col-span-6">
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide"
                >Supplier</label
              >
              <div class="relative">
                <select
                  v-model="form.supplierId"
                  class="block w-full rounded-lg border-gray-300 dark:border-gray-700 shadow-sm focus:border-gray-900 dark:focus:border-gray-100 focus:ring-gray-900 dark:focus:ring-gray-100 sm:text-sm h-11 px-4 py-2.5 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 selection:bg-primary-500"
                >
                  <option value="">Select supplier...</option>
                  <option v-for="sup in suppliers" :key="sup.id" :value="sup.id">
                    {{ sup.name }}
                  </option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Icon name="lucide:chevron-down" class="h-4 w-4 text-gray-400 dark:text-gray-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Inventory Control Section -->
        <div v-if="!hasVariants" class="bg-gray-50/50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-100 dark:border-gray-800 space-y-4">
          <div class="flex items-center gap-2 pb-2 border-b border-gray-200/60 dark:border-gray-700">
             <div class="p-1.5 bg-orange-50 dark:bg-orange-950/30 rounded-lg text-orange-600 dark:text-orange-400">
              <Icon name="lucide:package-check" class="h-4 w-4" />
            </div>
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Inventory Control
            </h3>
          </div>
          <div class="grid grid-cols-12 gap-x-4 gap-y-5">
            <div class="col-span-12 sm:col-span-4">
              <UiInput
                v-model.number="form.stockQuantity"
                type="number"
                label="Current Stock"
                placeholder="0"
              />
            </div>

            <div class="col-span-12 sm:col-span-4">
              <UiInput
                v-model.number="form.stockMin"
                type="number"
                label="Low Stock Alert"
                placeholder="0"
              />
            </div>

            <div class="col-span-12 sm:col-span-4">
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide"
                >Unit Type</label
              >
              <div class="relative">
                <select
                  v-model="form.unit"
                  class="block w-full rounded-lg border-gray-300 dark:border-gray-700 shadow-sm focus:border-gray-900 dark:focus:border-gray-100 focus:ring-gray-900 dark:focus:ring-gray-100 sm:text-sm h-11 px-4 py-2.5 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
                >
                  <option value="unit">Pieces (pcs)</option>
                  <option value="kg">Weight (kg)</option>
                  <option value="m">Length (m)</option>
                  <option value="l">Volume (L)</option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Icon name="lucide:chevron-down" class="h-4 w-4 text-gray-400 dark:text-gray-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      <template #footer>
        <UiButton variant="secondary" @click="isModalOpen = false">
          Cancel
        </UiButton>

        <UiButton type="submit" form="product-form" :loading="isSubmitting">
          <Icon v-if="!isSubmitting" name="lucide:save" class="mr-2 h-4 w-4" />
          {{ editingProduct ? 'Save Changes' : 'Create Product' }}
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
