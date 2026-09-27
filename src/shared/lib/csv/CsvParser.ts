export type CsvRow = Record<string, string>;

export class CsvParser {
  constructor(readonly delimiter = ",") {}

  parse(text: string): CsvRow[] {
    const [header, ...rows] = this.parseRows(text);
    if (!header) return [];
    return rows.map((cells) => Object.fromEntries(header.map((name, i) => [name, cells[i] ?? ""])));
  }

  parseRows(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = "";
    let quoted = false;
    const src = text.replace(/^﻿/, "");

    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (quoted) {
        if (c === '"' && src[i + 1] === '"') {
          field += '"';
          i++;
        } else if (c === '"') {
          quoted = false;
        } else {
          field += c;
        }
      } else if (c === '"') {
        quoted = true;
      } else if (c === this.delimiter) {
        row.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && src[i + 1] === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += c;
      }
    }
    if (field !== "" || row.length) {
      row.push(field);
      rows.push(row);
    }
    return rows.filter((r) => r.length > 1 || r[0] !== "");
  }
}
