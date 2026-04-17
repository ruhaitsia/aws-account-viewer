import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import type { UploadConfig, UploadProgress, UploadResult } from '../../shared/types';

const MAX_RETRIES = 3;
const RETRY_INTERVAL_MS = 5000;

// Patterns for AWS credential detection
const ACCESS_KEY_PATTERN = /AKIA[A-Z0-9]{16}/g;
const SECRET_KEY_FIELD_NAMES = ['aws_secret_access_key', 'secretAccessKey', 'SecretAccessKey', 'secret_access_key'];

/**
 * Recursively sanitize data by redacting AWS credentials.
 * Returns a deep copy — original data is not modified.
 */
export function sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
  return deepSanitize(data) as Record<string, unknown>;
}

function deepSanitize(value: unknown, parentKey?: string): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return sanitizeString(value, parentKey);
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepSanitize(item));
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = deepSanitize(val, key);
    }
    return result;
  }

  // Primitives (number, boolean) pass through unchanged
  return value;
}

function sanitizeString(value: string, parentKey?: string): string {
  // If the parent key indicates this is a secret key field, redact the entire value
  if (parentKey && SECRET_KEY_FIELD_NAMES.includes(parentKey)) {
    return '[REDACTED_SECRET_KEY]';
  }

  // Replace any AWS Access Key ID patterns
  let sanitized = value.replace(ACCESS_KEY_PATTERN, '[REDACTED_ACCESS_KEY]');

  return sanitized;
}


/**
 * DataUploader handles uploading sanitized data to a configured cloud API endpoint.
 */
class DataUploader {
  private config: UploadConfig | null = null;

  /**
   * Store the API endpoint and auth token in memory.
   */
  configure(config: UploadConfig): void {
    this.config = config;
  }

  /**
   * Get the current upload configuration.
   */
  getConfig(): UploadConfig | null {
    return this.config;
  }

  /**
   * Upload data to the configured endpoint with progress reporting and auto-retry.
   * Data is sanitized before upload.
   */
  async upload(
    data: Record<string, unknown>,
    onProgress: (p: UploadProgress) => void
  ): Promise<UploadResult> {
    if (!this.config) {
      return {
        success: false,
        dataSize: 0,
        duration: 0,
        error: '上传未配置，请先设置 API 端点和认证令牌',
      };
    }

    const startTime = Date.now();

    // Sanitize data before upload
    const sanitized = sanitizeData(data);
    const jsonPayload = JSON.stringify(sanitized);
    const totalBytes = Buffer.byteLength(jsonPayload, 'utf-8');

    // Report initial progress
    onProgress({ percentage: 0, bytesUploaded: 0, totalBytes });

    let lastError: string | undefined;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await this.doUpload(jsonPayload, totalBytes, onProgress);
        const duration = Date.now() - startTime;
        onProgress({ percentage: 100, bytesUploaded: totalBytes, totalBytes });
        return { success: true, dataSize: totalBytes, duration };
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_INTERVAL_MS);
        }
      }
    }

    const duration = Date.now() - startTime;
    return {
      success: false,
      dataSize: totalBytes,
      duration,
      error: `上传失败（已重试 ${MAX_RETRIES} 次）: ${lastError}`,
    };
  }

  private doUpload(
    payload: string,
    totalBytes: number,
    onProgress: (p: UploadProgress) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = new URL(this.config!.apiEndpoint);
      const isHttps = url.protocol === 'https:';
      const transport = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': totalBytes.toString(),
          'Authorization': `Bearer ${this.config!.authToken}`,
        },
      };

      const req = transport.request(options, (res) => {
        let body = '';
        res.on('data', (chunk: Buffer | string) => {
          body += chunk.toString();
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      // Write payload and track progress
      const chunkSize = 16 * 1024; // 16KB chunks
      let bytesWritten = 0;
      const buf = Buffer.from(payload, 'utf-8');

      const writeNextChunk = (): void => {
        let canContinue = true;
        while (canContinue && bytesWritten < totalBytes) {
          const end = Math.min(bytesWritten + chunkSize, totalBytes);
          const chunk = buf.subarray(bytesWritten, end);
          bytesWritten = end;

          const percentage = Math.round((bytesWritten / totalBytes) * 100);
          onProgress({ percentage, bytesUploaded: bytesWritten, totalBytes });

          if (bytesWritten >= totalBytes) {
            req.end(chunk);
            return;
          }
          canContinue = req.write(chunk);
        }
        if (bytesWritten < totalBytes) {
          req.once('drain', writeNextChunk);
        }
      };

      writeNextChunk();
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const dataUploader = new DataUploader();
export { DataUploader };
