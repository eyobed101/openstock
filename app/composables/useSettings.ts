// API response shape (flat)
interface ApiSettings {
  id: number;
  businessName: string | null;
  currency: string | null;
  defaultMargin: number | null;
  lowStockAlert: boolean | number | null;
  outOfStockAlert: boolean | number | null;
  emailDailyReport: boolean | number | null;
  updatedAt: string | null;
  theme: string | null;
}

// Frontend shape (nested for UI)
export interface Settings {
  businessName: string;
  currency: 'EUR' | 'USD' | 'GBP' | 'ETB';
  theme: 'light' | 'dark';
  defaultMargin: number;
  stockAlerts: {
    lowStock: boolean;
    outOfStock: boolean;
    emailDaily: boolean;
  };
}

// Transform API response to frontend shape
function transformFromApi(api: ApiSettings): Settings {
  return {
    businessName: api.businessName ?? 'OpenStock Inc.',
    currency: (api.currency as Settings['currency']) ?? 'ETB',
    theme: (api.theme as Settings['theme']) ?? 'light',
    defaultMargin: api.defaultMargin ?? 30,
    stockAlerts: {
      lowStock: Boolean(api.lowStockAlert),
      outOfStock: Boolean(api.outOfStockAlert),
      emailDaily: Boolean(api.emailDailyReport),
    },
  };
}

// Transform frontend shape to API payload
function transformToApi(settings: Settings): Partial<ApiSettings> {
  return {
    businessName: settings.businessName,
    currency: settings.currency,
    theme: settings.theme,
    defaultMargin: settings.defaultMargin,
    lowStockAlert: settings.stockAlerts.lowStock,
    outOfStockAlert: settings.stockAlerts.outOfStock,
    emailDailyReport: settings.stockAlerts.emailDaily,
  };
}

export const useSettings = () => {
  const { data: rawSettings, refresh } = useAsyncData<ApiSettings>(
    'settings',
    () => $fetch('/api/settings')
  );

  // Transform raw API data to frontend shape
  const settings = computed<Settings | null>(() => {
    if (!rawSettings.value) return null;
    return transformFromApi(rawSettings.value);
  });

  // Watch theme and apply class
  watch(() => settings.value?.theme, (newTheme) => {
    if (import.meta.client) {
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      } else if (newTheme === 'light') {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      }
    }
  }, { immediate: true });

  const currencySymbol = computed(() => {
    switch (settings.value?.currency) {
      case 'ETB':
        return 'Br';
      case 'EUR':
        return '€';
      case 'USD':
        return '$';
      case 'GBP':
        return '£';
      default:
        return 'Br';
    }
  });

  const currencyIcon = computed(() => {
    switch (settings.value?.currency) {
      case 'ETB':
        return 'lucide:banknote';
      case 'EUR':
        return 'lucide:euro';
      case 'USD':
        return 'lucide:dollar-sign';
      case 'GBP':
        return 'lucide:pound-sterling';
      default:
        return 'lucide:banknote';
    }
  });

  async function toggleTheme() {
    if (!settings.value) return;
    const newTheme = settings.value.theme === 'light' ? 'dark' : 'light';
    await updateSettings({
      ...settings.value,
      theme: newTheme,
    });
  }

  async function updateSettings(newSettings: Settings) {
    try {
      await $fetch('/api/settings', {
        method: 'POST',
        body: transformToApi(newSettings),
      });
      await refresh();
      return true;
    } catch (e) {
      console.error('Failed to save settings', e);
      return false;
    }
  }

  return {
    settings,
    currencySymbol,
    currencyIcon,
    updateSettings,
    toggleTheme,
    refresh,
  };
};
