<script setup lang="ts">
interface Props {
  title: string;
  description?: string;
  compact?: boolean;
  inline?: boolean;
}

withDefaults(defineProps<Props>(), {
  compact: false,
  inline: false,
});
</script>

<template>
  <div
    :class="[
      'flex flex-col items-center justify-center text-center',
      inline ? 'py-4' : compact ? 'py-8' : 'py-16',
    ]"
  >
    <div
      class="flex items-center justify-center rounded-full bg-gray-50 dark:bg-gray-800/50 mb-4"
      :class="compact ? 'h-10 w-10' : 'h-14 w-14'"
    >
      <slot name="icon">
        <Icon
          name="lucide:inbox"
          class="text-gray-400 dark:text-gray-500"
          :class="compact ? 'h-5 w-5' : 'h-7 w-7'"
        />
      </slot>
    </div>
    
    <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
      {{ title }}
    </h3>
    
    <p
      v-if="description"
      class="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto text-pretty"
    >
      {{ description }}
    </p>

    <div v-if="$slots.action" class="mt-6">
      <slot name="action" />
    </div>
  </div>
</template>
