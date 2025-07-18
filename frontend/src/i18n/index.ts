import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import ptBR from './locales/pt-BR.json';

const resources = {
  en: {
    translation: en
  },
  'pt-BR': {
    translation: ptBR
  },
  pt: {
    translation: ptBR
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    interpolation: {
      escapeValue: false
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      excludeCacheFor: ['cimode']
    },
    
    // Configuração adicional para garantir persistência
    load: 'languageOnly',
    cleanCode: true,
    lowerCaseLng: false
  });

export default i18n;