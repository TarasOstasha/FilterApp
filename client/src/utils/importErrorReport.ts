export type ImportErrorRow = {
  product_code?: string;
  reason?: string;
  [key: string]: unknown;
};

const escapeCsvCell = (value: string): string => {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

export const buildImportErrorReportCsv = (errorRows: ImportErrorRow[]): string => {
  const lines = ['product_code,reason'];
  for (const row of errorRows) {
    const productCode = row.product_code ?? '';
    const reason = row.reason ?? 'Unknown error';
    lines.push(`${escapeCsvCell(productCode)},${escapeCsvCell(reason)}`);
  }
  return lines.join('\n');
};

export const downloadImportErrorReport = (
  errorRows: ImportErrorRow[],
  filename = 'import-errors.csv'
): void => {
  const csv = buildImportErrorReportCsv(errorRows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const getImportErrorPreview = (
  errorRows: ImportErrorRow[],
  limit = 3
): ImportErrorRow[] => errorRows.slice(0, limit);
