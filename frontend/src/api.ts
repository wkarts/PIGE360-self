namespace PigeAPI {
  export interface Person {
    id: string; version: number; name: string; social_name: string; cpf: string | null;
    birth_date: string | null; phone: string; email: string; address: string; notes: string; is_guardian: boolean;
    rg: string; rg_issuer: string; rg_state: string; rg_issued_on: string | null;
    birth_certificate: string; birth_city: string; birth_state: string; nationality: string;
    sex: string; gender: string; race_color: string; marital_status: string;
    mother_name: string; father_name: string; phone_secondary: string;
    postal_code: string; street: string; address_number: string; address_complement: string;
    district: string; city: string; state: string; country: string;
    occupation: string; employer: string; education: string;
    emergency_contact_name: string; emergency_contact_phone: string;
    photo_file_id?: string | null; role_keys?: string[]; roles?: string[]; access_role_keys?: string[]; person_types?: string[]; person_type_labels?: string[]; student_id?: string | null; active: boolean;
  }
  export interface User { id: string; version: number; name: string; email: string; role: string; role_label?: string; active: boolean; person_id?: string | null; has_photo?:boolean; photo_revision?:string; created_at?:string; permissions: string[]; school_ids: string[]; admin_tools?: {portability:boolean;diagnostics:boolean;audit:boolean;develop_build:boolean} }
  export type Value = string | number | boolean | null | string[];
  export type FormDataMap = Record<string, Value>;
  // Registros de catálogo usam um mapa tipado; dados pessoais têm contrato próprio acima.
  export interface Row { id: string; version: number; [key: string]: unknown }
  export interface Student extends Row { number: string; person: Person; status: string; previous_school: string; guardians?: Row[]; enrollments?: Row[] }
  export interface TeacherProfile extends Row { person: Person; registration_number: string; professional_registration: string; employment_type: string; employment_status: string; workload_hours: number }
  export interface EmployeeProfile extends Row { person: Person; employee_number: string; employment_type: string; employment_status: string; department: string; job_title: string }
  export interface Page<T> { items: T[]; total: number; page: number; page_size: number }
  export interface School extends Row { name: string; company_id: string; document_policy: string; address: string; phone: string; email: string; active: boolean }
  export interface SessionResponse { access_token: string; user: User }
  let token = '';
  let activeSchool = '';
  let scopeEpoch = 0;
  let scopeController = new AbortController();
  let authEpoch = 0;
  let authController = new AbortController();
  let refreshPromise: Promise<SessionResponse> | null = null;
  export function setActiveSchool(schoolId: string): void {
    if (activeSchool === schoolId) return;
    activeSchool = schoolId; scopeEpoch++;
    scopeController.abort(); scopeController = new AbortController();
  }
  function scopeChanged(): Error { return Object.assign(new Error('A entidade ativa foi alterada.'), {name:'AbortError'}); }
  function checkScope(epoch: number): void { if (epoch !== scopeEpoch) throw scopeChanged(); }
  function scopedHeaders(path: string, initial?: HeadersInit): Headers {
    const headers = new Headers(initial);
    const pathSchool = path.match(/^\/schools\/([^/?]+)/)?.[1];
    if (activeSchool && pathSchool && decodeURIComponent(pathSchool) !== activeSchool) throw scopeChanged();
    if (activeSchool) headers.set('X-School-Id', activeSchool);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }
  export function clear(): void {
    token = ''; activeSchool = ''; scopeEpoch++; authEpoch++;
    authController.abort(); authController = new AbortController(); refreshPromise = null;
    scopeController.abort(); scopeController = new AbortController();
  }
  export function useSession(response: SessionResponse): void { token = response.access_token; }
  async function error(response: Response, epoch?: number): Promise<Error> {
    let data: { detail?: string; errors?: { field: string; message: string }[]; request_id?: string } = {};
    try { data = await response.json(); } catch { /* A origem pode estar indisponível. */ }
    if (epoch !== undefined) checkScope(epoch);
    const captions:Record<string,string>={name:'Nome',social_name:'Nome social',email:'E-mail',password:'Senha',phone:'Telefone',cpf:'CPF',cnpj:'CNPJ',birth_date:'Data de nascimento',student_id:'Aluno',person_id:'Pessoa',guardian_id:'Responsável',academic_year_id:'Ano letivo',class_group_id:'Turma',unit_id:'Unidade',grade_id:'Série',shift_id:'Turno',enrolled_on:'Data da matrícula',due_date:'Vencimento',amount:'Valor',description:'Descrição',postal_code:'CEP',street:'Endereço',address_number:'Número',district:'Bairro',city:'Cidade',state:'Estado',capacity:'Vagas',starts_on:'Data inicial',ends_on:'Data final',date_from:'Data inicial',date_to:'Data final',file:'Arquivo',status:'Situação',reason:'Motivo',title:'Título',legal:'Responsável legal',financial:'Responsável financeiro'};
    const fields = data.errors?.map(e => {const key=e.field.split('.').at(-1)||'';return `${captions[key]||'Campo informado'}: ${e.message}`;}).join('\n');
    const reference = data.request_id || response.headers.get('X-Request-ID') || '';
    const failure = new Error((fields || data.detail || `Falha de comunicação (${response.status}).`) + (reference ? ' · Referência: '+reference : ''));
    Object.assign(failure, { status: response.status, fields: data.errors || [] });
    return failure;
  }
  export async function refresh(): Promise<SessionResponse> {
    if (!refreshPromise) {
      const epoch = authEpoch;
      const pending = fetch('/api/v1/auth/refresh', { method: 'POST', signal: authController.signal, credentials: 'same-origin', headers: { 'X-CSRF-Protection': '1' } })
        .then(async response => {
          if (!response.ok) { const failure = await error(response); if(epoch !== authEpoch) throw scopeChanged(); throw failure; }
          const data: SessionResponse = await response.json();
          if(epoch !== authEpoch) throw scopeChanged();
          useSession(data); return data;
        });
      refreshPromise = pending;
      void pending.finally(() => { if(refreshPromise === pending) refreshPromise = null; }).catch(() => {});
    }
    return refreshPromise;
  }
  export async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
    if (!navigator.onLine) throw new Error('Sem conexão. Os dados não foram enviados. Reconecte-se antes de salvar.');
    const epoch = scopeEpoch;
    const headers = scopedHeaders(path, options.headers);
    headers.set('X-CSRF-Protection', '1');
    if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
    const signals = options.signal ? [scopeController.signal, options.signal] : [scopeController.signal];
    const response = await fetch('/api/v1' + path, { ...options, signal: AbortSignal.any(signals), headers, credentials: 'same-origin', cache: 'no-store' });
    checkScope(epoch);
    if (response.status === 401 && retry && token && (!path.startsWith('/auth/')||path.startsWith('/auth/profile'))) {
      try { await refresh(); checkScope(epoch); return await request<T>(path, options, false); }
      catch (failure) { if (epoch !== scopeEpoch || (failure as Error).name === 'AbortError') throw scopeChanged(); clear(); window.dispatchEvent(new CustomEvent('pige-session-expired')); }
    }
    if (!response.ok) throw await error(response, epoch);
    const value = await response.json() as T;
    checkScope(epoch);
    return value;
  }
  export function post<T>(path: string, body: unknown): Promise<T> { return request<T>(path, { method: 'POST', body: JSON.stringify(body) }); }
  export function patch<T>(path: string, body: unknown): Promise<T> { return request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }); }
  async function fileResponse(path: string): Promise<Response> {
    const epoch = scopeEpoch;
    const send = () => fetch('/api/v1' + path, { headers: scopedHeaders(path), signal: scopeController.signal, credentials: 'same-origin', cache: 'no-store' });
    let response = await send();
    checkScope(epoch);
    if (response.status === 401 && token) {
      await refresh();
      checkScope(epoch); response = await send(); checkScope(epoch);
    }
    if (!response.ok) throw await error(response, epoch);
    return response;
  }
  function downloadName(response:Response,fallback:string):string {
    const disposition=response.headers.get('Content-Disposition')||'';
    const encoded=disposition.match(/filename\*=UTF-8\'\'([^;]+)/i);
    const quoted=disposition.match(/filename="([^"\r\n]+)"/i);
    let name=quoted?.[1]||'';
    try { if(encoded)name=decodeURIComponent(encoded[1]); } catch { return fallback; }
    return name && name.length<=180 && !/[\/\\\x00-\x1f\x7f]/.test(name) && !name.startsWith('.') ? name : fallback;
  }
  export async function objectUrl(path: string): Promise<string> {
    const epoch = scopeEpoch;
    const blob = await (await fileResponse(path)).blob(); checkScope(epoch);
    return URL.createObjectURL(blob);
  }
  export async function download(path: string, filename: string): Promise<void> {
    const epoch = scopeEpoch;
    const response=await fileResponse(path);
    const blob = await response.blob(); checkScope(epoch);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = downloadName(response,filename); anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  export async function downloadPost(path: string, body: unknown, filename: string): Promise<void> {
    const epoch = scopeEpoch;
    const data = JSON.stringify(body);
    const send = () => fetch('/api/v1' + path, { method: 'POST', headers: scopedHeaders(path, {
      Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-CSRF-Protection': '1'
    }), signal: scopeController.signal, body: data, credentials: 'same-origin', cache: 'no-store' });
    let response = await send();
    checkScope(epoch);
    if (response.status === 401 && token) { await refresh(); checkScope(epoch); response = await send(); checkScope(epoch); }
    if (!response.ok) throw await error(response, epoch);
    const blob = await response.blob(); checkScope(epoch);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = downloadName(response,filename); anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}
