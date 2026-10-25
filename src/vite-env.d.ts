/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `mock` pour la démo 100 % locale, sinon l'API Node.js est utilisée. */
  readonly VITE_API_MODE?: 'http' | 'mock';
  /** URL de base de l'API (défaut : `/api`, relayé par Vite en développement). */
  readonly VITE_API_URL?: string;
  /** Questionnaire public : URL de l'API Yumco (défaut : production Railway). */
  readonly VITE_YUMCO_API_URL?: string;
}
