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
var PigeSupport;
(function (PigeSupport) {
    PigeSupport.status = Vue.reactive({ error: '' });
    let loadedSource = '', activeContext = '';
    let frame = null;
    let observer = null;
    let viewportTimer;
    let generation = 0;
    function release() {
        observer?.disconnect();
        observer = null;
        if (viewportTimer !== undefined)
            window.clearInterval(viewportTimer);
        viewportTimer = undefined;
        const previous = frame;
        frame = null;
        loadedSource = '';
        // O SDK executa em outro documento. Remover esse contexto encerra seus
        // timers, listeners, iframes e DOM mesmo quando ele não oferece destroy.
        try {
            previous?.contentWindow?.hubSDK?.destroy?.();
        }
        catch { /* Atendimento não bloqueia a aplicação. */ }
        previous?.remove();
    }
    function dispose() { ++generation; activeContext = ''; release(); PigeSupport.status.error = ''; }
    PigeSupport.dispose = dispose;
    function clipWidget(element) {
        if (frame !== element)
            return;
        const doc = element.contentDocument, win = element.contentWindow;
        if (!doc || !win)
            return;
        let left = win.innerWidth, top = win.innerHeight, right = 0, bottom = 0;
        // Recorta o documento do SDK à bolha/painel visível. A área transparente
        // não intercepta cliques, scroll ou campos da página da escola.
        for (const node of Array.from(doc.querySelectorAll('iframe,button,[role="button"],[class*="bubble-holder"],[class*="launcher"]'))) {
            let visible = true;
            for (let ancestor = node; ancestor && ancestor !== doc.documentElement; ancestor = ancestor.parentElement) {
                const css = win.getComputedStyle(ancestor);
                if (css.display === 'none' || css.visibility === 'hidden' || Number(css.opacity) === 0) {
                    visible = false;
                    break;
                }
            }
            if (!visible)
                continue;
            const rect = node.getBoundingClientRect();
            if (rect.width < 2 || rect.height < 2 || rect.right <= 0 || rect.bottom <= 0 || rect.left >= win.innerWidth || rect.top >= win.innerHeight)
                continue;
            left = Math.min(left, Math.max(0, rect.left - 4));
            top = Math.min(top, Math.max(0, rect.top - 4));
            right = Math.max(right, Math.min(win.innerWidth, rect.right + 4));
            bottom = Math.max(bottom, Math.min(win.innerHeight, rect.bottom + 4));
        }
        element.style.clipPath = right > left && bottom > top ? `inset(${top}px ${Math.max(0, win.innerWidth - right)}px ${Math.max(0, win.innerHeight - bottom)}px ${left}px)` : 'inset(100%)';
        element.style.visibility = right > left && bottom > top ? 'visible' : 'hidden';
    }
    async function load(schoolId = '', area = 'login', sessionKey = 'public') {
        const context = [schoolId, area, sessionKey].join('|');
        if (context !== activeContext) {
            release();
            activeContext = context;
        }
        const request = ++generation;
        PigeSupport.status.error = '';
        if (!schoolId && area !== 'login') {
            release();
            return;
        }
        let config = null;
        try {
            const path = schoolId ? '/api/v1/schools/' + encodeURIComponent(schoolId) + '/support-widget?area=' + encodeURIComponent(area) : '/api/v1/support-widget';
            const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store' });
            if (response.ok)
                config = await response.json();
        }
        catch { /* Indisponibilidade do atendimento não bloqueia o formulário. */ }
        if (request !== generation)
            return;
        if (!config?.enabled || !config.base_url || !config.website_token) {
            release();
            return;
        }
        let baseUrl;
        try {
            const url = new URL(config.base_url);
            if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
                throw new Error('URL inválida');
            baseUrl = url.href.replace(/\/+$/, '');
        }
        catch {
            release();
            PigeSupport.status.error = 'Revise o endereço configurado para o atendimento.';
            return;
        }
        const sourceKey = [context, baseUrl, config.website_token, config.position, config.type, config.launcherTitle].join('|');
        if (sourceKey === loadedSource && frame)
            return;
        release();
        const element = document.createElement('iframe');
        element.dataset.pigeSupportFrame = 'true';
        element.title = 'Atendimento da instituição';
        element.tabIndex = -1;
        element.src = 'about:blank';
        element.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;background:transparent;z-index:2147483000;clip-path:inset(100%);visibility:hidden;color-scheme:light;';
        frame = element;
        loadedSource = sourceKey;
        document.body.appendChild(element);
        const doc = element.contentDocument, runtime = element.contentWindow;
        if (!doc || !runtime) {
            release();
            PigeSupport.status.error = 'Não foi possível abrir o atendimento.';
            return;
        }
        doc.documentElement.lang = 'pt-BR';
        doc.documentElement.style.background = 'transparent';
        doc.body.style.cssText = 'margin:0;background:transparent;';
        runtime.hubSettings = { position: config.position || 'left', type: config.type || 'expanded_bubble', launcherTitle: config.launcherTitle || 'Suporte' };
        const sdk = doc.createElement('script');
        sdk.src = baseUrl + '/packs/js/sdk.js';
        sdk.defer = true;
        sdk.async = true;
        sdk.onload = () => {
            if (frame !== element)
                return;
            try {
                if (!runtime.hubSDK?.run)
                    throw new Error('SDK indisponível');
                runtime.hubSDK.run({ websiteToken: config.website_token, baseUrl });
                observer = new MutationObserver(() => clipWidget(element));
                observer.observe(doc.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
                viewportTimer = window.setInterval(() => clipWidget(element), 250);
                clipWidget(element);
            }
            catch {
                PigeSupport.status.error = 'O atendimento não iniciou. Confira a configuração com o administrador.';
                release();
            }
        };
        sdk.onerror = () => { if (frame !== element)
            return; PigeSupport.status.error = 'O atendimento está indisponível. Tente novamente mais tarde.'; release(); };
        doc.head.appendChild(sdk);
    }
    PigeSupport.load = load;
    window.addEventListener('pagehide', dispose);
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
var PigeLearning;
(function (PigeLearning) {
    PigeLearning.component = { props: ['request', 'download', 'rootPath', 'schoolId'], render: PigeRenders.learning, setup(props) {
            const state = Vue.reactive({ busy: false, error: '', students: [], studentId: '', enrollmentId: '', note: '' });
            const base = () => (props.rootPath || '/profile') + '/learning';
            const student = () => state.students.find(s => s.student_id === state.studentId);
            const enrollment = () => student()?.enrollments.find(e => e.enrollment_id === state.enrollmentId);
            function selectStudent() { state.enrollmentId = student()?.enrollments[0]?.enrollment_id || ''; }
            async function run(action) { if (state.busy)
                return; state.busy = true; state.error = ''; try {
                await action();
            }
            catch (e) {
                state.error = e instanceof Error ? e.message : 'Não foi possível carregar o boletim.';
            }
            finally {
                state.busy = false;
            } }
            async function load() { await run(async () => { const data = await props.request(base() + (props.schoolId ? '?school_id=' + encodeURIComponent(props.schoolId) : '')); state.students = data.students; state.note = data.note; if (!student())
                state.studentId = state.students[0]?.student_id || ''; selectStudent(); }); }
            const rows = () => (enrollment()?.subjects || []).flatMap(subject => subject.periods.map(period => ({ ...period, component_name: subject.component_name, diary_id: subject.diary_id })));
            const percent = (value) => value === null || value === undefined ? 'Não apurada' : Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%';
            async function download() { await run(async () => { if (!student() || !enrollment())
                return; await props.download(base() + '/' + encodeURIComponent(state.studentId) + '/report.pdf?enrollment_id=' + encodeURIComponent(state.enrollmentId), 'boletim-' + student().student_number + '.pdf'); }); }
            Vue.onMounted(() => { void load(); });
            return { state, student, enrollment, selectStudent, rows, percent, load, download };
        } };
})(PigeLearning || (PigeLearning = {}));
/** Notícias e agenda com transporte compartilhável entre gestão, portal e página pública. */
var PigeCommunity;
(function (PigeCommunity) {
    const audienceLabels = { public: 'Público — qualquer visitante', authenticated: 'Comunidade escolar autenticada', students: 'Alunos', guardians: 'Pais e responsáveis', teachers: 'Professores' };
    const statusLabels = { draft: 'Rascunho', published: 'Publicado', archived: 'Arquivado' };
    const empty = () => ({ id: '', version: 1, title: '', summary: '', content: '', kind: 'news', audience: 'authenticated', status: 'draft', pinned: false, publish_at: '', expires_at: '', event_start: '', event_end: '', location: '' });
    async function request(path, options = {}) {
        const response = await fetch('/api/v1' + path, { ...options, credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1', ...options.headers } });
        const payload = await response.json();
        if (!response.ok)
            throw new Error(payload.errors?.map((item) => item.message).join(' ') || payload.detail || 'Não foi possível carregar as publicações.');
        return payload;
    }
    PigeCommunity.request = request;
    function date(value, withTime = false) { return value ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Bahia', day: '2-digit', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(new Date(value)) : '—'; }
    function local(value) {
        if (!value)
            return '';
        const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bahia', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value));
        return parts.replace(' ', 'T');
    }
    PigeCommunity.component = { props: ['schoolId', 'permissions', 'publicMode', 'portalMode', 'request', 'compact'], render: PigeRenders.community, setup(props) {
            const s = Vue.reactive({ busy: false, error: '', notice: '', items: [], page: 1, total: 0, q: '', kind: '', status: '', upcoming: false, selected: null, editing: false, discard: false, deleteConfirm: false, initial: '', form: empty() });
            const manage = () => !props.publicMode && !props.portalMode && Boolean(props.permissions?.includes('schools.manage'));
            const endpoint = () => props.portalMode ? '/portal/community-feed' : props.publicMode ? '/public/schools/' + props.schoolId + '/community-feed' : '/schools/' + props.schoolId + (manage() ? '/community-posts' : '/community-feed');
            const transport = (path, options) => (props.request || request)(path, options);
            async function run(action) { if (s.busy)
                return; s.busy = true; s.error = ''; s.notice = ''; try {
                await action();
            }
            catch (error) {
                s.error = error instanceof Error ? error.message : String(error);
            }
            finally {
                s.busy = false;
            } }
            async function load() {
                if (!props.schoolId && !props.portalMode)
                    return;
                const params = new URLSearchParams({ page: String(s.page), page_size: props.compact ? '4' : '12', q: s.q, kind: s.kind, ...(manage() ? { status: s.status } : { upcoming: String(s.upcoming) }) });
                const result = await transport(endpoint() + '?' + params);
                s.items = result.items;
                s.total = result.total;
            }
            async function search() { s.page = 1; await run(load); }
            async function page(delta) { s.page += delta; await run(load); }
            function open(post) { s.selected = post; s.error = ''; }
            function edit(post) {
                s.form = post ? { id: post.id, version: post.version || 1, title: post.title, summary: post.summary, content: post.content, kind: post.kind, audience: post.audience, status: post.status || 'draft', pinned: post.pinned, publish_at: local(post.publish_at), expires_at: local(post.expires_at), event_start: local(post.event_start), event_end: local(post.event_end), location: post.location } : empty();
                s.initial = JSON.stringify(s.form);
                s.editing = true;
                s.discard = false;
                s.deleteConfirm = false;
                s.selected = null;
                s.error = '';
            }
            function closeEditor(force = false) { if (s.busy)
                return; if (!force && JSON.stringify(s.form) !== s.initial) {
                s.discard = true;
                return;
            } s.editing = false; s.discard = false; s.deleteConfirm = false; }
            async function save() {
                await run(async () => {
                    const { id, version, ...form } = s.form;
                    const stamp = (value) => value ? value + ':00-03:00' : null;
                    const payload = { ...form, publish_at: stamp(form.publish_at), expires_at: stamp(form.expires_at), event_start: form.kind === 'event' ? stamp(form.event_start) : null, event_end: form.kind === 'event' ? stamp(form.event_end) : null, location: form.kind === 'event' ? form.location : '', ...(id ? { version } : {}) };
                    await transport('/schools/' + props.schoolId + '/community-posts' + (id ? '/' + id : ''), { method: id ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
                    s.editing = false;
                    await load();
                    s.notice = form.status === 'published' ? (form.publish_at && new Date(payload.publish_at) > new Date() ? 'Publicação agendada.' : 'Publicação disponível para o público selecionado.') : form.status === 'archived' ? 'Publicação arquivada.' : 'Rascunho salvo.';
                });
            }
            async function remove() { await run(async () => { if (!s.deleteConfirm || !s.form.id)
                return; await transport('/schools/' + props.schoolId + '/community-posts/' + s.form.id + '?version=' + s.form.version, { method: 'DELETE' }); s.editing = false; await load(); s.notice = 'Rascunho excluído.'; }); }
            const scheduled = (post) => post.status === 'published' && Boolean(post.publish_at) && new Date(post.publish_at) > new Date();
            const expired = (post) => Boolean(post.expires_at) && new Date(post.expires_at) <= new Date();
            const paragraphs = (value) => value.split(/\n\s*\n/).filter(Boolean);
            Vue.onMounted(() => { void run(load); });
            return { s, props, manage, run, load, search, page, open, edit, closeEditor, save, remove, date, audienceLabels, statusLabels, scheduled, expired, paragraphs };
        } };
})(PigeCommunity || (PigeCommunity = {}));
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
/** Câmera compartilhada: quadro inteiro, resolução do sensor e confirmação local. */
var PigeCamera;
(function (PigeCamera) {
    let counter = 0;
    PigeCamera.component = {
        props: { mode: { type: String, default: 'document' }, contextKey: { type: String, default: '' }, title: { type: String, default: '' }, maxBytes: { type: Number, default: 10485760 }, filename: { type: String, default: '' } },
        emits: ['captured', 'close'], render: PigeRenders.camera,
        setup(props, { emit }) {
            const id = 'capture-' + (++counter);
            const s = Vue.reactive({ busy: false, ready: false, error: '', notice: '', preview: '', facing: props.mode === 'portrait' ? 'user' : 'environment', deviceId: '', devices: [], width: 0, height: 0, zoom: 1, zoomMin: 1, zoomMax: 1, zoomStep: .1, torch: false, hasTorch: false, guideWidth: 0, guideHeight: 0 });
            let stream = null, photo = null, epoch = 0, disposed = false;
            let opener = null, previousOverflow = '', observer = null;
            const title = () => props.title || (props.mode === 'portrait' ? 'Fotografar pessoa' : 'Fotografar documento');
            function video() { return document.getElementById(id + '-video'); }
            function updateFrame() { const v = video(); if (!v?.videoWidth || !v.videoHeight)
                return; s.width = v.videoWidth; s.height = v.videoHeight; const scale = Math.min(v.clientWidth / v.videoWidth, v.clientHeight / v.videoHeight), width = v.videoWidth * scale, height = v.videoHeight * scale; s.guideHeight = height * .84; s.guideWidth = props.mode === 'portrait' ? Math.min(width * .62, s.guideHeight * .72) : width * .88; }
            function stopStream() { stream?.getTracks().forEach(t => t.stop()); stream = null; const v = video(); if (v)
                v.srcObject = null; s.ready = false; s.torch = false; s.hasTorch = false; }
            function clearPhoto() { if (s.preview)
                URL.revokeObjectURL(s.preview); s.preview = ''; photo = null; }
            function message(error) {
                const name = error instanceof DOMException ? error.name : error?.name || '';
                if (name === 'NotAllowedError' || name === 'PermissionDeniedError')
                    return 'A câmera não foi autorizada. Libere a permissão do navegador e tente novamente, ou escolha um arquivo.';
                if (name === 'NotFoundError' || name === 'DevicesNotFoundError')
                    return 'Nenhuma câmera foi encontrada neste dispositivo. Conecte uma câmera ou escolha um arquivo.';
                if (name === 'NotReadableError' || name === 'TrackStartError')
                    return 'A câmera está ocupada ou indisponível. Feche outros aplicativos que usam a câmera e tente novamente.';
                if (name === 'OverconstrainedError')
                    return 'Esta câmera não aceitou a configuração. Tente outra câmera ou escolha um arquivo.';
                return error instanceof Error ? error.message : 'Não foi possível abrir a câmera. Tente novamente ou escolha um arquivo.';
            }
            async function start() {
                const stamp = ++epoch;
                observer?.disconnect();
                stopStream();
                clearPhoto();
                s.busy = true;
                s.error = '';
                s.notice = '';
                s.width = 0;
                s.height = 0;
                try {
                    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
                        throw new Error('Para usar a câmera, abra a aplicação por HTTPS. Você também pode escolher um arquivo do dispositivo.');
                    const constraints = { width: { ideal: 3840 }, height: { ideal: 2160 }, ...(s.deviceId ? { deviceId: { exact: s.deviceId } } : { facingMode: { ideal: s.facing } }) };
                    const acquired = await navigator.mediaDevices.getUserMedia({ audio: false, video: constraints });
                    if (disposed || stamp !== epoch) {
                        acquired.getTracks().forEach(t => t.stop());
                        return;
                    }
                    stream = acquired;
                    const track = acquired.getVideoTracks()[0];
                    if (!track)
                        throw new Error('Não foi possível receber a imagem desta câmera.');
                    track.addEventListener('ended', () => { if (stream === acquired) {
                        s.ready = false;
                        s.error = 'A câmera foi desconectada. Tente novamente ou escolha um arquivo.';
                    } });
                    const capabilities = track.getCapabilities?.();
                    s.zoomMin = capabilities?.zoom?.min ?? 1;
                    s.zoomMax = capabilities?.zoom?.max ?? 1;
                    s.zoomStep = capabilities?.zoom?.step || .1;
                    s.zoom = s.zoomMin;
                    s.hasTorch = Boolean(capabilities?.torch);
                    await Vue.nextTick();
                    const element = video();
                    if (!element)
                        throw new Error('A câmera não está disponível nesta tela.');
                    element.srcObject = acquired;
                    await element.play();
                    if (disposed || stamp !== epoch) {
                        acquired.getTracks().forEach(t => t.stop());
                        return;
                    }
                    s.width = element.videoWidth;
                    s.height = element.videoHeight;
                    s.ready = Boolean(s.width && s.height);
                    updateFrame();
                    observer?.disconnect();
                    observer = new ResizeObserver(updateFrame);
                    observer.observe(element);
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    if (disposed || stamp !== epoch)
                        return;
                    s.devices = devices.filter(d => d.kind === 'videoinput').map((d, index) => ({ id: d.deviceId, label: d.label || 'Câmera ' + (index + 1) }));
                    const settings = track.getSettings();
                    s.deviceId = settings.deviceId || s.deviceId;
                    if (settings.facingMode)
                        s.facing = settings.facingMode;
                }
                catch (error) {
                    if (stamp === epoch && !disposed) {
                        stopStream();
                        s.error = message(error);
                    }
                }
                finally {
                    if (stamp === epoch && !disposed)
                        s.busy = false;
                }
            }
            async function changeCamera() { if (s.busy)
                return; await start(); }
            async function flip() {
                if (s.busy)
                    return;
                if (s.devices.length > 1) {
                    const index = s.devices.findIndex(d => d.id === s.deviceId);
                    s.deviceId = s.devices[(index + 1) % s.devices.length].id;
                }
                else {
                    s.deviceId = '';
                    s.facing = s.facing === 'user' ? 'environment' : 'user';
                }
                await start();
            }
            async function zoom() { const track = stream?.getVideoTracks()[0]; if (!track)
                return; try {
                await track.applyConstraints({ advanced: [{ zoom: Number(s.zoom) }] });
            }
            catch {
                s.notice = 'Esta câmera não permite ajustar a aproximação.';
            } }
            async function torch() { const track = stream?.getVideoTracks()[0]; if (!track || s.busy)
                return; try {
                await track.applyConstraints({ advanced: [{ torch: !s.torch }] });
                s.torch = !s.torch;
            }
            catch {
                s.notice = 'A iluminação não está disponível nesta câmera.';
            } }
            async function encode(source, width, height, turn = false) {
                const canvas = document.createElement('canvas');
                const scale = Math.min(1, Math.sqrt((props.mode === 'portrait' ? 16000000 : 30000000) / (width * height)));
                canvas.width = Math.max(1, Math.floor((turn ? height : width) * scale));
                canvas.height = Math.max(1, Math.floor((turn ? width : height) * scale));
                const context = canvas.getContext('2d');
                if (!context)
                    throw new Error('Não foi possível preparar a fotografia.');
                if (turn) {
                    context.translate(canvas.width, 0);
                    context.rotate(Math.PI / 2);
                    context.drawImage(source, 0, 0, canvas.height, canvas.width);
                }
                else
                    context.drawImage(source, 0, 0, canvas.width, canvas.height);
                const limit = Math.max(131072, props.maxBytes);
                let quality = .94;
                for (let attempt = 0; attempt < 12; attempt++) {
                    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
                    if (!blob)
                        throw new Error('Não foi possível preparar a fotografia. Tente novamente.');
                    if (blob.size <= limit) {
                        s.width = canvas.width;
                        s.height = canvas.height;
                        const prefix = (props.filename || (props.mode === 'portrait' ? 'foto' : 'documento')).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60) || 'captura';
                        const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
                        return new File([blob], prefix + '-' + stamp + '.jpg', { type: 'image/jpeg' });
                    }
                    if (quality > .78) {
                        quality -= .08;
                        continue;
                    }
                    const copy = document.createElement('canvas');
                    copy.width = Math.max(1, Math.floor(canvas.width * .82));
                    copy.height = Math.max(1, Math.floor(canvas.height * .82));
                    copy.getContext('2d').drawImage(canvas, 0, 0, copy.width, copy.height);
                    canvas.width = copy.width;
                    canvas.height = copy.height;
                    context.drawImage(copy, 0, 0);
                    quality = .9;
                }
                throw new Error('A fotografia ficou muito grande. Escolha uma imagem menor.');
            }
            async function fromBlob(blob, turn = false) { const url = URL.createObjectURL(blob); try {
                const image = new Image();
                image.src = url;
                await image.decode();
                return await encode(image, image.naturalWidth, image.naturalHeight, turn);
            }
            finally {
                URL.revokeObjectURL(url);
            } }
            async function capture() {
                if (s.busy || !s.ready)
                    return;
                const element = video(), track = stream?.getVideoTracks()[0];
                if (!element?.videoWidth || !track)
                    return;
                s.busy = true;
                s.error = '';
                const stamp = epoch;
                try {
                    let result = null;
                    const Photo = window.ImageCapture;
                    if (Photo) {
                        try {
                            result = await fromBlob(await new Photo(track).takePhoto());
                        }
                        catch { /* Alguns navegadores só oferecem captura do fluxo. */ }
                    }
                    if (!result)
                        result = await encode(element, element.videoWidth, element.videoHeight);
                    if (disposed || stamp !== epoch)
                        return;
                    stopStream();
                    clearPhoto();
                    photo = result;
                    s.preview = URL.createObjectURL(result);
                    await Vue.nextTick();
                    document.getElementById(id + '-confirm')?.focus();
                }
                catch (error) {
                    if (!disposed && stamp === epoch)
                        s.error = message(error);
                }
                finally {
                    if (!disposed && stamp === epoch)
                        s.busy = false;
                }
            }
            async function rotate() { if (!photo || s.busy)
                return; s.busy = true; s.error = ''; const stamp = epoch; try {
                const rotated = await fromBlob(photo, true);
                if (disposed || stamp !== epoch)
                    return;
                clearPhoto();
                photo = rotated;
                s.preview = URL.createObjectURL(rotated);
            }
            catch (error) {
                if (!disposed && stamp === epoch)
                    s.error = message(error);
            }
            finally {
                if (!disposed && stamp === epoch)
                    s.busy = false;
            } }
            async function choose(event) { const input = event.target; const selected = input.files?.[0]; input.value = ''; if (!selected || s.busy)
                return; const stamp = ++epoch; stopStream(); s.busy = true; s.error = ''; try {
                if (selected.size > 30 * 1024 * 1024)
                    throw new Error('Escolha uma fotografia de até 30 MB.');
                if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type))
                    throw new Error('Escolha uma fotografia em JPG, PNG ou WebP.');
                const normalized = await fromBlob(selected);
                if (disposed || stamp !== epoch)
                    return;
                clearPhoto();
                photo = normalized;
                s.preview = URL.createObjectURL(normalized);
            }
            catch (error) {
                if (stamp === epoch && !disposed)
                    s.error = message(error);
            }
            finally {
                if (stamp === epoch && !disposed)
                    s.busy = false;
            } }
            function close() { ++epoch; stopStream(); clearPhoto(); emit('close'); }
            function confirm() { if (!photo || s.busy)
                return; const accepted = photo; ++epoch; stopStream(); clearPhoto(); emit('captured', accepted); emit('close'); }
            function key(event) {
                const dialog = document.getElementById(id);
                if (!dialog)
                    return;
                if (event.key === 'Escape') {
                    event.preventDefault();
                    close();
                    return;
                }
                if (event.key !== 'Tab')
                    return;
                const buttons = Array.from(dialog.querySelectorAll('button,input,select,[tabindex="0"]')).filter(x => !x.matches(':disabled') && x.getClientRects().length);
                const first = buttons[0], last = buttons.at(-1);
                if (!first) {
                    event.preventDefault();
                    return;
                }
                if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
                    event.preventDefault();
                    last?.focus();
                }
                else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
                    event.preventDefault();
                    first.focus();
                }
            }
            function hidden() { if (document.hidden && stream) {
                ++epoch;
                stopStream();
                s.busy = false;
                s.error = 'A câmera foi pausada ao sair da aplicação. Toque em Tentar novamente para continuar.';
            } }
            Vue.onMounted(() => { opener = document.activeElement instanceof HTMLElement ? document.activeElement : null; previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; document.addEventListener('keydown', key); document.addEventListener('visibilitychange', hidden); void start(); void Vue.nextTick(() => document.getElementById(id + '-title')?.focus()); });
            Vue.onUnmounted(() => { disposed = true; ++epoch; observer?.disconnect(); stopStream(); clearPhoto(); document.removeEventListener('keydown', key); document.removeEventListener('visibilitychange', hidden); document.body.style.overflow = previousOverflow; if (opener?.isConnected)
                opener.focus({ preventScroll: true }); });
            Vue.watch(() => props.contextKey, () => close());
            return { s, id, props, title, start, flip, changeCamera, zoom, torch, capture, rotate, choose, confirm, close };
        }
    };
})(PigeCamera || (PigeCamera = {}));
/** Reutilizável em cadastros/portal. Sugere campos; não salva nem autoriza documentos. */
var PigeAssist;
(function (PigeAssist) {
    let instance = 0;
    const labels = { name: 'Nome / razão social', trade_name: 'Nome fantasia', cpf: 'CPF', cnpj: 'CNPJ', document: 'Documento', birth_date: 'Nascimento', birth_certificate: 'Certidão', rg: 'RG', rg_issuer: 'Órgão emissor', mother_name: 'Nome da mãe', father_name: 'Nome do pai', birth_city: 'Naturalidade', nationality: 'Nacionalidade', postal_code: 'CEP', street: 'Logradouro', address: 'Endereço completo', address_number: 'Número', address_complement: 'Complemento', district: 'Bairro', city: 'Cidade', state: 'UF', country: 'País', email: 'E-mail', phone: 'Telefone', registration_status: 'Situação cadastral', opened_on: 'Abertura', legal_nature: 'Natureza jurídica', main_activity: 'Atividade principal' };
    PigeAssist.component = {
        props: { target: { type: Object, required: true }, fields: { type: Array, default: () => [] }, request: { type: Function, required: true }, root: { type: String, required: true }, lookupRoot: { type: String, default: '' }, ocr: { type: Boolean, default: true }, cnpj: { type: Boolean, default: false }, cep: { type: Boolean, default: true }, mapping: { type: Object, default: () => ({}) }, label: { type: String, default: 'este cadastro' }, source: { type: String, default: '' } },
        components: { 'camera-capture': PigeCamera.component }, emits: ['applied'], render: PigeRenders.assist,
        setup(props, { emit }) {
            const id = 'assist-' + (++instance);
            const s = Vue.reactive({ open: false, busy: false, error: '', notice: '', purpose: 'identity', fileName: '', preview: '', camera: false,
                status: '', jobId: '', rows: [], text: '', warnings: [], source: '', query: '', kind: '', confirmed: false });
            let file = null, sequence = 0, disposed = false, timer = null;
            const targetField = (key) => props.mapping[key] || key;
            const fields = () => new Set(props.fields.length ? props.fields : Object.keys(props.target));
            function stopCamera() { s.camera = false; }
            function clearPreview() { if (s.preview)
                URL.revokeObjectURL(s.preview); s.preview = ''; }
            function resetResult() { s.rows = []; s.text = ''; s.warnings = []; s.source = ''; s.confirmed = false; s.error = ''; s.notice = ''; }
            function proposals(result) {
                const allowed = fields();
                s.text = result.text;
                s.warnings = result.warnings;
                s.rows = result.suggestions.filter(r => allowed.has(targetField(r.field))).map(r => ({ ...r, targetField: targetField(r.field), before: props.target[targetField(r.field)], checked: !props.target[targetField(r.field)] }));
                s.status = s.rows.length ? 'Leitura concluída' : 'Documento precisa de uma nova leitura';
                s.notice = s.rows.length ? s.rows.length + ' campo(s) identificado(s). Confira os valores antes de aplicar.' : 'Não foi possível identificar campos com segurança para esta ficha. Envie o PDF original ou uma foto mais próxima, sem cortes e reflexos.';
            }
            function selectFile(e) { const input = e.target; file = input.files?.[0] || null; input.value = ''; clearPreview(); resetResult(); s.fileName = file?.name || ''; if (file?.type.startsWith('image/'))
                s.preview = URL.createObjectURL(file); if (file)
                void analyze(); }
            function camera() { if (s.busy)
                return; s.open = true; s.error = ''; s.camera = true; }
            function captured(value) { file = value; clearPreview(); resetResult(); s.fileName = value.name; s.preview = URL.createObjectURL(value); s.camera = false; void analyze(); }
            async function rotate() {
                if (!file || !s.preview || s.busy)
                    return;
                const stamp = ++sequence;
                resetResult();
                s.status = '';
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
                if (blob && !disposed && stamp === sequence) {
                    file = new File([blob], 'documento-rotacionado.jpg', { type: 'image/jpeg' });
                    clearPreview();
                    s.preview = URL.createObjectURL(blob);
                    s.fileName = file.name;
                }
            }
            async function poll(job, stamp, owner, started, root) {
                if (disposed || stamp !== sequence || owner !== props.target || root !== props.root)
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
                    const errors = { pdf_page_limit: 'Envie um PDF sem senha com até 5 páginas.', image_too_small: 'A imagem é pequena demais. Envie o original ou uma foto mais próxima.', image_too_large: 'A imagem excede o tamanho permitido. Envie uma versão de até 30 megapixels.', active_pdf: 'Este PDF contém conteúdo interativo não permitido. Envie uma cópia simples.', processing_timeout: 'A leitura excedeu o tempo disponível. Tente separar as páginas.', FileNotFoundError: 'O serviço de leitura está indisponível. Entre em contato com a administração.', TimeoutExpired: 'Não foi possível concluir a leitura. Tente separar as páginas.' };
                    s.error = errors[job.error_code] || 'Não foi possível ler o documento. Envie outro arquivo ou preencha manualmente.';
                    return;
                }
                if (Date.now() - started > 180000) {
                    s.busy = false;
                    s.error = 'A leitura ainda não terminou. Tente novamente em instantes ou avise a administração. Você pode continuar preenchendo manualmente.';
                    return;
                }
                timer = setTimeout(async () => { try {
                    const next = await props.request(root + '/ocr/jobs/' + job.id);
                    await poll(next, stamp, owner, started, root);
                }
                catch (e) {
                    if (stamp === sequence && root === props.root) {
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
                s.status = 'Enviando documento para leitura…';
                s.open = true;
                const stamp = ++sequence, owner = props.target, root = props.root;
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
                    await poll(job, stamp, owner, Date.now(), root);
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
                const root = props.root;
                try {
                    const result = await props.request((props.lookupRoot || props.root) + '/lookups/' + kind, { method: 'POST', body: JSON.stringify({ value: query }) });
                    if (disposed || stamp !== sequence || owner !== props.target || query !== s.query || root !== props.root)
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
            function resetContext() { ++sequence; if (timer)
                clearTimeout(timer); stopCamera(); resetResult(); clearPreview(); file = null; s.jobId = ''; s.fileName = ''; s.busy = false; s.open = false; s.status = ''; }
            Vue.watch(() => props.root, resetContext);
            Vue.watch(() => props.target, resetContext);
            Vue.watch(() => s.purpose, () => { resetResult(); s.status = ''; });
            Vue.onMounted(() => { if (props.source) {
                s.open = true;
                void analyze();
            } });
            return { s, id, props, labels, selectFile, camera, captured, rotate, stopCamera, openDocument, analyze, cancel, openLookup, lookup, apply };
        }
    };
})(PigeAssist || (PigeAssist = {}));
var PigePortal;
(function (PigePortal) {
    const state = Vue.reactive({ schools: [], schoolId: new URLSearchParams(location.search).get('school') || '', catalogFailed: false, assistSource: '', profileReadSource: '', profileOpen: false, ready: false, busy: false, section: 'admissions', step: 0, diaryError: '', error: '', notice: '', online: navigator.onLine, diaryConsent: { version: '', text: '' }, diaryConsentAccepted: false, diaryAccess: { consent_version: '', consent_required: false, eligible_student_count: 0, eligible_students: [], students: [] }, diaryCommunications: [], registrationTerms: { version: '', text: '' }, account: null, campaign: null, campaigns: [], slug: new URLSearchParams(location.search).get('campaign') || '', mode: 'login', registerPurpose: 'admission', rows: [], total: 0, page: 1, selected: null, editing: false, charges: [], code: '', verifyChannel: 'email', message: '', documentType: '', acceptTerms: false, legal: false, register: { name: '', email: '', password: '', cpf: '', phone: '', address: '', accept_privacy: false, whatsapp_opt_in: false }, login: { email: '', password: '' }, reset: { email: '', code: '', password: '' }, form: { student: PigeOnline.person(), class_group_id: '', previous_school: '', relationship: 'Responsável legal', notes: '', client_key: PigeOnline.newId() } });
    let supportContext = '';
    function syncSupport() {
        const area = state.account && state.section !== 'admissions' ? 'guardian_portal' : 'online_enrollment';
        const key = [state.schoolId, area, state.account?.id || 'public'].join('|');
        if (!state.ready || key === supportContext)
            return;
        supportContext = key;
        void PigeSupport.load(state.schoolId, area, state.account?.id || 'public');
    }
    let selectedFile = null;
    let signedContractFile = null;
    const signing = Vue.reactive({ method: '', password: '', fileName: '', consent: false, pending: false, sessionId: '', admissionId: '', integrated: false });
    let personalCertificate = null, signingPopup = null, signingTimer;
    function resetSigning() { personalCertificate = null; signing.password = ''; signing.fileName = ''; signing.consent = false; }
    function personalCertificateChange(event) { personalCertificate = event.target.files?.[0] || null; signing.fileName = personalCertificate?.name || ''; }
    async function loadSigningMethods() { if (!state.selected?.contract?.issued_document_id)
        return; const result = await request('/signing/methods'); signing.integrated = result.govbr_integrated; }
    async function signPersonalA1() {
        await run(async () => {
            const a = state.selected, file = personalCertificate, password = signing.password;
            try {
                if (!a?.contract?.issued_document_id || !file || !signing.consent)
                    throw new Error('Selecione seu certificado e autorize a assinatura do contrato.');
                if (!/\.(pfx|p12)$/i.test(file.name) || file.size > 1024 * 1024 || !password)
                    throw new Error('Informe um certificado A1 PFX/P12 de até 1 MB e sua senha.');
                const data = new FormData();
                data.set('file', file);
                data.set('password', password);
                data.set('consent', 'true');
                await request('/admissions/' + a.id + '/issued/' + a.contract.issued_document_id + '/sign-a1', { method: 'POST', body: data });
                await openRecord(a.id);
                state.notice = 'Contrato assinado e enviado para conferência da escola.';
            }
            finally {
                resetSigning();
                const input = document.getElementById('personal-a1');
                if (input)
                    input.value = '';
            }
        });
    }
    async function checkSigning() {
        if (!signing.sessionId || !signing.pending)
            return;
        try {
            const result = await request('/signing/sessions/' + signing.sessionId);
            if (['completed', 'failed', 'expired'].includes(result.status)) {
                signing.pending = false;
                if (signingTimer)
                    window.clearInterval(signingTimer);
                signingTimer = undefined;
                const id = signing.admissionId;
                if (result.status === 'completed') {
                    if (id)
                        await openRecord(id);
                    state.notice = result.message;
                    signingPopup?.close();
                }
                else {
                    state.error = result.message || 'A solicitação expirou. Inicie a assinatura novamente.';
                }
            }
        }
        catch (error) {
            signing.pending = false;
            if (signingTimer)
                window.clearInterval(signingTimer);
            signingTimer = undefined;
            state.error = error instanceof Error ? error.message : String(error);
        }
    }
    async function signGovbr() {
        if (!signing.consent) {
            state.error = 'Confirme a leitura e a assinatura do contrato.';
            return;
        }
        const popup = window.open(signing.integrated ? 'about:blank' : 'https://assinador.iti.br/', 'pige-signature-govbr', 'popup,width=560,height=760');
        if (!popup) {
            state.error = 'Permita a abertura da janela de assinatura no navegador e tente novamente.';
            return;
        }
        signingPopup = popup;
        if (!signing.integrated) {
            popup.opener = null;
            state.notice = 'Após assinar no GOV.BR, envie o PDF assinado neste formulário.';
            return;
        }
        await run(async () => {
            try {
                const a = state.selected;
                if (!a?.contract?.issued_document_id)
                    throw new Error('Contrato indisponível.');
                const data = new FormData();
                data.set('consent', 'true');
                const result = await request('/admissions/' + a.id + '/issued/' + a.contract.issued_document_id + '/sign-govbr', { method: 'POST', body: data });
                const authorization = new URL(result.authorization_url);
                if (authorization.protocol !== 'https:' || !['sso.acesso.gov.br', 'sso.staging.acesso.gov.br'].includes(authorization.hostname))
                    throw new Error('Endereço de autorização inválido.');
                signing.sessionId = result.session_id;
                signing.admissionId = a.id;
                signing.pending = true;
                popup.location.replace(result.authorization_url);
                if (signingTimer)
                    window.clearInterval(signingTimer);
                signingTimer = window.setInterval(() => { void checkSigning(); }, 3000);
            }
            catch (error) {
                popup.close();
                throw error;
            }
        });
    }
    window.addEventListener('message', (event) => { if (event.origin === location.origin && event.source === signingPopup && event.data?.type === 'pige-signature-return')
        void checkSigning(); });
    window.addEventListener('pagehide', () => { resetSigning(); if (signingTimer)
        window.clearInterval(signingTimer); });
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
            const error = new Error((value.errors?.map(x => friendlyField(x.field) + ': ' + x.message.replace(/^Value error, /, '')).join('\n') || (typeof value.detail === 'string' ? value.detail : '') || 'Não foi possível concluir. Tente novamente.') + (ref ? ' · Referência: ' + ref : ''));
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
        syncSupport();
        if (state.error)
            focusError();
    } }
    async function loadList() { const data = await request('/admissions?page=' + state.page); state.rows = data.items; state.total = data.total; }
    async function loadRegistrationTerms() { if (!state.schoolId)
        return; state.registrationTerms = await request('/registration-terms?school_id=' + encodeURIComponent(state.schoolId)); }
    async function openRegistration() { state.mode = 'register'; state.registerPurpose = state.campaign?.accepting ? 'admission' : 'portal'; state.register.accept_privacy = false; state.error = ''; if (state.registerPurpose === 'portal')
        await run(loadRegistrationTerms); }
    async function chooseRegistrationPurpose(purpose) { state.registerPurpose = purpose; state.register.accept_privacy = false; if (purpose === 'portal')
        await run(loadRegistrationTerms); }
    async function loadDiaryPortal() {
        state.diaryError = '';
        try {
            const [consent, access] = await Promise.all([request('/diary/access-consent'), request('/diary/access')]);
            if (consent.version !== state.diaryConsent.version || consent.text !== state.diaryConsent.text || JSON.stringify(access.eligible_students) !== JSON.stringify(state.diaryAccess.eligible_students))
                state.diaryConsentAccepted = false;
            state.diaryConsent = consent;
            state.diaryAccess = access;
            state.diaryCommunications = access.students.length ? await request('/diary/communications') : [];
        }
        catch (e) {
            state.diaryError = e instanceof Error ? e.message : 'Não foi possível carregar o Diário. Tente novamente.';
        }
    }
    async function activateDiaryAccess() { await run(async () => { if (!state.diaryConsentAccepted)
        throw new Error('Leia e confirme a autorização para ativar o acesso.'); state.diaryAccess = await post('/diary/access', { accepted: true, consent_version: state.diaryConsent.version, student_ids: state.diaryAccess.eligible_students.map(student => student.student_id) }); state.diaryConsentAccepted = false; await loadDiaryPortal(); state.notice = 'Acesso ao Diário atualizado.'; }); }
    async function revokeDiaryAccess(studentId) { await run(async () => { await post('/diary/access/' + encodeURIComponent(studentId) + '/revoke', {}); state.diaryConsentAccepted = false; await loadDiaryPortal(); state.notice = 'Acesso ao Diário revogado.'; }); }
    async function markDiaryCommunicationRead(id) { await run(async () => { await post('/diary/communications/' + encodeURIComponent(id) + '/read', {}); await loadDiaryPortal(); }); }
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
                if (state.schoolId)
                    await loadRegistrationTerms();
            }
            catch (e) {
                state.catalogFailed = true;
                state.error = e instanceof Error ? e.message : 'Não foi possível carregar o portal.';
            }
            try {
                state.account = await request('/me');
                state.schoolId = state.account.school_id;
                await loadList();
                await loadDiaryPortal();
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
        syncSupport();
    }
    async function selectSchool() { PigeSupport.dispose(); supportContext = ''; await run(async () => { state.slug = ''; state.campaign = null; state.register.accept_privacy = false; const rows = visibleCampaigns(); if (rows.length === 1) {
        state.slug = rows[0].slug;
        await loadCampaign();
    }
    else
        history.replaceState({}, '', '/online.html?school=' + encodeURIComponent(state.schoolId)); await loadRegistrationTerms(); }); }
    async function selectCampaign() { PigeSupport.dispose(); supportContext = ''; await run(async () => { state.selected = null; state.editing = false; state.register.accept_privacy = false; await loadCampaign(); }); }
    async function afterMFA(result) { state.account = result; state.schoolId = state.account.school_id; state.page = 1; state.section = 'admissions'; if (state.campaign?.school_id !== state.schoolId) {
        state.campaign = null;
        state.slug = '';
        const rows = visibleCampaigns();
        if (rows.length === 1) {
            state.slug = rows[0].slug;
            await loadCampaign();
        }
    } await loadList(); await loadDiaryPortal(); }
    async function mfaRequest(path, options = {}) { const headers = new Headers(options.headers); headers.set('X-CSRF-Protection', '1'); if (options.body)
        headers.set('Content-Type', 'application/json'); const r = await fetch('/api/v1' + path, { ...options, headers, credentials: 'same-origin', cache: 'no-store' }); const data = await r.json(); if (!r.ok)
        throw new Error(data.detail || 'Não foi possível confirmar a autenticação.'); return data; }
    async function login() { await run(async () => { if (!state.schoolId)
        throw new Error('Selecione a unidade para acessar sua conta.'); const result = await post('/login', { ...state.login, ...authContext() }); state.login.password = ''; if (await PigeMFA.accept(result))
        return; await afterMFA(result); }); }
    async function register() {
        await run(async () => {
            let result;
            validateContact(state.register);
            if (state.registerPurpose === 'admission') {
                const campaign = state.campaign;
                if (!campaign?.accepting)
                    throw new Error('Selecione um processo de matrícula aberto.');
                result = await post('/register', { ...state.register, cpf: state.register.cpf || null, campaign_slug: state.slug, terms_version: campaign.terms_version });
            }
            else {
                if (!state.registrationTerms.version)
                    throw new Error('Atualize o aviso de privacidade antes de criar a conta.');
                result = await post('/account/register', { ...state.register, school_id: state.schoolId, terms_version: state.registrationTerms.version });
            }
            state.register.password = '';
            if (await PigeMFA.accept(result))
                return;
            await afterMFA(result);
            state.notice = 'Conta criada. Confirme um contato para validar o vínculo com o cadastro escolar.';
        });
    }
    async function logout() { PigeSupport.dispose(); supportContext = ''; state.assistSource = ''; state.profileReadSource = ''; state.profileOpen = false; await run(async () => { await post('/logout', {}); state.account = null; state.rows = []; state.diaryAccess = { consent_version: '', consent_required: false, eligible_student_count: 0, eligible_students: [], students: [] }; state.diaryCommunications = []; state.diaryConsentAccepted = false; state.selected = null; state.charges = []; state.editing = false; state.register = { name: '', email: '', password: '', cpf: '', phone: '', address: '', accept_privacy: false, whatsapp_opt_in: false }; state.login.password = ''; state.form.student = PigeOnline.person(); resetSigning(); if (signingTimer)
        window.clearInterval(signingTimer); }); if (!state.account && signing.sessionId)
        location.assign('/api/v1/portal/signing/govbr/logout'); }
    async function verifyRequest() { await run(async () => { await post('/verification/request', { channel: state.verifyChannel }); state.notice = 'Código solicitado. Confira seu e-mail ou WhatsApp. O código vale por 10 minutos.'; }); }
    async function verifyConfirm() { await run(async () => { state.account = await post('/verification/confirm', { code: state.code }); state.code = ''; await loadDiaryPortal(); state.notice = 'Contato confirmado.'; }); }
    async function resetRequest() { await run(async () => { await post('/password/request', { email: state.reset.email, ...authContext() }); state.notice = 'Caso exista uma conta elegível, o código será enviado ao e-mail informado.'; }); }
    async function resetConfirm() { await run(async () => { await post('/password/confirm', { ...state.reset, ...authContext() }); state.reset.password = ''; state.reset.code = ''; state.mode = 'login'; state.notice = 'Senha redefinida. Entre novamente.'; }); }
    function newAdmission() { state.assistSource = ''; state.error = ''; state.notice = ''; state.step = 0; state.section = 'admissions'; syncSupport(); selectedFile = null; if (!state.campaign || !state.campaign.accepting) {
        state.error = 'Selecione um processo aberto.';
        return;
    } if (state.account?.school_id !== state.campaign.school_id) {
        state.error = 'Esta conta pertence a outra escola. Entre com a conta da unidade escolhida.';
        return;
    } state.selected = null; state.form = { student: PigeOnline.person(), class_group_id: '', previous_school: '', relationship: 'Responsável legal', notes: '', client_key: PigeOnline.newId() }; state.editing = true; }
    function edit() { state.assistSource = ''; state.step = 0; state.section = 'admissions'; syncSupport(); selectedFile = null; const a = state.selected; if (!a)
        return; const { previous_school, ...student } = a.student_data; state.form = { student: { ...student }, class_group_id: a.class_group_id, previous_school: previous_school || '', relationship: a.relationship, notes: a.notes, client_key: PigeOnline.newId() }; state.editing = true; }
    async function openRecord(id) { state.assistSource = ''; selectedFile = null; signedContractFile = null; const a = await request('/admissions/' + id); state.selected = a; state.editing = false; state.acceptTerms = false; state.legal = false; state.charges = await request('/admissions/' + id + '/charges'); state.campaign = await request('/admissions/' + id + '/campaign'); state.slug = state.campaign.slug; state.schoolId = state.account?.school_id || state.campaign.school_id; state.documentType = a.document_types.find(d => !a.attachments.some(f => f.document_type_id === d.id && f.review_status !== 'rejected'))?.id || a.document_types[0]?.id || ''; resetSigning(); await loadSigningMethods(); }
    async function view(id) { await run(() => openRecord(id)); }
    async function backToAdmissions() { await run(async () => { state.selected = null; state.editing = false; selectedFile = null; signedContractFile = null; state.assistSource = ''; if (!state.campaign?.accepting) {
        state.campaign = null;
        state.slug = '';
        const campaigns = visibleCampaigns();
        if (campaigns.length === 1) {
            state.slug = campaigns[0].slug;
            await loadCampaign();
        }
    } }); }
    async function save() { await run(async () => { if (!state.campaign)
        throw new Error('Selecione um processo.'); const issue = studentIssue(true); if (issue) {
        state.step = issue.step;
        throw new Error(issue.message);
    } const a = state.selected; const { client_key, ...data } = state.form; const body = { ...data, student: { ...data.student, cpf: data.student.cpf || null } }; const result = a ? await request('/admissions/' + a.id, { method: 'PATCH', body: JSON.stringify({ ...body, version: a.version }) }) : await post('/admissions', { ...body, campaign_id: state.campaign.id, client_key }); await openRecord(result.id); await loadList(); state.notice = 'Dados salvos. Confira os documentos e conclua o envio para a escola.'; }); }
    function fileChange(e) { selectedFile = e.target.files?.[0] || null; }
    function signedContractChange(e) { signedContractFile = e.target.files?.[0] || null; }
    async function uploadSignedContract() {
        await run(async () => {
            const a = state.selected;
            const contract = a?.contract;
            if (!a || !contract?.issued_document_id || !signedContractFile)
                throw new Error('Selecione o contrato em PDF assinado pelo responsável.');
            if (signedContractFile.type !== 'application/pdf' || !signedContractFile.name.toLowerCase().endsWith('.pdf'))
                throw new Error('Envie o PDF assinado, sem imprimir nem converter em imagem.');
            const form = new FormData();
            form.set('file', signedContractFile);
            await request('/admissions/' + a.id + '/issued/' + contract.issued_document_id + '/external-signature', { method: 'POST', body: form });
            await openRecord(a.id);
            await loadList();
            state.notice = 'Contrato recebido. A Secretaria verificará as assinaturas antes de efetivar a matrícula.';
        });
    }
    async function upload() { await run(async () => { const a = state.selected; if (!a || !selectedFile || !state.documentType)
        throw new Error('Selecione o tipo e um arquivo PDF, PNG ou JPEG.'); if (!/\.(pdf|png|jpe?g)$/i.test(selectedFile.name))
        throw new Error('Escolha um arquivo PDF, PNG ou JPEG.'); if (!selectedFile.size)
        throw new Error('O arquivo está vazio. Selecione outro documento.'); const data = new FormData(); data.set('version', String(a.version)); data.set('document_type_id', state.documentType); data.set('file', selectedFile); await request('/admissions/' + a.id + '/attachments', { method: 'POST', body: data }); selectedFile = null; await openRecord(a.id); state.notice = 'Documento enviado para conferência.'; }); }
    async function submit() { await run(async () => { const a = state.selected; if (!a || !state.campaign)
        return; if (submissionIssues().length)
        throw new Error(submissionIssues().join('\n')); await post('/admissions/' + a.id + '/submit', { version: a.version, accept_terms: state.acceptTerms, legal_responsibility: state.legal, terms_version: state.campaign.terms_version }); await openRecord(a.id); await loadList(); state.notice = 'Inscrição enviada. Acompanhe a análise nesta página.'; }); }
    async function sendMessage() { await run(async () => { if (!state.selected)
        return; await post('/admissions/' + state.selected.id + '/messages', { text: state.message }); state.message = ''; await openRecord(state.selected.id); }); }
    async function withdraw() { await run(async () => { if (!state.selected || state.message.length < 3)
        throw new Error('Descreva o motivo da desistência no campo de mensagem.'); await post('/admissions/' + state.selected.id + '/withdraw', { version: state.selected.version, reason: state.message }); state.message = ''; await openRecord(state.selected.id); await loadList(); }); }
    async function download(path, name) { await run(async () => { const r = await fetch('/api/v1/portal' + path, { credentials: 'same-origin', cache: 'no-store' }); if (!r.ok)
        throw new Error('Não foi possível baixar o documento. Recarregue a página e confira seu acesso.'); const url = URL.createObjectURL(await r.blob()); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000); }); }
    async function paginate(delta) { await run(async () => { const previous = state.page; state.page = Math.max(1, state.page + delta); try {
        await loadList();
    }
    catch (e) {
        state.page = previous;
        throw e;
    } }); }
    async function refresh() { await run(async () => { state.account = await request('/me'); await loadList(); await loadDiaryPortal(); if (state.selected)
        await openRecord(state.selected.id); }); }
    async function copy(value) { await run(async () => { await navigator.clipboard.writeText(value); state.notice = 'Código copiado. Confira o beneficiário antes de pagar.'; }); }
    async function saveProfile() { await run(async () => { if (!state.account)
        return; const a = state.account; validateContact(a); state.account = await request('/me', { method: 'PATCH', body: JSON.stringify({ version: a.version, name: a.name, cpf: a.cpf || null, phone: a.phone, address: a.address, whatsapp_opt_in: a.whatsapp_opt_in, ...Object.fromEntries(detailFields.map(([key]) => [key, a[key] || (key === 'birth_date' ? null : '')])) }) }); await loadDiaryPortal(); state.notice = 'Seus dados de contato foram atualizados.'; }); }
    const detailFields = [["birth_date", "Nascimento"], ["rg", "RG"], ["rg_issuer", "Órgão emissor"], ["birth_certificate", "Certidão"], ["mother_name", "Nome da mãe"], ["father_name", "Nome do pai"], ["postal_code", "CEP"], ["street", "Logradouro"], ["address_number", "Número"], ["address_complement", "Complemento"], ["district", "Bairro"], ["city", "Cidade"], ["state", "UF"], ["country", "País"]];
    const personAssistFields = ['name', 'cpf', 'birth_date', 'phone', 'email', 'address', ...detailFields.map(([key]) => key)];
    async function learningDownload(path, name) { await download(path.replace(/^\/portal/, ''), name); }
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
            state.section = 'account';
            syncSupport();
            state.profileOpen = true;
            state.profileReadSource = source;
            void Vue.nextTick(() => document.getElementById('portal-profile')?.scrollIntoView({ block: 'start' }));
        }
    }
    const formSteps = ['Aluno', 'Turma e endereço', 'Revisão'];
    function friendlyField(field) {
        const names = { name: 'Nome', email: 'E-mail', password: 'Senha', cpf: 'CPF', phone: 'Telefone', birth_date: 'Nascimento', class_group_id: 'Turma', relationship: 'Vínculo com o aluno', accept_privacy: 'Aviso de privacidade', accept_terms: 'Confirmação dos dados', legal_responsibility: 'Responsabilidade legal', terms_version: 'Aviso de privacidade', student: 'Dados do aluno', body: 'Dados informados', code: 'Código', address: 'Endereço' };
        const parts = field.split('.');
        return names[parts[parts.length - 1]] || 'Dados informados';
    }
    function focusError() { void Vue.nextTick(() => { const alert = document.querySelector('#portal-error'); alert?.focus(); alert?.scrollIntoView({ block: 'nearest' }); }); }
    const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bahia', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    function cpfValid(value) {
        const digits = (value || '').replace(/\D/g, '');
        if (!digits)
            return true;
        if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits))
            return false;
        for (const size of [9, 10]) {
            let sum = 0;
            for (let i = 0; i < size; i++)
                sum += Number(digits[i]) * (size + 1 - i);
            const digit = (sum * 10) % 11;
            if (Number(digits[size]) !== (digit === 10 ? 0 : digit))
                return false;
        }
        return true;
    }
    function formatCPF(value) {
        const v = (value || '').replace(/\D/g, '').slice(0, 11);
        return v.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
    }
    function formatPhone(value) {
        let v = value.replace(/\D/g, '');
        if (v.startsWith('55') && (v.length === 12 || v.length === 13))
            v = v.slice(2);
        if (v.length !== 10 && v.length !== 11)
            return value.trim();
        return '(' + v.slice(0, 2) + ') ' + v.slice(2, -4) + '-' + v.slice(-4);
    }
    function validateContact(person) {
        if (!cpfValid(person.cpf))
            throw new Error('Confira o CPF do responsável. Informe os 11 dígitos válidos.');
        let digits = person.phone.replace(/\D/g, '');
        if (digits.length === 10 || digits.length === 11)
            digits = '55' + digits;
        if (digits && !/^\d{12,15}$/.test(digits))
            throw new Error('Confira o telefone. Informe o DDD e o número completo.');
        if (person.whatsapp_opt_in && !digits)
            throw new Error('Informe seu telefone para receber avisos por WhatsApp.');
    }
    function studentIssue(all = false) {
        const student = state.form.student;
        if (student.name.trim().length < 2)
            return { step: 0, message: 'Informe o nome completo do aluno.' };
        if (!student.birth_date || student.birth_date > today())
            return { step: 0, message: 'Informe uma data de nascimento válida, até hoje.' };
        if (!cpfValid(student.cpf))
            return { step: 0, message: 'Confira o CPF do aluno. Se ele não possui CPF, deixe o campo em branco.' };
        if (all || state.step >= 1) {
            if (!state.campaign?.groups.some(g => g.id === state.form.class_group_id))
                return { step: 1, message: 'Selecione a turma pretendida.' };
            if (state.form.relationship.trim().length < 2)
                return { step: 1, message: 'Informe seu vínculo com o aluno.' };
        }
        return null;
    }
    async function nextStep() {
        state.error = '';
        const issue = studentIssue(state.step === 2);
        if (issue) {
            state.error = issue.message;
            state.step = issue.step;
            focusError();
            return;
        }
        if (state.step < 2) {
            state.step++;
            void Vue.nextTick(() => document.querySelector('#admission-step-title')?.focus());
            return;
        }
        await save();
    }
    function selectSection(section) { state.section = section; state.error = ''; state.notice = ''; if (section === 'diary')
        void loadDiaryPortal(); syncSupport(); }
    function useGuardianAddress() {
        const account = state.account;
        if (!account)
            return;
        state.form.student.address = account.address;
        for (const key of ['postal_code', 'street', 'address_number', 'address_complement', 'district', 'city', 'state', 'country'])
            state.form.student[key] = account[key] || '';
    }
    const selectedGroup = () => state.campaign?.groups.find(g => g.id === state.form.class_group_id);
    function documentStatus(id) {
        const file = state.selected?.attachments.find(a => a.document_type_id === id);
        return !file ? 'Pendente' : file.review_status === 'rejected' ? 'Reenviar documento' : file.review_status === 'validated' ? 'Conferido' : 'Enviado para conferência';
    }
    function submissionIssues() {
        const issues = [];
        const campaign = state.campaign;
        const admission = state.selected;
        if (!campaign || !admission)
            return issues;
        if (!campaign.accepting && admission.status !== 'changes_requested')
            issues.push('O prazo de novas inscrições foi encerrado. Consulte a Secretaria.');
        if (campaign.require_verified_contact && !state.account?.email_verified && !state.account?.phone_verified)
            issues.push('Confirme seu e-mail ou telefone em Minha conta.');
        if (campaign.require_documents) {
            const missing = admission.document_types.filter(d => d.required && !admission.attachments.some(a => a.document_type_id === d.id && a.review_status !== 'rejected'));
            if (missing.length)
                issues.push('Envie os documentos obrigatórios: ' + missing.map(d => d.name).join(', ') + '.');
        }
        return issues;
    }
    function progressStep() { const status = state.selected?.status; return status === 'enrolled' ? 4 : status === 'approved' ? 3 : status && ['submitted', 'under_review', 'waitlisted', 'rejected'].includes(status) ? 2 : 1; }
    const editable = () => !state.selected || ['draft', 'changes_requested'].includes(state.selected.status);
    Vue.createApp({ components: { 'assist-panel': PigeAssist.component, 'learning-portal': PigeLearning.component, 'school-community': PigeCommunity.component }, render: PigeRenders.portal, setup() { Vue.onMounted(() => { PigeMFA.init(mfaRequest, afterMFA, logout, true); window.addEventListener('online', () => { state.online = true; }); window.addEventListener('offline', () => { state.online = false; }); if ('serviceWorker' in navigator && window.isSecureContext)
            void navigator.serviceWorker.register('/sw.js').catch(() => { }); void PigeInstitution.load(); void start(); }); return { state, learningDownload, formSteps, today, formatCPF, formatPhone, nextStep, selectSection, useGuardianAddress, selectedGroup, documentStatus, submissionIssues, progressStep, start, visibleCampaigns, selectSchool, assistRequest, personAssistFields, detailFields, readAttachment, mfa: PigeMFA, identity: PigeInstitution.state, run, selectCampaign, login, register, logout, verifyRequest, verifyConfirm, resetRequest, resetConfirm, newAdmission, edit, view, backToAdmissions, save, fileChange, signing, personalCertificateChange, signPersonalA1, signGovbr, signedContractChange, uploadSignedContract, upload, submit, sendMessage, withdraw, download, paginate, refresh, copy, saveProfile, loadRegistrationTerms, openRegistration, chooseRegistrationPurpose, loadDiaryPortal, activateDiaryAccess, revokeDiaryAccess, markDiaryCommunicationRead, editable, label: PigeOnline.label, date: PigeOnline.date, money: PigeOnline.money, safeLink: PigeOnline.safeLink }; } }).mount('#portal');
})(PigePortal || (PigePortal = {}));
