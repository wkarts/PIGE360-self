"use strict";
var PigeAPI;
(function (PigeAPI) {
    let token = '';
    let activeSchool = '';
    let scopeEpoch = 0;
    let scopeController = new AbortController();
    let authEpoch = 0;
    let authController = new AbortController();
    let refreshPromise = null;
    function setActiveSchool(schoolId) {
        if (activeSchool === schoolId)
            return;
        activeSchool = schoolId;
        scopeEpoch++;
        scopeController.abort();
        scopeController = new AbortController();
    }
    PigeAPI.setActiveSchool = setActiveSchool;
    function scopeChanged() { return Object.assign(new Error('A entidade ativa foi alterada.'), { name: 'AbortError' }); }
    function checkScope(epoch) { if (epoch !== scopeEpoch)
        throw scopeChanged(); }
    function scopedHeaders(path, initial) {
        const headers = new Headers(initial);
        const pathSchool = path.match(/^\/(?:teacher\/)?schools\/([^/?]+)/)?.[1];
        if (activeSchool && pathSchool && decodeURIComponent(pathSchool) !== activeSchool)
            throw scopeChanged();
        if (activeSchool)
            headers.set('X-School-Id', activeSchool);
        if (token)
            headers.set('Authorization', `Bearer ${token}`);
        return headers;
    }
    function clear() {
        token = '';
        activeSchool = '';
        scopeEpoch++;
        authEpoch++;
        authController.abort();
        authController = new AbortController();
        refreshPromise = null;
        scopeController.abort();
        scopeController = new AbortController();
    }
    PigeAPI.clear = clear;
    function useSession(response) { token = response.access_token; }
    PigeAPI.useSession = useSession;
    async function error(response, epoch) {
        let data = {};
        try {
            data = await response.json();
        }
        catch { /* A origem pode estar indisponível. */ }
        if (epoch !== undefined)
            checkScope(epoch);
        const captions = { name: 'Nome', social_name: 'Nome social', email: 'E-mail', password: 'Senha', phone: 'Telefone', cpf: 'CPF', cnpj: 'CNPJ', birth_date: 'Data de nascimento', student_id: 'Aluno', person_id: 'Pessoa', guardian_id: 'Responsável', academic_year_id: 'Ano letivo', class_group_id: 'Turma', unit_id: 'Unidade', grade_id: 'Série', shift_id: 'Turno', enrolled_on: 'Data da matrícula', due_date: 'Vencimento', amount: 'Valor', description: 'Descrição', postal_code: 'CEP', street: 'Endereço', address_number: 'Número', district: 'Bairro', city: 'Cidade', state: 'Estado', capacity: 'Vagas', starts_on: 'Data inicial', ends_on: 'Data final', date_from: 'Data inicial', date_to: 'Data final', file: 'Arquivo', status: 'Situação', reason: 'Motivo', title: 'Título', legal: 'Responsável legal', financial: 'Responsável financeiro' };
        const fields = data.errors?.map(e => { const key = e.field.split('.').at(-1) || ''; return `${captions[key] || 'Campo informado'}: ${e.message}`; }).join('\n');
        const reference = data.request_id || response.headers.get('X-Request-ID') || '';
        const failure = new Error((fields || data.detail || `Falha de comunicação (${response.status}).`) + (reference ? ' · Referência: ' + reference : ''));
        Object.assign(failure, { status: response.status, fields: data.errors || [] });
        return failure;
    }
    async function refresh() {
        if (!refreshPromise) {
            const epoch = authEpoch;
            const pending = fetch('/api/v1/auth/refresh', { method: 'POST', signal: authController.signal, credentials: 'same-origin', headers: { 'X-CSRF-Protection': '1' } })
                .then(async (response) => {
                if (!response.ok) {
                    const failure = await error(response);
                    if (epoch !== authEpoch)
                        throw scopeChanged();
                    throw failure;
                }
                const data = await response.json();
                if (epoch !== authEpoch)
                    throw scopeChanged();
                useSession(data);
                return data;
            });
            refreshPromise = pending;
            void pending.finally(() => { if (refreshPromise === pending)
                refreshPromise = null; }).catch(() => { });
        }
        return refreshPromise;
    }
    PigeAPI.refresh = refresh;
    async function request(path, options = {}, retry = true) {
        if (!navigator.onLine)
            throw new Error('Sem conexão. Os dados não foram enviados. Reconecte-se antes de salvar.');
        const epoch = scopeEpoch;
        const headers = scopedHeaders(path, options.headers);
        headers.set('X-CSRF-Protection', '1');
        if (options.body && !(options.body instanceof FormData))
            headers.set('Content-Type', 'application/json');
        const signals = options.signal ? [scopeController.signal, options.signal] : [scopeController.signal];
        const response = await fetch('/api/v1' + path, { ...options, signal: AbortSignal.any(signals), headers, credentials: 'same-origin', cache: 'no-store' });
        checkScope(epoch);
        if (response.status === 401 && retry && token && (!path.startsWith('/auth/') || path.startsWith('/auth/profile'))) {
            try {
                await refresh();
                checkScope(epoch);
                return await request(path, options, false);
            }
            catch (failure) {
                if (epoch !== scopeEpoch || failure.name === 'AbortError')
                    throw scopeChanged();
                clear();
                window.dispatchEvent(new CustomEvent('pige-session-expired'));
            }
        }
        if (!response.ok)
            throw await error(response, epoch);
        const value = await response.json();
        checkScope(epoch);
        return value;
    }
    PigeAPI.request = request;
    function post(path, body) { return request(path, { method: 'POST', body: JSON.stringify(body) }); }
    PigeAPI.post = post;
    function patch(path, body) { return request(path, { method: 'PATCH', body: JSON.stringify(body) }); }
    PigeAPI.patch = patch;
    async function fileResponse(path) {
        const epoch = scopeEpoch;
        const send = () => fetch('/api/v1' + path, { headers: scopedHeaders(path), signal: scopeController.signal, credentials: 'same-origin', cache: 'no-store' });
        let response = await send();
        checkScope(epoch);
        if (response.status === 401 && token) {
            await refresh();
            checkScope(epoch);
            response = await send();
            checkScope(epoch);
        }
        if (!response.ok)
            throw await error(response, epoch);
        return response;
    }
    function downloadName(response, fallback) {
        const disposition = response.headers.get('Content-Disposition') || '';
        const encoded = disposition.match(/filename\*=UTF-8\'\'([^;]+)/i);
        const quoted = disposition.match(/filename="([^"\r\n]+)"/i);
        let name = quoted?.[1] || '';
        try {
            if (encoded)
                name = decodeURIComponent(encoded[1]);
        }
        catch {
            return fallback;
        }
        return name && name.length <= 180 && !/[\/\\\x00-\x1f\x7f]/.test(name) && !name.startsWith('.') ? name : fallback;
    }
    async function objectUrl(path) {
        const epoch = scopeEpoch;
        const blob = await (await fileResponse(path)).blob();
        checkScope(epoch);
        return URL.createObjectURL(blob);
    }
    PigeAPI.objectUrl = objectUrl;
    async function download(path, filename) {
        const epoch = scopeEpoch;
        const response = await fileResponse(path);
        const blob = await response.blob();
        checkScope(epoch);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = downloadName(response, filename);
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
    PigeAPI.download = download;
    async function downloadPost(path, body, filename) {
        const epoch = scopeEpoch;
        const data = JSON.stringify(body);
        const send = () => fetch('/api/v1' + path, { method: 'POST', headers: scopedHeaders(path, {
                Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-CSRF-Protection': '1'
            }), signal: scopeController.signal, body: data, credentials: 'same-origin', cache: 'no-store' });
        let response = await send();
        checkScope(epoch);
        if (response.status === 401 && token) {
            await refresh();
            checkScope(epoch);
            response = await send();
            checkScope(epoch);
        }
        if (!response.ok)
            throw await error(response, epoch);
        const blob = await response.blob();
        checkScope(epoch);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = downloadName(response, filename);
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
    PigeAPI.downloadPost = downloadPost;
})(PigeAPI || (PigeAPI = {}));
var PigeOnline;
(function (PigeOnline) {
    PigeOnline.statuses = { held: 'Vaga reservada · aguardando pagamento', paid: 'Vaga reservada · pagamento recebido', expired: 'Reserva vencida', review: 'Reserva em análise', consumed: 'Reserva convertida em matrícula', released: 'Vaga liberada', draft: 'Rascunho', submitted: 'Enviada', under_review: 'Em análise', changes_requested: 'Correção solicitada', waitlisted: 'Lista de espera', approved: 'Aprovada / em preparação', enrolled: 'Matriculada', rejected: 'Indeferida', withdrawn: 'Desistência', queued: 'Na fila', pending: 'Aguardando', processing: 'Processando', completed: 'Concluído', confirmed: 'Confirmado / aguardando recebimento', received: 'Recebido', received_external: 'Baixa externa (não bancária)', overdue: 'Vencido', cancelled: 'Cancelado', refunded: 'Estornado', refund_requested: 'Estorno em análise', partially_refunded: 'Estorno parcial', disputed: 'Em disputa', awaiting_review: 'Conferência necessária', failed: 'Falhou', uncertain: 'Resultado incerto', retry: 'Nova tentativa programada', validated: 'Validado', sent: 'Enviada ao provedor', delivered: 'Entregue', read: 'Lida', active: 'Ativa' };
    function label(value) { return PigeOnline.statuses[value] || value; }
    PigeOnline.label = label;
    function dateTime(value) { if (!value)
        return '—'; const timestamp = /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : value + 'Z'; return new Date(timestamp).toLocaleString('pt-BR', { timeZone: 'America/Bahia', dateStyle: 'short', timeStyle: 'short' }); }
    PigeOnline.dateTime = dateTime;
    function date(value) { return value ? new Date(value.length === 10 ? value + 'T12:00:00Z' : value).toLocaleDateString('pt-BR', { timeZone: 'America/Bahia' }) : '—'; }
    PigeOnline.date = date;
    function money(value) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value)); }
    PigeOnline.money = money;
    // A chave de idempotência não é credencial. getRandomValues também permite
    // validação local; produção continua exigindo HTTPS para sessão/PWA.
    function newId() {
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 15) | 64;
        bytes[8] = (bytes[8] & 63) | 128;
        const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
    PigeOnline.newId = newId;
    function person() { return { name: '', social_name: '', cpf: null, birth_date: null, email: '', phone: '', address: '', notes: '', is_guardian: false }; }
    PigeOnline.person = person;
    function publicURL(slug) { return location.origin + '/online.html?campaign=' + encodeURIComponent(slug); }
    PigeOnline.publicURL = publicURL;
    function safeLink(value) { try {
        const u = new URL(value);
        return u.protocol === 'https:' && !u.username ? u.href : '';
    }
    catch {
        return '';
    } }
    PigeOnline.safeLink = safeLink;
})(PigeOnline || (PigeOnline = {}));
/** Identidade pública da escola. Sem segredos, rotas bancárias ou seleção de cliente. */
var PigeInstitution;
(function (PigeInstitution) {
    const initial = (() => {
        try {
            return JSON.parse(document.querySelector('#institution-bootstrap')?.textContent || 'null');
        }
        catch {
            return null;
        }
    })();
    let hydrated = Boolean(initial);
    PigeInstitution.state = Vue.reactive({ display_name: 'Sua escola', short_name: 'Escola', primary_color: '#006D77', secondary_color: '#0D1B2A', font_family: 'system', logo_url: '', font_configured: false, show_preenrollment_button: true, version: 1, ...(initial || {}) });
    function apply(value) {
        Object.assign(PigeInstitution.state, value);
        const surface = document.documentElement?.dataset?.institutionSurface;
        document.title = value.display_name + ' · ' + (location.pathname === '/online.html' ? 'Portal dos responsáveis' : surface === 'teacher' ? 'Portal do Professor' : surface === 'portal' ? 'Portal do aluno e responsável' : 'Gestão escolar');
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', value.primary_color);
        const theme = document.querySelector('link[data-institution-theme]');
        if (theme && !theme.href.endsWith('/api/v1/institution/theme.css?v=' + value.version))
            theme.href = '/api/v1/institution/theme.css?v=' + value.version;
        document.querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"]').forEach(link => {
            link.href = '/api/v1/institution/icon.png?size=' + (link.rel === 'apple-touch-icon' ? '180' : '32') + '&v=' + value.version;
        });
        const manifest = document.querySelector('link[rel="manifest"]');
        if (manifest)
            manifest.href = '/manifest.webmanifest?v=' + value.version;
    }
    PigeInstitution.apply = apply;
    async function load() {
        if (hydrated) {
            hydrated = false;
            apply(PigeInstitution.state);
            return;
        }
        const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 5000);
        try {
            const response = await fetch('/api/v1/institution/identity', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal });
            if (response.ok)
                apply(await response.json());
        }
        catch { /* Mantém a última identidade pública; não exibe marca do fornecedor. */ }
        finally {
            clearTimeout(timer);
        }
    }
    PigeInstitution.load = load;
})(PigeInstitution || (PigeInstitution = {}));
/** Segredos transitórios ficam apenas na memória da tela, nunca no armazenamento do navegador. */
var PigeMFA;
(function (PigeMFA) {
    PigeMFA.state = Vue.reactive({ challenge: '', enrolling: false, secret: '', qr: '', code: '', password: '', busy: false, error: '', codes: [], status: { enabled: false, required: false, recovery_remaining: 0 }, managed: false });
    let requester;
    let onAuthenticated;
    let onLogout;
    let prefix = '/auth';
    let pending = null;
    function init(request, authenticated, logout, portal = false) { requester = request; onAuthenticated = authenticated; onLogout = logout; prefix = portal ? '/portal' : '/auth'; }
    PigeMFA.init = init;
    function post(path, data) { return requester(path, { method: 'POST', body: JSON.stringify(data) }); }
    function clear() { PigeMFA.state.challenge = ''; PigeMFA.state.secret = ''; PigeMFA.state.qr = ''; PigeMFA.state.code = ''; PigeMFA.state.password = ''; PigeMFA.state.codes = []; PigeMFA.state.error = ''; pending = null; }
    PigeMFA.clear = clear;
    async function run(action) { if (PigeMFA.state.busy)
        return; PigeMFA.state.busy = true; PigeMFA.state.error = ''; try {
        await action();
    }
    catch (e) {
        PigeMFA.state.error = e instanceof Error ? e.message : String(e);
    }
    finally {
        PigeMFA.state.busy = false;
    } }
    async function accept(result) {
        if (!result.mfa_required)
            return false;
        clear();
        PigeMFA.state.challenge = String(result.mfa_token);
        PigeMFA.state.enrolling = Boolean(result.enrollment_required);
        if (PigeMFA.state.enrolling) {
            try {
                const data = await post('/auth/mfa/challenge', { token: PigeMFA.state.challenge });
                PigeMFA.state.secret = String(data.secret || '');
                PigeMFA.state.qr = String(data.qr || '');
            }
            catch (error) {
                PigeMFA.state.error = error instanceof Error ? error.message : String(error);
            }
        }
        return true;
    }
    PigeMFA.accept = accept;
    async function finish() {
        await run(async () => {
            const result = await post('/auth/mfa/verify', { token: PigeMFA.state.challenge, code: PigeMFA.state.code });
            PigeMFA.state.code = '';
            PigeMFA.state.secret = '';
            PigeMFA.state.qr = '';
            PigeMFA.state.enrolling = false;
            if (Array.isArray(result.recovery_codes)) {
                PigeMFA.state.codes = result.recovery_codes.map(String);
                pending = result;
                return;
            }
            clear();
            await onAuthenticated(result);
        });
    }
    PigeMFA.finish = finish;
    async function acknowledge() { await run(async () => { const result = pending; clear(); if (result)
        await onAuthenticated(result);
    else
        await refresh(); }); }
    PigeMFA.acknowledge = acknowledge;
    async function cancel() { if (PigeMFA.state.busy)
        return; if (PigeMFA.state.codes.length && pending) {
        await acknowledge();
        return;
    } await run(async () => { if (PigeMFA.state.challenge)
        await post('/auth/mfa/cancel', { token: PigeMFA.state.challenge }); clear(); }); }
    PigeMFA.cancel = cancel;
    async function refresh() { PigeMFA.state.status = await requester(prefix + '/mfa'); }
    PigeMFA.refresh = refresh;
    async function manage() { clear(); PigeMFA.state.managed = true; await run(refresh); }
    PigeMFA.manage = manage;
    async function enroll() { await run(async () => { const result = await post(prefix + '/mfa/enroll', { current_password: PigeMFA.state.password }); await accept(result); }); }
    PigeMFA.enroll = enroll;
    async function disable() { await run(async () => { await post(prefix + '/mfa/disable', { current_password: PigeMFA.state.password, code: PigeMFA.state.code }); clear(); await onLogout(); }); }
    PigeMFA.disable = disable;
    async function recovery() { await run(async () => { const result = await post(prefix + '/mfa/recovery', { current_password: PigeMFA.state.password, code: PigeMFA.state.code }); PigeMFA.state.codes = result.recovery_codes; PigeMFA.state.password = ''; PigeMFA.state.code = ''; }); }
    PigeMFA.recovery = recovery;
    function downloadCodes() { const content = 'Códigos de recuperação — ' + PigeInstitution.state.display_name + '\nCada código pode ser utilizado uma única vez. Guarde em local seguro.\n\n' + PigeMFA.state.codes.join('\n'); const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = 'codigos-de-recuperacao.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    PigeMFA.downloadCodes = downloadCodes;
})(PigeMFA || (PigeMFA = {}));
var PigeDiary;
(function (PigeDiary) {
    const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bahia', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const groups = [
        { label: 'Hoje', pages: [{ id: 'dashboard', label: 'Pendências', tab: 'dashboard' }] },
        { label: 'Aulas e chamada', pages: [
                { id: 'diaries', label: 'Aulas', tab: 'diaries' }, { id: 'attendance', label: 'Frequência', tab: 'diaries' },
                { id: 'planning', label: 'Planejamento', tab: 'planning' }
            ] },
        { label: 'Aprendizagem', pages: [
                { id: 'assessments', label: 'Avaliações e recuperação', tab: 'assessments' }, { id: 'opinions', label: 'Pareceres', tab: 'opinions' },
                { id: 'records', label: 'Registros pedagógicos', tab: 'records' }
            ] },
        { label: 'Acompanhamento', pages: [
                { id: 'occurrences', label: 'Ocorrências', tab: 'occurrences' }, { id: 'materials', label: 'Materiais', tab: 'materials' },
                { id: 'communications', label: 'Comunicações', tab: 'communications', permission: 'communications.send' }
            ] },
        { label: 'Fechamento', pages: [
                { id: 'review', label: 'Conferência e retificações', tab: 'diaries' }, { id: 'results', label: 'Consolidação', tab: 'assessments' },
                { id: 'reports', label: 'Relatórios', tab: 'diaries', permission: 'diary.reports' }
            ] },
        { label: 'Configuração', pages: [
                { id: 'setup', label: 'Períodos', tab: 'setup', permission: 'diary.configure' },
                { id: 'components', label: 'Componentes', tab: 'setup', permission: 'diary.configure' },
                { id: 'catalog', label: 'Catálogo e vigência', tab: 'setup', permission: 'diary.configure' },
                { id: 'new-diary', label: 'Abrir diário', tab: 'setup', permission: 'diary.configure' },
                { id: 'rules', label: 'Regras', tab: 'assessments', permission: 'diary.configure' }
            ] }
    ];
    function pilotForSchool(schoolId) {
        return Boolean(schoolId) && new URLSearchParams(location.search).get('diarioPiloto') === schoolId;
    }
    PigeDiary.pilotForSchool = pilotForSchool;
    function clearPilotContext(schoolId) {
        const url = new URL(location.href);
        if (url.searchParams.get('diarioPiloto') !== schoolId)
            return;
        for (const key of ['diarioPiloto', 'guia', 'diario', 'periodo'])
            url.searchParams.delete(key);
        if (url.hash === '#diario')
            url.hash = '';
        history.replaceState(history.state, '', url.pathname + url.search + url.hash);
    }
    PigeDiary.clearPilotContext = clearPilotContext;
    PigeDiary.component = { props: ['schoolId', 'schoolName', 'catalogEnabled', 'permissions', 'teacherPortal', 'requestedDiary'], render: PigeRenders.diary, setup(props) {
            const state = Vue.reactive({
                busy: false, error: '', notice: '', tab: 'diaries', page: 'diaries', diaryFilter: '', lessonPeriod: '', dirty: false,
                diaries: [], selected: null, academicYears: [], periods: [], components: [], groups: [], assignments: [], plans: [],
                periodForm: { academic_year_id: '', name: '', starts_on: '', ends_on: '', order_index: 1, active: true },
                componentForm: { name: '', code: '', workload_hours: 0, active: true },
                diaryForm: { class_group_id: '', component_id: '', teacher_assignment_id: '', notes: '' },
                planForm: { class_group_id: '', component_id: '', academic_period_id: '', teacher_assignment_id: '', objectives: '', thematic_units: '', knowledge_objects: '', bncc_references: '', methodology: '', resources: '', assessment_strategy: '', notes: '', status: 'draft' },
                lessonForm: { academic_period_id: '', lesson_date: today(), lesson_count: 1, content: '', skills: '', methodology: '', activities: '', homework: '', notes: '' },
                selectedLesson: null, attendance: [],
                assessments: [], assessmentEditing: null, selectedAssessment: null, assessmentRoster: [],
                assessmentForm: { academic_period_id: '', title: '', kind: 'activity', assessment_date: today(), value_type: 'numeric', max_score: '10', weight: '1', description: '', skills: '', status: 'published' },
                opinions: [], opinionForm: { academic_period_id: '', enrollment_id: '', text: '', status: 'draft' },
                pedagogicalRecords: [], pedagogicalForm: { enrollment_id: '', record_date: today(), kind: 'observation', text: '' },
                closePeriod: '', closeReason: 'Fechamento pedagógico conferido.', reopenReason: '',
                summary: null,
                history: { closures: [], revisions: [] },
                dashboard: { items: [], totals: {} },
                assessmentRules: [],
                assessmentRuleForm: { period_id: '', method: 'arithmetic', scale_max: '10', decimal_places: 2, minimum_score: '', minimum_attendance_percent: '', justified_absence_counts_as_present: '', recovery_mode: 'none', concept_scale: '', required_opinion: false, version: null },
                periodResults: [],
                materials: [], materialForm: { client_key: PigeOnline.newId(), kind: 'Atividade', title: '', body: '', enrollment_id: '' },
                occurrences: [],
                communicationRecipients: [], communications: [],
                communicationForm: { enrollment_id: '', academic_period_id: '', occurrence_id: '', recipient_guardian_link_ids: [], title: '', message: '', client_key: PigeOnline.newId() },
                occurrenceForm: { academic_period_id: '', enrollment_id: '', occurrence_date: today(), kind: 'pedagogical', title: '', description: '', status: 'draft' },
                reportType: 'class_diary', reportPeriod: '', reportEnrollment: ''
            });
            const base = () => (props.teacherPortal ? '/teacher' : '') + '/schools/' + props.schoolId;
            const can = (p) => props.permissions.includes(p);
            const catalog = Vue.reactive({ drafts: [], name: '', code: '', hours: 0, reason: '', target: '',
                impact: null });
            async function catalogList() { catalog.drafts = await PigeAPI.request(base() + '/diary-catalog/suggestions'); }
            function catalogImpact() {
                catalog.impact = null;
                catalog.reason = '';
                if (catalog.target)
                    void run(async () => {
                        catalog.impact = await PigeAPI.request(base() + '/diary-catalog/' + catalog.target + '/impact');
                    });
            }
            function suggest() {
                return run(async () => {
                    const row = await PigeAPI.post(base() + '/diary-catalog/suggestions', {
                        name: catalog.name, code: catalog.code, workload_hours: catalog.hours
                    });
                    await catalogList();
                    catalog.name = '';
                    catalog.code = '';
                    catalog.hours = 0;
                    catalog.target = row.id;
                    catalog.impact = await PigeAPI.request(base() + '/diary-catalog/' + row.id + '/impact');
                    catalog.reason = '';
                    state.notice = 'Sugestão guardada em rascunho.';
                });
            }
            function decide(action) {
                const impact = catalog.impact;
                if (!impact || catalog.reason.trim().length < 3)
                    return;
                const verbs = { retire: 'Desativar', publish: 'Publicar', discard: 'Descartar' };
                if (!window.confirm(verbs[action] + ' este componente curricular?'))
                    return;
                return run(async () => {
                    await PigeAPI.post(base() + '/diary-catalog/' + impact.id + '/decisions', { action, version: impact.version, reason: catalog.reason });
                    catalog.impact = null;
                    catalog.target = '';
                    catalog.reason = '';
                    await loadBase();
                    await catalogList();
                    state.notice = 'Decisão registrada no histórico do componente.';
                });
            }
            const initial = new URLSearchParams(location.search);
            const pilot = pilotForSchool(props.schoolId);
            const navigation = Vue.computed(() => groups.map(group => ({ ...group, pages: group.pages.filter(page => (!page.permission || can(page.permission)) && (page.id !== 'catalog' || props.catalogEnabled === true)) })).filter(group => group.pages.length));
            const activeGroup = Vue.computed(() => navigation.value.find(group => group.pages.some(page => page.id === state.page)));
            const filteredDiaries = Vue.computed(() => {
                const term = state.diaryFilter.trim().toLocaleLowerCase('pt-BR');
                return state.diaries.filter(d => [d.year_name, d.class_name, d.component_name, d.teacher_name].join(' ').toLocaleLowerCase('pt-BR').includes(term));
            });
            const lessons = Vue.computed(() => (state.selected?.lessons || []).filter(lesson => !pilot || !state.lessonPeriod || lesson.academic_period_id === state.lessonPeriod));
            function filterPeriod(event) {
                const select = event.target;
                if (!mayLeave()) {
                    select.value = state.lessonPeriod;
                    return;
                }
                state.lessonPeriod = select.value;
                state.selectedLesson = null;
                syncLink();
            }
            function pageLink(page) {
                const url = new URL(location.href);
                url.searchParams.set('guia', page);
                if (state.lessonPeriod)
                    url.searchParams.set('periodo', state.lessonPeriod);
                else
                    url.searchParams.delete('periodo');
                if (state.selected)
                    url.searchParams.set('diario', String(state.selected.id));
                else
                    url.searchParams.delete('diario');
                url.hash = props.teacherPortal ? 'diario' : '/diary';
                return url.pathname + url.search + url.hash;
            }
            function syncLink() { if (pilot)
                history.replaceState(history.state, '', pageLink(state.page)); }
            function mayLeave() { return !state.dirty || window.confirm('Continuar com alterações ainda não salvas no Diário?'); }
            function navigatePage(id, check = true) {
                const page = navigation.value.flatMap(group => group.pages).find(item => item.id === id);
                if (!page || (check && page.id !== state.page && !mayLeave()))
                    return false;
                state.page = page.id;
                state.tab = page.tab;
                return true;
            }
            function go(id) {
                if (navigatePage(id)) {
                    syncLink();
                    if (id === 'catalog')
                        void run(catalogList);
                }
            }
            function show(...pages) { return !pilot || pages.includes(state.page); }
            const draftPages = new Set();
            async function save(action) {
                if (state.busy)
                    return;
                const page = state.page;
                await action();
                if (!state.error && state.notice) {
                    draftPages.delete(page);
                    state.dirty = draftPages.size > 0;
                }
            }
            function beforeUnload(event) { if (state.dirty) {
                event.preventDefault();
                event.returnValue = '';
            } }
            function markDraft(event) {
                if (pilot && event.target.closest('form,.x-form,td')) {
                    draftPages.add(state.page);
                    state.dirty = true;
                }
            }
            function chooseAnother() {
                if (!mayLeave())
                    return;
                draftPages.clear();
                state.dirty = false;
                state.lessonPeriod = '';
                state.selected = null;
                state.selectedLesson = null;
                syncLink();
            }
            if (pilot && !navigatePage(initial.get('guia') || 'dashboard', false))
                navigatePage('dashboard', false);
            const str = (v) => v == null ? '' : String(v);
            const date = (v) => { const x = str(v); return x ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(x.length === 10 ? x + 'T12:00:00Z' : x)) : '—'; };
            const labels = { open: 'Aberto', draft: 'Rascunho', submitted: 'Enviado', reviewed: 'Revisado', closed: 'Fechado', present: 'Presente', absent: 'Falta', justified_absence: 'Falta justificada', active: 'Ativo', suspended: 'Suspenso', published: 'Publicada', final: 'Final', pending: 'Pendente', calculated: 'Calculado', below_minimum: 'Abaixo da média', attendance_below_minimum: 'Frequência abaixo do mínimo', opinion_pending: 'Parecer pendente', concept: 'Conceito', follow_up: 'Acompanhamento', intervention: 'Intervenção', recovery: 'Recuperação', adaptation: 'Adaptação', referral: 'Encaminhamento', observation: 'Observação', positive: 'Positiva', pedagogical: 'Pedagógica', behavioral: 'Comportamental', safety: 'Segurança', other: 'Outra', resultados_avaliativos_pendentes: 'Há notas pendentes', sem_resultado_aplicavel: 'Sem resultado aplicável', chamada_pendente: 'Chamada pendente', conceito_fora_da_escala: 'Conceito fora da escala', peso_avaliativo_ausente: 'Peso não definido', resultado_numerico_ausente: 'Nota não informada', frequencia_abaixo_do_limite: 'Frequência abaixo do mínimo', parecer_final_pendente: 'Parecer final pendente' };
            const label = (v) => labels[str(v)] || str(v) || '—';
            async function run(action) { if (state.busy)
                return; state.busy = true; state.error = ''; state.notice = ''; try {
                await action();
            }
            catch (e) {
                state.error = e instanceof Error ? e.message : String(e);
            }
            finally {
                state.busy = false;
            } }
            async function loadBase() {
                const results = await Promise.all([
                    PigeAPI.request(base() + '/diaries'),
                    PigeAPI.request(base() + '/academic-periods'),
                    PigeAPI.request(base() + '/curriculum-components'),
                    can('diary.configure') ? PigeAPI.request(base() + '/academic-years') : Promise.resolve([]),
                    can('diary.configure') ? PigeAPI.request(base() + '/class-groups') : Promise.resolve([]),
                    can('diary.configure') ? PigeAPI.request(base() + '/teacher-assignments') : Promise.resolve([]),
                    PigeAPI.request(base() + '/diary-dashboard')
                ]);
                state.diaries = results[0];
                state.periods = results[1];
                state.components = results[2];
                state.academicYears = results[3];
                state.groups = results[4];
                state.assignments = results[5];
                state.dashboard = results[6];
                if (!state.periodForm.academic_year_id && state.academicYears.length) {
                    const year = state.academicYears.find(x => x.status === 'active' || x.active) || state.academicYears[0];
                    state.periodForm.academic_year_id = str(year.id);
                }
            }
            async function load() { await run(loadBase); }
            async function loadDiary(d) {
                const endpoint = base() + '/diaries/' + d.id;
                const [selected, summary, history, plans, assessments, rules, occurrences, opinions, records, communications, materials] = await Promise.all([
                    PigeAPI.request(endpoint), PigeAPI.request(endpoint + '/summary'),
                    PigeAPI.request(endpoint + '/history'),
                    PigeAPI.request(base() + '/curriculum-plans?class_group_id=' + encodeURIComponent(d.class_group_id) + '&component_id=' + encodeURIComponent(d.component_id)),
                    PigeAPI.request(endpoint + '/assessments'), PigeAPI.request(endpoint + '/assessment-rules'),
                    PigeAPI.request(endpoint + '/occurrences'), PigeAPI.request(endpoint + '/opinions'),
                    PigeAPI.request(endpoint + '/pedagogical-records'), PigeAPI.request(endpoint + '/communications'), PigeAPI.request(endpoint + '/materials')
                ]);
                const changed = state.selected?.id !== d.id;
                state.selected = selected;
                state.summary = summary;
                state.history = history;
                state.plans = plans;
                state.assessments = assessments;
                state.assessmentRules = rules;
                state.occurrences = occurrences;
                state.opinions = opinions;
                state.pedagogicalRecords = records;
                state.communications = communications;
                state.selectedLesson = null;
                state.attendance = [];
                state.assessmentEditing = null;
                state.selectedAssessment = null;
                state.assessmentRoster = [];
                state.periodResults = [];
                state.materials = materials;
                if (changed) {
                    state.materialForm = { client_key: PigeOnline.newId(), kind: 'Atividade', title: '', body: '', enrollment_id: '' };
                    state.planForm = { class_group_id: d.class_group_id, component_id: d.component_id, academic_period_id: '', teacher_assignment_id: d.teacher_assignment_id || '', objectives: '', thematic_units: '', knowledge_objects: '', bncc_references: '', methodology: '', resources: '', assessment_strategy: '', notes: '', status: 'draft' };
                    state.lessonForm = { academic_period_id: '', lesson_date: today(), lesson_count: 1, content: '', skills: '', methodology: '', activities: '', homework: '', notes: '' };
                    state.assessmentForm = { academic_period_id: '', title: '', kind: 'activity', assessment_date: today(), value_type: 'numeric', max_score: '10', weight: '1', description: '', skills: '', status: 'published' };
                    state.opinionForm = { academic_period_id: '', enrollment_id: '', text: '', status: 'draft' };
                    state.pedagogicalForm = { enrollment_id: '', record_date: today(), kind: 'observation', text: '' };
                    state.reportPeriod = '';
                    state.reportEnrollment = '';
                    state.closePeriod = '';
                }
                state.occurrenceForm = { academic_period_id: '', enrollment_id: '', occurrence_date: today(), kind: 'pedagogical', title: '', description: '', status: 'draft' };
                const firstPeriod = state.periods.find(p => p.academic_year_id === d.academic_year_id);
                selectRulePeriod(firstPeriod ? str(firstPeriod.id) : '');
                state.communicationRecipients = [];
                state.communicationForm = { enrollment_id: '', academic_period_id: '', occurrence_id: '', recipient_guardian_link_ids: [], title: '', message: '', client_key: PigeOnline.newId() };
            }
            async function selectDiary(d) {
                if (state.selected?.id !== d.id && !mayLeave())
                    return;
                await run(async () => {
                    await loadDiary(d);
                    draftPages.clear();
                    state.dirty = false;
                    state.lessonPeriod = '';
                    syncLink();
                });
            }
            function selectRulePeriod(periodId) { const rule = state.assessmentRules.find(x => x.academic_period_id === periodId); state.assessmentRuleForm = { period_id: periodId, method: str(rule?.method) || 'arithmetic', scale_max: str(rule?.scale_max) || '10', decimal_places: Number(rule?.decimal_places ?? 2), minimum_score: str(rule?.minimum_score), minimum_attendance_percent: str(rule?.minimum_attendance_percent), justified_absence_counts_as_present: rule?.justified_absence_counts_as_present == null ? '' : String(rule.justified_absence_counts_as_present), recovery_mode: str(rule?.recovery_mode) || 'none', concept_scale: Array.isArray(rule?.concept_scale) ? rule.concept_scale.join(', ') : '', required_opinion: Boolean(rule?.required_opinion), version: rule?.version == null ? null : Number(rule.version) }; }
            async function saveAssessmentRule() { if (!state.selected || !state.assessmentRuleForm.period_id)
                return; await run(async () => { const f = state.assessmentRuleForm; const body = { method: f.method, scale_max: f.scale_max, decimal_places: f.decimal_places, minimum_score: f.minimum_score || null, minimum_attendance_percent: f.minimum_attendance_percent || null, justified_absence_counts_as_present: f.minimum_attendance_percent ? (f.justified_absence_counts_as_present === 'true') : null, recovery_mode: f.recovery_mode, concept_scale: f.method === 'concept' ? f.concept_scale.split(/[,;]+/).map(x => x.trim()).filter(Boolean) : [], required_opinion: f.required_opinion, version: f.version }; const saved = await PigeAPI.request(base() + '/diaries/' + state.selected.id + '/assessment-rules/' + f.period_id, { method: 'PUT', body: JSON.stringify(body) }); state.assessmentRules = state.assessmentRules.filter(x => x.academic_period_id !== f.period_id).concat(saved); selectRulePeriod(f.period_id); state.notice = 'Regra salva. Consolide o período para atualizar os resultados.'; }); }
            async function loadPeriodResults() { if (!state.selected || !state.assessmentRuleForm.period_id)
                return; await run(async () => { const r = await PigeAPI.request(base() + '/diaries/' + state.selected.id + '/periods/' + state.assessmentRuleForm.period_id + '/results'); state.periodResults = r.items; }); }
            async function consolidatePeriod() { if (!state.selected || !state.assessmentRuleForm.period_id)
                return; await run(async () => { const r = await PigeAPI.post(base() + '/diaries/' + state.selected.id + '/periods/' + state.assessmentRuleForm.period_id + '/consolidate', { version: state.selected.version }); state.periodResults = r.results; state.notice = 'Período consolidado. ' + r.pending + ' resultado(s) pendente(s).'; await loadBase(); }); }
            async function saveOccurrence() { if (!state.selected)
                return; await run(async () => { const f = state.occurrenceForm; await PigeAPI.post(base() + '/diaries/' + state.selected.id + '/occurrences', { ...f, academic_period_id: f.academic_period_id || null }); state.occurrences = await PigeAPI.request(base() + '/diaries/' + state.selected.id + '/occurrences'); state.occurrenceForm = { academic_period_id: f.academic_period_id, enrollment_id: '', occurrence_date: today(), kind: 'pedagogical', title: '', description: '', status: 'draft' }; state.notice = 'Ocorrência registrada no Diário.'; }); }
            async function loadCommunicationRecipients() { if (!state.selected || !state.communicationForm.enrollment_id) {
                state.communicationRecipients = [];
                state.communicationForm.recipient_guardian_link_ids = [];
                return;
            } const query = '?enrollment_id=' + encodeURIComponent(state.communicationForm.enrollment_id); state.communicationRecipients = await PigeAPI.request(base() + '/diaries/' + state.selected.id + '/communication-recipients' + query); state.communicationForm.recipient_guardian_link_ids = []; }
            function communicationOccurrenceChanged() { const occurrence = state.occurrences.find(x => x.id === state.communicationForm.occurrence_id); if (occurrence?.academic_period_id)
                state.communicationForm.academic_period_id = str(occurrence.academic_period_id); }
            async function sendCommunication() { if (!state.selected)
                return; await run(async () => { const f = state.communicationForm; const result = await PigeAPI.post(base() + '/diaries/' + state.selected.id + '/communications', { ...f, academic_period_id: f.academic_period_id || null, occurrence_id: f.occurrence_id || null }); state.communications = await PigeAPI.request(base() + '/diaries/' + state.selected.id + '/communications'); state.communicationForm = { ...f, occurrence_id: '', recipient_guardian_link_ids: [], title: '', message: '', client_key: PigeOnline.newId() }; state.communicationRecipients = []; state.notice = result.created ? 'Comunicado disponibilizado no portal para ' + result.created + ' conta(s).' : 'Esta operação já havia sido processada; nenhum comunicado duplicado foi criado.'; }); }
            async function createPeriod() { await run(async () => { await PigeAPI.post(base() + '/academic-periods', state.periodForm); state.periodForm = { academic_year_id: state.periodForm.academic_year_id, name: '', starts_on: '', ends_on: '', order_index: state.periodForm.order_index + 1, active: true }; await loadBase(); state.notice = 'Período letivo criado.'; }); }
            async function createComponent() { await run(async () => { await PigeAPI.post(base() + '/curriculum-components', state.componentForm); state.componentForm = { name: '', code: '', workload_hours: 0, active: true }; await loadBase(); state.notice = 'Componente curricular criado.'; }); }
            async function createDiary() { await run(async () => { const body = { ...state.diaryForm, teacher_assignment_id: state.diaryForm.teacher_assignment_id || null }; const d = await PigeAPI.post(base() + '/diaries', body); state.diaryForm = { class_group_id: '', component_id: '', teacher_assignment_id: '', notes: '' }; await loadBase(); await loadDiary(d); if (pilot) {
                navigatePage('diaries', false);
                syncLink();
            }
            else
                state.tab = 'diaries'; state.notice = 'Diário aberto.'; }); }
            async function createPlan() { if (!state.selected)
                return; await run(async () => { const f = state.planForm; await PigeAPI.post(base() + '/curriculum-plans', { ...f, academic_period_id: f.academic_period_id || null, teacher_assignment_id: f.teacher_assignment_id || null, bncc_references: f.bncc_references.split(/[\s,;]+/).map(x => x.trim()).filter(Boolean) }); state.plans = await PigeAPI.request(base() + '/curriculum-plans?class_group_id=' + encodeURIComponent(state.selected.class_group_id) + '&component_id=' + encodeURIComponent(state.selected.component_id)); state.notice = 'Planejamento registrado.'; }); }
            async function createLesson() { if (!state.selected)
                return; await run(async () => { await PigeAPI.post(base() + '/diaries/' + state.selected.id + '/lessons', { ...state.lessonForm, academic_period_id: state.lessonForm.academic_period_id || null }); state.lessonForm = { academic_period_id: state.lessonForm.academic_period_id, lesson_date: today(), lesson_count: 1, content: '', skills: '', methodology: '', activities: '', homework: '', notes: '' }; await loadDiary(state.selected); state.notice = 'Aula registrada.'; }); }
            async function openAttendance(lesson) { if (!state.selected)
                return; await run(async () => { const result = await PigeAPI.request(base() + '/diaries/' + state.selected.id + '/lessons/' + lesson.id + '/attendance'); state.selectedLesson = result.lesson; state.attendance = result.roster.map(r => ({ ...r, attendance: r.attendance || { status: 'present', note: '' } })); }); }
            async function saveAttendance() { if (!state.selected || !state.selectedLesson)
                return; await run(async () => { await PigeAPI.request(base() + '/diaries/' + state.selected.id + '/lessons/' + state.selectedLesson.id + '/attendance', { method: 'PUT', body: JSON.stringify({ items: state.attendance.map(r => ({ enrollment_id: r.enrollment_id, status: r.attendance?.status || 'present', note: r.attendance?.note || '', version: r.attendance?.version ?? null })) }) }); state.notice = 'Chamada salva.'; await loadDiary(state.selected); }); }
            function editAssessment(assessment) {
                state.assessmentEditing = assessment;
                state.assessmentForm = { academic_period_id: str(assessment.academic_period_id), title: str(assessment.title), kind: str(assessment.kind), assessment_date: str(assessment.assessment_date), value_type: str(assessment.value_type), max_score: str(assessment.max_score), weight: str(assessment.weight), description: str(assessment.description), skills: str(assessment.skills), status: str(assessment.status) };
                state.tab = 'assessments';
            }
            function cancelAssessmentEdit() {
                state.assessmentEditing = null;
                state.assessmentForm = { academic_period_id: state.assessmentForm.academic_period_id, title: '', kind: 'activity', assessment_date: today(), value_type: 'numeric', max_score: '10', weight: '1', description: '', skills: '', status: 'published' };
            }
            async function createAssessment() {
                if (!state.selected)
                    return;
                await run(async () => {
                    const f = state.assessmentForm;
                    const body = { ...f, academic_period_id: f.academic_period_id || null, max_score: f.value_type === 'numeric' ? (f.max_score || null) : null, weight: f.weight || null };
                    const path = base() + '/diaries/' + state.selected.id + '/assessments';
                    const editing = state.assessmentEditing;
                    if (editing)
                        await PigeAPI.request(path + '/' + editing.id, { method: 'PATCH', body: JSON.stringify({ ...body, version: editing.version }) });
                    else
                        await PigeAPI.post(path, body);
                    cancelAssessmentEdit();
                    state.assessments = await PigeAPI.request(path);
                    state.notice = editing ? 'Avaliação atualizada. Consolide o período para atualizar o boletim.' : 'Avaliação criada.';
                });
            }
            async function openAssessment(a) { if (!state.selected)
                return; await run(async () => { const result = await PigeAPI.request(base() + '/diaries/' + state.selected.id + '/assessments/' + a.id + '/results'); state.selectedAssessment = result.instrument; state.assessmentRoster = result.roster.map(r => ({ ...r, result: r.result || { numeric_score: null, concept: '', note: '' } })); }); }
            async function saveAssessmentResults() {
                if (!state.selected || !state.selectedAssessment)
                    return;
                await run(async () => {
                    const numeric = state.selectedAssessment.value_type === 'numeric';
                    const filled = (r) => numeric ? r.result?.numeric_score !== null && r.result?.numeric_score !== undefined && str(r.result.numeric_score).trim() !== '' : Boolean(str(r.result?.concept).trim());
                    if (state.assessmentRoster.some(r => r.result?.id && !filled(r)))
                        throw new Error('Para corrigir uma nota já salva, informe o novo resultado.');
                    const rows = state.assessmentRoster.filter(filled);
                    if (!rows.length)
                        throw new Error('Informe ao menos uma nota ou conceito para salvar.');
                    const assessment = state.selectedAssessment;
                    await PigeAPI.request(base() + '/diaries/' + state.selected.id + '/assessments/' + assessment.id + '/results', { method: 'PUT', body: JSON.stringify({ items: rows.map(r => ({ enrollment_id: r.enrollment_id, numeric_score: numeric ? r.result.numeric_score : null, concept: numeric ? '' : str(r.result?.concept).trim(), note: str(r.result?.note), version: r.result?.version ?? null })) }) });
                    await loadDiary(state.selected);
                    state.notice = rows.length + ' resultado(s) salvo(s).';
                });
            }
            async function saveOpinion() { if (!state.selected)
                return; await run(async () => { await PigeAPI.post(base() + '/diaries/' + state.selected.id + '/opinions', { ...state.opinionForm, academic_period_id: state.opinionForm.academic_period_id || null }); state.opinionForm = { academic_period_id: state.opinionForm.academic_period_id, enrollment_id: '', text: '', status: 'draft' }; state.opinions = await PigeAPI.request(base() + '/diaries/' + state.selected.id + '/opinions'); state.notice = 'Parecer salvo.'; }); }
            async function createPedagogicalRecord() { if (!state.selected)
                return; await run(async () => { await PigeAPI.post(base() + '/diaries/' + state.selected.id + '/pedagogical-records', state.pedagogicalForm); state.pedagogicalForm = { enrollment_id: '', record_date: today(), kind: 'observation', text: '' }; state.pedagogicalRecords = await PigeAPI.request(base() + '/diaries/' + state.selected.id + '/pedagogical-records'); state.notice = 'Registro pedagógico incluído.'; }); }
            async function submitDiary() { if (!state.selected)
                return; await run(async () => { await PigeAPI.post(base() + '/diaries/' + state.selected.id + '/submit', { version: state.selected.version }); await loadDiary(state.selected); state.notice = 'Diário enviado para revisão.'; }); }
            async function reviewDiary() { if (!state.selected)
                return; await run(async () => { await PigeAPI.post(base() + '/diaries/' + state.selected.id + '/review', { version: state.selected.version }); await loadDiary(state.selected); state.notice = 'Diário marcado como revisado.'; }); }
            async function closeDiary() { if (!state.selected)
                return; await run(async () => { const period = Boolean(state.closePeriod); await PigeAPI.post(base() + '/diaries/' + state.selected.id + '/close', { academic_period_id: state.closePeriod || null, reason: state.closeReason, version: state.selected.version }); await loadDiary(state.selected); state.notice = period ? 'Período fechado.' : 'Diário fechado.'; }); }
            async function reopenDiary() { if (!state.selected)
                return; await run(async () => { await PigeAPI.post(base() + '/diaries/' + state.selected.id + '/reopen', { reason: state.reopenReason, version: state.selected.version }); state.reopenReason = ''; await loadDiary(state.selected); state.notice = 'Diário reaberto com registro de retificação.'; }); }
            async function publishMaterial() {
                if (!state.selected)
                    return;
                await run(async () => {
                    const path = base() + '/diaries/' + state.selected.id + '/materials', draft = state.materialForm;
                    await PigeAPI.post(path, { ...draft, enrollment_id: draft.enrollment_id || null });
                    state.materials = await PigeAPI.request(path);
                    state.materialForm = { client_key: PigeOnline.newId(), kind: 'Atividade', title: '', body: '', enrollment_id: '' };
                    state.notice = 'Material publicado no portal do aluno e do responsável.';
                });
            }
            async function printMaterial(id) { if (state.selected)
                await run(() => PigeAPI.download(base() + '/diaries/' + state.selected.id + '/materials/' + id + '/print.pdf', 'material-escolar.pdf')); }
            async function report() { if (state.selected)
                await run(() => { const q = new URLSearchParams(); if (state.reportPeriod)
                    q.set('academic_period_id', state.reportPeriod); if (state.reportType === 'student_record' && state.reportEnrollment)
                    q.set('enrollment_id', state.reportEnrollment); const query = q.toString(); return PigeAPI.download(base() + '/diaries/' + state.selected.id + '/reports/' + state.reportType + '.pdf' + (query ? '?' + query : ''), 'diario-' + state.reportType + '.pdf'); }); }
            let handled;
            function openRequestedDiary() {
                const request = props.requestedDiary;
                if (!request || handled === request || state.busy)
                    return;
                const diary = state.diaries.find(item => item.id === request.id);
                if (!diary)
                    return;
                handled = request;
                if (pilot) {
                    navigatePage(request.tab || 'diaries', false);
                    syncLink();
                }
                else
                    state.tab = request.tab || 'diaries';
                if (state.selected?.id !== diary.id)
                    void selectDiary(diary);
            }
            Vue.watch(() => props.requestedDiary, openRequestedDiary);
            Vue.watch(() => state.busy, openRequestedDiary);
            Vue.onMounted(async () => {
                if (pilot)
                    window.addEventListener('beforeunload', beforeUnload);
                await load();
                if (pilot && state.page === 'catalog')
                    await run(catalogList);
                if (props.requestedDiary) {
                    openRequestedDiary();
                    return;
                }
                if (pilot && (!props.teacherPortal || location.hash === '#diario')) {
                    const diary = state.diaries.find(item => item.id === initial.get('diario'));
                    if (diary) {
                        await selectDiary(diary);
                        const period = initial.get('periodo');
                        if (period && state.periods.some(p => p.id === period && p.academic_year_id === diary.academic_year_id)) {
                            state.lessonPeriod = period;
                            syncLink();
                        }
                    }
                    else
                        syncLink();
                }
            });
            Vue.onUnmounted(() => { if (pilot)
                window.removeEventListener('beforeunload', beforeUnload); });
            return { props, state, pilot, catalog, catalogImpact, suggest, decide, lessons, filterPeriod, save, navigation, activeGroup, filteredDiaries, pageLink, go, show, chooseAnother, markDraft, publishMaterial, printMaterial, can, str, date, label, load, selectDiary, loadCommunicationRecipients, communicationOccurrenceChanged, sendCommunication, createPeriod, createComponent, createDiary, createPlan, createLesson, openAttendance, saveAttendance, createAssessment, editAssessment, cancelAssessmentEdit, openAssessment, saveAssessmentResults, saveOpinion, createPedagogicalRecord, submitDiary, reviewDiary, closeDiary, reopenDiary, report, selectRulePeriod, saveAssessmentRule, loadPeriodResults, consolidatePeriod, saveOccurrence };
        } };
})(PigeDiary || (PigeDiary = {}));
var PigeTeacher;
(function (PigeTeacher) {
    const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bahia' }).format(new Date());
    const s = Vue.reactive({ ready: false, busy: false, error: '', email: '', password: '', passwordVisible: false,
        user: null, schools: [], schoolId: '',
        requestedDiary: undefined, section: 'overview', menuOpen: false,
        news: [], newsPage: 1, newsTotal: 0, week: today(), agenda: null });
    function clear() {
        PigeAPI.clear();
        PigeMFA.clear();
        s.user = null;
        s.schools = [];
        s.schoolId = '';
        s.password = '';
        s.passwordVisible = false;
        s.section = 'overview';
        s.menuOpen = false;
        s.news = [];
        s.agenda = null;
        s.week = today();
        s.error = '';
    }
    async function run(work) {
        if (s.busy)
            return;
        s.busy = true;
        s.error = '';
        try {
            await work();
        }
        catch (e) {
            if (e.name !== 'AbortError')
                s.error = e.message;
        }
        finally {
            s.busy = false;
        }
    }
    async function agenda() {
        if (!s.schoolId || !s.week)
            return;
        const data = await PigeAPI.request('/teacher/schools/' + s.schoolId + '/programacao?week=' + encodeURIComponent(s.week));
        s.agenda = data;
    }
    async function school(id) {
        if (s.schoolId && s.schoolId !== id)
            PigeDiary.clearPilotContext(s.schoolId);
        s.agenda = null;
        s.news = [];
        s.newsPage = 1;
        s.section = 'overview';
        s.requestedDiary = undefined;
        s.schoolId = id;
        PigeAPI.setActiveSchool(id);
        if (!id)
            return;
        s.user = await PigeAPI.request('/auth/me');
        await agenda();
    }
    async function workspace() {
        s.schools = await PigeAPI.request('/teacher/schools');
        const link = new URLSearchParams(location.search);
        const linked = location.hash === '#diario' && s.schools.find(item => item.id === link.get('diarioPiloto'));
        await school((linked && linked.id) || s.schools.find(item => item.id === s.schoolId)?.id || s.schools[0]?.id || '');
        if (linked)
            s.section = 'diary';
    }
    async function enter(session) {
        if (session.user.role !== 'teacher') {
            PigeAPI.clear();
            s.error = 'Esta área requer uma conta de Professor. Confira o perfil com a Secretaria.';
            return;
        }
        PigeAPI.useSession(session);
        s.user = session.user;
        await workspace();
    }
    async function login() {
        await run(async () => {
            const password = s.password;
            s.password = '';
            s.passwordVisible = false;
            const data = await PigeAPI.post('/auth/login', { email: s.email, password });
            if (!await PigeMFA.accept(data))
                await enter(data);
        });
    }
    async function logout() { await run(async () => { await PigeAPI.post('/auth/logout', {}); clear(); }); }
    async function start() {
        await PigeInstitution.load();
        try {
            const session = await PigeAPI.refresh();
            await enter(session);
        }
        catch (e) {
            if (e.status !== 401)
                s.error = e.message;
        }
        finally {
            s.ready = true;
        }
    }
    function selectSchool(event) { void run(() => school(event.target.value)); }
    async function publications(page = 1) {
        const id = s.schoolId;
        const feed = await PigeAPI.request('/schools/' + id + '/community-feed?kind=news&page_size=10&page=' + page);
        if (id === s.schoolId) {
            s.news = feed.items;
            s.newsTotal = feed.total;
            s.newsPage = page;
        }
    }
    function navigate(section) {
        if (section !== 'diary' && location.hash === '#diario')
            history.replaceState(history.state, '', location.pathname + location.search);
        s.menuOpen = false;
        s.section = section;
        if (section === 'news')
            void run(() => publications());
        if (section === 'agenda')
            void run(agenda);
    }
    function toggleMenu(open) {
        s.menuOpen = open;
        void Vue.nextTick(() => document.getElementById(open ? 'teacher-menu-close' : 'teacher-menu-toggle')?.focus());
    }
    function menuKey(e) {
        if (!s.menuOpen)
            return;
        if (e.key === 'Escape') {
            e.preventDefault();
            toggleMenu(false);
        }
        if (e.key === 'Tab') {
            const items = document.querySelectorAll('#teacher-navigation button:not([disabled])');
            const first = items[0], last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last?.focus();
            }
            if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first?.focus();
            }
        }
    }
    function date(value) { return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value + 'T12:00:00Z')); }
    function group(diaryId) {
        const diary = s.agenda?.diaries.find(item => item.id === diaryId);
        const assignment = s.agenda?.assignments.find(item => item.id === diary?.teacher_assignment_id);
        return [assignment?.class_name, diary?.component].filter(Boolean).join(' · ');
    }
    Vue.createApp({ render: PigeRenders.teacherPortal, components: { 'school-diary': PigeDiary.component }, setup() {
            Vue.onMounted(() => {
                PigeMFA.init(PigeAPI.request, data => enter(data), logout);
                window.addEventListener('pige-session-expired', () => { clear(); s.error = 'Sessão encerrada. Entre novamente.'; });
                window.addEventListener('resize', () => { if (innerWidth > 800)
                    s.menuOpen = false; });
                void start();
            });
            return { s, pilotForSchool: PigeDiary.pilotForSchool, navigate, toggleMenu, menuKey, publications, identity: PigeInstitution.state, mfa: PigeMFA, login, logout, run, agenda, workspace, date, group, selectSchool };
        } }).mount('#teacher');
})(PigeTeacher || (PigeTeacher = {}));
