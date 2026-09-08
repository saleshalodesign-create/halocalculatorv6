import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations } from '../i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: typeof translations.zh;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('halo_lang');
      if (saved === 'en' || saved === 'zh') {
        return saved;
      }
    } catch {
      // ignore
    }
    // Default to Chinese as requested by user
    return 'zh';
  });

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem('halo_lang', newLang);
      document.documentElement.lang = newLang === 'zh' ? 'zh-CN' : 'en';
    } catch (e) {
      console.warn('Failed to persist language in localStorage', e);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh');
  };

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  }, [language]);

  const value = {
    language,
    setLanguage,
    toggleLanguage,
    t: translations[language],
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback if not inside provider
    return {
      language: 'zh',
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: translations.zh,
    };
  }
  return context;
};
