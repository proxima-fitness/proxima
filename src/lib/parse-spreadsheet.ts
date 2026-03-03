"use client";

import * as Papa from "papaparse";
import * as XLSX from "xlsx";

const SPREADSHEET_MIMES = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.oasis.opendocument.spreadsheet",
]);

export function isSpreadsheetFile(file: {
  mediaType?: string;
  filename?: string;
}): boolean {
  if (file.mediaType && SPREADSHEET_MIMES.has(file.mediaType)) return true;
  const ext = file.filename?.split(".").pop()?.toLowerCase();
  return ext === "csv" || ext === "xlsx" || ext === "xls" || ext === "ods";
}

function isCsvBlob(blob: Blob, filename?: string): boolean {
  const csvTypes = ["text/csv", "application/csv", "text/plain"];
  if (blob.type && csvTypes.includes(blob.type)) return true;
  const ext = filename?.split(".").pop()?.toLowerCase();
  return ext === "csv";
}

export async function parseSpreadsheetToText(
  blob: Blob,
  filename?: string
): Promise<string> {
  if (isCsvBlob(blob, filename)) {
    const text = await blob.text();
    // Optionally parse and re-serialize for consistent formatting
    try {
      const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
      return Papa.unparse(parsed.data);
    } catch {
      return text;
    }
  }

  // Excel / ODS: use SheetJS
  const arrayBuffer = await blob.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const parts: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const csv = XLSX.utils.sheet_to_csv(sheet);
    if (workbook.SheetNames.length > 1) {
      parts.push(`Sheet: ${sheetName}\n${csv}`);
    } else {
      parts.push(csv);
    }
  }

  return parts.join("\n\n");
}
