"use strict";
var PigeDialogs;
(function (PigeDialogs) {
    let contextVersion = 0;
    let pending;
    function cancelPending() { contextVersion++; pending?.cancel(); }
    PigeDialogs.cancelPending = cancelPending;
    function ask(kind, message, options) {
        // Um segundo acionamento não pode aproveitar a decisão do primeiro.
        if (pending) {
            if (kind !== 'alert')
                return Promise.resolve(null);
            if (pending.kind === 'alert' && pending.message === message)
                return pending.closed.then(() => null);
            const version = contextVersion;
            return pending.closed.then(() => version === contextVersion ? ask(kind, message, options) : null);
        }
        const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const host = document.createElement('div');
        document.body.appendChild(host);
        const minimum = Math.max(0, options.minLength || 0);
        const maximum = options.maxLength;
        const state = Vue.reactive({ value: options.initialValue || '', error: '' });
        let signalClosed;
        const closed = new Promise(resolve => { signalClosed = resolve; });
        return new Promise(resolve => {
            function finish(accepted) {
                if (pending?.cancel !== cancel)
                    return;
                if (accepted && kind !== 'alert' && opener && !opener.isConnected)
                    accepted = false;
                if (accepted && kind === 'prompt' && state.value.trim().length < minimum) {
                    state.error = 'Informe pelo menos ' + minimum + (minimum === 1 ? ' caractere.' : ' caracteres.');
                    dialog.querySelector('textarea')?.focus();
                    return;
                }
                if (accepted && kind === 'prompt' && maximum !== undefined && state.value.length > maximum) {
                    state.error = 'Use no máximo ' + maximum + (maximum === 1 ? ' caractere.' : ' caracteres.');
                    dialog.querySelector('textarea')?.focus();
                    return;
                }
                pending = undefined;
                window.removeEventListener('pagehide', cancelPending);
                window.removeEventListener('popstate', cancelPending);
                window.removeEventListener('hashchange', cancelPending);
                dialog.close();
                app.unmount();
                host.remove();
                if (opener?.isConnected)
                    opener.focus({ preventScroll: true });
                resolve(accepted ? (kind === 'prompt' ? state.value : 'ok') : null);
                signalClosed();
            }
            const cancel = () => finish(false);
            const app = Vue.createApp({ render: PigeRenders.actionDialog, setup: () => ({
                    kind, message, minimum, maximum, state, finish,
                    title: options.title || ({ confirm: 'Confirmar ação', alert: 'Aviso', prompt: 'Informe um valor' })[kind],
                    inputLabel: options.inputLabel || 'Resposta',
                    confirmLabel: options.confirmLabel || (kind === 'alert' ? 'Entendi' : 'Confirmar'),
                    cancelLabel: options.cancelLabel || 'Voltar', destructive: Boolean(options.destructive),
                }) });
            app.mount(host);
            const dialog = host.querySelector('dialog');
            dialog.addEventListener('keydown', event => {
                if (event.key !== 'Tab')
                    return;
                const controls = dialog.querySelectorAll('button,textarea');
                const first = controls[0], last = controls[controls.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                }
                if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            });
            pending = { cancel, closed, kind, message };
            window.addEventListener('pagehide', cancelPending);
            window.addEventListener('popstate', cancelPending);
            window.addEventListener('hashchange', cancelPending);
            dialog.showModal();
            const selector = kind === 'prompt' ? 'textarea' : kind === 'alert' ? '[type="submit"]' : '[data-dialog-back]';
            dialog.querySelector(selector)?.focus({ preventScroll: true });
        });
    }
    async function confirm(message, options = {}) {
        return await ask('confirm', message, options) !== null;
    }
    PigeDialogs.confirm = confirm;
    async function alert(message, options = {}) {
        await ask('alert', message, options);
    }
    PigeDialogs.alert = alert;
    function prompt(message, options = {}) {
        return ask('prompt', message, options);
    }
    PigeDialogs.prompt = prompt;
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
            if (pending)
                return;
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
            if (!current || pending)
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
        document.addEventListener('focusin', event => { if (!pending && current && !current.contains(event.target))
            current.querySelector('[data-dialog-title],button')?.focus(); });
        update();
    }
    PigeDialogs.install = install;
})(PigeDialogs || (PigeDialogs = {}));
/** Utiliza a própria lista do menu no painel lateral. Os links conservam ordem, filtros de acesso e ação. */
var PigeSidebarRail;
(function (PigeSidebarRail) {
    function use(collapsed) {
        const media = window.matchMedia?.('(width > 800px)');
        const state = Vue.reactive({ desktop: media?.matches ?? true, active: '' });
        const brand = Vue.reactive({ failed: '', wide: '' });
        let trigger = null, panel = null, pinned = false, suppressFocus = false;
        let leaveTimer;
        const enabled = () => state.desktop && collapsed();
        function brandLoad(e) { const img = e.currentTarget; brand.failed = ''; brand.wide = img.naturalWidth >= 2 * img.naturalHeight ? img.getAttribute('src') || '' : ''; }
        function brandError(e) { brand.failed = e.currentTarget.getAttribute('src') || ''; brand.wide = ''; }
        function cancelLeave() { if (leaveTimer !== undefined) {
            window.clearTimeout(leaveTimer);
            leaveTimer = undefined;
        } }
        function inside(node) { return Boolean(node instanceof Node && (trigger?.contains(node) || panel?.contains(node))); }
        function outside(e) { if (!inside(e.target))
            close(); }
        function dismiss(e) { if (e.key === 'Escape' && trigger) {
            e.preventDefault();
            e.stopPropagation();
            close(true);
        } }
        function scroll(e) { if (!panel?.contains(e.target))
            position(); }
        function listen(add) {
            const method = add ? 'addEventListener' : 'removeEventListener';
            document[method]('pointerdown', outside, true);
            document[method]('focusin', outside, true);
            document[method]('keydown', dismiss, true);
            document[method]('scroll', scroll, true);
            window[method]('resize', position);
        }
        function close(returnFocus = false) {
            cancelLeave();
            const old = trigger;
            if (trigger)
                listen(false);
            if (panel?.hidePopover && panel.matches(':popover-open'))
                panel.hidePopover();
            trigger = null;
            panel = null;
            pinned = false;
            state.active = '';
            if (returnFocus && old?.isConnected) {
                suppressFocus = true;
                old.focus({ preventScroll: true });
                suppressFocus = false;
            }
        }
        function position() {
            if (!trigger || !panel)
                return;
            const nav = trigger.closest('aside'), viewport = trigger.closest('.sidebar-scroll,.family-sidebar-scroll');
            if (!nav || !viewport || !trigger.isConnected || !enabled()) {
                close();
                return;
            }
            const button = trigger.getBoundingClientRect(), bounds = viewport.getBoundingClientRect();
            if (button.bottom <= bounds.top || button.top >= bounds.bottom) {
                close();
                return;
            }
            const left = Math.ceil(nav.getBoundingClientRect().right) + 4;
            const top = Math.max(8, Math.min(button.top, window.innerHeight - 8 - panel.getBoundingClientRect().height));
            panel.style.setProperty('--rail-flyout-left', left + 'px');
            panel.style.setProperty('--rail-flyout-top', Math.round(top) + 'px');
        }
        function launcher(target) { return target instanceof Element ? target.closest('[data-rail-trigger]') : null; }
        function items() { return Array.from(panel?.querySelectorAll('a[href],button:not(:disabled)') || []).filter(el => el.getClientRects().length); }
        function open(button, focusFirst = false) {
            if (!enabled())
                return;
            cancelLeave();
            if (button !== trigger) {
                close();
                const group = button.parentElement?.querySelector('.sidebar-flyout');
                if (!group)
                    return;
                trigger = button;
                panel = group;
                state.active = group.id;
                listen(true);
            }
            const current = panel;
            void Vue.nextTick(() => {
                if (trigger !== button || panel !== current || !current?.isConnected)
                    return;
                // O top layer do navegador deixa o painel escapar do recorte da rolagem da barra.
                if (current.showPopover && !current.matches(':popover-open'))
                    current.showPopover();
                position();
                if (focusFirst && trigger === button)
                    items()[0]?.focus({ preventScroll: true });
            });
        }
        function pointerover(e) {
            if (e.pointerType === 'touch' || !enabled())
                return;
            const btn = launcher(e.target);
            if (btn)
                open(btn);
            else if (inside(e.target))
                cancelLeave();
        }
        function pointerout(e) {
            if (!trigger || e.pointerType === 'touch' || pinned || inside(e.relatedTarget) || panel?.contains(document.activeElement))
                return;
            cancelLeave();
            leaveTimer = window.setTimeout(() => close(), 180);
        }
        function focusin(e) { const btn = launcher(e.target); if (!suppressFocus && btn)
            open(btn);
        else if (inside(e.target))
            cancelLeave(); }
        function click(e) {
            if (!enabled())
                return;
            const btn = launcher(e.target);
            if (btn) {
                if (btn === trigger && pinned) {
                    close();
                    return;
                }
                open(btn, e.detail === 0);
                pinned = true;
            }
            else if (panel?.contains(e.target))
                close();
        }
        function keydown(e) {
            if (!enabled())
                return;
            const btn = launcher(e.target);
            if (e.key === 'Escape' && trigger) {
                e.preventDefault();
                e.stopPropagation();
                close(true);
                return;
            }
            if (btn && ['ArrowRight', 'ArrowDown'].includes(e.key)) {
                e.preventDefault();
                open(btn, true);
                return;
            }
            if (!panel?.contains(e.target))
                return;
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                close(true);
                return;
            }
            const links = items(), n = links.length, index = links.indexOf(e.target);
            if (!n || index < 0)
                return;
            const to = { ArrowDown: (index + 1) % n, ArrowUp: (index + n - 1) % n, Home: 0, End: n - 1 }[e.key];
            if (to !== undefined) {
                e.preventDefault();
                links[to].focus();
            }
        }
        function changeViewport() { close(); state.desktop = media?.matches ?? true; }
        function mount() { changeViewport(); media?.addEventListener('change', changeViewport); }
        function dispose() { close(); media?.removeEventListener('change', changeViewport); }
        return { state, brand, enabled, close, mount, dispose, brandLoad, brandError, events: { pointerover, pointerout, focusin, keydown, click } };
    }
    PigeSidebarRail.use = use;
})(PigeSidebarRail || (PigeSidebarRail = {}));
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
    function orderPeriod(a, b) {
        return (a.order_index ?? 0) - (b.order_index ?? 0) || (a.starts_on || '').localeCompare(b.starts_on || '') || a.period_id.localeCompare(b.period_id);
    }
    // Um diário pertence a uma turma de origem; nomes iguais podem identificar diários distintos.
    function matrices(groups, calendars, filtered) {
        const classes = new Map();
        for (const group of groups) {
            let matrix = classes.get(group.classId);
            if (!matrix) {
                const periods = new Map();
                if (!filtered)
                    for (const period of calendars?.[group.classId] || [])
                        periods.set(period.period_id, period);
                matrix = { className: group.className, periods, components: new Map(), published: new Set() };
                classes.set(group.classId, matrix);
            }
            for (const item of group.items) {
                matrix.periods.set(item.period_id, item);
                matrix.published.add(item.period_id);
                const key = JSON.stringify([item.diary_id, item.component_name]);
                const component = matrix.components.get(key) || { id: key, name: item.component_name, results: new Map() };
                component.results.set(item.period_id, item);
                matrix.components.set(key, component);
            }
        }
        const windows = [];
        for (const [classId, matrix] of classes) {
            const periods = Array.from(matrix.periods.values()).sort(orderPeriod);
            const components = Array.from(matrix.components.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
            for (let start = 0; start < periods.length; start += 4) {
                const window = periods.slice(start, start + 4);
                windows.push({ key: JSON.stringify([classId, window[0].period_id]), className: matrix.className, periods: window,
                    periodLabel: window.map(p => p.period_name).join(', '), rows: components.map(component => ({
                        id: component.id, name: component.name, cells: window.map(p => ({
                            period: p, result: component.results.get(p.period_id), empty: matrix.published.has(p.period_id) ? 'Sem resultado publicado' : 'Não publicado',
                        })),
                    })) });
            }
        }
        return windows;
    }
    PigeLearning.component = { props: ['request', 'download', 'rootPath', 'schoolId', 'studentId', 'identity'], render: PigeRenders.learning, setup(props) {
            const state = Vue.reactive({ busy: false, error: '', students: [], studentId: '', enrollmentId: '', groupId: '', note: '' });
            const base = () => (props.rootPath || '/profile') + '/learning';
            const student = () => state.students.find(s => s.student_id === state.studentId);
            const enrollment = () => student()?.enrollments.find(e => e.enrollment_id === state.enrollmentId);
            function selectStudent() {
                const enrollments = student()?.enrollments || [];
                state.enrollmentId = (enrollments.find(item => item.status === 'active') || enrollments[0])?.enrollment_id || '';
                state.groupId = '';
            }
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
            const periodGroups = Vue.computed(() => {
                const groups = new Map();
                for (const subject of enrollment()?.subjects || []) {
                    for (const period of subject.periods) {
                        const className = period.class_label || period.class_name || enrollment()?.class_name || '';
                        const classId = period.class_group_id || className;
                        const id = JSON.stringify([period.period_id, classId]);
                        const group = groups.get(id) || { id, label: period.period_name, classId, className, items: [] };
                        group.items.push({ ...period, component_name: period.component_name || subject.component_name, diary_id: subject.diary_id });
                        groups.set(id, group);
                    }
                }
                return Array.from(groups.values()).sort((a, b) => orderPeriod(a.items[0], b.items[0]) || a.className.localeCompare(b.className, 'pt-BR'));
            });
            const visibleGroups = Vue.computed(() => periodGroups.value.filter(group => !state.groupId || group.id === state.groupId));
            const model = Vue.computed(() => enrollment()?.bulletin_model || 'integrated');
            const tables = Vue.computed(() => matrices(visibleGroups.value, enrollment()?.class_calendars, Boolean(state.groupId)));
            const tableKinds = Vue.computed(() => model.value === 'panel' ? ['grade', 'attendance'] : [model.value]);
            const titles = { integrated: 'Rendimento e frequência', grade: 'Rendimento por componente', attendance: 'Aulas, faltas e frequência', journey: 'Percurso por componente' };
            const modelNames = { integrated: 'Grade integrada', panel: 'Painel do aluno', journey: 'Percurso acadêmico' };
            const fonts = { system: 'system-ui, sans-serif', arial: 'Arial, sans-serif', verdana: 'Verdana, sans-serif', georgia: 'Georgia, serif', times: 'Times New Roman, serif' };
            const facts = Vue.computed(() => {
                const e = enrollment();
                return [['Registro escolar', student()?.student_number], ['Matrícula', e?.number], ['Ano letivo', e?.year_name], ['Etapa', e?.stage], ['Unidade', e?.unit], ['Turno', e?.shift]].filter(([, value]) => value);
            });
            const uniformStatus = Vue.computed(() => {
                const values = new Set(visibleGroups.value.flatMap(group => group.items.map(item => item.result_label)));
                return values.size === 1 ? Array.from(values)[0] : '';
            });
            const opinions = Vue.computed(() => visibleGroups.value.flatMap(group => group.items.filter(item => item.opinions?.length)));
            const percent = (value) => value === null || value === undefined ? 'Não apurada' : Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%';
            async function download(documentId = '') { await run(async () => { if (!student() || !enrollment())
                return; await props.download(base() + '/' + encodeURIComponent(state.studentId) + '/report.pdf?enrollment_id=' + encodeURIComponent(state.enrollmentId) + (documentId ? '&document_id=' + encodeURIComponent(documentId) : '') + (props.schoolId ? '&school_id=' + encodeURIComponent(props.schoolId) : ''), 'boletim-' + student().student_number + '.pdf'); }); }
            Vue.onMounted(() => { void load(); });
            return { props, state, student, enrollment, selectStudent, model, modelNames, fonts, facts, periodGroups, visibleGroups, tables, tableKinds, titles, uniformStatus, opinions, percent, load, download };
        } };
})(PigeLearning || (PigeLearning = {}));
var PigeSupport;
(function (PigeSupport) {
    const runtime = window;
    PigeSupport.status = Vue.reactive({ error: '', canOpen: false });
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
    function launcher() { return document.querySelector?.('button#hub-bubble-holder, #hub-bubble-holder button, #hub-bubble-holder[role="button"]'); }
    function checkLauncher() { PigeSupport.status.canOpen = Boolean(activeSDK && !checkingArea && runtime.$hub?.hasLoaded && (typeof runtime.$hub.toggle === 'function' || launcher())); }
    function openChat() {
        checkLauncher();
        if (!PigeSupport.status.canOpen)
            return;
        if (typeof runtime.$hub?.toggle === 'function')
            runtime.$hub.toggle('open');
        else
            launcher()?.click();
    }
    PigeSupport.openChat = openChat;
    function setChecking(checking) {
        checkingArea = checking;
        checkLauncher();
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
        checkLauncher();
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
        PigeSupport.status.canOpen = false;
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
            state.confirmCancel = false;
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
        async function cancel() {
            const authorization = state.view?.authorization;
            if (!student() || state.busy || state.confirmCancel || !authorization || !['ACTIVE', 'CREATED'].includes(authorization.status))
                return;
            const charge = state.id, sid = student(), current = epoch, version = authorization.version;
            state.confirmCancel = true;
            try {
                const approved = await PigeDialogs.confirm('Os próximos débitos serão interrompidos. Pagamentos já enviados dependem de confirmação bancária.', { title: 'Cancelar autorização do Pix Automático?', confirmLabel: 'Confirmar cancelamento', cancelLabel: 'Manter autorização', destructive: true });
                if (!approved || current !== epoch || sid !== student() || charge !== state.id || authorization !== state.view?.authorization ||
                    version !== authorization.version || !['ACTIVE', 'CREATED'].includes(authorization.status))
                    return;
                state.confirmCancel = false;
                await send(charge, 'cancel', { version });
            }
            finally {
                if (current === epoch)
                    state.confirmCancel = false;
            }
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
var PigePortalProtocols;
(function (PigePortalProtocols) {
    const categories = { secretaria: 'Secretaria', pedagogico: 'Pedagógico', financeiro: 'Financeiro', tecnico: 'Suporte técnico' };
    const statuses = { open: 'Aberto', in_progress: 'Em atendimento', waiting: 'Aguardando', completed: 'Concluído', cancelled: 'Cancelado' };
    const channels = { portal: 'No portal', email: 'E-mail', whatsapp: 'WhatsApp' };
    const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    const date = (value) => value && Number.isFinite(Date.parse(value)) ? dateFormatter.format(new Date(value)) : '';
    const blank = () => ({ category: 'secretaria', subject: '', message: '', channel: 'portal', file: null });
    PigePortalProtocols.component = { props: ['area', 'schoolId', 'studentId', 'academic', 'financial', 'request', 'download'], render: PigeRenders.portalProtocols, setup(props) {
            const s = Vue.reactive({ view: 'list', busy: false, error: '', notice: '', items: [], ticket: null,
                query: '', term: '', page: 1, pageSize: 20, total: 0, form: blank(), fileVersion: 0, options: { channels: ['portal'] }, optionsError: '', openingChannel: 'portal' });
            const availableCategories = Vue.computed(() => Object.keys(categories).filter(key => key === 'financeiro' ? props.area === 'family' && props.financial :
                key !== 'pedagogico' || props.area === 'teacher' || props.academic !== false));
            const dirty = () => Boolean(s.form.message || s.form.file || (s.view === 'detail' && s.ticket && s.form.channel !== s.ticket.preferred_channel) || (s.view === 'new' && (s.form.subject || s.form.category !== 'secretaria' || s.form.channel !== 'portal')));
            const closed = () => ['completed', 'cancelled'].includes(s.ticket?.status || '');
            const base = '/' + props.area + '/schools/' + encodeURIComponent(props.schoolId) + '/protocols';
            const path = (id) => base + '/' + encodeURIComponent(id);
            const controller = new AbortController();
            let active = true, waitingForDiscard = false, optionsVersion = 0, clientKey = '', lastPayload = '', lastFile = null;
            function reset() { s.form = blank(); s.fileVersion++; clientKey = ''; lastPayload = ''; lastFile = null; }
            function displayError(e) { return e instanceof Error ? e.message : 'Não foi possível concluir a solicitação.'; }
            async function discard() {
                if (waitingForDiscard)
                    return false;
                waitingForDiscard = true;
                const form = s.form, view = s.view, ticket = s.ticket?.id;
                const { subject, category, channel, message, file } = form;
                const approved = await PigeDialogs.confirm('O texto, o anexo e as alterações ainda não enviados serão descartados.', {
                    title: 'Descartar a edição do protocolo?', confirmLabel: 'Descartar edição', cancelLabel: 'Voltar', destructive: true
                });
                waitingForDiscard = false;
                return approved && active && !s.busy && s.form === form && s.view === view && s.ticket?.id === ticket &&
                    subject === form.subject && category === form.category && channel === form.channel && message === form.message && file === form.file;
            }
            function focusTitle() { void Vue.nextTick(() => { if (active)
                document.getElementById('portal-protocol-title')?.focus(); }); }
            async function run(work) {
                if (s.busy || !active)
                    return;
                s.busy = true;
                s.error = '';
                s.notice = '';
                try {
                    await work();
                }
                catch (e) {
                    if (active) {
                        s.error = displayError(e);
                        if ([403, 404].includes(e?.status || 0)) {
                            reset();
                            s.ticket = null;
                            s.items = [];
                            s.total = 0;
                            s.view = 'list';
                        }
                    }
                }
                finally {
                    if (active)
                        s.busy = false;
                }
            }
            function applyOptions(data) {
                const allowed = Object.keys(channels).filter(key => key === 'portal' || data.channels.includes(key));
                const opening = data.opening_channel === undefined ? undefined : allowed.includes(data.opening_channel) ? data.opening_channel : 'portal';
                s.options = { ...data, channels: allowed, opening_channel: opening };
                s.openingChannel = opening || 'portal';
                s.optionsError = '';
            }
            async function options() {
                const version = ++optionsVersion;
                try {
                    const data = await props.request(base + '/options', { signal: controller.signal });
                    if (active && version === optionsVersion)
                        applyOptions(data);
                }
                catch (e) {
                    if (active && version === optionsVersion) {
                        s.options = { channels: ['portal'] };
                        s.optionsError = displayError(e);
                    }
                }
            }
            async function saveOpeningChannel() {
                if (!s.options.opening_channel || !s.options.channels.includes(s.openingChannel))
                    return;
                await run(async () => {
                    const version = ++optionsVersion;
                    const data = await props.request(base + '/opening-channel', { method: 'PUT', body: JSON.stringify({ preferred_channel: s.openingChannel }), signal: controller.signal });
                    if (active && version === optionsVersion) {
                        applyOptions(data);
                        s.notice = 'Preferência de avisos para novos protocolos da escola salva.';
                    }
                });
            }
            const whatsappUrl = Vue.computed(() => {
                const line = s.options.whatsapp_contact;
                if (!line || !/^[1-9]\d{7,14}$/.test(line) || !s.ticket || closed() || !/^PRO-\d+$/.test(s.ticket.number))
                    return '';
                return 'https://wa.me/' + line + '?' + new URLSearchParams({ text: 'Olá, quero falar sobre o protocolo ' + s.ticket.number }).toString();
            });
            async function list(page = 1, search = false) {
                if (s.busy || !active || (dirty() && !await discard()))
                    return;
                const term = search ? s.query.trim() : s.term;
                await run(async () => {
                    const params = new URLSearchParams({ page: String(page) });
                    if (props.studentId)
                        params.set('student_id', props.studentId);
                    if (term)
                        params.set('q', term);
                    const data = await props.request(base + '?' + params, { signal: controller.signal });
                    if (!active)
                        return;
                    const changed = s.view !== 'list';
                    s.view = 'list';
                    s.ticket = null;
                    reset();
                    s.items = data.items;
                    s.total = data.total;
                    s.page = data.page;
                    s.pageSize = data.page_size;
                    s.term = term;
                    if (changed)
                        focusTitle();
                });
            }
            function showNew() { if (s.busy || (props.area === 'family' && !props.studentId))
                return; reset(); s.view = 'new'; s.ticket = null; s.error = ''; s.notice = ''; focusTitle(); }
            function showTicket(data) { reset(); s.ticket = data; s.form.channel = data.preferred_channel; s.view = 'detail'; }
            async function open(id) {
                if (s.busy || !active || (dirty() && !await discard()))
                    return;
                await run(async () => { const data = await props.request(path(id), { signal: controller.signal }); if (active) {
                    showTicket(data);
                    focusTitle();
                } });
            }
            function chooseFile(event) { s.form.file = event.target.files?.[0] || null; }
            async function copyNumber() {
                const ticket = s.ticket;
                if (!ticket)
                    return;
                try {
                    await navigator.clipboard.writeText(ticket.number);
                    if (active && ticket.id === s.ticket?.id)
                        s.notice = 'Número do protocolo copiado.';
                }
                catch {
                    if (active && ticket.id === s.ticket?.id)
                        s.notice = 'Selecione o número ' + ticket.number + ' no cabeçalho para copiá-lo.';
                }
            }
            async function send() {
                const creating = s.view === 'new';
                if ((!creating && (!s.ticket || closed())) || s.busy)
                    return;
                await run(async () => {
                    const message = s.form.message.trim(), subject = s.form.subject.trim();
                    if (message.length < 3 || (creating && subject.length < 2))
                        throw new Error('Informe ao menos dois caracteres no assunto e três na mensagem.');
                    if (s.form.file && s.options.max_attachment_mb && s.form.file.size > s.options.max_attachment_mb * 1024 * 1024)
                        throw new Error('O anexo ultrapassa o limite de ' + s.options.max_attachment_mb + ' MB.');
                    const body = new FormData();
                    body.set('message', message);
                    if (creating) {
                        body.set('subject', subject);
                        body.set('category', s.form.category);
                        body.set('preferred_channel', s.form.channel);
                        if (props.studentId)
                            body.set('student_id', props.studentId);
                    }
                    const target = creating ? base : path(s.ticket.id) + '/messages';
                    const payload = JSON.stringify(creating ? [target, message, subject, s.form.category, s.form.channel] : [target, message]);
                    if (!clientKey || payload !== lastPayload || s.form.file !== lastFile) {
                        clientKey = crypto.randomUUID();
                        lastPayload = payload;
                        lastFile = s.form.file;
                    }
                    body.set('client_key', clientKey);
                    if (s.form.file)
                        body.set('file', s.form.file);
                    const data = await props.request(target, { method: 'POST', body, signal: controller.signal });
                    if (active) {
                        showTicket(data);
                        s.notice = creating ? 'Protocolo ' + data.number + ' aberto.' : 'Resposta registrada.';
                        if (creating)
                            focusTitle();
                    }
                });
            }
            async function changeChannel() {
                const ticket = s.ticket;
                if (!ticket || closed() || !s.options.channels.includes(s.form.channel) || ticket.preferred_channel === s.form.channel)
                    return;
                await run(async () => {
                    const data = await props.request(path(ticket.id) + '/channel', { method: 'PATCH', body: JSON.stringify({ preferred_channel: s.form.channel }), signal: controller.signal });
                    if (active) {
                        s.ticket = data;
                        s.form.channel = data.preferred_channel;
                        s.notice = 'Preferência de avisos atualizada.';
                    }
                });
            }
            async function attachment(file) {
                const ticket = s.ticket;
                if (ticket && file)
                    await run(() => props.download(path(ticket.id) + '/attachments/' + encodeURIComponent(file.id), file.name));
            }
            Vue.onMounted(() => { void options(); void list(); });
            Vue.onUnmounted(() => { active = false; if (waitingForDiscard)
                PigeDialogs.cancelPending(); controller.abort(); reset(); });
            return { s, props, availableCategories, categories, statuses, channels, closed, dirty, date, options, saveOpeningChannel, whatsappUrl, list, showNew, open, chooseFile, copyNumber, send, changeChannel, attachment, chat: PigeSupport.status, openChat: PigeSupport.openChat };
        } };
})(PigePortalProtocols || (PigePortalProtocols = {}));
/** Caixa pessoal já vinculada à conta escolar. O SOGo autentica pelo proxy da própria origem. */
var PigePortalMail;
(function (PigePortalMail) {
    const base = (school) => '/schools/' + encodeURIComponent(school) + '/email';
    function use(request) {
        const state = Vue.reactive({ available: false });
        let version = 0;
        function clear() { version++; state.available = false; }
        async function load(school) {
            clear();
            const current = version;
            if (!school)
                return;
            try {
                const account = await request(base(school) + '/account');
                if (current === version)
                    state.available = account.available === true;
            }
            catch { /* A indisponibilidade do e-mail não interrompe a rotina escolar. */ }
        }
        return { state, clear, load, request };
    }
    PigePortalMail.use = use;
    PigePortalMail.component = { props: ['schoolId', 'request'], render: PigeRenders.portalMail, setup(props) {
            const m = Vue.reactive({ busy: false, opening: false, error: '', password: '', address: '', needsPassword: false });
            const frame = Vue.reactive({ src: 'about:blank' });
            let active = true, timer;
            async function open(connect = false) {
                if (m.busy || m.opening)
                    return;
                m.busy = true;
                m.error = '';
                frame.src = 'about:blank';
                const password = m.password;
                m.password = '';
                try {
                    const path = base(props.schoolId);
                    let account = await props.request(path + '/account');
                    if (!active)
                        return;
                    if (!account.available)
                        throw new Error('Sua caixa institucional está indisponível. Consulte a secretaria.');
                    m.address = account.address;
                    if (connect) {
                        account = await props.request(path + '/connection/linked', { method: 'POST', body: JSON.stringify({ password }) });
                    }
                    else if (account.can_auto_connect) {
                        account = await props.request(path + '/connection/automatic', { method: 'POST' });
                    }
                    if (!active)
                        return;
                    m.needsPassword = !account.connected && !account.can_auto_connect;
                    if (!account.connected) {
                        m.error = account.connection_error || (!m.needsPassword ? 'A conexão ainda está sendo preparada. Tente novamente em instantes.' : '');
                        return;
                    }
                    const result = await props.request(path + '/webmail-ticket', { method: 'POST' });
                    if (!active)
                        return;
                    const action = '/webmail/' + encodeURIComponent(props.schoolId) + '/launch';
                    if (result.action !== action || !result.ticket)
                        throw new Error('Não foi possível iniciar a sessão de e-mail.');
                    // Navegação de formulários pode enviar Origin:null em páginas com no-referrer.
                    // O POST de mesma origem recebe o cookie HttpOnly antes de navegar o quadro.
                    const launch = await fetch(action, {
                        method: 'POST', body: new URLSearchParams({ ticket: result.ticket }), credentials: 'same-origin',
                        mode: 'same-origin', redirect: 'manual', referrerPolicy: 'same-origin', cache: 'no-store'
                    });
                    if (!active)
                        return;
                    if (launch.type !== 'opaqueredirect')
                        throw new Error('O webmail não aceitou o convite de sessão. Tente abrir a caixa novamente.');
                    frame.src = action.replace(/launch$/, 'SOGo/');
                    m.opening = true;
                    timer = window.setTimeout(() => { if (active && m.opening) {
                        m.opening = false;
                        m.error = 'O webmail demorou para responder. Tente abrir a caixa novamente.';
                    } }, 30000);
                }
                catch (error) {
                    if (active) {
                        m.opening = false;
                        m.error = error instanceof Error ? error.message : 'Não foi possível abrir sua caixa institucional.';
                    }
                }
                finally {
                    if (active)
                        m.busy = false;
                }
            }
            function loaded(event) {
                if (!active)
                    return;
                const page = event.target.contentDocument;
                if (!page || page.URL === 'about:blank')
                    return;
                window.clearTimeout(timer);
                m.opening = false;
                if (page.contentType === 'application/json' || page.contentType === 'text/plain') {
                    m.error = 'O webmail não pôde carregar. Tente abrir a caixa novamente.';
                    if (page.contentType === 'application/json') {
                        try {
                            const { detail } = JSON.parse(page.body.innerText);
                            if (typeof detail === 'string')
                                m.error = detail;
                        }
                        catch { /* resposta sem detalhe */ }
                    }
                }
            }
            Vue.onMounted(() => { void open(); });
            Vue.onUnmounted(() => { active = false; window.clearTimeout(timer); m.password = ''; });
            return { m, frame, open, loaded };
        } };
})(PigePortalMail || (PigePortalMail = {}));
/** Interação da faixa de guias compartilhada pelos portais da escola. */
var PigePortalTabs;
(function (PigePortalTabs) {
    function cancelClose() { PigeDialogs.cancelPending(); }
    PigePortalTabs.cancelClose = cancelClose;
    function confirmClose(home, drafts) {
        const text = 'A guia ' + home + ' permanecerá aberta. As outras guias serão fechadas. Alterações e preenchimentos ainda não salvos nessas guias serão descartados. Os dados já salvos serão preservados.';
        return PigeDialogs.confirm(text + (drafts.length ? '\n\nConfira antes de fechar · ' + drafts.join(', ') + '.' : ''), { title: 'Fechar as outras guias?', cancelLabel: 'Voltar', confirmLabel: 'Fechar outras guias', destructive: true });
    }
    PigePortalTabs.confirmClose = confirmClose;
    function reveal() {
        void Vue.nextTick(() => {
            const tab = window.document.querySelector('.work-tabs-list [role="tab"][aria-selected="true"]');
            const rail = tab?.closest('.work-tabs-list');
            if (!tab || !rail)
                return;
            const selected = tab.getBoundingClientRect(), viewport = rail.getBoundingClientRect();
            if (selected.left < viewport.left)
                rail.scrollLeft += selected.left - viewport.left;
            else if (selected.right > viewport.right)
                rail.scrollLeft += selected.right - viewport.right;
        });
    }
    PigePortalTabs.reveal = reveal;
    function keyTarget(event, tabs, section) {
        if (event.target.getAttribute('role') !== 'tab')
            return;
        const i = tabs.indexOf(section), n = tabs.length;
        const index = { ArrowRight: (i + 1) % n, ArrowLeft: (i + n - 1) % n, Home: 0, End: n - 1 }[event.key];
        if (index === undefined)
            return;
        event.preventDefault();
        return tabs[index];
    }
    PigePortalTabs.keyTarget = keyTarget;
})(PigePortalTabs || (PigePortalTabs = {}));
/** Portal privado: shell da aplicação, transporte e autorizações escolares preservados. */
var PigeFamily;
(function (PigeFamily) {
    const titles = { webmail: 'E-mail', materials: 'Atividades', absences: 'Justificativas de ausência', overview: 'Visão geral', students: 'Alunos que acompanho', academic: 'Vida acadêmica', news: 'Comunicados', agenda: 'Agenda escolar', finance: 'Financeiro', documents: 'Documentos', support: 'Atendimento' };
    function routeSection() { const view = new URLSearchParams(location.search).get('view'); return view && titles[view] ? view : location.pathname.includes('documents') ? 'documents' : location.pathname.includes('finance') ? 'finance' : location.pathname.includes('academic') ? 'academic' : 'overview'; }
    function savedSidebarPreference() {
        try {
            return window.localStorage.getItem('pige-family-sidebar-collapsed') === 'true';
        }
        catch {
            return false;
        }
    }
    function toggleSidebar() {
        rail.close();
        s.sidebarCollapsed = !s.sidebarCollapsed;
        PigePortalTabs.reveal();
        try {
            window.localStorage.setItem('pige-family-sidebar-collapsed', String(s.sidebarCollapsed));
        }
        catch { /* O menu continua utilizável se o armazenamento do navegador estiver bloqueado. */ }
    }
    const s = Vue.reactive({ ready: false, busy: false, error: '', contextError: false, account: null, email: '', password: '', passwordVisible: false, menuOpen: false, sidebarCollapsed: savedSidebarPreference(), feedQuery: '', feedTerm: '', schoolId: '', schools: {}, section: routeSection(), tabs: [], students: [], studentId: new URLSearchParams(location.search).get('student') || '', charges: [], financePage: 1, financePageSize: 30, financeTotal: 0, financeOverdue: 0, financeNote: '', financeError: '', financeLoaded: false, news: [], events: [], feedItems: [], feedTotal: 0, feedPage: 1, feedBusy: false, feedError: '', overviewFeedError: '', selectedPost: null });
    const recentMaterials = Vue.reactive({ items: [], loading: false, error: '' });
    const rail = PigeSidebarRail.use(() => s.sidebarCollapsed);
    let recentSequence = 0;
    function clearRecentMaterials() {
        recentSequence++;
        recentMaterials.items = [];
        recentMaterials.loading = false;
        recentMaterials.error = '';
    }
    async function loadRecentMaterials() {
        clearRecentMaterials();
        const selected = student();
        if (s.section !== 'overview' || !selected || selected.academic_authorized === false)
            return;
        const sequence = recentSequence, school = s.schoolId;
        const current = () => sequence === recentSequence && selected.id === s.studentId && school === s.schoolId;
        recentMaterials.loading = true;
        try {
            const items = await request('/family/students/' + selected.id + '/materials?view=recent');
            if (current())
                recentMaterials.items = items;
        }
        catch (e) {
            if (current())
                recentMaterials.error = e instanceof Error ? e.message : 'Não foi possível consultar as atividades.';
        }
        finally {
            if (current())
                recentMaterials.loading = false;
        }
    }
    let schoolworkSequence = 0;
    const schoolwork = Vue.reactive({ requestedMaterial: '', materialNotice: '', loading: false, error: '', materials: [], absences: [], filter: '', day: '', reason: '', file: null, key: '', receipt: '', fileVersion: 0 });
    function clearSchoolwork() { schoolworkSequence++; schoolwork.requestedMaterial = ''; schoolwork.materialNotice = ''; schoolwork.loading = false; schoolwork.error = ''; schoolwork.materials = []; schoolwork.absences = []; schoolwork.filter = ''; schoolwork.file = null; schoolwork.key = ''; schoolwork.day = ''; schoolwork.reason = ''; schoolwork.receipt = ''; schoolwork.fileVersion++; }
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
                if (current()) {
                    schoolwork.materials = items;
                    schoolwork.materialNotice = '';
                    const target = schoolwork.requestedMaterial;
                    if (target && !items.some(item => item.id === target))
                        schoolwork.materialNotice = 'Esta atividade já não está disponível para a matrícula selecionada.';
                }
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
            if (current()) {
                schoolwork.loading = false;
                const target = schoolwork.requestedMaterial;
                if (section === 'materials' && target && !schoolwork.error) {
                    schoolwork.requestedMaterial = '';
                    void Vue.nextTick(() => {
                        if (!current())
                            return;
                        const heading = window.document.getElementById('material-' + target);
                        heading?.focus();
                    });
                }
            }
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
    function clearPrivate() { rail.close(); PigeDialogs.cancelPending(); generation++; s.tabs = []; savedFeeds.clear(); postTrigger = null; clearRecentMaterials(); mail.clear(); autoPix.clear(); cards.clear(); clearChargeDocuments(); feedGeneration++; clearSchoolwork(); s.students = []; s.charges = []; s.financeTotal = 0; s.financePage = 1; s.financeOverdue = 0; s.financeNote = ''; s.financeError = ''; s.financeLoaded = false; s.news = []; s.events = []; s.feedItems = []; s.feedTotal = 0; s.feedPage = 1; s.feedBusy = false; s.selectedPost = null; s.feedError = ''; s.feedQuery = ''; s.feedTerm = ''; s.overviewFeedError = ''; s.menuOpen = false; }
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
                if (s.account && (s.account.id !== data.user.id || s.account.role !== data.user.role || (s.schoolId && !data.user.school_ids.includes(s.schoolId)))) {
                    invalidateAuth();
                    token = '';
                    s.account = null;
                    clearPrivate();
                    throw new Error('Seu acesso à escola mudou. Entre novamente.');
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
            if (r.status === 403 && s.schoolId && (path.startsWith('/family/students/') || path.startsWith('/profile/learning')))
                void checkStudentAccess();
            throw Object.assign(new Error(detail), { status: r.status });
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
        if (workspaceBusy(s.tabs))
            return;
        if ((drafts(s.tabs).length || s.tabs.includes('webmail')) && !await canLeaveContext('Sair do portal?', 'Sair'))
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
            s.section = 'overview';
            s.password = '';
            s.passwordVisible = false;
            updateLocation();
            PigeMFA.clear();
        } });
    }
    const mail = PigePortalMail.use(request);
    async function load() {
        clearPrivate();
        s.contextError = false;
        const current = generation;
        try {
            const [data] = await Promise.all([
                request('/family/context'),
                mail.load(s.schoolId)
            ]);
            if (current !== generation)
                return;
            s.schools = Object.fromEntries((data.schools || []).map(item => [item.id, item.name]));
            s.students = data.students;
            if (!s.students.some(item => item.id === s.studentId))
                s.studentId = s.students[0]?.id || '';
            const previous = s.section;
            setActiveTab(previous);
            if (s.section !== previous)
                updateLocation();
            void loadRecentMaterials();
            await Promise.all([finance(), overviewFeed(), loadSchoolwork()]);
            if (current === generation && ['news', 'agenda'].includes(s.section))
                await loadFeed();
        }
        catch (error) {
            if (current === generation)
                s.contextError = true;
            throw error;
        }
    }
    let accessCheck = null;
    function checkStudentAccess() {
        if (accessCheck)
            return accessCheck;
        if (!s.account || !s.schoolId || s.contextError)
            return Promise.resolve();
        const scope = generation;
        const fingerprint = (items) => JSON.stringify(items.map(item => [item.id, item.academic_authorized !== false, item.financial_authorized]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
        const pending = (async () => {
            try {
                const result = await request('/family/context');
                if (scope === generation && fingerprint(result.students) !== fingerprint(s.students))
                    await load();
            }
            catch (e) {
                if (scope === generation && e.status === 403) {
                    clearPrivate();
                    s.contextError = true;
                    s.error = 'A escola alterou as permissões deste acesso.';
                }
            }
        })();
        accessCheck = pending;
        void pending.finally(() => { if (accessCheck === pending)
            accessCheck = null; });
        return pending;
    }
    function checkWhenVisible() { if (!window.document.hidden)
        void checkStudentAccess(); }
    const label = (value) => ({ open: 'Aberto', in_progress: 'Em atendimento', waiting: 'Aguardando', draft: 'Em preparação', active: 'Efetivada', suspended: 'Suspensa', completed: 'Concluída', pending: 'Pendente', overdue: 'Vencida', validated: 'Validado', received: 'Recebido', received_external: 'Recebido externamente', confirmed: 'Confirmada', refunded: 'Estornada', partially_refunded: 'Estorno parcial', refund_requested: 'Estorno solicitado', disputed: 'Em contestação', awaiting_review: 'Em análise', failed: 'Falha na emissão', uncertain: 'Em conciliação', waived: 'Dispensado', rejected: 'Revisão necessária', expired: 'Vencido', queued: 'Em processamento', cancelled: 'Cancelada', paid: 'Paga', settled: 'Liquidada', issued: 'Emitida', registered: 'Registrada' }[value] || value);
    const student = () => s.students.find(x => x.id === s.studentId);
    const activeEnrollments = () => student()?.enrollments.filter(item => item.status === 'active') || [];
    function normalized(value) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim(); }
    function visibleMaterials() {
        const query = normalized(schoolwork.filter);
        return query ? schoolwork.materials.filter(item => normalized(item.title + ' ' + item.body).includes(query)) : schoolwork.materials;
    }
    const pendingDocuments = () => student()?.document_pendencies ?? [];
    const studentView = () => s.account?.role === 'student';
    const portalName = () => studentView() ? 'Portal do aluno' : 'Portal da família';
    const initials = (name) => name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toLocaleUpperCase('pt-BR');
    const title = (name = s.section) => studentView() && name === 'students' ? 'Meu cadastro' : studentView() && name === 'academic' ? 'Minha vida escolar' : titles[name] || titles.overview;
    const date = (value) => { if (!value)
        return 'Data não informada'; const d = new Date(value.length === 10 ? value + 'T12:00:00' : value); return Number.isNaN(d.getTime()) ? 'Data não informada' : new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Bahia', day: '2-digit', month: 'short', year: 'numeric', ...(value.length > 10 ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(d); };
    const money = (value) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const autoPix = PigeAutoPix.use(request, () => student()?.financial_authorized ? s.studentId : '');
    const cards = PigeFamilyCard.use(request, () => s.studentId);
    const paymentSources = { asaas: 'Asaas', crm: 'CRM', manual: 'Lançamento da escola' };
    function chargeStatus(charge) {
        if (charge.payment_source === 'crm') {
            if (charge.external_payment_status === 'settled')
                return 'Pagamento identificado no CRM';
            if (charge.external_payment_status === 'cancelled')
                return 'Cancelada no CRM';
            if (charge.external_payment_status === 'unavailable')
                return 'Situação no CRM indisponível';
        }
        return label(charge.status);
    }
    const paymentKinds = { PIX: 'Pix', BOLETO: 'Boleto', CREDIT_CARD: 'Cartão de crédito', MANUAL: 'Cobrança manual' };
    const documentsPanel = Vue.reactive({ chargeId: '', loading: false, error: '', notice: '', data: null });
    let documentRequest = 0, financeRequest = 0;
    function clearChargeDocuments() {
        documentRequest++;
        documentsPanel.chargeId = '';
        documentsPanel.data = null;
        documentsPanel.loading = false;
        documentsPanel.error = '';
        documentsPanel.notice = '';
    }
    function instrumentLink(value) {
        if (!value)
            return '';
        try {
            const url = new URL(value);
            return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
                (url.hostname === 'asaas.com' || url.hostname.endsWith('.asaas.com')) ? url.href : '';
        }
        catch {
            return '';
        }
    }
    async function showChargeDocuments(charge, retry = false) {
        if (documentsPanel.chargeId === charge.id && !retry) {
            clearChargeDocuments();
            return;
        }
        clearChargeDocuments();
        if (!student()?.financial_authorized || !charge.has_payment_documents || !s.charges.some(row => row.id === charge.id))
            return;
        const sequence = documentRequest, school = s.schoolId, selected = s.studentId;
        const current = () => sequence === documentRequest && school === s.schoolId && selected === s.studentId;
        documentsPanel.chargeId = charge.id;
        documentsPanel.loading = true;
        try {
            const data = await request('/family/students/' + encodeURIComponent(selected) + '/charges/' + encodeURIComponent(charge.id) + '/documents');
            if (!current())
                return;
            documentsPanel.data = { ...data, invoice_url: instrumentLink(data.invoice_url), bank_slip_url: instrumentLink(data.bank_slip_url) };
        }
        catch (error) {
            if (current())
                documentsPanel.error = error instanceof Error ? error.message : 'Não foi possível consultar os documentos desta cobrança.';
        }
        finally {
            if (current())
                documentsPanel.loading = false;
        }
    }
    async function copyChargeCode(controlId) {
        const control = window.document.getElementById(controlId);
        if (!control || !documentsPanel.data || !student()?.financial_authorized)
            return;
        const current = documentRequest;
        try {
            await navigator.clipboard.writeText(control.value);
            if (current === documentRequest)
                documentsPanel.notice = 'Código copiado.';
        }
        catch {
            if (current !== documentRequest)
                return;
            control.focus();
            control.select();
            documentsPanel.notice = 'Código selecionado. Use a opção Copiar do seu dispositivo.';
        }
    }
    async function finance(page = 1) {
        const sequence = ++financeRequest;
        clearChargeDocuments();
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
            if (sequence !== financeRequest || selected !== s.studentId || current !== generation)
                return;
            s.charges = data.items;
            s.financeTotal = data.total ?? 0;
            s.financeOverdue = data.overdue_count ?? data.items.filter(row => row.status === 'overdue').length;
            s.financePage = page;
            s.financeNote = data.note;
            s.financeLoaded = true;
        }
        catch (e) {
            if (sequence === financeRequest && selected === s.studentId && current === generation)
                s.financeError = e instanceof Error ? e.message : 'Não foi possível carregar o financeiro.';
        }
    }
    function feedPath(kind, page = 1, size = 12, upcoming = false, query = '') {
        const params = new URLSearchParams({ kind, page: String(page), page_size: String(size), upcoming: String(upcoming) });
        if (query.trim())
            params.set('q', query.trim());
        return '/schools/' + encodeURIComponent(s.schoolId) + '/community-feed?' + params;
    }
    let overviewFeedGeneration = -1;
    async function overviewFeed() { if (!s.schoolId || student()?.academic_authorized === false || overviewFeedGeneration === generation)
        return; const current = generation; overviewFeedGeneration = current; try {
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
        const data = await request(feedPath(kind, page, 12, false, s.feedTerm));
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
    async function searchFeed() {
        s.feedTerm = s.feedQuery.trim();
        await loadFeed(1);
    }
    function updateLocation(push = false) {
        const params = new URLSearchParams({ view: s.section });
        if (s.studentId)
            params.set('student', s.studentId);
        const scope = { familyAccount: s.account?.id, familySchool: s.schoolId };
        history[push ? 'pushState' : 'replaceState'](scope, '', '/family?' + params);
    }
    function clearStudentWorkspace() {
        rail.close();
        PigeDialogs.cancelPending();
        generation++;
        feedGeneration++;
        clearRecentMaterials();
        autoPix.clear();
        cards.clear();
        clearChargeDocuments();
        clearSchoolwork();
        savedFeeds.clear();
        s.tabs = [];
        s.feedItems = [];
        s.feedTotal = 0;
        s.feedBusy = false;
        s.feedPage = 1;
        s.feedTerm = '';
        s.feedQuery = '';
        s.news = [];
        s.events = [];
        s.overviewFeedError = '';
        s.selectedPost = null;
        s.feedError = '';
        postTrigger = null;
    }
    async function changeStudent() {
        if (s.busy)
            return;
        clearStudentWorkspace();
        setActiveTab(s.section);
        updateLocation();
        void loadRecentMaterials();
        if (s.section === 'overview')
            void overviewFeed();
        await run(async () => { await Promise.all([finance(), loadSchoolwork()]); if (isFeed(s.section))
            await loadFeed(); });
    }
    async function selectStudent(event) {
        const input = event.currentTarget;
        const target = input.value;
        input.value = s.studentId;
        if (!await canLeaveContext() || !s.students.some(item => item.id === target))
            return;
        s.studentId = target;
        await changeStudent();
    }
    async function chooseStudent(id) {
        if (s.busy)
            return;
        if (id !== s.studentId) {
            if (!await canLeaveContext() || !s.students.some(item => item.id === id))
                return;
            s.studentId = id;
            await changeStudent();
            if (s.studentId !== id || !s.account)
                return;
        }
        section('academic');
    }
    async function changeSchool() { if (s.busy)
        return; s.studentId = ''; s.section = 'overview'; await run(load); updateLocation(); }
    async function selectSchool(event) {
        const input = event.currentTarget;
        const target = input.value;
        input.value = s.schoolId;
        if (!await canLeaveContext() || !s.account?.school_ids.includes(target))
            return;
        s.schoolId = target;
        await changeSchool();
    }
    async function openRegistration(e) {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
            return;
        e.preventDefault();
        if (await canLeaveContext('Ir para inscrição e contratos?', 'Continuar'))
            window.location.assign('/online');
    }
    async function refreshWorkspace() { if (await canLeaveContext())
        await run(load); }
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
        closeMenu(false); PigePortalTabs.reveal(); }
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
    function allowedSection(name) { if (name === 'webmail' && mail.state.available)
        return name; if (name === 'webmail' || (name === 'absences' && s.account?.role !== 'guardian'))
        name = 'overview'; return student()?.academic_authorized === false && name !== 'support' ? (student()?.financial_authorized ? 'finance' : 'support') : name; }
    function sidebarGroups() {
        const academic = student()?.academic_authorized !== false;
        const groups = [];
        if (academic)
            groups.push({ id: 'family-learning-menu', label: 'Acompanhamento escolar', icon: 'academic', items: [
                    { id: 'students', label: title('students'), icon: 'students' },
                    { id: 'materials', label: 'Atividades', icon: 'documents' },
                    { id: 'academic', label: title('academic'), icon: 'academic' },
                    { id: 'agenda', label: 'Agenda escolar', icon: 'clock' },
                    { id: 'news', label: 'Comunicados', icon: 'bell' },
                ] });
        const services = [];
        if (mail.state.available)
            services.push({ id: 'webmail', label: 'E-mail', icon: 'email' });
        if (s.account?.role === 'guardian' && academic)
            services.push({ id: 'absences', label: 'Justificativas de ausência', icon: 'documents' });
        if (student()?.financial_authorized)
            services.push({ id: 'finance', label: 'Financeiro', icon: 'billing' });
        if (academic)
            services.push({ id: 'documents', label: 'Documentos', icon: 'documents' });
        services.push({ id: 'support', label: 'Atendimento', icon: 'school' }, { id: 'online', label: 'Inscrição e contratos', icon: 'online' });
        groups.push({ id: 'family-services-menu', label: 'Serviços escolares', icon: 'school', items: services });
        return groups;
    }
    const isFeed = (key) => key === 'news' || key === 'agenda';
    const savedFeeds = new Map();
    function rememberFeed() {
        if (!isFeed(s.section))
            return;
        savedFeeds.set(s.section, { query: s.feedQuery, term: s.feedTerm, items: s.feedItems, total: s.feedTotal,
            page: s.feedPage, post: s.selectedPost, loaded: !s.feedError && !s.feedBusy });
    }
    function restoreFeed(key) {
        const saved = savedFeeds.get(key);
        s.feedQuery = saved?.query || '';
        s.feedTerm = saved?.term || '';
        s.feedItems = saved?.items || [];
        s.feedPage = saved?.page || 1;
        s.feedTotal = saved?.total || 0;
        s.selectedPost = saved?.post || null;
        s.feedBusy = false;
        s.feedError = '';
        return saved?.loaded === true;
    }
    function setActiveTab(requested) {
        const home = allowedSection('overview');
        const name = allowedSection(requested);
        if (s.tabs[0] !== home)
            s.tabs = [home];
        s.tabs = s.tabs.filter(id => allowedSection(id) === id);
        if (!s.tabs.includes(name))
            s.tabs.push(name);
        s.section = name;
        PigePortalTabs.reveal();
    }
    function isOpen(key) {
        return (s.section === key || s.tabs.includes(key)) && allowedSection(key) === key;
    }
    let navigationVersion = 0;
    function setView(requested, materialId = '', focusHeading = true) {
        rail.close();
        navigationVersion++;
        const name = allowedSection(requested), changed = s.section !== name;
        let cached = false;
        if (changed) {
            PigeDialogs.cancelPending();
            rememberFeed();
            feedGeneration++;
            s.selectedPost = null;
            postTrigger = null;
        }
        setActiveTab(name);
        closeMenu(false);
        if (changed && isFeed(name))
            cached = restoreFeed(name);
        schoolwork.requestedMaterial = name === 'materials' ? materialId : '';
        schoolwork.materialNotice = '';
        if (materialId)
            schoolwork.filter = '';
        if (name === 'overview') {
            void loadRecentMaterials();
            void overviewFeed();
        }
        if (name === 'materials' || name === 'absences')
            void loadSchoolwork();
        if (isFeed(name) && changed && !cached)
            void loadFeed(s.feedPage);
        if (focusHeading)
            void Vue.nextTick(() => window.document.getElementById('family-title')?.focus());
        return changed;
    }
    function section(name, materialId = '', focusHeading = true) {
        if (!titles[name])
            return;
        if (setView(name, materialId, focusHeading))
            updateLocation(true);
    }
    function financeDraft() {
        const card = cards.state, pix = autoPix.state;
        const initialLimit = String((card.view?.checkout?.quote.charged_cents || 0) / 100);
        return Boolean(pix.accepted || pix.confirmCancel || (pix.view?.can_enroll && pix.frequency !== 'MONTHLY') ||
            card.agreed || card.revoke || card.until || (card.view?.can_authorize && card.limit !== initialLimit));
    }
    function drafts(tabs) {
        const result = [];
        if (tabs.includes('support') && window.document.querySelector?.('#family-protocols [data-workspace-dirty="true"]'))
            result.push('mensagem de atendimento');
        if (tabs.includes('absences') && (schoolwork.day || schoolwork.reason || schoolwork.file))
            result.push('justificativa de ausência');
        if (tabs.includes('finance') && financeDraft())
            result.push('dados financeiros em edição');
        return result;
    }
    function workspaceBusy(tabs) {
        return s.busy || (tabs.includes('support') && Boolean(window.document.querySelector?.('#family-protocols [aria-busy="true"]'))) || (tabs.includes('finance') && (autoPix.state.busy || cards.state.loading));
    }
    function workspaceKey() {
        return JSON.stringify([authEpoch, generation, navigationVersion, s.account?.id, s.schoolId, s.studentId, s.section, s.tabs]);
    }
    async function canLeaveContext(heading = 'Fechar as guias deste contexto?', action = 'Continuar') {
        if (workspaceBusy(s.tabs))
            return false;
        const pending = drafts(s.tabs), mail = s.tabs.includes('webmail');
        if (!pending.length && !mail)
            return true;
        const previous = workspaceKey();
        const message = [pending.length ? 'As alterações em ' + pending.join(' e ') + ' ainda não foram salvas.' : '',
            mail ? 'Confira se as mensagens em edição foram salvas em Rascunhos.' : ''].filter(Boolean).join(' ');
        const confirmed = await PigeDialogs.confirm(message, { title: heading, confirmLabel: action, cancelLabel: 'Voltar', destructive: true });
        return confirmed && previous === workspaceKey() && !workspaceBusy(s.tabs);
    }
    function forget(key) {
        savedFeeds.delete(key);
        if (key === 'finance') {
            autoPix.clear();
            cards.clear();
            clearChargeDocuments();
        }
        if (key === 'absences') {
            schoolwork.day = '';
            schoolwork.reason = '';
            schoolwork.file = null;
            schoolwork.fileVersion++;
            schoolwork.key = '';
            schoolwork.receipt = '';
        }
        if (key === 'materials') {
            schoolwork.filter = '';
            schoolwork.requestedMaterial = '';
            schoolwork.materialNotice = '';
        }
    }
    function focusTab() { void Vue.nextTick(() => window.document.getElementById('family-tab-' + s.section)?.focus()); }
    async function closeTabs(key) {
        const home = s.tabs[0];
        if (!home || s.tabs.length < 2 || key === home || (key && !s.tabs.includes(key)))
            return;
        const closing = key ? [key] : s.tabs.slice(1);
        if (workspaceBusy(closing))
            return;
        const pending = drafts(closing), mailOpen = closing.includes('webmail');
        const previous = workspaceKey();
        if (key) {
            const warnings = [pending.length ? 'As alterações em ' + pending.join(' e ') + ' serão descartadas.' : '',
                mailOpen ? 'Confira se as mensagens em edição foram salvas em Rascunhos.' : ''].filter(Boolean);
            if (warnings.length && !await PigeDialogs.confirm(warnings.join(' '), {
                title: 'Fechar a guia ' + title(key) + '?', confirmLabel: 'Fechar guia', cancelLabel: 'Voltar', destructive: true
            }))
                return;
        }
        else {
            if (mailOpen)
                pending.push('mensagens em edição no E-mail');
            if (!await PigePortalTabs.confirmClose(title(home), pending))
                return;
        }
        if (previous !== workspaceKey() || workspaceBusy(closing))
            return;
        if (closing.includes(s.section)) {
            setView(home, '', false);
            updateLocation(true);
        }
        closing.forEach(forget);
        s.tabs = s.tabs.filter(id => !closing.includes(id));
        focusTab();
    }
    function tabKeys(event) {
        const key = PigePortalTabs.keyTarget(event, s.tabs, s.section);
        if (key) {
            section(key, '', false);
            focusTab();
        }
    }
    let historyRequest = 0;
    async function popstate(event) {
        const request = ++historyRequest;
        if (!s.account)
            return;
        const requested = routeSection(), id = new URLSearchParams(location.search).get('student');
        const ctx = event?.state;
        if (ctx?.familyAccount && (ctx.familyAccount !== s.account.id || ctx.familySchool !== s.schoolId)) {
            updateLocation();
            return;
        }
        const changed = Boolean(id && id !== s.studentId && s.students.some(item => item.id === id));
        if (changed && id) {
            const approved = await canLeaveContext();
            if (request !== historyRequest)
                return;
            if (!approved || !s.students.some(item => item.id === id)) {
                if (s.account)
                    updateLocation();
                return;
            }
            clearStudentWorkspace();
            s.studentId = id;
            const current = ++navigationVersion, scope = generation;
            await finance();
            if (scope !== generation || current !== navigationVersion)
                return;
        }
        setView(requested);
        if (s.section !== requested || (id && id !== s.studentId))
            updateLocation();
    }
    Vue.createApp({ components: { 'portal-protocols': PigePortalProtocols.component, 'portal-mail': PigePortalMail.component, 'learning-portal': PigeLearning.component }, render: PigeRenders.familyPortal, setup() {
            Vue.watch(() => [s.schoolId, s.account?.id, s.studentId, student()?.academic_authorized, student()?.financial_authorized, mail.state.available].join('|'), () => rail.close());
            Vue.watch(() => [s.ready, s.account?.id, s.account?.role, s.schoolId].join('|'), () => {
                if (s.account && s.schoolId)
                    void PigeSupport.load(s.schoolId, s.account.role === 'student' ? 'student_portal' : 'guardian_portal', s.account.id);
                else if (s.ready && !s.account)
                    void PigeSupport.load(undefined, 'login');
                else
                    PigeSupport.dispose();
            });
            Vue.onMounted(rail.mount);
            Vue.onUnmounted(rail.dispose);
            Vue.onUnmounted(PigeSupport.dispose);
            Vue.onMounted(() => { window.addEventListener('popstate', popstate); window.document.addEventListener?.('visibilitychange', checkWhenVisible); window.addEventListener('keydown', menuKeys); window.addEventListener('resize', resized); PigeMFA.init(request, authenticated, logout); void start(); });
            Vue.onUnmounted(() => { window.removeEventListener('popstate', popstate); window.document.removeEventListener?.('visibilitychange', checkWhenVisible); window.removeEventListener('keydown', menuKeys); window.removeEventListener('resize', resized); });
            return { s, rail, openRegistration, sidebarGroups, chargeStatus, documentsPanel, paymentSources, paymentKinds, showChargeDocuments, copyChargeCode, closeTabs, tabKeys, isOpen, selectSchool, selectStudent, refreshWorkspace, recentMaterials, loadRecentMaterials, toggleSidebar, activeEnrollments, visibleMaterials, mail, autoPix, cards, schoolwork, loadSchoolwork, studentView, portalName, pickEvidence, submitAbsence, label, student, title, initials, date, money, pendingDocuments, finance, login, logout, changeSchool, changeStudent, chooseStudent, document, request, download, section, run, load, loadFeed, searchFeed, openPost, closePost, openMenu, closeMenu, mfa: PigeMFA, identity: PigeInstitution.state };
        } }).mount('#family');
})(PigeFamily || (PigeFamily = {}));
