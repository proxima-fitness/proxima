/** Parses user message text to extract spreadsheet blocks for display-only rendering. */
function parseUserMessageWithSpreadsheets(text: string): {
    displayText: string;
    spreadsheetLabels: string[];
} {
    const labels: string[] = [];
    const blockRegex = /\[Attached spreadsheet: ([^\]]+)\]\n[\s\S]*?(?=\n\n\[Attached spreadsheet: [^\]]+\]\n|$)/g;
    let match;
    while ((match = blockRegex.exec(text)) !== null) {
        labels.push(match[1].trim());
    }
    const displayText = text
        .replace(/\[Attached spreadsheet: [^\]]+\]\n[\s\S]*?(?=\n\n\[Attached spreadsheet: [^\]]+\]\n|$)/g, "")
        .replace(/\n\n+/g, "\n\n")
        .trim();
    return { displayText, spreadsheetLabels: labels };
}

/** Truncates long filenames with ellipsis while keeping the extension visible. */
function truncateFilename(filename: string, maxBaseLength = 24): string {
    const lastDot = filename.lastIndexOf(".");
    const base = lastDot >= 0 ? filename.slice(0, lastDot) : filename;
    const ext = lastDot >= 0 ? filename.slice(lastDot) : "";
    if (base.length <= maxBaseLength) return filename;
    return base.slice(0, maxBaseLength) + "..." + ext;
}

export { parseUserMessageWithSpreadsheets, truncateFilename };
