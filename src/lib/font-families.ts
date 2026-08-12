const themeFontVariableMap = {
  inter: "\"Inter\", \"Segoe UI\", system-ui, sans-serif",
  lato: "\"Lato\", \"Segoe UI\", system-ui, sans-serif",
  montserrat: "\"Montserrat\", \"Segoe UI\", system-ui, sans-serif",
  nunito: "\"Nunito\", \"Segoe UI\", system-ui, sans-serif",
  "open sans": "\"Open Sans\", \"Segoe UI\", system-ui, sans-serif",
  oswald: "\"Oswald\", \"Arial Narrow\", sans-serif",
  outfit: "\"Outfit\", \"Segoe UI\", system-ui, sans-serif",
  "playfair display": "\"Playfair Display\", Georgia, serif",
  "plus jakarta sans": "\"Plus Jakarta Sans\", \"Segoe UI\", system-ui, sans-serif",
  poppins: "\"Poppins\", \"Segoe UI\", system-ui, sans-serif",
  raleway: "\"Raleway\", \"Segoe UI\", system-ui, sans-serif",
  roboto: "\"Roboto\", \"Segoe UI\", system-ui, sans-serif",
  "source sans 3": "\"Source Sans 3\", \"Segoe UI\", system-ui, sans-serif",
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
