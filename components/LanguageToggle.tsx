import React from 'react';
import type { Lang } from '../hooks/useTranslations';

interface LanguageToggleProps {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ lang, setLang }) => {
  const toggleLang = () => {
    setLang(lang === 'en' ? 'es' : 'en');
  };

  return (
    <button
      onClick={toggleLang}
      className="p-2 w-12 text-center rounded-full text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-800/50 hover:bg-gray-300 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 focus:ring-xrp-blue transition-colors duration-200 font-semibold"
      aria-label={`Switch to ${lang === 'en' ? 'Spanish' : 'English'}`}
    >
      {lang.toUpperCase()}
    </button>
  );
};