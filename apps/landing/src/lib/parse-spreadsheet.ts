/**
 * @module parse-spreadsheet
 *
 * Client-side utilities for detecting spreadsheet files and converting them
 * (CSV, XLSX, XLS, ODS) into plain-text CSV strings. This powers the
 * file-upload flow where users attach spreadsheets that need to be
 * serialised into a text representation for the AI chat context.
 *
 * Depends on: papaparse, xlsx (SheetJS)
 * Used by: File-upload / attachment handling in the chat agent UI
 */

"use client";

import * as Papa from "papaparse";

async function getXLSX() {
  return import("xlsx");
}

/** MIME types recognised as spreadsheet formats. */
const SPREADSHEET_MIMES = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.oasis.opendocument.spreadsheet",
]);

/**
 * Determine whether a file descriptor represents a spreadsheet.
 *
 * Checks the MIME type first, then falls back to file-extension matching.
 *
 * @param file - Object with optional mediaType and filename
 * @returns `true` if the file is a recognised spreadsheet format
 */
export function isSpreadsheetFile(file: {
  mediaType?: string;
  filename?: string;
}): boolean {
  if (file.mediaType && SPREADSHEET_MIMES.has(file.mediaType)) return true;
  const ext = file.filename?.split(".").pop()?.toLowerCase();
  return ext === "csv" || ext === "xlsx" || ext === "xls" || ext === "ods";
}

/**
 * Check whether a Blob is a CSV file by MIME type or filename extension.
 *
 * @param blob - The file blob
 * @param filename - Optional original filename for extension-based detection
 * @returns `true` if the blob should be treated as CSV
 */
function isCsvBlob(blob: Blob, filename?: string): boolean {
  const csvTypes = ["text/csv", "application/csv", "text/plain"];
  if (blob.type && csvTypes.includes(blob.type)) return true;
  const ext = filename?.split(".").pop()?.toLowerCase();
  return ext === "csv";
}

/**
 * Parse a spreadsheet blob into a plain-text CSV string.
 *
 * CSV files are round-tripped through PapaParse for consistent formatting.
 * Excel/ODS files are read via SheetJS; multi-sheet workbooks produce
 * labelled sections separated by blank lines.
 *
 * @param blob - The raw file blob to parse
 * @param filename - Optional filename used for format detection
 * @returns Plain-text CSV representation of the spreadsheet content
 */
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

  // Excel / ODS: use SheetJS (lazy-loaded to keep it out of the initial bundle)
  const XLSX = await getXLSX();
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
