<script setup lang="ts">
const props = defineProps<{
  startDate: string;
  endDate: string;
}>();

const emit = defineEmits<{
  'update:startDate': [value: string];
  'update:endDate': [value: string];
  'change': [start: string, end: string];
}>();

const selectedPreset = ref('30d');

const presets = [
  { label: '30 Days', value: '30d' },
  { label: '3 Months', value: '3m' },
  { label: '1 Year', value: '1y' },
  { label: 'Custom', value: 'custom' },
];

function setPreset(preset: string) {
  selectedPreset.value = preset;
  if (preset === 'custom') return;

  const end = new Date();
  const start = new Date();

  if (preset === '30d') {
    start.setDate(end.getDate() - 30);
  } else if (preset === '3m') {
    start.setMonth(end.getMonth() - 3);
  } else if (preset === '1y') {
    start.setFullYear(end.getFullYear() - 1);
  }

  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];

  emit('update:startDate', startStr);
  emit('update:endDate', endStr);
  emit('change', startStr, endStr);
}

function handleDateChange() {
  selectedPreset.value = 'custom';
  emit('change', props.startDate, props.endDate);
}
</script>

<template>
  <div class="flex flex-col sm:flex-row items-center gap-3">
    <!-- Presets -->
    <div class="flex p-1 bg-gray-100 rounded-lg border border-gray-200">
      <button
        v-for="preset in presets"
        :key="preset.value"
        class="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
        :class="
          selectedPreset === preset.value
            ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50'
            : 'text-gray-500 hover:text-gray-700'
        "
        @click="setPreset(preset.value)"
      >
        {{ preset.label }}
      </button>
    </div>

    <!-- Custom Range -->
    <div class="flex items-center gap-2">
      <div class="relative">
        <Icon name="lucide:calendar" class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
        <input
          :value="startDate"
          type="date"
          class="block w-full pl-8 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all shadow-sm"
          @input="$emit('update:startDate', ($event.target as HTMLInputElement).value)"
          @change="handleDateChange"
        />
      </div>
      <span class="text-gray-400 text-xs">—</span>
      <div class="relative">
        <Icon name="lucide:calendar" class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
        <input
          :value="endDate"
          type="date"
          class="block w-full pl-8 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all shadow-sm"
          @input="$emit('update:endDate', ($event.target as HTMLInputElement).value)"
          @change="handleDateChange"
        />
      </div>
    </div>
  </div>
</template>
