<script setup lang="ts">
const now = new Date();
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(now.getDate() - 30);

const startDate = ref(thirtyDaysAgo.toISOString().split('T')[0]);
const endDate = ref(now.toISOString().split('T')[0]);

const { data: stats, pending, refresh: refreshStats } = await useFetch('/api/dashboard/stats', {
  query: computed(() => ({
    startDate: startDate.value,
    endDate: endDate.value
  }))
});

const { data: chartData, pending: chartsPending, refresh: refreshCharts } = await useFetch(
  '/api/dashboard/charts', {
  query: computed(() => ({
    startDate: startDate.value,
    endDate: endDate.value
  }))
});

const { settings } = useSettings();

function handleRangeChange() {
  refreshStats();
  refreshCharts();
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: settings.value?.currency || 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

const ui = {
  card: 'glass-card overflow-hidden flex flex-col h-full bg-white/70 dark:bg-bluerain-900/40',
  cardHeader:
    'px-4 py-3 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 flex items-center justify-between',
  cardTitle:
    'text-xs font-bold text-gray-700 dark:text-bluerain-200 uppercase tracking-wider flex items-center gap-2',
  cardBody: 'p-4 flex-1',
  mono: 'font-mono tracking-tight text-gray-900 dark:text-white',
};
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
          Overview
        </h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Business intelligence and inventory metrics.
        </p>
      </div>
      
      <DashboardDateRangePicker
        v-model:startDate="startDate"
        v-model:endDate="endDate"
        @change="handleRangeChange"
      />
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div
        class="p-5 glass-card bg-white/70 dark:bg-bluerain-900/40 hover:bg-white/80 dark:hover:bg-bluerain-900/60 transition-all duration-300"
      >
        <div class="flex justify-between items-start">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Total Products
          </p>
          <Icon name="lucide:package" class="h-4 w-4 text-gray-400 dark:text-gray-500" />
        </div>
        <div class="mt-2 flex items-baseline gap-2">
          <span class="text-2xl font-bold text-gray-900 dark:text-white font-mono">{{
            stats?.totalProducts ?? 0
          }}</span>
        </div>
      </div>

      <div
        class="p-5 glass-card transition-all duration-300"
        :class="
          (stats?.lowStockCount ?? 0) > 0
            ? 'bg-amber-50/30 dark:bg-amber-900/20 border-amber-200 dark:border-amber-400/50 shadow-amber-500/10'
            : 'bg-white/70 dark:bg-bluerain-900/40 border-gray-200 dark:border-white/10'
        "
      >
        <div class="flex justify-between items-start">
          <p
            class="text-xs font-bold uppercase tracking-wide"
            :class="
              (stats?.lowStockCount ?? 0) > 0
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-gray-500 dark:text-gray-400'
            "
          >
            Low Stock
          </p>
          <Icon
            name="lucide:alert-triangle"
            class="h-4 w-4"
            :class="
              (stats?.lowStockCount ?? 0) > 0
                ? 'text-amber-600'
                : 'text-gray-400'
            "
          />
        </div>
        <div class="mt-2 flex items-baseline gap-2">
          <span
            class="text-2xl font-bold font-mono"
            :class="
              (stats?.lowStockCount ?? 0) > 0
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-gray-900 dark:text-gray-100'
            "
            >{{ stats?.lowStockCount ?? 0 }}</span
          >
          <span
            v-if="(stats?.lowStockCount ?? 0) > 0"
            class="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded"
            >Action needed</span
          >
        </div>
      </div>

      <div
        class="p-5 glass-card bg-white/70 dark:bg-bluerain-900/40 transition-all duration-300"
      >
        <div class="flex justify-between items-start">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Active Suppliers
          </p>
          <Icon name="lucide:truck" class="h-4 w-4 text-gray-400" />
        </div>
        <div class="mt-2">
          <span class="text-2xl font-bold text-gray-900 dark:text-gray-100 font-mono">{{
            stats?.totalSuppliers ?? 0
          }}</span>
        </div>
      </div>

      <div
        class="p-5 glass-card bg-white/70 dark:bg-bluerain-900/40 transition-all duration-300"
      >
        <div class="flex justify-between items-start">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Total Valuation
          </p>
          <Icon name="lucide:euro" class="h-4 w-4 text-gray-400" />
        </div>
        <div class="mt-2">
          <span class="text-2xl font-bold text-gray-900 dark:text-gray-100 font-mono">{{
            formatCurrency(stats?.totalStockValue ?? 0)
          }}</span>
        </div>
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-3">
      <div :class="[ui.card, 'lg:col-span-2']">
        <div :class="ui.cardHeader">
          <div :class="ui.cardTitle">
            <Icon name="lucide:activity" class="h-3.5 w-3.5 text-gray-500" />
            <span>Stock Velocity</span>
          </div>
          <div class="flex items-center gap-3 text-xs">
            <div class="flex items-center gap-1.5">
              <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span class="text-gray-600 dark:text-gray-400">In</span>
            </div>
            <div class="flex items-center gap-1.5">
              <div class="w-2 h-2 rounded-full bg-red-500"></div>
              <span class="text-gray-600 dark:text-gray-400">Out</span>
            </div>
          </div>
        </div>

        <div :class="ui.cardBody">
          <div
            v-if="chartsPending"
            class="flex h-64 items-center justify-center"
          >
            <Icon
              name="lucide:loader-2"
              class="h-6 w-6 animate-spin text-gray-300"
            />
          </div>
          <ChartsStockMovementsChart
            v-else-if="chartData?.movementsChart"
            :labels="chartData.movementsChart.labels"
            :stock-in="chartData.movementsChart.stockIn"
            :stock-out="chartData.movementsChart.stockOut"
            height="280"
          />
          <div
            v-else
            class="h-64 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-lg"
          >
            <Icon name="lucide:bar-chart-2" class="h-8 w-8 mb-2 opacity-20" />
            <span class="text-xs">No movement data yet</span>
          </div>
        </div>
      </div>

      <div :class="ui.card">
        <div :class="ui.cardHeader">
          <div :class="ui.cardTitle">
            <Icon name="lucide:pie-chart" class="h-3.5 w-3.5 text-gray-500" />
            <span>Category Split</span>
          </div>
        </div>
        <div :class="ui.cardBody">
          <div
            v-if="chartsPending"
            class="flex h-64 items-center justify-center"
          >
            <div class="skeleton h-32 w-32 rounded-full" />
          </div>
          <ChartsCategoryDistributionChart
            v-else-if="chartData?.productsByCategory?.length"
            :data="chartData.productsByCategory"
          />
          <div
            v-else
            class="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-lg"
          >
            <span class="text-xs">No categories defined</span>
          </div>
        </div>
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <div :class="ui.card">
        <div :class="ui.cardHeader">
          <div :class="ui.cardTitle">
            <Icon
              name="lucide:alert-circle"
              class="h-3.5 w-3.5 text-amber-600"
            />
            <span>Low Stock Alerts</span>
          </div>
          <NuxtLink
            to="/products?filter=low-stock"
            class="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:underline"
            >View All</NuxtLink
          >
        </div>

        <div class="divide-y divide-gray-100 dark:divide-gray-800">
          <div v-if="pending" class="p-4 space-y-3">
            <div v-for="i in 3" :key="i" class="skeleton h-8 w-full rounded" />
          </div>

          <template v-else-if="stats?.lowStockProducts?.length">
            <div
              v-for="product in stats.lowStockProducts"
              :key="product.id"
              class="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors group"
            >
              <div class="min-w-0">
                <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {{ product.name }}
                </p>
                <p class="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                  {{ product.sku || 'NO-SKU' }}
                </p>
              </div>
              <div class="text-right flex items-center gap-3">
                <div class="flex flex-col items-end">
                  <span class="text-sm font-bold font-mono text-red-600 dark:text-red-400">{{
                    product.stockQuantity
                  }}</span>
                  <span class="text-[10px] text-gray-400 dark:text-gray-500"
                    >Min: {{ product.stockMin }}</span
                  >
                </div>
                <button
                  class="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-gray-900 rounded-md"
                >
                  <Icon name="lucide:arrow-right" class="h-3 w-3" />
                </button>
              </div>
            </div>
          </template>

          <div v-else class="p-8 text-center">
            <div
              class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-50 dark:bg-green-950/30 mb-2"
            >
              <Icon name="lucide:check" class="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <p class="text-sm font-medium text-gray-900 dark:text-gray-100">All stocked up</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              No products are below minimum levels.
            </p>
          </div>
        </div>
      </div>

      <div :class="ui.card">
        <div :class="ui.cardHeader">
          <div :class="ui.cardTitle">
            <Icon name="lucide:history" class="h-3.5 w-3.5 text-gray-500" />
            <span>Recent Activity</span>
          </div>
          <NuxtLink
            to="/movements"
            class="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:underline"
            >View All</NuxtLink
          >
        </div>

        <div class="divide-y divide-gray-100 dark:divide-gray-800">
          <div v-if="pending" class="p-4 space-y-3">
            <div v-for="i in 3" :key="i" class="skeleton h-8 w-full rounded" />
          </div>

          <template v-else-if="stats?.recentMovements?.length">
            <div
              v-for="movement in stats.recentMovements"
              :key="movement.id"
              class="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div
                  class="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center border"
                  :class="
                    movement.type === 'in'
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-300'
                  "
                >
                  <Icon
                    :name="
                      movement.type === 'in' ? 'lucide:plus' : 'lucide:minus'
                    "
                    class="h-3 w-3"
                  />
                </div>

                <div class="min-w-0">
                  <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {{ movement.product?.name }}
                  </p>
                  <p class="text-[11px] text-gray-400 dark:text-gray-500">
                    {{ formatDate(movement.createdAt) }}
                  </p>
                </div>
              </div>

              <div class="text-right">
                <span
                  class="font-mono text-xs font-bold px-2 py-1 rounded-md"
                  :class="
                    movement.type === 'in'
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  "
                >
                  {{ movement.type === 'in' ? '+' : '-'
                  }}{{ Math.abs(movement.quantity) }}
                </span>
              </div>
            </div>
          </template>

          <div v-else class="p-8 text-center text-gray-500">
            <p class="text-sm">No recent movements recorded.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
