export function escapePrintableHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapePrintableHtmlWithBreaks(value: unknown) {
  return escapePrintableHtml(value).replace(/\r?\n/g, "<br>");
}
