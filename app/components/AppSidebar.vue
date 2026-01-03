<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const { user, isAdmin, logout } = useAuth();
const { isOpen, isCollapsed, toggleCollapse, closeSidebar } = useSidebar();

const navigation = [
  { name: 'Dashboard', href: '/', icon: 'lucide:layout-dashboard' },
  { name: 'Products', href: '/products', icon: 'lucide:package' },
  { name: 'Categories', href: '/categories', icon: 'lucide:folder-tree' },
  { name: 'Suppliers', href: '/suppliers', icon: 'lucide:truck' },
  { name: 'Movements', href: '/movements', icon: 'lucide:arrow-left-right' },
];

const secondaryNavigation = computed(() => {
  const items = [
    { name: 'Taxes', href: '/taxes', icon: 'lucide:percent' },
    { name: 'Settings', href: '/settings', icon: 'lucide:settings' },
  ];

  // Add Users link for admins only
  if (isAdmin.value) {
    items.unshift({ name: 'Users', href: '/users', icon: 'lucide:users' });
  }

  return items;
});

function isActive(href: string): boolean {
  if (href === '/') {
    return route.path === '/';
  }
  return route.path.startsWith(href);
}

async function handleLogout() {
  await logout();
  await router.push('/auth/login');
}

// Close sidebar on route change on mobile
watch(
  () => route.path,
  () => {
    closeSidebar();
  }
);
</script>

<template>
  <div>
    <!-- Mobile backdrop -->
    <Transition
      enter-active-class="transition-opacity duration-300 ease-linear"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300 ease-linear"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm lg:hidden"
        @click="closeSidebar"
      />
    </Transition>

    <!-- Sidebar component -->
    <aside
      class="fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-gray-200 dark:border-white/10 glass dark:bg-bluerain-950/60 backdrop-blur-2xl transition-all duration-300 ease-in-out lg:static lg:flex lg:h-full"
      :class="[
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        isCollapsed ? 'lg:w-20' : 'lg:w-64 w-72',
      ]"
    >
      <!-- Header -->
      <div
        class="flex h-16 items-center border-b border-gray-100 dark:border-white/10 transition-all duration-300"
        :class="[isCollapsed ? 'justify-center px-0' : 'gap-3 px-6']"
      >
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 p-1  backdrop-blur-md border border-white/20"
        >
          <img src="/logo.png" alt="MezgebStock Logo" class="h-full w-full object-contain" />
        </div>
        <div v-if="!isCollapsed" class="flex flex-col animate-in fade-in duration-500">
          <span class="text-sm font-bold tracking-tight text-gray-900 dark:text-white">MezgebStock</span>
          <span class="text-[10px] font-medium text-gray-500 dark:text-bluerain-300 uppercase tracking-wider">Track Smart</span>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex flex-1 flex-col gap-1 overflow-y-auto p-4 transition-all duration-300">
        <!-- Main navigation -->
        <div class="flex flex-col gap-1">
          <NuxtLink
            v-for="item in navigation"
            :key="item.name"
            :to="item.href"
            class="group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-all duration-200"
            :class="[
              isActive(item.href)
                ? 'bg-bluerain-100/10 text-bluerain-300 shadow-sm'
                : 'text-gray-600 dark:text-bluerain-200 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white',
              isCollapsed ? 'justify-center px-0' : 'gap-3',
            ]"
            :title="isCollapsed ? item.name : ''"
          >
            <Icon
              :name="item.icon"
              class="h-5 w-5 shrink-0 transition-colors"
              :class="
                isActive(item.href)
                  ? 'text-bluerain-600 dark:text-bluerain-300'
                  : 'text-gray-400 dark:text-bluerain-400 group-hover:text-gray-600 dark:group-hover:text-bluerain-200'
              "
            />
            <span v-if="!isCollapsed" class="animate-in fade-in duration-300">{{ item.name }}</span>
            <div
              v-if="isActive(item.href) && !isCollapsed"
              class="ml-auto h-1.5 w-1.5 rounded-full bg-bluerain-500"
            />
          </NuxtLink>
        </div>

        <!-- Separator -->
        <div class="my-4 h-px bg-gray-100 dark:bg-white/5" />

        <!-- Secondary navigation -->
        <div class="flex flex-col gap-1">
          <p
            v-if="!isCollapsed"
            class="px-3 text-xs font-semibold text-gray-400 dark:text-bluerain-400 uppercase tracking-wider mb-2 animate-in fade-in duration-300"
          >
            System
          </p>
          <NuxtLink
            v-for="item in secondaryNavigation"
            :key="item.name"
            :to="item.href"
            class="group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-all duration-200"
            :class="[
              isActive(item.href)
                ? 'bg-bluerain-100/10 text-bluerain-300 shadow-sm'
                : 'text-gray-600 dark:text-bluerain-200 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white',
              isCollapsed ? 'justify-center px-0' : 'gap-3',
            ]"
            :title="isCollapsed ? item.name : ''"
          >
            <Icon
              :name="item.icon"
              class="h-5 w-5 shrink-0 transition-colors"
              :class="
                isActive(item.href)
                  ? 'text-primary-600'
                  : 'text-gray-400 group-hover:text-gray-600'
              "
            />
            <span v-if="!isCollapsed" class="animate-in fade-in duration-300">{{ item.name }}</span>
          </NuxtLink>
        </div>

        <!-- Spacer -->
        <div class="flex-1" />

        <!-- Collapse Toggle (Desktop only) -->
        <button
          @click="toggleCollapse"
          class="hidden lg:flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-400 dark:text-bluerain-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-600 dark:hover:text-bluerain-200 transition-all duration-200"
          :class="[isCollapsed ? 'justify-center px-0' : '']"
          title="Toggle Sidebar"
        >
          <Icon
            :name="isCollapsed ? 'lucide:chevrons-right' : 'lucide:chevrons-left'"
            class="h-5 w-5 shrink-0"
          />
          <span v-if="!isCollapsed">Collapse</span>
        </button>

        <!-- User Card -->
        <div
          class="mt-4 overflow-hidden rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 p-2 transition-all duration-300"
          :class="[isCollapsed ? 'p-1' : 'p-3']"
        >
          <div class="flex items-center" :class="[isCollapsed ? 'justify-center' : 'gap-3']">
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white dark:bg-bluerain-800 shadow-sm border border-gray-100 dark:border-white/10"
            >
              <Icon name="lucide:user" class="h-4 w-4 text-gray-600 dark:text-bluerain-200" />
            </div>
            <div v-if="!isCollapsed" class="flex-1 min-w-0 animate-in slide-in-from-left-2 duration-300">
              <p class="truncate text-sm font-semibold text-gray-900 dark:text-white">
                {{ user?.name || 'User' }}
              </p>
              <p class="truncate text-xs text-gray-500 dark:text-bluerain-300">{{ user?.email }}</p>
            </div>
            <button
              v-if="!isCollapsed"
              @click="handleLogout"
              class="text-gray-400 dark:text-bluerain-400 hover:text-gray-600 dark:hover:text-bluerain-200 transition-colors animate-in fade-in duration-300"
              title="Sign out"
            >
              <Icon name="lucide:log-out" class="h-4 w-4" />
            </button>
          </div>
          <button
            v-if="isCollapsed"
            @click="handleLogout"
            class="mt-2 flex w-full justify-center text-gray-400 hover:text-gray-600 transition-colors"
            title="Sign out"
          >
            <Icon name="lucide:log-out" class="h-4 w-4" />
          </button>
        </div>
      </nav>
    </aside>
  </div>
</template>
