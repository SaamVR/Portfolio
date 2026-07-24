import JSZip from "jszip";

export interface ParsedImportRow {
  rowIndex: number;
  raw: Record<string, string>;
  name: string;
  price: number;
  original_price: number | null;
  category: string;
  type: string;
  sizes: string[];
  colors: string[];
  stock: number;
  image_url: string;
  description: string;
  featured: boolean;
  errors: string[];
  isValid: boolean;
}

export const TEMPLATE_COLUMNS = [
  "name",
  "price",
  "original_price",
  "category",
  "type",
  "sizes",
  "colors",
  "stock",
  "image_url",
  "description",
  "featured",
] as const;

export const SAMPLE_TEMPLATE_CSV = `name,price,original_price,category,type,sizes,colors,stock,image_url,description,featured
Premium Cotton T-Shirt,1200,1500,Essentials,T-Shirt,"S, M, L, XL","Black, Navy",50,https://images.unsplash.com/photo-1521572267360-ee0c2909d518,Soft breathable cotton tee,true
Slim Fit Chino Pants,2500,,Pants,Chino,"30, 32, 34","Beige, Khaki",25,https://images.unsplash.com/photo-1473966968600-fa801b869a1a,Classic stretch chino pants,false`;

export function parseCsvText(text: string): Record<string, string>[] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          insideQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (char === "\r") {
        // Skip carriage return
      } else if (char === "\n") {
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f.length > 0)) {
          lines.push(currentRow);
        }
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      lines.push(currentRow);
    }
  }

  if (lines.length === 0) return [];

  const headers = lines[0].map((h) => h.toLowerCase().replace(/[\s_-]+/g, "_"));
  const records: Record<string, string>[] = [];

  for (let r = 1; r < lines.length; r++) {
    const row = lines[r];
    const record: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      record[headers[c]] = row[c] ?? "";
    }
    records.push(record);
  }

  return records;
}

export async function parseXlsxBuffer(buffer: ArrayBuffer): Promise<Record<string, string>[]> {
  const zip = await JSZip.loadAsync(buffer);

  const sharedStrings: string[] = [];
  const sharedStringsFile = zip.file("xl/sharedStrings.xml");
  if (sharedStringsFile) {
    const xmlText = await sharedStringsFile.async("text");
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    const siElements = xmlDoc.getElementsByTagName("si");
    for (let i = 0; i < siElements.length; i++) {
      const tElements = siElements[i].getElementsByTagName("t");
      let text = "";
      for (let j = 0; j < tElements.length; j++) {
        text += tElements[j].textContent || "";
      }
      sharedStrings.push(text.trim());
    }
  }

  let sheetFile = zip.file("xl/worksheets/sheet1.xml");
  if (!sheetFile) {
    const sheetFiles = Object.keys(zip.files).filter((f) => f.startsWith("xl/worksheets/sheet"));
    if (sheetFiles.length > 0) {
      sheetFile = zip.file(sheetFiles[0]);
    }
  }

  if (!sheetFile) {
    throw new Error("No worksheet found in XLSX file");
  }

  const sheetXml = await sheetFile.async("text");
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(sheetXml, "text/xml");
  const rowElements = xmlDoc.getElementsByTagName("row");

  const matrix: string[][] = [];

  for (let i = 0; i < rowElements.length; i++) {
    const rowEl = rowElements[i];
    const cElements = rowEl.getElementsByTagName("c");
    const rowValues: string[] = [];

    for (let j = 0; j < cElements.length; j++) {
      const cEl = cElements[j];
      const type = cEl.getAttribute("t");
      const vEl = cEl.getElementsByTagName("v")[0];
      let val = vEl ? (vEl.textContent || "") : "";

      if (type === "s" && val !== "") {
        const idx = Number(val);
        val = sharedStrings[idx] ?? val;
      } else if (type === "inlineStr") {
        const tEl = cEl.getElementsByTagName("t")[0];
        val = tEl ? (tEl.textContent || "") : val;
      }

      rowValues.push(val.trim());
    }

    if (rowValues.some((v) => v.length > 0)) {
      matrix.push(rowValues);
    }
  }

  if (matrix.length === 0) return [];

  const headers = matrix[0].map((h) => h.toLowerCase().replace(/[\s_-]+/g, "_"));
  const records: Record<string, string>[] = [];

  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r];
    const record: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      record[headers[c]] = row[c] ?? "";
    }
    records.push(record);
  }

  return records;
}

export function validateImportRow(raw: Record<string, string>, rowIndex: number): ParsedImportRow {
  const errors: string[] = [];

  const name = (raw.name || raw.product_name || raw.title || "").trim();
  if (!name) {
    errors.push("Missing name");
  }

  const rawPrice = raw.price;
  const price = Number(rawPrice);
  if (!rawPrice || isNaN(price) || price <= 0) {
    errors.push("Invalid price");
  }

  const imageUrl = (raw.image_url || raw.image || raw.img || "").trim();
  if (!imageUrl) {
    errors.push("Missing image");
  }

  const rawOrigPrice = raw.original_price;
  const origPriceNum = rawOrigPrice ? Number(rawOrigPrice) : NaN;
  const original_price = !isNaN(origPriceNum) && origPriceNum > 0 ? origPriceNum : null;

  const category = (raw.category || "Essentials").trim();
  const type = (raw.type || "T-Shirt").trim();

  const parseArrayField = (val: string | undefined): string[] => {
    if (!val) return [];
    return val
      .split(/[,|]/)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const sizes = parseArrayField(raw.sizes);
  const colors = parseArrayField(raw.colors);

  const rawStock = raw.stock;
  const stockNum = rawStock !== undefined && rawStock !== "" ? Number(rawStock) : 0;
  const stock = !isNaN(stockNum) && stockNum >= 0 ? Math.floor(stockNum) : 0;

  const description = (raw.description || "").trim();
  const rawFeatured = String(raw.featured || "").toLowerCase().trim();
  const featured = rawFeatured === "true" || rawFeatured === "1" || rawFeatured === "yes";

  return {
    rowIndex,
    raw,
    name,
    price: isNaN(price) ? 0 : price,
    original_price,
    category,
    type,
    sizes,
    colors,
    stock,
    image_url: imageUrl,
    description,
    featured,
    errors,
    isValid: errors.length === 0,
  };
}

export function buildStoreBatchInsertPayload(rows: ParsedImportRow[], storeId: string) {
  if (!storeId || typeof storeId !== "string" || !storeId.trim()) {
    throw new Error("Store scoping violation: activeStoreId is required");
  }

  const validRows = rows.filter((r) => r.isValid);

  return validRows.map((r) => ({
    store_id: storeId,
    name: r.name,
    price: r.price,
    original_price: r.original_price,
    category: r.category,
    type: r.type,
    sizes: r.sizes,
    colors: r.colors,
    stock: r.stock,
    image_url: r.image_url,
    images: r.image_url ? [r.image_url] : [],
    description: r.description,
    featured: r.featured,
    is_available: r.stock > 0,
    badge: r.original_price && r.original_price > r.price ? "Sale" : null,
  }));
}
