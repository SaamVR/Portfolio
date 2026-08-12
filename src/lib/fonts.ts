export { normalizeThemeFontFamily } from "@/lib/font-families";

// Keep the layout contract stable without relying on build-time Google font fetching.
// Theme font selection is now resolved through CSS font-family stacks instead.
export const appFontVariables = "";
