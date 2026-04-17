import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import pt from './locales/pt.json';
import en from './locales/en.json';
import es from './locales/es.json';

/**
 * Configuração do i18next com detecção automática de idioma.
 * 
 * Ordem de detecção:
 * 1. QueryString (?lng=en)
 * 2. localStorage (idioma previamente selecionado)
 * 3. navigator.language (idioma do navegador do usuário)
 * 
 * Fallback: pt (Português-BR)
 */
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: pt },
      en: { translation: en },
      es: { translation: es },
    },
    fallbackLng: 'pt',
    supportedLngs: ['pt', 'en', 'es'],

    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      lookupQuerystring: 'lng',
      lookupLocalStorage: 'retronote_language',
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false, // React já faz escape
    },

    react: {
      useSuspense: false,
    },
  });

export default i18n;
