<script setup lang="ts">
interface Props {
  title: string;
  value: string | number;
  icon: string;
  iconColor?: 'default' | 'success' | 'warning' | 'destructive' | 'primary';
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const props = withDefaults(defineProps<Props>(), {
  iconColor: 'default',
});

const iconColorClasses = computed(() => {
  const colors = {
    default: 'text-gray-500 dark:text-gray-400',
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    destructive: 'text-red-600 dark:text-red-400',
    primary: 'text-primary-600 dark:text-primary-400',
  };
  return colors[props.iconColor];
});

const iconBgClasses = computed(() => {
  const colors = {
    default: 'bg-gray-100 dark:bg-gray-800',
    success: 'bg-emerald-50 dark:bg-emerald-950/30',
    warning: 'bg-amber-50 dark:bg-amber-950/30',
    destructive: 'bg-red-50 dark:bg-red-950/30',
    primary: 'bg-primary-50 dark:bg-primary-950/30',
  };
  return colors[props.iconColor];
});
</script>

<template>
  <div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm transition-shadow hover:shadow-md">
    <div class="flex items-center justify-between">
      <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ title }}</p>
      <div class="flex h-8 w-8 items-center justify-center rounded-lg" :class="iconBgClasses">
        <Icon :name="icon" class="h-4 w-4" :class="iconColorClasses" />
      </div>
    </div>
    <div class="mt-4 flex items-baseline gap-2">
      <h3 class="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">{{ value }}</h3>
      <span
        v-if="trend"
        class="flex items-center text-xs font-medium"
        :class="trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'"
      >
        <Icon
          :name="trend.isPositive ? 'lucide:trending-up' : 'lucide:trending-down'"
          class="mr-1 h-3 w-3"
        />
        {{ trend.value }}%
      </span>
    </div>
  </div>
</template>
