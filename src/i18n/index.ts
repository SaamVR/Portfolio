import { enTranslation, type TranslationSchema } from "./locales/en";
import { bnTranslation } from "./locales/bn";
import { Language, SUPPORTED_LANGUAGES } from "./types";

export type { Language, TranslationSchema };
export { SUPPORTED_LANGUAGES };

export const TRANSLATIONS: Record<Language, TranslationSchema> = {
  en: enTranslation,
  bn: bnTranslation,
};

/**
 * Safely retrieve translations for a given language code.
 * Falls back to English if the language is not supported or undefined.
 */
export function getTranslation(lang: Language = "en"): TranslationSchema {
  return TRANSLATIONS[lang] || TRANSLATIONS.en;
}
