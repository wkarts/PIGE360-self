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
    PigeInstitution.state = Vue.reactive({ display_name: 'Sua escola', short_name: 'Escola', primary_color: '#006D77', secondary_color: '#0D1B2A', font_family: 'system', logo_url: '', font_configured: false, show_preenrollment_button: true, version: 1, ...(initial || {}) });
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
/** Reutilizável em cadastros/portal. Sugere campos; não salva nem autoriza documentos. */
var PigeAssist;
(function (PigeAssist) {
    let instance = 0;
    const labels = { name: 'Nome / razão social', trade_name: 'Nome fantasia', cpf: 'CPF', cnpj: 'CNPJ', document: 'Documento', birth_date: 'Nascimento', birth_certificate: 'Certidão', rg: 'RG', rg_issuer: 'Órgão emissor', mother_name: 'Nome da mãe', father_name: 'Nome do pai', birth_city: 'Naturalidade', nationality: 'Nacionalidade', postal_code: 'CEP', street: 'Logradouro', address: 'Endereço completo', address_number: 'Número', address_complement: 'Complemento', district: 'Bairro', city: 'Cidade', state: 'UF', country: 'País', email: 'E-mail', phone: 'Telefone', registration_status: 'Situação cadastral', opened_on: 'Abertura', legal_nature: 'Natureza jurídica', main_activity: 'Atividade principal' };
    PigeAssist.component = {
        props: { target: { type: Object, required: true }, fields: { type: Array, default: () => [] }, request: { type: Function, required: true }, root: { type: String, required: true }, lookupRoot: { type: String, default: '' }, ocr: { type: Boolean, default: true }, cnpj: { type: Boolean, default: false }, cep: { type: Boolean, default: true }, mapping: { type: Object, default: () => ({}) }, label: { type: String, default: 'este cadastro' }, source: { type: String, default: '' } },
        emits: ['applied'], render: PigeRenders.assist,
        setup(props, { emit }) {
            const id = 'assist-' + (++instance);
            const s = Vue.reactive({ open: false, busy: false, error: '', notice: '', purpose: 'identity', fileName: '', preview: '', camera: false,
                status: '', jobId: '', rows: [], text: '', warnings: [], source: '', query: '', kind: '', confirmed: false });
            let file = null, stream = null, sequence = 0, disposed = false, timer = null;
            const targetField = (key) => props.mapping[key] || key;
            const fields = () => new Set(props.fields.length ? props.fields : Object.keys(props.target));
            function stopCamera() { stream?.getTracks().forEach(track => track.stop()); stream = null; s.camera = false; }
            function clearPreview() { if (s.preview)
                URL.revokeObjectURL(s.preview); s.preview = ''; }
            function resetResult() { s.rows = []; s.text = ''; s.warnings = []; s.source = ''; s.confirmed = false; s.error = ''; s.notice = ''; }
            function proposals(result) {
                const allowed = fields();
                s.text = result.text;
                s.warnings = result.warnings;
                s.rows = result.suggestions.filter(r => allowed.has(targetField(r.field))).map(r => ({ ...r, targetField: targetField(r.field), before: props.target[targetField(r.field)], checked: !props.target[targetField(r.field)] }));
                s.status = 'Leitura concluída';
                if (!s.rows.length)
                    s.notice = 'Nenhum campo identificado com segurança para esta ficha. Consulte o texto lido ou preencha manualmente.';
            }
            function selectFile(e) { const input = e.target; file = input.files?.[0] || null; input.value = ''; clearPreview(); resetResult(); s.fileName = file?.name || ''; if (file?.type.startsWith('image/'))
                s.preview = URL.createObjectURL(file); if (file)
                void analyze(); }
            async function camera() {
                s.open = true;
                s.error = '';
                const stamp = ++sequence;
                try {
                    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
                        throw new Error('Abra por HTTPS ou use “Fotografar / escolher arquivo”.');
                    const acquired = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } });
                    if (disposed || stamp !== sequence) {
                        acquired.getTracks().forEach(t => t.stop());
                        return;
                    }
                    stopCamera();
                    stream = acquired;
                    s.camera = true;
                    await Vue.nextTick();
                    const video = document.getElementById(id + '-camera');
                    if (!video)
                        throw new Error('Câmera não disponível nesta tela.');
                    video.srcObject = stream;
                    await video.play();
                }
                catch (e) {
                    stopCamera();
                    s.error = 'Não foi possível abrir a câmera. ' + (e instanceof Error ? e.message : 'Use o envio de arquivo.');
                }
            }
            async function capture() {
                const video = document.getElementById(id + '-camera');
                if (!video?.videoWidth)
                    return;
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.getContext('2d').drawImage(video, 0, 0);
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .92));
                if (blob) {
                    file = new File([blob], 'documento.jpg', { type: 'image/jpeg' });
                    s.fileName = file.name;
                    clearPreview();
                    s.preview = URL.createObjectURL(blob);
                    resetResult();
                }
                stopCamera();
                if (file)
                    void analyze();
            }
            async function rotate() {
                if (!file || !s.preview)
                    return;
                const image = new Image();
                image.src = s.preview;
                await image.decode();
                const canvas = document.createElement('canvas');
                canvas.width = image.naturalHeight;
                canvas.height = image.naturalWidth;
                const ctx = canvas.getContext('2d');
                ctx.translate(canvas.width, 0);
                ctx.rotate(Math.PI / 2);
                ctx.drawImage(image, 0, 0);
                const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', .92));
                if (blob) {
                    file = new File([blob], 'documento-rotacionado.jpg', { type: 'image/jpeg' });
                    clearPreview();
                    s.preview = URL.createObjectURL(blob);
                    s.fileName = file.name;
                }
            }
            async function poll(job, stamp, owner, started) {
                if (disposed || stamp !== sequence || owner !== props.target)
                    return;
                s.jobId = job.id;
                s.status = job.status === 'queued' ? 'Documento na fila de leitura…' : 'Lendo documento…';
                if (job.status === 'succeeded' && job.result) {
                    proposals(job.result);
                    s.source = 'Leitura local do documento';
                    s.busy = false;
                    return;
                }
                if (['failed', 'cancelled'].includes(job.status)) {
                    s.busy = false;
                    s.error = 'Não foi possível ler o documento (' + job.error_code + '). Use outra foto ou preencha manualmente.';
                    return;
                }
                if (Date.now() - started > 180000) {
                    s.busy = false;
                    s.error = 'A leitura está demorando. Verifique o worker OCR; o preenchimento manual não depende dele.';
                    return;
                }
                timer = setTimeout(async () => { try {
                    const next = await props.request(props.root + '/ocr/jobs/' + job.id);
                    await poll(next, stamp, owner, started);
                }
                catch (e) {
                    if (stamp === sequence) {
                        s.busy = false;
                        s.error = e instanceof Error ? e.message : String(e);
                    }
                } }, 1800);
            }
            function openDocument() { ++sequence; stopCamera(); resetResult(); s.open = true; s.kind = ''; }
            async function analyze() {
                if (s.busy)
                    return;
                if (!file && !props.source) {
                    s.error = 'Selecione ou fotografe um documento.';
                    return;
                }
                stopCamera();
                resetResult();
                s.busy = true;
                s.open = true;
                const stamp = ++sequence, owner = props.target;
                try {
                    let job;
                    if (!file && props.source)
                        job = await props.request(props.source, { method: 'POST', body: JSON.stringify({ purpose: s.purpose }) });
                    else {
                        const body = new FormData();
                        body.set('purpose', s.purpose);
                        body.set('file', file);
                        job = await props.request(props.root + '/ocr/jobs', { method: 'POST', body });
                    }
                    await poll(job, stamp, owner, Date.now());
                }
                catch (e) {
                    if (stamp === sequence) {
                        s.busy = false;
                        s.error = e instanceof Error ? e.message : String(e);
                    }
                }
            }
            async function cancel() {
                ++sequence;
                if (timer)
                    clearTimeout(timer);
                stopCamera();
                s.busy = false;
                s.status = '';
                if (s.jobId) {
                    const job = s.jobId;
                    s.jobId = '';
                    try {
                        await props.request(props.root + '/ocr/jobs/' + job, { method: 'DELETE' });
                    }
                    catch { /* Expiração já garante descarte no worker. */ }
                }
                resetResult();
                file = null;
                clearPreview();
                s.fileName = '';
                s.open = false;
            }
            function openLookup(kind) { ++sequence; stopCamera(); s.open = true; s.kind = kind; resetResult(); s.query = String(props.target[targetField(kind === 'cep' ? 'postal_code' : 'cnpj')] || ''); }
            async function lookup() {
                if (!s.kind || s.busy)
                    return;
                resetResult();
                s.busy = true;
                const owner = props.target, stamp = ++sequence, query = s.query, kind = s.kind;
                try {
                    const result = await props.request((props.lookupRoot || props.root) + '/lookups/' + kind, { method: 'POST', body: JSON.stringify({ value: query }) });
                    if (disposed || stamp !== sequence || owner !== props.target || query !== s.query)
                        return;
                    proposals({ text: '', confidence: null, warnings: [result.warning], suggestions: Object.entries(result.data).map(([field, value]) => ({ field, value })) });
                    s.source = result.provider + ' · ' + (result.cached ? 'cache' : 'consulta online') + ' · ' + new Date(result.fetched_at).toLocaleString('pt-BR');
                }
                catch (e) {
                    if (stamp === sequence)
                        s.error = e instanceof Error ? e.message : String(e);
                }
                finally {
                    if (stamp === sequence)
                        s.busy = false;
                }
            }
            function apply() {
                if (!s.confirmed || s.busy)
                    return;
                s.error = '';
                const applied = {};
                for (const row of s.rows.filter(r => r.checked)) {
                    if (!fields().has(row.targetField)) {
                        row.checked = false;
                        continue;
                    }
                    if (props.target[row.targetField] !== row.before) {
                        row.checked = false;
                        s.error = 'Um campo foi alterado durante a conferência. Consulte novamente para evitar sobrescrever sua edição.';
                        continue;
                    }
                    props.target[row.targetField] = row.value;
                    applied[row.targetField] = row.value;
                    row.before = row.value;
                    row.checked = false;
                }
                if (Object.keys(applied).length) {
                    emit('applied', applied);
                    s.notice = 'Campos preenchidos no rascunho. Revise a ficha e use o botão Salvar para persistir.';
                    s.confirmed = false;
                }
            }
            Vue.onUnmounted(() => { disposed = true; ++sequence; if (timer)
                clearTimeout(timer); stopCamera(); clearPreview(); file = null; });
            Vue.onMounted(() => { if (props.source) {
                s.open = true;
                void analyze();
            } });
            return { s, id, props, labels, selectFile, camera, capture, rotate, stopCamera, openDocument, analyze, cancel, openLookup, lookup, apply };
        }
    };
})(PigeAssist || (PigeAssist = {}));
var PigePortal;
(function (PigePortal) {
    const state = Vue.reactive({ schools: [], schoolId: new URLSearchParams(location.search).get('school') || '', catalogFailed: false, assistSource: '', profileReadSource: '', profileOpen: false, ready: false, busy: false, error: '', notice: '', online: navigator.onLine, account: null, campaign: null, campaigns: [], slug: new URLSearchParams(location.search).get('campaign') || '', mode: 'login', rows: [], total: 0, page: 1, selected: null, editing: false, charges: [], code: '', verifyChannel: 'email', message: '', documentType: '', acceptTerms: false, legal: false, register: { name: '', email: '', password: '', cpf: '', phone: '', address: '', accept_privacy: false, whatsapp_opt_in: false }, login: { email: '', password: '' }, reset: { email: '', code: '', password: '' }, form: { student: PigeOnline.person(), class_group_id: '', previous_school: '', relationship: 'Responsável legal', notes: '', client_key: PigeOnline.newId() } });
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
            const ref = value.request_id || response.headers.get('X-Request-ID') || '';
            const error = new Error((value.errors?.map(x => x.field + ': ' + x.message).join('\n') || value.detail || 'Falha de comunicação.') + (ref ? ' · Referência: ' + ref : ''));
            Object.assign(error, { status: response.status });
            throw error;
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
    const visibleCampaigns = () => state.campaigns.filter(c => !state.schoolId || c.school_id === state.schoolId);
    const authContext = () => ({ school_id: state.schoolId, campaign_slug: '' });
    async function loadCampaign() {
        state.campaign = null;
        if (state.slug) {
            state.campaign = await request('/campaigns/' + encodeURIComponent(state.slug));
            state.schoolId = state.campaign.school_id;
            history.replaceState({}, '', '/online.html?campaign=' + encodeURIComponent(state.slug));
        }
    }
    async function start() {
        await run(async () => {
            state.catalogFailed = false;
            try {
                const context = await request('/context');
                state.schools = context.schools;
                if (!state.schools.some(s => s.id === state.schoolId))
                    state.schoolId = context.default_school_id;
                state.campaigns = await request('/campaigns');
                if (state.slug) {
                    try {
                        await loadCampaign();
                    }
                    catch (e) {
                        if (e.status !== 404)
                            throw e;
                        state.slug = '';
                        state.notice = 'O link deste processo não está disponível. Acesse sua conta ou consulte a Secretaria.';
                    }
                }
            }
            catch (e) {
                state.catalogFailed = true;
                state.error = e instanceof Error ? e.message : 'Não foi possível carregar o portal.';
            }
            try {
                state.account = await request('/me');
                state.schoolId = state.account.school_id;
                await loadList();
            }
            catch (e) {
                if (e.status === 401)
                    state.account = null;
                else if (!state.error)
                    state.error = e instanceof Error ? e.message : 'Não foi possível recuperar a sessão.';
            }
            if (state.campaign && state.schoolId !== state.campaign.school_id) {
                state.campaign = null;
                state.slug = '';
            }
            if (!state.campaign && !state.catalogFailed) {
                const rows = visibleCampaigns();
                if (rows.length === 1) {
                    state.slug = rows[0].slug;
                    await loadCampaign();
                }
            }
        });
        state.ready = true;
    }
    async function selectSchool() { await run(async () => { state.slug = ''; state.campaign = null; const rows = visibleCampaigns(); if (rows.length === 1) {
        state.slug = rows[0].slug;
        await loadCampaign();
    }
    else
        history.replaceState({}, '', '/online.html?school=' + encodeURIComponent(state.schoolId)); }); }
    async function selectCampaign() { await run(async () => { state.selected = null; state.editing = false; await loadCampaign(); }); }
    async function afterMFA(result) { state.account = result; state.schoolId = state.account.school_id; await loadList(); }
    async function mfaRequest(path, options = {}) { const headers = new Headers(options.headers); headers.set('X-CSRF-Protection', '1'); if (options.body)
        headers.set('Content-Type', 'application/json'); const r = await fetch('/api/v1' + path, { ...options, headers, credentials: 'same-origin', cache: 'no-store' }); const data = await r.json(); if (!r.ok)
        throw new Error(data.detail || 'Não foi possível confirmar a autenticação.'); return data; }
    async function login() { await run(async () => { if (!state.schoolId)
        throw new Error('Selecione a unidade para acessar sua conta.'); const result = await post('/login', { ...state.login, ...authContext() }); state.login.password = ''; if (await PigeMFA.accept(result))
        return; await afterMFA(result); }); }
    async function register() { await run(async () => { if (!state.campaign)
        throw new Error('Selecione um processo de matrícula.'); const result = await post('/register', { ...state.register, cpf: state.register.cpf || null, campaign_slug: state.slug, terms_version: state.campaign.terms_version }); state.register.password = ''; if (await PigeMFA.accept(result))
        return; await afterMFA(result); state.notice = 'Conta criada. Confirme um contato e preencha os dados do aluno.'; }); }
    async function logout() { state.assistSource = ''; state.profileReadSource = ''; state.profileOpen = false; await run(async () => { await post('/logout', {}); state.account = null; state.rows = []; state.selected = null; state.charges = []; state.editing = false; state.register = { name: '', email: '', password: '', cpf: '', phone: '', address: '', accept_privacy: false, whatsapp_opt_in: false }; state.login.password = ''; state.form.student = PigeOnline.person(); }); }
    async function verifyRequest() { await run(async () => { await post('/verification/request', { channel: state.verifyChannel }); state.notice = 'Código solicitado. Consulte o canal escolhido; a entrega depende da integração da escola.'; }); }
    async function verifyConfirm() { await run(async () => { state.account = await post('/verification/confirm', { code: state.code }); state.code = ''; state.notice = 'Contato confirmado.'; }); }
    async function resetRequest() { await run(async () => { await post('/password/request', { email: state.reset.email, ...authContext() }); state.notice = 'Caso exista uma conta elegível, o código será enviado ao e-mail informado.'; }); }
    async function resetConfirm() { await run(async () => { await post('/password/confirm', { ...state.reset, ...authContext() }); state.reset.password = ''; state.reset.code = ''; state.mode = 'login'; state.notice = 'Senha redefinida. Entre novamente.'; }); }
    function newAdmission() { state.assistSource = ''; state.error = ''; if (!state.campaign || !state.campaign.accepting) {
        state.error = 'Selecione um processo aberto.';
        return;
    } if (state.account?.school_id !== state.campaign.school_id) {
        state.error = 'Esta conta pertence a outra escola. Saia e entre no contexto correto.';
        return;
    } state.selected = null; state.form = { student: PigeOnline.person(), class_group_id: '', previous_school: '', relationship: 'Responsável legal', notes: '', client_key: PigeOnline.newId() }; state.editing = true; }
    function edit() { state.assistSource = ''; const a = state.selected; if (!a)
        return; const { previous_school, ...student } = a.student_data; state.form = { student: { ...student }, class_group_id: a.class_group_id, previous_school: previous_school || '', relationship: a.relationship, notes: a.notes, client_key: PigeOnline.newId() }; state.editing = true; }
    async function openRecord(id) { state.assistSource = ''; const a = await request('/admissions/' + id); state.selected = a; state.editing = false; state.acceptTerms = false; state.legal = false; state.charges = await request('/admissions/' + id + '/charges'); state.campaign = await request('/admissions/' + id + '/campaign'); state.slug = state.campaign.slug; state.schoolId = state.account?.school_id || state.campaign.school_id; state.documentType = a.document_types[0]?.id || ''; }
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
        return; const a = state.account; state.account = await request('/me', { method: 'PATCH', body: JSON.stringify({ version: a.version, name: a.name, cpf: a.cpf || null, phone: a.phone, address: a.address, whatsapp_opt_in: a.whatsapp_opt_in, ...Object.fromEntries(detailFields.map(([key]) => [key, a[key] || (key === 'birth_date' ? null : '')])) }) }); state.notice = 'Conta atualizada. Inscrições já enviadas e cadastros oficiais não foram alterados; solicite correção à Secretaria.'; }); }
    const detailFields = [["birth_date", "Nascimento"], ["rg", "RG"], ["rg_issuer", "Órgão emissor"], ["birth_certificate", "Certidão"], ["mother_name", "Nome da mãe"], ["father_name", "Nome do pai"], ["postal_code", "CEP"], ["street", "Logradouro"], ["address_number", "Número"], ["address_complement", "Complemento"], ["district", "Bairro"], ["city", "Cidade"], ["state", "UF"], ["country", "País"]];
    const personAssistFields = ['name', 'cpf', 'birth_date', 'phone', 'email', 'address', ...detailFields.map(([key]) => key)];
    async function assistRequest(path, options = {}) { return request(path.replace(/^\/portal/, ''), options); }
    function readAttachment(id, who) {
        if (!state.selected)
            return;
        const source = '/portal/admissions/' + state.selected.id + '/attachments/' + id + '/ocr';
        if (who === 'student') {
            edit();
            state.assistSource = source;
        }
        else {
            state.profileOpen = true;
            state.profileReadSource = source;
            void Vue.nextTick(() => document.getElementById('portal-profile')?.scrollIntoView({ block: 'start' }));
        }
    }
    const editable = () => !state.selected || ['draft', 'changes_requested'].includes(state.selected.status);
    Vue.createApp({ components: { 'assist-panel': PigeAssist.component }, render: PigeRenders.portal, setup() { Vue.onMounted(() => { PigeMFA.init(mfaRequest, afterMFA, logout, true); window.addEventListener('online', () => { state.online = true; }); window.addEventListener('offline', () => { state.online = false; }); if ('serviceWorker' in navigator && window.isSecureContext)
            void navigator.serviceWorker.register('/sw.js').catch(() => { }); void PigeInstitution.load(); void start(); }); return { state, start, visibleCampaigns, selectSchool, assistRequest, personAssistFields, detailFields, readAttachment, mfa: PigeMFA, identity: PigeInstitution.state, run, selectCampaign, login, register, logout, verifyRequest, verifyConfirm, resetRequest, resetConfirm, newAdmission, edit, view, save, fileChange, upload, submit, sendMessage, withdraw, download, paginate, refresh, copy, saveProfile, editable, label: PigeOnline.label, date: PigeOnline.date, money: PigeOnline.money, safeLink: PigeOnline.safeLink }; } }).mount('#portal');
})(PigePortal || (PigePortal = {}));
