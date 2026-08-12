const themeFontVariableMap = {
  inter: "var(--font-inter), sans-serif",
  lato: "var(--font-lato), sans-serif",
  montserrat: "var(--font-montserrat), sans-serif",
  nunito: "var(--font-nunito), sans-serif",
  "open sans": "var(--font-open-sans), sans-serif",
  oswald: "var(--font-oswald), sans-serif",
  outfit: "var(--font-outfit), sans-serif",
  "playfair display": "var(--font-playfair-display), serif",
  "plus jakarta sans": "var(--font-plus-jakarta-sans), sans-serif",
  poppins: "var(--font-poppins), sans-serif",
  raleway: "var(--font-raleway), sans-serif",
  roboto: "var(--font-roboto), sans-serif",
  "source sans 3": "var(--font-source-sans-3), sans-serif",
} as const;

export function normalizeThemeFontFamily(value: string) {
  const normalized = value.trim().replace(/^['"]+|['"]+$/g, "").replace(/\s+/g, " ").toLowerCase();

  for (const [fontName, fontVariable] of Object.entries(themeFontVariableMap)) {
    if (normalized.startsWith(fontName)) {
      return fontVariable;
    }
  }

  return value;
}
