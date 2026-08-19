import { strFromU8, unzipSync } from "fflate";

export type XlsxSheet = { name: string; rows: Array<Array<string | number>> };

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
}

function attribute(tag: string, name: string): string {
  return decodeXml(tag.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? "");
}

function columnIndex(reference: string): number {
  const letters = reference.match(/[A-Z]+/i)?.[0]?.toUpperCase() ?? "A";
  return [...letters].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function parseWorksheet(xml: string, sharedStrings: string[]): Array<Array<string | number>> {
  const rows: Array<Array<string | number>> = [];
  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: Array<string | number> = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1];
      const body = cellMatch[2];
      const index = columnIndex(attribute(attrs, "r"));
      const type = attribute(attrs, "t");
      const raw = body.match(/<v>([\s\S]*?)<\/v>/)?.[1]
        ?? [...body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((item) => item[1]).join("");
      if (raw === undefined) continue;
      const decoded = decodeXml(raw);
      const value = type === "s" ? sharedStrings[Number(decoded)] ?? "" : type === "inlineStr" || type === "str" ? decoded : Number.isFinite(Number(decoded)) ? Number(decoded) : decoded;
      row[index] = value;
    }
    if (row.some((value) => value !== undefined && value !== "")) rows.push(row);
  }
  return rows;
}

export function readXlsxSheets(buffer: ArrayBuffer): XlsxSheet[] {
  const files = unzipSync(new Uint8Array(buffer));
  const read = (path: string) => files[path] ? strFromU8(files[path]) : "";
  const sharedStrings = [...read("xl/sharedStrings.xml").matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)]
    .map((item) => decodeXml([...item[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((part) => part[1]).join("")));
  const relationships = new Map<string, string>();
  for (const match of read("xl/_rels/workbook.xml.rels").matchAll(/<Relationship\b[^>]*\/>/g)) {
    relationships.set(attribute(match[0], "Id"), attribute(match[0], "Target").replace(/^\/?xl\//, ""));
  }
  const sheets: XlsxSheet[] = [];
  for (const match of read("xl/workbook.xml").matchAll(/<sheet\b[^>]*\/>/g)) {
    const name = attribute(match[0], "name");
    const target = relationships.get(attribute(match[0], "r:id"));
    if (!target) continue;
    const path = `xl/${target.replace(/^\.\//, "")}`;
    const rows = parseWorksheet(read(path), sharedStrings);
    if (rows.length > 0) sheets.push({ name, rows });
  }
  return sheets;
}
