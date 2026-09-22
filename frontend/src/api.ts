namespace PigeAPI {
  export interface Person {
    id: string; version: number; name: string; social_name: string; cpf: string | null;
    birth_date: string | null; phone: string; email: string; address: string; notes: string; is_guardian: boolean;
  }
  export interface User { id: string; version: number; name: string; email: string; role: string; role_label?: string; active: boolean; person_id?: string | null; permissions: string[]; school_ids: string[] }
  export type Value = string | number | boolean | null | string[];
  export type FormDataMap = Record<string, Value>;
  // Registros de catálogo usam um mapa tipado; dados pessoais têm contrato próprio acima.
  export interface Row { id: string; version: number; [key: string]: unknown }
  export interface Student extends Row { number: string; person: Person; status: string; previous_school: string; guardians?: Row[]; enrollments?: Row[] }
  export interface Page<T> { items: T[]; total: number; page: number; page_size: number }
  export interface School extends Row { name: string; company_id: string; document_policy: string; address: string; phone: string; email: string; active: boolean }
  export interface SessionResponse { access_token: string; user: User }
  let token = '';
  let refreshPromise: Promise<SessionResponse> | null = null;
  export function clear(): void { token = ''; }
  export function useSession(response: SessionResponse): void { token = response.access_token; }
  async function error(response: Response): Promise<Error> {
    let data: { detail?: string; errors?: { field: string; message: string }[]; request_id?: string } = {};
    try { data = await response.json(); } catch { /* A origem pode estar indisponível. */ }
    const fields = data.errors?.map(e => `${e.field.replace(/^body\./, '')}: ${e.message}`).join('\n');
    const failure = new Error(fields || data.detail || `Falha de comunicação (${response.status}).`);
    Object.assign(failure, { status: response.status });
    return failure;
  }
  export async function refresh(): Promise<SessionResponse> {
    if (!refreshPromise) {
      refreshPromise = fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Protection': '1' } })
        .then(async response => { if (!response.ok) throw await error(response); const data: SessionResponse = await response.json(); useSession(data); return data; })
        .finally(() => { refreshPromise = null; });
    }
    return refreshPromise;
  }
  export async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
    if (!navigator.onLine) throw new Error('Sem conexão. Os dados não foram enviados. Reconecte-se antes de salvar.');
    const headers = new Headers(options.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    headers.set('X-CSRF-Protection', '1');
    if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
    const response = await fetch('/api/v1' + path, { ...options, headers, credentials: 'same-origin', cache: 'no-store' });
    if (response.status === 401 && retry && token && !path.startsWith('/auth/')) {
      try { await refresh(); return await request<T>(path, options, false); }
      catch { clear(); window.dispatchEvent(new CustomEvent('pige-session-expired')); }
    }
    if (!response.ok) throw await error(response);
    return await response.json() as T;
  }
  export function post<T>(path: string, body: unknown): Promise<T> { return request<T>(path, { method: 'POST', body: JSON.stringify(body) }); }
  export function patch<T>(path: string, body: unknown): Promise<T> { return request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }); }
  export async function download(path: string, filename: string): Promise<void> {
    let response = await fetch('/api/v1' + path, { headers: { Authorization: `Bearer ${token}` }, credentials: 'same-origin', cache: 'no-store' });
    if (response.status === 401) { await refresh(); response = await fetch('/api/v1' + path, { headers: { Authorization: `Bearer ${token}` }, credentials: 'same-origin', cache: 'no-store' }); }
    if (!response.ok) throw await error(response);
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}
