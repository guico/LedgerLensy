import { useState, useCallback, useEffect } from 'react';
import { translations } from '../utils/translations';

export type Lang = 'en' | 'es';

export const useTranslations = () => {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedLang = window.localStorage.getItem('lang');
      if (storedLang === 'en' || storedLang === 'es') {
        return storedLang;
      }
    }
    return 'en'; // Default to English
  });

  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  const t = useCallback(
    (key: string, params: Record<string, string | number> = {}): string => {
      const langKey = lang as keyof typeof translations;
      const translationKey = key as keyof typeof translations[typeof langKey];

      let text = translations[langKey][translationKey] || translations['en'][translationKey];

      if (!text) {
        console.warn(`Translation key "${key}" not found.`);
        return key;
      }

      Object.keys(params).forEach(paramKey => {
        const regex = new RegExp(`{{${paramKey}}}`, 'g');
        text = text.replace(regex, String(params[paramKey]));
      });

      return text;
    },
    [lang]
  );

  return { lang, setLang, t };
};