import { AxiosError, CanceledError } from 'axios';
import { apiClient } from './client';

export interface ReadOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

/** Bound the entire read, including shared authentication/refresh waits. */
export async function boundedGet<T>(url: string, options: ReadOptions = {}): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancel: (() => void) | undefined;
  try {
    return await new Promise<T>((resolve, reject) => {
      cancel = () => {
        reject(new CanceledError('Request cancelled.'));
        controller.abort();
      };
      if (options.signal?.aborted) { cancel(); return; }
      options.signal?.addEventListener('abort', cancel, { once: true });
      const timeout = options.timeoutMs ?? 15_000;
      timer = setTimeout(() => {
        reject(new AxiosError('Request timed out.', 'ECONNABORTED'));
        controller.abort();
      }, timeout);
      apiClient.get<T>(url, { timeout, signal: controller.signal })
        .then(response => resolve(response.data), reject);
    });
  } finally {
    clearTimeout(timer);
    if (cancel) options.signal?.removeEventListener('abort', cancel);
  }
}
