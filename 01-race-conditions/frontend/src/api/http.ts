export const API_BASE = '/api/game';

interface Success<T> {
  ok: true;
  status: number;
  data: T;
}

export interface Failure {
  ok: false;
  status: number;
  detail?: unknown;
}

export type Reply<T> = Success<T> | Failure;

interface RequestOptions {
  method?: 'POST' | 'DELETE';
  body?: unknown;
  token?: string;
}

export async function send<T>(
  path: string,
  { method = 'POST', body, token }: RequestOptions = {},
): Promise<Reply<T>> {
  const headers = new Headers();

  if (token !== undefined) {
    headers.set('X-Admin-Token', token);
  }
  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;

  try {
    response = await fetch(API_BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    return { ok: false, status: 0 };
  }

  const data: unknown = await response.json().catch(() => ({}));

  if (response.ok) {
    return { ok: true, status: response.status, data: data as T };
  }

  return { ok: false, status: response.status, detail: (data as { detail?: unknown }).detail };
}

export function failureText(failure: Failure): string {
  if (failure.status === 0) {
    return 'no connection to the server';
  }
  if (typeof failure.detail === 'string') {
    return failure.detail;
  }
  if (failure.detail !== undefined) {
    return JSON.stringify(failure.detail);
  }

  return `HTTP ${failure.status}`;
}
