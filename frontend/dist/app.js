"use strict";
var PigeAPI;
(function (PigeAPI) {
    let token = '';
    let refreshPromise = null;
    function clear() { token = ''; }
    PigeAPI.clear = clear;
    function useSession(response) { token = response.access_token; }
    PigeAPI.useSession = useSession;
    async function error(response) {
        let data = {};
        try {
            data = await response.json();
        }
        catch { /* A origem pode estar indisponível. */ }
        const fields = data.errors?.map(e => `${e.field.replace(/^body\./, '')}: ${e.message}`).join('\n');
        const failure = new Error(fields || data.detail || `Falha de comunicação (${response.status}).`);
        Object.assign(failure, { status: response.status });
        return failure;
    }
    async function refresh() {
        if (!refreshPromise) {
            refreshPromise = fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Protection': '1' } })
                .then(async (response) => { if (!response.ok)
                throw await error(response); const data = await response.json(); useSession(data); return data; })
                .finally(() => { refreshPromise = null; });
        }
        return refreshPromise;
    }
    PigeAPI.refresh = refresh;
    async function request(path, options = {}, retry = true) {
        if (!navigator.onLine)
            throw new Error('Sem conexão. Os dados não foram enviados. Reconecte-se antes de salvar.');
        const headers = new Headers(options.headers);
        if (token)
            headers.set('Authorization', `Bearer ${token}`);
        headers.set('X-CSRF-Protection', '1');
        if (options.body && !(options.body instanceof FormData))
            headers.set('Content-Type', 'application/json');
        const response = await fetch('/api/v1' + path, { ...options, headers, credentials: 'same-origin', cache: 'no-store' });
        if (response.status === 401 && retry && token && !path.startsWith('/auth/')) {
            try {
                await refresh();
                return await request(path, options, false);
            }
            catch {
                clear();
                window.dispatchEvent(new CustomEvent('pige-session-expired'));
            }
        }
        if (!response.ok)
            throw await error(response);
        return await response.json();
    }
    PigeAPI.request = request;
    function post(path, body) { return request(path, { method: 'POST', body: JSON.stringify(body) }); }
    PigeAPI.post = post;
    function patch(path, body) { return request(path, { method: 'PATCH', body: JSON.stringify(body) }); }
    PigeAPI.patch = patch;
    async function download(path, filename) {
        let response = await fetch('/api/v1' + path, { headers: { Authorization: `Bearer ${token}` }, credentials: 'same-origin', cache: 'no-store' });
        if (response.status === 401) {
            await refresh();
            response = await fetch('/api/v1' + path, { headers: { Authorization: `Bearer ${token}` }, credentials: 'same-origin', cache: 'no-store' });
        }
        if (!response.ok)
            throw await error(response);
        const url = URL.createObjectURL(await response.blob());
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
    PigeAPI.download = download;
})(PigeAPI || (PigeAPI = {}));
var PigeOnline;
(function (PigeOnline) {
    PigeOnline.statuses = { draft: 'Rascunho', submitted: 'Enviada', under_review: 'Em análise', changes_requested: 'Correção solicitada', waitlisted: 'Lista de espera', approved: 'Aprovada / em preparação', enrolled: 'Matriculada', rejected: 'Indeferida', withdrawn: 'Desistência', queued: 'Na fila', pending: 'Aguardando', processing: 'Processando', completed: 'Concluído', confirmed: 'Confirmado / aguardando recebimento', received: 'Recebido', received_external: 'Baixa externa (não bancária)', overdue: 'Vencido', cancelled: 'Cancelado', refunded: 'Estornado', refund_requested: 'Estorno em análise', partially_refunded: 'Estorno parcial', disputed: 'Em disputa', awaiting_review: 'Conferência necessária', failed: 'Falhou', uncertain: 'Resultado incerto', retry: 'Nova tentativa programada', validated: 'Validado', sent: 'Enviada ao provedor', delivered: 'Entregue', read: 'Lida', active: 'Ativa' };
    function label(value) { return PigeOnline.statuses[value] || value; }
    PigeOnline.label = label;
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
var PigeExpansion;
(function (PigeExpansion) {
    const emptyCampaign = () => ({ id: '', version: 1, slug: '', title: '', instructions: '', privacy_notice: '', terms_version: '1', class_group_ids: [], opens_on: new Date().toISOString().slice(0, 10), closes_on: '', active: false, require_verified_contact: true, require_documents: false, require_payment_before_enrollment: false });
    const connectConfig = () => ({ base_url: '', instance: '', send_text_path: '', connection_state_path: '', api_key_header: 'apikey', auth_scheme: '', number_field: 'number', text_field: 'text', message_id_path: 'key.id', contract_confirmed: false });
    PigeExpansion.component = { props: ['schoolId', 'page', 'permissions'], render: PigeRenders.expansion, setup(props) {
            const s = Vue.reactive({ busy: false, error: '', notice: '', q: '', status: '', page: 1, total: 0, tab: 'queue', rows: [], selected: null, campaigns: [], campaignForm: emptyCampaign(), editingCampaign: false, groups: [], counts: {}, reason: '', action: 'review', identity: false, existingStudent: '', existingGuardian: '', matchQ: '', studentMatches: [], guardianMatches: [], message: '', internal: false, charges: [], bankSummary: [], selectedCharge: null, bankEvents: [], bankReason: '', chargeOpen: false, chargeForm: { admission_id: '', enrollment_id: '', amount: '', due_on: '', description: '', billing_type: 'PIX', client_key: PigeOnline.newId(), installment_count: 1, required_for_enrollment: false }, enrollmentQ: '', enrollmentMatches: [], connections: [], jobs: [], jobTotal: 0, jobPage: 1, jobStatus: '', provider: 'asaas', connectionForm: { version: undefined, enabled: false, environment: 'sandbox', api_key: '', webhook_token: '', config: connectConfig() }, editingConnection: false });
            const base = () => '/schools/' + props.schoolId;
            const can = (p) => props.permissions.includes(p);
            const str = (v) => v == null ? '' : String(v);
            async function run(action) { if (s.busy)
                return; s.busy = true; s.error = ''; s.notice = ''; try {
                await action();
            }
            catch (e) {
                s.error = e instanceof Error ? e.message : String(e);
            }
            finally {
                s.busy = false;
            } }
            async function queue() { const result = await PigeAPI.request(base() + `/admissions?page=${s.page}&q=${encodeURIComponent(s.q)}&status=${s.status}`); s.rows = result.items; s.total = result.total; const summary = await PigeAPI.request(base() + '/admissions-summary'); s.counts = summary.counts; }
            async function bankList() { const result = await PigeAPI.request(base() + `/bank-charges?page=${s.page}&q=${encodeURIComponent(s.q)}&status=${s.status}`); s.charges = result.items; s.total = result.total; s.bankSummary = (await PigeAPI.request(base() + '/bank-summary')).items; }
            async function jobs() { const result = await PigeAPI.request(base() + `/integration-jobs?page=${s.jobPage}&status=${s.jobStatus}`); s.jobs = result.items; s.jobTotal = result.total; }
            async function load() { if (props.page === 'online') {
                s.campaigns = await PigeAPI.request(base() + '/admission-campaigns');
                s.groups = await PigeAPI.request(base() + '/class-groups');
                await queue();
            }
            else if (props.page === 'banking') {
                await bankList();
            }
            else {
                s.connections = await PigeAPI.request(base() + '/integrations');
                await jobs();
            } }
            async function search() { s.page = 1; await run(() => props.page === 'online' ? queue() : bankList()); }
            async function paginate(n) { s.page += n; await run(() => props.page === 'online' ? queue() : bankList()); }
            async function paginateJobs(n) { s.jobPage += n; await run(jobs); }
            function newCampaign() { s.campaignForm = emptyCampaign(); s.editingCampaign = true; }
            function editCampaign(c) { const { id, version, slug, title, instructions, privacy_notice, terms_version, class_group_ids, opens_on, closes_on, active, require_verified_contact, require_documents, require_payment_before_enrollment } = c; s.campaignForm = { id, version, slug, title, instructions, privacy_notice, terms_version, class_group_ids: [...class_group_ids], opens_on, closes_on, active, require_verified_contact, require_documents, require_payment_before_enrollment }; s.editingCampaign = true; }
            async function saveCampaign() { await run(async () => { const { id, version, ...data } = s.campaignForm; if (id)
                await PigeAPI.patch(base() + '/admission-campaigns/' + id, { ...data, version });
            else
                await PigeAPI.post(base() + '/admission-campaigns', data); s.editingCampaign = false; await load(); s.notice = 'Processo salvo. Divulgue somente processos ativos com prazos e ofertas conferidos.'; }); }
            async function openAdmission(id) { s.selected = await PigeAPI.request(base() + '/admissions/' + id); s.identity = false; s.studentMatches = []; s.guardianMatches = []; s.existingStudent = ''; s.existingGuardian = ''; s.charges = (await PigeAPI.request(base() + '/bank-charges?admission_id=' + id)).items; }
            async function view(id) { await run(() => openAdmission(id)); }
            async function action() { await run(async () => { const a = s.selected; if (!a)
                return; await PigeAPI.post(base() + '/admissions/' + a.id + '/actions', { version: a.version, action: s.action, reason: s.reason }); await openAdmission(a.id); await queue(); s.reason = ''; }); }
            async function match() { await run(async () => { const q = encodeURIComponent(s.matchQ); s.studentMatches = (await PigeAPI.request(base() + '/students?q=' + q)).items; s.guardianMatches = (await PigeAPI.request(base() + '/persons?guardians_only=true&q=' + q)).items; }); }
            async function approve() { await run(async () => { const a = s.selected; if (!a)
                return; await PigeAPI.post(base() + '/admissions/' + a.id + '/approve', { version: a.version, reason: s.reason, identity_confirmed: s.identity, existing_student_id: s.existingStudent || null, existing_guardian_id: s.existingGuardian || null }); await openAdmission(a.id); await queue(); s.reason = ''; s.notice = 'Inscrição aprovada; matrícula criada como rascunho. Confira documentação e cobrança antes de efetivar.'; }); }
            async function finalize() { await run(async () => { const a = s.selected; if (!a)
                return; await PigeAPI.post(base() + '/admissions/' + a.id + '/finalize', { version: a.version, reason: s.reason }); await openAdmission(a.id); await queue(); s.reason = ''; s.notice = 'Matrícula efetivada. Comprovante disponível no portal do responsável.'; }); }
            async function reviewDoc(item, status) { await run(async () => { const a = s.selected; if (!a)
                return; await PigeAPI.post(base() + `/admissions/${a.id}/attachments/${item.id}/review`, { version: item.version, status, note: s.reason }); await openAdmission(a.id); }); }
            async function message() { await run(async () => { if (!s.selected)
                return; await PigeAPI.post(base() + '/admissions/' + s.selected.id + '/messages', { text: s.message, internal: s.internal }); s.message = ''; await openAdmission(s.selected.id); }); }
            async function whatsapp() { await run(async () => { if (!s.selected)
                return; await PigeAPI.post(base() + '/connect/messages', { admission_id: s.selected.id, text: s.message, client_key: PigeOnline.newId() }); s.message = ''; s.notice = 'Envio enfileirado na Connect API. Consulte o resultado em Integrações.'; }); }
            async function download(path, name) { await run(() => PigeAPI.download(base() + path, name)); }
            function newCharge(admissionId = '') { s.chargeForm = { admission_id: admissionId, enrollment_id: '', amount: '', due_on: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), description: admissionId ? 'Matrícula' : 'Mensalidade', billing_type: 'PIX', client_key: PigeOnline.newId(), installment_count: 1, required_for_enrollment: false }; s.enrollmentMatches = []; s.chargeOpen = true; }
            async function findEnrollments() { await run(async () => { s.enrollmentMatches = (await PigeAPI.request(base() + '/enrollments?q=' + encodeURIComponent(s.enrollmentQ))).items; }); }
            async function createCharge() { await run(async () => { const f = s.chargeForm; await PigeAPI.post(base() + '/bank-charges', { ...f, admission_id: f.admission_id || null, enrollment_id: f.enrollment_id || null, installment_count: Number(f.installment_count) }); s.chargeOpen = false; if (props.page === 'banking')
                await bankList();
            else if (s.selected)
                await openAdmission(s.selected.id); s.notice = 'Cobrança(s) enfileirada(s). Emissão e atualização serão processadas pelo worker.'; }); }
            async function inspectCharge(c) { await run(async () => { s.selectedCharge = c; s.bankReason = ''; s.bankEvents = await PigeAPI.request(base() + '/bank-charges/' + c.id + '/events'); }); }
            async function chargeAction(action) { await run(async () => { const c = s.selectedCharge; if (!c)
                return; await PigeAPI.post(base() + '/bank-charges/' + c.id + '/' + action, { reason: s.bankReason }); s.selectedCharge = null; if (props.page === 'banking')
                await bankList();
            else if (s.selected)
                await openAdmission(s.selected.id); s.notice = action === 'authorize-reissue' ? 'Reemissão autorizada após conferência. Acompanhe a fila.' : 'Solicitação registrada. Aguarde o processamento e atualize a consulta.'; }); }
            function configure(provider) { s.provider = provider; const c = s.connections.find(c => c.provider === provider); s.connectionForm = { version: c?.version, enabled: c?.enabled || false, environment: c?.environment || 'sandbox', api_key: '', webhook_token: '', config: { ...connectConfig(), ...c?.config } }; s.editingConnection = true; }
            async function saveConnection() { await run(async () => { const f = s.connectionForm; await PigeAPI.post(base() + '/integrations/' + s.provider, { ...f, config: s.provider === 'asaas' ? {} : f.config }); f.api_key = ''; f.webhook_token = ''; s.editingConnection = false; await load(); s.notice = 'Configuração salva. O teste HTTP não substitui a homologação de mensagens e cobranças.'; }); }
            async function testConnection(provider) { await run(async () => { const r = await PigeAPI.post(base() + '/integrations/' + provider + '/test', {}); await load(); if (!r.ok)
                throw new Error(r.message + ' Código: ' + r.code); s.notice = r.message; }); }
            async function retry(job) { await run(async () => { await PigeAPI.post(base() + '/integration-jobs/' + job.id + '/retry', { reason: s.reason }); await jobs(); }); }
            async function copy(value) { await run(async () => { await navigator.clipboard.writeText(value); s.notice = 'Copiado.'; }); }
            const connectionFor = (provider) => s.connections.find(c => c.provider === provider);
            Vue.onMounted(() => { void run(load); });
            return { s, props, can, str, run, load, search, paginate, paginateJobs, newCampaign, editCampaign, saveCampaign, view, action, match, approve, finalize, reviewDoc, message, whatsapp, download, newCharge, findEnrollments, createCharge, inspectCharge, chargeAction, configure, saveConnection, testConnection, retry, copy, connectionFor, jobs, label: PigeOnline.label, date: PigeOnline.date, money: PigeOnline.money, publicURL: PigeOnline.publicURL, safeLink: PigeOnline.safeLink, origin: location.origin, statuses: PigeOnline.statuses };
        } };
})(PigeExpansion || (PigeExpansion = {}));
var PigeUI;
(function (PigeUI) {
    const text = (value) => value === null || value === undefined ? '' : String(value);
    const statusLabels = { active: 'Ativo', archived: 'Arquivado', draft: 'Rascunho', suspended: 'Suspenso', transferred: 'Transferido', cancelled: 'Cancelado', completed: 'Concluído', pending: 'Pendente', received: 'Recebido', validated: 'Validado', rejected: 'Rejeitado', expired: 'Vencido', waived: 'Dispensado', open: 'Aberto', in_progress: 'Em atendimento', waiting: 'Aguardando', closed: 'Fechado', admin: 'Administrador', secretary: 'Secretaria', viewer: 'Consulta' };
    const catalogLabels = { 'units': 'Unidades', 'academic-years': 'Anos letivos', 'grades': 'Séries e etapas', 'shifts': 'Turnos', 'class-groups': 'Turmas', 'document-types': 'Tipos de documento' };
    const pageLabels = { online: 'Inscrições online', banking: 'Cobranças', integrations: 'Integrações', dashboard: 'Visão da Secretaria', students: 'Alunos', guardians: 'Responsáveis', academic: 'Estrutura acadêmica', enrollments: 'Matrículas', documents: 'Pendências documentais', protocols: 'Protocolos', reports: 'Relatórios', settings: 'Instituição', users: 'Usuários e acessos', audit: 'Auditoria' };
    const blankModal = () => ({ kind: '', title: '', fields: [], form: {}, target: null, action: '', error: '' });
    const state = Vue.reactive({
        ready: false, configured: true, online: navigator.onLine, loginBusy: false, busy: false, loading: false,
        error: '', success: '', menuOpen: false, user: null,
        schools: [], schoolId: '', page: 'dashboard', q: '', pageNumber: 1, total: 0,
        rows: [], dashboard: {}, catalogs: {}, catalog: 'class-groups',
        selectedStudent: null, studentTab: 'cadastro', studentDocs: { items: [], checklist: [], issued: [] }, history: [],
        studentChoices: [], personChoices: [], companies: [], reportClass: '', reportRows: [],
        modal: blankModal(), login: { email: '', password: '' }, setup: { token: '', admin_name: '', admin_email: '', admin_password: '', company_name: '', company_document: '', school_name: '', unit_name: 'Unidade principal', academic_year: new Date().getFullYear() },
        filters: { status: '', academic_year_id: '', class_group_id: '', document_type_id: '', document_status: '', overdue: false },
        pendencySummary: { truncated: false, total_documents: 0, scanned_students: 0, total_students: 0 },
        studentProtocols: [], studentProtocolTotal: 0,
        canInstall: false, updateAvailable: false,
    });
    let selectedFile = null;
    let sequence = 0;
    let installEvent = null;
    let waitingWorker = null;
    function resetFilters() { state.filters = { status: '', academic_year_id: '', class_group_id: '', document_type_id: '', document_status: '', overdue: false }; }
    function filteredClasses() { return options('class-groups').filter(o => !state.filters.academic_year_id || state.catalogs['class-groups']?.find(c => c.id === o.value)?.academic_year_id === state.filters.academic_year_id); }
    function filterQuery() {
        const query = new URLSearchParams();
        const keys = state.page === 'protocols' ? ['status', 'overdue'] : state.page === 'documents' ? ['academic_year_id', 'class_group_id', 'document_type_id', 'document_status'] : ['status', 'academic_year_id', 'class_group_id'];
        for (const key of keys) {
            const value = state.filters[key];
            if (value)
                query.set(key, text(value));
        }
        return query.toString();
    }
    async function clearFilters() { resetFilters(); state.q = ''; await search(); }
    async function yearChanged() { state.filters.class_group_id = ''; await search(); }
    function base() { return '/schools/' + state.schoolId; }
    function can(permission) { return Boolean(state.user?.permissions.includes(permission)); }
    function school() { return state.schools.find(s => s.id === state.schoolId); }
    function label(value) { const key = text(value); return statusLabels[key] || key || '—'; }
    function date(value) { const v = text(value); return v ? new Intl.DateTimeFormat('pt-BR', { timeZone: v.length === 10 ? 'UTC' : 'America/Bahia' }).format(new Date(v.length === 10 ? v + 'T12:00:00Z' : v)) : '—'; }
    function cpf(value) { const v = text(value); return v.length === 11 ? `***.${v.slice(3, 6)}.${v.slice(6, 9)}-**` : 'Não informado'; }
    function initials(value) { return text(value).split(' ').filter(Boolean).slice(0, 2).map(v => v[0]).join('').toUpperCase(); }
    function getName(list, id) { return text(state.catalogs[list]?.find(x => x.id === id)?.name) || '—'; }
    function options(list) { return (state.catalogs[list] || []).map(x => ({ value: x.id, label: text(x.name) + (list === 'class-groups' ? ' · ' + getName('academic-years', x.academic_year_id) + ' · ' + getName('shifts', x.shift_id) : '') })); }
    function field(key, caption, type = 'text', required = false, opts, wide = false) { return { key, label: caption, type, required, options: opts, wide }; }
    function personFields() { return [field('name', 'Nome completo', 'text', true), field('social_name', 'Nome social'), field('cpf', 'CPF (opcional)'), field('birth_date', 'Nascimento', 'date'), field('phone', 'Telefone / WhatsApp'), field('email', 'E-mail', 'email'), field('address', 'Endereço', 'text', false, undefined, true), field('notes', 'Observações administrativas', 'textarea', false, undefined, true)]; }
    function catalogFields(kind) {
        if (kind === 'academic-years')
            return [field('name', 'Nome do ano letivo', 'text', true), field('starts_on', 'Data inicial', 'date', true), field('ends_on', 'Data final', 'date', true), field('status', 'Situação', 'select', true, [{ value: 'active', label: 'Ativo' }, { value: 'closed', label: 'Fechado' }])];
        if (kind === 'class-groups')
            return [field('name', 'Nome da turma', 'text', true), field('unit_id', 'Unidade', 'select', true, options('units')), field('academic_year_id', 'Ano letivo', 'select', true, options('academic-years')), field('grade_id', 'Série / etapa', 'select', true, options('grades')), field('shift_id', 'Turno', 'select', true, options('shifts')), field('capacity', 'Capacidade', 'number', true), field('active', 'Turma ativa', 'checkbox')];
        if (kind === 'document-types')
            return [field('name', 'Nome do documento', 'text', true), field('grade_id', 'Aplicável à série (vazio = todas)', 'select', false, options('grades')), field('required', 'Obrigatório para matrícula', 'checkbox'), field('active', 'Ativo', 'checkbox')];
        if (kind === 'grades')
            return [field('name', 'Nome da série / etapa', 'text', true), field('level', 'Nível de ensino', 'text', true), field('active', 'Ativo', 'checkbox')];
        return [field('name', 'Nome', 'text', true), field('active', 'Ativo', 'checkbox')];
    }
    function notify(error) { state.error = error instanceof Error ? error.message : String(error); }
    async function safe(action) { state.error = ''; try {
        await action();
    }
    catch (error) {
        notify(error);
    } }
    async function initialize() {
        await safe(async () => {
            const info = await PigeAPI.request('/setup/status');
            state.configured = info.configured;
            if (info.configured) {
                try {
                    const session = await PigeAPI.refresh();
                    state.user = session.user;
                    await loadShell();
                }
                catch {
                    state.user = null;
                }
            }
        });
        state.ready = true;
    }
    async function login() {
        state.loginBusy = true;
        state.error = '';
        try {
            const session = await PigeAPI.post('/auth/login', state.login);
            PigeAPI.useSession(session);
            state.user = session.user;
            state.login.password = '';
            await loadShell();
        }
        catch (error) {
            notify(error);
        }
        finally {
            state.loginBusy = false;
        }
    }
    async function configure() {
        state.loginBusy = true;
        state.error = '';
        try {
            const { token, ...data } = state.setup;
            await PigeAPI.request('/setup', { method: 'POST', headers: { 'X-Setup-Token': token }, body: JSON.stringify(data) });
            state.configured = true;
            state.login.email = data.admin_email;
            state.setup.admin_password = '';
            state.setup.token = '';
            state.success = 'Instalação concluída. Entre com seu usuário.';
        }
        catch (error) {
            notify(error);
        }
        finally {
            state.loginBusy = false;
        }
    }
    async function loadShell() {
        state.schools = await PigeAPI.request('/schools');
        const saved = localStorage.getItem('pige-school');
        state.schoolId = state.schools.some(s => s.id === saved) ? saved : state.schools[0]?.id || '';
        const hash = location.hash.replace(/^#\/?/, '');
        state.page = pageLabels[hash] ? hash : 'dashboard';
        if (state.schoolId)
            await changeSchool();
        else
            state.error = 'Nenhuma escola está vinculada ao seu usuário. Solicite acesso ao administrador.';
    }
    async function changeSchool() {
        resetFilters();
        state.studentProtocols = [];
        state.studentProtocolTotal = 0;
        localStorage.setItem('pige-school', state.schoolId);
        state.selectedStudent = null;
        state.studentDocs = { items: [], checklist: [], issued: [] };
        state.rows = [];
        state.catalogs = {};
        state.reportRows = [];
        state.reportClass = '';
        state.q = '';
        state.pageNumber = 1;
        await safe(async () => { await loadCatalogs(); await loadPage(); });
    }
    async function loadCatalogs() {
        const sid = state.schoolId;
        const entries = await Promise.all(Object.keys(catalogLabels).map(async (key) => [key, await PigeAPI.request(`/schools/${sid}/${key}`)]));
        if (state.schoolId === sid)
            state.catalogs = Object.fromEntries(entries);
    }
    async function navigate(page) {
        if (state.busy || state.modal.kind)
            return;
        resetFilters();
        state.page = page;
        state.pageNumber = 1;
        state.q = '';
        state.selectedStudent = null;
        state.error = '';
        state.menuOpen = false;
        history.replaceState({}, '', `#/${page}`);
        await safe(loadPage);
    }
    async function loadPage() {
        if (!state.schoolId)
            return;
        const current = ++sequence, sid = state.schoolId;
        state.loading = true;
        state.rows = [];
        try {
            const query = `page=${state.pageNumber}&page_size=30&q=${encodeURIComponent(state.q)}&${filterQuery()}`;
            if (['online', 'banking', 'integrations'].includes(state.page)) {
                state.total = 0;
            }
            else if (state.page === 'dashboard') {
                const data = await PigeAPI.request(base() + '/dashboard');
                if (current === sequence)
                    state.dashboard = data;
            }
            else if (state.page === 'academic') {
                await loadCatalogs();
                if (current === sequence) {
                    state.rows = state.catalogs[state.catalog] || [];
                    state.total = state.rows.length;
                }
            }
            else if (state.page === 'documents') {
                const data = await PigeAPI.request(base() + '/document-pendencies?' + query);
                if (current === sequence) {
                    state.rows = data.items;
                    state.total = data.total;
                    state.pendencySummary = data;
                }
            }
            else if (state.page === 'settings') {
                if (can('schools.manage'))
                    state.companies = await PigeAPI.request('/companies');
            }
            else if (state.page === 'users') {
                const data = await PigeAPI.request('/users');
                if (current === sequence) {
                    state.rows = data;
                    state.total = data.length;
                }
            }
            else if (state.page !== 'reports') {
                const resource = state.page === 'guardians' ? 'persons' : state.page;
                const data = await PigeAPI.request(base() + '/' + resource + '?' + query + (state.page === 'guardians' ? '&guardians_only=true' : ''));
                if (current === sequence && sid === state.schoolId) {
                    state.rows = data.items;
                    state.total = data.total;
                }
            }
        }
        finally {
            if (current === sequence)
                state.loading = false;
        }
    }
    async function setCatalog(kind) { state.catalog = kind; await safe(loadPage); }
    async function search() { state.pageNumber = 1; await safe(loadPage); }
    async function page(delta) { state.pageNumber += delta; await safe(loadPage); }
    async function viewStudent(id) {
        const sid = state.schoolId;
        state.loading = true;
        state.error = '';
        try {
            const [student, docs, events, protocols] = await Promise.all([PigeAPI.request(base() + '/students/' + id), PigeAPI.request(base() + '/students/' + id + '/documents'), PigeAPI.request(base() + '/students/' + id + '/history'), PigeAPI.request(base() + '/protocols?student_id=' + id + '&page_size=100')]);
            if (sid !== state.schoolId)
                return;
            state.selectedStudent = student;
            state.studentDocs = docs;
            state.history = events;
            state.studentProtocols = protocols.items;
            state.studentProtocolTotal = protocols.total;
            state.page = 'students';
            state.studentTab = 'cadastro';
        }
        catch (error) {
            notify(error);
        }
        finally {
            state.loading = false;
        }
    }
    function openModal(kind, title, fields, values = {}, target = null) {
        const form = {};
        for (const f of fields)
            form[f.key] = values[f.key] ?? (f.type === 'checkbox' ? false : f.type === 'number' ? 30 : '');
        state.modal = { kind, title, fields, form, target, action: '', error: '' };
        selectedFile = null;
        state.error = '';
    }
    function closeModal() { if (!state.busy)
        state.modal = blankModal(); }
    function valuesFrom(row, fields) { const map = {}; for (const f of fields)
        map[f.key] = row[f.key] ?? ''; return map; }
    function newStudent() { const fields = personFields(); fields[3].required = true; fields.push(field('previous_school', 'Escola anterior')); openModal('student', 'Cadastrar aluno', fields); }
    function editStudent() { const p = state.selectedStudent?.person; if (!p)
        return; openModal('person', 'Editar dados do aluno', personFields(), { ...valuesFrom(p, personFields()), is_guardian: p.is_guardian }, p); }
    function newGuardian() { openModal('guardian', 'Cadastrar responsável', personFields()); }
    function editPerson(row) { openModal('person', 'Editar responsável', personFields(), valuesFrom(row, personFields()), row); }
    function newCatalog(row = null) { const fields = catalogFields(state.catalog); const defaults = { active: true, capacity: 30, status: 'active', level: 'Educação básica' }; openModal('catalog', (row ? 'Editar ' : 'Cadastrar ') + catalogLabels[state.catalog], fields, row ? valuesFrom(row, fields) : defaults, row); state.modal.action = state.catalog; }
    async function searchStudents(value = '') {
        const data = await PigeAPI.request(base() + '/students?page_size=100&q=' + encodeURIComponent(value));
        state.studentChoices = data.items;
    }
    async function searchPersons(value = '') {
        const data = await PigeAPI.request(base() + '/persons?page_size=100&q=' + encodeURIComponent(value));
        state.personChoices = data.items;
    }
    async function newEnrollment() {
        await safe(async () => {
            await searchStudents();
            const selected = state.selectedStudent;
            if (selected && !state.studentChoices.some(s => s.id === selected.id))
                state.studentChoices.unshift(selected);
            const fields = [field('student_id', 'Aluno', 'student', true), field('class_group_id', 'Turma de destino', 'select', true, options('class-groups')), field('enrolled_on', 'Data da matrícula', 'date', true), field('notes', 'Observações', 'textarea', false, undefined, true)];
            openModal('enrollment', 'Nova matrícula', fields, { student_id: selected?.id || '', enrolled_on: new Date().toISOString().slice(0, 10) });
        });
    }
    async function viewEnrollment(id) { await safe(async () => { const data = await PigeAPI.request(base() + '/enrollments/' + id); openModal('enrollment-detail', 'Matrícula ' + text(data.number), [], {}, data); }); }
    function editDraft() {
        const target = state.modal.target;
        if (!target || target.status !== 'draft')
            return;
        const groups = options('class-groups').filter(o => state.catalogs['class-groups'].find(c => c.id === o.value)?.academic_year_id === target.academic_year_id);
        const fields = [field('class_group_id', 'Turma de destino', 'select', true, groups), field('enrolled_on', 'Data da matrícula', 'date', true), field('notes', 'Observações', 'textarea', false, undefined, true), field('reason', 'Motivo da alteração', 'textarea', true, undefined, true)];
        openModal('draft-edit', 'Editar pré-matrícula', fields, valuesFrom(target, fields), target);
    }
    async function viewProtocol(id) {
        await safe(async () => {
            const data = await PigeAPI.request(base() + '/protocols/' + id);
            openModal('protocol-detail', 'Protocolo ' + text(data.number), [], {}, data);
        });
    }
    function protocolNote() {
        const target = state.modal.target;
        if (!target)
            return;
        openModal('protocol-note', 'Registrar atendimento', [field('message', 'Registro do atendimento', 'textarea', true, undefined, true)], {}, target);
    }
    async function protocolReceipt(id) { await safe(() => PigeAPI.download(base() + '/protocols/' + id + '/pdf', 'comprovante-protocolo.pdf')); }
    async function exportPendencies(format) { await safe(() => PigeAPI.download(base() + '/reports/document-pendencies.' + format + '?q=' + encodeURIComponent(state.q) + '&' + filterQuery(), 'pendencias-documentais.' + format)); }
    function startMovement(action) {
        const target = state.modal.target;
        if (!target)
            return;
        const titles = { activate: 'Ativar matrícula', change_class: 'Mudar de turma / turno', suspend: 'Suspender matrícula', reactivate: 'Reativar matrícula', transfer: 'Registrar transferência externa', cancel: 'Cancelar matrícula', complete: 'Concluir matrícula' };
        const fields = [field('reason', 'Motivo / justificativa', 'textarea', true, undefined, true)];
        if (action === 'change_class')
            fields.unshift(field('class_group_id', 'Turma de destino', 'select', true, options('class-groups')));
        openModal('movement', titles[action], fields, {}, target);
        state.modal.action = action;
    }
    function reenroll() {
        const target = state.modal.target;
        if (!target)
            return;
        openModal('reenroll', 'Rematricular em outro ano', [field('class_group_id', 'Turma do novo período', 'select', true, options('class-groups')), field('enrolled_on', 'Data da rematrícula', 'date', true), field('notes', 'Observações', 'textarea', false, undefined, true)], { enrolled_on: new Date().toISOString().slice(0, 10) }, target);
    }
    async function newLink() {
        await safe(async () => {
            await searchPersons();
            openModal('link', 'Vincular responsável', [field('person_id', 'Pessoa cadastrada', 'person', true), field('relationship', 'Parentesco / vínculo', 'text', true), field('legal', 'Responsável legal', 'checkbox'), field('financial', 'Responsável financeiro', 'checkbox'), field('pickup', 'Autorizado para retirada', 'checkbox'), field('primary_contact', 'Contato principal', 'checkbox')], { relationship: 'Responsável', legal: true });
        });
    }
    function editLink(link) {
        const fields = [field('relationship', 'Parentesco / vínculo', 'text', true), field('legal', 'Responsável legal', 'checkbox'), field('financial', 'Responsável financeiro', 'checkbox'), field('pickup', 'Autorizado para retirada', 'checkbox'), field('primary_contact', 'Contato principal', 'checkbox'), field('active', 'Vínculo ativo', 'checkbox')];
        openModal('link-edit', 'Editar vínculo familiar', fields, valuesFrom(link, fields), link);
    }
    function uploadDocument() { openModal('upload', 'Receber documento', [field('document_type_id', 'Tipo de documento', 'select', true, options('document-types')), field('expires_on', 'Validade (opcional)', 'date'), field('file', 'Arquivo PDF, PNG ou JPEG', 'file', true, undefined, true), field('notes', 'Observações', 'textarea', false, undefined, true)]); }
    function fileChange(event) { selectedFile = event.target.files?.[0] || null; }
    function reviewDocument(doc, status) { openModal('review', status === 'validated' ? 'Validar documento' : status === 'archived' ? 'Arquivar documento' : 'Rejeitar documento', [field('notes', 'Justificativa da análise', 'textarea', true, undefined, true)], {}, doc); state.modal.action = status; }
    function waiveDocument() { openModal('waiver', 'Dispensar documento obrigatório', [field('document_type_id', 'Tipo de documento', 'select', true, options('document-types')), field('reason', 'Motivo da dispensa', 'textarea', true, undefined, true)]); }
    function issueDocument(kind = 'student_record', enrollment = null) {
        const selected = state.selectedStudent;
        if (!selected && !enrollment)
            return;
        const enrollmentChoices = (selected?.enrollments || []).map(e => ({ value: e.id, label: text(e.number) + ' · ' + getName('academic-years', e.academic_year_id) }));
        const fields = [field('kind', 'Documento', 'select', true, [{ value: 'student_record', label: 'Ficha do aluno' }, { value: 'enrollment_receipt', label: 'Comprovante de matrícula' }, { value: 'enrollment_declaration', label: 'Declaração de matrícula' }, { value: 'enrollment_form', label: 'Ficha de matrícula (inclusive rascunho)' }]), field('enrollment_id', 'Matrícula (comprovantes e declarações exigem situação ativa)', 'select', false, enrollment ? [{ value: enrollment.id, label: text(enrollment.number) }] : enrollmentChoices)];
        openModal('issue', 'Emitir documento em PDF', fields, { kind, enrollment_id: enrollment?.id || '' }, enrollment);
    }
    async function newProtocol(row = null) {
        await safe(async () => {
            await searchStudents();
            const studentId = text(row?.student_id) || state.selectedStudent?.id;
            if (studentId && !state.studentChoices.some(s => s.id === studentId))
                state.studentChoices.unshift(await PigeAPI.request(base() + '/students/' + studentId));
            const fields = [field('kind', 'Tipo de solicitação', 'text', true), field('student_id', 'Aluno (opcional)', 'student'), field('description', 'Descrição / observações', 'textarea', false, undefined, true), field('due_on', 'Prazo', 'date'), field('status', 'Situação', 'select', true, ['open', 'in_progress', 'waiting', 'completed', 'cancelled'].map(v => ({ value: v, label: label(v) })))];
            openModal('protocol', row ? 'Atualizar protocolo' : 'Abrir protocolo', fields, row ? valuesFrom(row, fields) : { status: 'open', student_id: studentId || '' }, row);
        });
    }
    function newCompany() { openModal('company', 'Cadastrar empresa / mantenedora', [field('name', 'Razão social', 'text', true), field('document', 'CPF / CNPJ')]); }
    function newSchool(row = null) { const fields = [field('company_id', 'Empresa / mantenedora', 'select', true, state.companies.map(c => ({ value: c.id, label: text(c.name) }))), field('name', 'Nome da escola', 'text', true), field('address', 'Endereço', 'text', false, undefined, true), field('phone', 'Telefone'), field('email', 'E-mail', 'email'), field('document_policy', 'Pendências na ativação da matrícula', 'select', true, [{ value: 'warn', label: 'Avisar sem bloquear' }, { value: 'block', label: 'Exigir validação dos documentos obrigatórios' }]), field('active', 'Escola ativa', 'checkbox')]; openModal('school', row ? 'Editar escola' : 'Cadastrar escola', fields, row ? valuesFrom(row, fields) : { document_policy: 'warn', active: true }, row); }
    function newUser(row = null) {
        const fields = [field('name', 'Nome completo', 'text', true)];
        if (!row)
            fields.push(field('email', 'E-mail de acesso', 'email', true), field('password', 'Senha inicial (mínimo 12 caracteres)', 'password', true));
        fields.push(field('role', 'Perfil', 'select', true, ['admin', 'secretary', 'viewer'].map(v => ({ value: v, label: label(v) }))), field('school_ids', 'Escolas autorizadas', 'multiselect', false, state.schools.map(s => ({ value: s.id, label: s.name })), true));
        if (row)
            fields.push(field('active', 'Usuário ativo', 'checkbox'));
        openModal('user', row ? 'Editar acesso' : 'Criar usuário', fields, row ? valuesFrom(row, fields) : { role: 'secretary', school_ids: [state.schoolId] }, row);
    }
    function password() { openModal('password', 'Alterar minha senha', [field('current_password', 'Senha atual', 'password', true), field('new_password', 'Nova senha (mínimo 12 caracteres)', 'password', true)]); }
    function archiveStudent() { if (state.selectedStudent)
        openModal('archive', 'Arquivar cadastro do aluno', [field('reason', 'Justificativa', 'textarea', true, undefined, true)], {}, state.selectedStudent); }
    async function downloadFile(id, name = 'documento.pdf') { await safe(() => PigeAPI.download(base() + '/files/' + id + '/download', name)); }
    async function saveModal() {
        if (state.busy)
            return;
        state.busy = true;
        state.modal.error = '';
        const modal = state.modal, form = { ...modal.form }, target = modal.target, studentId = state.selectedStudent?.id;
        let createdStudent = null;
        try {
            if (modal.kind === 'student') {
                const previous = text(form.previous_school);
                delete form.previous_school;
                createdStudent = await PigeAPI.post(base() + '/students', { person: { ...form, cpf: form.cpf || null, birth_date: form.birth_date || null, is_guardian: false }, previous_school: previous });
            }
            else if (modal.kind === 'guardian' || modal.kind === 'person') {
                const data = { ...form, cpf: form.cpf || null, birth_date: form.birth_date || null, is_guardian: modal.kind === 'guardian' ? true : Boolean(target?.is_guardian) };
                if (target)
                    await PigeAPI.patch(base() + '/persons/' + target.id, { version: target.version, data });
                else
                    await PigeAPI.post(base() + '/persons', data);
            }
            else if (modal.kind === 'catalog') {
                if (modal.action === 'document-types')
                    form.grade_id = form.grade_id || null;
                if (modal.action === 'class-groups')
                    form.capacity = Number(form.capacity);
                if (target)
                    await PigeAPI.patch(base() + '/' + modal.action + '/' + target.id, { version: target.version, data: form });
                else
                    await PigeAPI.post(base() + '/' + modal.action, form);
            }
            else if (modal.kind === 'link' || modal.kind === 'link-edit') {
                if (target)
                    await PigeAPI.patch(base() + '/students/' + studentId + '/guardians/' + target.id, { version: target.version, data: { ...form, person_id: target.person_id } });
                else
                    await PigeAPI.post(base() + '/students/' + studentId + '/guardians', { ...form, active: true });
            }
            else if (modal.kind === 'enrollment')
                await PigeAPI.post(base() + '/enrollments', form);
            else if (modal.kind === 'draft-edit')
                await PigeAPI.patch(base() + '/enrollments/' + target.id, { ...form, version: target.version });
            else if (modal.kind === 'protocol-note')
                await PigeAPI.post(base() + '/protocols/' + target.id + '/notes', { ...form, version: target.version });
            else if (modal.kind === 'movement')
                await PigeAPI.post(base() + '/enrollments/' + target.id + '/movements', { ...form, version: target.version, action: modal.action });
            else if (modal.kind === 'reenroll')
                await PigeAPI.post(base() + '/enrollments/' + target.id + '/reenroll', form);
            else if (modal.kind === 'upload') {
                if (!selectedFile)
                    throw new Error('Selecione o documento.');
                const data = new FormData();
                data.append('file', selectedFile);
                for (const key of ['document_type_id', 'expires_on', 'notes'])
                    if (form[key])
                        data.append(key, text(form[key]));
                await PigeAPI.request(base() + '/students/' + studentId + '/documents', { method: 'POST', body: data });
            }
            else if (modal.kind === 'review')
                await PigeAPI.patch(base() + '/student-documents/' + target.id, { version: target.version, status: modal.action, notes: form.notes });
            else if (modal.kind === 'waiver')
                await PigeAPI.post(base() + '/students/' + studentId + '/document-waivers', form);
            else if (modal.kind === 'issue') {
                const id = studentId || text(target?.student_id);
                const result = await PigeAPI.post(base() + '/students/' + id + '/issued-documents', { kind: form.kind, enrollment_id: form.enrollment_id || null });
                await PigeAPI.download(base() + '/files/' + text(result.file_id) + '/download', text(form.kind) + '.pdf');
            }
            else if (modal.kind === 'protocol') {
                form.student_id = form.student_id || null;
                form.due_on = form.due_on || null;
                if (target)
                    await PigeAPI.patch(base() + '/protocols/' + target.id, { version: target.version, data: form });
                else
                    await PigeAPI.post(base() + '/protocols', form);
            }
            else if (modal.kind === 'company')
                await PigeAPI.post('/companies', form);
            else if (modal.kind === 'school') {
                if (target)
                    await PigeAPI.patch('/schools/' + target.id, { version: target.version, data: form });
                else
                    await PigeAPI.post('/schools', form);
                state.schools = await PigeAPI.request('/schools');
            }
            else if (modal.kind === 'user') {
                if (target)
                    await PigeAPI.patch('/users/' + target.id, { ...form, version: target.version });
                else
                    await PigeAPI.post('/users', form);
            }
            else if (modal.kind === 'password') {
                await PigeAPI.post('/auth/change-password', form);
                state.modal = blankModal();
                await logout();
                state.success = 'Senha alterada. Entre novamente.';
                return;
            }
            else if (modal.kind === 'archive')
                await PigeAPI.post(base() + '/students/' + studentId + '/archive', { version: target.version, data: { reason: form.reason } });
            state.modal = blankModal();
            state.success = 'Operação concluída com sucesso.';
            await loadCatalogs();
            if (createdStudent)
                await viewStudent(createdStudent.id);
            else if (studentId) {
                const tab = state.studentTab;
                await viewStudent(studentId);
                state.studentTab = tab;
            }
            else
                await loadPage();
            if (modal.kind === 'protocol-note')
                await viewProtocol(target.id);
            if (modal.kind === 'draft-edit')
                await viewEnrollment(target.id);
        }
        catch (error) {
            modal.error = error instanceof Error ? error.message : String(error);
            if (state.modal !== modal)
                notify(error);
        }
        finally {
            state.busy = false;
        }
    }
    async function loadReport() { await safe(async () => { if (!state.reportClass) {
        state.reportRows = [];
        return;
    } const result = await PigeAPI.request(base() + '/reports/class/' + state.reportClass); state.reportRows = result.items; }); }
    async function exportStudents() { await safe(() => PigeAPI.download(base() + '/reports/students.csv', 'alunos.csv')); }
    async function exportClass() { if (state.reportClass)
        await safe(() => PigeAPI.download(base() + '/reports/class/' + state.reportClass + '/pdf', 'alunos-da-turma.pdf')); }
    async function logout() {
        try {
            await PigeAPI.post('/auth/logout', {});
        }
        catch { /* Limpar a interface mesmo sem rede. */ }
        PigeAPI.clear();
        state.user = null;
        state.selectedStudent = null;
        state.rows = [];
        state.dashboard = {};
        state.studentDocs = { items: [], checklist: [], issued: [] };
        state.history = [];
        state.studentProtocols = [];
        state.studentProtocolTotal = 0;
        resetFilters();
        state.personChoices = [];
        state.studentChoices = [];
        state.catalogs = {};
        state.reportRows = [];
        state.companies = [];
        state.schools = [];
        state.modal = blankModal();
        state.error = '';
        state.login.password = '';
    }
    async function install() { if (installEvent) {
        await installEvent.prompt();
        installEvent = null;
        state.canInstall = false;
    } }
    function updateApp() { if (waitingWorker && !state.modal.kind)
        waitingWorker.postMessage({ type: 'SKIP_WAITING' }); }
    function setupPWA() {
        window.addEventListener('online', () => { state.online = true; });
        window.addEventListener('offline', () => { state.online = false; });
        window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); installEvent = event; state.canInstall = true; });
        window.addEventListener('pige-session-expired', () => { void logout(); state.error = 'Sua sessão expirou. Entre novamente.'; });
        window.addEventListener('hashchange', () => { const target = location.hash.replace(/^#\/?/, ''); if (pageLabels[target] && target !== state.page && !state.modal.kind)
            void navigate(target); });
        if ('serviceWorker' in navigator && window.isSecureContext) {
            void navigator.serviceWorker.register('/sw.js').then(reg => {
                if (reg.waiting) {
                    waitingWorker = reg.waiting;
                    state.updateAvailable = true;
                }
                reg.addEventListener('updatefound', () => { const worker = reg.installing; worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                    waitingWorker = worker;
                    state.updateAvailable = true;
                } }); });
            }).catch(() => { });
            navigator.serviceWorker.addEventListener('controllerchange', () => { if (state.updateAvailable)
                location.reload(); });
        }
        window.addEventListener('keydown', (event) => { if (event.key === 'Escape')
            closeModal(); });
    }
    Vue.createApp({ components: { 'expansion-panel': PigeExpansion.component }, render: PigeRenders.app, setup() { Vue.onMounted(() => { setupPWA(); void initialize(); }); return { state, text, can, school, label, date, cpf, initials, getName, options, pageLabels, catalogLabels, configure, login, logout, navigate, changeSchool, setCatalog, search, page, loadPage, viewStudent, newStudent, editStudent, newGuardian, editPerson, newCatalog, newEnrollment, viewEnrollment, startMovement, reenroll, newLink, editLink, uploadDocument, fileChange, reviewDocument, waiveDocument, issueDocument, downloadFile, newProtocol, newCompany, newSchool, newUser, password, archiveStudent, closeModal, saveModal, loadReport, exportStudents, exportClass, searchStudents, searchPersons, filteredClasses, clearFilters, yearChanged, editDraft, viewProtocol, protocolNote, protocolReceipt, exportPendencies, install, updateApp }; } }).mount('#app');
})(PigeUI || (PigeUI = {}));
