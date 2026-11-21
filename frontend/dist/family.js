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
        const surface = document.documentElement?.dataset?.institutionSurface;
        document.title = value.display_name + ' · ' + (location.pathname === '/online' ? 'Portal dos responsáveis' : surface === 'teacher' ? 'Portal do Professor' : surface === 'portal' ? 'Portal do aluno e responsável' : 'Gestão escolar');
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
var PigeLearning;
(function (PigeLearning) {
    PigeLearning.component = { props: ['request', 'download', 'rootPath', 'schoolId', 'studentId'], render: PigeRenders.learning, setup(props) {
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
            async function load() { await run(async () => { const data = await props.request(base() + (props.schoolId ? '?school_id=' + encodeURIComponent(props.schoolId) : '')); state.students = props.studentId ? data.students.filter(item => item.student_id === props.studentId) : data.students; state.note = data.note; if (!student())
                state.studentId = state.students[0]?.student_id || ''; selectStudent(); }); }
            const rows = () => (enrollment()?.subjects || []).flatMap(subject => subject.periods.map(period => ({ ...period, component_name: subject.component_name, diary_id: subject.diary_id })));
            const percent = (value) => value === null || value === undefined ? 'Não apurada' : Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%';
            async function download() { await run(async () => { if (!student() || !enrollment())
                return; await props.download(base() + '/' + encodeURIComponent(state.studentId) + '/report.pdf?enrollment_id=' + encodeURIComponent(state.enrollmentId), 'boletim-' + student().student_number + '.pdf'); }); }
            Vue.onMounted(() => { void load(); });
            return { props, state, student, enrollment, selectStudent, rows, percent, load, download };
        } };
})(PigeLearning || (PigeLearning = {}));
var PigeSupport;
(function (PigeSupport) {
    PigeSupport.status = Vue.reactive({ error: '' });
    let loadedSource = '', activeScope = '';
    let pending = null;
    let retryAt = 0;
    const busyMessage = 'O atendimento recebeu muitas solicitações. Aguarde antes de tentar novamente.';
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
    function dispose() { ++generation; activeScope = ''; pending = null; retryAt = 0; release(); PigeSupport.status.error = ''; }
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
        const scope = JSON.stringify([schoolId, sessionKey]);
        const context = JSON.stringify([scope, area]);
        if (scope !== activeScope) {
            dispose();
            activeScope = scope;
        }
        if (pending?.context === context)
            return pending.promise;
        pending = null;
        const request = ++generation;
        if (frame)
            frame.style.display = 'none';
        if (!schoolId && area !== 'login') {
            release();
            return;
        }
        if (Date.now() < retryAt) {
            release();
            PigeSupport.status.error = busyMessage;
            return;
        }
        PigeSupport.status.error = '';
        const promise = loadArea(schoolId, area, scope, request);
        pending = { context, promise };
        try {
            await promise;
        }
        finally {
            if (pending?.promise === promise)
                pending = null;
        }
    }
    PigeSupport.load = load;
    async function loadArea(schoolId, area, scope, request) {
        let config = null;
        try {
            const path = schoolId ? '/api/v1/schools/' + encodeURIComponent(schoolId) + '/support-widget?area=' + encodeURIComponent(area) : '/api/v1/support-widget';
            const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store' });
            if (request !== generation)
                return;
            if (response.status === 429) {
                const header = response.headers.get('Retry-After')?.trim() || '';
                const delay = /^\d+$/.test(header) ? Number(header) * 1000 : Date.parse(header) - Date.now();
                retryAt = Date.now() + (Number.isFinite(delay) && delay >= 0 ? delay : 60000);
                release();
                PigeSupport.status.error = busyMessage;
                return;
            }
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
        const sourceKey = JSON.stringify([scope, baseUrl, config.website_token, config.position, config.type, config.launcherTitle]);
        if (sourceKey === loadedSource && frame) {
            frame.style.display = '';
            return;
        }
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
    window.addEventListener('pagehide', dispose);
})(PigeSupport || (PigeSupport = {}));
/** Portal privado: shell da aplicação, transporte e autorizações escolares preservados. */
var PigeFamily;
(function (PigeFamily) {
    const titles = { materials: 'Atividades', absences: 'Justificativas de ausência', overview: 'Visão geral', students: 'Meus alunos', academic: 'Vida acadêmica', news: 'Comunicados', agenda: 'Agenda escolar', finance: 'Financeiro', documents: 'Documentos', support: 'Atendimento' };
    function routeSection() { const view = new URLSearchParams(location.search).get('view'); return view && titles[view] ? view : location.pathname.includes('documents') ? 'documents' : location.pathname.includes('finance') ? 'finance' : location.pathname.includes('academic') ? 'academic' : 'overview'; }
    const s = Vue.reactive({ ready: false, busy: false, error: '', contextError: false, account: null, email: '', password: '', passwordVisible: false, menuOpen: false, schoolId: '', schools: {}, section: routeSection(), students: [], studentId: new URLSearchParams(location.search).get('student') || '', charges: [], financeNote: '', financeError: '', financeLoaded: false, news: [], events: [], feedItems: [], feedTotal: 0, feedPage: 1, feedBusy: false, feedError: '', overviewFeedError: '', selectedPost: null });
    const schoolwork = Vue.reactive({ materials: [], absences: [], day: '', reason: '', file: null, key: '', receipt: '', fileVersion: 0 });
    function clearSchoolwork() { schoolwork.materials = []; schoolwork.absences = []; schoolwork.file = null; schoolwork.key = ''; schoolwork.day = ''; schoolwork.reason = ''; schoolwork.receipt = ''; schoolwork.fileVersion++; }
    function pickEvidence(event) { schoolwork.file = event.target.files?.[0] || null; }
    async function loadSchoolwork() {
        const current = generation, id = s.studentId, section = s.section;
        if (!id || !['materials', 'absences'].includes(section) || (section === 'absences' && s.account?.role !== 'guardian'))
            return;
        const path = '/family/students/' + id + '/' + section;
        if (section === 'materials') {
            const items = await request(path);
            if (current === generation && s.studentId === id)
                schoolwork.materials = items;
        }
        else {
            const items = await request(path);
            if (current === generation && s.studentId === id)
                schoolwork.absences = items;
        }
    }
    async function submitAbsence() {
        await run(async () => {
            const id = s.studentId, current = generation, form = new FormData();
            schoolwork.key ||= crypto.randomUUID();
            form.set('client_key', schoolwork.key);
            form.set('absence_date', schoolwork.day);
            form.set('reason', schoolwork.reason);
            if (schoolwork.file)
                form.set('evidence', schoolwork.file);
            const result = await request('/family/students/' + id + '/absences', { method: 'POST', body: form });
            if (current !== generation || s.studentId !== id)
                return;
            clearSchoolwork();
            schoolwork.receipt = result.number;
            await loadSchoolwork();
        });
    }
    let postTrigger = null;
    let generation = 0, feedGeneration = 0, authEpoch = 0;
    let token = '';
    let refreshing = null;
    class SessionChanged extends Error {
        constructor() { super('A sessão mudou.'); this.name = 'AbortError'; }
    }
    function checkAuth(epoch) { if (epoch !== authEpoch)
        throw new SessionChanged(); }
    function invalidateAuth() { authEpoch++; refreshing = null; }
    function clearPrivate() { generation++; feedGeneration++; clearSchoolwork(); s.students = []; s.charges = []; s.financeNote = ''; s.financeError = ''; s.financeLoaded = false; s.news = []; s.events = []; s.feedItems = []; s.feedTotal = 0; s.feedPage = 1; s.feedBusy = false; s.selectedPost = null; s.feedError = ''; s.overviewFeedError = ''; s.menuOpen = false; }
    async function raw(path, options = {}) { const headers = new Headers(options.headers); headers.set('X-CSRF-Protection', '1'); if (token)
        headers.set('Authorization', 'Bearer ' + token); if (s.schoolId)
        headers.set('X-School-Id', s.schoolId); if (typeof options.body === 'string')
        headers.set('Content-Type', 'application/json'); return fetch('/api/v1' + path, { ...options, headers, credentials: 'same-origin', cache: 'no-store' }); }
    async function renew() {
        const epoch = authEpoch;
        if (!refreshing || refreshing.epoch !== epoch) {
            const pending = { epoch, promise: Promise.resolve() };
            pending.promise = (async () => {
                const r = await raw('/auth/refresh', { method: 'POST' });
                const data = await r.json();
                checkAuth(epoch);
                if (!r.ok) {
                    invalidateAuth();
                    token = '';
                    s.account = null;
                    clearPrivate();
                    throw new Error('Sua sessão expirou. Entre novamente.');
                }
                token = data.access_token;
                s.account = data.user;
            })().finally(() => { if (refreshing === pending)
                refreshing = null; });
            refreshing = pending;
        }
        await refreshing.promise;
        checkAuth(epoch);
    }
    async function response(path, options = {}) {
        const epoch = authEpoch;
        let r = await raw(path, options);
        checkAuth(epoch);
        // Login/logout never renew a prior session. An old request cannot replay in a new one.
        if (r.status === 401 && token && !/^\/auth\/(?:login|logout|refresh)$/.test(path)) {
            await r.arrayBuffer();
            checkAuth(epoch);
            await renew();
            checkAuth(epoch);
            r = await raw(path, options);
            checkAuth(epoch);
        }
        if (!r.ok) {
            let detail = 'Não foi possível carregar. Tente novamente.';
            try {
                detail = (await r.json()).detail || detail;
            }
            catch { }
            checkAuth(epoch);
            throw new Error(detail);
        }
        return r;
    }
    async function request(path, options = {}) { const epoch = authEpoch; const data = await (await response(path, options)).json(); checkAuth(epoch); return data; }
    async function run(fn) { if (s.busy)
        return; s.busy = true; s.error = ''; try {
        await fn();
    }
    catch (e) {
        if (!(e instanceof SessionChanged))
            s.error = e instanceof Error ? e.message : 'Não foi possível concluir.';
    }
    finally {
        s.busy = false;
    } }
    async function authenticated(data) { token = String(data.access_token || ''); s.account = data.user; s.password = ''; s.passwordVisible = false; s.schoolId = s.account.school_ids[0] || ''; await load(); }
    async function login() { if (s.busy)
        return; invalidateAuth(); clearPrivate(); token = ''; s.account = null; s.schoolId = ''; await run(async () => { const result = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: s.email, password: s.password }) }); s.password = ''; s.passwordVisible = false; if (await PigeMFA.accept(result))
        return; await authenticated(result); }); }
    async function logout() {
        if (s.busy)
            return;
        // Invalidate pending renewals before the logout network request, not after it.
        invalidateAuth();
        clearPrivate();
        await run(async () => { try {
            await request('/auth/logout', { method: 'POST' });
        }
        finally {
            token = '';
            s.account = null;
            s.schoolId = '';
            s.studentId = '';
            s.password = '';
            s.passwordVisible = false;
            PigeMFA.clear();
        } });
    }
    async function load() { clearPrivate(); s.contextError = false; const current = generation; try {
        const data = await request('/family/context');
        if (current !== generation)
            return;
        s.schools = Object.fromEntries((data.schools || []).map(x => [x.id, x.name]));
        s.students = data.students;
        if (!s.students.some(x => x.id === s.studentId))
            s.studentId = s.students[0]?.id || '';
        await Promise.all([finance(), overviewFeed(), loadSchoolwork()]);
        if (current === generation && ['news', 'agenda'].includes(s.section))
            await loadFeed();
    }
    catch (e) {
        if (current === generation)
            s.contextError = true;
        throw e;
    } }
    const label = (value) => ({ open: 'Aberto', in_progress: 'Em atendimento', waiting: 'Aguardando', draft: 'Em preparação', active: 'Efetivada', suspended: 'Suspensa', completed: 'Concluída', pending: 'Pendente', overdue: 'Vencida', validated: 'Validado', received: 'Recebido', waived: 'Dispensado', rejected: 'Revisão necessária', expired: 'Vencido', queued: 'Em processamento', cancelled: 'Cancelada', paid: 'Paga', settled: 'Liquidada', issued: 'Emitida', registered: 'Registrada' }[value] || value);
    const student = () => s.students.find(x => x.id === s.studentId);
    const pendingDocuments = () => (student()?.documents || []).filter(x => ['pending', 'rejected', 'expired'].includes(x.status));
    const overdue = () => s.charges.filter(x => x.status === 'overdue');
    const initials = (name) => name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toLocaleUpperCase('pt-BR');
    const title = () => titles[s.section] || titles.overview;
    const date = (value) => { if (!value)
        return 'Data não informada'; const d = new Date(value.length === 10 ? value + 'T12:00:00' : value); return Number.isNaN(d.getTime()) ? 'Data não informada' : new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Bahia', day: '2-digit', month: 'short', year: 'numeric', ...(value.length > 10 ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(d); };
    const money = (value) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    async function finance() { s.charges = []; s.financeNote = ''; s.financeError = ''; s.financeLoaded = false; if (!student()?.financial_authorized)
        return; const selected = s.studentId, current = generation; try {
        const data = await request('/family/students/' + selected + '/charges');
        if (selected !== s.studentId || current !== generation)
            return;
        s.charges = data.items;
        s.financeNote = data.note;
        s.financeLoaded = true;
    }
    catch (e) {
        if (selected === s.studentId && current === generation)
            s.financeError = e instanceof Error ? e.message : 'Não foi possível carregar o financeiro.';
    } }
    function feedPath(kind, page = 1, size = 12, upcoming = false) { return '/schools/' + encodeURIComponent(s.schoolId) + '/community-feed?' + new URLSearchParams({ kind, page: String(page), page_size: String(size), upcoming: String(upcoming) }); }
    async function overviewFeed() { if (!s.schoolId)
        return; const current = generation; try {
        const [news, events] = await Promise.all([request(feedPath('news', 1, 3)), request(feedPath('event', 1, 3, true))]);
        if (current !== generation)
            return;
        s.news = news.items;
        s.events = events.items;
    }
    catch (e) {
        if (current === generation)
            s.overviewFeedError = e instanceof Error ? e.message : 'Não foi possível carregar os comunicados e a agenda.';
    } }
    async function loadFeed(page = 1) { if (!s.schoolId || s.contextError)
        return; const current = generation, id = ++feedGeneration, kind = s.section === 'agenda' ? 'event' : 'news'; s.feedBusy = true; s.feedError = ''; s.feedItems = []; s.selectedPost = null; try {
        const data = await request(feedPath(kind, page));
        if (current !== generation || id !== feedGeneration)
            return;
        s.feedItems = data.items;
        s.feedTotal = data.total;
        s.feedPage = page;
    }
    catch (e) {
        if (current === generation && id === feedGeneration)
            s.feedError = e instanceof Error ? e.message : 'Não foi possível carregar as publicações.';
    }
    finally {
        if (id === feedGeneration)
            s.feedBusy = false;
    } }
    function updateLocation(push = false) { const params = new URLSearchParams({ view: s.section }); if (s.studentId)
        params.set('student', s.studentId); history[push ? 'pushState' : 'replaceState']({}, '', '/family?' + params); }
    async function changeStudent() { if (s.busy)
        return; clearSchoolwork(); s.selectedPost = null; updateLocation(); await run(async () => { await Promise.all([finance(), loadSchoolwork()]); }); }
    async function chooseStudent(id) { if (s.busy)
        return; s.studentId = id; await changeStudent(); section('academic'); }
    async function changeSchool() { if (s.busy)
        return; s.studentId = ''; await run(load); updateLocation(); }
    async function download(path, filename) { const current = generation, selected = s.studentId; const r = await response(path); const blob = await r.blob(); if (current !== generation || selected !== s.studentId)
        return; const url = URL.createObjectURL(blob); const a = window.document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    async function document(file) { await run(() => download('/family/students/' + s.studentId + '/documents/' + file.id, 'documento-escolar')); }
    async function start() { await PigeInstitution.load(); try {
        await renew();
        if (s.account) {
            s.schoolId = s.account.school_ids[0] || '';
            await load();
        }
    }
    catch (e) {
        if (s.account)
            s.error = e instanceof Error ? e.message : 'Não foi possível carregar seus dados.';
    }
    finally {
        s.ready = true;
    } }
    function openPost(post) { postTrigger = window.document.activeElement; s.selectedPost = post; void Vue.nextTick(() => { const target = window.document.getElementById('family-post-detail'); target?.focus(); target?.scrollIntoView({ block: 'start' }); }); }
    function closePost() { s.selectedPost = null; if (postTrigger?.isConnected)
        postTrigger.focus(); postTrigger = null; }
    function resized() { if (window.innerWidth > 800)
        closeMenu(false); }
    function closeMenu(restore = true) { s.menuOpen = false; if (restore)
        void Vue.nextTick(() => { if (!s.menuOpen)
            window.document.getElementById('family-menu-toggle')?.focus(); }); }
    function openMenu() { s.menuOpen = true; void Vue.nextTick(() => { if (s.menuOpen)
        window.document.getElementById('family-menu-close')?.focus(); }); }
    function menuKeys(event) { if (!s.menuOpen)
        return; if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
    } if (event.key === 'Tab') {
        const elements = Array.from(window.document.querySelectorAll('#family-navigation button:not(:disabled),#family-navigation a[href]'));
        const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && window.document.activeElement === first) {
            event.preventDefault();
            last?.focus();
        }
        else if (!event.shiftKey && window.document.activeElement === last) {
            event.preventDefault();
            first?.focus();
        }
    } }
    function section(name) { if (!titles[name])
        return; const changed = s.section !== name; s.section = name; s.selectedPost = null; closeMenu(false); if (changed)
        updateLocation(true); if (['materials', 'absences'].includes(name))
        void loadSchoolwork().catch(e => { if (s.section === name)
            s.error = e.message; }); if (['news', 'agenda'].includes(name))
        void loadFeed(); void Vue.nextTick(() => window.document.getElementById('family-title')?.focus()); }
    async function popstate() { s.section = routeSection(); s.selectedPost = null; closeMenu(false); const id = new URLSearchParams(location.search).get('student'); if (id && s.students.some(x => x.id === id) && id !== s.studentId) {
        clearSchoolwork();
        s.studentId = id;
        await finance();
    } await run(loadSchoolwork); if (['news', 'agenda'].includes(s.section))
        await loadFeed(); }
    Vue.createApp({ components: { 'learning-portal': PigeLearning.component }, render: PigeRenders.familyPortal, setup() {
            Vue.watch(() => [s.ready, s.account?.id, s.account?.role, s.schoolId].join('|'), () => {
                if (s.account && s.schoolId)
                    void PigeSupport.load(s.schoolId, s.account.role === 'student' ? 'student_portal' : 'guardian_portal', s.account.id);
                else if (s.ready && !s.account)
                    void PigeSupport.load(undefined, 'login');
                else
                    PigeSupport.dispose();
            });
            Vue.onUnmounted(PigeSupport.dispose);
            Vue.onMounted(() => { window.addEventListener('popstate', popstate); window.addEventListener('keydown', menuKeys); window.addEventListener('resize', resized); PigeMFA.init(request, authenticated, logout); void start(); });
            Vue.onUnmounted(() => { window.removeEventListener('popstate', popstate); window.removeEventListener('keydown', menuKeys); window.removeEventListener('resize', resized); });
            return { s, schoolwork, pickEvidence, submitAbsence, label, student, title, initials, date, money, pendingDocuments, overdue, login, logout, changeSchool, changeStudent, chooseStudent, document, request, download, section, run, load, loadFeed, openPost, closePost, openMenu, closeMenu, mfa: PigeMFA, identity: PigeInstitution.state };
        } }).mount('#family');
})(PigeFamily || (PigeFamily = {}));
