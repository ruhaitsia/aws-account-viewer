import * as fs from 'fs';
import { Parser } from 'json2csv';
import type { ExportOptions, ExportResult, ExportMetadata, ExportData } from '../../shared/types';

/**
 * Filter service data based on selected services.
 * If services array is empty, return all data.
 * Otherwise, return only the keys matching the services array.
 */
export function filterServiceData(
  data: Record<string, unknown>,
  services: string[]
): Record<string, unknown> {
  if (services.length === 0) {
    return data;
  }
  const filtered: Record<string, unknown> = {};
  for (const service of services) {
    if (service in data) {
      filtered[service] = data[service];
    }
  }
  return filtered;
}

/**
 * Flatten a nested object into a single-level object with dot-notation keys.
 * Arrays are JSON-stringified.
 */
function flattenObject(obj: unknown, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (obj === null || obj === undefined) {
    return result;
  }
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    result[prefix || 'value'] = Array.isArray(obj) ? JSON.stringify(obj) : obj;
    return result;
  }
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else if (Array.isArray(value)) {
      result[newKey] = JSON.stringify(value);
    } else {
      result[newKey] = value;
    }
  }
  return result;
}

/**
 * Convert service data map into a flat array of rows suitable for CSV export.
 * Each row includes a 'service' column identifying which service the row belongs to.
 */
function flattenForCsv(data: Record<string, unknown>): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (const [serviceName, serviceData] of Object.entries(data)) {
    if (Array.isArray(serviceData)) {
      for (const item of serviceData) {
        rows.push({ service: serviceName, ...flattenObject(item) });
      }
    } else if (serviceData !== null && typeof serviceData === 'object') {
      rows.push({ service: serviceName, ...flattenObject(serviceData) });
    } else {
      rows.push({ service: serviceName, value: serviceData });
    }
  }
  return rows;
}

/**
 * Export data to JSON format with structured metadata.
 */
function exportJson(data: Record<string, unknown>, metadata: ExportMetadata): string {
  const exportData: ExportData = {
    metadata,
    data,
  };
  return JSON.stringify(exportData, null, 2);
}

/**
 * Export data to CSV format using json2csv.
 * Returns a CSV string with header row + data rows.
 */
function exportCsv(data: Record<string, unknown>): string {
  const rows = flattenForCsv(data);
  if (rows.length === 0) {
    return '';
  }
  // Collect all unique fields across all rows
  const fieldSet = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      fieldSet.add(key);
    }
  }
  const fields = Array.from(fieldSet);
  const parser = new Parser({ fields });
  return parser.parse(rows);
}

/**
 * Export collected service data to a file.
 */
export async function exportData(
  data: Record<string, unknown>,
  options: ExportOptions,
  metadata: Omit<ExportMetadata, 'services' | 'dataType'>
): Promise<ExportResult> {
  try {
    const filteredData = filterServiceData(data, options.services);
    const serviceNames = options.services.length > 0
      ? options.services
      : Object.keys(data);

    const fullMetadata: ExportMetadata = {
      ...metadata,
      dataType: options.services.length === 0 || options.services.length > 1 ? 'full' : 'single-service',
      services: serviceNames,
    };

    let content: string;
    if (options.format === 'json') {
      content = exportJson(filteredData, fullMetadata);
    } else {
      content = exportCsv(filteredData);
    }

    fs.writeFileSync(options.filePath, content, 'utf-8');
    const stats = fs.statSync(options.filePath);

    return {
      success: true,
      filePath: options.filePath,
      fileSize: stats.size,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      filePath: options.filePath,
      fileSize: 0,
      error: message,
    };
  }
}

/**
 * Show native file save dialog via Electron dialog API.
 */
export async function showSaveDialog(defaultName: string): Promise<string | null> {
  // Dynamic import to avoid issues in test environments where electron is not available
  const { dialog } = await import('electron');
  const result = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (result.canceled || !result.filePath) {
    return null;
  }
  return result.filePath;
}
