"use strict";
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
    PigeInstitution.state = Vue.reactive({ display_name: 'Sua escola', short_name: 'Escola', primary_color: '#006D77', secondary_color: '#0D1B2A', font_family: 'system', logo_url: '', font_configured: false, version: 1, ...(initial || {}) });
    function apply(value) {
        Object.assign(PigeInstitution.state, value);
        document.title = value.display_name + ' · ' + (location.pathname === '/online.html' ? 'Portal dos responsáveis' : 'Gestão escolar');
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
        Object.assign(failure, { status: response.status, fields: data.errors || [] });
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
        if (response.status === 401 && retry && token && (!path.startsWith('/auth/') || path.startsWith('/auth/profile'))) {
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
    async function blob(path) {
        let response = await fetch('/api/v1' + path, { headers: { Authorization: `Bearer ${token}` }, credentials: 'same-origin', cache: 'no-store' });
        if (response.status === 401 && token) {
            await refresh();
            response = await fetch('/api/v1' + path, { headers: { Authorization: `Bearer ${token}` }, credentials: 'same-origin', cache: 'no-store' });
        }
        if (!response.ok)
            throw await error(response);
        return response.blob();
    }
    async function objectUrl(path) {
        return URL.createObjectURL(await blob(path));
    }
    PigeAPI.objectUrl = objectUrl;
    async function download(path, filename) {
        const url = URL.createObjectURL(await blob(path));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
    PigeAPI.download = download;
})(PigeAPI || (PigeAPI = {}));
var PigeSupport;
(function (PigeSupport) {
    PigeSupport.status = Vue.reactive({ error: '' });
    let loadedSource = '';
    let script = null;
    let generation = 0;
    async function fetchConfig(schoolId = '') {
        const path = schoolId ? '/api/v1/schools/' + encodeURIComponent(schoolId) + '/support-widget' : '/api/v1/support-widget';
        try {
            const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store' });
            return response.ok ? await response.json() : null;
        }
        catch {
            return null;
        }
    }
    function release() {
        // Somente utiliza a API de descarte quando oferecida pelo próprio SDK.
        try {
            window.hubSDK?.destroy?.();
        }
        catch { /* Atendimento não bloqueia o cadastro. */ }
        script?.remove();
        script = null;
        loadedSource = '';
    }
    async function load(schoolId = '') {
        const request = ++generation, config = await fetchConfig(schoolId);
        if (request !== generation || !config)
            return;
        PigeSupport.status.error = '';
        if (!config.enabled || !config.base_url || !config.website_token) {
            release();
            return;
        }
        let baseUrl;
        try {
            const url = new URL(config.base_url);
            if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password)
                throw new Error('URL inválida');
            baseUrl = url.href.replace(/\/+$/, '');
        }
        catch {
            PigeSupport.status.error = 'Revise a URL do HUB na configuração de atendimento.';
            return;
        }
        const sourceKey = [baseUrl, config.website_token, config.position, config.type, config.launcherTitle].join('|');
        if (sourceKey === loadedSource && script)
            return;
        if (script)
            release();
        const runtime = window;
        runtime.hubSettings = { position: config.position || 'left', type: config.type || 'expanded_bubble', launcherTitle: config.launcherTitle || 'Suporte' };
        const element = document.createElement('script');
        element.dataset.pigeSupportHub = 'true';
        element.src = baseUrl + '/packs/js/sdk.js';
        element.defer = true;
        element.async = true;
        element.onload = () => {
            if (script !== element)
                return;
            try {
                const sdk = window.hubSDK;
                if (!sdk?.run)
                    throw new Error('SDK indisponível');
                sdk.run({ websiteToken: config.website_token, baseUrl });
            }
            catch {
                PigeSupport.status.error = 'O SDK do HUB não iniciou. Verifique a URL, o website token e os cabeçalhos do servidor de atendimento.';
                release();
            }
        };
        element.onerror = () => {
            if (script !== element)
                return;
            PigeSupport.status.error = 'Não foi possível carregar o SDK do HUB. O atendimento está indisponível; os cadastros continuam funcionando.';
            release();
        };
        loadedSource = sourceKey;
        script = element;
        document.head.appendChild(element);
    }
    PigeSupport.load = load;
})(PigeSupport || (PigeSupport = {}));
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
            const s = Vue.reactive({ busy: false, error: '', notice: '', q: '', status: '', page: 1, total: 0, tab: 'queue', rows: [], selected: null, campaigns: [], campaignForm: emptyCampaign(), editingCampaign: false, groups: [], counts: {}, reason: '', action: 'review', identity: false, existingStudent: '', existingGuardian: '', matchQ: '', studentMatches: [], guardianMatches: [], message: '', internal: false, charges: [], bankSummary: [], selectedCharge: null, bankEvents: [], bankReason: '', chargeOpen: false, chargeInitial: '', discardCharge: false, chargeForm: { admission_id: '', enrollment_id: '', amount: '', due_on: '', description: '', billing_type: 'PIX', client_key: PigeOnline.newId(), installment_count: 1, required_for_enrollment: false }, enrollmentQ: '', enrollmentMatches: [], connections: [], jobs: [], jobTotal: 0, jobPage: 1, jobStatus: '', provider: 'asaas', connectionForm: { version: undefined, enabled: false, environment: 'sandbox', api_key: '', webhook_token: '', config: connectConfig() }, editingConnection: false, connect: { configured: false, base_url: '', api_key_configured: false, instance_prefix: 'PG360' }, connectInstances: [], connectJobs: [], connectJobTotal: 0, connectJobPage: 1, connectJobStatus: '', connectLabel: '', connectPrimary: false, connectNumber: '', connectQr: { base64: '', code: '', pairingCode: '' } });
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
            async function connectJobs() { const result = await PigeAPI.request(base() + `/connect/jobs?page=${s.connectJobPage}&status=${s.connectJobStatus}`); s.connectJobs = result.items; s.connectJobTotal = result.total; }
            async function connectLoad() { const result = await PigeAPI.request(base() + '/connect'); s.connect = result.config; s.connectInstances = result.items; await connectJobs(); }
            function clearConnectQr() { s.connectQr = { base64: '', code: '', pairingCode: '' }; }
            function applyConnectQr(value) { const qr = value?.qrcode || {}; s.connectQr = { base64: qr.base64 || '', code: qr.code || '', pairingCode: qr.pairingCode || '' }; }
            async function connectCreate() { await run(async () => { const result = await PigeAPI.post(base() + '/connect/instances', { label: s.connectLabel, primary: s.connectPrimary }); applyConnectQr(result); s.connectLabel = ''; s.connectPrimary = false; await connectLoad(); s.notice = 'Instância criada na Connect API. Use QR Code ou pairing code para conectar o WhatsApp.'; }); }
            async function connectSync(instance) { await run(async () => { const result = await PigeAPI.post(base() + '/connect/instances/' + instance.id + '/sync', {}); applyConnectQr(result); await connectLoad(); }); }
            async function connectPair(instance) { await run(async () => { const result = await PigeAPI.post(base() + '/connect/instances/' + instance.id + '/connect', { number: s.connectNumber }); applyConnectQr(result); s.connectNumber = ''; await connectLoad(); s.notice = 'Solicitação de conexão enviada. Se o QR não aparecer, atualize o estado da instância.'; }); }
            async function connectLogout(instance) { await run(async () => { await PigeAPI.post(base() + '/connect/instances/' + instance.id + '/logout', {}); clearConnectQr(); await connectLoad(); s.notice = 'Instância deslogada. O cadastro remoto foi preservado.'; }); }
            async function connectDelete(instance) { if (!window.confirm('Descadastrar a instância ' + instance.name + ' também na Connect API?'))
                return; await run(async () => { await PigeAPI.request(base() + '/connect/instances/' + instance.id, { method: 'DELETE' }); clearConnectQr(); await connectLoad(); s.notice = 'Instância descadastrada na Connect API e mantida no histórico local.'; }); }
            async function connectTest() { await run(async () => { const result = await PigeAPI.post(base() + '/connect/test', {}); s.notice = result.message; }); }
            async function connectRetry(job) { await run(async () => { await PigeAPI.post(base() + '/connect/jobs/' + job.id + '/retry', { reason: s.reason }); await connectJobs(); s.notice = 'Mensagem devolvida à fila própria da Connect API.'; }); }
            async function load() { if (props.page === 'online') {
                s.campaigns = await PigeAPI.request(base() + '/admission-campaigns');
                s.groups = await PigeAPI.request(base() + '/class-groups');
                await queue();
            }
            else if (props.page === 'banking') {
                await bankList();
            }
            else if (props.page === 'connect') {
                await connectLoad();
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
                return; await PigeAPI.post(base() + '/connect/messages', { admission_id: s.selected.id, text: s.message, client_key: PigeOnline.newId() }); s.message = ''; s.notice = 'Envio enfileirado na Connect API. Consulte o resultado na fila Connect API.'; }); }
            async function download(path, name) { await run(() => PigeAPI.download(base() + path, name)); }
            function newCharge(admissionId = '') { s.chargeForm = { admission_id: admissionId, enrollment_id: '', amount: '', due_on: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), description: admissionId ? 'Matrícula' : 'Mensalidade', billing_type: 'PIX', client_key: PigeOnline.newId(), installment_count: 1, required_for_enrollment: false }; s.enrollmentMatches = []; s.chargeOpen = true; s.error = ''; s.discardCharge = false; s.chargeInitial = JSON.stringify(s.chargeForm); }
            function closeCharge(discard = false) {
                if (s.busy)
                    return;
                if (discard !== true && JSON.stringify(s.chargeForm) !== s.chargeInitial) {
                    s.discardCharge = true;
                    return;
                }
                s.chargeOpen = false;
                s.discardCharge = false;
            }
            function chargeTotal() {
                const amount = Number(s.chargeForm.amount), count = Number(s.chargeForm.installment_count);
                return PigeOnline.money(Number.isFinite(amount * count) ? (amount * count).toFixed(2) : '0');
            }
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
            return { s, props, identity: PigeInstitution.state, closeCharge, chargeTotal, can, str, run, load, search, paginate, paginateJobs, newCampaign, editCampaign, saveCampaign, view, action, match, approve, finalize, reviewDoc, message, whatsapp, download, newCharge, findEnrollments, createCharge, inspectCharge, chargeAction, configure, saveConnection, testConnection, retry, copy, connectionFor, jobs, connectLoad, connectJobs, connectCreate, connectSync, connectPair, connectLogout, connectDelete, connectTest, connectRetry, clearConnectQr, label: PigeOnline.label, date: PigeOnline.date, money: PigeOnline.money, publicURL: PigeOnline.publicURL, safeLink: PigeOnline.safeLink, origin: location.origin, statuses: PigeOnline.statuses };
        } };
})(PigeExpansion || (PigeExpansion = {}));
var PigeDialogs;
(function (PigeDialogs) {
    let installed = false;
    function install() {
        if (installed)
            return;
        installed = true;
        let current = null, opener = null;
        let saved = [], previousOverflow = '';
        function restore() { for (const item of saved)
            item.element.inert = item.inert; saved = []; document.body.style.overflow = previousOverflow; }
        function update() {
            const dialogs = Array.from(document.querySelectorAll('[role="dialog"][aria-modal="true"]'));
            const next = dialogs.filter(element => element.getClientRects().length > 0).at(-1) || null;
            if (next === current)
                return;
            if (current) {
                restore();
                current = null;
                if (!next && opener?.isConnected)
                    opener.focus({ preventScroll: true });
            }
            if (!next) {
                opener = null;
                return;
            }
            opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            current = next;
            previousOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            let branch = next;
            while (branch.parentElement) {
                for (const sibling of Array.from(branch.parentElement.children)) {
                    if (sibling !== branch && sibling instanceof HTMLElement) {
                        saved.push({ element: sibling, inert: sibling.inert });
                        sibling.inert = true;
                    }
                }
                if (branch.parentElement === document.body)
                    break;
                branch = branch.parentElement;
            }
            const heading = next.querySelector('[data-dialog-title]');
            if (heading) {
                heading.tabIndex = -1;
                heading.focus({ preventScroll: true });
            }
            else
                next.querySelector('button,input,select,textarea')?.focus({ preventScroll: true });
        }
        new MutationObserver(update).observe(document.body, { childList: true, subtree: true });
        document.addEventListener('keydown', event => {
            if (!current)
                return;
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopImmediatePropagation();
                current.querySelector('[data-dialog-close]')?.click();
                return;
            }
            if (event.key !== 'Tab')
                return;
            const controls = Array.from(current.querySelectorAll('button,a[href],input,select,textarea,[tabindex="0"]'))
                .filter(el => !el.matches(':disabled') && el.getClientRects().length > 0 && !el.closest('[inert]'));
            const first = controls[0], last = controls.at(-1);
            if (!first) {
                event.preventDefault();
                return;
            }
            if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement))) {
                event.preventDefault();
                last?.focus();
            }
            else if (!event.shiftKey && (document.activeElement === last || !controls.includes(document.activeElement))) {
                event.preventDefault();
                first.focus();
            }
        }, true);
        document.addEventListener('focusin', event => { if (current && !current.contains(event.target))
            current.querySelector('[data-dialog-title],button')?.focus(); });
        update();
    }
    PigeDialogs.install = install;
})(PigeDialogs || (PigeDialogs = {}));
/** Acessibilidade e rolagem do shell. Não interfere no estado dos cadastros.
 * A interface Vue continua sendo a fonte de verdade da abertura e das rotas.
 */
