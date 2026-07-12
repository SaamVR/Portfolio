const PASS_THROUGH_AT_RULES = ["@font-face", "@keyframes", "@property"];
const NESTED_AT_RULES = ["@media", "@supports", "@container", "@layer", "@document"];

function findMatchingBrace(css: string, openingBraceIndex: number) {
  let depth = 0;

  for (let index = openingBraceIndex; index < css.length; index += 1) {
    const char = css[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function scopeSelectorList(selectorList: string, scopeSelector: string) {
  return selectorList
    .split(",")
    .map((selector) => {
      const trimmed = selector.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith(scopeSelector)) return trimmed;
      if (trimmed.includes(":root")) {
        return trimmed.replace(/:root\b/g, scopeSelector);
      }
      return `${scopeSelector} ${trimmed}`;
    })
    .filter(Boolean)
    .join(", ");
}

export function scopeStoreThemeCss(customCss: string | null | undefined, scopeSelector: string): string {
  if (!customCss?.trim()) {
    return "";
  }

  let result = "";
  let cursor = 0;

  while (cursor < customCss.length) {
    const nextBrace = customCss.indexOf("{", cursor);
    if (nextBrace === -1) {
      result += customCss.slice(cursor);
      break;
    }

    const selectorText = customCss.slice(cursor, nextBrace);
    const blockEnd = findMatchingBrace(customCss, nextBrace);

    if (blockEnd === -1) {
      result += customCss.slice(cursor);
      break;
    }

    const trimmedSelectorText = selectorText.trim();
    const blockContent = customCss.slice(nextBrace + 1, blockEnd);

    if (!trimmedSelectorText) {
      result += `${selectorText}{${blockContent}}`;
      cursor = blockEnd + 1;
      continue;
    }

    const atRule = PASS_THROUGH_AT_RULES.find((prefix) => trimmedSelectorText.startsWith(prefix));
    if (atRule) {
      result += `${selectorText}{${blockContent}}`;
      cursor = blockEnd + 1;
      continue;
    }

    const nestedAtRule = NESTED_AT_RULES.find((prefix) => trimmedSelectorText.startsWith(prefix));
    if (nestedAtRule) {
      result += `${selectorText}{${scopeStoreThemeCss(blockContent, scopeSelector)}}`;
      cursor = blockEnd + 1;
      continue;
    }

    result += `${scopeSelectorList(selectorText, scopeSelector)}{${blockContent}}`;
    cursor = blockEnd + 1;
  }

  return result;
}
