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
var PigeAPI;
(function (PigeAPI) {
    let token = '';
    let activeSchool = '';
    let scopeEpoch = 0;
    let scopeController = new AbortController();
    let authEpoch = 0;
    let authController = new AbortController();
    let refreshPromise = null;
    function setActiveSchool(schoolId) {
        if (activeSchool === schoolId)
            return;
        activeSchool = schoolId;
        scopeEpoch++;
        scopeController.abort();
        scopeController = new AbortController();
    }
    PigeAPI.setActiveSchool = setActiveSchool;
    function scopeChanged() { return Object.assign(new Error('A entidade ativa foi alterada.'), { name: 'AbortError' }); }
    function checkScope(epoch) { if (epoch !== scopeEpoch)
        throw scopeChanged(); }
    function scopedHeaders(path, initial) {
        const headers = new Headers(initial);
        const pathSchool = path.match(/^\/(?:teacher\/)?schools\/([^/?]+)/)?.[1];
        if (activeSchool && pathSchool && decodeURIComponent(pathSchool) !== activeSchool)
            throw scopeChanged();
        if (activeSchool)
            headers.set('X-School-Id', activeSchool);
        if (token)
            headers.set('Authorization', `Bearer ${token}`);
        return headers;
    }
    function clear() {
        token = '';
        activeSchool = '';
        scopeEpoch++;
        authEpoch++;
        authController.abort();
        authController = new AbortController();
        refreshPromise = null;
        scopeController.abort();
        scopeController = new AbortController();
    }
    PigeAPI.clear = clear;
    function useSession(response) { token = response.access_token; }
    PigeAPI.useSession = useSession;
    async function error(response, epoch) {
        let data = {};
        try {
            data = await response.json();
        }
        catch { /* A origem pode estar indisponível. */ }
        if (epoch !== undefined)
            checkScope(epoch);
        const captions = { name: 'Nome', social_name: 'Nome social', email: 'E-mail', password: 'Senha', phone: 'Telefone', cpf: 'CPF', cnpj: 'CNPJ', birth_date: 'Data de nascimento', student_id: 'Aluno', person_id: 'Pessoa', guardian_id: 'Responsável', academic_year_id: 'Ano letivo', class_group_id: 'Turma', unit_id: 'Unidade', grade_id: 'Série', shift_id: 'Turno', enrolled_on: 'Data da matrícula', due_date: 'Vencimento', amount: 'Valor', description: 'Descrição', postal_code: 'CEP', street: 'Endereço', address_number: 'Número', district: 'Bairro', city: 'Cidade', state: 'Estado', capacity: 'Vagas', starts_on: 'Data inicial', ends_on: 'Data final', date_from: 'Data inicial', date_to: 'Data final', file: 'Arquivo', status: 'Situação', reason: 'Motivo', title: 'Título', legal: 'Responsável legal', financial: 'Responsável financeiro' };
        const fields = data.errors?.map(e => { const key = e.field.split('.').at(-1) || ''; return `${captions[key] || 'Campo informado'}: ${e.message}`; }).join('\n');
        const reference = data.request_id || response.headers.get('X-Request-ID') || '';
        const failure = new Error((fields || data.detail || `Falha de comunicação (${response.status}).`) + (reference ? ' · Referência: ' + reference : ''));
        Object.assign(failure, { status: response.status, fields: data.errors || [] });
        return failure;
    }
    async function refresh() {
        if (!refreshPromise) {
            const epoch = authEpoch;
            const pending = fetch('/api/v1/auth/refresh', { method: 'POST', signal: authController.signal, credentials: 'same-origin', headers: { 'X-CSRF-Protection': '1' } })
                .then(async (response) => {
                if (!response.ok) {
                    const failure = await error(response);
                    if (epoch !== authEpoch)
                        throw scopeChanged();
                    throw failure;
                }
                const data = await response.json();
                if (epoch !== authEpoch)
                    throw scopeChanged();
                useSession(data);
                return data;
            });
            refreshPromise = pending;
            void pending.finally(() => { if (refreshPromise === pending)
                refreshPromise = null; }).catch(() => { });
        }
        return refreshPromise;
    }
    PigeAPI.refresh = refresh;
    async function request(path, options = {}, retry = true) {
        if (!navigator.onLine)
            throw new Error('Sem conexão. Os dados não foram enviados. Reconecte-se antes de salvar.');
        const epoch = scopeEpoch;
        const headers = scopedHeaders(path, options.headers);
        headers.set('X-CSRF-Protection', '1');
        if (options.body && !(options.body instanceof FormData))
            headers.set('Content-Type', 'application/json');
        const signals = options.signal ? [scopeController.signal, options.signal] : [scopeController.signal];
        const response = await fetch('/api/v1' + path, { ...options, signal: AbortSignal.any(signals), headers, credentials: 'same-origin', cache: 'no-store' });
        checkScope(epoch);
        if (response.status === 401 && retry && token && (!path.startsWith('/auth/') || path.startsWith('/auth/profile'))) {
            try {
                await refresh();
                checkScope(epoch);
                return await request(path, options, false);
            }
            catch (failure) {
                if (epoch !== scopeEpoch || failure.name === 'AbortError')
                    throw scopeChanged();
                clear();
                window.dispatchEvent(new CustomEvent('pige-session-expired'));
            }
        }
        if (!response.ok)
            throw await error(response, epoch);
        const value = await response.json();
        checkScope(epoch);
        return value;
    }
    PigeAPI.request = request;
    function post(path, body) { return request(path, { method: 'POST', body: JSON.stringify(body) }); }
    PigeAPI.post = post;
    function patch(path, body) { return request(path, { method: 'PATCH', body: JSON.stringify(body) }); }
    PigeAPI.patch = patch;
    async function fileResponse(path) {
        const epoch = scopeEpoch;
        const send = () => fetch('/api/v1' + path, { headers: scopedHeaders(path), signal: scopeController.signal, credentials: 'same-origin', cache: 'no-store' });
        let response = await send();
        checkScope(epoch);
        if (response.status === 401 && token) {
            await refresh();
            checkScope(epoch);
            response = await send();
            checkScope(epoch);
        }
        if (!response.ok)
            throw await error(response, epoch);
        return response;
    }
    function downloadName(response, fallback) {
        const disposition = response.headers.get('Content-Disposition') || '';
        const encoded = disposition.match(/filename\*=UTF-8\'\'([^;]+)/i);
        const quoted = disposition.match(/filename="([^"\r\n]+)"/i);
        let name = quoted?.[1] || '';
        try {
            if (encoded)
                name = decodeURIComponent(encoded[1]);
        }
        catch {
            return fallback;
        }
        return name && name.length <= 180 && !/[\/\\\x00-\x1f\x7f]/.test(name) && !name.startsWith('.') ? name : fallback;
    }
    async function objectUrl(path) {
        const epoch = scopeEpoch;
        const blob = await (await fileResponse(path)).blob();
        checkScope(epoch);
        return URL.createObjectURL(blob);
    }
    PigeAPI.objectUrl = objectUrl;
    async function download(path, filename) {
        const epoch = scopeEpoch;
        const response = await fileResponse(path);
        const blob = await response.blob();
        checkScope(epoch);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = downloadName(response, filename);
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
    PigeAPI.download = download;
    async function downloadPost(path, body, filename) {
        const epoch = scopeEpoch;
        const data = JSON.stringify(body);
        const send = () => fetch('/api/v1' + path, { method: 'POST', headers: scopedHeaders(path, {
                Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-CSRF-Protection': '1'
            }), signal: scopeController.signal, body: data, credentials: 'same-origin', cache: 'no-store' });
        let response = await send();
        checkScope(epoch);
        if (response.status === 401 && token) {
            await refresh();
            checkScope(epoch);
            response = await send();
            checkScope(epoch);
        }
        if (!response.ok)
            throw await error(response, epoch);
        const blob = await response.blob();
        checkScope(epoch);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = downloadName(response, filename);
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
    PigeAPI.downloadPost = downloadPost;
})(PigeAPI || (PigeAPI = {}));
var PigeOnline;
(function (PigeOnline) {
    PigeOnline.statuses = { held: 'Vaga reservada · aguardando pagamento', paid: 'Vaga reservada · pagamento recebido', expired: 'Reserva vencida', review: 'Reserva em análise', consumed: 'Reserva convertida em matrícula', released: 'Vaga liberada', draft: 'Rascunho', submitted: 'Enviada', under_review: 'Em análise', changes_requested: 'Correção solicitada', waitlisted: 'Lista de espera', approved: 'Aprovada / em preparação', enrolled: 'Inscrição efetivada', rejected: 'Indeferida', withdrawn: 'Desistência', queued: 'Na fila', pending: 'Aguardando', processing: 'Processando', completed: 'Concluído', confirmed: 'Confirmado / aguardando recebimento', received: 'Recebido', received_external: 'Baixa externa (não bancária)', overdue: 'Vencido', cancelled: 'Cancelado', refunded: 'Estornado', refund_requested: 'Estorno em análise', partially_refunded: 'Estorno parcial', disputed: 'Em disputa', awaiting_review: 'Conferência necessária', failed: 'Falhou', uncertain: 'Resultado incerto', retry: 'Nova tentativa programada', validated: 'Validado', sent: 'Enviada ao provedor', delivered: 'Entregue', read: 'Lida', active: 'Ativa' };
    function label(value) { return PigeOnline.statuses[value] || value; }
    PigeOnline.label = label;
    function dateTime(value) { if (!value)
        return '—'; const timestamp = /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : value + 'Z'; return new Date(timestamp).toLocaleString('pt-BR', { timeZone: 'America/Bahia', dateStyle: 'short', timeStyle: 'short' }); }
    PigeOnline.dateTime = dateTime;
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
    function publicURL(slug) { return location.origin + '/online?campaign=' + encodeURIComponent(slug); }
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
var PigeDiary;
(function (PigeDiary) {
    const emptyLesson = () => ({ academic_period_id: '', lesson_date: today(), lesson_count: 1, content: '', skills: '', methodology: '', activities: '', homework: '', notes: '' });
    const emptyPlan = (d) => ({ class_group_id: d?.class_group_id || '', component_id: d?.component_id || '', academic_period_id: '', teacher_assignment_id: d?.teacher_assignment_id || '', objectives: '', thematic_units: '', knowledge_objects: '', bncc_references: '', methodology: '', resources: '', assessment_strategy: '', notes: '', status: 'draft' });
    const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bahia', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const groups = [
        { label: 'Hoje', pages: [{ id: 'dashboard', label: 'Pendências', tab: 'dashboard' }] },
        { label: 'Aulas e chamada', pages: [
                { id: 'diaries', label: 'Aulas', tab: 'diaries' }, { id: 'attendance', label: 'Frequência', tab: 'diaries' },
                { id: 'planning', label: 'Planejamento', tab: 'planning' }
            ] },
        { label: 'Aprendizagem', pages: [
                { id: 'assessments', label: 'Avaliações e recuperação', tab: 'assessments' }, { id: 'opinions', label: 'Pareceres', tab: 'opinions' },
                { id: 'records', label: 'Registros pedagógicos', tab: 'records' }
            ] },
        { label: 'Acompanhamento', pages: [
                { id: 'occurrences', label: 'Ocorrências', tab: 'occurrences' }, { id: 'materials', label: 'Materiais', tab: 'materials' },
                { id: 'communications', label: 'Comunicações', tab: 'communications', permission: 'communications.send' }
            ] },
        { label: 'Fechamento', pages: [
                { id: 'review', label: 'Conferência e retificações', tab: 'diaries' }, { id: 'results', label: 'Consolidação', tab: 'assessments' },
                { id: 'reports', label: 'Relatórios', tab: 'diaries', permission: 'diary.reports' }
            ] },
        { label: 'Configuração', pages: [
                { id: 'setup', label: 'Períodos', tab: 'setup', permission: 'diary.configure' },
                { id: 'components', label: 'Componentes', tab: 'setup', permission: 'diary.configure' },
                { id: 'catalog', label: 'Catálogo e vigência', tab: 'setup', permission: 'diary.configure' },
                { id: 'new-diary', label: 'Abrir diário', tab: 'setup', permission: 'diary.configure' },
                { id: 'rules', label: 'Regras', tab: 'assessments', permission: 'diary.configure' }
            ] }
    ];
    function pilotForSchool(schoolId) {
        return Boolean(schoolId) && new URLSearchParams(location.search).get('diarioPiloto') === schoolId;
    }
    PigeDiary.pilotForSchool = pilotForSchool;
    function clearPilotContext(schoolId) {
        const url = new URL(location.href);
        if (url.searchParams.get('diarioPiloto') !== schoolId)
            return;
        for (const key of ['diarioPiloto', 'guia', 'diario', 'periodo'])
            url.searchParams.delete(key);
        if (url.hash === '#diario')
            url.hash = '';
        history.replaceState(history.state, '', url.pathname + url.search + url.hash);
    }
    PigeDiary.clearPilotContext = clearPilotContext;
    PigeDiary.component = { props: ['schoolId', 'schoolName', 'catalogEnabled', 'permissions', 'teacherPortal', 'allowMaterials', 'requestedDiary'], render: PigeRenders.diary, setup(props) {
            const state = Vue.reactive({
                busy: false, error: '', notice: '', tab: 'diaries', page: 'diaries', diaryFilter: '', lessonPeriod: '', dirty: false,
                diaries: [], selected: null, academicYears: [], periods: [], components: [], groups: [], assignments: [], plans: [],
                calendarIds: [], periodForm: { academic_year_id: '', class_group_id: '', name: '', starts_on: '', ends_on: '', order_index: 1, active: true },
                fields: { version: 0, fields: [], standard_columns: {} }, configFields: [], configVersion: 0, newFieldLabel: '', restoreFieldId: '', newFieldScope: 'lesson',
                componentEditing: null,
                lessonEditing: null, planEditing: null, lessonValues: {}, planValues: {},
                attendanceBase: {},
                componentForm: { name: '', code: '', workload_hours: 0, active: true },
                diaryForm: { class_group_id: '', component_id: '', teacher_assignment_id: '', notes: '' },
                teacherSearch: '', teacherPersonId: '', teacherResults: [], teacherSearched: false,
                planForm: emptyPlan(), lessonForm: emptyLesson(),
                selectedLesson: null, attendance: [],
                assessments: [], assessmentEditing: null, selectedAssessment: null, assessmentBaseline: '', assessmentRoster: [],
                assessmentForm: { academic_period_id: '', title: '', kind: 'activity', assessment_date: today(), value_type: 'numeric', max_score: '10', weight: '1', description: '', skills: '', status: 'published' },
                opinions: [], opinionForm: { academic_period_id: '', enrollment_id: '', text: '', status: 'draft' },
                pedagogicalRecords: [], pedagogicalForm: { enrollment_id: '', record_date: today(), kind: 'observation', text: '' },
                closePeriod: '', closeReason: 'Fechamento pedagógico conferido.', reopenReason: '', reopenPeriod: '',
                summary: null,
                history: { closures: [], revisions: [] },
                dashboard: { items: [], totals: {} },
                assessmentRules: [],
                assessmentRuleForm: { period_id: '', method: 'arithmetic', scale_max: '10', decimal_places: 2, minimum_score: '', minimum_attendance_percent: '', justified_absence_counts_as_present: '', recovery_mode: 'none', concept_scale: '', required_opinion: false, version: null },
                periodResults: [],
                materials: [], materialForm: { client_key: PigeOnline.newId(), kind: 'Atividade', title: '', body: '', enrollment_id: '' },
                occurrences: [],
                communicationRecipients: [], communications: [],
                communicationForm: { enrollment_id: '', academic_period_id: '', occurrence_id: '', recipient_guardian_link_ids: [], title: '', message: '', client_key: PigeOnline.newId() },
                occurrenceForm: { academic_period_id: '', enrollment_id: '', occurrence_date: today(), kind: 'pedagogical', title: '', description: '', status: 'draft' },
                reportFrom: '', reportTo: '', reportType: 'class_diary', reportPeriod: '', reportEnrollment: ''
            });
            const base = () => (props.teacherPortal ? '/teacher' : '') + '/schools/' + props.schoolId;
            const can = (p) => props.permissions.includes(p);
            const catalog = Vue.reactive({ drafts: [], name: '', code: '', hours: 0, reason: '', target: '',
                impact: null });
            async function catalogList() { catalog.drafts = await PigeAPI.request(base() + '/diary-catalog/suggestions'); }
            function catalogImpact() {
                catalog.impact = null;
                catalog.reason = '';
                if (catalog.target)
                    void run(async () => {
                        catalog.impact = await PigeAPI.request(base() + '/diary-catalog/' + catalog.target + '/impact');
                    });
            }
            function suggest() {
                return run(async () => {
                    const row = await PigeAPI.post(base() + '/diary-catalog/suggestions', {
                        name: catalog.name, code: catalog.code, workload_hours: catalog.hours
                    });
                    await catalogList();
                    catalog.name = '';
                    catalog.code = '';
                    catalog.hours = 0;
                    catalog.target = row.id;
                    catalog.impact = await PigeAPI.request(base() + '/diary-catalog/' + row.id + '/impact');
                    catalog.reason = '';
                    state.notice = 'Sugestão guardada em rascunho.';
                });
            }
            async function decide(action) {
                const impact = catalog.impact;
                if (!impact || catalog.reason.trim().length < 3)
                    return;
                const verbs = { retire: 'Desativar', publish: 'Publicar', discard: 'Descartar' };
                const reason = catalog.reason, school = props.schoolId;
                if (!await PigeDialogs.confirm(verbs[action] + ' este componente curricular?', {
                    title: 'Componente curricular', confirmLabel: verbs[action] + ' componente', destructive: action !== 'publish'
                }))
                    return;
                if (!active || props.schoolId !== school || catalog.impact !== impact || catalog.reason !== reason)
                    return;
                return run(async () => {
                    await PigeAPI.post(base() + '/diary-catalog/' + impact.id + '/decisions', { action, version: impact.version, reason });
                    catalog.impact = null;
                    catalog.target = '';
                    catalog.reason = '';
                    await loadBase();
                    await catalogList();
                    state.notice = 'Decisão registrada no histórico do componente.';
                });
            }
            const initial = new URLSearchParams(location.search);
            const pilot = props.catalogEnabled === true || pilotForSchool(props.schoolId);
            const materialsAllowed = () => !props.teacherPortal || props.allowMaterials !== false;
            const navigation = Vue.computed(() => groups.map(group => ({ ...group, pages: group.pages.filter(page => (page.id !== 'materials' || materialsAllowed()) && (!page.permission || can(page.permission)) && (page.id !== 'catalog' || props.catalogEnabled === true)) })).filter(group => group.pages.length));
            const activeGroup = Vue.computed(() => navigation.value.find(group => group.pages.some(page => page.id === state.page)));
            const filteredDiaries = Vue.computed(() => {
                const term = state.diaryFilter.trim().toLocaleLowerCase('pt-BR');
                return state.diaries.filter(d => [d.year_name, d.class_name, d.component_name, d.teacher_name].join(' ').toLocaleLowerCase('pt-BR').includes(term));
            });
            const lessons = Vue.computed(() => (state.selected?.lessons || []).filter(lesson => !pilot || !state.lessonPeriod || lesson.academic_period_id === state.lessonPeriod));
            async function filterPeriod(event) {
                const select = event.target;
                const next = select.value;
                select.value = state.lessonPeriod;
                if (workspaceDirty.value && !await confirmLeave())
                    return;
                state.lessonPeriod = next;
                select.value = next;
                state.selectedLesson = null;
                syncLink();
            }
            function pageLink(page) {
                const url = new URL(location.href);
                url.searchParams.set('diarioPiloto', props.schoolId);
                url.searchParams.set('guia', page);
                if (state.lessonPeriod)
                    url.searchParams.set('periodo', state.lessonPeriod);
                else
                    url.searchParams.delete('periodo');
                if (state.selected)
                    url.searchParams.set('diario', String(state.selected.id));
                else
                    url.searchParams.delete('diario');
                url.hash = props.teacherPortal ? 'diario' : '/diary';
                return url.pathname + url.search + url.hash;
            }
            function syncLink() { if (pilot)
                history.replaceState(history.state, '', pageLink(state.page)); }
            let active = true;
            async function confirmLeave() {
                const selected = state.selected, page = state.page, school = props.schoolId;
                const accepted = await PigeDialogs.confirm('Há alterações ainda não salvas no diário. Deseja continuar?', {
                    title: 'Sair da edição do diário?', confirmLabel: 'Continuar', cancelLabel: 'Voltar à edição'
                });
                return accepted && active && props.schoolId === school && state.selected === selected && page === state.page;
            }
            function navigatePage(id) {
                const page = navigation.value.flatMap(group => group.pages).find(item => item.id === id);
                if (!page)
                    return false;
                state.page = page.id;
                state.tab = page.tab;
                return true;
            }
            async function go(id) {
                if (id !== state.page && workspaceDirty.value && !await confirmLeave())
                    return;
                if (navigatePage(id)) {
                    syncLink();
                    if (id === 'catalog')
                        void run(catalogList);
                }
            }
            function show(...pages) { return !pilot || pages.includes(state.page); }
            const draftPages = new Set();
            const tracksDrafts = pilot || props.teacherPortal === true;
            const draftSection = () => pilot ? state.page : state.tab;
            async function save(action) {
                if (state.busy)
                    return;
                const page = draftSection();
                await action();
                if (!state.error && state.notice) {
                    draftPages.delete(page);
                    state.dirty = draftPages.size > 0;
                }
            }
            function markDraft(event) {
                if (tracksDrafts && event.target.closest('form,.x-form,td')) {
                    draftPages.add(draftSection());
                    state.dirty = true;
                }
            }
            async function chooseAnother() {
                if (workspaceDirty.value && !await confirmLeave())
                    return;
                draftPages.clear();
                state.dirty = false;
                state.lessonPeriod = '';
                state.selected = null;
                state.selectedLesson = null;
                syncLink();
            }
            if (pilot && !navigatePage(initial.get('guia') || 'dashboard'))
                navigatePage('dashboard');
            const str = (v) => v == null ? '' : String(v);
            const date = (v) => { const x = str(v); return x ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(x.length === 10 ? x + 'T12:00:00Z' : x)) : '—'; };
            const labels = { archived: 'Arquivado', open: 'Aberto', draft: 'Rascunho', submitted: 'Enviado', reviewed: 'Revisado', closed: 'Fechado', present: 'Presente', absent: 'Falta', justified_absence: 'Falta justificada', active: 'Ativo', suspended: 'Suspenso', published: 'Publicada', final: 'Final', pending: 'Pendente', calculated: 'Calculado', below_minimum: 'Abaixo da média', attendance_below_minimum: 'Frequência abaixo do mínimo', opinion_pending: 'Parecer pendente', concept: 'Conceito', follow_up: 'Acompanhamento', intervention: 'Intervenção', recovery: 'Recuperação', adaptation: 'Adaptação', referral: 'Encaminhamento', observation: 'Observação', positive: 'Positiva', pedagogical: 'Pedagógica', behavioral: 'Comportamental', safety: 'Segurança', other: 'Outra', resultados_avaliativos_pendentes: 'Há notas pendentes', sem_resultado_aplicavel: 'Sem resultado aplicável', chamada_pendente: 'Chamada pendente', conceito_fora_da_escala: 'Conceito fora da escala', peso_avaliativo_ausente: 'Peso não definido', resultado_numerico_ausente: 'Nota não informada', frequencia_abaixo_do_limite: 'Frequência abaixo do mínimo', parecer_final_pendente: 'Parecer final pendente' };
            const label = (v) => labels[str(v)] || str(v) || '—';
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
            async function loadBase() {
                const results = await Promise.all([
                    PigeAPI.request(base() + '/diaries'),
                    PigeAPI.request(base() + '/academic-periods'),
                    PigeAPI.request(base() + '/curriculum-components'),
                    can('diary.configure') ? PigeAPI.request(base() + '/academic-years') : Promise.resolve([]),
                    can('diary.configure') ? PigeAPI.request(base() + '/class-groups') : Promise.resolve([]),
                    can('diary.configure') && can('staff.assignments.read') ? PigeAPI.request(base() + '/teacher-assignments') : Promise.resolve([]),
                    PigeAPI.request(base() + '/diary-dashboard'),
                    PigeAPI.request(base() + '/diary-entry-fields')
                ]);
                state.diaries = results[0];
                state.periods = results[1];
                state.components = results[2];
                state.academicYears = results[3];
                state.groups = results[4];
                state.assignments = results[5];
                state.dashboard = results[6];
                const current = results[7];
                if (compositionDirty.value)
                    state.fields = current;
                else
                    setComposition(current);
                if (!state.periodForm.academic_year_id && state.academicYears.length) {
                    const year = state.academicYears.find(x => x.status === 'active' || x.active) || state.academicYears[0];
                    state.periodForm.academic_year_id = str(year.id);
                }
            }
            async function load() { await run(loadBase); }
            async function loadDiary(d) {
                const endpoint = base() + '/diaries/' + d.id;
                const [selected, summary, history, plans, assessments, rules, occurrences, opinions, records, communications, materials] = await Promise.all([
                    PigeAPI.request(endpoint), PigeAPI.request(endpoint + '/summary'),
                    PigeAPI.request(endpoint + '/history'),
                    PigeAPI.request(base() + '/curriculum-plans?class_group_id=' + encodeURIComponent(d.class_group_id) + '&component_id=' + encodeURIComponent(d.component_id)),
                    PigeAPI.request(endpoint + '/assessments'), PigeAPI.request(endpoint + '/assessment-rules'),
                    PigeAPI.request(endpoint + '/occurrences'), PigeAPI.request(endpoint + '/opinions'),
                    PigeAPI.request(endpoint + '/pedagogical-records'), PigeAPI.request(endpoint + '/communications'),
                    materialsAllowed() ? PigeAPI.request(endpoint + '/materials') : Promise.resolve([])
                ]);
                const changed = state.selected?.id !== d.id;
                state.reopenPeriod = '';
                state.selected = selected;
                state.summary = summary;
                state.history = history;
                state.plans = plans;
                state.assessments = assessments;
                state.assessmentRules = rules;
                state.occurrences = occurrences;
                state.opinions = opinions;
                state.pedagogicalRecords = records;
                state.communications = communications;
                state.selectedLesson = null;
                state.attendance = [];
                state.assessmentEditing = null;
                state.selectedAssessment = null;
                state.assessmentRoster = [];
                state.periodResults = [];
                state.materials = materials;
                if (changed) {
                    state.materialForm = { client_key: PigeOnline.newId(), kind: 'Atividade', title: '', body: '', enrollment_id: '' };
                    resetPlan();
                    resetLesson();
                    state.assessmentForm = { academic_period_id: '', title: '', kind: 'activity', assessment_date: today(), value_type: 'numeric', max_score: '10', weight: '1', description: '', skills: '', status: 'published' };
                    state.opinionForm = { academic_period_id: '', enrollment_id: '', text: '', status: 'draft' };
                    state.pedagogicalForm = { enrollment_id: '', record_date: today(), kind: 'observation', text: '' };
                    state.reportPeriod = '';
                    state.reportEnrollment = '';
                    state.closePeriod = '';
                }
                state.occurrenceForm = { academic_period_id: '', enrollment_id: '', occurrence_date: today(), kind: 'pedagogical', title: '', description: '', status: 'draft' };
                const firstPeriod = periodsFor(d)[0];
                selectRulePeriod(firstPeriod ? str(firstPeriod.id) : '');
                state.communicationRecipients = [];
                state.communicationForm = { enrollment_id: '', academic_period_id: '', occurrence_id: '', recipient_guardian_link_ids: [], title: '', message: '', client_key: PigeOnline.newId() };
            }
            async function selectDiary(d, discardApproved = false) {
                if (state.selected?.id !== d.id && discardApproved !== true && workspaceDirty.value && !await confirmLeave())
                    return;
                await run(async () => {
                    await loadDiary(d);
                    draftPages.clear();
                    state.dirty = false;
                    state.lessonPeriod = '';
                    syncLink();
                });
            }
            function selectRulePeriod(periodId) { const rule = state.assessmentRules.find(x => x.academic_period_id === periodId); state.assessmentRuleForm = { period_id: periodId, method: str(rule?.method) || 'arithmetic', scale_max: str(rule?.scale_max) || '10', decimal_places: Number(rule?.decimal_places ?? 2), minimum_score: str(rule?.minimum_score), minimum_attendance_percent: str(rule?.minimum_attendance_percent), justified_absence_counts_as_present: rule?.justified_absence_counts_as_present == null ? '' : String(rule.justified_absence_counts_as_present), recovery_mode: str(rule?.recovery_mode) || 'none', concept_scale: Array.isArray(rule?.concept_scale) ? rule.concept_scale.join(', ') : '', required_opinion: Boolean(rule?.required_opinion), version: rule?.version == null ? null : Number(rule.version) }; }
            async function saveAssessmentRule() { if (!state.selected || !state.assessmentRuleForm.period_id)
                return; await run(async () => { const f = state.assessmentRuleForm; const body = { method: f.method, scale_max: f.scale_max, decimal_places: f.decimal_places, minimum_score: f.minimum_score || null, minimum_attendance_percent: f.minimum_attendance_percent || null, justified_absence_counts_as_present: f.minimum_attendance_percent ? (f.justified_absence_counts_as_present === 'true') : null, recovery_mode: f.recovery_mode, concept_scale: f.method === 'concept' ? f.concept_scale.split(/[,;]+/).map(x => x.trim()).filter(Boolean) : [], required_opinion: f.required_opinion, version: f.version }; const saved = await PigeAPI.request(base() + '/diaries/' + state.selected.id + '/assessment-rules/' + f.period_id, { method: 'PUT', body: JSON.stringify(body) }); state.assessmentRules = state.assessmentRules.filter(x => x.academic_period_id !== f.period_id).concat(saved); selectRulePeriod(f.period_id); state.notice = 'Regra salva. Consolide o período para atualizar os resultados.'; }); }
            async function loadPeriodResults() { if (!state.selected || !state.assessmentRuleForm.period_id)
                return; await run(async () => { const r = await PigeAPI.request(base() + '/diaries/' + state.selected.id + '/periods/' + state.assessmentRuleForm.period_id + '/results'); state.periodResults = r.items; }); }
            async function consolidatePeriod() { if (!state.selected || !state.assessmentRuleForm.period_id)
                return; await run(async () => { const r = await PigeAPI.post(base() + '/diaries/' + state.selected.id + '/periods/' + state.assessmentRuleForm.period_id + '/consolidate', { version: state.selected.version }); state.periodResults = r.results; state.notice = 'Período consolidado. ' + r.pending + ' resultado(s) pendente(s).'; await loadBase(); }); }
            async function saveOccurrence() { if (!state.selected)
                return; await run(async () => { const f = state.occurrenceForm; await PigeAPI.post(base() + '/diaries/' + state.selected.id + '/occurrences', { ...f, academic_period_id: f.academic_period_id || null }); state.occurrences = await PigeAPI.request(base() + '/diaries/' + state.selected.id + '/occurrences'); state.occurrenceForm = { academic_period_id: f.academic_period_id, enrollment_id: '', occurrence_date: today(), kind: 'pedagogical', title: '', description: '', status: 'draft' }; state.notice = 'Ocorrência registrada no Diário.'; }); }
            async function loadCommunicationRecipients() { if (!state.selected || !state.communicationForm.enrollment_id) {
                state.communicationRecipients = [];
                state.communicationForm.recipient_guardian_link_ids = [];
                return;
            } const query = '?enrollment_id=' + encodeURIComponent(state.communicationForm.enrollment_id); state.communicationRecipients = await PigeAPI.request(base() + '/diaries/' + state.selected.id + '/communication-recipients' + query); state.communicationForm.recipient_guardian_link_ids = []; }
            function communicationOccurrenceChanged() { const occurrence = state.occurrences.find(x => x.id === state.communicationForm.occurrence_id); if (occurrence?.academic_period_id)
                state.communicationForm.academic_period_id = str(occurrence.academic_period_id); }
            async function sendCommunication() { if (!state.selected)
                return; await run(async () => { const f = state.communicationForm; const result = await PigeAPI.post(base() + '/diaries/' + state.selected.id + '/communications', { ...f, academic_period_id: f.academic_period_id || null, occurrence_id: f.occurrence_id || null }); state.communications = await PigeAPI.request(base() + '/diaries/' + state.selected.id + '/communications'); state.communicationForm = { ...f, occurrence_id: '', recipient_guardian_link_ids: [], title: '', message: '', client_key: PigeOnline.newId() }; state.communicationRecipients = []; state.notice = result.created ? 'Comunicado disponibilizado no portal para ' + result.created + ' conta(s).' : 'Esta operação já havia sido processada; nenhum comunicado duplicado foi criado.'; }); }
            function periodsFor(d) {
                const group = state.groups.find(g => g.id === d.class_group_id);
                const ids = group?.academic_period_ids || d.academic_period_ids;
                return state.periods.filter(p => p.academic_year_id === d.academic_year_id && (Array.isArray(ids) && ids.length ? ids.includes(p.id) : !p.class_calendar_only));
            }
            function loadCalendar() {
                const group = state.groups.find(g => g.id === state.periodForm.class_group_id);
                state.calendarIds = Array.isArray(group?.academic_period_ids) && group.academic_period_ids.length ? [...group.academic_period_ids] :
                    state.periods.filter(p => p.academic_year_id === state.periodForm.academic_year_id && !p.class_calendar_only).map(p => p.id);
            }
            async function saveCalendar() {
                await run(async () => {
                    const group = state.groups.find(g => g.id === state.periodForm.class_group_id);
                    if (!group)
                        return;
                    await PigeAPI.request(base() + '/class-groups/' + group.id + '/calendar', { method: 'PUT', body: JSON.stringify({ period_ids: state.calendarIds, version: group.version }) });
                    await loadBase();
                    loadCalendar();
                    state.notice = 'Calendário da turma atualizado.';
                });
            }
            async function createPeriod() { await run(async () => { await PigeAPI.post(base() + '/academic-periods', state.periodForm); state.periodForm = { class_group_id: state.periodForm.class_group_id, academic_year_id: state.periodForm.academic_year_id, name: '', starts_on: '', ends_on: '', order_index: state.periodForm.order_index + 1, active: true }; await loadBase(); loadCalendar(); state.notice = 'Período letivo criado.'; }); }
            const compositionDirty = Vue.computed(() => JSON.stringify(state.configFields) !== JSON.stringify(state.fields.fields));
            function setComposition(settings) {
                state.fields = settings;
                state.configVersion = settings.version;
                state.configFields = settings.fields.map(field => ({ ...field }));
            }
            const restorableFields = Vue.computed(() => Object.keys(state.fields.standard_columns).filter(id => !state.configFields.some(field => field.id === id)));
            function restoreField() {
                const id = state.restoreFieldId;
                if (!restorableFields.value.includes(id) || state.configFields.length >= 40)
                    return;
                state.configFields.push({ id, scope: id.startsWith('standard-plan-') ? 'plan' : 'lesson', label: state.fields.standard_labels?.[id] || '' });
                state.restoreFieldId = '';
            }
            function addField() {
                const label = state.newFieldLabel.trim();
                if (label.length < 2 || state.configFields.length >= 40)
                    return;
                state.configFields.push({ id: PigeOnline.newId(), label, scope: state.newFieldScope });
                state.newFieldLabel = '';
            }
            function moveField(index, offset) {
                const target = index + offset;
                if (target < 0 || target >= state.configFields.length)
                    return;
                const [field] = state.configFields.splice(index, 1);
                state.configFields.splice(target, 0, field);
            }
            async function saveFields() {
                await run(async () => {
                    const result = await PigeAPI.request(base() + '/diary-entry-fields', { method: 'PUT',
                        body: JSON.stringify({ version: state.configVersion, fields: state.configFields }) });
                    setComposition(result);
                    state.notice = 'Composição atualizada para esta escola.';
                });
            }
            function resetComponent() {
                state.componentEditing = null;
                state.componentForm = { name: '', code: '', workload_hours: 0, active: true };
            }
            function editComponent(row) {
                state.componentEditing = row;
                state.componentForm = { name: str(row.name), code: str(row.code), workload_hours: Number(row.workload_hours), active: Boolean(row.active) };
                focusHeading('diary-component-heading');
            }
            async function createComponent() {
                await run(async () => {
                    const endpoint = base() + '/curriculum-components', editing = state.componentEditing;
                    if (editing)
                        await PigeAPI.request(endpoint + '/' + editing.id, { method: 'PATCH', body: JSON.stringify({ ...state.componentForm, version: editing.version }) });
                    else
                        await PigeAPI.post(endpoint, state.componentForm);
                    resetComponent();
                    await loadBase();
                    state.notice = editing ? 'Componente curricular atualizado.' : 'Componente curricular criado.';
                });
            }
            async function removeComponent(row) {
                if (state.busy || !can('diary.configure'))
                    return;
                const school = props.schoolId, version = row.version;
                const reason = await PigeDialogs.prompt('Componentes com registros serão desativados. Componentes sem vínculos serão excluídos.', {
                    title: 'Retirar ' + row.name + '?', inputLabel: 'Justificativa', minLength: 3, maxLength: 1000,
                    confirmLabel: 'Confirmar retirada', destructive: true
                });
                if (reason === null || !active || props.schoolId !== school || !can('diary.configure') || !state.components.some(item => item.id === row.id && item.version === version))
                    return;
                await run(async () => {
                    const result = await PigeAPI.post(base() + '/curriculum-components/' + row.id + '/remove', { version, reason });
                    if (state.componentEditing?.id === row.id)
                        resetComponent();
                    await loadBase();
                    state.notice = result.action === 'retired' ? 'Componente desativado. Os vínculos históricos foram preservados.' : 'Componente sem vínculos removido.';
                });
            }
            const existingDiary = Vue.computed(() => state.diaries.find(row => row.class_group_id === state.diaryForm.class_group_id && row.component_id === state.diaryForm.component_id));
            const selectedComponent = Vue.computed(() => state.components.find(row => row.id === state.diaryForm.component_id));
            const matchingAssignments = Vue.computed(() => {
                const subject = str(selectedComponent.value?.name).trim().toLocaleLowerCase('pt-BR');
                if (!subject)
                    return [];
                return state.assignments.filter(row => row.active && row.class_group_id === state.diaryForm.class_group_id &&
                    (!str(row.subject_name).trim() || str(row.subject_name).trim().toLocaleLowerCase('pt-BR') === subject));
            });
            function resetTeacherSearch() {
                state.teacherPersonId = '';
                state.teacherResults = [];
                state.teacherSearched = false;
            }
            function syncDiaryAssignment() {
                state.diaryForm.teacher_assignment_id = existingDiary.value?.teacher_assignment_id || '';
                state.teacherSearch = '';
                resetTeacherSearch();
            }
            async function configureTeacher(d) {
                if (pilot) {
                    await go('new-diary');
                    if (state.page !== 'new-diary')
                        return;
                }
                else
                    state.tab = 'setup';
                state.diaryForm.class_group_id = d.class_group_id;
                state.diaryForm.component_id = d.component_id;
                syncDiaryAssignment();
                focusHeading('diary-assignment-heading');
            }
            async function searchTeachers() {
                const term = state.teacherSearch.trim();
                if (term.length < 2)
                    return;
                await run(async () => {
                    resetTeacherSearch();
                    const result = await PigeAPI.request(base() + '/teachers?q=' + encodeURIComponent(term) + '&page_size=30');
                    if (state.teacherSearch.trim() === term) {
                        state.teacherResults = result.items.filter(row => row.person.active);
                        state.teacherSearched = true;
                    }
                });
            }
            async function createDiary() {
                await run(async () => {
                    const current = existingDiary.value;
                    const form = state.diaryForm;
                    let assignment = form.teacher_assignment_id || null;
                    if (state.teacherPersonId && selectedComponent.value) {
                        const row = await PigeAPI.post(base() + '/teacher-assignments', { teacher_person_id: state.teacherPersonId,
                            class_group_id: form.class_group_id, subject_name: str(selectedComponent.value.name), active: true });
                        if (!state.assignments.some(item => item.id === row.id))
                            state.assignments.push(row);
                        assignment = row.id;
                        form.teacher_assignment_id = row.id;
                        resetTeacherSearch();
                    }
                    let diary;
                    if (current) {
                        diary = await PigeAPI.request(base() + '/diaries/' + current.id + '/teacher-assignment', { method: 'PUT', body: JSON.stringify({ version: current.version, teacher_assignment_id: assignment }) });
                    }
                    else {
                        diary = await PigeAPI.post(base() + '/diaries', { ...form, teacher_assignment_id: assignment });
                    }
                    state.diaryForm = { class_group_id: '', component_id: '', teacher_assignment_id: '', notes: '' };
                    state.teacherSearch = '';
                    resetTeacherSearch();
                    await loadBase();
                    await loadDiary(diary);
                    if (pilot) {
                        navigatePage('diaries');
                        syncLink();
                    }
                    else
                        state.tab = 'diaries';
                    state.notice = current ? 'Vínculo docente do diário atualizado.' : 'Diário aberto.';
                });
            }
            function focusHeading(id) {
                void Vue.nextTick(() => document.getElementById?.(id)?.focus());
            }
            function storedFields(row) {
                if (!row)
                    return [];
                const fields = Array.isArray(row.extra_fields) ? row.extra_fields : [];
                const items = fields.map(field => {
                    const value = field.column ? row[field.column] : field.value;
                    return { ...field, value: Array.isArray(value) ? value.join(', ') : str(value) };
                });
                // Documentos anteriores à migração contêm apenas as colunas nativas.
                const scope = row.lesson_date ? 'lesson' : 'plan';
                for (const [id, column] of Object.entries(state.fields.standard_columns)) {
                    if (!id.startsWith('standard-' + scope + '-') || items.some(field => field.id === id) || !row[column])
                        continue;
                    const value = row[column], label = state.fields.standard_labels?.[id];
                    if (label && (!Array.isArray(value) || value.length))
                        items.push({ id, column, label, value: Array.isArray(value) ? value.join(', ') : str(value) });
                }
                return items;
            }
            function editableValues(row, scope) {
                const active = new Set(state.fields.fields.filter(field => field.scope === scope).map(field => field.id));
                return Object.fromEntries(storedFields(row).filter(field => !field.column && active.has(field.id)).map(field => [field.id, field.value]));
            }
            function resetPlan() {
                state.planEditing = null;
                state.planValues = {};
                state.planForm = emptyPlan(state.selected);
            }
            function editPlan(row) {
                resetPlan();
                state.planEditing = row;
                state.planValues = editableValues(row, 'plan');
                for (const key of Object.keys(state.planForm)) {
                    state.planForm[key] = key === 'bncc_references' && Array.isArray(row[key]) ? row[key].join(', ') : str(row[key]);
                }
                focusHeading('diary-plan-heading');
            }
            async function createPlan() {
                if (!state.selected)
                    return;
                await run(async () => {
                    const f = state.planForm, editing = state.planEditing, endpoint = base() + '/curriculum-plans';
                    const body = { ...f, academic_period_id: f.academic_period_id || null, teacher_assignment_id: f.teacher_assignment_id || null,
                        bncc_references: f.bncc_references.split(/[\s,;]+/).filter(Boolean), field_values: state.planValues };
                    if (editing)
                        await PigeAPI.request(endpoint + '/' + editing.id, { method: 'PATCH', body: JSON.stringify({ ...body, version: editing.version }) });
                    else
                        await PigeAPI.post(endpoint, body);
                    state.plans = await PigeAPI.request(endpoint + '?class_group_id=' + encodeURIComponent(f.class_group_id) + '&component_id=' + encodeURIComponent(f.component_id));
                    resetPlan();
                    state.notice = editing ? 'Planejamento atualizado.' : 'Planejamento registrado.';
                });
            }
            function resetLesson() { state.lessonEditing = null; state.lessonValues = {}; state.lessonForm = emptyLesson(); }
            async function editLesson(row) {
                if (pilot && state.page !== 'diaries') {
                    await go('diaries');
                    if (state.page !== 'diaries')
                        return;
                }
                syncLink();
                state.lessonEditing = row;
                state.lessonValues = editableValues(row, 'lesson');
                const { academic_period_id, lesson_date, lesson_count, content, skills, methodology, activities, homework, notes } = row;
                state.lessonForm = { academic_period_id: academic_period_id || '', lesson_date, lesson_count, content, skills, methodology, activities, homework, notes };
                focusHeading('diary-lesson-heading');
            }
            async function createLesson() {
                if (!state.selected)
                    return;
                await run(async () => {
                    const endpoint = base() + '/diaries/' + state.selected.id + '/lessons', editing = state.lessonEditing;
                    const body = { ...state.lessonForm, academic_period_id: state.lessonForm.academic_period_id || null, field_values: state.lessonValues };
                    if (editing)
                        await PigeAPI.request(endpoint + '/' + editing.id, { method: 'PATCH', body: JSON.stringify({ ...body, version: editing.version }) });
                    else
                        await PigeAPI.post(endpoint, body);
                    const period = state.lessonForm.academic_period_id;
                    resetLesson();
                    state.lessonForm.academic_period_id = period;
                    await loadDiary(state.selected);
                    state.notice = editing ? 'Aula atualizada.' : 'Aula registrada.';
                });
            }
            async function removeLesson() {
                const diary = state.selected, lesson = state.lessonEditing;
                if (!diary || !lesson || state.busy || diary.status !== 'open' || !can('diary.write'))
                    return;
                const school = props.schoolId, version = lesson.version;
                const reason = await PigeDialogs.prompt('Somente aulas sem chamada e sem fechamento anterior podem ser removidas.', {
                    title: 'Remover aula de ' + date(lesson.lesson_date) + '?', inputLabel: 'Justificativa', minLength: 3, maxLength: 1000,
                    confirmLabel: 'Confirmar remoção da aula', destructive: true
                });
                if (reason === null || !active || props.schoolId !== school || state.selected !== diary || diary.status !== 'open' || !can('diary.write') || state.lessonEditing !== lesson || lesson.version !== version)
                    return;
                await run(async () => {
                    await PigeAPI.post(base() + '/diaries/' + diary.id + '/lessons/' + lesson.id + '/remove', { version, reason });
                    resetLesson();
                    await loadDiary(diary);
                    state.notice = 'Aula removida do diário.';
                });
            }
            function attendancePath(lesson) { return base() + '/diaries/' + state.selected.id + '/lessons/' + lesson.id + '/attendance'; }
            async function fetchAttendance(lesson) {
                const result = await PigeAPI.request(attendancePath(lesson));
                state.selectedLesson = result.lesson;
                state.attendanceBase = Object.fromEntries(result.roster.map(r => [r.enrollment_id, { status: r.attendance?.status || '', note: r.attendance?.note || '' }]));
                state.attendance = result.roster.map(r => ({ ...r, attendance: r.attendance || { status: '', note: '' } }));
            }
            const changedAttendance = Vue.computed(() => state.attendance.filter(r => {
                const previous = state.attendanceBase[r.enrollment_id], current = r.attendance;
                return current?.status && (previous?.status !== current.status || previous?.note !== current.note);
            }));
            const pendingAttendance = Vue.computed(() => state.attendance.filter(row => !row.attendance?.status).length);
            function markPendingPresent() {
                for (const row of state.attendance)
                    if (row.attendance && !row.attendance.status)
                        row.attendance.status = 'present';
            }
            async function confirmDiscardAttendance() {
                const lesson = state.selectedLesson, selected = state.selected;
                const accepted = await PigeDialogs.confirm('As presenças, faltas e justificativas em edição serão descartadas.', {
                    title: 'Descartar as alterações desta chamada?', confirmLabel: 'Descartar alterações', destructive: true
                });
                return accepted && active && state.selectedLesson === lesson && state.selected === selected;
            }
            async function closeAttendance() {
                if (changedAttendance.value.length && !await confirmDiscardAttendance())
                    return false;
                state.selectedLesson = null;
                state.attendance = [];
                state.attendanceBase = {};
                return true;
            }
            async function openAttendance(lesson) {
                if (!state.selected || (state.selectedLesson && changedAttendance.value.length && !await confirmDiscardAttendance()))
                    return;
                await run(async () => { await fetchAttendance(lesson); focusHeading('diary-attendance-heading'); });
            }
            async function saveAttendance() {
                const lesson = state.selectedLesson;
                if (!state.selected || !lesson || !changedAttendance.value.length)
                    return;
                await run(async () => {
                    const items = changedAttendance.value.map(r => ({ enrollment_id: r.enrollment_id, status: r.attendance.status, note: r.attendance.note,
                        version: r.attendance.version ?? null, expected_empty: r.attendance.version == null }));
                    await PigeAPI.request(attendancePath(lesson), { method: 'PUT', body: JSON.stringify({ items }) });
                    await fetchAttendance(lesson);
                    state.summary = await PigeAPI.request(base() + '/diaries/' + state.selected.id + '/summary');
                    state.notice = items.length + ' registro(s) de frequência salvo(s).';
                });
            }
            function editAssessment(assessment) {
                state.assessmentEditing = assessment;
                state.assessmentForm = { academic_period_id: str(assessment.academic_period_id), title: str(assessment.title), kind: str(assessment.kind), assessment_date: str(assessment.assessment_date), value_type: str(assessment.value_type), max_score: str(assessment.max_score), weight: str(assessment.weight), description: str(assessment.description), skills: str(assessment.skills), status: str(assessment.status) };
                state.tab = 'assessments';
            }
            function cancelAssessmentEdit() {
                state.assessmentEditing = null;
                state.assessmentForm = { academic_period_id: state.assessmentForm.academic_period_id, title: '', kind: 'activity', assessment_date: today(), value_type: 'numeric', max_score: '10', weight: '1', description: '', skills: '', status: 'published' };
            }
            async function createAssessment() {
                if (!state.selected)
                    return;
                await run(async () => {
                    const f = state.assessmentForm;
                    const body = { ...f, academic_period_id: f.academic_period_id || null, max_score: f.value_type === 'numeric' ? (f.max_score || null) : null, weight: f.weight || null };
                    const path = base() + '/diaries/' + state.selected.id + '/assessments';
                    const editing = state.assessmentEditing;
                    if (editing)
                        await PigeAPI.request(path + '/' + editing.id, { method: 'PATCH', body: JSON.stringify({ ...body, version: editing.version }) });
                    else
                        await PigeAPI.post(path, body);
                    cancelAssessmentEdit();
                    state.assessments = await PigeAPI.request(path);
                    state.notice = editing ? 'Avaliação atualizada. Consolide o período para atualizar o boletim.' : 'Avaliação criada.';
                });
            }
            function gradeValues() {
                return JSON.stringify(state.assessmentRoster.map(({ enrollment_id, result }) => [enrollment_id, str(result?.numeric_score), str(result?.concept), str(result?.note)]));
            }
            const workspaceDirty = Vue.computed(() => state.dirty || compositionDirty.value || changedAttendance.value.length > 0 ||
                Boolean(state.selectedAssessment && gradeValues() !== state.assessmentBaseline));
            async function openAssessment(a) {
                if (!state.selected)
                    return;
                await run(async () => {
                    const result = await PigeAPI.request(base() + '/diaries/' + state.selected.id + '/assessments/' + a.id + '/results');
                    state.selectedAssessment = result.instrument;
                    state.assessmentRoster = result.roster.map(r => ({ ...r, result: r.result || { numeric_score: null, concept: '', note: '' } }));
                    state.assessmentBaseline = gradeValues();
                });
            }
            async function saveAssessmentResults() {
                if (!state.selected || !state.selectedAssessment)
                    return;
                await run(async () => {
                    const numeric = state.selectedAssessment.value_type === 'numeric';
                    const filled = (r) => numeric ? r.result?.numeric_score !== null && r.result?.numeric_score !== undefined && str(r.result.numeric_score).trim() !== '' : Boolean(str(r.result?.concept).trim());
                    if (state.assessmentRoster.some(r => r.result?.id && !filled(r)))
                        throw new Error('Para corrigir uma nota já salva, informe o novo resultado.');
                    const rows = state.assessmentRoster.filter(filled);
                    if (!rows.length)
                        throw new Error('Informe ao menos uma nota ou conceito para salvar.');
                    const assessment = state.selectedAssessment;
                    await PigeAPI.request(base() + '/diaries/' + state.selected.id + '/assessments/' + assessment.id + '/results', { method: 'PUT', body: JSON.stringify({ items: rows.map(r => ({ enrollment_id: r.enrollment_id, numeric_score: numeric ? r.result.numeric_score : null, concept: numeric ? '' : str(r.result?.concept).trim(), note: str(r.result?.note), version: r.result?.version ?? null })) }) });
                    await loadDiary(state.selected);
                    state.notice = rows.length + ' resultado(s) salvo(s).';
                });
            }
            async function saveOpinion() { if (!state.selected)
                return; await run(async () => { await PigeAPI.post(base() + '/diaries/' + state.selected.id + '/opinions', { ...state.opinionForm, academic_period_id: state.opinionForm.academic_period_id || null }); state.opinionForm = { academic_period_id: state.opinionForm.academic_period_id, enrollment_id: '', text: '', status: 'draft' }; state.opinions = await PigeAPI.request(base() + '/diaries/' + state.selected.id + '/opinions'); state.notice = 'Parecer salvo.'; }); }
            async function createPedagogicalRecord() { if (!state.selected)
                return; await run(async () => { await PigeAPI.post(base() + '/diaries/' + state.selected.id + '/pedagogical-records', state.pedagogicalForm); state.pedagogicalForm = { enrollment_id: '', record_date: today(), kind: 'observation', text: '' }; state.pedagogicalRecords = await PigeAPI.request(base() + '/diaries/' + state.selected.id + '/pedagogical-records'); state.notice = 'Registro pedagógico incluído.'; }); }
            async function submitDiary() { if (!state.selected)
                return; await run(async () => { await PigeAPI.post(base() + '/diaries/' + state.selected.id + '/submit', { version: state.selected.version }); await loadDiary(state.selected); state.notice = 'Diário enviado para revisão.'; }); }
            async function reviewDiary() { if (!state.selected)
                return; await run(async () => { await PigeAPI.post(base() + '/diaries/' + state.selected.id + '/review', { version: state.selected.version }); await loadDiary(state.selected); state.notice = 'Diário marcado como revisado.'; }); }
            async function closeDiary() { if (!state.selected)
                return; await run(async () => { const period = Boolean(state.closePeriod); await PigeAPI.post(base() + '/diaries/' + state.selected.id + '/close', { academic_period_id: state.closePeriod || null, reason: state.closeReason, version: state.selected.version }); await loadDiary(state.selected); state.notice = period ? 'Período fechado.' : 'Diário fechado.'; }); }
            async function resumeDiary() {
                const diary = state.selected;
                if (!diary)
                    return;
                await run(async () => {
                    await PigeAPI.post(base() + '/diaries/' + diary.id + '/resume', { version: diary.version });
                    await loadDiary(diary);
                    state.notice = 'Lançamentos liberados nos períodos abertos.';
                });
            }
            async function reopenDiary() { if (!state.selected)
                return; await run(async () => { await PigeAPI.post(base() + '/diaries/' + state.selected.id + '/reopen', { academic_period_id: state.reopenPeriod || null, reason: state.reopenReason, version: state.selected.version }); state.reopenReason = ''; await loadDiary(state.selected); state.notice = 'Diário reaberto com registro de retificação.'; }); }
            async function publishMaterial() {
                if (!state.selected)
                    return;
                await run(async () => {
                    const path = base() + '/diaries/' + state.selected.id + '/materials', draft = state.materialForm;
                    await PigeAPI.post(path, { ...draft, enrollment_id: draft.enrollment_id || null });
                    state.materials = await PigeAPI.request(path);
                    state.materialForm = { client_key: PigeOnline.newId(), kind: 'Atividade', title: '', body: '', enrollment_id: '' };
                    state.notice = 'Material publicado no portal do aluno e do responsável.';
                });
            }
            async function printMaterial(id) { if (state.selected)
                await run(() => PigeAPI.download(base() + '/diaries/' + state.selected.id + '/materials/' + id + '/print.pdf', 'material-escolar.pdf')); }
            async function report() { if (state.selected)
                await run(() => { const q = new URLSearchParams(); if (['attendance', 'pedagogical_register'].includes(state.reportType)) {
                    if (state.reportFrom)
                        q.set('date_from', state.reportFrom);
                    if (state.reportTo)
                        q.set('date_to', state.reportTo);
                } if (state.reportPeriod)
                    q.set('academic_period_id', state.reportPeriod); if (state.reportType === 'student_record' && state.reportEnrollment)
                    q.set('enrollment_id', state.reportEnrollment); const query = q.toString(); return PigeAPI.download(base() + '/diaries/' + state.selected.id + '/reports/' + state.reportType + '.pdf' + (query ? '?' + query : ''), 'diario-' + state.reportType + '.pdf'); }); }
            let handled;
            async function openRequestedDiary() {
                const request = props.requestedDiary;
                if (!request || handled === request || state.busy || (request.tab === 'materials' && !materialsAllowed()))
                    return;
                const diary = state.diaries.find(item => item.id === request.id);
                if (!diary)
                    return;
                handled = request;
                if (state.selected?.id !== diary.id) {
                    await selectDiary(diary, request.discardApproved === true);
                    if (!active || props.requestedDiary !== request || state.selected?.id !== diary.id)
                        return;
                }
                else if (!request.discardApproved && workspaceDirty.value && state.page !== request.tab && !await confirmLeave())
                    return;
                if (pilot) {
                    navigatePage(request.tab || 'diaries');
                    syncLink();
                }
                else
                    state.tab = request.tab === 'attendance' ? 'diaries' : request.tab || 'diaries';
                if (request.tab === 'attendance')
                    focusHeading('diary-lessons-heading');
            }
            Vue.watch(() => props.requestedDiary, openRequestedDiary);
            Vue.watch(() => state.busy, openRequestedDiary);
            Vue.onMounted(async () => {
                await load();
                if (pilot && state.page === 'catalog')
                    await run(catalogList);
                if (props.requestedDiary) {
                    openRequestedDiary();
                    return;
                }
                if (pilot && (!props.teacherPortal || location.hash === '#diario')) {
                    const diary = state.diaries.find(item => item.id === initial.get('diario'));
                    if (diary) {
                        await selectDiary(diary);
                        const period = initial.get('periodo');
                        if (period && state.periods.some(p => p.id === period && p.academic_year_id === diary.academic_year_id)) {
                            state.lessonPeriod = period;
                            syncLink();
                        }
                    }
                    else
                        syncLink();
                }
            });
            Vue.onUnmounted(() => { active = false; });
            return { props, state, workspaceDirty, existingDiary, matchingAssignments, configureTeacher, syncDiaryAssignment, resetTeacherSearch, searchTeachers, compositionDirty, setComposition, restorableFields, restoreField, addField, moveField, saveFields, editComponent, resetComponent, removeComponent, editLesson, resetLesson, removeLesson, editPlan, resetPlan, storedFields, markPendingPresent, pendingAttendance, changedAttendance, closeAttendance, periodsFor, loadCalendar, saveCalendar, pilot, catalog, catalogImpact, suggest, decide, lessons, filterPeriod, save, navigation, activeGroup, filteredDiaries, pageLink, go, show, chooseAnother, markDraft, publishMaterial, printMaterial, can, str, date, label, load, selectDiary, loadCommunicationRecipients, communicationOccurrenceChanged, sendCommunication, createPeriod, createComponent, createDiary, createPlan, createLesson, openAttendance, saveAttendance, createAssessment, editAssessment, cancelAssessmentEdit, openAssessment, saveAssessmentResults, saveOpinion, createPedagogicalRecord, submitDiary, reviewDiary, closeDiary, resumeDiary, reopenDiary, report, selectRulePeriod, saveAssessmentRule, loadPeriodResults, consolidatePeriod, saveOccurrence };
        } };
})(PigeDiary || (PigeDiary = {}));
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
var PigeTeacher;
(function (PigeTeacher) {
    const pages = [
        { id: 'overview', label: 'Visão geral', icon: 'dashboard' },
        { id: 'agenda', label: 'Minha programação', icon: 'clock' },
        { id: 'diary', label: 'Diário de classe', icon: 'academic' },
        { id: 'materials', label: 'Atividades e trabalhos', icon: 'documents' },
        { id: 'news', label: 'Avisos e publicações', icon: 'bell' },
        { id: 'support', label: 'Atendimento', icon: 'school' },
        { id: 'webmail', label: 'E-mail', icon: 'email' },
    ];
    const mail = PigePortalMail.use(PigeAPI.request);
    const sidebarKey = 'pige.teacher.sidebar.collapsed';
    function savedSidebar() {
        try {
            return localStorage.getItem(sidebarKey) === 'true';
        }
        catch {
            return false;
        }
    }
    const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bahia' }).format(new Date());
    const s = Vue.reactive({ ready: false, busy: false, error: '', email: '', password: '', passwordVisible: false,
        user: null, schools: [], schoolId: '',
        requestedDiary: undefined, section: 'overview', tabs: ['overview'], sidebarCollapsed: savedSidebar(), menuOpen: false,
        news: [], newsPage: 1, newsTotal: 0, week: today(), agenda: null });
    const rail = PigeSidebarRail.use(() => s.sidebarCollapsed);
    let loadedSchoolId = '', sessionVersion = 0;
    function clear() {
        sessionVersion++;
        PigeDialogs.cancelPending();
        rail.close();
        loadedSchoolId = '';
        mail.clear();
        PigeAPI.clear();
        PigeMFA.clear();
        s.user = null;
        s.schools = [];
        s.schoolId = '';
        s.password = '';
        s.passwordVisible = false;
        s.section = 'overview';
        s.tabs = ['overview'];
        s.requestedDiary = undefined;
        s.menuOpen = false;
        s.news = [];
        s.agenda = null;
        s.week = today();
        s.error = '';
    }
    async function run(work) {
        if (s.busy)
            return;
        s.busy = true;
        s.error = '';
        try {
            await work();
        }
        catch (e) {
            if (e.name !== 'AbortError')
                s.error = e.message;
        }
        finally {
            s.busy = false;
        }
    }
    async function agenda() {
        const id = s.schoolId, week = s.week;
        if (!id || !week || (!available('agenda') && !available('diary')))
            return;
        const resource = available('agenda') ? 'programacao' : 'atribuicoes';
        const data = await PigeAPI.request('/teacher/schools/' + id + '/' + resource + '?week=' + encodeURIComponent(week));
        if (id === s.schoolId && week === s.week)
            s.agenda = data;
    }
    async function school(id) {
        sessionVersion++;
        PigeDialogs.cancelPending();
        rail.close();
        if (s.schoolId && s.schoolId !== id)
            PigeDiary.clearPilotContext(s.schoolId);
        loadedSchoolId = '';
        mail.clear();
        s.agenda = null;
        s.news = [];
        s.newsPage = 1;
        s.newsTotal = 0;
        s.section = 'overview';
        s.tabs = ['overview'];
        s.requestedDiary = undefined;
        s.schoolId = id;
        PigeAPI.setActiveSchool(id);
        if (s.user)
            s.user = { ...s.user, permissions: [], teacher_routines: [] };
        if (!id)
            return;
        s.user = await PigeAPI.request('/auth/me');
        loadedSchoolId = id;
        await Promise.all([agenda(), s.user.teacher_routines?.includes('mail') ? mail.load(id) : Promise.resolve()]);
    }
    async function workspace() {
        s.schools = await PigeAPI.request('/teacher/schools');
        const link = new URLSearchParams(location.search);
        const linked = location.hash === '#diario' && s.schools.find(item => item.id === link.get('diarioPiloto'));
        await school((linked && linked.id) || s.schools.find(item => item.id === s.schoolId)?.id || s.schools[0]?.id || '');
        if (linked && available('diary') && !unavailable('diary')) {
            s.tabs.push('diary');
            s.section = 'diary';
        }
    }
    async function enter(session) {
        if (session.user.role !== 'teacher') {
            PigeAPI.clear();
            s.error = 'Esta área requer uma conta de Professor. Confira o perfil com a Secretaria.';
            return;
        }
        PigeAPI.useSession(session);
        s.user = session.user;
        await workspace();
    }
    async function login() {
        await run(async () => {
            const password = s.password;
            s.password = '';
            s.passwordVisible = false;
            const data = await PigeAPI.post('/auth/login', { email: s.email, password });
            if (!await PigeMFA.accept(data))
                await enter(data);
        });
    }
    async function logout() { if (await canLeaveSchool('Sair do portal?', 'Sair'))
        await run(async () => { await PigeAPI.post('/auth/logout', {}); clear(); }); }
    async function start() {
        await PigeInstitution.load();
        try {
            const session = await PigeAPI.refresh();
            await enter(session);
        }
        catch (e) {
            if (e.status !== 401)
                s.error = e.message;
        }
        finally {
            s.ready = true;
        }
    }
    async function selectSchool(event) {
        const select = event.target, target = select.value;
        select.value = s.schoolId;
        if (!await canLeaveSchool('Trocar de instituição?', 'Trocar de instituição') || !s.schools.some(item => item.id === target))
            return;
        await run(() => school(target));
    }
    async function publications(page = 1) {
        const id = s.schoolId;
        if (!available('news'))
            return;
        const feed = await PigeAPI.request('/schools/' + id + '/community-feed?kind=news&page_size=10&page=' + page);
        if (id === s.schoolId) {
            s.news = feed.items;
            s.newsTotal = feed.total;
            s.newsPage = page;
        }
    }
    function can(permission) { return s.user?.permissions.includes(permission) === true; }
    function available(section) {
        if (section === 'overview' || section === 'help')
            return true;
        if (!s.schoolId || !s.user)
            return false;
        if (section === 'support')
            return true;
        const routines = s.user.teacher_routines;
        if (section === 'webmail')
            return Boolean(routines?.includes('mail') && mail.state.available);
        if (routines)
            return routines.includes(section);
        return section === 'news' || (['agenda', 'diary', 'materials'].includes(section) && can('diary.read'));
    }
    function unavailable(section) {
        return ['diary', 'materials'].includes(section) && !s.agenda?.diaries.length;
    }
    function navigation() { return pages.filter(item => available(item.id)); }
    function sidebarGroups() {
        const links = navigation();
        return [
            { id: 'teacher-routine-menu', label: 'Rotina docente', icon: 'academic', items: links.filter(item => ['agenda', 'diary', 'materials'].includes(item.id)) },
            { id: 'teacher-services-menu', label: 'Comunicação', icon: 'bell', items: links.filter(item => ['news', 'support', 'webmail'].includes(item.id)) },
        ].filter(group => group.items.length);
    }
    function title(section) {
        return section === 'help' ? 'Guia de uso' : pages.find(item => item.id === section)?.label || '';
    }
    function initials(name) {
        const words = name.trim().split(/\s+/);
        return ((words[0]?.[0] || '') + (words.length > 1 ? words[words.length - 1][0] : '')).toLocaleUpperCase('pt-BR');
    }
    function metrics() {
        const data = s.agenda;
        if (!data)
            return [];
        const result = [];
        if (available('diary')) {
            result.push({ label: 'Turmas', value: new Set(data.assignments.map(a => a.class_group_id)).size, icon: 'students', caption: 'Com atribuição docente' }, { label: 'Diários vinculados', value: data.diaries.length, icon: 'academic', caption: 'Nas suas disciplinas' });
        }
        if (available('agenda')) {
            result.push({ label: 'Aulas registradas', value: data.events.filter(e => e.kind === 'Aula registrada').length, icon: 'clock', caption: 'Na semana selecionada' }, { label: 'Avaliações', value: data.events.filter(e => e.kind === 'Avaliação').length, icon: 'enrollment', caption: 'Na semana selecionada' });
        }
        return result;
    }
    function focusTab() {
        Vue.nextTick(() => document.getElementById('teacher-tab-' + s.section)?.focus());
    }
    function navigate(section, focusHeading = true) {
        if (s.busy || !available(section) || unavailable(section))
            return;
        if (section !== s.section)
            PigeDialogs.cancelPending();
        rail.close();
        if (section !== 'diary' && location.hash === '#diario')
            history.replaceState(history.state, '', location.pathname + location.search);
        if (!s.tabs.includes(section))
            s.tabs.push(section);
        s.menuOpen = false;
        s.section = section;
        PigePortalTabs.reveal();
        if (focusHeading)
            void Vue.nextTick(() => document.getElementById('teacher-title')?.focus());
        if (section === 'news')
            void run(() => publications());
        if (section === 'agenda')
            void run(agenda);
    }
    function supportDraft() { return Boolean(document.querySelector('#teacher-protocols [data-workspace-dirty="true"]')); }
    function supportBusy() { return Boolean(document.querySelector('#teacher-protocols [aria-busy="true"]')); }
    function diaryBusy() { return Boolean(document.querySelector('#teacher-diary [aria-busy="true"]')); }
    function diaryDraft() { return Boolean(document.querySelector('#teacher-diary [data-workspace-dirty="true"]')); }
    function workspaceKey() { return JSON.stringify([sessionVersion, s.schoolId, s.user?.id, s.section, s.tabs, s.requestedDiary]); }
    async function canLeaveSchool(heading, action) {
        if (s.busy || supportBusy() || diaryBusy())
            return false;
        const warnings = [];
        if (diaryDraft())
            warnings.push('As alterações do diário ainda não foram salvas.');
        if (supportDraft())
            warnings.push('A mensagem de atendimento ainda não foi enviada.');
        if (s.tabs.includes('webmail'))
            warnings.push('Confira se as mensagens em edição foram salvas em Rascunhos.');
        if (!warnings.length)
            return true;
        const previous = workspaceKey();
        const approved = await PigeDialogs.confirm(warnings.join(' '), { title: heading, confirmLabel: action, cancelLabel: 'Voltar', destructive: true });
        return approved && previous === workspaceKey() && !s.busy && !supportBusy() && !diaryBusy();
    }
    async function openDiary(id, tab) {
        const allowed = () => !s.busy && !diaryBusy() && available('diary') && s.agenda?.diaries.some(d => d.id === id) && (tab !== 'materials' || available('materials'));
        if (!allowed())
            return;
        let discardApproved = false;
        if (diaryDraft()) {
            const previous = workspaceKey();
            const approved = await PigeDialogs.confirm('As alterações do diário que ainda não foram salvas serão descartadas.', {
                title: 'Continuar para a rotina do diário?', confirmLabel: 'Continuar', cancelLabel: 'Voltar', destructive: true
            });
            if (!approved || previous !== workspaceKey() || !allowed())
                return;
            discardApproved = true;
        }
        s.requestedDiary = discardApproved ? { id, tab, discardApproved: true } : { id, tab };
        navigate('diary', false);
    }
    async function closeTabs(section) {
        if (s.busy || section === 'overview' || s.tabs.length < 2)
            return;
        const closingDiary = s.tabs.includes('diary') && (!section || section === 'diary');
        if (closingDiary && document.querySelector('#teacher-diary [aria-busy="true"]'))
            return;
        const dirty = closingDiary && document.querySelector('#teacher-diary [data-workspace-dirty="true"]');
        const closingSupport = s.tabs.includes('support') && (!section || section === 'support');
        if (closingSupport && supportBusy())
            return;
        const supportWarning = closingSupport && supportDraft() ? ' A mensagem de atendimento ainda não enviada será descartada.' : '';
        const closingMail = s.tabs.includes('webmail') && (!section || section === 'webmail');
        const previousContext = workspaceKey();
        if (section) {
            const diaryWarning = dirty ? ' As alterações do diário que ainda não foram salvas serão descartadas.' : '';
            const mailWarning = closingMail ? ' Confira se as mensagens em edição foram salvas em Rascunhos.' : '';
            if ((dirty || closingMail || supportWarning) && !await PigeDialogs.confirm((diaryWarning + mailWarning + supportWarning).trim(), {
                title: 'Fechar a guia ' + title(section) + '?', confirmLabel: 'Fechar guia', cancelLabel: 'Voltar', destructive: true
            }))
                return;
        }
        else {
            const pending = [];
            if (dirty)
                pending.push('alterações no diário de classe');
            if (supportWarning)
                pending.push('mensagem de atendimento');
            if (closingMail)
                pending.push('mensagens em edição no E-mail');
            if (!await PigePortalTabs.confirmClose(title('overview'), pending))
                return;
        }
        if (previousContext !== workspaceKey() || s.busy || (closingSupport && supportBusy()) || (closingDiary && diaryBusy()))
            return;
        const previous = s.section;
        s.tabs = section ? s.tabs.filter(id => id !== section) : ['overview'];
        if (closingDiary)
            s.requestedDiary = undefined;
        if (!s.tabs.includes(previous))
            navigate('overview', false);
        focusTab();
    }
    function tabKeys(event) {
        const key = PigePortalTabs.keyTarget(event, s.tabs, s.section);
        if (key) {
            navigate(key, false);
            focusTab();
        }
    }
    function toggleSidebar() {
        rail.close();
        s.sidebarCollapsed = !s.sidebarCollapsed;
        PigePortalTabs.reveal();
        try {
            localStorage.setItem(sidebarKey, String(s.sidebarCollapsed));
        }
        catch { /* A escolha continua válida nesta janela. */ }
    }
    async function retry() {
        if (!s.schools.length || !s.schoolId || loadedSchoolId !== s.schoolId) {
            await workspace();
            return;
        }
        if (s.section === 'news') {
            await publications(s.newsPage);
            return;
        }
        await agenda();
    }
    function toggleMenu(open) {
        s.menuOpen = open;
        void Vue.nextTick(() => document.getElementById(open ? 'teacher-menu-close' : 'teacher-menu-toggle')?.focus());
    }
    function menuKey(e) {
        if (!s.menuOpen)
            return;
        if (e.key === 'Escape') {
            e.preventDefault();
            toggleMenu(false);
        }
        if (e.key === 'Tab') {
            const items = document.querySelectorAll('#teacher-navigation button:not([disabled]), #teacher-navigation a[href]');
            const first = items[0], last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last?.focus();
            }
            if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first?.focus();
            }
        }
    }
    function date(value) { return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value + 'T12:00:00Z')); }
    function group(diaryId) {
        const diary = s.agenda?.diaries.find(item => item.id === diaryId);
        const assignment = s.agenda?.assignments.find(item => item.id === diary?.teacher_assignment_id);
        return [assignment?.class_name, diary?.component].filter(Boolean).join(' · ');
    }
    Vue.createApp({ render: PigeRenders.teacherPortal, components: { 'portal-protocols': PigePortalProtocols.component, 'school-diary': PigeDiary.component, 'portal-mail': PigePortalMail.component }, setup() {
            Vue.watch(() => [s.schoolId, s.user?.id, s.user?.permissions.join(','), s.user?.teacher_routines?.join(','), mail.state.available].join('|'), () => rail.close());
            Vue.watch(() => [s.ready, s.user?.id, s.user?.role, s.schoolId].join('|'), () => {
                if (s.user && s.schoolId)
                    void PigeSupport.load(s.schoolId, 'teacher_portal', s.user.id);
                else if (s.ready && !s.user)
                    void PigeSupport.load(undefined, 'login');
                else
                    PigeSupport.dispose();
            });
            Vue.onMounted(rail.mount);
            Vue.onUnmounted(rail.dispose);
            Vue.onUnmounted(PigeSupport.dispose);
            Vue.onMounted(() => {
                PigeMFA.init(PigeAPI.request, data => enter(data), logout);
                window.addEventListener('pige-session-expired', () => { clear(); s.error = 'Sessão encerrada. Entre novamente.'; });
                window.addEventListener('resize', () => { if (innerWidth > 800)
                    s.menuOpen = false; PigePortalTabs.reveal(); });
                void start();
            });
            return { s, rail, sidebarGroups, mail, download: PigeAPI.download, available, unavailable, can, navigation, title, initials, metrics, openDiary, closeTabs, tabKeys, toggleSidebar, retry, pilotForSchool: PigeDiary.pilotForSchool, navigate, toggleMenu, menuKey, publications, identity: PigeInstitution.state, mfa: PigeMFA, login, logout, run, agenda, workspace, date, group, selectSchool };
        } }).mount('#teacher');
})(PigeTeacher || (PigeTeacher = {}));
