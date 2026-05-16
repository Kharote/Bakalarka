// Locale Service
// Manages internationalization and localization

import { ref, computed } from 'vue';
import enTranslations from '@/locales/en.json';
import skTranslations from '@/locales/sk.json';

const translations = {
  en: enTranslations,
  sk: skTranslations
};

const currentLocale = ref(localStorage.getItem('locale') || 'en');

export function useLocale() {
  const locale = computed(() => currentLocale.value);

  const setLocale = (newLocale) => {
    if (translations[newLocale]) {
      currentLocale.value = newLocale;
      localStorage.setItem('locale', newLocale);
      document.documentElement.lang = newLocale;
    }
  };

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[currentLocale.value];
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }
    
    return value || key;
  };

  const availableLocales = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'sk', name: 'Slovenčina', flag: '🇸🇰' }
  ];

  return {
    locale,
    setLocale,
    t,
    availableLocales
  };
}
