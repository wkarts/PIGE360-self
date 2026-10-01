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
            const controls = Array.from(current.querySelectorAll('button,a[href],input,select,textarea,summary,[tabindex="0"]'))
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
/** Página pública da escola. Sem sessão administrativa nem dados internos. */
var PigeNews;
(function (PigeNews) {
    const state = Vue.reactive({ ready: false, error: '', schoolId: '', schools: [] });
    async function start() {
        state.error = '';
        try {
            await PigeInstitution.load();
            document.title = PigeInstitution.state.display_name + ' · Notícias e agenda';
            const context = await PigeCommunity.request('/portal/context');
            state.schools = context.schools;
            const requested = new URLSearchParams(location.search).get('school') || '';
            state.schoolId = state.schools.some(school => school.id === requested) ? requested : context.default_school_id;
        }
        catch (error) {
            state.error = error instanceof Error ? error.message : String(error);
        }
        finally {
            state.ready = true;
        }
    }
    function selectSchool() { const url = new URL(location.href); if (state.schoolId)
        url.searchParams.set('school', state.schoolId);
    else
        url.searchParams.delete('school'); history.replaceState(null, '', url); }
    Vue.createApp({ render: PigeRenders.news, components: { 'school-community': PigeCommunity.component }, setup() { Vue.onMounted(() => { PigeDialogs.install(); void start(); }); return { state, identity: PigeInstitution.state, start, selectSchool }; } }).mount('#school-news');
})(PigeNews || (PigeNews = {}));
