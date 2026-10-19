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
var PigeFamily;
(function (PigeFamily) {
    const s = Vue.reactive({ ready: false, busy: false, error: '', account: null, email: '', password: '', schoolId: '', section: location.pathname.includes('documents') ? 'documents' : location.pathname.includes('finance') ? 'finance' : 'academic', students: [], studentId: new URLSearchParams(location.search).get('student') || '', charges: [], financeNote: '' });
    let token = '';
    let refreshing = null;
    async function raw(path, options = {}) { const headers = new Headers(options.headers); headers.set('X-CSRF-Protection', '1'); if (token)
        headers.set('Authorization', 'Bearer ' + token); if (s.schoolId)
        headers.set('X-School-Id', s.schoolId); if (options.body)
        headers.set('Content-Type', 'application/json'); return fetch('/api/v1' + path, { ...options, headers, credentials: 'same-origin', cache: 'no-store' }); }
    async function renew() { if (!refreshing)
        refreshing = (async () => { const r = await raw('/auth/refresh', { method: 'POST' }); if (!r.ok) {
            token = '';
            s.account = null;
            s.students = [];
            throw new Error('Sua sessão expirou. Entre novamente.');
        } const data = await r.json(); token = data.access_token; s.account = data.user; })().finally(() => { refreshing = null; }); await refreshing; }
    async function response(path, options = {}) { let r = await raw(path, options); if (r.status === 401 && token) {
        await renew();
        r = await raw(path, options);
    } if (!r.ok) {
        let detail = 'Não foi possível carregar. Tente novamente.';
        try {
            detail = (await r.json()).detail || detail;
        }
        catch { }
        throw new Error(detail);
    } return r; }
    async function request(path, options = {}) { return (await response(path, options)).json(); }
    async function run(fn) { if (s.busy)
        return; s.busy = true; s.error = ''; try {
        await fn();
    }
    catch (e) {
        s.error = e instanceof Error ? e.message : 'Não foi possível concluir.';
    }
    finally {
        s.busy = false;
    } }
    async function authenticated(data) { token = String(data.access_token || ''); s.account = data.user; s.password = ''; s.schoolId = s.account.school_ids[0] || ''; await load(); }
    async function login() { await run(async () => { const result = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: s.email, password: s.password }) }); s.password = ''; if (await PigeMFA.accept(result))
        return; await authenticated(result); }); }
    async function logout() { await run(async () => { await request('/auth/logout', { method: 'POST' }); await raw('/portal/logout', { method: 'POST' }).catch(() => { }); token = ''; s.account = null; s.students = []; s.charges = []; PigeMFA.clear(); }); }
    async function load() { s.students = []; s.charges = []; const data = await request('/family/context'); s.students = data.students; if (!s.students.some(x => x.id === s.studentId))
        s.studentId = s.students[0]?.id || ''; await finance(); }
    const student = () => s.students.find(x => x.id === s.studentId);
    async function finance() { s.charges = []; s.financeNote = ''; if (!student()?.financial_authorized)
        return; const data = await request('/family/students/' + s.studentId + '/charges'); s.charges = data.items; s.financeNote = data.note; }
    async function changeStudent() { history.replaceState({}, '', location.pathname + '?student=' + encodeURIComponent(s.studentId)); await run(finance); }
    async function changeSchool() { await run(load); }
    async function download(path, filename) { const r = await response(path); const url = URL.createObjectURL(await r.blob()); const a = window.document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    async function document(file) { await run(() => download('/family/students/' + s.studentId + '/documents/' + file.id, 'documento-escolar')); }
    async function start() { await PigeInstitution.load(); try {
        await renew();
        if (s.account) {
            s.schoolId = s.account.school_ids[0] || '';
            await load();
        }
    }
    catch { }
    finally {
        s.ready = true;
    } }
    function section(name) { s.section = name; history.pushState({}, '', name === 'documents' ? '/documents' : name === 'finance' ? '/finance' : '/academic'); history.replaceState({}, '', location.pathname + (s.studentId ? '?student=' + encodeURIComponent(s.studentId) : '')); }
    Vue.createApp({ components: { 'learning-portal': PigeLearning.component }, render: PigeRenders.familyPortal, setup() { Vue.onMounted(() => { window.addEventListener('popstate', () => { s.section = location.pathname.includes('documents') ? 'documents' : location.pathname.includes('finance') ? 'finance' : 'academic'; }); PigeMFA.init(request, authenticated, logout); void start(); }); return { s, student, login, logout, changeSchool, changeStudent, document, request, download, section, run, load, mfa: PigeMFA, identity: PigeInstitution.state }; } }).mount('#family');
})(PigeFamily || (PigeFamily = {}));
