<script setup lang="ts">
import type { Tax } from '~~/server/database/schema';

const toast = useToast();

// Fetch taxes
const { data: taxes, pending, refresh } = await useFetch('/api/taxes');

// Modal state
const isModalOpen = ref(false);
const editingTax = ref<Tax | null>(null);

// Form state
const form = reactive({
  name: '',
  rate: 20,
  isDefault: false,
});

// Table columns
const columns = [
  { key: 'name', label: 'Tax Name' },
  { key: 'rate', label: 'Rate', class: 'text-right' },
  { key: 'default', label: 'Default' },
  { key: 'actions', label: '', class: 'w-20' },
];

function openCreateModal() {
  editingTax.value = null;
  resetForm();
  isModalOpen.value = true;
}

function openEditModal(tax: Tax) {
  editingTax.value = tax;
  Object.assign(form, {
    name: tax.name,
    rate: tax.rate * 100,
    isDefault: tax.isDefault ?? false,
  });
  isModalOpen.value = true;
}

function resetForm() {
  Object.assign(form, {
    name: '',
    rate: 20,
    isDefault: false,
  });
}

async function saveTax() {
  try {
    const payload = {
      ...form,
      rate: form.rate / 100,
    };

    if (editingTax.value) {
      await $fetch(`/api/taxes/${editingTax.value.id}`, {
        method: 'PUT',
        body: payload,
      });
      toast.success('Tax updated');
    } else {
      await $fetch('/api/taxes', {
        method: 'POST',
        body: payload,
      });
      toast.success('Tax created');
    }
    isModalOpen.value = false;
    refresh();
  } catch (error) {
    toast.error('Failed to save');
    console.error('Failed to save tax:', error);
  }
}

async function deleteTax(id: string) {
  if (!confirm('Delete this tax?')) return;

  try {
    await $fetch(`/api/taxes/${id}`, { method: 'DELETE' });
    toast.success('Tax deleted');
    refresh();
  } catch (error) {
    toast.error('Failed to delete');
    console.error('Failed to delete tax:', error);
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Taxes</h1>
        <p class="text-xs text-gray-500 dark:text-gray-400">Configure tax rates and financial settings.</p>
      </div>
      <UiButton @click="openCreateModal">
        <Icon name="lucide:plus" class="h-3.5 w-3.5" />
        Add Tax
      </UiButton>
    </div>

    <!-- Taxes Table -->
    <div class="card overflow-hidden">
      <UiDataTable
        :columns="columns"
        :data="taxes || []"
        :loading="pending"
        empty-title="No taxes"
        empty-description="Add tax rates to apply to products."
      >
        <template #name="{ item }">
          <p class="text-xs font-medium text-gray-900 dark:text-gray-100">{{ item.name }}</p>
        </template>

        <template #rate="{ item }">
          <span class="font-mono text-xs font-medium tabular-nums text-gray-700 dark:text-gray-300"
            >{{ (item.rate * 100).toFixed(1) }}%</span
          >
        </template>

        <template #default="{ item }">
          <span v-if="item.isDefault" class="badge badge-success dark:bg-green-950/30 dark:text-green-400 dark:border-green-900/50">
            Default
          </span>
          <span v-else class="text-gray-400 dark:text-gray-600">—</span>
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
              @click="deleteTax(item.id)"
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
      :title="editingTax ? 'Edit Tax' : 'Add Tax'"
    >
      <form id="tax-form" class="space-y-4" @submit.prevent="saveTax">
        <div>
          <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">Name <span class="text-red-500">*</span></label>
          <UiInput v-model="form.name" placeholder="e.g., VAT 20%" autofocus />
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">Rate (%)</label>
          <UiInput
            v-model.number="form.rate"
            type="number"
            step="0.1"
            min="0"
            max="100"
          />
        </div>

        <div class="flex items-center gap-2">
          <input
            id="isDefault"
            v-model="form.isDefault"
            type="checkbox"
            class="h-4 w-4 rounded border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:checked:bg-primary-500"
          />
          <label for="isDefault" class="text-xs text-gray-600 dark:text-gray-400"
            >Set as default rate for new products</label
          >
        </div>
      </form>

      <template #footer>
        <UiButton variant="secondary" @click="isModalOpen = false">
          Cancel
        </UiButton>
        <UiButton
          type="submit"
          form="tax-form"
        >
          <Icon name="lucide:check" class="mr-2 h-4 w-4" />
          {{ editingTax ? 'Update Tax' : 'Create Tax' }}
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
