<script setup lang="ts">
import { Line } from 'vue-chartjs';
import type { ChartData, ChartOptions } from 'chart.js';

const props = defineProps<{
  labels: string[];
  stockIn: number[];
  stockOut: number[];
}>();

const chartData = computed<ChartData<'line'>>(() => ({
  labels: props.labels,
  datasets: [
    {
      label: 'Stock In',
      data: props.stockIn,
      borderColor: '#10B981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      fill: true,
      tension: 0.3,
      pointRadius: 3,
      pointHoverRadius: 5,
    },
    {
      label: 'Stock Out',
      data: props.stockOut,
      borderColor: '#EF4444',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      fill: true,
      tension: 0.3,
      pointRadius: 3,
      pointHoverRadius: 5,
    },
  ],
}));

const { settings } = useSettings();
const isDark = computed(() => settings.value?.theme === 'dark');

const chartOptions = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: 'index',
  },
  plugins: {
    legend: {
      display: true,
      position: 'top',
      align: 'end',
      labels: {
        boxWidth: 8,
        boxHeight: 8,
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 16,
        color: isDark.value ? '#9CA3AF' : '#374151',
        font: {
          size: 12,
        },
      },
    },
    tooltip: {
      backgroundColor: isDark.value ? '#1F2937' : '#FFFFFF',
      titleColor: isDark.value ? '#FFFFFF' : '#111827',
      bodyColor: isDark.value ? '#9CA3AF' : '#4B5563',
      borderColor: isDark.value ? '#374151' : '#E5E7EB',
      borderWidth: 1,
      padding: 12,
      displayColors: true,
      callbacks: {
        label: (context) =>
          `${context.dataset.label}: ${context.parsed.y} units`,
      },
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        color: isDark.value ? '#6B7280' : '#9CA3AF',
        font: {
          size: 11,
        },
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        color: isDark.value ? 'rgba(75, 85, 99, 0.1)' : 'rgba(0, 0, 0, 0.05)',
      },
      ticks: {
        color: isDark.value ? '#6B7280' : '#9CA3AF',
        font: {
          size: 11,
        },
        stepSize: 1,
      },
    },
  },
}));
</script>

<template>
  <div class="h-64">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>
