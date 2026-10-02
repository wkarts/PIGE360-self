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
            void PigeSupport.load(state.schoolId, 'news');
        }
    }
    function selectSchool() { PigeSupport.dispose(); void PigeSupport.load(state.schoolId, 'news'); const url = new URL(location.href); if (state.schoolId)
        url.searchParams.set('school', state.schoolId);
    else
        url.searchParams.delete('school'); history.replaceState(null, '', url); }
    Vue.createApp({ render: PigeRenders.news, components: { 'school-community': PigeCommunity.component }, setup() { Vue.onMounted(() => { PigeDialogs.install(); void start(); }); return { state, identity: PigeInstitution.state, start, selectSchool }; } }).mount('#school-news');
})(PigeNews || (PigeNews = {}));