var PigeWorkspace;
(function (PigeWorkspace) {
    function install() {
        const root = document.querySelector('#app');
        if (!root)
            return;
        const compact = window.matchMedia('(max-width: 800px)');
        let opened = false;
        let previousPage = '';
        let locked = null;
        let wasInert = false;
        let pendingFocus = 0;
        const sidebar = () => root.querySelector('#school-navigation');
        const toggle = () => root.querySelector('.menu-button');
        const hasDialog = () => Boolean(root.querySelector('[role="dialog"][aria-modal="true"]'));
        function restore() {
            if (locked) {
                locked.inert = wasInert;
                locked = null;
            }
        }
        function focusContent() {
            if (hasDialog())
                return;
            const main = root.querySelector('#main-content');
            if (!main || main.inert)
                return;
            const heading = main.querySelector('.page-header h1');
            if (heading) {
                heading.tabIndex = -1;
                heading.focus({ preventScroll: true });
            }
            else
                main.focus({ preventScroll: true });
        }
        function close() {
            // Aciona o manipulador Vue existente, sem duplicar estado de navegação.
            if (sidebar()?.classList.contains('visible'))
                toggle()?.click();
        }
        function controls() {
            return Array.from(sidebar()?.querySelectorAll('a[href],button,[tabindex="0"]') || [])
                .filter(el => !el.matches(':disabled') && !el.closest('[inert]') && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden');
        }
        function sync() {
            const nav = sidebar();
            if (!nav) {
                restore();
                opened = false;
                previousPage = '';
                return;
            }
            const page = nav.querySelector('nav a[aria-current="page"]')?.getAttribute('href') || '';
            const changed = Boolean(previousPage && page && page !== previousPage);
            if (page)
                previousPage = page;
            const visible = compact.matches && nav.classList.contains('visible');
            if (visible && !opened) {
                locked = root.querySelector('.main-column');
                if (locked) {
                    wasInert = locked.inert;
                    locked.inert = true;
                }
                // Botão de fechar sempre visível; o restante continua alcançável por Tab.
                requestAnimationFrame(() => {
                    if (opened && nav.isConnected && !hasDialog())
                        nav.querySelector('.sidebar-close')?.focus({ preventScroll: true });
                });
            }
            else if (!visible && opened) {
                restore();
                if (!hasDialog()) {
                    if (compact.matches && !changed)
                        toggle()?.focus({ preventScroll: true });
                    else
                        focusContent();
                }
            }
            opened = visible;
            if (changed) {
                const main = root.querySelector('#main-content');
                if (main)
                    main.scrollTop = 0;
                cancelAnimationFrame(pendingFocus);
                pendingFocus = requestAnimationFrame(() => { if (!opened)
                    focusContent(); });
            }
        }
        root.addEventListener('click', event => {
            if (event.target.closest('[data-focus-content]')) {
                event.preventDefault();
                focusContent();
            }
        });
        document.addEventListener('keydown', event => {
            if (!opened || hasDialog())
                return;
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopImmediatePropagation();
                close();
                return;
            }
            if (event.key !== 'Tab')
                return;
            const items = controls(), first = items[0], last = items.at(-1);
            if (!first) {
                event.preventDefault();
                return;
            }
            const active = document.activeElement;
            if (event.shiftKey && (active === first || !items.includes(active))) {
                event.preventDefault();
                last?.focus();
            }
            else if (!event.shiftKey && (active === last || !items.includes(active))) {
                event.preventDefault();
                first.focus();
            }
        }, true);
        document.addEventListener('focusin', event => {
            if (opened && !hasDialog() && !sidebar()?.contains(event.target))
                controls()[0]?.focus({ preventScroll: true });
        });
        compact.addEventListener('change', () => { if (!compact.matches)
            close(); sync(); });
        new MutationObserver(sync).observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'aria-current'] });
        sync();
    }
    PigeWorkspace.install = install;
    // Scripts defer encontram #app antes de a aplicação Vue montar o workspace.
    // O observador acompanha login/logout sem reconstruir ou mover o DOM do Vue.
    if (typeof document !== 'undefined' && document.body)
        install();
})(PigeWorkspace || (PigeWorkspace = {}));
var PigeUI;
(function (PigeUI) {
    const text = (value) => value === null || value === undefined ? '' : String(value);
    const statusLabels = { active: 'Ativo', archived: 'Arquivado', draft: 'Rascunho', suspended: 'Suspenso', transferred: 'Transferido', cancelled: 'Cancelado', completed: 'Concluído', pending: 'Pendente', received: 'Recebido', validated: 'Validado', rejected: 'Rejeitado', expired: 'Vencido', waived: 'Dispensado', open: 'Aberto', in_progress: 'Em atendimento', waiting: 'Aguardando', closed: 'Fechado', admin: 'Administrador', direction: 'Direção', coordination: 'Coordenação', secretary: 'Secretaria', teacher: 'Professor', student: 'Aluno', guardian: 'Responsável', viewer: 'Consulta', leave: 'Afastado', inactive: 'Inativo', clt: 'CLT', public: 'Serviço público', temporary: 'Temporário', substitute: 'Substituto', intern: 'Estágio', outsourced: 'Terceirizado', other: 'Outro' };
    const catalogLabels = { 'units': 'Unidades', 'academic-years': 'Anos letivos', 'grades': 'Séries e etapas', 'shifts': 'Turnos', 'class-groups': 'Turmas', 'document-types': 'Tipos de documento' };
    const registryPages = ['people', 'students', 'teachers', 'employees', 'guardians', 'suppliers', 'providers', 'customers', 'partners'];
    const businessTypes = { suppliers: { code: 'supplier', singular: 'fornecedor', category: 'Categoria de fornecimento' }, providers: { code: 'service_provider', singular: 'prestador de serviços', category: 'Especialidade / serviço' }, customers: { code: 'customer', singular: 'cliente', category: 'Categoria do cliente' }, partners: { code: 'partner', singular: 'sócio', category: 'Vínculo societário' } };
    const pageLabels = { online: 'Inscrições online', banking: 'Cobranças', integrations: 'Financeiro / ASAAS', connect: 'Connect API', dashboard: 'Visão geral', people: 'Cadastro único', students: 'Alunos', teachers: 'Professores', employees: 'Funcionários', guardians: 'Pais e responsáveis', suppliers: 'Fornecedores', providers: 'Prestadores de serviços', customers: 'Clientes', partners: 'Sócios', academic: 'Estrutura acadêmica', enrollments: 'Matrículas', documents: 'Pendências documentais', protocols: 'Protocolos', reports: 'Relatórios', settings: 'Instituição', users: 'Usuários e acessos', audit: 'Auditoria' };
    const blankModal = () => ({ kind: '', title: '', fields: [], form: {}, target: null, action: '', error: '' });
    const state = Vue.reactive({
        ready: false, configured: true, embedded: window.self !== window.top, online: navigator.onLine, loginBusy: false, busy: false, loading: false,
        error: '', success: '', menuOpen: false, user: null, userPhotoUrl: '', profilePhotoPreview: '',
        schools: [], schoolId: '', page: 'dashboard', q: '', pageNumber: 1, total: 0,
        rows: [], dashboard: {}, catalogs: {}, catalog: 'class-groups',
        selectedStudent: null, studentTab: 'cadastro', profileContext: {}, studentDocs: { items: [], checklist: [], issued: [] }, history: [],
        studentChoices: [], personChoices: [], photoUrls: {}, companies: [], reportClass: '', reportRows: [],
        supportHub: { id: '', company_id: '', enabled: false, base_url: '', position: 'left', widget_type: 'expanded_bubble', launcher_title: 'Suporte', token_configured: false, version: 1 },
        cadastresOpen: true, registryFilter: { type_code: '', entity_kind: '', active: '' }, modalSection: 'identification', discardChanges: false, modalInitial: '', reuseTarget: '',
        modal: blankModal(), login: { email: '', password: '' }, setup: { token: '', admin_name: '', admin_email: '', admin_password: '', company_name: '', company_document: '', school_name: '', unit_name: 'Unidade principal', academic_year: new Date().getFullYear() },
        filters: { status: '', academic_year_id: '', class_group_id: '', document_type_id: '', document_status: '', overdue: false },
        pendencySummary: { truncated: false, total_documents: 0, scanned_students: 0, total_students: 0 },
        studentProtocols: [], studentProtocolTotal: 0,
        canInstall: false, updateAvailable: false,
    });
    let selectedFile = null;
    let identityFiles = {};
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
    function isProfileRole() { return ['teacher', 'student', 'guardian'].includes(text(state.user?.role)); }
    function school() { return state.schools.find(s => s.id === state.schoolId); }
    function label(value) { const key = text(value); return statusLabels[key] || key || '—'; }
    function date(value) { const v = text(value); return v ? new Intl.DateTimeFormat('pt-BR', { timeZone: v.length === 10 ? 'UTC' : 'America/Bahia' }).format(new Date(v.length === 10 ? v + 'T12:00:00Z' : v)) : '—'; }
    function cpf(value) { const v = text(value); return v.length === 11 ? `***.${v.slice(3, 6)}.${v.slice(6, 9)}-**` : 'Não informado'; }
    function initials(value) { return text(value).split(' ').filter(Boolean).slice(0, 2).map(v => v[0]).join('').toUpperCase(); }
    function getName(list, id) { return text(state.catalogs[list]?.find(x => x.id === id)?.name) || '—'; }
    function options(list) { return (state.catalogs[list] || []).map(x => ({ value: x.id, label: text(x.name) + (list === 'class-groups' ? ' · ' + getName('academic-years', x.academic_year_id) + ' · ' + getName('shifts', x.shift_id) : '') })); }
    function field(key, caption, type = 'text', required = false, opts, wide = false) { return { key, label: caption, type, required, options: opts, wide }; }
    const studentFieldKeys = ['previous_school', 'nis', 'sus_card', 'inep_code', 'health_plan', 'allergies', 'medications', 'health_notes', 'special_needs', 'authorized_transport', 'student_notes'];
    const personTypeLabels = {
        student: 'Aluno', teacher: 'Professor', collaborator: 'Colaborador', employee: 'Funcionário',
        parent: 'Pai / mãe', mother: 'Mãe', father: 'Pai', guardian: 'Responsável',
        financial_responsible: 'Responsável financeiro', legal_responsible: 'Responsável legal',
        staff: 'Equipe / administrativo', supplier: 'Fornecedor', service_provider: 'Prestador de serviços', customer: 'Cliente', partner: 'Sócio', other: 'Outro'
    };
    function personTypeLabel(value) { const code = text(value); return personTypeLabels[code] || code.replace(/_/g, ' ').replace(/^./, letter => letter.toUpperCase()); }
    function personTypeOptions(extra = []) {
        const codes = Array.from(new Set([...Object.keys(personTypeLabels), ...extra]));
        return codes.map(value => ({ value, label: personTypeLabel(value) }));
    }
    function personFields(extraTypes = []) {
        return [
            field('entity_kind', 'Natureza da pessoa', 'select', true, [{ value: 'individual', label: 'Pessoa física' }, { value: 'organization', label: 'Pessoa jurídica' }]),
            field('cnpj', 'CNPJ'), field('trade_name', 'Nome fantasia'), field('state_registration', 'Inscrição estadual'), field('municipal_registration', 'Inscrição municipal'),
            field('person_types', 'Tipos de pessoa', 'multiselect', false, personTypeOptions(extraTypes), true),
            field('name', 'Nome completo', 'text', true), field('social_name', 'Nome social'), field('cpf', 'CPF'), field('birth_date', 'Data de nascimento', 'date'),
            field('birth_certificate', 'Certidão / registro de nascimento'), field('birth_city', 'Cidade de nascimento'), field('birth_state', 'UF de nascimento'),
            field('nationality', 'Nacionalidade'), field('sex', 'Sexo', 'select', false, [{ value: 'female', label: 'Feminino' }, { value: 'male', label: 'Masculino' }, { value: 'intersex', label: 'Intersexo' }, { value: 'not_informed', label: 'Não informado' }]),
            field('gender', 'Identidade de gênero'), field('race_color', 'Raça / cor', 'select', false, [{ value: 'branca', label: 'Branca' }, { value: 'preta', label: 'Preta' }, { value: 'parda', label: 'Parda' }, { value: 'amarela', label: 'Amarela' }, { value: 'indigena', label: 'Indígena' }, { value: 'not_informed', label: 'Não informado' }]),
            field('marital_status', 'Estado civil', 'select', false, [{ value: 'single', label: 'Solteiro(a)' }, { value: 'married', label: 'Casado(a)' }, { value: 'divorced', label: 'Divorciado(a)' }, { value: 'widowed', label: 'Viúvo(a)' }, { value: 'not_informed', label: 'Não informado' }]),
            field('rg', 'RG / documento de identidade'), field('rg_issuer', 'Órgão expedidor'), field('rg_state', 'UF do RG'), field('rg_issued_on', 'Data de expedição', 'date'),
            field('mother_name', 'Nome da mãe'), field('father_name', 'Nome do pai'), field('phone', 'Telefone / WhatsApp'), field('phone_secondary', 'Telefone secundário'), field('email', 'E-mail', 'email'),
            field('postal_code', 'CEP'), field('street', 'Logradouro'), field('address_number', 'Número'), field('address_complement', 'Complemento'), field('district', 'Bairro'), field('city', 'Cidade'), field('state', 'UF'), field('country', 'País'),
            field('address', 'Endereço livre / referência', 'text', false, undefined, true), field('occupation', 'Profissão'), field('employer', 'Empresa / empregador'), field('education', 'Escolaridade'),
            field('emergency_contact_name', 'Contato de emergência'), field('emergency_contact_phone', 'Telefone de emergência'), field('active', 'Cadastro ativo', 'checkbox'),
            field('photo', 'Foto da pessoa (PNG ou JPEG)', 'photo', false, undefined, true), field('notes', 'Observações administrativas', 'textarea', false, undefined, true)
        ];
    }
    function studentFields() {
        return [
            field('previous_school', 'Escola anterior'), field('nis', 'NIS / PIS'), field('sus_card', 'Cartão SUS'), field('inep_code', 'Código INEP'),
            field('health_plan', 'Plano de saúde'), field('allergies', 'Alergias', 'textarea', false, undefined, true), field('medications', 'Medicamentos de uso contínuo', 'textarea', false, undefined, true),
            field('health_notes', 'Informações de saúde', 'textarea', false, undefined, true), field('special_needs', 'Necessidades específicas', 'textarea', false, undefined, true),
            field('authorized_transport', 'Transporte autorizado'), field('student_notes', 'Observações pedagógicas / administrativas', 'textarea', false, undefined, true)
        ];
    }
    const employmentTypes = [{ value: 'clt', label: 'CLT' }, { value: 'public', label: 'Serviço público' }, { value: 'temporary', label: 'Temporário' }, { value: 'substitute', label: 'Substituto' }, { value: 'intern', label: 'Estágio' }, { value: 'outsourced', label: 'Terceirizado' }, { value: 'other', label: 'Outro' }];
    const employmentStatuses = [{ value: 'active', label: 'Ativo' }, { value: 'leave', label: 'Afastado' }, { value: 'inactive', label: 'Inativo' }];
    const teacherProfileKeys = ['registration_number', 'professional_registration', 'employment_type', 'employment_status', 'admission_date', 'termination_date', 'inep_code', 'education_institution', 'degree_course', 'specialization', 'teaching_areas', 'workload_hours', 'profile_notes'];
    const employeeProfileKeys = ['employee_number', 'employment_type', 'employment_status', 'admission_date', 'termination_date', 'department', 'job_title', 'work_schedule', 'supervisor_name', 'profile_notes'];
    function teacherFields() {
        return [
            field('registration_number', 'Matrícula funcional'), field('professional_registration', 'Registro profissional / conselho'),
            field('employment_type', 'Vínculo de trabalho', 'select', true, employmentTypes), field('employment_status', 'Situação funcional', 'select', true, employmentStatuses),
            field('admission_date', 'Data de admissão', 'date'), field('termination_date', 'Data de desligamento', 'date'), field('inep_code', 'Código INEP do docente'),
            field('education_institution', 'Instituição de formação'), field('degree_course', 'Curso / licenciatura'), field('specialization', 'Especializações / pós-graduação', 'textarea', false, undefined, true),
            field('teaching_areas', 'Áreas, componentes e etapas de atuação', 'textarea', false, undefined, true), field('workload_hours', 'Carga horária semanal', 'number'),
            field('profile_notes', 'Observações funcionais', 'textarea', false, undefined, true)
        ];
    }
    function employeeFields() {
        return [
            field('employee_number', 'Matrícula funcional'), field('employment_type', 'Vínculo de trabalho', 'select', true, employmentTypes),
            field('employment_status', 'Situação funcional', 'select', true, employmentStatuses), field('admission_date', 'Data de admissão', 'date'), field('termination_date', 'Data de desligamento', 'date'),
            field('department', 'Setor / departamento'), field('job_title', 'Cargo / função'), field('work_schedule', 'Jornada / horário de trabalho'), field('supervisor_name', 'Gestor / responsável'),
            field('profile_notes', 'Observações funcionais', 'textarea', false, undefined, true)
        ];
    }
    function photoFileId(row) { return text(row?.photo_file_id); }
    async function hydratePhoto(row) {
        const id = photoFileId(row);
        if (!id || state.photoUrls[id])
            return;
        try {
            state.photoUrls[id] = await PigeAPI.objectUrl(base() + '/files/' + id + '/download');
        }
        catch { /* A listagem continua utilizável se a foto foi removida. */ }
    }
    function photoSrc(row) { const id = photoFileId(row); if (id && !state.photoUrls[id])
        void hydratePhoto(row); return id ? state.photoUrls[id] || '' : ''; }
    async function hydratePhotos(rows) { await Promise.all(rows.map(row => hydratePhoto(row))); }
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
        await PigeInstitution.load();
        await safe(async () => {
            const info = typeof PigeInstitution.state.configured === 'boolean' ? { configured: PigeInstitution.state.configured } : await PigeAPI.request('/setup/status');
            state.configured = info.configured;
            if ('version' in info)
                PigeInstitution.state.app_version = String(info.version);
            void PigeSupport.load();
            if (info.configured) {
                try {
                    const session = await PigeAPI.refresh();
                    state.user = session.user;
                    state.ready = true;
                    void loadMyPhoto();
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
            void loadMyPhoto();
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
            await PigeInstitution.load();
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
        let saved = null;
        try {
            saved = localStorage.getItem('pige-school');
        }
        catch { /* Navegador pode restringir armazenamento no iframe. */ }
        state.schoolId = state.schools.some(s => s.id === saved) ? saved : state.schools[0]?.id || '';
        const hash = location.hash.replace(/^#\/?/, '');
        state.page = isProfileRole() ? 'dashboard' : (pageLabels[hash] ? hash : 'dashboard');
        if (state.schoolId)
            await changeSchool();
        else
            state.error = 'Nenhuma escola está vinculada ao seu usuário. Solicite acesso ao administrador.';
    }
    async function changeSchool() {
        resetFilters();
        state.studentProtocols = [];
        state.studentProtocolTotal = 0;
        state.photoUrls = {};
        try {
            localStorage.setItem('pige-school', state.schoolId);
        }
        catch { /* Contexto incorporado sem localStorage. */ }
        state.selectedStudent = null;
        state.studentDocs = { items: [], checklist: [], issued: [] };
        state.rows = [];
        state.catalogs = {};
        state.reportRows = [];
        state.reportClass = '';
        state.q = '';
        state.pageNumber = 1;
        await safe(async () => { if (!isProfileRole() && state.page !== 'academic')
            await Promise.all([loadCatalogs(), loadPage()]);
        else
            await loadPage(); });
        void PigeSupport.load(state.schoolId);
    }
    async function loadCatalogs() {
        const sid = state.schoolId;
        const entries = await Promise.all(Object.keys(catalogLabels).map(async (key) => [key, await PigeAPI.request(`/schools/${sid}/${key}`)]));
        if (state.schoolId === sid)
            state.catalogs = Object.fromEntries(entries);
    }
    async function loadSupportHub() {
        const companyId = text(state.schools.find(s => s.id === state.schoolId)?.company_id);
        state.supportHub = companyId
            ? await PigeAPI.request('/companies/' + companyId + '/support-hub')
            : { id: '', company_id: '', enabled: false, base_url: '', position: 'left', widget_type: 'expanded_bubble', launcher_title: 'Suporte', token_configured: false, version: 1 };
    }
    async function navigate(page) {
        if (state.busy || state.modal.kind || document.querySelector('.modal-backdrop'))
            return;
        if (isProfileRole() && page !== 'dashboard') {
            state.page = 'dashboard';
            history.replaceState({}, '', '#/dashboard');
            return;
        }
        resetFilters();
        state.registryFilter = { type_code: '', entity_kind: '', active: '' };
        if (registryPages.includes(page))
            state.cadastresOpen = true;
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
            if (['online', 'banking', 'integrations', 'connect'].includes(state.page)) {
                state.total = 0;
            }
            else if (state.page === 'dashboard') {
                if (isProfileRole()) {
                    const data = await PigeAPI.request('/profile/context');
                    if (current === sequence)
                        state.profileContext = data;
                }
                else {
                    const data = await PigeAPI.request(base() + '/dashboard');
                    if (current === sequence)
                        state.dashboard = data;
                }
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
                if (can('schools.manage')) {
                    state.companies = await PigeAPI.request('/companies');
                    await loadSupportHub();
                }
            }
            else if (state.page === 'users') {
                const data = await PigeAPI.request('/users');
                if (current === sequence) {
                    state.rows = data;
                    state.total = data.length;
                }
            }
            else if (state.page !== 'reports') {
                const resource = ['guardians', 'people', ...Object.keys(businessTypes)].includes(state.page) ? 'persons' : state.page;
                const rf = state.registryFilter, business = businessTypes[state.page];
                const suffix = (state.page === 'guardians' ? '&guardians_only=true' : '')
                    + ((business?.code || rf.type_code) ? '&type_code=' + encodeURIComponent(business?.code || rf.type_code) : '')
                    + (rf.entity_kind ? '&entity_kind=' + rf.entity_kind : '') + (rf.active !== '' ? '&active=' + rf.active : '');
                const data = await PigeAPI.request(base() + '/' + resource + '?' + query + suffix);
                if (current === sequence && sid === state.schoolId) {
                    state.rows = data.items;
                    state.total = data.total;
                    const photoRows = ['students', 'teachers', 'employees'].includes(state.page) ? data.items.map(x => x.person) : data.items;
                    void hydratePhotos(photoRows);
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
            void hydratePhotos([student.person, ...(student.guardians || []).map(g => g.person)]);
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
            form[f.key] = values[f.key] ?? (f.key === 'entity_kind' ? 'individual' : f.type === 'checkbox' ? (f.key === 'active') : f.type === 'number' ? 30 : f.type === 'multiselect' ? [] : '');
        state.modal = { kind, title, fields, form, target, action: '', error: '' };
        selectedFile = null;
        identityFiles = {};
        state.error = '';
        state.discardChanges = false;
        state.reuseTarget = '';
        state.modalInitial = JSON.stringify(form);
        state.modalSection = modalSections()[0]?.id || 'identification';
    }
    function modalDirty() { return JSON.stringify(state.modal.form) !== state.modalInitial || Boolean(selectedFile) || Boolean(identityFiles.logo) || Boolean(identityFiles.font); }
    function closeModal(discard = false) {
        if (state.busy)
            return;
        if (discard !== true && state.modal.fields.length && modalDirty()) {
            state.discardChanges = true;
            return;
        }
        clearProfilePreview();
        state.modal = blankModal();
        state.discardChanges = false;
    }
    function valuesFrom(row, fields) { const map = {}; for (const f of fields)
        map[f.key] = row[f.key] ?? (f.type === 'multiselect' ? [] : ''); return map; }
    function personTypesFrom(row) { const value = row?.person_types; return Array.isArray(value) ? value.map(text) : []; }
    function isBusiness() { return Boolean(businessTypes[state.page]); }
    function isPersonModal() { return ['person', 'guardian', 'student', 'student-edit', 'teacher', 'teacher-edit', 'employee', 'employee-edit', 'business'].includes(state.modal.kind); }
    const personalKeys = new Set(['social_name', 'cpf', 'birth_date', 'rg', 'rg_issuer', 'rg_state', 'rg_issued_on', 'birth_certificate', 'birth_city', 'birth_state', 'nationality', 'sex', 'gender', 'race_color', 'marital_status', 'mother_name', 'father_name', 'occupation', 'employer', 'education', 'emergency_contact_name', 'emergency_contact_phone']);
    function modalFieldRelevant(f) {
        const kind = state.modal.kind, legal = state.modal.form.entity_kind === 'organization';
        if (!isPersonModal())
            return true;
        if (f.key === 'person_types' && kind !== 'person')
            return false;
        if (f.key === 'entity_kind' && kind !== 'person' && kind !== 'business')
            return false;
        if (['cnpj', 'trade_name', 'state_registration', 'municipal_registration'].includes(f.key))
            return legal;
        return !(legal && personalKeys.has(f.key));
    }
    function modalFieldLabel(f) { if (f.key === 'photo' && state.modal.form.entity_kind === 'organization')
        return 'Imagem / logotipo (PNG ou JPEG)'; return f.key === 'name' && state.modal.form.entity_kind === 'organization' ? 'Razão social' : f.label; }
    function fieldSection(f) {
        const k = f.key;
        if (!isPersonModal() && !state.modal.kind.endsWith('-existing'))
            return 'details';
        if (k.startsWith('business_'))
            return 'business';
        if (k === 'person_types')
            return 'types';
        if (studentFieldKeys.includes(k))
            return ['allergies', 'medications', 'health_notes', 'health_plan', 'special_needs', 'sus_card'].includes(k) ? 'health' : 'student';
        if (teacherProfileKeys.includes(k) || employeeProfileKeys.includes(k))
            return 'professional';
        if (['postal_code', 'street', 'address_number', 'address_complement', 'district', 'city', 'state', 'country', 'address'].includes(k))
            return 'address';
        if (['phone', 'phone_secondary', 'email', 'emergency_contact_name', 'emergency_contact_phone'].includes(k))
            return 'contact';
        if (['mother_name', 'father_name'].includes(k))
            return 'family';
        if (['rg', 'rg_issuer', 'rg_state', 'rg_issued_on', 'birth_certificate', 'state_registration', 'municipal_registration'].includes(k))
            return 'documents';
        if (['occupation', 'employer', 'education'].includes(k))
            return 'professional';
        if (k === 'notes')
            return 'notes';
        return 'identification';
    }
    const sectionLabels = {
        identification: { title: 'Identificação', hint: 'Os dados principais identificam este cadastro em toda a instituição.' },
        types: { title: 'Tipos e vínculos', hint: 'Classificações cadastrais não criam login nem concedem permissões. Fichas de aluno, professor e funcionário são completadas nos respectivos cadastros.' },
        documents: { title: 'Documentos', hint: 'Informe os documentos pertinentes à pessoa.' },
        contact: { title: 'Contatos', hint: 'Canais de comunicação e contatos de emergência.' },
        address: { title: 'Endereço', hint: 'Endereço compartilhado entre os vínculos desta pessoa.' },
        family: { title: 'Filiação', hint: 'Os nomes da filiação não substituem os vínculos legais e financeiros com cada aluno.' },
        professional: { title: 'Dados profissionais', hint: 'Informações profissionais e funcionais pertinentes a este cadastro.' },
        student: { title: 'Dados do aluno', hint: 'Informações acadêmicas complementares. Matrícula e turma são gerenciadas separadamente.' },
        health: { title: 'Saúde e cuidados', hint: 'Preencha somente informações necessárias ao atendimento do aluno.' },
        business: { title: 'Dados do vínculo', hint: 'Informações exclusivas deste fornecedor, prestador, cliente ou sócio.' },
        notes: { title: 'Observações', hint: 'Registros administrativos complementares.' },
        details: { title: 'Dados do lançamento', hint: 'Revise as informações antes de confirmar. Campos com * são obrigatórios.' }
    };
    function modalSections() {
        return Object.entries(sectionLabels).map(([id, value]) => ({ id, ...value, fields: state.modal.fields.filter(f => modalFieldRelevant(f) && fieldSection(f) === id) })).filter(s => s.fields.length > 0);
    }
    function modalTab(id) { state.modalSection = id; void Vue.nextTick(() => document.querySelector('.modal-form .modal-body')?.scrollTo({ top: 0 })); }
    function visibleSection(id) { const all = modalSections(); return (all.some(s => s.id === state.modalSection) ? state.modalSection : all[0]?.id) === id; }
    async function validateModal() {
        const form = document.querySelector('.modal-form');
        if (!form)
            return true;
        const invalid = Array.from(form.querySelectorAll('input,select,textarea')).find(el => !el.disabled && !el.checkValidity());
        if (!invalid)
            return true;
        const group = invalid.closest('[data-form-section]');
        if (group)
            state.modalSection = group.dataset.formSection || '';
        state.modal.error = 'Revise o campo: ' + (invalid.closest('label')?.querySelector('span')?.textContent?.trim() || 'informação obrigatória') + '.';
        await Vue.nextTick();
        invalid.focus();
        invalid.reportValidity();
        return false;
    }
    function businessFields() {
        const common = personFields().filter(f => !['person_types', 'birth_date', 'birth_certificate', 'birth_city', 'birth_state', 'nationality', 'sex', 'gender', 'race_color', 'marital_status', 'mother_name', 'father_name', 'occupation', 'employer', 'education', 'emergency_contact_name', 'emergency_contact_phone', 'rg', 'rg_issuer', 'rg_state', 'rg_issued_on'].includes(f.key));
        const config = businessTypes[state.page];
        return [...common, field('business_contact_name', 'Pessoa de contato'), field('business_category', config?.category || 'Categoria'), field('business_reference', 'Referência interna'), field('business_notes', 'Observações deste vínculo', 'textarea', false, undefined, true)];
    }
    function newBusiness(existing = null) {
        const config = businessTypes[state.page];
        if (!config)
            return;
        const profile = existing?.business_profiles?.[config.code] || {};
        const fields = existing && state.reuseTarget ? businessFields().filter(f => f.key.startsWith('business_')) : businessFields();
        const values = existing ? valuesFrom(existing, fields) : { active: true, entity_kind: 'individual' };
        for (const key of ['contact_name', 'category', 'reference', 'notes'])
            values['business_' + key] = profile[key] || '';
        openModal('business', (existing ? 'Editar ' : 'Cadastrar ') + config.singular, fields, values, existing);
        state.modal.action = config.code;
    }
    async function reusePerson() {
        await safe(async () => {
            const target = state.page;
            await searchPersons();
            openModal('reuse', 'Vincular pessoa existente', [field('person_id', 'Pessoa cadastrada', 'person', true)]);
            state.reuseTarget = target;
        });
    }
    async function useExisting() {
        const row = state.personChoices.find(p => p.id === state.modal.form.person_id);
        if (!row)
            throw new Error('Selecione a pessoa cadastrada.');
        const context = state.reuseTarget;
        if (context === 'students')
            newStudent(row);
        else if (context === 'teachers')
            newTeacher(row);
        else if (context === 'employees')
            newEmployee(row);
        else if (context === 'guardians') {
            await PigeAPI.post(base() + '/persons/' + row.id + '/responsible', { version: row.version, data: {} });
            state.modal = blankModal();
            await loadPage();
            state.success = 'Pessoa vinculada como responsável, sem duplicar seu cadastro.';
        }
        else if (businessTypes[context]) {
            const config = businessTypes[context];
            openModal('business-existing', 'Adicionar vínculo de ' + config.singular, businessFields().filter(f => f.key.startsWith('business_')), {}, row);
            state.modal.action = config.code;
        }
    }
    function personDocument(row) { return text(row.cnpj) || cpf(row.cpf); }
    function newPerson() { openModal('person', 'Cadastrar pessoa', personFields(), { active: true, person_types: [] }); }
    function newStudent(existing = null) {
        if (existing) {
            openModal('student-existing', 'Adicionar aluno à pessoa', studentFields(), {}, existing);
            return;
        }
        const fields = [...personFields(), ...studentFields()];
        const birth = fields.find(f => f.key === 'birth_date');
        if (birth)
            birth.required = true;
        openModal('student', 'Cadastrar aluno', fields, { active: true, person_types: ['student'] });
    }
    function editStudent() {
        const student = state.selectedStudent;
        if (!student)
            return;
        const types = personTypesFrom(student.person), personFieldsList = personFields(types), fields = [...personFieldsList, ...studentFields()];
        openModal('student-edit', 'Editar cadastro completo do aluno', fields, { ...valuesFrom(student.person, personFieldsList), ...valuesFrom(student, studentFields()), is_guardian: student.person.is_guardian, person_types: types }, student);
    }
    function newGuardian() { openModal('guardian', 'Cadastrar responsável', personFields(), { active: true, person_types: ['guardian'] }); }
    function newTeacher(existing = null) {
        if (existing) {
            openModal('teacher-existing', 'Adicionar professor à pessoa', teacherFields(), { employment_type: 'other', employment_status: 'active', workload_hours: 0 }, existing);
            return;
        }
        openModal('teacher', 'Cadastrar professor', [...personFields(['teacher']), ...teacherFields()], { active: true, person_types: ['teacher'], employment_type: 'other', employment_status: 'active', workload_hours: 0 });
    }
    function editTeacher(row) {
        const person = row.person, personList = personFields(personTypesFrom(person)), profileFields = teacherFields();
        openModal('teacher-edit', 'Editar cadastro do professor', profileFields.concat(personList), { ...valuesFrom(person, personList), ...valuesFrom(row, profileFields), person_types: personTypesFrom(person), is_guardian: person.is_guardian }, row);
    }
    function newEmployee(existing = null) {
        if (existing) {
            openModal('employee-existing', 'Adicionar funcionário à pessoa', employeeFields(), { employment_type: 'other', employment_status: 'active' }, existing);
            return;
        }
        openModal('employee', 'Cadastrar funcionário', [...personFields(['employee']), ...employeeFields()], { active: true, person_types: ['employee'], employment_type: 'other', employment_status: 'active' });
    }
    function editEmployee(row) {
        const person = row.person, personList = personFields(personTypesFrom(person)), profileFields = employeeFields();
        openModal('employee-edit', 'Editar cadastro do funcionário', profileFields.concat(personList), { ...valuesFrom(person, personList), ...valuesFrom(row, profileFields), person_types: personTypesFrom(person), is_guardian: person.is_guardian }, row);
    }
    function editPerson(row) { const types = personTypesFrom(row); openModal(state.page === 'guardians' ? 'guardian' : 'person', state.page === 'guardians' ? 'Editar responsável' : 'Editar cadastro da pessoa', personFields(types), valuesFrom(row, personFields(types)), row); }
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
            await searchPersons();
            const selected = state.selectedStudent;
            if (selected && !state.studentChoices.some(s => s.id === selected.id))
                state.studentChoices.unshift(selected);
            const fields = [
                field('student_id', 'Aluno', 'student', true), field('class_group_id', 'Turma de destino', 'select', true, options('class-groups')),
                field('enrolled_on', 'Data da matrícula', 'date', true),
                field('enrollment_type', 'Tipo de entrada', 'select', true, [{ value: 'new', label: 'Nova matrícula' }, { value: 'renewal', label: 'Rematrícula' }, { value: 'transfer_in', label: 'Transferência recebida' }, { value: 'returning', label: 'Retorno' }]),
                field('financial_person_id', 'Responsável financeiro', 'person'), field('origin_school', 'Escola de origem'), field('origin_city', 'Cidade de origem'),
                field('entry_reason', 'Motivo / observação de entrada', 'textarea', false, undefined, true), field('external_reference', 'Referência externa'), field('notes', 'Observações', 'textarea', false, undefined, true)
            ];
            openModal('enrollment', 'Nova matrícula', fields, { student_id: selected?.id || '', enrolled_on: new Date().toISOString().slice(0, 10), enrollment_type: 'new' });
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
    async function editIdentity() {
        await safe(async () => {
            await PigeInstitution.load();
            const fields = [field('display_name', 'Nome de apresentação da escola', 'text', true), field('short_name', 'Nome curto no aplicativo', 'text', true), field('primary_color', 'Cor principal', 'color', true), field('secondary_color', 'Cor dos títulos', 'color', true), field('font_family', 'Tipografia', 'select', true, [{ value: 'system', label: 'Padrão do dispositivo' }, { value: 'arial', label: 'Arial' }, { value: 'verdana', label: 'Verdana' }, { value: 'georgia', label: 'Georgia' }, { value: 'times', label: 'Times New Roman' }, { value: 'custom', label: 'Fonte própria da escola (tela e PDF)' }]), field('logo', 'Logotipo da escola (PNG, JPEG ou WebP)', 'identity-logo', false, undefined, true), field('font', 'Fonte da escola para tela e PDF (TTF ou WOFF2)', 'identity-font', false, undefined, true), field('font_license_confirmed', 'Confirmo a licença de uso web e incorporação em PDF da fonte enviada', 'checkbox'), field('remove_logo', 'Remover o logotipo atual', 'checkbox'), field('remove_font', 'Remover a fonte enviada anteriormente', 'checkbox')];
            const identity = PigeInstitution.state;
            openModal('identity', 'Identidade visual da escola', fields, { display_name: identity.display_name, short_name: identity.short_name, primary_color: identity.primary_color, secondary_color: identity.secondary_color, font_family: identity.font_family }, { id: '1', version: identity.version });
        });
    }
    async function editEmbedding() {
        await safe(async () => {
            const row = await PigeAPI.request('/institution/embedding');
            const fields = [field('enabled', 'Permitir abertura dentro dos sites autorizados', 'checkbox'), field('allowed_origins', 'Origens autorizadas — uma por linha', 'textarea', false, undefined, true), field('current_password', 'Sua senha atual para confirmar a alteração', 'password', true)];
            openModal('embedding-security', 'Incorporação no HUB', fields, { enabled: Boolean(row.enabled), allowed_origins: row.allowed_origins.join('\n'), current_password: '' }, row);
        });
    }
    function identityFileChange(event, key) { if (key === 'logo' || key === 'font')
        identityFiles[key] = event.target.files?.[0]; }
    async function manageUnits() { await navigate('academic'); await setCatalog('units'); }
    function editMaintainer() {
        const row = state.companies.find(c => c.id === school()?.company_id);
        if (!row)
            return;
        const fields = [field('name', 'Razão social', 'text', true), field('document', 'CPF / CNPJ')];
        openModal('company-edit', 'Dados da mantenedora', fields, valuesFrom(row, fields), row);
    }
    function newCompany() { openModal('company', 'Cadastrar empresa / mantenedora', [field('name', 'Razão social', 'text', true), field('document', 'CPF / CNPJ')]); }
    function newSchool(row = null) { const fields = [field('company_id', 'Empresa / mantenedora', 'select', true, state.companies.map(c => ({ value: c.id, label: text(c.name) }))), field('name', 'Nome da escola', 'text', true), field('address', 'Endereço', 'text', false, undefined, true), field('phone', 'Telefone'), field('email', 'E-mail', 'email'), field('document_policy', 'Pendências na ativação da matrícula', 'select', true, [{ value: 'warn', label: 'Avisar sem bloquear' }, { value: 'block', label: 'Exigir validação dos documentos obrigatórios' }]), field('active', 'Escola ativa', 'checkbox')]; openModal('school', row ? 'Editar escola' : 'Cadastrar escola', fields, row ? valuesFrom(row, fields) : { document_policy: 'warn', active: true }, row); }
    function editSupportHub() {
        const companyId = text(state.schools.find(s => s.id === state.schoolId)?.company_id);
        if (!companyId)
            return;
        const fields = [
            field('enabled', 'Exibir chat de suporte no site', 'checkbox'),
            field('base_url', 'URL base do Hub', 'url', false, undefined, true),
            field('token', 'Website token do Hub', 'password', false, undefined, true),
            field('position', 'Posição do botão', 'select', true, [{ value: 'left', label: 'Esquerda' }, { value: 'right', label: 'Direita' }]),
            field('widget_type', 'Tipo do botão', 'select', true, [{ value: 'expanded_bubble', label: 'Bolha expandida' }, { value: 'standard', label: 'Bolha padrão' }]),
            field('launcher_title', 'Texto do botão', 'text', true),
        ];
        openModal('support-hub', 'Chat de suporte via site', fields, { ...state.supportHub, token: '' }, state.supportHub);
    }
    async function newUser(row = null) {
        await searchPersons();
        const fields = [field('name', 'Nome completo', 'text', true)];
        if (!row)
            fields.push(field('email', 'E-mail de acesso', 'email', true), field('password', 'Senha inicial (mínimo 12 caracteres)', 'password', true));
        fields.push(field('role', 'Perfil', 'select', true, ['admin', 'direction', 'coordination', 'secretary', 'teacher', 'student', 'guardian', 'viewer'].map(v => ({ value: v, label: label(v) }))), field('person_id', 'Pessoa vinculada (Professor, Aluno ou Responsável)', 'person', false), field('school_ids', 'Escolas autorizadas', 'multiselect', false, state.schools.map(s => ({ value: s.id, label: s.name })), true));
        if (row)
            fields.push(field('active', 'Usuário ativo', 'checkbox'));
        openModal('user', row ? 'Editar acesso' : 'Criar usuário', fields, row ? valuesFrom(row, fields) : { role: 'secretary', person_id: '', school_ids: [state.schoolId] }, row);
    }
    async function loadMyPhoto() {
        const id = state.user?.id;
        if (state.userPhotoUrl)
            URL.revokeObjectURL(state.userPhotoUrl);
        state.userPhotoUrl = '';
        if (!id || !state.user?.has_photo)
            return;
        try {
            const url = await PigeAPI.objectUrl('/auth/profile/photo');
            if (state.user?.id === id)
                state.userPhotoUrl = url;
            else
                URL.revokeObjectURL(url);
        }
        catch { /* Foto não bloqueia a sessão. */ }
    }
    function clearProfilePreview() { if (state.profilePhotoPreview)
        URL.revokeObjectURL(state.profilePhotoPreview); state.profilePhotoPreview = ''; }
    function myPhotoChange(event) {
        clearProfilePreview();
        selectedFile = event.target.files?.[0] || null;
        if (selectedFile && selectedFile.size > 2 * 1024 * 1024) {
            state.modal.error = 'A foto deve ter no máximo 2 MB.';
            selectedFile = null;
            return;
        }
        if (selectedFile) {
            state.profilePhotoPreview = URL.createObjectURL(selectedFile);
            state.modal.form.remove_photo = false;
        }
    }
    async function editMyProfile() {
        await safe(async () => {
            const row = await PigeAPI.request('/auth/profile');
            const fields = [field('name', 'Nome de exibição', 'text', true), field('email', 'E-mail de acesso', 'email', true), field('phone', 'Telefone / WhatsApp', 'tel'), field('job_title', 'Cargo / função'), field('department', 'Setor / departamento'), field('photo', 'Foto do usuário (PNG, JPEG ou WebP, até 2 MB)', 'user-photo', false, undefined, true), field('remove_photo', 'Remover minha foto', 'checkbox'), field('bio', 'Sobre mim', 'textarea', false, undefined, true), field('current_password', 'Senha atual (somente para trocar o e-mail)', 'password')];
            clearProfilePreview();
            openModal('my-profile', 'Meu perfil', fields, { ...valuesFrom(row, fields), remove_photo: false }, row);
        });
    }
    function profilePassword() { if (modalDirty()) {
        state.modal.error = 'Salve ou cancele as alterações antes de trocar a senha.';
        return;
    } password(); }
    function password() { openModal('password', 'Alterar minha senha', [field('current_password', 'Senha atual', 'password', true), field('new_password', 'Nova senha (mínimo 12 caracteres)', 'password', true)]); }
    function archiveStudent() { if (state.selectedStudent)
        openModal('archive', 'Arquivar cadastro do aluno', [field('reason', 'Justificativa', 'textarea', true, undefined, true)], {}, state.selectedStudent); }
    async function downloadFile(id, name = 'documento.pdf') { await safe(() => PigeAPI.download(base() + '/files/' + id + '/download', name)); }
    async function saveModal() {
        if (state.busy || !await validateModal())
            return;
        state.busy = true;
        state.modal.error = '';
        const modal = state.modal, form = { ...modal.form }, target = modal.target, studentId = state.selectedStudent?.id;
        let createdStudent = null;
        let savedPersonId = '';
        try {
            const photo = selectedFile;
            delete form.photo;
            if (modal.kind === 'reuse') {
                await useExisting();
                return;
            }
            if (modal.kind === 'business' || modal.kind === 'business-existing') {
                const details = {};
                for (const key of ['contact_name', 'category', 'reference', 'notes']) {
                    details[key] = form['business_' + key] || '';
                    delete form['business_' + key];
                }
                const endpoint = base() + '/business-persons/' + modal.action;
                if (modal.kind === 'business-existing') {
                    await PigeAPI.post(endpoint, { person_id: target.id, version: target.version, details });
                    savedPersonId = target.id;
                }
                else if (target) {
                    await PigeAPI.patch(endpoint + '/' + target.id, { version: target.version, person: form, details });
                    savedPersonId = target.id;
                }
                else {
                    const created = await PigeAPI.post(endpoint, { person: form, details });
                    savedPersonId = created.id;
                }
            }
            else if (modal.kind === 'student-existing') {
                const studentData = {};
                for (const key of studentFieldKeys) {
                    studentData[key] = form[key] ?? '';
                }
                createdStudent = await PigeAPI.post(base() + '/students', { person_id: target.id, ...studentData });
                savedPersonId = target.id;
            }
            else if (modal.kind === 'student') {
                const studentData = {};
                for (const key of studentFieldKeys) {
                    studentData[key] = form[key] ?? '';
                    delete form[key];
                }
                const types = Array.isArray(form.person_types) ? form.person_types.map(text) : [];
                const person = { ...form, person_types: Array.from(new Set([...types, 'student'])), cpf: form.cpf || null, birth_date: form.birth_date || null, rg_issued_on: form.rg_issued_on || null, is_guardian: false };
                const previous = text(studentData.previous_school);
                createdStudent = await PigeAPI.post(base() + '/students', { person, previous_school: previous, ...studentData });
                savedPersonId = createdStudent.person.id;
            }
            else if (modal.kind === 'student-edit') {
                const studentData = {};
                for (const key of studentFieldKeys) {
                    studentData[key] = form[key] ?? '';
                    delete form[key];
                }
                const personTarget = target.person;
                const types = Array.isArray(form.person_types) ? form.person_types.map(text) : [];
                await PigeAPI.patch(base() + '/persons/' + personTarget.id, { version: personTarget.version, data: { ...form, person_types: Array.from(new Set([...types, 'student'])), cpf: form.cpf || null, birth_date: form.birth_date || null, rg_issued_on: form.rg_issued_on || null, is_guardian: Boolean(personTarget.is_guardian) } });
                await PigeAPI.patch(base() + '/students/' + target.id, { version: target.version, data: studentData });
                savedPersonId = personTarget.id;
            }
            else if (['teacher', 'teacher-existing', 'teacher-edit', 'employee', 'employee-existing', 'employee-edit'].includes(modal.kind)) {
                const isTeacher = modal.kind.startsWith('teacher'), profileKeys = isTeacher ? teacherProfileKeys : employeeProfileKeys;
                const profileData = {};
                for (const key of profileKeys) {
                    profileData[key] = form[key] ?? (key === 'workload_hours' ? 0 : '');
                    delete form[key];
                }
                if (modal.kind.endsWith('-existing')) {
                    await PigeAPI.post(base() + '/' + (isTeacher ? 'teachers' : 'employees'), { person_id: target.id, ...profileData });
                    savedPersonId = target.id;
                }
                else if (modal.kind.endsWith('-edit')) {
                    const personTarget = target.person;
                    const types = Array.isArray(form.person_types) ? form.person_types.map(text) : [];
                    await PigeAPI.patch(base() + '/persons/' + personTarget.id, { version: personTarget.version, data: { ...form, person_types: Array.from(new Set([...types, isTeacher ? 'teacher' : 'employee'])), cpf: form.cpf || null, birth_date: form.birth_date || null, rg_issued_on: form.rg_issued_on || null, is_guardian: Boolean(personTarget.is_guardian) } });
                    await PigeAPI.patch(base() + '/' + (isTeacher ? 'teachers' : 'employees') + '/' + target.id, { version: target.version, data: profileData });
                    savedPersonId = personTarget.id;
                }
                else {
                    const types = Array.isArray(form.person_types) ? form.person_types.map(text) : [];
                    const person = { ...form, person_types: Array.from(new Set([...types, isTeacher ? 'teacher' : 'employee'])), cpf: form.cpf || null, birth_date: form.birth_date || null, rg_issued_on: form.rg_issued_on || null, is_guardian: false };
                    const created = await PigeAPI.post(base() + '/' + (isTeacher ? 'teachers' : 'employees'), { person, ...profileData });
                    savedPersonId = text(created.person?.id);
                }
            }
            else if (modal.kind === 'guardian' || modal.kind === 'person') {
                const types = Array.isArray(form.person_types) ? form.person_types.map(text) : [];
                if (modal.kind === 'guardian')
                    types.push('guardian');
                const data = { ...form, person_types: Array.from(new Set(types)), cpf: form.cpf || null, birth_date: form.birth_date || null, rg_issued_on: form.rg_issued_on || null, is_guardian: modal.kind === 'guardian' ? true : Boolean(target?.is_guardian) };
                if (target) {
                    await PigeAPI.patch(base() + '/persons/' + target.id, { version: target.version, data });
                    savedPersonId = target.id;
                }
                else {
                    const created = await PigeAPI.post(base() + '/persons', data);
                    savedPersonId = created.id;
                }
            }
            if (photo && savedPersonId) {
                const photoData = new FormData();
                photoData.append('file', photo);
                await PigeAPI.request(base() + '/persons/' + savedPersonId + '/photo', { method: 'POST', body: photoData });
            }
            if (modal.kind === 'catalog') {
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
            else if (modal.kind === 'enrollment') {
                form.financial_person_id = form.financial_person_id || null;
                await PigeAPI.post(base() + '/enrollments', form);
            }
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
            else if (modal.kind === 'support-hub') {
                const companyId = text(target?.company_id);
                if (!companyId)
                    throw new Error('Empresa da escola não encontrada.');
                const saved = await PigeAPI.request('/companies/' + companyId + '/support-hub', { method: 'PUT', body: JSON.stringify({
                        version: target?.version,
                        enabled: Boolean(form.enabled),
                        base_url: text(form.base_url),
                        token: text(form.token),
                        position: text(form.position) || 'left',
                        widget_type: text(form.widget_type) || 'expanded_bubble',
                        launcher_title: text(form.launcher_title) || 'Suporte',
                    }) });
                state.supportHub = saved;
                void PigeSupport.load(state.schoolId);
            }
            else if (modal.kind === 'identity') {
                const body = new FormData();
                for (const key of ['logo', 'font'])
                    delete form[key];
                body.set('payload', JSON.stringify({ ...form, version: target.version }));
                if (identityFiles.logo)
                    body.set('logo', identityFiles.logo);
                if (identityFiles.font)
                    body.set('font', identityFiles.font);
                const identity = await PigeAPI.request('/institution/identity', { method: 'PUT', body });
                PigeInstitution.apply(identity);
            }
            else if (modal.kind === 'embedding-security') {
                const updated = await PigeAPI.request('/institution/embedding', { method: 'PUT', body: JSON.stringify({ version: target.version, enabled: Boolean(form.enabled), allowed_origins: text(form.allowed_origins).split(/\r?\n/).map(v => v.trim()).filter(Boolean), current_password: form.current_password }) });
                state.modal = blankModal();
                if (updated.requires_login) {
                    await logout();
                    state.success = 'Origens atualizadas. Entre novamente; os demais acessos também precisarão se autenticar.';
                    return;
                }
                state.success = 'Segurança de incorporação atualizada.';
                return;
            }
            else if (modal.kind === 'company-edit')
                await PigeAPI.patch('/companies/' + target.id, { version: target.version, data: form });
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
                form.person_id = form.person_id || null;
                if (target)
                    await PigeAPI.patch('/users/' + target.id, { ...form, version: target.version });
                else
                    await PigeAPI.post('/users', form);
            }
            else if (modal.kind === 'my-profile') {
                const body = new FormData();
                const { photo, ...payload } = form;
                body.set('payload', JSON.stringify({ ...payload, version: target.version }));
                if (selectedFile)
                    body.set('photo', selectedFile);
                const updated = await PigeAPI.request('/auth/profile', { method: 'PUT', body });
                state.modal = blankModal();
                clearProfilePreview();
                if (updated.requires_login) {
                    await logout();
                    state.login.email = updated.email;
                    state.success = 'E-mail atualizado. Entre novamente.';
                    return;
                }
                state.user = updated;
                await loadMyPhoto();
                state.success = 'Perfil atualizado.';
                return;
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
            const errors = error?.fields || [];
            const key = errors[0]?.field.split('.').at(-1);
            const field = modal.fields.find(f => f.key === key || f.key === 'business_' + key);
            if (field)
                state.modalSection = fieldSection(field);
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
        if (state.userPhotoUrl)
            URL.revokeObjectURL(state.userPhotoUrl);
        state.userPhotoUrl = '';
        clearProfilePreview();
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
        state.photoUrls = {};
        state.catalogs = {};
        state.reportRows = [];
        state.companies = [];
        state.schools = [];
        state.supportHub = { id: '', company_id: '', enabled: false, base_url: '', position: 'left', widget_type: 'expanded_bubble', launcher_title: 'Suporte', token_configured: false, version: 1 };
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
        window.addEventListener('beforeunload', event => { if (state.modal.kind && modalDirty()) {
            event.preventDefault();
            event.returnValue = '';
        } });
    }
    Vue.createApp({ components: { 'expansion-panel': PigeExpansion.component }, render: PigeRenders.app, setup() { Vue.onMounted(() => { PigeDialogs.install(); setupPWA(); void initialize(); }); return { state, editEmbedding, editMyProfile, myPhotoChange, profilePassword, registryPages, businessTypes, isBusiness, newBusiness, reusePerson, personDocument, modalSections, modalTab, visibleSection, modalFieldLabel, modalFieldRelevant, isPersonModal, personTypeOptions, personTypeLabel, modalDirty, identity: PigeInstitution.state, supportStatus: PigeSupport.status, editIdentity, identityFileChange, manageUnits, editMaintainer, text, can, isProfileRole, school, label, date, cpf, initials, photoSrc, getName, options, pageLabels, catalogLabels, configure, login, logout, navigate, changeSchool, setCatalog, search, page, loadPage, viewStudent, newPerson, newStudent, editStudent, newGuardian, newTeacher, editTeacher, newEmployee, editEmployee, editPerson, newCatalog, newEnrollment, viewEnrollment, startMovement, reenroll, newLink, editLink, uploadDocument, fileChange, reviewDocument, waiveDocument, issueDocument, downloadFile, newProtocol, newCompany, newSchool, editSupportHub, newUser, password, archiveStudent, closeModal, saveModal, loadReport, exportStudents, exportClass, searchStudents, searchPersons, filteredClasses, clearFilters, yearChanged, editDraft, viewProtocol, protocolNote, protocolReceipt, exportPendencies, install, updateApp }; } }).mount('#app');
})(PigeUI || (PigeUI = {}));
