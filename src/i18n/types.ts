export type Language = "en" | "bn";

export interface LanguageOption {
  code: Language;
  label: string;
  nativeLabel: string;
  flag?: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", nativeLabel: "EN" },
  { code: "bn", label: "Bengali", nativeLabel: "বাংলা" },
];
