"use strict";
/** Identidade pública da escola. Sem segredos, rotas bancárias ou seleção de cliente. */
var PigeInstitution;
(function (PigeInstitution) {
    PigeInstitution.state = Vue.reactive({ display_name: 'Sua escola', short_name: 'Escola', primary_color: '#006D77', secondary_color: '#0D1B2A', font_family: 'system', logo_url: '', font_configured: false, version: 1 });
    function apply(value) {
        Object.assign(PigeInstitution.state, value);
        document.title = value.display_name + ' · ' + (location.pathname === '/online.html' ? 'Portal dos responsáveis' : 'Gestão escolar');
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', value.primary_color);
        const theme = document.querySelector('link[data-institution-theme]');
        if (theme)
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
        try {
            const response = await fetch('/api/v1/institution/identity', { credentials: 'same-origin', cache: 'no-store' });
            if (response.ok)
                apply(await response.json());
        }
        catch { /* Falha de identidade não bloqueia autenticação nem operação escolar. */ }
    }
    PigeInstitution.load = load;
})(PigeInstitution || (PigeInstitution = {}));
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
var PigePortal;
(function (PigePortal) {
    const state = Vue.reactive({ ready: false, busy: false, error: '', notice: '', online: navigator.onLine, account: null, campaign: null, campaigns: [], slug: new URLSearchParams(location.search).get('campaign') || '', mode: 'login', rows: [], total: 0, page: 1, selected: null, editing: false, charges: [], code: '', verifyChannel: 'email', message: '', documentType: '', acceptTerms: false, legal: false, register: { name: '', email: '', password: '', cpf: '', phone: '', address: '', accept_privacy: false, whatsapp_opt_in: false }, login: { email: '', password: '' }, reset: { email: '', code: '', password: '' }, form: { student: PigeOnline.person(), class_group_id: '', previous_school: '', relationship: 'Responsável legal', notes: '', client_key: PigeOnline.newId() } });
    let selectedFile = null;
    async function request(path, options = {}) {
        if (!navigator.onLine)
            throw new Error('Sem conexão. Nenhuma matrícula é confirmada offline.');
        const headers = new Headers(options.headers);
        headers.set('X-CSRF-Protection', '1');
        if (options.body && !(options.body instanceof FormData))
            headers.set('Content-Type', 'application/json');
        const response = await fetch('/api/v1/portal' + path, { ...options, headers, credentials: 'same-origin', cache: 'no-store' });
        if (!response.ok) {
            let value = {};
            try {
                value = await response.json();
            }
            catch { }
            throw new Error(value.errors?.map(x => x.field + ': ' + x.message).join('\n') || value.detail || 'Falha de comunicação.');
        }
        return await response.json();
    }
    const post = (path, value) => request(path, { method: 'POST', body: JSON.stringify(value) });
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
    async function loadList() { const data = await request('/admissions?page=' + state.page); state.rows = data.items; state.total = data.total; }
    async function loadCampaign() { if (state.slug) {
        state.campaign = await request('/campaigns/' + encodeURIComponent(state.slug));
        history.replaceState({}, '', '/online.html?campaign=' + encodeURIComponent(state.slug));
    } }
    async function start() { await run(async () => { state.campaigns = await request('/campaigns'); if (!state.slug && state.campaigns.length === 1)
        state.slug = state.campaigns[0].slug; await loadCampaign(); try {
        state.account = await request('/me');
        await loadList();
    }
    catch {
        state.account = null;
    } }); state.ready = true; }
    async function selectCampaign() { await run(async () => { state.selected = null; state.editing = false; await loadCampaign(); }); }
    async function login() { await run(async () => { if (!state.slug)
        throw new Error('Selecione o processo de matrícula.'); state.account = await post('/login', { ...state.login, campaign_slug: state.slug }); state.login.password = ''; await loadList(); }); }
    async function register() { await run(async () => { if (!state.campaign)
        throw new Error('Selecione um processo de matrícula.'); state.account = await post('/register', { ...state.register, cpf: state.register.cpf || null, campaign_slug: state.slug, terms_version: state.campaign.terms_version }); state.register.password = ''; await loadList(); state.notice = 'Conta criada. Confirme um contato e preencha os dados do aluno.'; }); }
    async function logout() { await run(async () => { await post('/logout', {}); state.account = null; state.rows = []; state.selected = null; state.charges = []; state.editing = false; state.register = { name: '', email: '', password: '', cpf: '', phone: '', address: '', accept_privacy: false, whatsapp_opt_in: false }; state.login.password = ''; state.form.student = PigeOnline.person(); }); }
    async function verifyRequest() { await run(async () => { await post('/verification/request', { channel: state.verifyChannel }); state.notice = 'Código solicitado. Consulte o canal escolhido; a entrega depende da integração da escola.'; }); }
    async function verifyConfirm() { await run(async () => { state.account = await post('/verification/confirm', { code: state.code }); state.code = ''; state.notice = 'Contato confirmado.'; }); }
    async function resetRequest() { await run(async () => { await post('/password/request', { email: state.reset.email, campaign_slug: state.slug }); state.notice = 'Caso exista uma conta elegível, o código será enviado ao e-mail informado.'; }); }
    async function resetConfirm() { await run(async () => { await post('/password/confirm', { ...state.reset, campaign_slug: state.slug }); state.reset.password = ''; state.reset.code = ''; state.mode = 'login'; state.notice = 'Senha redefinida. Entre novamente.'; }); }
    function newAdmission() { state.error = ''; if (!state.campaign || !state.campaign.accepting) {
        state.error = 'Selecione um processo aberto.';
        return;
    } if (state.account?.school_id !== state.campaign.school_id) {
        state.error = 'Esta conta pertence a outra escola. Saia e entre no contexto correto.';
        return;
    } state.selected = null; state.form = { student: PigeOnline.person(), class_group_id: '', previous_school: '', relationship: 'Responsável legal', notes: '', client_key: PigeOnline.newId() }; state.editing = true; }
    function edit() { const a = state.selected; if (!a)
        return; const { previous_school, ...student } = a.student_data; state.form = { student: { ...student }, class_group_id: a.class_group_id, previous_school: previous_school || '', relationship: a.relationship, notes: a.notes, client_key: PigeOnline.newId() }; state.editing = true; }
    async function openRecord(id) { const a = await request('/admissions/' + id); state.selected = a; state.editing = false; state.acceptTerms = false; state.legal = false; state.charges = await request('/admissions/' + id + '/charges'); const c = state.campaigns.find(c => c.id === a.campaign_id); if (c && c.slug !== state.slug) {
        state.slug = c.slug;
        await loadCampaign();
    } state.documentType = a.document_types[0]?.id || ''; }
    async function view(id) { await run(() => openRecord(id)); }
    async function save() { await run(async () => { if (!state.campaign)
        throw new Error('Selecione um processo.'); const a = state.selected; const { client_key, ...body } = state.form; body.student.cpf = body.student.cpf || null; const result = a ? await request('/admissions/' + a.id, { method: 'PATCH', body: JSON.stringify({ ...body, version: a.version }) }) : await post('/admissions', { ...body, campaign_id: state.campaign.id, client_key }); await openRecord(result.id); await loadList(); state.notice = 'Rascunho salvo. Envie os anexos e conclua o envio para análise.'; }); }
    function fileChange(e) { selectedFile = e.target.files?.[0] || null; }
    async function upload() { await run(async () => { const a = state.selected; if (!a || !selectedFile || !state.documentType)
        throw new Error('Selecione o tipo e um arquivo PDF, PNG ou JPEG.'); const data = new FormData(); data.set('version', String(a.version)); data.set('document_type_id', state.documentType); data.set('file', selectedFile); await request('/admissions/' + a.id + '/attachments', { method: 'POST', body: data }); selectedFile = null; await openRecord(a.id); state.notice = 'Documento enviado para conferência.'; }); }
    async function submit() { await run(async () => { const a = state.selected; if (!a || !state.campaign)
        return; await post('/admissions/' + a.id + '/submit', { version: a.version, accept_terms: state.acceptTerms, legal_responsibility: state.legal, terms_version: state.campaign.terms_version }); await openRecord(a.id); await loadList(); state.notice = 'Inscrição enviada. Acompanhe a análise nesta página.'; }); }
    async function sendMessage() { await run(async () => { if (!state.selected)
        return; await post('/admissions/' + state.selected.id + '/messages', { text: state.message }); state.message = ''; await openRecord(state.selected.id); }); }
    async function withdraw() { await run(async () => { if (!state.selected || state.message.length < 3)
        throw new Error('Descreva o motivo da desistência no campo de mensagem.'); await post('/admissions/' + state.selected.id + '/withdraw', { version: state.selected.version, reason: state.message }); state.message = ''; await openRecord(state.selected.id); await loadList(); }); }
    async function download(path, name) { await run(async () => { const r = await fetch('/api/v1/portal' + path, { credentials: 'same-origin', cache: 'no-store' }); if (!r.ok)
        throw new Error('Não foi possível baixar o documento. Recarregue a página e confira seu acesso.'); const url = URL.createObjectURL(await r.blob()); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000); }); }
    async function paginate(delta) { await run(async () => { state.page += delta; await loadList(); }); }
    async function refresh() { await run(async () => { state.account = await request('/me'); await loadList(); if (state.selected)
        await openRecord(state.selected.id); }); }
    async function copy(value) { await run(async () => { await navigator.clipboard.writeText(value); state.notice = 'Código copiado. Confira o beneficiário antes de pagar.'; }); }
    async function saveProfile() { await run(async () => { if (!state.account)
        return; const a = state.account; state.account = await request('/me', { method: 'PATCH', body: JSON.stringify({ version: a.version, name: a.name, cpf: a.cpf || null, phone: a.phone, address: a.address, whatsapp_opt_in: a.whatsapp_opt_in }) }); state.notice = 'Conta atualizada. Inscrições já enviadas e cadastros oficiais não foram alterados; solicite correção à Secretaria.'; }); }
    const editable = () => !state.selected || ['draft', 'changes_requested'].includes(state.selected.status);
    Vue.createApp({ render: PigeRenders.portal, setup() { Vue.onMounted(() => { window.addEventListener('online', () => { state.online = true; }); window.addEventListener('offline', () => { state.online = false; }); if ('serviceWorker' in navigator && window.isSecureContext)
            void navigator.serviceWorker.register('/sw.js').catch(() => { }); void PigeInstitution.load(); void start(); }); return { state, identity: PigeInstitution.state, run, selectCampaign, login, register, logout, verifyRequest, verifyConfirm, resetRequest, resetConfirm, newAdmission, edit, view, save, fileChange, upload, submit, sendMessage, withdraw, download, paginate, refresh, copy, saveProfile, editable, label: PigeOnline.label, date: PigeOnline.date, money: PigeOnline.money, safeLink: PigeOnline.safeLink }; } }).mount('#portal');
})(PigePortal || (PigePortal = {}));
