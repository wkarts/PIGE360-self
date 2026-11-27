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
    PigeLearning.component = { props: ['request', 'download', 'rootPath', 'schoolId', 'studentId', 'identity'], render: PigeRenders.learning, setup(props) {
            const state = Vue.reactive({ busy: false, error: '', students: [], studentId: '', enrollmentId: '', groupId: '', note: '' });
            const base = () => (props.rootPath || '/profile') + '/learning';
            const student = () => state.students.find(s => s.student_id === state.studentId);
            const enrollment = () => student()?.enrollments.find(e => e.enrollment_id === state.enrollmentId);
            function selectStudent() { state.enrollmentId = student()?.enrollments[0]?.enrollment_id || ''; state.groupId = ''; }
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
            async function load() {
                await run(async () => {
                    const data = await props.request(base() + (props.schoolId ? '?school_id=' + encodeURIComponent(props.schoolId) : ''));
                    state.students = props.studentId ? data.students.filter(item => item.student_id === props.studentId) : data.students;
                    state.note = data.note;
                    if (!student()) {
                        state.studentId = state.students[0]?.student_id || '';
                        selectStudent();
                    }
                    else if (!enrollment()) {
                        selectStudent();
                    }
                    if (!periodGroups.value.some(group => group.id === state.groupId))
                        state.groupId = '';
                });
            }
            const rows = () => (enrollment()?.subjects || []).flatMap(subject => subject.periods.map(period => ({ ...period, component_name: period.component_name || subject.component_name, diary_id: subject.diary_id })));
            const periodGroups = Vue.computed(() => {
                const groups = new Map();
                for (const row of rows()) {
                    const className = row.class_label || row.class_name || enrollment()?.class_name || '';
                    const id = JSON.stringify([row.period_id, row.class_group_id || className]);
                    const group = groups.get(id) || { id, label: row.period_name, className, items: [] };
                    group.items.push(row);
                    groups.set(id, group);
                }
                return Array.from(groups.values()).sort((left, right) => {
                    const a = left.items[0], b = right.items[0];
                    return (a.order_index ?? 0) - (b.order_index ?? 0) || (a.starts_on || '').localeCompare(b.starts_on || '') || left.className.localeCompare(right.className, 'pt-BR');
                });
            });
            const visibleGroups = Vue.computed(() => periodGroups.value.filter(group => !state.groupId || group.id === state.groupId));
            const percent = (value) => value === null || value === undefined ? 'Não apurada' : Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%';
            async function download(documentId = '') { await run(async () => { if (!student() || !enrollment())
                return; await props.download(base() + '/' + encodeURIComponent(state.studentId) + '/report.pdf?enrollment_id=' + encodeURIComponent(state.enrollmentId) + (documentId ? '&document_id=' + encodeURIComponent(documentId) : '') + (props.schoolId ? '&school_id=' + encodeURIComponent(props.schoolId) : ''), 'boletim-' + student().student_number + '.pdf'); }); }
            Vue.onMounted(() => { void load(); });
            return { props, state, student, enrollment, selectStudent, rows, periodGroups, visibleGroups, percent, load, download };
        } };
})(PigeLearning || (PigeLearning = {}));
var PigeSupport;
(function (PigeSupport) {
    const runtime = window;
    PigeSupport.status = Vue.reactive({ error: '' });
    const busyMessage = 'O atendimento recebeu muitas solicitações. Aguarde antes de tentar novamente.';
    const roots = '#hub-widget-holder,#hub-bubble-holder';
    // A URL sem versão pode continuar em cache por um ano após atualizar o HUB.
    const sdkRevision = 'launcher-tooltip-1';
    let sdkRefresh = 0;
    let loadedSource = '', activeScope = '', sdkSource = '', sessionSource = '';
    let pending = null;
    let sdkQueue = Promise.resolve();
    let script = null, activeSDK = null, lastSDK = null;
    let generation = 0, retryAt = 0, startupTimer;
    let recovery = null, checkingArea = false, retryArea = null;
    let visibilityStyle = null;
    let listeningReady = false;
    function setChecking(checking) {
        checkingArea = checking;
        visibilityStyle?.remove();
        visibilityStyle = null;
        if (checking) {
            visibilityStyle = document.createElement('style');
            visibilityStyle.textContent = roots + '{display:none!important}';
            document.head.appendChild(visibilityStyle);
        }
        if (recovery)
            recovery.hidden = checking;
    }
    function cancelStartup(stopListening = true) {
        if (startupTimer !== undefined) {
            window.clearTimeout(startupTimer);
        }
        startupTimer = undefined;
        if (stopListening && listeningReady) {
            window.removeEventListener('hub:ready', onReady);
            listeningReady = false;
        }
    }
    function onReady() {
        if (!activeSDK || !runtime.$hub?.hasLoaded)
            return;
        cancelStartup();
        recovery?.remove();
        recovery = null;
        PigeSupport.status.error = '';
    }
    function release(clearSession = false) {
        cancelStartup();
        recovery?.remove();
        recovery = null;
        // O SDK remove apenas seus próprios elementos e listeners no documento atual.
        (activeSDK || (clearSession ? lastSDK : null))?.destroy?.({ clearSession });
        if (clearSession) {
            lastSDK = null;
            sessionSource = '';
        }
        activeSDK = null;
        loadedSource = '';
    }
    function dispose() {
        ++generation;
        pending = null;
        retryAt = 0;
        retryArea = null;
        release(true);
        activeScope = '';
        setChecking(false);
        PigeSupport.status.error = '';
    }
    PigeSupport.dispose = dispose;
    function offerRecovery(config, message) {
        if (recovery)
            return;
        cancelStartup(false);
        PigeSupport.status.error = message;
        const button = document.createElement('button');
        button.dataset.pigeSupportRecovery = 'true';
        button.type = 'button';
        button.textContent = (config.launcherTitle || 'Suporte') + ': tentar novamente';
        button.title = message;
        const side = config.position === 'right' ? 'right' : 'left';
        button.style.cssText = `position:fixed;${side}:max(1rem,env(safe-area-inset-${side}));bottom:max(1rem,env(safe-area-inset-bottom));z-index:2147483000;max-width:calc(100vw - 2rem);padding:.7rem 1rem;border:0;border-radius:999px;background:#174576;color:#fff;font:600 1rem/1.35 system-ui;cursor:pointer;`;
        button.hidden = checkingArea;
        button.addEventListener('click', () => {
            if (checkingArea || recovery !== button)
                return;
            const retry = retryArea;
            release();
            retry?.();
        });
        recovery = button;
        document.body.appendChild(button);
    }
    function loadSDK(baseUrl) {
        // Serializa downloads: um script antigo não pode sobrescrever o SDK novo.
        const task = sdkQueue.catch(() => { }).then(async () => {
            const compatible = () => typeof runtime.hubSDK?.run === 'function' && typeof runtime.hubSDK?.destroy === 'function';
            if (sdkSource === baseUrl && compatible())
                return;
            sdkSource = '';
            const download = (refresh = false) => new Promise((resolve, reject) => {
                script?.remove();
                const element = document.createElement('script');
                script = element;
                element.dataset.pigeSupportHub = 'true';
                element.src = baseUrl + '/packs/js/sdk.js?pige_sdk=' + sdkRevision +
                    (refresh ? '&pige_reload=' + Date.now() + '-' + (++sdkRefresh) : '');
                element.defer = true;
                element.async = true;
                element.onload = () => resolve();
                element.onerror = () => { element.remove(); reject(new Error('hub-sdk-download')); };
                document.head.appendChild(element);
            });
            await download();
            // Uma única revalidação recupera uma cópia antiga sem gerar polling/retries infinitos.
            if (!compatible())
                await download(true);
            if (typeof runtime.hubSDK?.run !== 'function')
                throw new Error('hub-sdk-missing');
            if (typeof runtime.hubSDK.destroy !== 'function')
                throw new Error('hub-sdk-lifecycle');
            sdkSource = baseUrl;
        });
        sdkQueue = task;
        return task;
    }
    async function load(schoolId = '', area = 'login', sessionKey = 'public') {
        const scope = JSON.stringify([schoolId, sessionKey]), context = JSON.stringify([scope, area]);
        if (scope !== activeScope) {
            dispose();
            activeScope = scope;
        }
        if (pending?.context === context)
            return pending.promise;
        pending = null;
        const request = ++generation;
        setChecking(true);
        if (!schoolId && area !== 'login') {
            release();
            setChecking(false);
            return;
        }
        if (Date.now() < retryAt) {
            release();
            setChecking(false);
            PigeSupport.status.error = busyMessage;
            return;
        }
        PigeSupport.status.error = '';
        const promise = loadArea(schoolId, area, scope, request, () => { void load(schoolId, area, sessionKey); });
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
    async function loadArea(schoolId, area, scope, request, retry) {
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
                setChecking(false);
                PigeSupport.status.error = busyMessage;
                return;
            }
            if (response.ok)
                config = await response.json();
        }
        catch { /* Indisponibilidade do atendimento não bloqueia o formulário. */ }
        if (request !== generation)
            return;
        retryArea = retry;
        if (!config?.enabled || !config.base_url || !config.website_token) {
            release();
            setChecking(false);
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
            setChecking(false);
            PigeSupport.status.error = 'Revise o endereço configurado para o atendimento.';
            return;
        }
        const sourceKey = JSON.stringify([scope, baseUrl, config.website_token, config.position, config.type, config.launcherTitle, config.launcherTooltip]);
        const sessionKey = JSON.stringify([scope, baseUrl, config.website_token]);
        if (sourceKey === loadedSource && activeSDK) {
            setChecking(false);
            if (recovery)
                PigeSupport.status.error = recovery.title;
            return;
        }
        release(sessionSource !== '' && sessionKey !== sessionSource);
        try {
            await loadSDK(baseUrl);
            if (request !== generation)
                return;
            const sdk = runtime.hubSDK;
            // O descarte é necessário para trocar escola/conta sem manter a conversa anterior.
            if (!sdk?.run || !sdk.destroy) {
                sdkSource = '';
                throw new Error('hub-sdk-lifecycle');
            }
            runtime.hubSettings = { position: config.position || 'left', type: config.type || 'expanded_bubble', launcherTitle: config.launcherTitle || 'Suporte', launcherTooltip: config.launcherTooltip?.trim() || 'Abrir Conversa' };
            activeSDK = sdk;
            lastSDK = sdk;
            loadedSource = sourceKey;
            sessionSource = sessionKey;
            window.addEventListener('hub:ready', onReady);
            listeningReady = true;
            startupTimer = window.setTimeout(() => offerRecovery(config, 'O atendimento não ficou pronto nesta página. Tente novamente.'), 15000);
            sdk.run({ websiteToken: config.website_token, baseUrl });
            setChecking(false);
            if (runtime.$hub?.hasLoaded)
                onReady();
        }
        catch (error) {
            if (request !== generation)
                return;
            release();
            setChecking(false);
            const reason = error instanceof Error ? error.message : '';
            const message = reason === 'hub-sdk-download' ? 'Não foi possível baixar o SDK do atendimento. Verifique a conexão e tente novamente.' :
                reason === 'hub-sdk-missing' ? 'O script do atendimento não disponibilizou o SDK. Verifique a publicação do HUB.' :
                    reason === 'hub-sdk-lifecycle' ? 'O HUB ainda entregou um SDK antigo após atualizar o cache. Publique o SDK atualizado e tente novamente.' :
                        'O atendimento não iniciou. Tente novamente; se persistir, revise a integração do suporte.';
            offerRecovery(config, message);
        }
    }
    window.addEventListener('pagehide', () => { ++generation; release(); setChecking(false); });
})(PigeSupport || (PigeSupport = {}));
var PigeAutoPix;
(function (PigeAutoPix) {
    const frequencies = { WEEKLY: 'Semanal', MONTHLY: 'Mensal', QUARTERLY: 'Trimestral', SEMIANNUALLY: 'Semestral', ANNUALLY: 'Anual' };
    const labels = { PREPARING: 'Em preparação', CREATED: 'Aguardando o banco', ACTIVE: 'Ativa',
        INSTRUCTION_REFUSED: 'Instrução recusada', INSTRUCTION_CANCELLED: 'Instrução cancelada', CANCELLING: 'Cancelamento solicitado', CANCELLED: 'Cancelada', REFUSED: 'Recusada', EXPIRED: 'Expirada',
        QUEUED: 'Na fila', CREATING: 'Em emissão', WAITING: 'Aguardando confirmação', RECEIVED: 'Recebimento confirmado',
        RELEASED: 'Via anterior disponível para reativação pela Secretaria', PREVIOUS_RECEIVED: 'Pagamento confirmado na via anterior',
        RESTORE_REVIEW: 'Conferência bancária após restauração', SKIPPED: 'Pagamento pontual', AWAITING_REQUEST: 'Aguardando envio', SCHEDULED: 'Agendada', DONE: 'Processada' };
    function use(request, student) {
        let epoch = 0;
        const state = Vue.reactive({ id: '', busy: false, error: '', view: null, accepted: false, frequency: 'MONTHLY', confirmCancel: false });
        function clear() {
            epoch++;
            Object.assign(state, { id: '', busy: false, error: '', view: null, accepted: false, frequency: 'MONTHLY', confirmCancel: false });
        }
        async function send(id, action = '', body) {
            if (!id || !student() || (state.busy && state.id === id))
                return;
            const sid = student(), current = ++epoch;
            state.id = id;
            state.busy = true;
            state.error = '';
            try {
                const path = '/family/students/' + encodeURIComponent(sid) + '/charges/' + encodeURIComponent(id) + '/pix-automatic';
                const view = await request(path + (action ? '/' + action : ''), action ? { method: 'POST', body: JSON.stringify(body || {}) } : {});
                if (epoch !== current || student() !== sid)
                    return;
                state.view = view;
                state.accepted = false;
                state.confirmCancel = false;
            }
            catch (error) {
                if (epoch === current && student() === sid)
                    state.error = error instanceof Error ? error.message : 'Não foi possível consultar a cobrança.';
            }
            finally {
                if (epoch === current)
                    state.busy = false;
            }
        }
        function open(id) {
            if (state.id === id) {
                clear();
                return;
            }
            clear();
            void send(id);
        }
        function enroll() {
            const v = state.view;
            if (!v?.can_enroll || !state.accepted)
                return;
            return send(state.id, 'enroll', { quote: v.quote, terms_version: v.terms_version, frequency: state.frequency, accepted: true });
        }
        function cancel() {
            if (!state.confirmCancel || !state.view?.authorization)
                return;
            return send(state.id, 'cancel', { version: state.view.authorization.version });
        }
        const label = (value) => labels[value] || value;
        const money = (value) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        return { state, clear, open, enroll, cancel, refresh: () => send(state.id, 'refresh'), reload: () => send(state.id), frequencies, label, money };
    }
    PigeAutoPix.use = use;
})(PigeAutoPix || (PigeAutoPix = {}));
var PigeFamilyCard;
(function (PigeFamilyCard) {
    function use(request, student) {
        const state = Vue.reactive({ charge: '', view: null, loading: false, error: '', agreed: false, until: '', limit: '', revoke: false });
        let epoch = 0;
        function clear() { epoch++; state.view = null; state.charge = ''; state.loading = false; state.error = ''; state.agreed = false; state.revoke = false; state.until = ''; state.limit = ''; }
        async function load(id) {
            clear();
            const current = epoch, sid = student();
            state.charge = id;
            state.loading = true;
            try {
                const view = await request('/family/students/' + sid + '/charges/' + id + '/cards');
                if (current === epoch && student() === sid) {
                    state.view = view;
                    state.limit = String((view.checkout?.quote.charged_cents || 0) / 100);
                }
            }
            catch (e) {
                if (current === epoch)
                    state.error = e instanceof Error ? e.message : String(e);
            }
            finally {
                if (current === epoch)
                    state.loading = false;
            }
        }
        async function submit(revoke = false) {
            if (state.loading || !state.view || (!revoke && !state.agreed) || (revoke && !state.revoke))
                return;
            const current = epoch, sid = student(), id = state.charge;
            state.loading = true;
            state.error = '';
            const body = revoke ? {} : { terms_version: state.view.terms_version, accepted: state.agreed, ends_on: state.until, limit_cents: Math.round(Number(state.limit.replace(',', '.')) * 100) };
            try {
                await request('/family/students/' + sid + '/charges/' + id + '/cards/' + (revoke ? 'revoke' : 'authorize'), { method: 'POST', body: JSON.stringify(body) });
                if (current === epoch && student() === sid)
                    await load(id);
            }
            catch (e) {
                if (current === epoch)
                    state.error = e instanceof Error ? e.message : String(e);
            }
            finally {
                if (current === epoch)
                    state.loading = false;
            }
        }
        function link(value) {
            try {
                const url = new URL(value);
                return url.protocol === 'https:' && ['asaas.com', 'sandbox.asaas.com'].includes(url.hostname) && url.pathname === '/checkoutSession/show' && !url.username && !url.password && !url.port && /^[A-Za-z0-9_-]+$/.test(url.searchParams.get('id') || '') ? url.href : '';
            }
            catch {
                return '';
            }
        }
        return { state, clear, load, submit, link };
    }
    PigeFamilyCard.use = use;
})(PigeFamilyCard || (PigeFamilyCard = {}));
/** Portal privado: shell da aplicação, transporte e autorizações escolares preservados. */
var PigeFamily;
(function (PigeFamily) {
    const titles = { materials: 'Atividades', absences: 'Justificativas de ausência', overview: 'Visão geral', students: 'Alunos que acompanho', academic: 'Vida acadêmica', news: 'Comunicados', agenda: 'Agenda escolar', finance: 'Financeiro', documents: 'Documentos', support: 'Atendimento' };
    function routeSection() { const view = new URLSearchParams(location.search).get('view'); return view && titles[view] ? view : location.pathname.includes('documents') ? 'documents' : location.pathname.includes('finance') ? 'finance' : location.pathname.includes('academic') ? 'academic' : 'overview'; }
    const s = Vue.reactive({ ready: false, busy: false, error: '', contextError: false, account: null, email: '', password: '', passwordVisible: false, menuOpen: false, schoolId: '', schools: {}, section: routeSection(), students: [], studentId: new URLSearchParams(location.search).get('student') || '', charges: [], financePage: 1, financePageSize: 30, financeTotal: 0, financeOverdue: 0, financeNote: '', financeError: '', financeLoaded: false, news: [], events: [], feedItems: [], feedTotal: 0, feedPage: 1, feedBusy: false, feedError: '', overviewFeedError: '', selectedPost: null });
    let schoolworkSequence = 0;
    const schoolwork = Vue.reactive({ loading: false, error: '', materials: [], absences: [], day: '', reason: '', file: null, key: '', receipt: '', fileVersion: 0 });
    function clearSchoolwork() { schoolworkSequence++; schoolwork.loading = false; schoolwork.error = ''; schoolwork.materials = []; schoolwork.absences = []; schoolwork.file = null; schoolwork.key = ''; schoolwork.day = ''; schoolwork.reason = ''; schoolwork.receipt = ''; schoolwork.fileVersion++; }
    function pickEvidence(event) { schoolwork.file = event.target.files?.[0] || null; }
    async function loadSchoolwork() {
        const sequence = ++schoolworkSequence, id = s.studentId, section = s.section;
        schoolwork.error = '';
        schoolwork.loading = false;
        if (!id || student()?.academic_authorized === false || !['materials', 'absences'].includes(section) || (section === 'absences' && s.account?.role !== 'guardian'))
            return;
        schoolwork.loading = true;
        const path = '/family/students/' + id + '/' + section;
        const current = () => sequence === schoolworkSequence && s.studentId === id && s.section === section;
        try {
            if (section === 'materials') {
                const items = await request(path);
                if (current())
                    schoolwork.materials = items;
            }
            else {
                const items = await request(path);
                if (current())
                    schoolwork.absences = items;
            }
        }
        catch (error) {
            if (current())
                schoolwork.error = error instanceof Error ? error.message : 'Não foi possível consultar os registros.';
        }
        finally {
            if (current())
                schoolwork.loading = false;
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
    function clearPrivate() { generation++; autoPix.clear(); cards.clear(); feedGeneration++; clearSchoolwork(); s.students = []; s.charges = []; s.financeTotal = 0; s.financePage = 1; s.financeOverdue = 0; s.financeNote = ''; s.financeError = ''; s.financeLoaded = false; s.news = []; s.events = []; s.feedItems = []; s.feedTotal = 0; s.feedPage = 1; s.feedBusy = false; s.selectedPost = null; s.feedError = ''; s.overviewFeedError = ''; s.menuOpen = false; }
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
        const allowed = allowedSection(s.section);
        if (allowed !== s.section) {
            s.section = allowed;
            updateLocation();
        }
        await Promise.all([finance(), overviewFeed(), loadSchoolwork()]);
        if (current === generation && ['news', 'agenda'].includes(s.section))
            await loadFeed();
    }
    catch (e) {
        if (current === generation)
            s.contextError = true;
        throw e;
    } }
    const label = (value) => ({ open: 'Aberto', in_progress: 'Em atendimento', waiting: 'Aguardando', draft: 'Em preparação', active: 'Efetivada', suspended: 'Suspensa', completed: 'Concluída', pending: 'Pendente', overdue: 'Vencida', validated: 'Validado', received: 'Recebido', received_external: 'Recebido externamente', confirmed: 'Confirmada', refunded: 'Estornada', partially_refunded: 'Estorno parcial', refund_requested: 'Estorno solicitado', disputed: 'Em contestação', awaiting_review: 'Em análise', failed: 'Falha na emissão', uncertain: 'Em conciliação', waived: 'Dispensado', rejected: 'Revisão necessária', expired: 'Vencido', queued: 'Em processamento', cancelled: 'Cancelada', paid: 'Paga', settled: 'Liquidada', issued: 'Emitida', registered: 'Registrada' }[value] || value);
    const student = () => s.students.find(x => x.id === s.studentId);
    const pendingDocuments = () => student()?.document_pendencies ?? [];
    const studentView = () => s.account?.role === 'student';
    const portalName = () => studentView() ? 'Portal do aluno' : 'Portal da família';
    const initials = (name) => name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toLocaleUpperCase('pt-BR');
    const title = (name = s.section) => studentView() && name === 'students' ? 'Meu cadastro' : studentView() && name === 'academic' ? 'Minha vida escolar' : titles[name] || titles.overview;
    const date = (value) => { if (!value)
        return 'Data não informada'; const d = new Date(value.length === 10 ? value + 'T12:00:00' : value); return Number.isNaN(d.getTime()) ? 'Data não informada' : new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Bahia', day: '2-digit', month: 'short', year: 'numeric', ...(value.length > 10 ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(d); };
    const money = (value) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const autoPix = PigeAutoPix.use(request, () => s.studentId);
    const cards = PigeFamilyCard.use(request, () => s.studentId);
    async function finance(page = 1) {
        s.charges = [];
        s.financeLoaded = false;
        s.financeNote = '';
        s.financeError = '';
        s.financeOverdue = 0;
        s.financeTotal = 0;
        if (!student()?.financial_authorized)
            return;
        const selected = s.studentId, current = generation;
        try {
            const data = await request(`/family/students/${selected}/charges?page=${page}&page_size=${s.financePageSize}`);
            if (selected !== s.studentId || current !== generation)
                return;
            s.charges = data.items;
            s.financeTotal = data.total ?? 0;
            s.financeOverdue = data.overdue_count ?? data.items.filter(row => row.status === 'overdue').length;
            s.financePage = page;
            s.financeNote = data.note;
            s.financeLoaded = true;
        }
        catch (e) {
            if (selected === s.studentId && current === generation)
                s.financeError = e instanceof Error ? e.message : 'Não foi possível carregar o financeiro.';
        }
    }
    function feedPath(kind, page = 1, size = 12, upcoming = false) { return '/schools/' + encodeURIComponent(s.schoolId) + '/community-feed?' + new URLSearchParams({ kind, page: String(page), page_size: String(size), upcoming: String(upcoming) }); }
    async function overviewFeed() { if (!s.schoolId || student()?.academic_authorized === false)
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
    async function loadFeed(page = 1) { if (!s.schoolId || s.contextError || student()?.academic_authorized === false)
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
        return; s.section = allowedSection(s.section); autoPix.clear(); cards.clear(); clearSchoolwork(); s.selectedPost = null; updateLocation(); await run(async () => { await Promise.all([finance(), loadSchoolwork()]); }); }
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
    function allowedSection(name) { return student()?.academic_authorized === false && name !== 'support' ? 'finance' : name; }
    function section(name) { if (!titles[name])
        return; name = allowedSection(name); const changed = s.section !== name; s.section = name; s.selectedPost = null; closeMenu(false); if (changed)
        updateLocation(true); if (['materials', 'absences'].includes(name))
        void loadSchoolwork(); if (['news', 'agenda'].includes(name))
        void loadFeed(); void Vue.nextTick(() => window.document.getElementById('family-title')?.focus()); }
    async function popstate() {
        const requested = routeSection(), id = new URLSearchParams(location.search).get('student');
        const changed = Boolean(id && s.students.some(item => item.id === id) && id !== s.studentId);
        s.selectedPost = null;
        closeMenu(false);
        if (changed && id) {
            autoPix.clear();
            cards.clear();
            clearSchoolwork();
            s.studentId = id;
        }
        s.section = allowedSection(requested);
        if (s.section !== requested)
            updateLocation();
        if (changed)
            await finance();
        await run(loadSchoolwork);
        if (['news', 'agenda'].includes(s.section))
            await loadFeed();
    }
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
            return { s, autoPix, cards, schoolwork, loadSchoolwork, studentView, portalName, pickEvidence, submitAbsence, label, student, title, initials, date, money, pendingDocuments, finance, login, logout, changeSchool, changeStudent, chooseStudent, document, request, download, section, run, load, loadFeed, openPost, closePost, openMenu, closeMenu, mfa: PigeMFA, identity: PigeInstitution.state };
        } }).mount('#family');
})(PigeFamily || (PigeFamily = {}));
