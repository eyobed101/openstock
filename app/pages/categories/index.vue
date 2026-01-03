<script setup lang="ts">
import type { Category } from '~~/server/database/schema';

const toast = useToast();

// Fetch categories
const {
  data: categories,
  pending,
  refresh,
} = await useFetch('/api/categories');

// Modal state
const isModalOpen = ref(false);
const editingCategory = ref<Category | null>(null);
const isSubmitting = ref(false);

// Form state
const form = reactive({
  name: '',
  description: '',
  parentId: '',
  color: '#6B7280',
});

// Preset colors with labels
const presetColors = [
  { value: '#6B7280', label: 'Gray' },
  { value: '#EF4444', label: 'Red' },
  { value: '#F97316', label: 'Orange' },
  { value: '#EAB308', label: 'Yellow' },
  { value: '#22C55E', label: 'Green' },
  { value: '#14B8A6', label: 'Teal' },
  { value: '#3B82F6', label: 'Blue' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#F43F5E', label: 'Rose' },
];

// Table columns
const columns = [
  { key: 'name', label: 'Category' },
  { key: 'parent', label: 'Parent' },
  {
    key: 'products',
    label: 'Products',
    class: 'text-right',
    headerClass: 'text-right',
  },
  { key: 'actions', label: '', class: 'w-24' },
];

function openCreateModal() {
  editingCategory.value = null;
  resetForm();
  isModalOpen.value = true;
}

function openEditModal(category: Category) {
  editingCategory.value = category;
  Object.assign(form, {
    name: category.name,
    description: category.description || '',
    parentId: category.parentId || '',
    color: category.color || '#6B7280',
  });
  isModalOpen.value = true;
}

function resetForm() {
  Object.assign(form, {
    name: '',
    description: '',
    parentId: '',
    color: '#6B7280',
  });
}

async function saveCategory() {
  if (!form.name.trim()) {
    toast.warning('Please enter a category name');
    return;
  }

  isSubmitting.value = true;
  try {
    if (editingCategory.value) {
      await $fetch(`/api/categories/${editingCategory.value.id}`, {
        method: 'PUT',
        body: form,
      });
      toast.success('Category updated successfully');
    } else {
      await $fetch('/api/categories', {
        method: 'POST',
        body: form,
      });
      toast.success('Category created successfully');
    }
    isModalOpen.value = false;
    refresh();
  } catch (error) {
    console.error('Failed to save category:', error);
    toast.error('Failed to save category');
  } finally {
    isSubmitting.value = false;
  }
}

async function deleteCategory(id: string, name: string) {
  if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

  try {
    await $fetch(`/api/categories/${id}`, { method: 'DELETE' });
    toast.success('Category deleted successfully');
    refresh();
  } catch (error) {
    console.error('Failed to delete category:', error);
    toast.error('Failed to delete category');
  }
}

// Filter out current category from parent options to prevent circular reference
const parentOptions = computed(() => {
  if (!categories.value) return [];
  if (!editingCategory.value) return categories.value;
  return categories.value.filter((c) => c.id !== editingCategory.value?.id);
});

// Stats computed
const totalCategories = computed(() => categories.value?.length ?? 0);
const topLevelCategories = computed(
  () => categories.value?.filter((c) => !c.parentId).length ?? 0
);
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Categories</h1>
        <p class="text-xs text-gray-500 dark:text-gray-400">Organize products by category and sub-categories.</p>
      </div>
      <UiButton @click="openCreateModal">
        <Icon name="lucide:plus" class="h-4 w-4" />
        Add Category
      </UiButton>
    </div>

    <!-- Quick Stats -->
    <div class="flex gap-3">
      <div
        class="flex items-center gap-2 rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-1.5"
      >
        <Icon name="lucide:folder" class="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
        <span class="text-xs text-gray-700 dark:text-gray-300">
          <span class="font-medium font-mono">{{ totalCategories }}</span>
          <span class="text-gray-500 dark:text-gray-500"> total</span>
        </span>
      </div>
      <div
        class="flex items-center gap-2 rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-1.5"
      >
        <Icon name="lucide:folder-tree" class="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
        <span class="text-xs text-gray-700 dark:text-gray-300">
          <span class="font-medium font-mono">{{ topLevelCategories }}</span>
          <span class="text-gray-500 dark:text-gray-500"> top level</span>
        </span>
      </div>
    </div>

    <!-- Categories Table -->
    <div class="card overflow-hidden">
      <UiDataTable
        :columns="columns"
        :data="categories || []"
        :loading="pending"
        empty-title="No categories"
        empty-description="Create categories to organize products."
        empty-icon="lucide:folder-plus"
        hoverable
      >
        <template #name="{ item }">
          <div class="flex items-center gap-2.5">
            <div
              class="flex h-7 w-7 items-center justify-center rounded"
              :style="{ backgroundColor: (item.color || '#6B7280') + '15' }"
            >
              <div
                class="h-2.5 w-2.5 rounded-full"
                :style="{ backgroundColor: item.color || '#6B7280' }"
              />
            </div>
            <div>
              <p class="text-xs font-medium text-gray-900 dark:text-gray-100">{{ item.name }}</p>
              <p
                v-if="item.description"
                class="max-w-[200px] truncate text-xs text-gray-500 dark:text-gray-400"
              >
                {{ item.description }}
              </p>
            </div>
          </div>
        </template>

        <template #parent="{ item }">
          <span v-if="item.parent" class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
            <div
              class="mr-1 h-1 w-1 rounded-full"
              :style="{ backgroundColor: item.parent.color || '#6B7280' }"
            />
            {{ item.parent.name }}
          </span>
          <span v-else class="text-gray-400 dark:text-gray-600">—</span>
        </template>

        <template #products="{ item }">
          <span class="font-mono text-xs tabular-nums text-gray-600 dark:text-gray-400">{{
            item._count?.products ?? 0
          }}</span>
        </template>

        <template #actions="{ item }">
          <div
            class="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <button
              class="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              @click="openEditModal(item)"
              aria-label="Edit"
            >
              <Icon name="lucide:pencil" class="h-3.5 w-3.5" />
            </button>
            <button
              class="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"
              @click="deleteCategory(item.id, item.name)"
              aria-label="Delete"
            >
              <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
            </button>
          </div>
        </template>
      </UiDataTable>
    </div>

    <!-- Create/Edit Modal -->
    <UiModal
      v-model:open="isModalOpen"
      :title="editingCategory ? 'Edit Category' : 'New Category'"
      :description="editingCategory ? 'Update category details below.' : 'Create a new category to organize your products.'"
      size="lg"
    >
      <form id="category-form" class="space-y-6" @submit.prevent="saveCategory">
        <!-- Basic Information -->
        <div class="bg-gray-50/50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-100 dark:border-gray-800 space-y-4">
          <div class="flex items-center gap-2 pb-2 border-b border-gray-200/60 dark:border-gray-700">
            <div class="p-1.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-blue-600 dark:text-blue-400">
              <Icon name="lucide:tag" class="h-4 w-4" />
            </div>
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Basic Information
            </h3>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Name <span class="text-red-500">*</span>
              </label>
              <UiInput
                v-model="form.name"
                placeholder="e.g., Electronics"
                autofocus
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
              <textarea
                v-model="form.description"
                class="flex w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-2.5 text-sm shadow-sm transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-500 min-h-[90px] resize-none dark:text-gray-100"
                placeholder="Brief description of this category..."
              />
            </div>
          </div>
        </div>

        <!-- Organization -->
        <div class="bg-gray-50/50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-100 dark:border-gray-800 space-y-4">
          <div class="flex items-center gap-2 pb-2 border-b border-gray-200/60 dark:border-gray-700">
            <div class="p-1.5 bg-purple-50 dark:bg-purple-950/30 rounded-lg text-purple-600 dark:text-purple-400">
              <Icon name="lucide:folder-tree" class="h-4 w-4" />
            </div>
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Organization
            </h3>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Parent Category</label>
              <div class="relative">
                <select 
                  v-model="form.parentId" 
                  class="block w-full rounded-lg border-gray-300 dark:border-gray-700 shadow-sm focus:border-gray-900 dark:focus:border-gray-100 focus:ring-gray-900 dark:focus:ring-gray-100 sm:text-sm h-11 px-4 py-2.5 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
                >
                  <option value="">None (top level)</option>
                  <option v-for="cat in parentOptions" :key="cat.id" :value="cat.id">
                    {{ cat.name }}
                  </option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Icon name="lucide:chevron-down" class="h-4 w-4 text-gray-400 dark:text-gray-500" />
                </div>
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-2 uppercase tracking-wide">Color Theme</label>
              <div class="flex items-center gap-3">
                <div class="relative">
                  <input
                    v-model="form.color"
                    type="color"
                    class="h-11 w-20 rounded-lg border-2 border-gray-300 dark:border-gray-700 cursor-pointer hover:border-gray-400 dark:hover:border-gray-600 transition-colors bg-white dark:bg-gray-950"
                    title="Choose a color"
                  />
                </div>
                <div class="flex-1">
                  <input
                    v-model="form.color"
                    type="text"
                    class="block w-full rounded-lg border-gray-300 dark:border-gray-700 shadow-sm focus:border-gray-900 dark:focus:border-gray-100 focus:ring-gray-900 dark:focus:ring-gray-100 sm:text-sm h-11 px-4 py-2.5 bg-white dark:bg-gray-950 font-mono text-xs uppercase text-gray-900 dark:text-gray-100"
                    placeholder="#6B7280"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
                <div 
                  class="h-11 w-11 rounded-lg border-2 border-gray-200 dark:border-gray-800 shadow-sm"
                  :style="{ backgroundColor: form.color }"
                  title="Preview"
                />
              </div>
              <p class="text-xs text-gray-500 mt-1.5">Choose any color for this category</p>
            </div>
          </div>
        </div>
      </form>

      <template #footer>
        <UiButton variant="secondary" @click="isModalOpen = false">
          Cancel
        </UiButton>
        <UiButton
          type="submit"
          form="category-form"
          :loading="isSubmitting"
        >
          <Icon
            v-if="!isSubmitting"
            name="lucide:check"
            class="mr-2 h-4 w-4"
          />
          {{ editingCategory ? 'Update Category' : 'Create Category' }}
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
