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
/** Notícias e agenda com transporte compartilhável entre gestão, portal e página pública. */
var PigeCommunity;
(function (PigeCommunity) {
    const audienceLabels = { public: 'Público — qualquer visitante', authenticated: 'Comunidade escolar autenticada', students: 'Alunos', guardians: 'Pais e responsáveis', teachers: 'Professores' };
    const statusLabels = { draft: 'Rascunho', published: 'Publicado', archived: 'Arquivado' };
    const empty = () => ({ image: null, id: '', version: 1, title: '', summary: '', content: '', kind: 'news', audience: 'authenticated', status: 'draft', pinned: false, publish_at: '', expires_at: '', event_start: '', event_end: '', location: '' });
    async function request(path, options = {}) {
        const response = await fetch('/api/v1' + path, { ...options, credentials: 'same-origin', cache: 'no-store', headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), 'X-CSRF-Protection': '1', ...options.headers } });
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
    const newImage = () => ({ url: '', alt: '', focal_x: 50, focal_y: 50 });
    const newLink = () => ({ label: '', url: '' });
    const newItem = () => ({ title: '', text: '', image: null, action: null });
    const newDesign = () => ({ pages: [], configured: false, header_sticky: false, mobile_actions: false, eyebrow: '', hero_image: null, hero_gallery: [], primary_action: null, secondary_action: null, menu: [], footer_text: '', sections: [] });
    const sectionLabels = { cards: 'Etapas e cartões', split: 'Texto e fotografia', gallery: 'Galeria de imagens', steps: 'Jornada e passos', cta: 'Convite e botão', news: 'Notícias publicadas', agenda: 'Agenda publicada', text: 'Texto de conteúdo' };
    PigeCommunity.component = { props: ['schoolId', 'permissions', 'publicMode', 'portalMode', 'request', 'compact', 'websiteRequest'], render: PigeRenders.community, setup(props) {
            const editorSteps = [
                { id: 'content', number: '1', label: 'Conteúdo', description: 'Defina o tipo, público, título, resumo e texto da publicação.' },
                { id: 'media', number: '2', label: 'Imagem', description: 'Adicione uma fotografia acessível ou reutilize uma imagem da biblioteca.' },
                { id: 'publish', number: '3', label: 'Publicação', description: 'Escolha o período, destaque e situação da publicação antes de salvar.' },
            ];
            const s = Vue.reactive({ siteGuide: 'models', models: [], modelChoice: '', resolvedModel: null, modelPreviewInput: '', modelPreviewPage: '', modelPreviewActive: false, hasModelCheckpoint: false, demoConfirmed: false, sitePageIndex: -1, assets: [], admissionReadiness: null, websiteInitial: '', sectionKind: 'cards', previewHtml: '', previewWidth: '100%', publishedVersion: 0, publishedUrl: '', published: false, hasDraft: false, website: { design: newDesign(), enabled: false, theme: 'horizon', headline: '', introduction: '', about: '', public_url: '', portal_url: '', notice: '', admission_url: '', brand: { display_name: '', primary_color: '', secondary_color: '', font_family: '' } }, websiteOpen: false, busy: false, error: '', notice: '', items: [], page: 1, total: 0, q: '', kind: '', status: '', upcoming: false, selected: null, editing: false, savedPostStatus: '', editorStep: 'content', discard: false, deleteConfirm: false, initial: '', form: empty() });
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
            let previewAnchor = '';
            let previewEpoch = 0;
            let previewController = null;
            function closePreview() {
                s.previewHtml = '';
                s.modelPreviewActive = false;
                previewAnchor = '';
                if (previewController) {
                    const controller = previewController;
                    previewController = null;
                    previewEpoch++;
                    controller.abort();
                    s.busy = false;
                }
            }
            async function runPreview(action) {
                if (s.busy)
                    return;
                const epoch = ++previewEpoch, controller = new AbortController();
                previewController = controller;
                const current = () => previewEpoch === epoch && previewController === controller;
                s.busy = true;
                s.error = '';
                s.notice = '';
                try {
                    await action(controller.signal, current);
                }
                catch (error) {
                    if (current() && !controller.signal.aborted)
                        s.error = error instanceof Error ? error.message : String(error);
                }
                finally {
                    if (current()) {
                        previewController = null;
                        s.busy = false;
                    }
                }
            }
            async function load() {
                if (!props.schoolId && !props.portalMode)
                    return;
                const params = new URLSearchParams({ page: String(s.page), page_size: props.compact ? '4' : '12', q: s.q, kind: s.kind, ...(manage() ? { status: s.status } : { upcoming: String(s.upcoming) }) });
                const result = await transport(endpoint() + '?' + params);
                s.items = result.items;
                s.total = result.total;
            }
            async function loadWebsite() { if (manage() && !props.compact) {
                const data = await transport('/schools/' + props.schoolId + '/website');
                if (data.configuration) {
                    const c = data.configuration;
                    s.published = c.enabled;
                    s.publishedVersion = c.published_version || 0;
                    s.publishedUrl = c.public_url;
                    s.hasDraft = Boolean(c.draft);
                    s.website = { ...s.website, ...c, ...(c.draft || {}), version: c.version };
                    s.website.brand = { display_name: '', primary_color: '', secondary_color: '', font_family: '', ...s.website.brand };
                    s.website.design = { ...newDesign(), ...s.website.design };
                    s.hasModelCheckpoint = Boolean(c.has_checkpoint);
                    s.websiteInitial = JSON.stringify(websitePayload());
                }
            } }
            function websitePayload() { const { version, enabled, theme, headline, introduction, about, public_url, portal_url, notice, admission_url, brand, design } = s.website; return { version, enabled, theme, headline, introduction, about, public_url, portal_url, notice, admission_url, brand, design }; }
            async function loadSiteAssets() { await run(async () => { const data = await transport('/schools/' + props.schoolId + '/website/assets'); s.assets = data.items; }); }
            async function loadAdmissionReadiness() { if (!manage() || !props.permissions?.includes('admissions.read'))
                return; await run(async () => { s.admissionReadiness = await transport('/schools/' + props.schoolId + '/admission-readiness'); s.notice = 'Situação da matrícula atualizada. O CTA continua apontando para o endereço configurado, sem criar outro processo.'; }); }
            async function removeSiteAsset(asset) { if (!window.confirm('Excluir esta fotografia da biblioteca? Somente fotos sem uso em rascunhos, sites ou publicações podem ser excluídas.'))
                return; await run(async () => { await transport('/schools/' + props.schoolId + '/website/assets/' + asset.id, { method: 'DELETE' }); s.assets = s.assets.filter(x => x.id !== asset.id); s.notice = 'Fotografia sem uso excluída.'; }); }
            async function uploadSiteImage(event, target) { const input = event.target; const file = input.files?.[0]; if (!file)
                return; await run(async () => { if (file.size > 3 * 1024 * 1024)
                throw new Error('Escolha uma imagem de até 3 MB.'); if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
                throw new Error('Use uma fotografia JPEG, PNG ou WebP.'); const body = new FormData(); body.append('image', file); const asset = await transport('/schools/' + props.schoolId + '/website/assets', { method: 'POST', body }); target.url = asset.url; s.previewHtml = ''; s.notice = 'Fotografia enviada. Ela só ficará pública quando estiver em um site ou uma publicação pública.'; }); input.value = ''; }
            const siteGuides = [{ id: 'models', label: 'Modelos' }, { id: 'identity', label: 'Identidade e textos' }, { id: 'navigation', label: 'Menu e capa' }, { id: 'pages', label: 'Páginas e seções' }, { id: 'photos', label: 'Fotografias' }];
            async function openModelPreview(event) {
                const editor = event.currentTarget.closest('.community-page');
                await previewModel();
                if (!s.previewHtml || !s.modelPreviewActive)
                    return;
                await Vue.nextTick();
                editor?.querySelector('.website-preview')?.focus();
            }
            function revealInvalidSiteField(event) {
                const field = event.target;
                const group = field.closest('[data-site-guide]');
                if (group?.dataset.siteGuide)
                    s.siteGuide = group.dataset.siteGuide;
                for (let node = field.parentElement; node; node = node.parentElement)
                    if (node instanceof HTMLDetailsElement)
                        node.open = true;
                void Vue.nextTick(() => field.focus());
            }
            async function toggleWebsite() { if (s.busy)
                return; if (s.websiteOpen && s.websiteInitial && JSON.stringify(websitePayload()) !== s.websiteInitial && !window.confirm('Fechar a configuração com alterações ainda não salvas? Os campos permanecem nesta tela, mas serão perdidos ao sair.'))
                return; s.websiteOpen = !s.websiteOpen; if (s.websiteOpen && !s.models.length)
                await loadSiteModels(); if (s.websiteOpen && !s.websiteInitial)
                s.websiteInitial = JSON.stringify(websitePayload()); }
            function move(items, index, delta) { const target = index + delta; if (target < 0 || target >= items.length)
                return; [items[index], items[target]] = [items[target], items[index]]; s.previewHtml = ''; }
            function removeSiteItem(items, index) { if (!window.confirm('Remover este item do rascunho? A publicação atual não será alterada até você publicar.'))
                return; items.splice(index, 1); s.previewHtml = ''; }
            async function loadSiteModels() { await run(async () => { const result = await transport('/schools/' + props.schoolId + '/website/models'); s.models = result.items; if (!selectedModel())
                s.modelChoice = ''; }); }
            function selectedModel() { return s.models.find(model => model.id === s.modelChoice); }
            function modelInput() { return JSON.stringify({ model_id: s.modelChoice, website: websitePayload() }); }
            function modelReady() { return Boolean(s.resolvedModel && s.modelPreviewInput === modelInput()); }
            function clearModelPreview() { previewAnchor = ''; s.resolvedModel = null; s.modelPreviewInput = ''; s.modelPreviewPage = ''; s.modelPreviewActive = false; s.previewHtml = ''; }
            function modelNewPages() { const existing = new Set(s.website.design?.pages.map(page => page.slug) || []); return s.resolvedModel?.design?.pages.filter(page => !existing.has(page.slug)) || []; }
            function modelRenames() { const proposed = selectedModel()?.website.design?.menu || []; const resolved = s.resolvedModel?.design?.menu || []; return proposed.flatMap((link, index) => resolved[index] && link.url !== resolved[index].url ? [link.url + ' → ' + resolved[index].url] : []); }
            async function previewModel() { if (!selectedModel()) {
                s.error = 'Carregue e escolha um modelo completo.';
                return;
            } await runPreview(async (signal, current) => { clearModelPreview(); const input = modelInput(); const result = await transport('/schools/' + props.schoolId + '/website/preview-model', { method: 'POST', signal, body: input }); if (!current())
                return; s.resolvedModel = result.website; s.modelPreviewInput = input; s.modelPreviewActive = true; s.previewHtml = result.html; s.notice = 'Prévia sem gravação: confira a página inicial curta, cada página interna e o mapa do menu antes de aplicar. Nenhum campo do seu rascunho foi alterado.'; }); }
            async function previewPage(slug, model) {
                if (model && !modelReady()) {
                    s.error = 'Gere novamente a prévia do modelo após editar o rascunho.';
                    return;
                }
                await runPreview(async (signal, current) => {
                    editorialCheck();
                    const website = model ? s.resolvedModel : websitePayload();
                    const path = '/schools/' + props.schoolId + '/website/preview' + (slug ? '?page=' + encodeURIComponent(slug) : '');
                    const result = await transport(path, { method: 'POST', signal, body: JSON.stringify(website) });
                    if (!current())
                        return;
                    s.modelPreviewActive = model;
                    s.modelPreviewPage = slug;
                    s.previewHtml = result.html;
                });
            }
            function previewDraftPage(event) {
                return previewPage(event.target.value, false);
            }
            function previewModelPage() { return previewPage(s.modelPreviewPage, true); }
            function bindPreviewLinks(event) {
                let frameDoc;
                try {
                    frameDoc = event.currentTarget.contentDocument;
                }
                catch {
                    return;
                }
                if (!frameDoc)
                    return;
                if (previewAnchor) {
                    frameDoc.getElementById(previewAnchor)?.scrollIntoView();
                    previewAnchor = '';
                }
                frameDoc.addEventListener('click', (click) => {
                    if (click.defaultPrevented || click.button !== 0)
                        return;
                    const href = click.target?.closest?.('a[href]')?.getAttribute('href');
                    if (!href)
                        return;
                    click.preventDefault();
                    if (s.busy)
                        return;
                    if (href.startsWith('#')) {
                        frameDoc.getElementById(href.slice(1))?.scrollIntoView();
                        return;
                    }
                    const match = /^\/([a-z][a-z0-9-]{0,59})?(?:#([a-zA-Z0-9_-]+))?$/.exec(href);
                    const website = s.modelPreviewActive ? s.resolvedModel : s.website;
                    if (!match || (match[1] && !website?.design?.pages.some(page => page.slug === match[1]))) {
                        s.notice = 'Este destino está fora das páginas da prévia privada.';
                        return;
                    }
                    previewAnchor = match[2] || '';
                    if ((match[1] || '') === s.modelPreviewPage && previewAnchor) {
                        frameDoc.getElementById(previewAnchor)?.scrollIntoView();
                        previewAnchor = '';
                        return;
                    }
                    void previewPage(match[1] || '', s.modelPreviewActive);
                });
            }
            async function applyModel() { if (!modelReady()) {
                await previewModel();
                if (modelReady())
                    s.notice = 'Confira o mapa e as páginas na prévia. Depois clique novamente em Aplicar para confirmar o rascunho.';
                return;
            } const added = modelNewPages(); const renamed = modelRenames(); if (!window.confirm('Aplicar ao rascunho a página inicial curta, ' + added.length + ' novas páginas completas e o novo menu? Todas as páginas atuais, identidade e endereços serão preservados.' + (renamed.length ? ' Endereços ajustados para evitar colisões: ' + renamed.join(', ') + '.' : '') + ' O site publicado NÃO muda. As páginas marcadas para inclusão só entrarão no ar após a ação Publicar site. A cópia original antes de testar modelos ficará salva na plataforma, inclusive após sair desta tela.'))
                return; await run(async () => { await transport('/schools/' + props.schoolId + '/website/apply-model', { method: 'POST', body: modelInput() }); await loadWebsite(); s.sitePageIndex = -1; s.demoConfirmed = false; clearModelPreview(); s.notice = 'Página inicial, novas páginas e menu salvos somente em rascunho. Páginas anteriores preservadas; cópia original durável disponível. Nada foi publicado.'; }); }
            async function restoreModelCheckpoint() { if (!s.hasModelCheckpoint || !window.confirm('Restaurar a cópia original antes de testar modelos no rascunho? O site publicado não muda.'))
                return; await run(async () => { await transport('/schools/' + props.schoolId + '/website/restore-model', { method: 'POST', body: JSON.stringify({ version: s.website.version }) }); await loadWebsite(); clearModelPreview(); s.sitePageIndex = -1; s.demoConfirmed = false; s.notice = 'Cópia original restaurada e salva no rascunho.'; }); }
            function markDemoReplaced() { if (!s.website.design || !window.confirm('Você revisou todos os textos e substituiu as fotografias demonstrativas? A publicação ainda exigirá a ação Publicar site.'))
                return; const hasDemoAssets = JSON.stringify(s.website.design).includes('/public/website-model-assets/'); if (hasDemoAssets) {
                s.error = 'Ainda há imagens demonstrativas. Substitua-as antes de concluir a revisão.';
                return;
            } s.website.design.demonstration = false; s.demoConfirmed = false; s.previewHtml = ''; }
            function editingPage() { return s.website.design?.pages[s.sitePageIndex] || null; }
            function contentSections() { return editingPage()?.sections || s.website.design?.sections || []; }
            function selectSitePage() { s.previewHtml = ''; }
            function addSitePage() { const d = s.website.design; if (!d || d.pages.length >= 20)
                return; let n = 1; while (d.pages.some(p => p.slug === 'pagina-' + n))
                n++; d.pages.push({ slug: 'pagina-' + n, title: 'Nova página', introduction: '', image: null, published: true, sections: [] }); s.sitePageIndex = d.pages.length - 1; s.previewHtml = ''; }
            function moveSitePage(delta) { const pages = s.website.design?.pages; if (!pages)
                return; const page = editingPage(); move(pages, s.sitePageIndex, delta); s.sitePageIndex = page ? pages.indexOf(page) : -1; }
            function removeSitePage() { const d = s.website.design, p = editingPage(); if (!d || !p || !window.confirm('Remover esta página do rascunho? Links do menu para ela também serão retirados. Revise botões e outros links antes de publicar.'))
                return; d.pages.splice(s.sitePageIndex, 1); d.menu = d.menu.filter(link => link.url.split(/[?#]/)[0] !== '/' + p.slug); s.sitePageIndex = -1; s.previewHtml = ''; }
            function addPageToMenu() { const d = s.website.design, p = editingPage(); if (!d || !p || d.menu.length >= 8)
                return; if (!p.published) {
                s.error = 'Marque a página para publicação antes de adicioná-la ao menu.';
                return;
            } if (!d.menu.some(link => link.url === '/' + p.slug))
                d.menu.push({ label: p.title.slice(0, 80), url: '/' + p.slug }); s.previewHtml = ''; }
            function addSection() { const d = s.website.design, sections = contentSections(); if (!d || sections.length >= 20)
                return; if (!editingPage())
                d.configured = true; let n = 1; while (sections.some(x => x.id === 'secao-' + n))
                n++; sections.push({ id: 'secao-' + n, kind: s.sectionKind, visible: true, eyebrow: '', title: '', text: '', image: null, action: null, items: [] }); s.previewHtml = ''; }
            function inheritBrand() { if (!window.confirm('Restaurar a identidade herdada do PIGE neste rascunho?'))
                return; s.website.brand = { display_name: '', primary_color: '', secondary_color: '', font_family: '' }; s.previewHtml = ''; }
            function editorialCheck() { if (/^(https?:\/\/|www\.)/i.test(s.website.headline.trim()))
                throw new Error('Use um título na chamada principal. Informe a URL no endereço do botão.'); }
            function admissionReasonLabel(reason) { return { not_published: 'não publicado', not_started: 'abertura futura', closed: 'prazo encerrado', no_active_groups: 'sem turma ativa', inactive_school: 'unidade inativa' }[reason] || reason; }
            async function saveWebsite() { await run(async () => { await transport('/schools/' + props.schoolId + '/website/draft', { method: 'PUT', body: JSON.stringify(websitePayload()) }); await loadWebsite(); s.notice = 'Rascunho salvo. A versão pública permanece a mesma até você publicar.'; }); }
            async function publishWebsite() { if (s.website.design?.demonstration && !s.demoConfirmed) {
                s.error = 'Confirme explicitamente a publicação de conteúdo demonstrativo ou substitua e revise os exemplos.';
                return;
            } if (!window.confirm(s.website.design?.demonstration ? 'Publicar EXEMPLOS DEMONSTRATIVOS com identificação visível?' : 'Publicar este conteúdo no site da escola?'))
                return; await run(async () => { editorialCheck(); await transport('/schools/' + props.schoolId + '/website/draft', { method: 'PUT', body: JSON.stringify(websitePayload()) }); await loadWebsite(); await transport('/schools/' + props.schoolId + '/website/publish', { method: 'POST', body: JSON.stringify({ version: s.website.version, confirm_demonstration: s.demoConfirmed }) }); await loadWebsite(); s.notice = 'Site publicado com sucesso.'; }); }
            function previewWebsite() { previewAnchor = ''; return previewPage(editingPage()?.slug || '', false); }
            async function unpublishWebsite() { if (!window.confirm('Retirar o site do ar? O conteúdo será preservado em rascunho.'))
                return; await run(async () => { await transport('/schools/' + props.schoolId + '/website/unpublish', { method: 'POST', body: JSON.stringify(websitePayload()) }); await loadWebsite(); s.notice = 'Site retirado da publicação. Rascunho preservado.'; }); }
            async function search() { s.page = 1; await run(load); }
            async function page(delta) { s.page += delta; await run(load); }
            function open(post) { s.selected = post; s.error = ''; }
            function editorStepSummary() { return editorSteps.find(step => step.id === s.editorStep)?.description || ''; }
            function setEditorStep(step) {
                if (!editorSteps.some(item => item.id === step))
                    return;
                s.editorStep = step;
                void Vue.nextTick(() => { const field = document.querySelector('.community-editor [data-editor-step="' + step + '"]'); field?.scrollIntoView?.({ block: 'start' }); });
            }
            function nextEditorStep() { const index = editorSteps.findIndex(step => step.id === s.editorStep); if (index < editorSteps.length - 1)
                setEditorStep(editorSteps[index + 1].id); }
            function previousEditorStep() { const index = editorSteps.findIndex(step => step.id === s.editorStep); if (index > 0)
                setEditorStep(editorSteps[index - 1].id); }
            function edit(post) {
                s.form = post ? { image: post.image ? { ...post.image } : null, id: post.id, version: post.version || 1, title: post.title, summary: post.summary, content: post.content, kind: post.kind, audience: post.audience, status: post.status || 'draft', pinned: post.pinned, publish_at: local(post.publish_at), expires_at: local(post.expires_at), event_start: local(post.event_start), event_end: local(post.event_end), location: post.location } : empty();
                s.savedPostStatus = post?.status || '';
                s.initial = JSON.stringify(s.form);
                s.editing = true;
                s.editorStep = 'content';
                s.discard = false;
                s.deleteConfirm = false;
                s.selected = null;
                s.error = '';
            }
            function prepareUnpublish() {
                if (s.busy || s.savedPostStatus !== 'published')
                    return;
                s.form.status = 'draft';
                setEditorStep('publish');
            }
            function canDeleteDraft() {
                return Boolean(s.form.id) && s.savedPostStatus === 'draft' && s.form.status === 'draft';
            }
            function postSaveLabel() {
                if (s.form.status === 'published')
                    return 'Salvar e publicar';
                if (s.form.status === 'archived')
                    return 'Salvar como arquivado';
                if (s.savedPostStatus === 'published')
                    return 'Confirmar despublicação';
                return 'Salvar publicação';
            }
            function revealInvalidPostField(event) {
                const field = event.target;
                const panel = field.closest('[data-editor-step]');
                const step = editorSteps.find(item => item.id === panel?.dataset.editorStep);
                if (step) {
                    setEditorStep(step.id);
                    void Vue.nextTick(() => field.focus());
                }
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
            async function remove() { await run(async () => { if (!s.deleteConfirm || !canDeleteDraft())
                return; await transport('/schools/' + props.schoolId + '/community-posts/' + s.form.id + '?version=' + s.form.version, { method: 'DELETE' }); s.editing = false; await load(); s.notice = 'Rascunho excluído.'; }); }
            const scheduled = (post) => post.status === 'published' && Boolean(post.publish_at) && new Date(post.publish_at) > new Date();
            const expired = (post) => Boolean(post.expires_at) && new Date(post.expires_at) <= new Date();
            const paragraphs = (value) => value.split(/\n\s*\n/).filter(Boolean);
            let handledRequest = 0;
            function openRequestedSite() {
                const request = props.websiteRequest || 0;
                if (!manage() || !request || request === handledRequest || s.busy)
                    return;
                handledRequest = request;
                if (!s.websiteOpen)
                    void toggleWebsite();
            }
            Vue.watch(() => props.websiteRequest, openRequestedSite);
            Vue.watch(() => s.busy, openRequestedSite);
            Vue.onMounted(() => { void run(async () => { await load(); await loadWebsite(); }).then(openRequestedSite); });
            return { dialogTarget: Vue.inject('school-dialog-host', 'body') || 'body', siteGuides, editorSteps, openModelPreview, revealInvalidSiteField, s, props, manage, run, load, toggleWebsite, loadSiteAssets, loadAdmissionReadiness, removeSiteAsset, uploadSiteImage, move, removeSiteItem, addSection, loadSiteModels, selectedModel, modelReady, clearModelPreview, modelNewPages, modelRenames, previewModel, previewDraftPage, previewModelPage, bindPreviewLinks, closePreview, applyModel, restoreModelCheckpoint, markDemoReplaced, editingPage, contentSections, selectSitePage, addSitePage, moveSitePage, removeSitePage, addPageToMenu, inheritBrand, newImage, newLink, newItem, sectionLabels, saveWebsite, publishWebsite, previewWebsite, unpublishWebsite, search, page, open, edit, closeEditor, save, remove, date, audienceLabels, statusLabels, scheduled, expired, paragraphs, prepareUnpublish, canDeleteDraft, postSaveLabel, revealInvalidPostField, admissionReasonLabel, editorStepSummary, setEditorStep, nextEditorStep, previousEditorStep };
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
            if (next.closest('.school-task') && !next.querySelector('[data-task-minimize]') && !next.querySelector('video') && !next.closest('.camera-dialog')) {
                const header = next.querySelector('.modal-header');
                if (header) {
                    const minimize = document.createElement('button');
                    minimize.type = 'button';
                    minimize.className = 'btn task-minimize';
                    minimize.dataset.taskMinimize = '';
                    minimize.textContent = 'Minimizar';
                    minimize.title = 'Manter o formulário aberto e voltar às guias';
                    minimize.onclick = () => {
                        const backdrop = next.closest('.modal-backdrop');
                        if (!backdrop)
                            return;
                        backdrop.dataset.taskPaused = '';
                        document.dispatchEvent(new Event('pige-pause-form'));
                    };
                    header.appendChild(minimize);
                }
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
        new MutationObserver(update).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-task-paused'] });
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
