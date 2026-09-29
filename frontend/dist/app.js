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
var PigeAPI;
(function (PigeAPI) {
    let token = '';
    let refreshPromise = null;
    function clear() { token = ''; }
    PigeAPI.clear = clear;
    function useSession(response) { token = response.access_token; }
    PigeAPI.useSession = useSession;
    async function error(response) {
        let data = {};
        try {
            data = await response.json();
        }
        catch { /* A origem pode estar indisponível. */ }
        const fields = data.errors?.map(e => `${e.field.replace(/^body\./, '')}: ${e.message}`).join('\n');
        const reference = data.request_id || response.headers.get('X-Request-ID') || '';
        const failure = new Error((fields || data.detail || `Falha de comunicação (${response.status}).`) + (reference ? ' · Referência: ' + reference : ''));
        Object.assign(failure, { status: response.status, fields: data.errors || [] });
        return failure;
    }
    async function refresh() {
        if (!refreshPromise) {
            refreshPromise = fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Protection': '1' } })
                .then(async (response) => { if (!response.ok)
                throw await error(response); const data = await response.json(); useSession(data); return data; })
                .finally(() => { refreshPromise = null; });
        }
        return refreshPromise;
    }
    PigeAPI.refresh = refresh;
    async function request(path, options = {}, retry = true) {
        if (!navigator.onLine)
            throw new Error('Sem conexão. Os dados não foram enviados. Reconecte-se antes de salvar.');
        const headers = new Headers(options.headers);
        if (token)
            headers.set('Authorization', `Bearer ${token}`);
        headers.set('X-CSRF-Protection', '1');
        if (options.body && !(options.body instanceof FormData))
            headers.set('Content-Type', 'application/json');
        const response = await fetch('/api/v1' + path, { ...options, headers, credentials: 'same-origin', cache: 'no-store' });
        if (response.status === 401 && retry && token && (!path.startsWith('/auth/') || path.startsWith('/auth/profile'))) {
            try {
                await refresh();
                return await request(path, options, false);
            }
            catch {
                clear();
                window.dispatchEvent(new CustomEvent('pige-session-expired'));
            }
        }
        if (!response.ok)
            throw await error(response);
        return await response.json();
    }
    PigeAPI.request = request;
    function post(path, body) { return request(path, { method: 'POST', body: JSON.stringify(body) }); }
    PigeAPI.post = post;
    function patch(path, body) { return request(path, { method: 'PATCH', body: JSON.stringify(body) }); }
    PigeAPI.patch = patch;
    async function blob(path) {
        let response = await fetch('/api/v1' + path, { headers: { Authorization: `Bearer ${token}` }, credentials: 'same-origin', cache: 'no-store' });
        if (response.status === 401 && token) {
            await refresh();
            response = await fetch('/api/v1' + path, { headers: { Authorization: `Bearer ${token}` }, credentials: 'same-origin', cache: 'no-store' });
        }
        if (!response.ok)
            throw await error(response);
        return response.blob();
    }
    async function objectUrl(path) {
        return URL.createObjectURL(await blob(path));
    }
    PigeAPI.objectUrl = objectUrl;
    async function download(path, filename) {
        const url = URL.createObjectURL(await blob(path));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
    PigeAPI.download = download;
    async function downloadPost(path, body, filename) {
        const data = JSON.stringify(body);
        const send = () => fetch('/api/v1' + path, { method: 'POST', headers: {
                Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-CSRF-Protection': '1'
            }, body: data, credentials: 'same-origin', cache: 'no-store' });
        let response = await send();
        if (response.status === 401 && token) {
            await refresh();
            response = await send();
        }
        if (!response.ok)
            throw await error(response);
        const url = URL.createObjectURL(await response.blob());
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
    PigeAPI.downloadPost = downloadPost;
})(PigeAPI || (PigeAPI = {}));
var PigeSupport;
(function (PigeSupport) {
    PigeSupport.status = Vue.reactive({ error: '' });
    let loadedSource = '';
    let script = null;
    let generation = 0;
    async function fetchConfig(schoolId = '') {
        const path = schoolId ? '/api/v1/schools/' + encodeURIComponent(schoolId) + '/support-widget' : '/api/v1/support-widget';
        try {
            const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store' });
            return response.ok ? await response.json() : null;
        }
        catch {
            return null;
        }
    }
    function release() {
        // Somente utiliza a API de descarte quando oferecida pelo próprio SDK.
        try {
            window.hubSDK?.destroy?.();
        }
        catch { /* Atendimento não bloqueia o cadastro. */ }
        script?.remove();
        script = null;
        loadedSource = '';
    }
    async function load(schoolId = '') {
        const request = ++generation, config = await fetchConfig(schoolId);
        if (request !== generation || !config)
            return;
        PigeSupport.status.error = '';
        if (!config.enabled || !config.base_url || !config.website_token) {
            release();
            return;
        }
        let baseUrl;
        try {
            const url = new URL(config.base_url);
            if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password)
                throw new Error('URL inválida');
            baseUrl = url.href.replace(/\/+$/, '');
        }
        catch {
            PigeSupport.status.error = 'Revise a URL do HUB na configuração de atendimento.';
            return;
        }
        const sourceKey = [baseUrl, config.website_token, config.position, config.type, config.launcherTitle].join('|');
        if (sourceKey === loadedSource && script)
            return;
        if (script)
            release();
        const runtime = window;
        runtime.hubSettings = { position: config.position || 'left', type: config.type || 'expanded_bubble', launcherTitle: config.launcherTitle || 'Suporte' };
        const element = document.createElement('script');
        element.dataset.pigeSupportHub = 'true';
        element.src = baseUrl + '/packs/js/sdk.js';
        element.defer = true;
        element.async = true;
        element.onload = () => {
            if (script !== element)
                return;
            try {
                const sdk = window.hubSDK;
                if (!sdk?.run)
                    throw new Error('SDK indisponível');
                sdk.run({ websiteToken: config.website_token, baseUrl });
            }
            catch {
                PigeSupport.status.error = 'O SDK do HUB não iniciou. Verifique a URL, o website token e os cabeçalhos do servidor de atendimento.';
                release();
            }
        };
        element.onerror = () => {
            if (script !== element)
                return;
            PigeSupport.status.error = 'Não foi possível carregar o SDK do HUB. O atendimento está indisponível; os cadastros continuam funcionando.';
            release();
        };
        loadedSource = sourceKey;
        script = element;
        document.head.appendChild(element);
    }
    PigeSupport.load = load;
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
var PigeExpansion;
(function (PigeExpansion) {
    const defaultGuardianInstructions = "Leia atentamente antes de iniciar a inscrição.\n\n1. Preencha os dados do aluno e do responsável exatamente como constam nos documentos oficiais.\n2. Informe e-mail e telefone atualizados, pois a instituição poderá utilizá-los para comunicações sobre a inscrição e a matrícula.\n3. Envie somente os documentos solicitados. Ao fotografar, enquadre o documento inteiro, com boa iluminação, sem reflexos e com os dados legíveis.\n4. Quando o sistema sugerir dados a partir da leitura de um documento, confira as informações antes de aplicá-las ao cadastro.\n5. Revise todos os dados antes de enviar a inscrição. Informações incompletas ou divergentes poderão exigir correção ou nova documentação.\n6. A inscrição online não garante vaga nem matrícula. A efetivação depende da análise da instituição, da disponibilidade de vaga e do cumprimento das etapas definidas para este processo.\n7. Acompanhe o andamento pelo Portal dos responsáveis e observe as mensagens, solicitações de ajuste, prazos e documentos pendentes.\n8. Em caso de dúvida ou dificuldade, entre em contato diretamente com a instituição pelos canais oficiais.";
    const defaultPrivacyNotice = "A instituição é responsável pelo tratamento dos dados pessoais informados neste processo de inscrição e matrícula.\n\nOs dados do aluno e de seus responsáveis serão utilizados para receber e analisar a inscrição, conferir documentos, manter contato com a família, organizar o atendimento escolar, preparar e efetivar a matrícula quando aprovada, cumprir obrigações legais e regulatórias e proteger a segurança do processo.\n\nPoderão ser tratados dados de identificação, contato, endereço, informações acadêmicas e documentos necessários à inscrição. Dados pessoais sensíveis somente deverão ser solicitados e utilizados quando forem necessários ao atendimento educacional, à segurança, à acessibilidade, ao cumprimento de obrigação legal ou à proteção dos direitos do aluno, sempre considerando o seu melhor interesse.\n\nA instituição poderá utilizar prestadores indispensáveis à operação do serviço, como hospedagem, armazenamento, comunicação, meios de pagamento e suporte técnico, observando medidas de segurança e confidencialidade. Dados também poderão ser fornecidos a autoridades públicas quando houver obrigação legal ou determinação válida. Os dados não serão comercializados.\n\nAs informações serão mantidas pelo período necessário à análise da inscrição, à execução da relação escolar, ao cumprimento de obrigações legais e à preservação de direitos. Registros que não precisem mais ser mantidos deverão seguir a política de retenção da instituição.\n\nO responsável poderá solicitar à instituição informações sobre o tratamento, correção de dados inexatos e o exercício dos demais direitos aplicáveis previstos na legislação de proteção de dados, pelos canais oficiais de atendimento da escola.\n\nA instituição adota medidas técnicas e administrativas para proteger os dados contra acessos não autorizados, perda, alteração ou divulgação indevida. O envio de dados pela internet, entretanto, exige também que o responsável proteja suas credenciais de acesso e utilize dispositivos confiáveis.\n\nAutorizações opcionais, como o recebimento de comunicações por WhatsApp, devem ser apresentadas separadamente e podem ser alteradas conforme as opções disponibilizadas pela instituição.\n\nAo prosseguir, o responsável declara que leu este aviso e que as informações fornecidas são verdadeiras, sem que essa ciência substitua bases legais específicas exigidas para cada atividade de tratamento.";
    const emptyCampaign = () => ({ id: '', version: 1, slug: '', title: '', instructions: defaultGuardianInstructions, privacy_notice: defaultPrivacyNotice, terms_version: '1', class_group_ids: [], opens_on: new Date().toISOString().slice(0, 10), closes_on: '', active: false, require_verified_contact: true, require_documents: false, require_payment_before_enrollment: false, contract_template_id: '' });
    const connectConfig = () => ({ base_url: '', instance: '', send_text_path: '', connection_state_path: '', api_key_header: 'apikey', auth_scheme: '', number_field: 'number', text_field: 'text', message_id_path: 'key.id', contract_confirmed: false });
    PigeExpansion.component = { props: ['schoolId', 'page', 'permissions'], render: PigeRenders.expansion, setup(props) {
            const s = Vue.reactive({ readiness: null, busy: false, error: '', notice: '', q: '', status: '', page: 1, total: 0, tab: 'queue', rows: [], selected: null, campaigns: [], campaignForm: emptyCampaign(), editingCampaign: false, groups: [], contractTemplates: [], contractFields: [], contractPreview: null, contractValues: {}, contractPreviewStale: false, counts: {}, reason: '', action: 'review', identity: false, existingStudent: '', existingGuardian: '', matchQ: '', studentMatches: [], guardianMatches: [], message: '', internal: false, charges: [], bankSummary: [], selectedCharge: null, bankEvents: [], bankReason: '', chargeOpen: false, chargeInitial: '', discardCharge: false, chargeForm: { admission_id: '', enrollment_id: '', amount: '', due_on: '', description: '', billing_type: 'PIX', client_key: PigeOnline.newId(), installment_count: 1, required_for_enrollment: false }, enrollmentQ: '', enrollmentMatches: [], connections: [], jobs: [], jobTotal: 0, jobPage: 1, jobStatus: '', provider: 'asaas', connectionForm: { version: undefined, enabled: false, environment: 'sandbox', api_key: '', webhook_token: '', config: connectConfig() }, editingConnection: false, connect: { configured: false, base_url: '', api_key_configured: false, instance_prefix: 'PG360', host_policy: 'base_url', effective_host: '' }, connectInstances: [], connectRemote: [], connectInventoryLoaded: false, connectUnits: [], connectJobs: [], connectJobTotal: 0, connectJobPage: 1, connectJobStatus: '', connectLabel: '', connectPrimary: false, connectCreatePhone: '', connectPhoneDrafts: {}, connectOperation: { instanceId: '', kind: '' }, connectQr: { instanceId: '', base64: '', code: '', pairingCode: '', pending: false, connected: false, kind: '' } });
            const base = () => '/schools/' + props.schoolId;
            const can = (p) => props.permissions.includes(p);
            const str = (v) => v == null ? '' : String(v);
            async function run(action) { if (s.busy)
                return; s.busy = true; s.error = ''; s.notice = ''; try {
                await action();
            }
            catch (e) {
                s.error = e instanceof Error ? e.message : String(e);
            }
            finally {
                s.busy = false;
            } }
            function campaignYearId() { const years = new Set(s.groups.filter(group => s.campaignForm.class_group_ids.includes(group.id)).map(group => str(group.academic_year_id))); return years.size === 1 ? [...years][0] : ''; }
            function eligibleContractTemplates() { const year = campaignYearId(); return s.contractTemplates.filter(template => template.active && template.require_signature && (!year || !template.academic_year_id || template.academic_year_id === year)); }
            function templateName(id) { return s.contractTemplates.find(template => template.id === id)?.name || 'Nenhum contrato obrigatório'; }
            function selectedContractVersion() { return Number(s.selected?.contract_template_version || s.selected?.contract?.template_version || 0); }
            function contractStatus(status) { return { awaiting_school: 'Aguardando emissão pela escola', company_signed: 'Assinado pela escola · aguardando responsável', pending_validation: 'Assinatura do responsável em revisão', verified: 'Assinatura conferida', rejected: 'Devolvido para correção', unsigned: 'Sem assinatura' }[str(status)] || str(status) || '—'; }
            function contractPreviewKeys() { const preview = s.contractPreview; return preview ? Array.from(new Set([...Object.keys(preview.variables || {}), ...(preview.missing_fields || [])])) : []; }
            function contractFieldLabel(key) { return s.contractFields.find(field => field.key === key)?.label || key; }
            function contractValue(key) { return Object.prototype.hasOwnProperty.call(s.contractValues, key) ? s.contractValues[key] : str(s.contractPreview?.variables?.[key]); }
            function contractAutomatic(key) { return !Object.prototype.hasOwnProperty.call(s.contractValues, key) && Boolean(s.contractPreview?.variables?.[key]); }
            function setContractValue(key, event) { s.contractValues[key] = event.target.value; s.contractPreviewStale = true; }
            async function previewFrozenContract() {
                await run(async () => {
                    const admission = s.selected, templateId = admission?.contract?.template_id || admission?.contract_template_id, version = selectedContractVersion();
                    if (!admission?.enrollment_id || !templateId || !version)
                        throw new Error('Contrato congelado ou matrícula da inscrição não encontrados.');
                    s.contractPreview = await PigeAPI.post(base() + '/document-templates/' + templateId + '/preview', { enrollment_id: admission.enrollment_id, template_version: version, values: s.contractValues });
                    s.contractPreviewStale = false;
                });
            }
            async function previewFrozenPdf() {
                await run(async () => {
                    const admission = s.selected, templateId = admission?.contract?.template_id || admission?.contract_template_id, version = selectedContractVersion();
                    if (!admission?.enrollment_id || !templateId || !version)
                        throw new Error('Contrato congelado ou matrícula não encontrados.');
                    await PigeAPI.downloadPost(base() + '/document-templates/' + templateId + '/preview.pdf', { enrollment_id: admission.enrollment_id, template_version: version, values: s.contractValues }, 'previa-contrato-' + admission.number + '.pdf');
                });
            }
            async function issueFrozenContract() {
                await run(async () => {
                    const admission = s.selected, templateId = admission?.contract?.template_id || admission?.contract_template_id, version = selectedContractVersion();
                    if (!admission?.enrollment_id || !templateId || !version || !s.contractPreview || s.contractPreviewStale || s.contractPreview.missing_fields.length)
                        throw new Error('Revise a prévia e preencha todos os campos antes de emitir.');
                    await PigeAPI.post(base() + '/document-templates/' + templateId + '/issue', { enrollment_id: admission.enrollment_id, template_version: version, values: s.contractValues });
                    await openAdmission(admission.id);
                    await queue();
                    s.notice = 'Contrato emitido da revisão aprovada e assinado pela escola. O responsável pode baixar essa via para assinar; a matrícula aguarda conferência da assinatura externa.';
                });
            }
            async function downloadSignedContract() {
                await run(async () => {
                    const documentId = s.selected?.contract?.issued_document_id;
                    if (!documentId)
                        throw new Error('Contrato ainda não emitido.');
                    const details = await PigeAPI.request(base() + '/issued-documents/' + documentId + '/signatures');
                    await PigeAPI.download(base() + '/files/' + details.file_id + '/download', 'contrato-assinado-pela-escola.pdf');
                });
            }
            async function queue() { const result = await PigeAPI.request(base() + `/admissions?page=${s.page}&q=${encodeURIComponent(s.q)}&status=${s.status}`); s.rows = result.items; s.total = result.total; const summary = await PigeAPI.request(base() + '/admissions-summary'); s.counts = summary.counts; }
            async function bankList() { const result = await PigeAPI.request(base() + `/bank-charges?page=${s.page}&q=${encodeURIComponent(s.q)}&status=${s.status}`); s.charges = result.items; s.total = result.total; s.bankSummary = (await PigeAPI.request(base() + '/bank-summary')).items; }
            async function jobs() { const result = await PigeAPI.request(base() + `/integration-jobs?page=${s.jobPage}&status=${s.jobStatus}`); s.jobs = result.items; s.jobTotal = result.total; }
            async function connectJobs() { const result = await PigeAPI.request(base() + `/connect/jobs?page=${s.connectJobPage}&status=${s.connectJobStatus}`); s.connectJobs = result.items; s.connectJobTotal = result.total; }
            async function connectLoad() { const result = await PigeAPI.request(base() + '/connect'); s.connect = result.config; s.connectInstances = result.items; s.connectUnits = result.units || []; for (const i of result.items) {
                s.connectPhoneDrafts[i.id] = i.phone || s.connectPhoneDrafts[i.id] || '';
            } await connectJobs(); }
            async function refreshConnectInventory() { const result = await PigeAPI.request(base() + '/connect/remote-instances'); s.connectRemote = result.items; s.connectInventoryLoaded = true; }
            async function connectInventory() { await run(async () => { await refreshConnectInventory(); s.notice = 'Inventário de instâncias do WhatsApp atualizado.'; }); }
            async function connectAdopt(remote) { await run(async () => { const result = await PigeAPI.post(base() + '/connect/instances/adopt', { instance_name: remote.name, primary: true }); await refreshConnectAfterOperation(result.instance); try {
                await refreshConnectInventory();
            }
            catch (e) {
                s.error = 'Instância vinculada, mas o inventário não pôde ser atualizado: ' + (e instanceof Error ? e.message : String(e));
            } s.notice = 'Instância existente vinculada como preferencial desta escola. Operações destrutivas remotas permanecem protegidas.'; }); }
            async function connectPrefer(instance) { await run(async () => { await PigeAPI.post(base() + '/connect/instances/' + instance.id + '/prefer', {}); await connectLoad(); s.notice = 'Instância definida como preferencial desta escola.'; }); }
            async function connectPreferUnit(unit, instanceId) { await run(async () => { await PigeAPI.post(base() + '/connect/unit-preference', { unit_id: unit.id, instance_id: instanceId }); await connectLoad(); s.notice = instanceId ? 'Preferência da unidade atualizada.' : 'A unidade voltou a usar a preferência da escola.'; }); }
            async function connectRestart(instance) { await run(async () => { await PigeAPI.post(base() + '/connect/instances/' + instance.id + '/restart', {}); await connectLoad(); s.notice = 'Reinício solicitado para a instância administrada pelo PIGE360.'; }); }
            function clearConnectQr(instanceId) { if (!instanceId || s.connectQr.instanceId === instanceId)
                s.connectQr = { instanceId: '', base64: '', code: '', pairingCode: '', pending: false, connected: false, kind: '' }; }
            function applyConnectQr(value, instanceId, kind) {
                const qr = value.qrcode && typeof value.qrcode === 'object' ? value.qrcode : value;
                const base64 = typeof qr.base64 === 'string' ? qr.base64 : '';
                s.connectQr = { instanceId, base64: /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(base64) ? base64 : base64.startsWith('data:') ? '' : base64 ? 'data:image/png;base64,' + base64 : '', code: typeof qr.code === 'string' ? qr.code : '', pairingCode: typeof qr.pairingCode === 'string' ? qr.pairingCode : '', pending: false, connected: Boolean(value.connected), kind };
                s.connectQr.pending = !s.connectQr.connected && (kind === 'pairing' ? !s.connectQr.pairingCode : kind === 'qr' ? !s.connectQr.base64 : !s.connectQr.base64 && !s.connectQr.code && !s.connectQr.pairingCode);
            }
            async function refreshConnectAfterOperation(instance) {
                if (instance) {
                    const index = s.connectInstances.findIndex(item => item.id === instance.id);
                    if (index < 0)
                        s.connectInstances.push(instance);
                    else
                        s.connectInstances[index] = instance;
                    s.connectPhoneDrafts[instance.id] = instance.phone || s.connectPhoneDrafts[instance.id] || '';
                }
                try {
                    await connectLoad();
                }
                catch (e) {
                    s.error = 'A operação foi concluída, mas não foi possível atualizar a lista: ' + (e instanceof Error ? e.message : String(e));
                }
            }
            async function connectCreate() {
                await run(async () => {
                    s.connectOperation = { instanceId: 'new', kind: 'create' };
                    try {
                        const result = await PigeAPI.post(base() + '/connect/instances', { label: s.connectLabel, phone: s.connectCreatePhone, primary: s.connectPrimary });
                        if (!result.instance?.id)
                            throw new Error('A instância foi criada, mas a resposta não trouxe seu identificador. Atualize a lista antes de tentar novamente.');
                        applyConnectQr(result, result.instance.id, 'create');
                        s.connectLabel = '';
                        s.connectCreatePhone = '';
                        s.connectPrimary = false;
                        await refreshConnectAfterOperation(result.instance);
                        s.notice = s.connectQr.connected ? 'Instância criada e conectada ao WhatsApp.' : s.connectQr.pending ? 'Instância criada. Gere o QR Code ou obtenha o código de pareamento para conectar o WhatsApp.' : 'Instância criada. Use o QR Code ou o código de pareamento exibido abaixo.';
                    }
                    finally {
                        s.connectOperation = { instanceId: '', kind: '' };
                    }
                });
            }
            async function connectSync(instance) { await run(async () => { const result = await PigeAPI.post(base() + '/connect/instances/' + instance.id + '/sync', {}); if (result.qrcode && (result.qrcode.base64 || result.qrcode.code || result.qrcode.pairingCode))
                applyConnectQr(result, instance.id, 'qr'); if (result.instance?.connection_state === 'open')
                clearConnectQr(instance.id); await refreshConnectAfterOperation(result.instance); s.notice = 'Estado da instância consultado.'; }); }
            async function connectQr(instance) {
                await run(async () => {
                    s.connectOperation = { instanceId: instance.id, kind: 'qr' };
                    clearConnectQr(instance.id);
                    try {
                        const result = await PigeAPI.post(base() + '/connect/instances/' + instance.id + '/qr', {});
                        applyConnectQr(result, instance.id, 'qr');
                        await refreshConnectAfterOperation(result.instance);
                        s.notice = s.connectQr.connected ? 'WhatsApp já conectado nesta instância.' : s.connectQr.pending ? (s.connectQr.code ? 'O provedor devolveu somente o texto do QR, sem imagem para escanear. Aguarde e tente novamente.' : 'Ainda não há QR Code disponível. Aguarde alguns instantes e tente novamente.') : 'QR Code pronto para esta instância.';
                    }
                    finally {
                        s.connectOperation = { instanceId: '', kind: '' };
                    }
                });
            }
            async function connectPairingCode(instance) {
                await run(async () => {
                    s.connectOperation = { instanceId: instance.id, kind: 'pairing' };
                    clearConnectQr(instance.id);
                    try {
                        const result = await PigeAPI.post(base() + '/connect/instances/' + instance.id + '/pairing-code', {});
                        applyConnectQr(result, instance.id, 'pairing');
                        await refreshConnectAfterOperation(result.instance);
                        s.notice = s.connectQr.connected ? 'WhatsApp já conectado nesta instância.' : s.connectQr.pending ? 'Ainda não há código de pareamento disponível. Aguarde alguns instantes e tente novamente.' : 'Código de pareamento pronto para o telefone cadastrado.';
                    }
                    finally {
                        s.connectOperation = { instanceId: '', kind: '' };
                    }
                });
            }
            async function connectSavePhone(instance) { await run(async () => { await PigeAPI.post(base() + '/connect/instances/' + instance.id + '/phone', { number: s.connectPhoneDrafts[instance.id] || '' }); await connectLoad(); s.notice = 'Telefone da instância atualizado.'; }); }
            async function connectLogout(instance) { await run(async () => { await PigeAPI.post(base() + '/connect/instances/' + instance.id + '/logout', {}); clearConnectQr(instance.id); await connectLoad(); s.notice = 'Instância deslogada. O cadastro remoto foi preservado.'; }); }
            async function connectDelete(instance) { const remote = instance.managed_by_pige360; const prompt = remote ? 'Excluir a instância ' + instance.name + ' também no provedor de WhatsApp?' : 'Desvincular ' + instance.name + ' desta instalação sem excluir a instância remota?'; if (!window.confirm(prompt))
                return; await run(async () => { const result = await PigeAPI.request(base() + '/connect/instances/' + instance.id, { method: 'DELETE' }); clearConnectQr(instance.id); await connectLoad(); s.notice = result.remote_deleted ? 'Instância criada pelo PIGE360 excluída do provedor de WhatsApp.' : 'Vínculo local removido; a instância preexistente foi preservada no provedor de WhatsApp.'; }); }
            async function connectTest() { await run(async () => { const result = await PigeAPI.post(base() + '/connect/test', {}); s.notice = result.message; }); }
            async function connectRetry(job) { await run(async () => { await PigeAPI.post(base() + '/connect/jobs/' + job.id + '/retry', { reason: s.reason }); await connectJobs(); s.notice = 'Mensagem devolvida à fila do WhatsApp.'; }); }
            async function load() {
                if (props.page === 'online') {
                    const [readiness, campaigns, groups, templates, fields] = await Promise.all([
                        PigeAPI.request(base() + '/admission-readiness'), PigeAPI.request(base() + '/admission-campaigns'),
                        PigeAPI.request(base() + '/class-groups'), PigeAPI.request(base() + '/document-templates'),
                        PigeAPI.request(base() + '/document-templates/fields')
                    ]);
                    s.readiness = readiness;
                    s.campaigns = campaigns;
                    s.groups = groups;
                    s.contractTemplates = templates.items;
                    s.contractFields = fields.fields;
                    await queue();
                }
                else if (props.page === 'banking') {
                    await bankList();
                }
                else if (props.page === 'connect') {
                    await connectLoad();
                }
                else {
                    s.connections = await PigeAPI.request(base() + '/integrations');
                    await jobs();
                }
            }
            async function search() { s.page = 1; await run(() => props.page === 'online' ? queue() : bankList()); }
            async function paginate(n) { s.page += n; await run(() => props.page === 'online' ? queue() : bankList()); }
            async function paginateJobs(n) { s.jobPage += n; await run(jobs); }
            function newCampaign() { s.tab = 'campaigns'; s.campaignForm = emptyCampaign(); s.editingCampaign = true; }
            function editCampaign(c) { const { id, version, slug, title, instructions, privacy_notice, terms_version, class_group_ids, opens_on, closes_on, active, require_verified_contact, require_documents, require_payment_before_enrollment, contract_template_id } = c; s.campaignForm = { id, version, slug, title, instructions, privacy_notice, terms_version, class_group_ids: [...class_group_ids], opens_on, closes_on, active, require_verified_contact, require_documents, require_payment_before_enrollment, contract_template_id: contract_template_id || '' }; s.editingCampaign = true; }
            async function saveCampaign() {
                await run(async () => {
                    const { id, version, ...data } = s.campaignForm;
                    if (data.contract_template_id && (!campaignYearId() || !eligibleContractTemplates().some(template => template.id === data.contract_template_id)))
                        throw new Error('Selecione um contrato ativo que exige assinatura e seja válido para o ano letivo das turmas.');
                    const payload = { ...data, contract_template_id: data.contract_template_id || null };
                    if (id)
                        await PigeAPI.patch(base() + '/admission-campaigns/' + id, { ...payload, version });
                    else
                        await PigeAPI.post(base() + '/admission-campaigns', payload);
                    s.editingCampaign = false;
                    await load();
                    s.notice = 'Processo salvo. Divulgue somente processos ativos com prazos e ofertas conferidos.';
                });
            }
            async function openAdmission(id) { s.selected = await PigeAPI.request(base() + '/admissions/' + id); s.identity = false; s.studentMatches = []; s.guardianMatches = []; s.existingStudent = ''; s.existingGuardian = ''; s.contractPreview = null; s.contractValues = {}; s.contractPreviewStale = false; s.charges = (await PigeAPI.request(base() + '/bank-charges?admission_id=' + id)).items; }
            async function view(id) { await run(() => openAdmission(id)); }
            async function action() { await run(async () => { const a = s.selected; if (!a)
                return; await PigeAPI.post(base() + '/admissions/' + a.id + '/actions', { version: a.version, action: s.action, reason: s.reason }); await openAdmission(a.id); await queue(); s.reason = ''; }); }
            async function match() { await run(async () => { const q = encodeURIComponent(s.matchQ); s.studentMatches = (await PigeAPI.request(base() + '/students?q=' + q)).items; s.guardianMatches = (await PigeAPI.request(base() + '/persons?guardians_only=true&q=' + q)).items; }); }
            async function approve() { await run(async () => { const a = s.selected; if (!a)
                return; await PigeAPI.post(base() + '/admissions/' + a.id + '/approve', { version: a.version, reason: s.reason, identity_confirmed: s.identity, existing_student_id: s.existingStudent || null, existing_guardian_id: s.existingGuardian || null }); await openAdmission(a.id); await queue(); s.reason = ''; s.notice = s.selected?.contract?.required ? 'Inscrição aprovada. Emita o contrato da revisão congelada e aguarde a assinatura do responsável antes de efetivar.' : 'Inscrição aprovada; matrícula criada como rascunho. Confira documentação e cobrança antes de efetivar.'; }); }
            async function finalize() { await run(async () => { const a = s.selected; if (!a)
                return; if (a.contract?.required && a.contract.signature_status !== 'verified')
                throw new Error('A assinatura do responsável precisa ser conferida pela Direção antes da efetivação.'); await PigeAPI.post(base() + '/admissions/' + a.id + '/finalize', { version: a.version, reason: s.reason }); await openAdmission(a.id); await queue(); s.reason = ''; s.notice = 'Matrícula efetivada. Comprovante disponível no portal do responsável.'; }); }
            async function reviewDoc(item, status) { await run(async () => { const a = s.selected; if (!a)
                return; await PigeAPI.post(base() + `/admissions/${a.id}/attachments/${item.id}/review`, { version: item.version, status, note: s.reason }); await openAdmission(a.id); }); }
            async function message() { await run(async () => { if (!s.selected)
                return; await PigeAPI.post(base() + '/admissions/' + s.selected.id + '/messages', { text: s.message, internal: s.internal }); s.message = ''; await openAdmission(s.selected.id); }); }
            async function whatsapp() { await run(async () => { if (!s.selected)
                return; await PigeAPI.post(base() + '/connect/messages', { admission_id: s.selected.id, text: s.message, client_key: PigeOnline.newId() }); s.message = ''; s.notice = 'Envio via WhatsApp enfileirado. Consulte o resultado na fila do WhatsApp.'; }); }
            async function download(path, name) { await run(() => PigeAPI.download(base() + path, name)); }
            function newCharge(admissionId = '') { s.chargeForm = { admission_id: admissionId, enrollment_id: '', amount: '', due_on: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), description: admissionId ? 'Matrícula' : 'Mensalidade', billing_type: 'PIX', client_key: PigeOnline.newId(), installment_count: 1, required_for_enrollment: false }; s.enrollmentMatches = []; s.chargeOpen = true; s.error = ''; s.discardCharge = false; s.chargeInitial = JSON.stringify(s.chargeForm); }
            function closeCharge(discard = false) {
                if (s.busy)
                    return;
                if (discard !== true && JSON.stringify(s.chargeForm) !== s.chargeInitial) {
                    s.discardCharge = true;
                    return;
                }
                s.chargeOpen = false;
                s.discardCharge = false;
            }
            function chargeTotal() {
                const amount = Number(s.chargeForm.amount), count = Number(s.chargeForm.installment_count);
                return PigeOnline.money(Number.isFinite(amount * count) ? (amount * count).toFixed(2) : '0');
            }
            async function findEnrollments() { await run(async () => { s.enrollmentMatches = (await PigeAPI.request(base() + '/enrollments?q=' + encodeURIComponent(s.enrollmentQ))).items; }); }
            async function createCharge() { await run(async () => { const f = s.chargeForm; await PigeAPI.post(base() + '/bank-charges', { ...f, admission_id: f.admission_id || null, enrollment_id: f.enrollment_id || null, installment_count: Number(f.installment_count) }); s.chargeOpen = false; if (props.page === 'banking')
                await bankList();
            else if (s.selected)
                await openAdmission(s.selected.id); s.notice = 'Cobrança(s) enfileirada(s). Emissão e atualização serão processadas pelo worker.'; }); }
            async function inspectCharge(c) { await run(async () => { s.selectedCharge = c; s.bankReason = ''; s.bankEvents = await PigeAPI.request(base() + '/bank-charges/' + c.id + '/events'); }); }
            async function chargeAction(action) { await run(async () => { const c = s.selectedCharge; if (!c)
                return; await PigeAPI.post(base() + '/bank-charges/' + c.id + '/' + action, { reason: s.bankReason }); s.selectedCharge = null; if (props.page === 'banking')
                await bankList();
            else if (s.selected)
                await openAdmission(s.selected.id); s.notice = action === 'authorize-reissue' ? 'Reemissão autorizada após conferência. Acompanhe a fila.' : 'Solicitação registrada. Aguarde o processamento e atualize a consulta.'; }); }
            function configure(provider) { s.provider = provider; const c = s.connections.find(c => c.provider === provider); s.connectionForm = { version: c?.version, enabled: c?.enabled || false, environment: c?.environment || 'sandbox', api_key: '', webhook_token: '', config: { ...connectConfig(), ...c?.config } }; s.editingConnection = true; }
            async function saveConnection() { await run(async () => { const f = s.connectionForm; await PigeAPI.post(base() + '/integrations/' + s.provider, { ...f, config: s.provider === 'asaas' ? {} : f.config }); f.api_key = ''; f.webhook_token = ''; s.editingConnection = false; await load(); s.notice = 'Configuração salva. O teste HTTP não substitui a homologação de mensagens e cobranças.'; }); }
            async function testConnection(provider) { await run(async () => { const r = await PigeAPI.post(base() + '/integrations/' + provider + '/test', {}); await load(); if (!r.ok)
                throw new Error(r.message + ' Código: ' + r.code); s.notice = r.message; }); }
            async function retry(job) { await run(async () => { await PigeAPI.post(base() + '/integration-jobs/' + job.id + '/retry', { reason: s.reason }); await jobs(); }); }
            async function copy(value) { await run(async () => { await navigator.clipboard.writeText(value); s.notice = 'Copiado.'; }); }
            const connectionFor = (provider) => s.connections.find(c => c.provider === provider);
            Vue.onMounted(() => { void run(load); });
            return { s, props, identity: PigeInstitution.state, closeCharge, chargeTotal, can, str, run, load, search, paginate, paginateJobs, newCampaign, editCampaign, saveCampaign, campaignYearId, eligibleContractTemplates, templateName, selectedContractVersion, contractStatus, contractPreviewKeys, contractFieldLabel, contractValue, contractAutomatic, setContractValue, previewFrozenContract, previewFrozenPdf, issueFrozenContract, downloadSignedContract, view, action, match, approve, finalize, reviewDoc, message, whatsapp, download, newCharge, findEnrollments, createCharge, inspectCharge, chargeAction, configure, saveConnection, testConnection, retry, copy, connectionFor, jobs, connectLoad, connectJobs, connectInventory, connectAdopt, connectPrefer, connectPreferUnit, connectRestart, connectCreate, connectSync, connectQr, connectPairingCode, connectSavePhone, connectLogout, connectDelete, connectTest, connectRetry, clearConnectQr, label: PigeOnline.label, date: PigeOnline.date, money: PigeOnline.money, publicURL: PigeOnline.publicURL, safeLink: PigeOnline.safeLink, origin: location.origin, statuses: PigeOnline.statuses };
        } };
})(PigeExpansion || (PigeExpansion = {}));
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
/** Acessibilidade e rolagem do shell. Não interfere no estado dos cadastros.
 * A interface Vue continua sendo a fonte de verdade da abertura e das rotas.
 */
var PigeWorkspace;
(function (PigeWorkspace) {
    function install() {
        const root = document.querySelector('#app');
        if (!root)
            return;
        const compact = window.matchMedia('(max-width: 800px)');
        let opened = false;
        let previousPage = '';
        let locked = null;
        let wasInert = false;
        let pendingFocus = 0;
        const sidebar = () => root.querySelector('#school-navigation');
        const toggle = () => root.querySelector('.menu-button');
        const hasDialog = () => Boolean(root.querySelector('[role="dialog"][aria-modal="true"]'));
        function restore() {
            if (locked) {
                locked.inert = wasInert;
                locked = null;
            }
        }
        function focusContent() {
            if (hasDialog())
                return;
            const main = root.querySelector('#main-content');
            if (!main || main.inert)
                return;
            const heading = main.querySelector('.page-header h1');
            if (heading) {
                heading.tabIndex = -1;
                heading.focus({ preventScroll: true });
            }
            else
                main.focus({ preventScroll: true });
        }
        function close() {
            // Aciona o manipulador Vue existente, sem duplicar estado de navegação.
            if (sidebar()?.classList.contains('visible'))
                toggle()?.click();
        }
        function controls() {
            return Array.from(sidebar()?.querySelectorAll('a[href],button,[tabindex="0"]') || [])
                .filter(el => !el.matches(':disabled') && !el.closest('[inert]') && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden');
        }
        function sync() {
            const nav = sidebar();
            if (!nav) {
                restore();
                opened = false;
                previousPage = '';
                return;
            }
            const page = nav.querySelector('nav a[aria-current="page"]')?.getAttribute('href') || '';
            const changed = Boolean(previousPage && page && page !== previousPage);
            if (page)
                previousPage = page;
            const visible = compact.matches && nav.classList.contains('visible');
            if (visible && !opened) {
                locked = root.querySelector('.main-column');
                if (locked) {
                    wasInert = locked.inert;
                    locked.inert = true;
                }
                // Botão de fechar sempre visível; o restante continua alcançável por Tab.
                requestAnimationFrame(() => {
                    if (opened && nav.isConnected && !hasDialog())
                        nav.querySelector('.sidebar-close')?.focus({ preventScroll: true });
                });
            }
            else if (!visible && opened) {
                restore();
                if (!hasDialog()) {
                    if (compact.matches && !changed)
                        toggle()?.focus({ preventScroll: true });
                    else
                        focusContent();
                }
            }
            opened = visible;
            if (changed) {
                const main = root.querySelector('#main-content');
                if (main)
                    main.scrollTop = 0;
                cancelAnimationFrame(pendingFocus);
                pendingFocus = requestAnimationFrame(() => { if (!opened)
                    focusContent(); });
            }
        }
        root.addEventListener('click', event => {
            if (event.target.closest('[data-focus-content]')) {
                event.preventDefault();
                focusContent();
            }
        });
        document.addEventListener('keydown', event => {
            if (!opened || hasDialog())
                return;
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopImmediatePropagation();
                close();
                return;
            }
            if (event.key !== 'Tab')
                return;
            const items = controls(), first = items[0], last = items.at(-1);
            if (!first) {
                event.preventDefault();
                return;
            }
            const active = document.activeElement;
            if (event.shiftKey && (active === first || !items.includes(active))) {
                event.preventDefault();
                last?.focus();
            }
            else if (!event.shiftKey && (active === last || !items.includes(active))) {
                event.preventDefault();
                first.focus();
            }
        }, true);
        document.addEventListener('focusin', event => {
            if (opened && !hasDialog() && !sidebar()?.contains(event.target))
                controls()[0]?.focus({ preventScroll: true });
        });
        compact.addEventListener('change', () => { if (!compact.matches)
            close(); sync(); });
        new MutationObserver(sync).observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'aria-current'] });
        sync();
    }
    PigeWorkspace.install = install;
    // Scripts defer encontram #app antes de a aplicação Vue montar o workspace.
    // O observador acompanha login/logout sem reconstruir ou mover o DOM do Vue.
    if (typeof document !== 'undefined' && document.body)
        install();
})(PigeWorkspace || (PigeWorkspace = {}));
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
var PigeDossier;
(function (PigeDossier) {
    const emptyDraft = () => ({ direction: 'guardian', person_id: '', relationship: 'Responsável', legal: false, financial: false, pickup: false, primary_contact: false, active: true, newMode: false, name: '', cpf: '', birth_date: '', phone: '', email: '', rg: '', rg_issuer: '', birth_certificate: '', mother_name: '', father_name: '', postal_code: '', street: '', address_number: '', address_complement: '', district: '', city: '', state: '', country: '', address: '' });
    PigeDossier.state = Vue.reactive({ active: false, loading: false, error: '', personId: '', personVersion: 0, profiles: {}, rows: [], operations: {}, editor: false, editId: '', query: '', matches: [], searching: false, draft: emptyDraft(), page: 1, total: 0 });
    let root = '', sequence = 0, searchSequence = 0, draftId = 0;
    let pending = Promise.resolve();
    let timer = null;
    const businessProfileKeys = ['contact_name', 'category', 'reference', 'notes'];
    const profileFields = { student: ['previous_school', 'nis', 'sus_card', 'inep_code', 'health_plan', 'allergies', 'medications', 'health_notes', 'special_needs', 'authorized_transport', 'student_notes'], teacher: ['registration_number', 'professional_registration', 'employment_type', 'employment_status', 'admission_date', 'termination_date', 'inep_code', 'education_institution', 'degree_course', 'specialization', 'teaching_areas', 'workload_hours', 'profile_notes'], employee: ['employee_number', 'employment_type', 'employment_status', 'admission_date', 'termination_date', 'department', 'job_title', 'work_schedule', 'supervisor_name', 'profile_notes'], supplier: businessProfileKeys, service_provider: businessProfileKeys, customer: businessProfileKeys, partner: businessProfileKeys };
    function eligible(kind) { return ['person', 'guardian', 'student', 'student-edit', 'teacher', 'teacher-edit', 'employee', 'employee-edit'].includes(kind); }
    PigeDossier.eligible = eligible;
    function primaryKind(kind) { return kind.startsWith('student') ? 'student' : kind.startsWith('teacher') ? 'teacher' : kind.startsWith('employee') ? 'employee' : ''; }
    function start(base, kind, form, target) {
        const current = ++sequence;
        root = base;
        PigeDossier.state.active = eligible(kind);
        PigeDossier.state.loading = false;
        PigeDossier.state.error = '';
        PigeDossier.state.rows = [];
        PigeDossier.state.operations = {};
        PigeDossier.state.profiles = {};
        PigeDossier.state.editor = false;
        PigeDossier.state.personId = '';
        PigeDossier.state.personVersion = 0;
        PigeDossier.state.page = 1;
        PigeDossier.state.total = 0;
        PigeDossier.state.matches = [];
        PigeDossier.state.query = '';
        PigeDossier.state.draft = emptyDraft();
        const person = target?.person || target;
        if (!PigeDossier.state.active || !person?.id) {
            pending = Promise.resolve();
            return pending;
        }
        PigeDossier.state.personId = person.id;
        PigeDossier.state.personVersion = person.version;
        PigeDossier.state.loading = true;
        pending = PigeAPI.request(root + '/persons/' + person.id + '/dossier').then(result => {
            if (current !== sequence)
                return;
            PigeDossier.state.personVersion = result.person.version;
            PigeDossier.state.profiles = result.profiles;
            PigeDossier.state.rows = result.family.items;
            PigeDossier.state.total = result.family.total;
            const primary = primaryKind(kind);
            for (const key of Object.keys(form)) {
                if (key.includes('__')) {
                    const [profile, field] = key.split('__');
                    if (result.profiles[profile])
                        form[key] = (result.profiles[profile][field] ?? '');
                }
                else if (primary && profileFields[primary].includes(key) && result.profiles[primary])
                    form[key] = (result.profiles[primary][key] ?? '');
                else if (key in result.person)
                    form[key] = result.person[key];
            }
        }).catch(e => { if (current === sequence)
            PigeDossier.state.error = e instanceof Error ? e.message : String(e); }).finally(() => { if (current === sequence)
            PigeDossier.state.loading = false; });
        return pending;
    }
    PigeDossier.start = start;
    function dirty() { return PigeDossier.state.active && (Object.keys(PigeDossier.state.operations).length > 0 || (PigeDossier.state.editor && Boolean(PigeDossier.state.draft.person_id || PigeDossier.state.draft.name || PigeDossier.state.draft.phone))); }
    PigeDossier.dirty = dirty;
    function begin(student) { PigeDossier.state.editor = true; PigeDossier.state.editId = ''; PigeDossier.state.error = ''; PigeDossier.state.query = ''; PigeDossier.state.matches = []; PigeDossier.state.draft = { ...emptyDraft(), direction: student ? 'guardian' : 'student' }; }
    PigeDossier.begin = begin;
    function edit(row) { PigeDossier.state.editId = row.id; PigeDossier.state.editor = true; PigeDossier.state.error = ''; PigeDossier.state.draft = { ...emptyDraft(), ...(row.new_person || {}), ...row, person_id: row.peer.id, newMode: Boolean(row.new_person), name: row.peer.name, cpf: String(row.new_person?.cpf || ''), birth_date: String(row.new_person?.birth_date || ''), phone: String(row.new_person?.phone || ''), email: String(row.new_person?.email || '') }; }
    PigeDossier.edit = edit;
    function toggle(row) { if (row.local) {
        PigeDossier.state.rows = PigeDossier.state.rows.filter(x => x.id !== row.id);
        delete PigeDossier.state.operations[row.id];
        return;
    } row.active = !row.active; PigeDossier.state.operations[row.id] = { ...row }; }
    PigeDossier.toggle = toggle;
    function search() { if (timer)
        clearTimeout(timer); const current = ++searchSequence; PigeDossier.state.matches = []; PigeDossier.state.draft.person_id = ''; timer = setTimeout(async () => { const q = PigeDossier.state.query.trim(); if (q.length < 2)
        return; PigeDossier.state.searching = true; try {
        const result = await PigeAPI.request(root + '/persons?entity_kind=individual&active=true&page_size=20&q=' + encodeURIComponent(q) + (PigeDossier.state.draft.direction === 'student' ? '&type_code=student' : ''));
        if (current === searchSequence)
            PigeDossier.state.matches = result.items.filter(p => p.id !== PigeDossier.state.personId && (PigeDossier.state.draft.direction !== 'student' || Boolean(p.student_id)));
    }
    catch (e) {
        if (current === searchSequence)
            PigeDossier.state.error = e instanceof Error ? e.message : String(e);
    }
    finally {
        if (current === searchSequence)
            PigeDossier.state.searching = false;
    } }, 250); }
    PigeDossier.search = search;
    function choose(person) { PigeDossier.state.draft.person_id = person.id; PigeDossier.state.draft.name = String(person.name); PigeDossier.state.query = String(person.name); PigeDossier.state.matches = []; }
    PigeDossier.choose = choose;
    function stage() {
        const d = PigeDossier.state.draft;
        PigeDossier.state.error = '';
        if (d.relationship.trim().length < 2) {
            PigeDossier.state.error = 'Informe o parentesco ou tipo de relacionamento.';
            return;
        }
        if (!PigeDossier.state.editId && !d.person_id && !d.newMode) {
            PigeDossier.state.error = 'Selecione uma pessoa ou cadastre uma nova.';
            return;
        }
        if (d.newMode && (d.name.trim().length < 2 || (d.direction === 'student' && !d.birth_date))) {
            PigeDossier.state.error = 'Informe o nome e, para aluno, a data de nascimento.';
            return;
        }
        const old = PigeDossier.state.rows.find(r => r.id === PigeDossier.state.editId), id = old?.id || ('new-' + (++draftId));
        if (!old && !d.newMode && PigeDossier.state.rows.some(r => r.peer.id === d.person_id && r.direction === d.direction)) {
            PigeDossier.state.error = 'Este vínculo já está na ficha. Use Editar ou Reativar.';
            return;
        }
        const row = { id, version: old?.version, local: old?.local ?? !old, direction: d.direction, peer: { id: d.person_id, name: d.name }, relationship: d.relationship.trim(), legal: d.legal, financial: d.financial, pickup: d.pickup, primary_contact: d.primary_contact, active: d.active };
        if (d.newMode)
            row.new_person = { name: d.name.trim(), cpf: d.cpf || null, birth_date: d.birth_date || null, phone: d.phone, email: d.email, rg: d.rg, rg_issuer: d.rg_issuer, birth_certificate: d.birth_certificate, mother_name: d.mother_name, father_name: d.father_name, postal_code: d.postal_code, street: d.street, address_number: d.address_number, address_complement: d.address_complement, district: d.district, city: d.city, state: d.state, country: d.country, address: d.address, entity_kind: 'individual', person_types: d.direction === 'student' ? ['student'] : ['guardian'] };
        if (old)
            PigeDossier.state.rows.splice(PigeDossier.state.rows.indexOf(old), 1, row);
        else
            PigeDossier.state.rows.push(row);
        PigeDossier.state.operations[id] = row;
        PigeDossier.state.editor = false;
        PigeDossier.state.editId = '';
        PigeDossier.state.draft = emptyDraft();
    }
    PigeDossier.stage = stage;
    function cancelEditor() { PigeDossier.state.editor = false; PigeDossier.state.draft = emptyDraft(); PigeDossier.state.editId = ''; PigeDossier.state.error = ''; }
    PigeDossier.cancelEditor = cancelEditor;
    async function more() { if (!PigeDossier.state.personId || PigeDossier.state.loading)
        return; PigeDossier.state.loading = true; try {
        const result = await PigeAPI.request(root + '/persons/' + PigeDossier.state.personId + '/family?page=' + (PigeDossier.state.page + 1));
        PigeDossier.state.rows.push(...result.items.map(x => PigeDossier.state.operations[x.id] || x));
        PigeDossier.state.page = result.page;
        PigeDossier.state.total = result.total;
    }
    finally {
        PigeDossier.state.loading = false;
    } }
    PigeDossier.more = more;
    async function save(kind, form, photo) {
        await pending;
        if (PigeDossier.state.error)
            throw new Error(PigeDossier.state.error);
        if (PigeDossier.state.editor)
            throw new Error('Conclua o vínculo em edição com “Adicionar à ficha”, ou cancele essa edição.');
        const person = { ...form };
        delete person.photo;
        const profiles = {};
        const primary = primaryKind(kind);
        for (const [profile, keys] of Object.entries(profileFields)) {
            const data = {};
            let changed = false;
            for (const key of keys) {
                const field = primary === profile ? key : profile + '__' + key;
                if (field in person) {
                    const value = person[field];
                    delete person[field];
                    if ((value ?? '') !== (PigeDossier.state.profiles[profile]?.[key] ?? ''))
                        changed = true;
                    data[key] = value;
                }
            }
            if ((primary === profile || (Array.isArray(form.person_types) && form.person_types.includes(profile))) && (changed || !PigeDossier.state.profiles[profile]))
                profiles[profile] = { version: PigeDossier.state.profiles[profile]?.version, data };
        }
        const types = Array.isArray(person.person_types) ? person.person_types.map(String) : [];
        if (primary && !types.includes(primary))
            types.push(primary);
        if (kind === 'guardian' && !types.includes('guardian'))
            types.push('guardian');
        person.person_types = types;
        for (const key of ['cpf', 'birth_date', 'rg_issued_on'])
            person[key] = person[key] || null;
        const family = Object.values(PigeDossier.state.operations).map(r => ({ ...(r.local ? {} : { link_id: r.id, version: r.version }), direction: r.direction, person_id: r.new_person ? null : r.peer.id, new_person: r.new_person || null, relationship: r.relationship, legal: r.legal, financial: r.financial, pickup: r.pickup, primary_contact: r.primary_contact, active: r.active }));
        const payload = { person_id: PigeDossier.state.personId || null, version: PigeDossier.state.personVersion || null, person, profiles, family };
        if (photo) {
            const body = new FormData();
            body.set('payload', JSON.stringify(payload));
            body.set('file', photo);
            return PigeAPI.request(root + '/person-dossiers/with-photo', { method: 'POST', body });
        }
        return PigeAPI.post(root + '/person-dossiers', payload);
    }
    PigeDossier.save = save;
})(PigeDossier || (PigeDossier = {}));
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
var PigeDiagnostics;
(function (PigeDiagnostics) {
    PigeDiagnostics.component = { render: PigeRenders.diagnostics, setup() {
            const state = Vue.reactive({ busy: false, error: '', notice: '', summary: null, rows: [], page: 1, total: 0, truncated: false, service: '', level: '', reference: '', since: '', until: '' });
            const query = () => { const q = new URLSearchParams(); for (const [k, v] of Object.entries({ service: state.service, level: state.level, request_id: state.reference, since: state.since ? new Date(state.since).toISOString() : '', until: state.until ? new Date(state.until).toISOString() : '' }))
                if (v)
                    q.set(k, v); return q.toString(); };
            async function run(action) { if (state.busy)
                return; state.busy = true; state.error = ''; try {
                await action();
            }
            catch (e) {
                state.error = e instanceof Error ? e.message : 'Falha de diagnóstico.';
            }
            finally {
                state.busy = false;
            } }
            async function events() { const r = await PigeAPI.request('/diagnostics/events?' + query() + '&page=' + state.page); state.rows = r.items; state.total = r.total; state.truncated = r.truncated; }
            async function load() { await run(async () => { state.summary = await PigeAPI.request('/diagnostics/summary'); await events(); }); }
            async function search() { state.page = 1; await run(events); }
            async function page(delta) { state.page += delta; await run(events); }
            async function download() { await run(async () => { await PigeAPI.download('/diagnostics/export?' + query(), 'diagnostico-escola.zip'); state.notice = 'Pacote gerado. Compartilhe somente com o suporte autorizado.'; }); }
            const pretty = (v) => JSON.stringify(v, null, 2);
            const date = (v) => v ? new Date(v).toLocaleString('pt-BR') : 'Não observado';
            Vue.onMounted(() => { void load(); });
            return { state, load, search, page, download, pretty, date };
        } };
})(PigeDiagnostics || (PigeDiagnostics = {}));
var PigeDiary;
(function (PigeDiary) {
    const today = () => new Date().toISOString().slice(0, 10);
    PigeDiary.component = { props: ['schoolId', 'permissions'], render: PigeRenders.diary, setup(props) {
            const state = Vue.reactive({
                busy: false, error: '', notice: '', tab: 'diaries',
                diaries: [], selected: null, academicYears: [], periods: [], components: [], groups: [], assignments: [], plans: [],
                periodForm: { academic_year_id: '', name: '', starts_on: '', ends_on: '', order_index: 1, active: true },
                componentForm: { name: '', code: '', workload_hours: 0, active: true },
                diaryForm: { class_group_id: '', component_id: '', teacher_assignment_id: '', notes: '' },
                planForm: { class_group_id: '', component_id: '', academic_period_id: '', teacher_assignment_id: '', objectives: '', thematic_units: '', knowledge_objects: '', bncc_references: '', methodology: '', resources: '', assessment_strategy: '', notes: '', status: 'draft' },
                lessonForm: { academic_period_id: '', lesson_date: today(), lesson_count: 1, content: '', skills: '', methodology: '', activities: '', homework: '', notes: '' },
                selectedLesson: null, attendance: [],
                assessments: [], selectedAssessment: null, assessmentRoster: [],
                assessmentForm: { academic_period_id: '', title: '', kind: 'activity', assessment_date: today(), value_type: 'numeric', max_score: '10', weight: '1', description: '', skills: '', status: 'draft' },
                opinions: [], opinionForm: { academic_period_id: '', enrollment_id: '', text: '', status: 'draft' },
                pedagogicalRecords: [], pedagogicalForm: { enrollment_id: '', record_date: today(), kind: 'observation', text: '' },
                closePeriod: '', closeReason: 'Fechamento pedagógico conferido.', reopenReason: '',
                summary: null,
                history: { closures: [], revisions: [] },
                dashboard: { items: [], totals: {} },
                assessmentRules: [],
                assessmentRuleForm: { period_id: '', method: 'arithmetic', scale_max: '10', decimal_places: 2, minimum_score: '', minimum_attendance_percent: '', justified_absence_counts_as_present: '', recovery_mode: 'none', concept_scale: '', required_opinion: false, version: null },
                periodResults: [],
                occurrences: [],
                communicationRecipients: [], communications: [],
                communicationForm: { enrollment_id: '', academic_period_id: '', occurrence_id: '', recipient_guardian_link_ids: [], title: '', message: '', client_key: PigeOnline.newId() },
                occurrenceForm: { academic_period_id: '', enrollment_id: '', occurrence_date: today(), kind: 'pedagogical', title: '', description: '', status: 'draft' },
                reportType: 'class_diary', reportPeriod: '', reportEnrollment: ''
            });
            const base = () => '/schools/' + props.schoolId;
            const can = (p) => props.permissions.includes(p);
            const str = (v) => v == null ? '' : String(v);
            const date = (v) => { const x = str(v); return x ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(x.length === 10 ? x + 'T12:00:00Z' : x)) : '—'; };
            const labels = { open: 'Aberto', draft: 'Rascunho', submitted: 'Enviado', reviewed: 'Revisado', closed: 'Fechado', present: 'Presente', absent: 'Falta', justified_absence: 'Falta justificada', active: 'Ativo', suspended: 'Suspenso' };
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
                    PigeAPI.request(base() + '/academic-years'),
                    PigeAPI.request(base() + '/class-groups').catch(() => []),
                    PigeAPI.request(base() + '/teacher-assignments').catch(() => []),
                    PigeAPI.request(base() + '/diary-dashboard').catch(() => ({ items: [], totals: {} }))
                ]);
                state.diaries = results[0];
                state.periods = results[1];
                state.components = results[2];
                state.academicYears = results[3];
                state.groups = results[4];
                state.assignments = results[5];
                state.dashboard = results[6];
                if (!state.periodForm.academic_year_id && state.academicYears.length) {
                    const year = state.academicYears.find(x => x.status === 'active' || x.active) || state.academicYears[0];
                    state.periodForm.academic_year_id = str(year.id);
                }
            }
            async function load() { await run(loadBase); }
            async function selectDiary(d) { await run(async () => { state.selected = await PigeAPI.request(base() + '/diaries/' + d.id); state.summary = await PigeAPI.request(base() + '/diaries/' + d.id + '/summary'); state.history = await PigeAPI.request(base() + '/diaries/' + d.id + '/history'); state.plans = await PigeAPI.request(base() + '/curriculum-plans?class_group_id=' + encodeURIComponent(d.class_group_id) + '&component_id=' + encodeURIComponent(d.component_id)); state.selectedLesson = null; state.attendance = []; state.selectedAssessment = null; state.assessmentRoster = []; state.planForm.class_group_id = d.class_group_id; state.planForm.component_id = d.component_id; state.planForm.teacher_assignment_id = d.teacher_assignment_id || ''; state.assessments = await PigeAPI.request(base() + '/diaries/' + d.id + '/assessments'); state.assessmentRules = await PigeAPI.request(base() + '/diaries/' + d.id + '/assessment-rules'); state.periodResults = []; state.occurrences = await PigeAPI.request(base() + '/diaries/' + d.id + '/occurrences'); state.occurrenceForm = { academic_period_id: '', enrollment_id: '', occurrence_date: today(), kind: 'pedagogical', title: '', description: '', status: 'draft' }; const firstPeriod = state.periods.find(p => p.academic_year_id === d.academic_year_id); if (firstPeriod)
                selectRulePeriod(str(firstPeriod.id)); state.opinions = await PigeAPI.request(base() + '/diaries/' + d.id + '/opinions'); state.pedagogicalRecords = await PigeAPI.request(base() + '/diaries/' + d.id + '/pedagogical-records'); state.communications = await PigeAPI.request(base() + '/diaries/' + d.id + '/communications'); state.communicationRecipients = []; state.communicationForm = { enrollment_id: '', academic_period_id: '', occurrence_id: '', recipient_guardian_link_ids: [], title: '', message: '', client_key: PigeOnline.newId() }; }); }
            function selectRulePeriod(periodId) { const rule = state.assessmentRules.find(x => x.academic_period_id === periodId); state.assessmentRuleForm = { period_id: periodId, method: str(rule?.method) || 'arithmetic', scale_max: str(rule?.scale_max) || '10', decimal_places: Number(rule?.decimal_places ?? 2), minimum_score: str(rule?.minimum_score), minimum_attendance_percent: str(rule?.minimum_attendance_percent), justified_absence_counts_as_present: rule?.justified_absence_counts_as_present == null ? '' : String(rule.justified_absence_counts_as_present), recovery_mode: str(rule?.recovery_mode) || 'none', concept_scale: Array.isArray(rule?.concept_scale) ? rule.concept_scale.join(', ') : '', required_opinion: Boolean(rule?.required_opinion), version: rule?.version == null ? null : Number(rule.version) }; }
            async function saveAssessmentRule() { if (!state.selected || !state.assessmentRuleForm.period_id)
                return; await run(async () => { const f = state.assessmentRuleForm; const body = { method: f.method, scale_max: f.scale_max, decimal_places: f.decimal_places, minimum_score: f.minimum_score || null, minimum_attendance_percent: f.minimum_attendance_percent || null, justified_absence_counts_as_present: f.minimum_attendance_percent ? (f.justified_absence_counts_as_present === 'true') : null, recovery_mode: f.recovery_mode, concept_scale: f.method === 'concept' ? f.concept_scale.split(/[,;]+/).map(x => x.trim()).filter(Boolean) : [], required_opinion: f.required_opinion, version: f.version }; const saved = await PigeAPI.request(base() + '/diaries/' + state.selected.id + '/assessment-rules/' + f.period_id, { method: 'PUT', body: JSON.stringify(body) }); state.assessmentRules = state.assessmentRules.filter(x => x.academic_period_id !== f.period_id).concat(saved); selectRulePeriod(f.period_id); state.notice = 'Regra salva; os resultados mudam apenas após consolidação explícita.'; }); }
            async function loadPeriodResults() { if (!state.selected || !state.assessmentRuleForm.period_id)
                return; await run(async () => { const r = await PigeAPI.request(base() + '/diaries/' + state.selected.id + '/periods/' + state.assessmentRuleForm.period_id + '/results'); state.periodResults = r.items; }); }
            async function consolidatePeriod() { if (!state.selected || !state.assessmentRuleForm.period_id)
                return; await run(async () => { const r = await PigeAPI.post(base() + '/diaries/' + state.selected.id + '/periods/' + state.assessmentRuleForm.period_id + '/consolidate', { version: state.selected.version }); state.periodResults = r.results; state.notice = 'Consolidação auditada; ' + r.pending + ' resultado(s) pendente(s).'; await loadBase(); }); }
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
            async function createPeriod() { await run(async () => { await PigeAPI.post(base() + '/academic-periods', state.periodForm); state.periodForm = { academic_year_id: state.periodForm.academic_year_id, name: '', starts_on: '', ends_on: '', order_index: state.periodForm.order_index + 1, active: true }; await loadBase(); state.notice = 'Período letivo criado.'; }); }
            async function createComponent() { await run(async () => { await PigeAPI.post(base() + '/curriculum-components', state.componentForm); state.componentForm = { name: '', code: '', workload_hours: 0, active: true }; await loadBase(); state.notice = 'Componente curricular criado.'; }); }
            async function createDiary() { await run(async () => { const body = { ...state.diaryForm, teacher_assignment_id: state.diaryForm.teacher_assignment_id || null }; const d = await PigeAPI.post(base() + '/diaries', body); state.diaryForm = { class_group_id: '', component_id: '', teacher_assignment_id: '', notes: '' }; await loadBase(); await selectDiary(d); state.notice = 'Diário aberto.'; }); }
            async function createPlan() { if (!state.selected)
                return; await run(async () => { const f = state.planForm; await PigeAPI.post(base() + '/curriculum-plans', { ...f, academic_period_id: f.academic_period_id || null, teacher_assignment_id: f.teacher_assignment_id || null, bncc_references: f.bncc_references.split(/[\s,;]+/).map(x => x.trim()).filter(Boolean) }); state.plans = await PigeAPI.request(base() + '/curriculum-plans?class_group_id=' + encodeURIComponent(state.selected.class_group_id) + '&component_id=' + encodeURIComponent(state.selected.component_id)); state.notice = 'Planejamento registrado.'; }); }
            async function createLesson() { if (!state.selected)
                return; await run(async () => { await PigeAPI.post(base() + '/diaries/' + state.selected.id + '/lessons', { ...state.lessonForm, academic_period_id: state.lessonForm.academic_period_id || null }); state.lessonForm = { academic_period_id: state.lessonForm.academic_period_id, lesson_date: today(), lesson_count: 1, content: '', skills: '', methodology: '', activities: '', homework: '', notes: '' }; await selectDiary(state.selected); state.notice = 'Aula registrada.'; }); }
            async function openAttendance(lesson) { if (!state.selected)
                return; await run(async () => { const result = await PigeAPI.request(base() + '/diaries/' + state.selected.id + '/lessons/' + lesson.id + '/attendance'); state.selectedLesson = result.lesson; state.attendance = result.roster.map(r => ({ ...r, attendance: r.attendance || { status: 'present', note: '' } })); }); }
            async function saveAttendance() { if (!state.selected || !state.selectedLesson)
                return; await run(async () => { await PigeAPI.request(base() + '/diaries/' + state.selected.id + '/lessons/' + state.selectedLesson.id + '/attendance', { method: 'PUT', body: JSON.stringify({ items: state.attendance.map(r => ({ enrollment_id: r.enrollment_id, status: r.attendance?.status || 'present', note: r.attendance?.note || '' })) }) }); state.notice = 'Chamada salva.'; await selectDiary(state.selected); }); }
            async function createAssessment() { if (!state.selected)
                return; await run(async () => { const f = state.assessmentForm; await PigeAPI.post(base() + '/diaries/' + state.selected.id + '/assessments', { ...f, academic_period_id: f.academic_period_id || null, max_score: f.value_type === 'numeric' ? (f.max_score || null) : null, weight: f.weight || null }); state.assessmentForm = { academic_period_id: f.academic_period_id, title: '', kind: 'activity', assessment_date: today(), value_type: f.value_type, max_score: '10', weight: '1', description: '', skills: '', status: 'draft' }; state.assessments = await PigeAPI.request(base() + '/diaries/' + state.selected.id + '/assessments'); state.notice = 'Avaliação criada.'; }); }
            async function openAssessment(a) { if (!state.selected)
                return; await run(async () => { const result = await PigeAPI.request(base() + '/diaries/' + state.selected.id + '/assessments/' + a.id + '/results'); state.selectedAssessment = result.instrument; state.assessmentRoster = result.roster.map(r => ({ ...r, result: r.result || { numeric_score: null, concept: '', note: '' } })); }); }
            async function saveAssessmentResults() { if (!state.selected || !state.selectedAssessment)
                return; await run(async () => { await PigeAPI.request(base() + '/diaries/' + state.selected.id + '/assessments/' + state.selectedAssessment.id + '/results', { method: 'PUT', body: JSON.stringify({ items: state.assessmentRoster.map(r => ({ enrollment_id: r.enrollment_id, numeric_score: state.selectedAssessment.value_type === 'numeric' ? (r.result?.numeric_score ?? null) : null, concept: state.selectedAssessment.value_type === 'concept' ? str(r.result?.concept) : '', note: str(r.result?.note) })) }) }); state.notice = 'Resultados salvos.'; await selectDiary(state.selected); }); }
            async function saveOpinion() { if (!state.selected)
                return; await run(async () => { await PigeAPI.post(base() + '/diaries/' + state.selected.id + '/opinions', { ...state.opinionForm, academic_period_id: state.opinionForm.academic_period_id || null }); state.opinionForm = { academic_period_id: state.opinionForm.academic_period_id, enrollment_id: '', text: '', status: 'draft' }; state.opinions = await PigeAPI.request(base() + '/diaries/' + state.selected.id + '/opinions'); state.notice = 'Parecer salvo.'; }); }
            async function createPedagogicalRecord() { if (!state.selected)
                return; await run(async () => { await PigeAPI.post(base() + '/diaries/' + state.selected.id + '/pedagogical-records', state.pedagogicalForm); state.pedagogicalForm = { enrollment_id: '', record_date: today(), kind: 'observation', text: '' }; state.pedagogicalRecords = await PigeAPI.request(base() + '/diaries/' + state.selected.id + '/pedagogical-records'); state.notice = 'Registro pedagógico incluído.'; }); }
            async function submitDiary() { if (!state.selected)
                return; await run(async () => { await PigeAPI.post(base() + '/diaries/' + state.selected.id + '/submit', { version: state.selected.version }); await selectDiary(state.selected); state.notice = 'Diário enviado para revisão.'; }); }
            async function reviewDiary() { if (!state.selected)
                return; await run(async () => { await PigeAPI.post(base() + '/diaries/' + state.selected.id + '/review', { version: state.selected.version }); await selectDiary(state.selected); state.notice = 'Diário marcado como revisado.'; }); }
            async function closeDiary() { if (!state.selected)
                return; await run(async () => { const period = Boolean(state.closePeriod); await PigeAPI.post(base() + '/diaries/' + state.selected.id + '/close', { academic_period_id: state.closePeriod || null, reason: state.closeReason, version: state.selected.version }); await selectDiary(state.selected); state.notice = period ? 'Período fechado com snapshot e hash de integridade.' : 'Diário fechado com snapshot e hash de integridade.'; }); }
            async function reopenDiary() { if (!state.selected)
                return; await run(async () => { await PigeAPI.post(base() + '/diaries/' + state.selected.id + '/reopen', { reason: state.reopenReason, version: state.selected.version }); state.reopenReason = ''; await selectDiary(state.selected); state.notice = 'Diário reaberto com registro de retificação.'; }); }
            async function report() { if (state.selected)
                await run(() => { const q = new URLSearchParams(); if (state.reportPeriod)
                    q.set('academic_period_id', state.reportPeriod); if (state.reportType === 'student_record' && state.reportEnrollment)
                    q.set('enrollment_id', state.reportEnrollment); const query = q.toString(); return PigeAPI.download(base() + '/diaries/' + state.selected.id + '/reports/' + state.reportType + '.pdf' + (query ? '?' + query : ''), 'diario-' + state.reportType + '.pdf'); }); }
            Vue.onMounted(() => { void load(); });
            return { state, can, str, date, label, load, selectDiary, loadCommunicationRecipients, communicationOccurrenceChanged, sendCommunication, createPeriod, createComponent, createDiary, createPlan, createLesson, openAttendance, saveAttendance, createAssessment, openAssessment, saveAssessmentResults, saveOpinion, createPedagogicalRecord, submitDiary, reviewDiary, closeDiary, reopenDiary, report, selectRulePeriod, saveAssessmentRule, loadPeriodResults, consolidatePeriod, saveOccurrence };
        } };
})(PigeDiary || (PigeDiary = {}));
var PigeContracts;
(function (PigeContracts) {
    PigeContracts.hasUnsavedChanges = () => false;
    const emptyDraft = () => ({ name: '', kind: 'educational_contract', header: '', body: '', footer: '', academic_year_id: '', valid_from: '', valid_until: '', active: true, require_signature: true });
    const contractKind = (kind) => kind.split('_').some(token => ['contract', 'contracts', 'contrato', 'contratos'].includes(token));
    const str = (value) => value == null ? '' : String(value);
    const date = (value) => { const raw = str(value); return raw ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(raw.length === 10 ? raw + 'T12:00:00Z' : raw)) : '—'; };
    PigeContracts.component = { props: ['schoolId', 'permissions', 'role', 'enrollmentId', 'issuedId'], render: PigeRenders.contracts, setup(props) {
            const state = Vue.reactive({
                busy: false, loading: false, error: '', notice: '', tab: props.issuedId ? 'signatures' : 'templates',
                templates: [], applicable: [], years: [], fields: [],
                selected: null, editing: false, draft: emptyDraft(), savedDraft: '', activeSection: 'body',
                importWarnings: [], importFileName: '', letterheadName: '', letterheadUrl: '',
                enrollmentSearch: '', enrollmentChoices: [], enrollment: null,
                templateId: '', values: {}, preview: null, previewStale: false,
                issued: null
            });
            const identity = PigeInstitution.state;
            let letterheadFile = null;
            const base = () => '/schools/' + props.schoolId;
            const can = (permission) => props.permissions.includes(permission);
            const textDirty = () => state.editing && JSON.stringify(state.draft) !== state.savedDraft;
            const editorDirty = () => textDirty() || Boolean(letterheadFile);
            PigeContracts.hasUnsavedChanges = editorDirty;
            const templatesResponse = (data) => Array.isArray(data) ? data : data.items || [];
            async function run(action) { if (state.busy)
                return; state.busy = true; state.error = ''; state.notice = ''; try {
                await action();
            }
            catch (error) {
                state.error = error instanceof Error ? error.message : String(error);
            }
            finally {
                state.busy = false;
            } }
            async function load() {
                state.loading = true;
                state.error = '';
                try {
                    const [templates, years, fields] = await Promise.all([
                        PigeAPI.request(base() + '/document-templates?include_inactive=true'),
                        PigeAPI.request(base() + '/academic-years'),
                        PigeAPI.request(base() + '/document-templates/fields')
                    ]);
                    state.templates = templatesResponse(templates);
                    state.years = years;
                    state.fields = fields.fields || [];
                    if (state.enrollment)
                        await loadApplicable();
                }
                catch (error) {
                    state.error = error instanceof Error ? error.message : String(error);
                }
                finally {
                    state.loading = false;
                }
            }
            async function loadApplicable() {
                const enrollment = state.enrollment;
                if (!enrollment) {
                    state.applicable = [];
                    return;
                }
                const data = await PigeAPI.request(base() + '/document-templates?enrollment_id=' + encodeURIComponent(enrollment.id));
                if (state.enrollment?.id !== enrollment.id)
                    return;
                state.applicable = templatesResponse(data);
                if (!state.applicable.some(template => template.id === state.templateId)) {
                    state.templateId = '';
                    state.preview = null;
                    state.values = {};
                }
            }
            function beginNew() {
                if (editorDirty() && !window.confirm('Descartar alterações não salvas?'))
                    return;
                clearLetterhead();
                state.selected = null;
                state.draft = emptyDraft();
                state.savedDraft = JSON.stringify(state.draft);
                state.importWarnings = [];
                state.importFileName = '';
                state.editing = true;
                state.tab = 'templates';
                state.error = '';
                state.notice = '';
            }
            async function beginEdit(item) {
                if (editorDirty() && !window.confirm('Descartar alterações não salvas?'))
                    return;
                await run(async () => {
                    const template = await PigeAPI.request(base() + '/document-templates/' + item.id);
                    state.selected = template;
                    state.draft = { name: template.name, kind: template.kind, header: str(template.header), body: template.body, footer: str(template.footer), academic_year_id: str(template.academic_year_id), valid_from: str(template.valid_from), valid_until: str(template.valid_until), active: Boolean(template.active), require_signature: Boolean(template.require_signature) || contractKind(template.kind) };
                    state.savedDraft = JSON.stringify(state.draft);
                    state.importWarnings = [];
                    state.importFileName = '';
                    state.editing = true;
                    state.tab = 'templates';
                    await hydrateLetterhead(template);
                });
            }
            function cancelEdit() { if (editorDirty() && !window.confirm('Descartar alterações não salvas?'))
                return; state.editing = false; state.selected = null; state.importWarnings = []; state.importFileName = ''; clearLetterhead(); }
            function clearLetterhead() { if (state.letterheadUrl)
                URL.revokeObjectURL(state.letterheadUrl); state.letterheadUrl = ''; state.letterheadName = ''; letterheadFile = null; }
            async function hydrateLetterhead(template) { clearLetterhead(); if (template.letterhead_file_id)
                state.letterheadUrl = await PigeAPI.objectUrl(base() + '/files/' + template.letterhead_file_id + '/download'); }
            function letterheadChanged(event) { letterheadFile = event.target.files?.[0] || null; state.letterheadName = letterheadFile?.name || ''; }
            async function uploadLetterhead() {
                if (!state.selected || !letterheadFile)
                    return;
                if (textDirty()) {
                    state.error = 'Salve primeiro as alterações do texto para vincular o timbrado à versão atual.';
                    return;
                }
                if (!/^image\/(png|jpeg)$/.test(letterheadFile.type) || letterheadFile.size > 2 * 1024 * 1024) {
                    state.error = 'Use PNG ou JPEG de até 2 MB para o papel timbrado.';
                    return;
                }
                await run(async () => {
                    const body = new FormData();
                    body.append('file', letterheadFile);
                    const saved = await PigeAPI.request(base() + '/document-templates/' + state.selected.id + '/letterhead', { method: 'POST', body });
                    state.selected = saved;
                    state.templates = state.templates.map(template => template.id === saved.id ? saved : template);
                    await hydrateLetterhead(saved);
                    state.notice = 'Papel timbrado armazenado no modelo. A nova versão será usada nas próximas emissões.';
                });
            }
            async function removeLetterhead() {
                if (!state.selected?.letterhead_file_id || !window.confirm('Remover o papel timbrado deste modelo para as próximas emissões?'))
                    return;
                if (textDirty()) {
                    state.error = 'Salve primeiro as alterações do texto para modificar o papel timbrado.';
                    return;
                }
                await run(async () => {
                    const saved = await PigeAPI.request(base() + '/document-templates/' + state.selected.id + '/letterhead', { method: 'DELETE' });
                    state.selected = saved;
                    state.templates = state.templates.map(template => template.id === saved.id ? saved : template);
                    clearLetterhead();
                    state.notice = 'Papel timbrado removido para as próximas emissões.';
                });
            }
            function yearName(id) { return str(state.years.find(year => year.id === id)?.name) || 'Todos os períodos'; }
            function syncContractSignature() { if (contractKind(state.draft.kind))
                state.draft.require_signature = true; }
            function validateDraft() {
                const draft = state.draft;
                if (!draft.name.trim())
                    throw new Error('Informe o nome do modelo.');
                if (!/^[a-z][a-z0-9_]{1,39}$/.test(draft.kind))
                    throw new Error('A categoria deve começar com letra minúscula e conter apenas letras, números e sublinhado (2 a 40 caracteres).');
                if (draft.body.trim().length < 10 || draft.body.length > 100000 || draft.header.length > 500 || draft.footer.length > 500)
                    throw new Error('O conteúdo deve ter entre 10 e 100 mil caracteres; cabeçalho e rodapé até 500 caracteres.');
                if (draft.valid_from && draft.valid_until && draft.valid_from > draft.valid_until)
                    throw new Error('A validade final precisa ser posterior à inicial.');
            }
            async function save() {
                await run(async () => {
                    validateDraft();
                    const draft = state.draft;
                    const data = { ...draft, name: draft.name.trim(), kind: draft.kind.trim(), require_signature: draft.require_signature || contractKind(draft.kind), academic_year_id: draft.academic_year_id || null, valid_from: draft.valid_from || null, valid_until: draft.valid_until || null };
                    const saved = state.selected
                        ? await PigeAPI.patch(base() + '/document-templates/' + state.selected.id, { ...data, version: state.selected.version })
                        : await PigeAPI.post(base() + '/document-templates', data);
                    state.selected = saved;
                    state.savedDraft = JSON.stringify(state.draft);
                    state.importWarnings = [];
                    state.importFileName = '';
                    const result = await PigeAPI.request(base() + '/document-templates?include_inactive=true');
                    state.templates = templatesResponse(result);
                    if (state.enrollment)
                        await loadApplicable();
                    state.notice = 'Modelo salvo. A versão anterior dos documentos já emitidos continua preservada.';
                });
            }
            async function importDocx(event) {
                const input = event.target;
                const file = input.files?.[0];
                input.value = '';
                if (!file)
                    return;
                if (!/\.docx$/i.test(file.name)) {
                    state.error = 'Selecione um arquivo DOCX (.docx).';
                    return;
                }
                if (file.size > 2 * 1024 * 1024) {
                    state.error = 'O arquivo DOCX deve ter até 2 MB.';
                    return;
                }
                if (state.draft.body.trim() && !window.confirm('Substituir o texto atual pelo texto extraído deste DOCX?'))
                    return;
                await run(async () => {
                    const body = new FormData();
                    body.append('file', file);
                    const converted = await PigeAPI.request(base() + '/document-templates/import-docx', { method: 'POST', body });
                    if (!state.editing)
                        beginNew();
                    state.draft = { ...state.draft, name: state.draft.name || converted.name, header: converted.header || '', body: converted.body, footer: converted.footer || '' };
                    state.importWarnings = converted.warnings || [];
                    state.importFileName = file.name;
                    state.notice = 'Texto do DOCX convertido para edição. Revise cada cláusula e substitua lacunas por campos antes de salvar.';
                });
            }
            async function importJson(event) {
                const input = event.target;
                const file = input.files?.[0];
                input.value = '';
                if (!file)
                    return;
                if (!/\.json$/i.test(file.name) || file.size > 1024 * 1024) {
                    state.error = 'Selecione um modelo JSON de até 1 MB.';
                    return;
                }
                if (state.draft.body.trim() && !window.confirm('Substituir o conteúdo atual pelo modelo JSON?'))
                    return;
                await run(async () => {
                    let parsed;
                    try {
                        parsed = JSON.parse(await file.text());
                    }
                    catch {
                        throw new Error('O arquivo JSON está inválido.');
                    }
                    const outer = parsed;
                    const raw = outer && typeof outer === 'object' && !Array.isArray(outer) && outer.template && typeof outer.template === 'object' ? outer.template : outer;
                    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || typeof raw.name !== 'string' || typeof raw.body !== 'string' || !raw.body.trim())
                        throw new Error('O modelo JSON precisa conter name e body de texto.');
                    if (raw.body.length > 100000 || str(raw.header).length > 500 || str(raw.footer).length > 500)
                        throw new Error('O texto do modelo excede o limite do editor.');
                    if (!state.editing)
                        beginNew();
                    const requestedYear = str(raw.academic_year || outer?.academic_year || file.name.match(/20\d{2}/)?.[0]);
                    const year = requestedYear ? state.years.find(item => String(item.name).includes(requestedYear)) : undefined;
                    const kind = typeof raw.kind === 'string' ? raw.kind : 'educational_contract', needsA1 = contractKind(kind);
                    state.draft = { name: raw.name.slice(0, 160), kind, header: str(raw.header), body: raw.body, footer: str(raw.footer), academic_year_id: str(year?.id) || '', valid_from: typeof raw.valid_from === 'string' ? raw.valid_from : '', valid_until: typeof raw.valid_until === 'string' ? raw.valid_until : '', active: false, require_signature: needsA1 || Boolean(raw.require_signature) };
                    state.importFileName = file.name;
                    state.importWarnings = needsA1 && raw.require_signature === false ? ['Este é um contrato: a assinatura A1 da escola foi ativada para cumprir a regra de emissão.'] : [];
                    state.notice = 'Modelo JSON carregado somente no editor. Confira o ano letivo e o texto; após salvar, envie o timbrado e ative quando estiver revisado.';
                });
            }
            function insertField(key, event) {
                const target = document.getElementById('contract-' + state.activeSection + '-editor');
                if (!target)
                    return;
                const section = target.dataset.section;
                if (!['header', 'body', 'footer'].includes(section))
                    return;
                const value = state.draft[section], start = target.selectionStart, end = target.selectionEnd, marker = '{{' + key + '}}';
                state.draft[section] = value.slice(0, start) + marker + value.slice(end);
                void Vue.nextTick(() => { target.focus(); target.setSelectionRange(start + marker.length, start + marker.length); });
            }
            const category = (key) => key.startsWith('aluno.') ? 'Aluno' : key.startsWith('contratante') || key.startsWith('responsavel.') ? 'Responsáveis' : key.startsWith('financeiro.') ? 'Financeiro' : key.startsWith('escola.') ? 'Escola' : key.startsWith('matricula.') ? 'Matrícula' : key.startsWith('assinatura.') || key.startsWith('testemunha') ? 'Assinaturas' : 'Outros';
            function categoryFields(name) { return state.fields.filter(field => category(field.key) === name); }
            const categories = ['Escola', 'Aluno', 'Responsáveis', 'Matrícula', 'Financeiro', 'Assinaturas', 'Outros'];
            function placeholders() { const matches = (state.draft.header + '\n' + state.draft.body + '\n' + state.draft.footer).matchAll(/\{\{\s*([a-z][a-z0-9_.]*)\s*\}\}/gi); return Array.from(new Set(Array.from(matches, m => m[1]))); }
            function fieldLabel(key) { return state.fields.find(field => field.key === key)?.label || key; }
            async function searchEnrollments() {
                const q = state.enrollmentSearch.trim();
                if (q.length < 2) {
                    state.enrollmentChoices = [];
                    return;
                }
                await run(async () => { const result = await PigeAPI.request(base() + '/enrollments?page_size=20&q=' + encodeURIComponent(q)); state.enrollmentChoices = result.items; });
            }
            async function chooseEnrollment(enrollment) { state.enrollment = enrollment; state.enrollmentSearch = ''; state.enrollmentChoices = []; state.values = {}; state.preview = null; state.issued = null; state.templateId = ''; await run(loadApplicable); }
            function clearEnrollment() { state.enrollment = null; state.applicable = []; state.templateId = ''; state.preview = null; state.values = {}; state.issued = null; }
            function selectTemplate() { state.preview = null; state.values = {}; state.issued = null; }
            function previewKeys() { return state.preview ? Array.from(new Set([...Object.keys(state.preview.variables || {}), ...(state.preview.missing_fields || [])])) : []; }
            function displayValue(key) { return Object.prototype.hasOwnProperty.call(state.values, key) ? state.values[key] : str(state.preview?.variables?.[key]); }
            function automaticValue(key) { return !Object.prototype.hasOwnProperty.call(state.values, key) && Boolean(state.preview?.variables?.[key]); }
            function setValue(key, event) { state.values[key] = event.target.value; state.previewStale = true; state.issued = null; }
            async function preview() {
                if (!state.templateId || !state.enrollment)
                    return;
                await run(async () => {
                    state.preview = await PigeAPI.post(base() + '/document-templates/' + state.templateId + '/preview', { enrollment_id: state.enrollment.id, values: state.values });
                    state.previewStale = false;
                    state.issued = null;
                });
            }
            async function issue() {
                if (!state.templateId || !state.enrollment || !state.preview)
                    return;
                await run(async () => {
                    if (state.previewStale || state.preview?.missing_fields?.length) {
                        throw new Error('Preencha os campos pendentes e gere uma nova prévia antes de emitir.');
                    }
                    const template = state.applicable.find(item => item.id === state.templateId);
                    if (!template || !template.active)
                        throw new Error('Selecione um modelo ativo para esta matrícula.');
                    const result = await PigeAPI.post(base() + '/document-templates/' + state.templateId + '/issue', { enrollment_id: state.enrollment.id, values: state.values });
                    state.issued = result;
                    state.notice = 'PDF emitido e preservado na ficha do aluno. Repetir a mesma emissão reutiliza o documento idêntico.';
                    await downloadIssuedFile(result, (result.template_name || template.name).replace(/[^a-z0-9_-]+/gi, '-') + '.pdf');
                });
            }
            async function downloadPdfPreview() { if (!state.templateId || !state.enrollment)
                return; await run(() => PigeAPI.downloadPost(base() + '/document-templates/' + state.templateId + '/preview.pdf', { enrollment_id: state.enrollment.id, values: state.values }, 'previa-documento.pdf')); }
            async function downloadIssuedFile(issued, name) {
                let fileId = issued.file_id;
                if (issued.signature_status && issued.signature_status !== 'unsigned') {
                    const current = await PigeAPI.request(base() + '/issued-documents/' + issued.id + '/signatures');
                    if (!current.cryptographic_valid)
                        throw new Error('A via assinada não passou na verificação de integridade.');
                    fileId = current.file_id;
                }
                await PigeAPI.download(base() + '/files/' + fileId + '/download', name);
            }
            async function downloadIssued() { if (!state.issued)
                return; await run(() => downloadIssuedFile(state.issued, 'documento-emitido.pdf')); }
            async function activateEnrollment(id) { try {
                const enrollment = await PigeAPI.request(base() + '/enrollments/' + id);
                if (!props.issuedId)
                    state.tab = 'issue';
                await chooseEnrollment(enrollment);
            }
            catch (error) {
                state.error = error instanceof Error ? error.message : String(error);
            } }
            const beforeUnload = (event) => { if (editorDirty()) {
                event.preventDefault();
                event.returnValue = '';
            } };
            Vue.onMounted(() => { window.addEventListener('beforeunload', beforeUnload); void load().then(() => { if (props.enrollmentId)
                void activateEnrollment(props.enrollmentId); }); });
            Vue.onUnmounted(() => { window.removeEventListener('beforeunload', beforeUnload); PigeContracts.hasUnsavedChanges = () => false; clearLetterhead(); });
            return { state, identity, can, str, date, load, beginNew, beginEdit, cancelEdit, save, importDocx, importJson, insertField, categories, categoryFields, yearName, contractKind, syncContractSignature, editorDirty, placeholders, fieldLabel, automaticValue, searchEnrollments, chooseEnrollment, clearEnrollment, selectTemplate, previewKeys, displayValue, setValue, preview, issue, downloadPdfPreview, downloadIssued, letterheadChanged, uploadLetterhead, removeLetterhead };
        } };
})(PigeContracts || (PigeContracts = {}));
var PigeSigning;
(function (PigeSigning) {
    const str = (value) => value == null ? '' : String(value);
    const date = (value) => { const raw = str(value); return raw ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: raw.length === 10 ? undefined : 'short', timeZone: 'America/Bahia' }).format(new Date(raw.length === 10 ? raw + 'T12:00:00Z' : raw)) : '—'; };
    const statuses = { unsigned: 'Sem assinatura', company_signed: 'Assinado pela escola', pending_validation: 'Assinatura do responsável em revisão', verified: 'Conferido pela Direção', rejected: 'Devolvido para correção' };
    PigeSigning.component = { props: ['schoolId', 'permissions', 'role', 'enrollmentId', 'issuedId'], render: PigeRenders.signing, setup(props) {
            const state = Vue.reactive({
                busy: false, loading: false, error: '', notice: '',
                configured: false, certificate: null, certificateName: '', certificatePassword: '',
                pending: [], pendingTotal: 0, offset: 0, limit: 30,
                enrollmentIssued: [], review: null,
                reportName: '', signerCpf: '', validationReference: '', confirmedReview: false, rejectionReason: ''
            });
            let certificateFile = null, reportFile = null;
            const base = () => '/schools/' + props.schoolId;
            const can = (permission) => props.permissions.includes(permission);
            const canManageA1 = () => can('schools.manage') && ['admin', 'direction'].includes(props.role);
            const canDecide = () => can('documents.validate') && ['admin', 'direction'].includes(props.role);
            const certificateExpired = () => Boolean(state.certificate && Date.parse(state.certificate.expires_at) <= Date.now());
            const label = (status) => statuses[str(status)] || str(status) || '—';
            async function run(action) { if (state.busy)
                return; state.busy = true; state.error = ''; state.notice = ''; try {
                await action();
            }
            catch (error) {
                state.error = error instanceof Error ? error.message : String(error);
            }
            finally {
                state.busy = false;
            } }
            async function loadCertificate() {
                if (!can('schools.manage'))
                    return;
                const result = await PigeAPI.request(base() + '/signing-certificate/a1');
                state.configured = result.configured;
                state.certificate = result.certificate;
            }
            async function loadPending() {
                if (!can('documents.validate'))
                    return;
                const result = await PigeAPI.request(base() + `/issued-documents/signatures/pending?limit=${state.limit}&offset=${state.offset}`);
                state.pending = result.items;
                state.pendingTotal = result.total;
            }
            async function loadEnrollmentIssued() {
                if (!props.enrollmentId)
                    return;
                const enrollment = await PigeAPI.request(base() + '/enrollments/' + props.enrollmentId);
                const result = await PigeAPI.request(base() + '/students/' + str(enrollment.student_id) + '/documents');
                state.enrollmentIssued = (result.issued || []).filter(row => row.kind === 'template' && row.enrollment_id === props.enrollmentId);
            }
            async function load() {
                state.loading = true;
                state.error = '';
                try {
                    await Promise.all([loadCertificate(), loadPending(), loadEnrollmentIssued()]);
                    if (props.issuedId)
                        await loadReview(props.issuedId);
                }
                catch (error) {
                    state.error = error instanceof Error ? error.message : String(error);
                }
                finally {
                    state.loading = false;
                }
            }
            async function loadReview(id) { state.review = await PigeAPI.request(base() + '/issued-documents/' + id + '/signatures'); state.confirmedReview = false; state.rejectionReason = ''; }
            async function openReview(id) { await run(() => loadReview(id)); }
            function certificateChanged(event) { certificateFile = event.target.files?.[0] || null; state.certificateName = certificateFile?.name || ''; }
            function clearCertificateInput() { certificateFile = null; state.certificateName = ''; state.certificatePassword = ''; const input = document.getElementById('a1-certificate-file'); if (input)
                input.value = ''; }
            async function saveCertificate() {
                const file = certificateFile, password = state.certificatePassword;
                if (!file || !/\.(pfx|p12)$/i.test(file.name) || file.size > 1024 * 1024) {
                    state.error = 'Selecione um certificado A1 P12/PFX de até 1 MB.';
                    state.certificatePassword = '';
                    return;
                }
                if (!password) {
                    state.error = 'Informe a senha do certificado A1.';
                    return;
                }
                await run(async () => {
                    const form = new FormData();
                    form.append('file', file);
                    form.append('password', password);
                    const saved = await PigeAPI.request(base() + '/signing-certificate/a1', { method: 'PUT', body: form });
                    state.certificate = saved;
                    state.configured = true;
                    state.notice = 'Certificado A1 configurado. Confira sujeito e validade antes de emitir contratos que exigem assinatura.';
                });
                // Senha e arquivo permanecem somente na memória deste formulário durante o envio.
                clearCertificateInput();
            }
            async function removeCertificate() {
                if (!canManageA1() || !window.confirm('Desativar o certificado A1 desta escola para futuras emissões? Contratos já assinados são preservados.'))
                    return;
                await run(async () => { await PigeAPI.request(base() + '/signing-certificate/a1', { method: 'DELETE' }); await loadCertificate(); state.notice = 'Certificado A1 desativado. Emissões que exigem assinatura da escola permanecerão bloqueadas até nova configuração.'; });
            }
            async function page(delta) { const next = state.offset + delta * state.limit; if (next < 0 || next >= state.pendingTotal)
                return; state.offset = next; await run(loadPending); }
            async function download(fileId, name = 'documento-assinado.pdf') { await run(() => PigeAPI.download(base() + '/files/' + fileId + '/download', name)); }
            function reportChanged(event) { reportFile = event.target.files?.[0] || null; state.reportName = reportFile?.name || ''; }
            async function validate() {
                if (!state.review || !canDecide())
                    return;
                if (!state.confirmedReview) {
                    state.error = 'Confirme que conferiu o PDF e a identidade no VALIDAR/ITI.';
                    return;
                }
                if (!reportFile || !/\.pdf$/i.test(reportFile.name)) {
                    state.error = 'Anexe o relatório PDF do VALIDAR/ITI.';
                    return;
                }
                if (state.signerCpf.replace(/\D/g, '').length !== 11 || !state.validationReference.trim()) {
                    state.error = 'Informe CPF do responsável e a referência da validação.';
                    return;
                }
                await run(async () => {
                    const id = state.review.document_id, form = new FormData();
                    form.append('signer_cpf', state.signerCpf.replace(/\D/g, ''));
                    form.append('validation_reference', state.validationReference.trim());
                    form.append('report', reportFile);
                    await PigeAPI.request(base() + '/issued-documents/' + id + '/validate-signature', { method: 'POST', body: form });
                    reportFile = null;
                    state.reportName = '';
                    state.signerCpf = '';
                    state.validationReference = '';
                    state.confirmedReview = false;
                    await Promise.all([loadReview(id), loadPending(), loadEnrollmentIssued()]);
                    state.notice = 'Conferência registrada com relatório e usuário responsável. A versão do PDF permanece auditável.';
                });
            }
            async function reject() {
                if (!state.review || !canDecide())
                    return;
                if (state.rejectionReason.trim().length < 10) {
                    state.error = 'Descreva o motivo da devolução em ao menos 10 caracteres.';
                    return;
                }
                await run(async () => {
                    const id = state.review.document_id, form = new FormData();
                    form.append('reason', state.rejectionReason.trim());
                    await PigeAPI.request(base() + '/issued-documents/' + id + '/reject-signature', { method: 'POST', body: form });
                    await Promise.all([loadReview(id), loadPending(), loadEnrollmentIssued()]);
                    state.notice = 'Assinatura devolvida. O responsável poderá reenviar uma nova revisão do PDF.';
                });
            }
            Vue.onMounted(() => { void load(); });
            Vue.onUnmounted(() => { clearCertificateInput(); reportFile = null; state.signerCpf = ''; state.validationReference = ''; });
            return { state, can, canManageA1, canDecide, certificateExpired, str, date, label, load, loadPending, openReview, certificateChanged, saveCertificate, removeCertificate, page, download, reportChanged, validate, reject };
        } };
})(PigeSigning || (PigeSigning = {}));
var PigeUI;
(function (PigeUI) {
    const text = (value) => value === null || value === undefined ? '' : String(value);
    const statusLabels = { active: 'Ativo', archived: 'Arquivado', draft: 'Rascunho', suspended: 'Suspenso', transferred: 'Transferido', cancelled: 'Cancelado', completed: 'Concluído', pending: 'Pendente', received: 'Recebido', validated: 'Validado', rejected: 'Rejeitado', expired: 'Vencido', waived: 'Dispensado', open: 'Aberto', in_progress: 'Em atendimento', waiting: 'Aguardando', closed: 'Fechado', admin: 'Administrador', direction: 'Direção', coordination: 'Coordenação', secretary: 'Secretaria', teacher: 'Professor', student: 'Aluno', guardian: 'Responsável', viewer: 'Consulta', leave: 'Afastado', inactive: 'Inativo', clt: 'CLT', public: 'Serviço público', temporary: 'Temporário', substitute: 'Substituto', intern: 'Estágio', outsourced: 'Terceirizado', other: 'Outro' };
    const catalogLabels = { 'units': 'Unidades', 'academic-years': 'Anos letivos', 'grades': 'Séries e etapas', 'shifts': 'Turnos', 'class-groups': 'Turmas', 'document-types': 'Tipos de documento' };
    const registryPages = ['people', 'students', 'teachers', 'employees', 'guardians', 'suppliers', 'providers', 'customers', 'partners'];
    const businessTypes = { suppliers: { code: 'supplier', singular: 'fornecedor', category: 'Categoria de fornecimento' }, providers: { code: 'service_provider', singular: 'prestador de serviços', category: 'Especialidade / serviço' }, customers: { code: 'customer', singular: 'cliente', category: 'Categoria do cliente' }, partners: { code: 'partner', singular: 'sócio', category: 'Vínculo societário' } };
    const pageLabels = { diagnostics: 'Diagnóstico e logs', online: 'Inscrições online', banking: 'Cobranças', integrations: 'Bancária', connect: 'WhatsApp', email: 'E-mail / SMTP', dashboard: 'Visão geral', help: 'Guia de uso', people: 'Cadastro único', students: 'Alunos', teachers: 'Professores', employees: 'Funcionários', guardians: 'Pais e responsáveis', suppliers: 'Fornecedores', providers: 'Prestadores de serviços', customers: 'Clientes', partners: 'Sócios', academic: 'Estrutura acadêmica', diary: 'Diário Escolar', enrollments: 'Matrículas', documents: 'Pendências documentais', contracts: 'Modelos e contratos', protocols: 'Protocolos', reports: 'Relatórios', settings: 'Instituição', users: 'Usuários e acessos', audit: 'Auditoria', 'legacy-import': 'Portabilidade de dados' };
    const integrationPages = ['connect', 'email', 'integrations'];
    const blankModal = () => ({ kind: '', title: '', fields: [], form: {}, target: null, action: '', error: '' });
    const state = Vue.reactive({
        embeddingProbe: { busy: false, message: '', frame_policy: '', x_frame_options: '' },
        assistSource: '',
        ready: false, configured: true, embedded: window.self !== window.top, online: navigator.onLine, loginBusy: false, busy: false, loading: false,
        error: '', success: '', menuOpen: false, user: null, userPhotoUrl: '', profilePhotoPreview: '',
        schools: [], schoolId: '', page: 'dashboard', q: '', pageNumber: 1, total: 0,
        rows: [], dashboard: {}, catalogs: {}, catalog: 'class-groups',
        selectedStudent: null, studentTab: 'cadastro', contractEnrollmentId: '', contractReviewIssuedId: '', profileContext: {}, studentDocs: { items: [], checklist: [], issued: [] }, history: [],
        studentChoices: [], personChoices: [], studentSearchQuery: '', studentSearchBusy: false, studentSearchMessage: 'Digite ao menos 2 caracteres para pesquisar.', personSearchQuery: '', personSearchBusy: false, personSearchMessage: 'Digite ao menos 2 caracteres para pesquisar.', photoUrls: {}, companies: [], reportClass: '', reportRows: [],
        supportHub: { id: '', company_id: '', enabled: false, base_url: '', position: 'left', widget_type: 'expanded_bubble', launcher_title: 'Suporte', token_configured: false, version: 1 },
        personTypeQuery: '', cadastresOpen: true, integrationsOpen: true, emailStatus: 'idle', registryFilter: { type_code: '', entity_kind: '', active: '' }, modalSection: 'identification', discardChanges: false, modalInitial: '', reuseTarget: '',
        modal: blankModal(), login: { email: '', password: '' }, setup: { token: '', admin_name: '', admin_email: '', admin_password: '', company_name: '', company_document: '', school_name: '', unit_name: 'Unidade principal', academic_year: new Date().getFullYear() },
        filters: { status: '', academic_year_id: '', class_group_id: '', document_type_id: '', document_status: '', overdue: false },
        pendencySummary: { truncated: false, total_documents: 0, scanned_students: 0, total_students: 0 },
        studentProtocols: [], studentProtocolTotal: 0,
        canInstall: false, updateAvailable: false,
        legacyImport: { busy: false, backupName: '', mediaName: '', confirmation: '', error: '', preview: null, result: null, runs: [] },
    });
    let selectedFile = null;
    let legacyBackupFile = null;
    let legacyMediaFile = null;
    let identityFiles = {};
    let sequence = 0;
    let personSearchSequence = 0, studentSearchSequence = 0;
    let personSearchTimer = 0, studentSearchTimer = 0;
    let installEvent = null;
    let waitingWorker = null;
    const photoDownloadLimit = 4;
    const photoPending = new Map();
    const photoRetryAfter = new Map();
    const photoWaiters = [];
    let activePhotoDownloads = 0, photoEpoch = 0;
    function resetFilters() { state.filters = { status: '', academic_year_id: '', class_group_id: '', document_type_id: '', document_status: '', overdue: false }; }
    function filteredClasses() { return options('class-groups').filter(o => !state.filters.academic_year_id || state.catalogs['class-groups']?.find(c => c.id === o.value)?.academic_year_id === state.filters.academic_year_id); }
    function filterQuery() {
        const query = new URLSearchParams();
        const keys = state.page === 'protocols' ? ['status', 'overdue'] : state.page === 'documents' ? ['academic_year_id', 'class_group_id', 'document_type_id', 'document_status'] : ['status', 'academic_year_id', 'class_group_id'];
        for (const key of keys) {
            const value = state.filters[key];
            if (value)
                query.set(key, text(value));
        }
        return query.toString();
    }
    async function clearFilters() { resetFilters(); state.q = ''; await search(); }
    async function yearChanged() { state.filters.class_group_id = ''; await search(); }
    function base() { return '/schools/' + state.schoolId; }
    function can(permission) { return Boolean(state.user?.permissions.includes(permission)); }
    function pageAllowed(page) {
        if (isProfileRole())
            return page === 'dashboard' || page === 'help' || (page === 'diary' && can('diary.read'));
        if (page === 'legacy-import' || page === 'diagnostics' || page === 'email')
            return state.user?.role === 'admin';
        if (page === 'contracts')
            return can('documents.read');
        if (page === 'connect')
            return can('connect.manage');
        if (page === 'integrations')
            return can('integrations.manage');
        return true;
    }
    function contractDirty() { return state.page === 'contracts' && PigeContracts.hasUnsavedChanges(); }
    function isProfileRole() { return ['teacher', 'student', 'guardian'].includes(text(state.user?.role)); }
    function school() { return state.schools.find(s => s.id === state.schoolId); }
    function label(value) { const key = text(value); return statusLabels[key] || key || '—'; }
    function date(value) { const v = text(value); return v ? new Intl.DateTimeFormat('pt-BR', { timeZone: v.length === 10 ? 'UTC' : 'America/Bahia' }).format(new Date(v.length === 10 ? v + 'T12:00:00Z' : v)) : '—'; }
    function cpf(value) { const v = text(value); return v.length === 11 ? `***.${v.slice(3, 6)}.${v.slice(6, 9)}-**` : 'Não informado'; }
    function initials(value) { return text(value).split(' ').filter(Boolean).slice(0, 2).map(v => v[0]).join('').toUpperCase(); }
    function getName(list, id) { return text(state.catalogs[list]?.find(x => x.id === id)?.name) || '—'; }
    function options(list) { return (state.catalogs[list] || []).map(x => ({ value: x.id, label: text(x.name) + (list === 'class-groups' ? ' · ' + getName('academic-years', x.academic_year_id) + ' · ' + getName('shifts', x.shift_id) : '') })); }
    function field(key, caption, type = 'text', required = false, opts, wide = false) { return { key, label: caption, type, required, options: opts, wide }; }
    const studentFieldKeys = ['previous_school', 'nis', 'sus_card', 'inep_code', 'health_plan', 'allergies', 'medications', 'health_notes', 'special_needs', 'authorized_transport', 'student_notes'];
    const personTypeLabels = {
        student: 'Aluno', teacher: 'Professor', collaborator: 'Colaborador', employee: 'Funcionário',
        parent: 'Pai / mãe', mother: 'Mãe', father: 'Pai', guardian: 'Responsável',
        financial_responsible: 'Responsável financeiro', legal_responsible: 'Responsável legal',
        staff: 'Equipe / administrativo', supplier: 'Fornecedor', service_provider: 'Prestador de serviços', customer: 'Cliente', partner: 'Sócio', other: 'Outro'
    };
    function personTypeLabel(value) { const code = text(value); return personTypeLabels[code] || code.replace(/_/g, ' ').replace(/^./, letter => letter.toUpperCase()); }
    function personTypeOptions(extra = []) {
        const codes = Array.from(new Set([...Object.keys(personTypeLabels), ...extra]));
        return codes.map(value => ({ value, label: personTypeLabel(value) }));
    }
    const canonicalTypes = { parent: 'guardian', mother: 'guardian', father: 'guardian', financial_responsible: 'guardian', legal_responsible: 'guardian', collaborator: 'employee', staff: 'employee' };
    const quickTypes = ['student', 'teacher', 'employee', 'guardian', 'supplier', 'service_provider', 'customer', 'partner', 'other'];
    function selectedPersonTypes() { return Array.from(new Set(personTypesFrom(state.modal.form).map(t => canonicalTypes[t] || t))); }
    function lockedPersonType(type) { const primary = state.modal.kind.split('-')[0]; if (['student', 'teacher', 'employee', 'guardian'].includes(primary) && type === primary)
        return true; if (type === 'guardian' && PigeDossier.state.rows.some(r => r.direction === 'student' && r.active && !r.local))
        return true; return selectedPersonTypes().includes(type) && Boolean(PigeDossier.state.profiles[type]); }
    function togglePersonType(type) { if (lockedPersonType(type) || state.busy || PigeDossier.state.loading)
        return; const types = personTypesFrom(state.modal.form); state.modal.form.person_types = selectedPersonTypes().includes(type) ? types.filter(t => (canonicalTypes[t] || t) !== type) : [...types, type]; state.personTypeQuery = ''; }
    function availablePersonTypes() { const selected = selectedPersonTypes(); return quickTypes.filter(t => !selected.includes(t) && personTypeLabel(t).toLocaleLowerCase('pt-BR').includes(state.personTypeQuery.toLocaleLowerCase('pt-BR')) && (state.modal.form.entity_kind !== 'organization' || ['supplier', 'service_provider', 'customer', 'partner', 'other'].includes(t))); }
    function familyRelevant() { return PigeDossier.eligible(state.modal.kind) && state.modal.form.entity_kind !== 'organization' && (selectedPersonTypes().some(t => ['student', 'guardian'].includes(t)) || PigeDossier.state.rows.length > 0); }
    function personFields(extraTypes = []) {
        return [
            field('entity_kind', 'Natureza da pessoa', 'select', true, [{ value: 'individual', label: 'Pessoa física' }, { value: 'organization', label: 'Pessoa jurídica' }]),
            field('cnpj', 'CNPJ'), field('trade_name', 'Nome fantasia'), field('state_registration', 'Inscrição estadual'), field('municipal_registration', 'Inscrição municipal'),
            field('registration_status', 'Situação cadastral CNPJ'), field('opened_on', 'Data de abertura'), field('legal_nature', 'Natureza jurídica'), field('main_activity', 'Atividade principal'),
            field('person_types', 'Tipos de pessoa', 'multiselect', false, personTypeOptions(extraTypes), true),
            field('name', 'Nome completo', 'text', true), field('social_name', 'Nome social'), field('cpf', 'CPF'), field('birth_date', 'Data de nascimento', 'date'),
            field('birth_certificate', 'Certidão / registro de nascimento'), field('birth_city', 'Cidade de nascimento'), field('birth_state', 'UF de nascimento'),
            field('nationality', 'Nacionalidade'), field('sex', 'Sexo', 'select', false, [{ value: 'female', label: 'Feminino' }, { value: 'male', label: 'Masculino' }, { value: 'intersex', label: 'Intersexo' }, { value: 'not_informed', label: 'Não informado' }]),
            field('gender', 'Identidade de gênero'), field('race_color', 'Raça / cor', 'select', false, [{ value: 'branca', label: 'Branca' }, { value: 'preta', label: 'Preta' }, { value: 'parda', label: 'Parda' }, { value: 'amarela', label: 'Amarela' }, { value: 'indigena', label: 'Indígena' }, { value: 'not_informed', label: 'Não informado' }]),
            field('marital_status', 'Estado civil', 'select', false, [{ value: 'single', label: 'Solteiro(a)' }, { value: 'married', label: 'Casado(a)' }, { value: 'divorced', label: 'Divorciado(a)' }, { value: 'widowed', label: 'Viúvo(a)' }, { value: 'not_informed', label: 'Não informado' }]),
            field('rg', 'RG / documento de identidade'), field('rg_issuer', 'Órgão expedidor'), field('rg_state', 'UF do RG'), field('rg_issued_on', 'Data de expedição', 'date'),
            field('mother_name', 'Nome da mãe'), field('father_name', 'Nome do pai'), field('phone', 'Telefone / WhatsApp'), field('phone_secondary', 'Telefone secundário'), field('email', 'E-mail', 'email'),
            field('postal_code', 'CEP'), field('street', 'Logradouro'), field('address_number', 'Número'), field('address_complement', 'Complemento'), field('district', 'Bairro'), field('city', 'Cidade'), field('state', 'UF'), field('country', 'País'),
            field('address', 'Endereço livre / referência', 'text', false, undefined, true), field('occupation', 'Profissão'), field('employer', 'Empresa / empregador'), field('education', 'Escolaridade'),
            field('emergency_contact_name', 'Contato de emergência'), field('emergency_contact_phone', 'Telefone de emergência'), field('active', 'Cadastro ativo', 'checkbox'),
            field('photo', 'Foto da pessoa (PNG ou JPEG)', 'photo', false, undefined, true), field('notes', 'Observações administrativas', 'textarea', false, undefined, true)
        ];
    }
    function studentFields() {
        return [
            field('previous_school', 'Escola anterior'), field('nis', 'NIS / PIS'), field('sus_card', 'Cartão SUS'), field('inep_code', 'Código INEP'),
            field('health_plan', 'Plano de saúde'), field('allergies', 'Alergias', 'textarea', false, undefined, true), field('medications', 'Medicamentos de uso contínuo', 'textarea', false, undefined, true),
            field('health_notes', 'Informações de saúde', 'textarea', false, undefined, true), field('special_needs', 'Necessidades específicas', 'textarea', false, undefined, true),
            field('authorized_transport', 'Transporte autorizado'), field('student_notes', 'Observações pedagógicas / administrativas', 'textarea', false, undefined, true)
        ];
    }
    const employmentTypes = [{ value: 'clt', label: 'CLT' }, { value: 'public', label: 'Serviço público' }, { value: 'temporary', label: 'Temporário' }, { value: 'substitute', label: 'Substituto' }, { value: 'intern', label: 'Estágio' }, { value: 'outsourced', label: 'Terceirizado' }, { value: 'other', label: 'Outro' }];
    const employmentStatuses = [{ value: 'active', label: 'Ativo' }, { value: 'leave', label: 'Afastado' }, { value: 'inactive', label: 'Inativo' }];
    const teacherProfileKeys = ['registration_number', 'professional_registration', 'employment_type', 'employment_status', 'admission_date', 'termination_date', 'inep_code', 'education_institution', 'degree_course', 'specialization', 'teaching_areas', 'workload_hours', 'profile_notes'];
    const employeeProfileKeys = ['employee_number', 'employment_type', 'employment_status', 'admission_date', 'termination_date', 'department', 'job_title', 'work_schedule', 'supervisor_name', 'profile_notes'];
    function teacherFields() {
        return [
            field('registration_number', 'Matrícula funcional'), field('professional_registration', 'Registro profissional / conselho'),
            field('employment_type', 'Vínculo de trabalho', 'select', true, employmentTypes), field('employment_status', 'Situação funcional', 'select', true, employmentStatuses),
            field('admission_date', 'Data de admissão', 'date'), field('termination_date', 'Data de desligamento', 'date'), field('inep_code', 'Código INEP do docente'),
            field('education_institution', 'Instituição de formação'), field('degree_course', 'Curso / licenciatura'), field('specialization', 'Especializações / pós-graduação', 'textarea', false, undefined, true),
            field('teaching_areas', 'Áreas, componentes e etapas de atuação', 'textarea', false, undefined, true), field('workload_hours', 'Carga horária semanal', 'number'),
            field('profile_notes', 'Observações funcionais', 'textarea', false, undefined, true)
        ];
    }
    function employeeFields() {
        return [
            field('employee_number', 'Matrícula funcional'), field('employment_type', 'Vínculo de trabalho', 'select', true, employmentTypes),
            field('employment_status', 'Situação funcional', 'select', true, employmentStatuses), field('admission_date', 'Data de admissão', 'date'), field('termination_date', 'Data de desligamento', 'date'),
            field('department', 'Setor / departamento'), field('job_title', 'Cargo / função'), field('work_schedule', 'Jornada / horário de trabalho'), field('supervisor_name', 'Gestor / responsável'),
            field('profile_notes', 'Observações funcionais', 'textarea', false, undefined, true)
        ];
    }
    function photoFileId(row) { return text(row?.photo_file_id); }
    function clearPhotos() {
        photoEpoch++;
        photoRetryAfter.clear();
        for (const url of Object.values(state.photoUrls))
            URL.revokeObjectURL(url);
        state.photoUrls = {};
    }
    async function acquirePhotoSlot() {
        if (activePhotoDownloads < photoDownloadLimit) {
            activePhotoDownloads++;
            return;
        }
        await new Promise(resolve => photoWaiters.push(resolve));
    }
    function releasePhotoSlot() {
        const next = photoWaiters.shift();
        if (next)
            next();
        else
            activePhotoDownloads--;
    }
    async function hydratePhoto(row) {
        const id = photoFileId(row);
        if (!id || state.photoUrls[id])
            return;
        const schoolId = state.schoolId, epoch = photoEpoch, key = epoch + ':' + id;
        if ((photoRetryAfter.get(key) || 0) > Date.now())
            return;
        const pending = photoPending.get(key);
        if (pending)
            return pending;
        const task = (async () => {
            await acquirePhotoSlot();
            try {
                if (epoch !== photoEpoch || schoolId !== state.schoolId || state.photoUrls[id])
                    return;
                const url = await PigeAPI.objectUrl('/schools/' + schoolId + '/files/' + id + '/download');
                if (epoch === photoEpoch && schoolId === state.schoolId)
                    state.photoUrls[id] = url;
                else
                    URL.revokeObjectURL(url);
            }
            catch {
                if (epoch === photoEpoch)
                    photoRetryAfter.set(key, Date.now() + 30000);
            }
            finally {
                releasePhotoSlot();
            }
        })();
        photoPending.set(key, task);
        try {
            await task;
        }
        finally {
            photoPending.delete(key);
        }
    }
    function photoSrc(row) { const id = photoFileId(row); if (id && !state.photoUrls[id])
        void hydratePhoto(row); return id ? state.photoUrls[id] || '' : ''; }
    async function hydratePhotos(rows) { await Promise.all(rows.map(row => hydratePhoto(row))); }
    function catalogFields(kind) {
        if (kind === 'academic-years')
            return [field('name', 'Nome do ano letivo', 'text', true), field('starts_on', 'Data inicial', 'date', true), field('ends_on', 'Data final', 'date', true), field('status', 'Situação', 'select', true, [{ value: 'active', label: 'Ativo' }, { value: 'closed', label: 'Fechado' }])];
        if (kind === 'class-groups')
            return [field('name', 'Nome da turma', 'text', true), field('unit_id', 'Unidade', 'select', true, options('units')), field('academic_year_id', 'Ano letivo', 'select', true, options('academic-years')), field('grade_id', 'Série / etapa', 'select', true, options('grades')), field('shift_id', 'Turno', 'select', true, options('shifts')), field('capacity', 'Capacidade', 'number', true), field('active', 'Turma ativa', 'checkbox')];
        if (kind === 'document-types')
            return [field('name', 'Nome do documento', 'text', true), field('grade_id', 'Aplicável à série (vazio = todas)', 'select', false, options('grades')), field('required', 'Obrigatório para matrícula', 'checkbox'), field('active', 'Ativo', 'checkbox')];
        if (kind === 'grades')
            return [field('name', 'Nome da série / etapa', 'text', true), field('level', 'Nível de ensino', 'text', true), field('active', 'Ativo', 'checkbox')];
        return [field('name', 'Nome', 'text', true), field('active', 'Ativo', 'checkbox')];
    }
    function notify(error) { state.error = error instanceof Error ? error.message : String(error); }
    async function safe(action) { state.error = ''; try {
        await action();
    }
    catch (error) {
        notify(error);
    } }
    async function initialize() {
        await PigeInstitution.load();
        await safe(async () => {
            const info = typeof PigeInstitution.state.configured === 'boolean' ? { configured: PigeInstitution.state.configured } : await PigeAPI.request('/setup/status');
            state.configured = info.configured;
            if ('version' in info)
                PigeInstitution.state.app_version = String(info.version);
            void PigeSupport.load();
            if (info.configured) {
                try {
                    const session = await PigeAPI.refresh();
                    state.user = session.user;
                    state.ready = true;
                    void loadMyPhoto();
                    await loadShell();
                }
                catch {
                    state.user = null;
                }
            }
        });
        state.ready = true;
    }
    async function login() {
        state.loginBusy = true;
        state.error = '';
        try {
            const result = await PigeAPI.post('/auth/login', state.login);
            state.login.password = '';
            if (await PigeMFA.accept(result))
                return;
            await afterMFA(result);
        }
        catch (error) {
            notify(error);
        }
        finally {
            state.loginBusy = false;
        }
    }
    async function afterMFA(result) { const session = result; PigeAPI.useSession(session); state.user = session.user; state.modal = blankModal(); void loadMyPhoto(); await loadShell(); }
    async function manageMFA() { if (state.modal.kind && modalDirty()) {
        state.modal.error = 'Salve ou cancele a edição do perfil antes de alterar o 2FA.';
        return;
    } openModal('mfa-manage', 'Segurança da minha conta', []); await PigeMFA.manage(); }
    async function editMFAPolicy() { await safe(async () => { const cfg = await PigeAPI.request('/institution/mfa'); if (!cfg.own_enabled) {
        state.error = 'Ative primeiro seu 2FA em Meu perfil → Segurança. Depois defina a obrigatoriedade para a instituição.';
        return;
    } openModal('mfa-policy', 'Política de autenticação em duas etapas', [field('required', 'Exigir 2FA de todos os usuários e contas do portal', 'checkbox'), field('current_password', 'Sua senha atual', 'password', true), field('code', 'Código do seu autenticador ou de recuperação', 'text', true)], { required: Boolean(cfg.required) }, cfg); }); }
    async function configure() {
        state.loginBusy = true;
        state.error = '';
        try {
            const { token, ...data } = state.setup;
            const payload = { ...data, company_name: setupCompany.name, company_document: setupCompany.document, company_details: setupCompany };
            await PigeAPI.request('/setup', { method: 'POST', headers: { 'X-Setup-Token': token }, body: JSON.stringify(payload) });
            state.configured = true;
            await PigeInstitution.load();
            state.login.email = data.admin_email;
            state.setup.admin_password = '';
            state.setup.token = '';
            state.success = 'Instalação concluída. Entre com seu usuário.';
        }
        catch (error) {
            notify(error);
        }
        finally {
            state.loginBusy = false;
        }
    }
    async function loadShell() {
        state.schools = await PigeAPI.request('/schools');
        let saved = null;
        try {
            saved = localStorage.getItem('pige-school');
        }
        catch { /* Navegador pode restringir armazenamento no iframe. */ }
        state.schoolId = state.schools.some(s => s.id === saved) ? saved : state.schools[0]?.id || '';
        const hash = location.hash.replace(/^#\/?/, '');
        state.page = pageLabels[hash] && pageAllowed(hash) ? hash : 'dashboard';
        if (state.page !== hash)
            history.replaceState({}, '', '#/dashboard');
        if (state.schoolId)
            await changeSchool();
        else
            state.error = 'Nenhuma escola está vinculada ao seu usuário. Solicite acesso ao administrador.';
    }
    async function changeSchool() {
        resetFilters();
        state.studentProtocols = [];
        state.studentProtocolTotal = 0;
        clearPhotos();
        try {
            localStorage.setItem('pige-school', state.schoolId);
        }
        catch { /* Contexto incorporado sem localStorage. */ }
        state.selectedStudent = null;
        state.contractEnrollmentId = '';
        state.contractReviewIssuedId = '';
        state.studentDocs = { items: [], checklist: [], issued: [] };
        state.rows = [];
        state.catalogs = {};
        state.reportRows = [];
        state.reportClass = '';
        state.q = '';
        state.pageNumber = 1;
        legacyBackupFile = null;
        legacyMediaFile = null;
        state.emailStatus = 'idle';
        state.legacyImport = { busy: false, backupName: '', mediaName: '', confirmation: '', error: '', preview: null, result: null, runs: [] };
        await safe(async () => { if (!isProfileRole() && state.page !== 'academic')
            await Promise.all([loadCatalogs(), loadPage()]);
        else
            await loadPage(); });
        void PigeSupport.load(state.schoolId);
    }
    async function loadCatalogs() {
        const sid = state.schoolId;
        const entries = await Promise.all(Object.keys(catalogLabels).map(async (key) => [key, await PigeAPI.request(`/schools/${sid}/${key}`)]));
        if (state.schoolId === sid)
            state.catalogs = Object.fromEntries(entries);
    }
    async function loadSupportHub() {
        const companyId = text(state.schools.find(s => s.id === state.schoolId)?.company_id);
        state.supportHub = companyId
            ? await PigeAPI.request('/companies/' + companyId + '/support-hub')
            : { id: '', company_id: '', enabled: false, base_url: '', position: 'left', widget_type: 'expanded_bubble', launcher_title: 'Suporte', token_configured: false, version: 1 };
    }
    async function navigate(page) {
        if (state.busy || state.modal.kind || document.querySelector('.modal-backdrop'))
            return;
        if (!pageAllowed(page)) {
            state.error = page === 'legacy-import' ? 'A portabilidade está disponível somente para o administrador da instalação.' : page === 'contracts' ? 'Seu perfil não possui acesso aos documentos da escola.' : integrationPages.includes(page) ? 'Seu perfil não possui acesso a esta integração.' : 'Seu perfil não possui acesso a esta página.';
            if (location.hash !== `#/${state.page}`)
                history.replaceState({}, '', `#/${state.page}`);
            return;
        }
        if (page !== 'contracts' && contractDirty() && !window.confirm('Descartar as alterações não salvas no modelo?'))
            return;
        resetFilters();
        state.registryFilter = { type_code: '', entity_kind: '', active: '' };
        if (registryPages.includes(page))
            state.cadastresOpen = true;
        state.page = page;
        state.pageNumber = 1;
        state.q = '';
        state.selectedStudent = null;
        state.error = '';
        state.menuOpen = false;
        if (page !== 'contracts') {
            state.contractEnrollmentId = '';
            state.contractReviewIssuedId = '';
        }
        history.replaceState({}, '', `#/${page}`);
        await safe(loadPage);
    }
    async function loadPage() {
        if (!state.schoolId)
            return;
        const current = ++sequence, sid = state.schoolId;
        state.loading = true;
        state.rows = [];
        try {
            const query = `page=${state.pageNumber}&page_size=30&q=${encodeURIComponent(state.q)}&${filterQuery()}`;
            if (state.page === 'legacy-import') {
                if (state.user?.role !== 'admin') {
                    state.page = 'dashboard';
                    return;
                }
                state.legacyImport.runs = await PigeAPI.request(base() + '/legacy-import/runs');
                state.total = state.legacyImport.runs.length;
            }
            else if (state.page === 'email') {
                state.total = 0;
                state.emailStatus = 'idle';
                try {
                    const summary = await PigeAPI.request('/diagnostics/summary');
                    if (current === sequence)
                        state.emailStatus = summary.configuration?.smtp_configured ? 'configured' : 'missing';
                }
                catch {
                    if (current === sequence)
                        state.emailStatus = 'unavailable';
                }
            }
            else if (['online', 'banking', 'integrations', 'connect', 'diagnostics', 'diary', 'contracts', 'help'].includes(state.page)) {
                state.total = 0;
            }
            else if (state.page === 'dashboard') {
                if (isProfileRole()) {
                    const data = await PigeAPI.request('/profile/context');
                    if (current === sequence)
                        state.profileContext = data;
                }
                else {
                    const data = await PigeAPI.request(base() + '/dashboard');
                    if (current === sequence)
                        state.dashboard = data;
                }
            }
            else if (state.page === 'academic') {
                await loadCatalogs();
                if (current === sequence) {
                    state.rows = state.catalogs[state.catalog] || [];
                    state.total = state.rows.length;
                }
            }
            else if (state.page === 'documents') {
                const data = await PigeAPI.request(base() + '/document-pendencies?' + query);
                if (current === sequence) {
                    state.rows = data.items;
                    state.total = data.total;
                    state.pendencySummary = data;
                }
            }
            else if (state.page === 'settings') {
                if (can('schools.manage')) {
                    state.companies = await PigeAPI.request('/companies');
                    await loadSupportHub();
                }
            }
            else if (state.page === 'users') {
                const data = await PigeAPI.request('/users');
                if (current === sequence) {
                    state.rows = data;
                    state.total = data.length;
                }
            }
            else if (state.page !== 'reports') {
                const resource = ['guardians', 'people', ...Object.keys(businessTypes)].includes(state.page) ? 'persons' : state.page;
                const rf = state.registryFilter, business = businessTypes[state.page];
                const suffix = (state.page === 'guardians' ? '&guardians_only=true' : '')
                    + ((business?.code || rf.type_code) ? '&type_code=' + encodeURIComponent(business?.code || rf.type_code) : '')
                    + (rf.entity_kind ? '&entity_kind=' + rf.entity_kind : '') + (rf.active !== '' ? '&active=' + rf.active : '');
                const data = await PigeAPI.request(base() + '/' + resource + '?' + query + suffix);
                if (current === sequence && sid === state.schoolId) {
                    state.rows = data.items;
                    state.total = data.total;
                    const photoRows = ['students', 'teachers', 'employees'].includes(state.page) ? data.items.map(x => x.person) : data.items;
                    void hydratePhotos(photoRows);
                }
            }
        }
        finally {
            if (current === sequence)
                state.loading = false;
        }
    }
    async function setCatalog(kind) { state.catalog = kind; await safe(loadPage); }
    async function search() { state.pageNumber = 1; await safe(loadPage); }
    function legacyImportFileChange(event, kind) {
        const input = event.target;
        const file = input.files?.[0] || null;
        if (kind === 'backup') {
            legacyBackupFile = file;
            state.legacyImport.backupName = file?.name || '';
        }
        else {
            legacyMediaFile = file;
            state.legacyImport.mediaName = file?.name || '';
        }
        state.legacyImport.preview = null;
        state.legacyImport.result = null;
        state.legacyImport.confirmation = '';
        state.legacyImport.error = '';
    }
    function legacyImportForm() {
        const form = new FormData();
        if (legacyBackupFile)
            form.append('backup', legacyBackupFile);
        if (legacyMediaFile)
            form.append('container_media', legacyMediaFile);
        return form;
    }
    async function previewLegacyImport() {
        state.legacyImport.error = '';
        state.legacyImport.result = null;
        if (!legacyBackupFile) {
            state.legacyImport.error = 'Selecione o backup ZIP ou o banco SQLite antes de gerar a prévia.';
            return;
        }
        state.legacyImport.busy = true;
        try {
            state.legacyImport.preview = await PigeAPI.request(base() + '/legacy-import/preview', { method: 'POST', body: legacyImportForm() });
            state.legacyImport.confirmation = '';
        }
        catch (error) {
            state.legacyImport.error = error instanceof Error ? error.message : String(error);
        }
        finally {
            state.legacyImport.busy = false;
        }
    }
    async function applyLegacyImport() {
        const preview = state.legacyImport.preview;
        if (!preview || !legacyBackupFile) {
            state.legacyImport.error = 'Gere uma prévia atualizada antes de importar.';
            return;
        }
        if (state.legacyImport.confirmation.trim().toUpperCase() !== 'IMPORTAR') {
            state.legacyImport.error = 'Digite IMPORTAR para confirmar a gravação.';
            return;
        }
        state.legacyImport.busy = true;
        state.legacyImport.error = '';
        try {
            const form = legacyImportForm();
            form.append('fingerprint', preview.fingerprint);
            form.append('confirmation', state.legacyImport.confirmation);
            state.legacyImport.result = await PigeAPI.request(base() + '/legacy-import/apply', { method: 'POST', body: form });
            legacyBackupFile = null;
            legacyMediaFile = null;
            state.legacyImport.backupName = '';
            state.legacyImport.mediaName = '';
            state.legacyImport.confirmation = '';
            state.legacyImport.preview = null;
            await loadLegacyImportRuns();
        }
        catch (error) {
            state.legacyImport.error = error instanceof Error ? error.message : String(error);
        }
        finally {
            state.legacyImport.busy = false;
        }
    }
    async function loadLegacyImportRuns() { state.legacyImport.runs = await PigeAPI.request(base() + '/legacy-import/runs'); }
    function populatedImportTables() { return (state.legacyImport.preview?.tables || []).filter(table => table.rows > 0); }
    async function downloadLegacyArchive(run) { await safe(() => PigeAPI.download(base() + '/legacy-import/runs/' + run.id + '/archive', 'pige360-portabilidade-' + run.id.slice(0, 8) + '.jsonl')); }
    async function page(delta) { state.pageNumber += delta; await safe(loadPage); }
    async function viewStudent(id) {
        const sid = state.schoolId;
        state.loading = true;
        state.error = '';
        try {
            const [student, docs, events, protocols] = await Promise.all([PigeAPI.request(base() + '/students/' + id), PigeAPI.request(base() + '/students/' + id + '/documents'), PigeAPI.request(base() + '/students/' + id + '/history'), PigeAPI.request(base() + '/protocols?student_id=' + id + '&page_size=100')]);
            if (sid !== state.schoolId)
                return;
            state.selectedStudent = student;
            state.studentDocs = docs;
            state.history = events;
            state.studentProtocols = protocols.items;
            state.studentProtocolTotal = protocols.total;
            void hydratePhotos([student.person, ...(student.guardians || []).map(g => g.person)]);
            state.page = 'students';
            state.studentTab = 'cadastro';
        }
        catch (error) {
            notify(error);
        }
        finally {
            state.loading = false;
        }
    }
    function openModal(kind, title, fields, values = {}, target = null) {
        resetPeopleSearch();
        const form = {};
        for (const f of fields)
            form[f.key] = values[f.key] ?? (f.key === 'entity_kind' ? 'individual' : f.type === 'checkbox' ? (f.key === 'active') : f.type === 'number' ? 30 : f.type === 'multiselect' ? [] : '');
        state.modal = { kind, title, fields, form, target, action: '', error: '' };
        selectedFile = null;
        identityFiles = {};
        state.error = '';
        state.discardChanges = false;
        state.reuseTarget = '';
        state.personTypeQuery = '';
        state.assistSource = '';
        if (PigeDossier.eligible(kind)) {
            const primary = kind.split('-')[0], additions = [];
            const profileGroups = [['student', studentFields()], ['teacher', teacherFields()], ['employee', employeeFields()]];
            for (const config of Object.values(businessTypes)) {
                profileGroups.push([config.code, [
                        field('contact_name', 'Pessoa de contato'),
                        field('category', config.category),
                        field('reference', 'Referência interna'),
                        field('notes', 'Observações deste vínculo', 'textarea', false, undefined, true)
                    ]]);
            }
            for (const [profile, items] of profileGroups) {
                if (primary === profile)
                    continue;
                for (const item of items) {
                    const key = profile + '__' + item.key;
                    additions.push({ ...item, key, label: personTypeLabel(profile) + ' · ' + item.label });
                    form[key] = item.key === 'employment_type' ? 'other' : item.key === 'employment_status' ? 'active' : item.type === 'number' ? 0 : '';
                }
            }
            state.modal.fields = [...fields, ...additions];
        }
        const currentModal = state.modal;
        const loading = PigeDossier.start(base(), kind, form, target);
        state.modalInitial = JSON.stringify(form);
        state.modalSection = modalSections()[0]?.id || 'general';
        void loading.then(() => { if (state.modal === currentModal)
            state.modalInitial = JSON.stringify(state.modal.form); });
    }
    function modalDirty() { return PigeDossier.dirty() || JSON.stringify(state.modal.form) !== state.modalInitial || Boolean(selectedFile) || Boolean(identityFiles.logo) || Boolean(identityFiles.font); }
    function closeModal(discard = false) {
        if (state.busy || PigeMFA.state.busy)
            return;
        if (state.modal.kind === 'mfa-manage' && PigeMFA.state.codes.length) {
            PigeMFA.state.error = 'Guarde os códigos e confirme para continuar.';
            return;
        }
        if (discard !== true && state.modal.fields.length && modalDirty()) {
            state.discardChanges = true;
            return;
        }
        clearProfilePreview();
        state.modal = blankModal();
        state.discardChanges = false;
    }
    function valuesFrom(row, fields) { const map = {}; for (const f of fields)
        map[f.key] = row[f.key] ?? (f.type === 'multiselect' ? [] : ''); return map; }
    function personTypesFrom(row) { const value = row?.person_types; return Array.isArray(value) ? value.map(text) : []; }
    function isBusiness() { return Boolean(businessTypes[state.page]); }
    function isPersonModal() { return ['person', 'guardian', 'student', 'student-edit', 'teacher', 'teacher-edit', 'employee', 'employee-edit', 'business'].includes(state.modal.kind); }
    const personalKeys = new Set(['social_name', 'cpf', 'birth_date', 'rg', 'rg_issuer', 'rg_state', 'rg_issued_on', 'birth_certificate', 'birth_city', 'birth_state', 'nationality', 'sex', 'gender', 'race_color', 'marital_status', 'mother_name', 'father_name', 'occupation', 'employer', 'education', 'emergency_contact_name', 'emergency_contact_phone']);
    function modalFieldRelevant(f) {
        const kind = state.modal.kind, legal = state.modal.form.entity_kind === 'organization';
        if (!isPersonModal())
            return true;
        if (f.key === 'person_types')
            return false;
        if (f.key.includes('__'))
            return selectedPersonTypes().includes(f.key.split('__')[0]);
        if (f.key === 'entity_kind' && kind !== 'person' && kind !== 'business')
            return false;
        if (['cnpj', 'trade_name', 'state_registration', 'municipal_registration', 'registration_status', 'opened_on', 'legal_nature', 'main_activity'].includes(f.key))
            return legal;
        return !(legal && personalKeys.has(f.key));
    }
    const complementaryKeys = new Set(['social_name', 'birth_certificate', 'birth_city', 'birth_state', 'nationality', 'sex', 'gender', 'race_color', 'marital_status', 'rg', 'rg_issuer', 'rg_state', 'rg_issued_on', 'mother_name', 'father_name', 'notes', 'state_registration', 'municipal_registration']);
    function advancedPersonField(f) { return isPersonModal() && complementaryKeys.has(f.key); }
    function modalFieldLabel(f) { if (f.key === 'photo' && state.modal.form.entity_kind === 'organization')
        return 'Imagem / logotipo (PNG ou JPEG)'; return f.key === 'name' && state.modal.form.entity_kind === 'organization' ? 'Razão social' : f.label; }
    function fieldSection(f) {
        if (!isPersonModal() && !state.modal.kind.endsWith('-existing'))
            return 'details';
        const k = f.key;
        if (k.includes('__') || k.startsWith('business_') || studentFieldKeys.includes(k) || teacherProfileKeys.includes(k) || employeeProfileKeys.includes(k) || ['occupation', 'employer', 'education'].includes(k))
            return 'specific';
        if (['postal_code', 'street', 'address_number', 'address_complement', 'district', 'city', 'state', 'country', 'address', 'phone', 'phone_secondary', 'email', 'emergency_contact_name', 'emergency_contact_phone'].includes(k))
            return 'contact';
        return 'general';
    }
    const sectionLabels = {
        general: { title: 'Dados gerais', hint: 'Identificação e documentos da pessoa. Os tipos são selecionados no topo.' },
        contact: { title: 'Contatos e endereço', hint: 'Informações compartilhadas entre os cadastros desta pessoa.' },
        specific: { title: 'Dados específicos', hint: 'Informações dos tipos selecionados. Matrículas e turmas continuam em seus próprios cadastros.' },
        links: { title: 'Vínculos', hint: 'Alunos, familiares e responsabilidades.' },
        details: { title: 'Dados do lançamento', hint: 'Revise as informações antes de confirmar.' }
    };
    function modalSections() {
        return Object.entries(sectionLabels).map(([id, value]) => ({ id, ...value, fields: state.modal.fields.filter(f => modalFieldRelevant(f) && fieldSection(f) === id) })).filter(s => s.fields.length > 0 || (s.id === 'links' && familyRelevant()));
    }
    function modalTab(id) { state.modalSection = id; void Vue.nextTick(() => document.querySelector('.modal-form .modal-body')?.scrollTo({ top: 0 })); }
    function visibleSection(id) { const all = modalSections(); return (all.some(s => s.id === state.modalSection) ? state.modalSection : all[0]?.id) === id; }
    async function validateModal() {
        const form = document.querySelector('.modal-form');
        if (!form)
            return true;
        const invalid = Array.from(form.querySelectorAll('input,select,textarea')).find(el => !el.disabled && !el.checkValidity());
        if (!invalid)
            return true;
        const group = invalid.closest('[data-form-section]');
        if (group)
            state.modalSection = group.dataset.formSection || '';
        state.modal.error = 'Revise o campo: ' + (invalid.closest('label')?.querySelector('span')?.textContent?.trim() || 'informação obrigatória') + '.';
        const details = invalid.closest('details');
        if (details)
            details.open = true;
        await Vue.nextTick();
        invalid.focus();
        invalid.reportValidity();
        return false;
    }
    function businessFields() {
        const common = personFields().filter(f => !['person_types', 'birth_date', 'birth_certificate', 'birth_city', 'birth_state', 'nationality', 'sex', 'gender', 'race_color', 'marital_status', 'mother_name', 'father_name', 'occupation', 'employer', 'education', 'emergency_contact_name', 'emergency_contact_phone', 'rg', 'rg_issuer', 'rg_state', 'rg_issued_on'].includes(f.key));
        const config = businessTypes[state.page];
        return [...common, field('business_contact_name', 'Pessoa de contato'), field('business_category', config?.category || 'Categoria'), field('business_reference', 'Referência interna'), field('business_notes', 'Observações deste vínculo', 'textarea', false, undefined, true)];
    }
    function newBusiness(existing = null) {
        const config = businessTypes[state.page];
        if (!config)
            return;
        const profile = existing?.business_profiles?.[config.code] || {};
        const fields = existing && state.reuseTarget ? businessFields().filter(f => f.key.startsWith('business_')) : businessFields();
        const values = existing ? valuesFrom(existing, fields) : { active: true, entity_kind: 'individual' };
        for (const key of ['contact_name', 'category', 'reference', 'notes'])
            values['business_' + key] = profile[key] || '';
        openModal('business', (existing ? 'Editar ' : 'Cadastrar ') + config.singular, fields, values, existing);
        state.modal.action = config.code;
    }
    async function reusePerson() {
        await safe(async () => {
            const target = state.page;
            await searchPersons();
            openModal('reuse', 'Vincular pessoa existente', [field('person_id', 'Pessoa cadastrada', 'person', true)]);
            state.reuseTarget = target;
        });
    }
    async function useExisting() {
        const row = state.personChoices.find(p => p.id === state.modal.form.person_id);
        if (!row)
            throw new Error('Selecione a pessoa cadastrada.');
        const context = state.reuseTarget;
        if (context === 'students')
            newStudent(row);
        else if (context === 'teachers')
            newTeacher(row);
        else if (context === 'employees')
            newEmployee(row);
        else if (context === 'guardians') {
            await PigeAPI.post(base() + '/persons/' + row.id + '/responsible', { version: row.version, data: {} });
            state.modal = blankModal();
            await loadPage();
            state.success = 'Pessoa vinculada como responsável, sem duplicar seu cadastro.';
        }
        else if (businessTypes[context]) {
            const config = businessTypes[context];
            openModal('business-existing', 'Adicionar vínculo de ' + config.singular, businessFields().filter(f => f.key.startsWith('business_')), {}, row);
            state.modal.action = config.code;
        }
    }
    function personDocument(row) { return text(row.cnpj) || cpf(row.cpf); }
    function newPerson() { openModal('person', 'Cadastrar pessoa', personFields(), { active: true, person_types: [] }); }
    function newStudent(existing = null) {
        if (existing) {
            openModal('student-existing', 'Adicionar aluno à pessoa', studentFields(), {}, existing);
            return;
        }
        const fields = [...personFields(), ...studentFields()];
        const birth = fields.find(f => f.key === 'birth_date');
        if (birth)
            birth.required = true;
        openModal('student', 'Cadastrar aluno', fields, { active: true, person_types: ['student'] });
    }
    function editStudent() {
        const student = state.selectedStudent;
        if (!student)
            return;
        const types = personTypesFrom(student.person), personFieldsList = personFields(types), fields = [...personFieldsList, ...studentFields()];
        openModal('student-edit', 'Editar cadastro completo do aluno', fields, { ...valuesFrom(student.person, personFieldsList), ...valuesFrom(student, studentFields()), is_guardian: student.person.is_guardian, person_types: types }, student);
    }
    function newGuardian() { openModal('guardian', 'Cadastrar responsável', personFields(), { active: true, person_types: ['guardian'] }); }
    function newTeacher(existing = null) {
        if (existing) {
            openModal('teacher-existing', 'Adicionar professor à pessoa', teacherFields(), { employment_type: 'other', employment_status: 'active', workload_hours: 0 }, existing);
            return;
        }
        openModal('teacher', 'Cadastrar professor', [...personFields(['teacher']), ...teacherFields()], { active: true, person_types: ['teacher'], employment_type: 'other', employment_status: 'active', workload_hours: 0 });
    }
    function editTeacher(row) {
        const person = row.person, personList = personFields(personTypesFrom(person)), profileFields = teacherFields();
        openModal('teacher-edit', 'Editar cadastro do professor', profileFields.concat(personList), { ...valuesFrom(person, personList), ...valuesFrom(row, profileFields), person_types: personTypesFrom(person), is_guardian: person.is_guardian }, row);
    }
    function newEmployee(existing = null) {
        if (existing) {
            openModal('employee-existing', 'Adicionar funcionário à pessoa', employeeFields(), { employment_type: 'other', employment_status: 'active' }, existing);
            return;
        }
        openModal('employee', 'Cadastrar funcionário', [...personFields(['employee']), ...employeeFields()], { active: true, person_types: ['employee'], employment_type: 'other', employment_status: 'active' });
    }
    function editEmployee(row) {
        const person = row.person, personList = personFields(personTypesFrom(person)), profileFields = employeeFields();
        openModal('employee-edit', 'Editar cadastro do funcionário', profileFields.concat(personList), { ...valuesFrom(person, personList), ...valuesFrom(row, profileFields), person_types: personTypesFrom(person), is_guardian: person.is_guardian }, row);
    }
    function editPerson(row) { const types = personTypesFrom(row); openModal(state.page === 'guardians' ? 'guardian' : 'person', state.page === 'guardians' ? 'Editar responsável' : 'Editar cadastro da pessoa', personFields(types), valuesFrom(row, personFields(types)), row); }
    function newCatalog(row = null) { const fields = catalogFields(state.catalog); const defaults = { active: true, capacity: 30, status: 'active', level: 'Educação básica' }; openModal('catalog', (row ? 'Editar ' : 'Cadastrar ') + catalogLabels[state.catalog], fields, row ? valuesFrom(row, fields) : defaults, row); state.modal.action = state.catalog; }
    function resetPeopleSearch() {
        studentSearchSequence++;
        personSearchSequence++;
        if (studentSearchTimer)
            window.clearTimeout(studentSearchTimer);
        if (personSearchTimer)
            window.clearTimeout(personSearchTimer);
        studentSearchTimer = 0;
        personSearchTimer = 0;
        state.studentChoices = [];
        state.personChoices = [];
        state.studentSearchQuery = '';
        state.personSearchQuery = '';
        state.studentSearchBusy = false;
        state.personSearchBusy = false;
        state.studentSearchMessage = 'Digite ao menos 2 caracteres para pesquisar.';
        state.personSearchMessage = 'Digite ao menos 2 caracteres para pesquisar.';
    }
    function searchStudents(value = '') {
        const query = text(value).trim(), request = ++studentSearchSequence;
        state.studentSearchQuery = query;
        if (studentSearchTimer)
            window.clearTimeout(studentSearchTimer);
        state.studentChoices = [];
        if (query.length < 2) {
            state.studentSearchBusy = false;
            state.studentSearchMessage = 'Digite ao menos 2 caracteres para pesquisar.';
            return;
        }
        state.studentSearchBusy = true;
        state.studentSearchMessage = 'Buscando alunos…';
        studentSearchTimer = window.setTimeout(() => {
            void (async () => {
                try {
                    const data = await PigeAPI.request(base() + '/students?page_size=20&q=' + encodeURIComponent(query));
                    if (request !== studentSearchSequence)
                        return;
                    state.studentChoices = data.items;
                    state.studentSearchMessage = data.total === 0 ? 'Nenhum aluno encontrado.' : data.total > 20 ? 'Mais de 20 resultados; refine a busca.' : `${data.total} aluno(s) encontrado(s).`;
                }
                catch {
                    if (request === studentSearchSequence) {
                        state.studentChoices = [];
                        state.studentSearchMessage = 'Não foi possível pesquisar alunos. Tente novamente.';
                    }
                }
                finally {
                    if (request === studentSearchSequence) {
                        state.studentSearchBusy = false;
                        studentSearchTimer = 0;
                    }
                }
            })();
        }, 250);
    }
    function searchPersons(value = '') {
        const query = text(value).trim(), request = ++personSearchSequence;
        state.personSearchQuery = query;
        if (personSearchTimer)
            window.clearTimeout(personSearchTimer);
        state.personChoices = [];
        if (query.length < 2) {
            state.personSearchBusy = false;
            state.personSearchMessage = 'Digite ao menos 2 caracteres para pesquisar.';
            return;
        }
        state.personSearchBusy = true;
        state.personSearchMessage = 'Buscando pessoas…';
        personSearchTimer = window.setTimeout(() => {
            void (async () => {
                try {
                    const data = await PigeAPI.request(base() + '/persons?page_size=20&q=' + encodeURIComponent(query));
                    if (request !== personSearchSequence)
                        return;
                    state.personChoices = data.items;
                    state.personSearchMessage = data.total === 0 ? 'Nenhuma pessoa encontrada. Confira o nome ou CPF antes de criar uma nova identidade.' : data.total > 20 ? 'Mais de 20 resultados; refine a busca.' : `${data.total} pessoa(s) encontrada(s).`;
                }
                catch {
                    if (request === personSearchSequence) {
                        state.personChoices = [];
                        state.personSearchMessage = 'Não foi possível pesquisar pessoas. Tente novamente.';
                    }
                }
                finally {
                    if (request === personSearchSequence) {
                        state.personSearchBusy = false;
                        personSearchTimer = 0;
                    }
                }
            })();
        }, 250);
    }
    async function newEnrollment() {
        await safe(async () => {
            await searchStudents();
            await searchPersons();
            const selected = state.selectedStudent;
            if (selected && !state.studentChoices.some(s => s.id === selected.id))
                state.studentChoices.unshift(selected);
            const fields = [
                field('student_id', 'Aluno', 'student', true), field('class_group_id', 'Turma de destino', 'select', true, options('class-groups')),
                field('enrolled_on', 'Data da matrícula', 'date', true),
                field('enrollment_type', 'Tipo de entrada', 'select', true, [{ value: 'new', label: 'Nova matrícula' }, { value: 'renewal', label: 'Rematrícula' }, { value: 'transfer_in', label: 'Transferência recebida' }, { value: 'returning', label: 'Retorno' }]),
                field('financial_person_id', 'Responsável financeiro', 'person'), field('origin_school', 'Escola de origem'), field('origin_city', 'Cidade de origem'),
                field('entry_reason', 'Motivo / observação de entrada', 'textarea', false, undefined, true), field('external_reference', 'Referência externa'), field('notes', 'Observações', 'textarea', false, undefined, true)
            ];
            openModal('enrollment', 'Nova matrícula', fields, { student_id: selected?.id || '', enrolled_on: new Date().toISOString().slice(0, 10), enrollment_type: 'new' });
        });
    }
    async function viewEnrollment(id) { await safe(async () => { const data = await PigeAPI.request(base() + '/enrollments/' + id); openModal('enrollment-detail', 'Matrícula ' + text(data.number), [], {}, data); }); }
    async function contractsForEnrollment(id, issuedId = '') { state.modal = blankModal(); state.contractEnrollmentId = id; state.contractReviewIssuedId = issuedId; await navigate('contracts'); }
    function editDraft() {
        const target = state.modal.target;
        if (!target || target.status !== 'draft')
            return;
        const groups = options('class-groups').filter(o => state.catalogs['class-groups'].find(c => c.id === o.value)?.academic_year_id === target.academic_year_id);
        const fields = [field('class_group_id', 'Turma de destino', 'select', true, groups), field('enrolled_on', 'Data da matrícula', 'date', true), field('notes', 'Observações', 'textarea', false, undefined, true), field('reason', 'Motivo da alteração', 'textarea', true, undefined, true)];
        openModal('draft-edit', 'Editar pré-matrícula', fields, valuesFrom(target, fields), target);
    }
    async function viewProtocol(id) {
        await safe(async () => {
            const data = await PigeAPI.request(base() + '/protocols/' + id);
            openModal('protocol-detail', 'Protocolo ' + text(data.number), [], {}, data);
        });
    }
    function protocolNote() {
        const target = state.modal.target;
        if (!target)
            return;
        openModal('protocol-note', 'Registrar atendimento', [field('message', 'Registro do atendimento', 'textarea', true, undefined, true)], {}, target);
    }
    async function protocolReceipt(id) { await safe(() => PigeAPI.download(base() + '/protocols/' + id + '/pdf', 'comprovante-protocolo.pdf')); }
    async function exportPendencies(format) { await safe(() => PigeAPI.download(base() + '/reports/document-pendencies.' + format + '?q=' + encodeURIComponent(state.q) + '&' + filterQuery(), 'pendencias-documentais.' + format)); }
    function startMovement(action) {
        const target = state.modal.target;
        if (!target)
            return;
        const titles = { activate: 'Ativar matrícula', change_class: 'Mudar de turma / turno', suspend: 'Suspender matrícula', reactivate: 'Reativar matrícula', transfer: 'Registrar transferência externa', cancel: 'Cancelar matrícula', complete: 'Concluir matrícula' };
        const fields = [field('reason', 'Motivo / justificativa', 'textarea', true, undefined, true)];
        if (action === 'change_class')
            fields.unshift(field('class_group_id', 'Turma de destino', 'select', true, options('class-groups')));
        openModal('movement', titles[action], fields, {}, target);
        state.modal.action = action;
    }
    function reenroll() {
        const target = state.modal.target;
        if (!target)
            return;
        openModal('reenroll', 'Rematricular em outro ano', [field('class_group_id', 'Turma do novo período', 'select', true, options('class-groups')), field('enrolled_on', 'Data da rematrícula', 'date', true), field('notes', 'Observações', 'textarea', false, undefined, true)], { enrolled_on: new Date().toISOString().slice(0, 10) }, target);
    }
    async function newLink() {
        await safe(async () => {
            await searchPersons();
            openModal('link', 'Vincular responsável', [field('person_id', 'Pessoa cadastrada', 'person', true), field('relationship', 'Parentesco / vínculo', 'text', true), field('legal', 'Responsável legal', 'checkbox'), field('financial', 'Responsável financeiro', 'checkbox'), field('pickup', 'Autorizado para retirada', 'checkbox'), field('primary_contact', 'Contato principal', 'checkbox')], { relationship: 'Responsável', legal: true });
        });
    }
    function editLink(link) {
        const fields = [field('relationship', 'Parentesco / vínculo', 'text', true), field('legal', 'Responsável legal', 'checkbox'), field('financial', 'Responsável financeiro', 'checkbox'), field('pickup', 'Autorizado para retirada', 'checkbox'), field('primary_contact', 'Contato principal', 'checkbox'), field('active', 'Vínculo ativo', 'checkbox')];
        openModal('link-edit', 'Editar vínculo familiar', fields, valuesFrom(link, fields), link);
    }
    function uploadDocument() { openModal('upload', 'Receber documento', [field('document_type_id', 'Tipo de documento', 'select', true, options('document-types')), field('expires_on', 'Validade (opcional)', 'date'), field('file', 'Arquivo PDF, PNG ou JPEG', 'file', true, undefined, true), field('notes', 'Observações', 'textarea', false, undefined, true)]); }
    function fileChange(event) { selectedFile = event.target.files?.[0] || null; }
    function reviewDocument(doc, status) { openModal('review', status === 'validated' ? 'Validar documento' : status === 'archived' ? 'Arquivar documento' : 'Rejeitar documento', [field('notes', 'Justificativa da análise', 'textarea', true, undefined, true)], {}, doc); state.modal.action = status; }
    function waiveDocument() { openModal('waiver', 'Dispensar documento obrigatório', [field('document_type_id', 'Tipo de documento', 'select', true, options('document-types')), field('reason', 'Motivo da dispensa', 'textarea', true, undefined, true)]); }
    function issueDocument(kind = 'student_record', enrollment = null) {
        const selected = state.selectedStudent;
        if (!selected && !enrollment)
            return;
        const enrollmentChoices = (selected?.enrollments || []).map(e => ({ value: e.id, label: text(e.number) + ' · ' + getName('academic-years', e.academic_year_id) }));
        const fields = [field('kind', 'Documento', 'select', true, [{ value: 'student_record', label: 'Ficha do aluno' }, { value: 'enrollment_receipt', label: 'Comprovante de matrícula' }, { value: 'enrollment_declaration', label: 'Declaração de matrícula' }, { value: 'enrollment_form', label: 'Ficha de matrícula (inclusive rascunho)' }]), field('enrollment_id', 'Matrícula (comprovantes e declarações exigem situação ativa)', 'select', false, enrollment ? [{ value: enrollment.id, label: text(enrollment.number) }] : enrollmentChoices)];
        openModal('issue', 'Emitir documento em PDF', fields, { kind, enrollment_id: enrollment?.id || '' }, enrollment);
    }
    async function newProtocol(row = null) {
        await safe(async () => {
            await searchStudents();
            const studentId = text(row?.student_id) || state.selectedStudent?.id;
            if (studentId && !state.studentChoices.some(s => s.id === studentId))
                state.studentChoices.unshift(await PigeAPI.request(base() + '/students/' + studentId));
            const fields = [field('kind', 'Tipo de solicitação', 'text', true), field('student_id', 'Aluno (opcional)', 'student'), field('description', 'Descrição / observações', 'textarea', false, undefined, true), field('due_on', 'Prazo', 'date'), field('status', 'Situação', 'select', true, ['open', 'in_progress', 'waiting', 'completed', 'cancelled'].map(v => ({ value: v, label: label(v) })))];
            openModal('protocol', row ? 'Atualizar protocolo' : 'Abrir protocolo', fields, row ? valuesFrom(row, fields) : { status: 'open', student_id: studentId || '' }, row);
        });
    }
    async function editIdentity() {
        await safe(async () => {
            await PigeInstitution.load();
            const fields = [field('display_name', 'Nome de apresentação da escola', 'text', true), field('short_name', 'Nome curto no aplicativo', 'text', true), field('primary_color', 'Cor principal', 'color', true), field('secondary_color', 'Cor dos títulos', 'color', true), field('font_family', 'Tipografia', 'select', true, [{ value: 'system', label: 'Padrão do dispositivo' }, { value: 'arial', label: 'Arial' }, { value: 'verdana', label: 'Verdana' }, { value: 'georgia', label: 'Georgia' }, { value: 'times', label: 'Times New Roman' }, { value: 'custom', label: 'Fonte própria da escola (tela e PDF)' }]), field('logo', 'Logotipo da escola (PNG, JPEG ou WebP)', 'identity-logo', false, undefined, true), field('font', 'Fonte da escola para tela e PDF (TTF ou WOFF2)', 'identity-font', false, undefined, true), field('font_license_confirmed', 'Confirmo a licença de uso web e incorporação em PDF da fonte enviada', 'checkbox'), field('remove_logo', 'Remover o logotipo atual', 'checkbox'), field('remove_font', 'Remover a fonte enviada anteriormente', 'checkbox'), field('show_preenrollment_button', 'Exibir botão de pré-matrícula na tela de login', 'checkbox', false, undefined, true)];
            const identity = PigeInstitution.state;
            openModal('identity', 'Identidade visual da escola', fields, { display_name: identity.display_name, short_name: identity.short_name, primary_color: identity.primary_color, secondary_color: identity.secondary_color, font_family: identity.font_family, show_preenrollment_button: identity.show_preenrollment_button }, { id: '1', version: identity.version });
        });
    }
    async function editEmbedding() {
        await safe(async () => {
            state.embeddingProbe = { busy: false, message: '', frame_policy: '', x_frame_options: '' };
            const row = await PigeAPI.request('/institution/embedding');
            const fields = [field('enabled', 'Permitir abertura dentro dos sites autorizados', 'checkbox'), field('allowed_origins', 'Origens autorizadas — uma por linha', 'textarea', false, undefined, true), field('current_password', 'Sua senha atual para confirmar a alteração', 'password', true)];
            openModal('embedding-security', 'Incorporação no HUB', fields, { enabled: Boolean(row.enabled), allowed_origins: row.allowed_origins.join('\n'), current_password: '' }, row);
        });
    }
    async function probeEmbedding() {
        const probe = state.embeddingProbe;
        probe.busy = true;
        probe.message = '';
        probe.frame_policy = '';
        probe.x_frame_options = '';
        try {
            let method = 'HEAD';
            let response = await fetch('/', { method, cache: 'no-store', credentials: 'omit' });
            if (response.status === 405) {
                method = 'GET';
                response = await fetch('/', { method, cache: 'no-store', credentials: 'omit' });
            }
            const policies = response.headers.get('Content-Security-Policy') || '';
            probe.frame_policy = policies.split(/[,;]/).map(s => s.trim()).filter(s => s.startsWith('frame-ancestors')).join(' | ');
            probe.x_frame_options = response.headers.get('X-Frame-Options') || '';
            const blocked = probe.frame_policy.includes("'none'") || probe.x_frame_options.toUpperCase() === 'DENY';
            probe.message = method + ' ' + response.status + ' · versão ' + (response.headers.get('X-App-Version') || 'não informada') + '. ' + (blocked ? 'A resposta pública ainda bloqueia incorporação. Salve as origens e confira se o proxy acrescenta restrições.' : 'Confira abaixo se a origem exata do HUB está autorizada em todas as políticas. O teste final é a abertura pelo navegador no HUB.');
            if (method === 'GET')
                probe.message += ' O HEAD respondeu 405: a imagem/rota pública ainda precisa ser atualizada.';
        }
        catch (error) {
            probe.message = 'Não foi possível verificar a resposta pública: ' + (error instanceof Error ? error.message : String(error));
        }
        finally {
            probe.busy = false;
        }
    }
    function identityFileChange(event, key) { if (key === 'logo' || key === 'font')
        identityFiles[key] = event.target.files?.[0]; }
    async function manageUnits() { await navigate('academic'); await setCatalog('units'); }
    function editMaintainer() {
        const row = state.companies.find(c => c.id === school()?.company_id);
        if (!row)
            return;
        const fields = companyFields();
        openModal('company-edit', 'Dados da mantenedora', fields, valuesFrom(row, fields), row);
    }
    function newCompany() { openModal('company', 'Cadastrar empresa / mantenedora', companyFields()); }
    const familyAssistFields = ['name', 'cpf', 'birth_date', 'phone', 'email', 'rg', 'rg_issuer', 'birth_certificate', 'mother_name', 'father_name', 'postal_code', 'street', 'address_number', 'address_complement', 'district', 'city', 'state', 'country', 'address'];
    const companyExtra = [['trade_name', 'Nome fantasia'], ['address', 'Endereço completo'], ['postal_code', 'CEP'], ['street', 'Logradouro'], ['address_number', 'Número'], ['address_complement', 'Complemento'], ['district', 'Bairro'], ['city', 'Cidade'], ['state', 'UF'], ['country', 'País'], ['phone', 'Telefone'], ['email', 'E-mail'], ['registration_status', 'Situação cadastral'], ['opened_on', 'Abertura'], ['legal_nature', 'Natureza jurídica'], ['main_activity', 'Atividade principal']];
    const setupCompany = Vue.reactive(Object.fromEntries([['name', ''], ['document', ''], ...companyExtra.map(([key]) => [key, ''])]));
    const setupCompanyFields = ['name', 'document', ...companyExtra.map(([key]) => key)];
    function companyFields() { return [field('name', 'Razão social', 'text', true), field('document', 'CPF / CNPJ'), ...companyExtra.map(([key, caption]) => field(key, caption, key === 'email' ? 'email' : 'text'))]; }
    const assistRequest = PigeAPI.request;
    function assistEligible() { return isPersonModal() || ['company', 'company-edit', 'school'].includes(state.modal.kind); }
    function assistFields() { return state.modal.fields.filter(modalFieldRelevant).map(f => f.key); }
    function assistCompany() { return ['company', 'company-edit'].includes(state.modal.kind); }
    async function setupLookup(path, options = {}) { return PigeAPI.request(path, { ...options, headers: { 'X-Setup-Token': state.setup.token } }); }
    async function readResponsibleDocument(id) { await safe(async () => { await searchPersons(); openModal('ocr-target', 'Escolher pessoa responsável para a leitura', [field('person_id', 'Pessoa responsável cadastrada', 'person', true)]); state.assistSource = base() + '/files/' + id + '/ocr'; }); }
    function readStudentDocument(id) { editStudent(); state.assistSource = base() + '/files/' + id + '/ocr'; }
    async function editIntake() { await safe(async () => { const cfg = await PigeAPI.request('/institution/intake'); openModal('intake-settings', 'Leitura de documentos e consultas cadastrais', [field('ocr_enabled', 'Permitir leitura local de documentos (OCR)', 'checkbox'), field('lookups_enabled', 'Permitir consulta online de CNPJ e CEP', 'checkbox')], { ocr_enabled: Boolean(cfg.ocr_enabled), lookups_enabled: Boolean(cfg.lookups_enabled) }, cfg); }); }
    function newSchool(row = null) { const fields = [field('company_id', 'Empresa / mantenedora', 'select', true, state.companies.map(c => ({ value: c.id, label: text(c.name) }))), field('name', 'Nome da escola', 'text', true), field('address', 'Endereço', 'text', false, undefined, true), field('phone', 'Telefone'), field('email', 'E-mail', 'email'), field('document_policy', 'Pendências na ativação da matrícula', 'select', true, [{ value: 'warn', label: 'Avisar sem bloquear' }, { value: 'block', label: 'Exigir validação dos documentos obrigatórios' }]), field('active', 'Escola ativa', 'checkbox')]; openModal('school', row ? 'Editar escola' : 'Cadastrar escola', fields, row ? valuesFrom(row, fields) : { document_policy: 'warn', active: true }, row); }
    function editSupportHub() {
        const companyId = text(state.schools.find(s => s.id === state.schoolId)?.company_id);
        if (!companyId)
            return;
        const fields = [
            field('enabled', 'Exibir chat de suporte no site', 'checkbox'),
            field('base_url', 'URL base do Hub', 'url', false, undefined, true),
            field('token', 'Website token do Hub', 'password', false, undefined, true),
            field('position', 'Posição do botão', 'select', true, [{ value: 'left', label: 'Esquerda' }, { value: 'right', label: 'Direita' }]),
            field('widget_type', 'Tipo do botão', 'select', true, [{ value: 'expanded_bubble', label: 'Bolha expandida' }, { value: 'standard', label: 'Bolha padrão' }]),
            field('launcher_title', 'Texto do botão', 'text', true),
        ];
        openModal('support-hub', 'Chat de suporte via site', fields, { ...state.supportHub, token: '' }, state.supportHub);
    }
    async function newUser(row = null) {
        await searchPersons();
        const fields = [field('name', 'Nome completo', 'text', true)];
        if (!row)
            fields.push(field('email', 'E-mail de acesso', 'email', true), field('password', 'Senha inicial (mínimo 12 caracteres)', 'password', true));
        fields.push(field('role', 'Perfil', 'select', true, ['admin', 'direction', 'coordination', 'secretary', 'teacher', 'student', 'guardian', 'viewer'].map(v => ({ value: v, label: label(v) }))), field('person_id', 'Pessoa vinculada (Professor, Aluno ou Responsável)', 'person', false), field('school_ids', 'Escolas autorizadas', 'multiselect', false, state.schools.map(s => ({ value: s.id, label: s.name })), true));
        if (row)
            fields.push(field('active', 'Usuário ativo', 'checkbox'));
        openModal('user', row ? 'Editar acesso' : 'Criar usuário', fields, row ? valuesFrom(row, fields) : { role: 'secretary', person_id: '', school_ids: [state.schoolId] }, row);
    }
    async function loadMyPhoto() {
        const id = state.user?.id;
        if (state.userPhotoUrl)
            URL.revokeObjectURL(state.userPhotoUrl);
        state.userPhotoUrl = '';
        if (!id || !state.user?.has_photo)
            return;
        try {
            const url = await PigeAPI.objectUrl('/auth/profile/photo');
            if (state.user?.id === id)
                state.userPhotoUrl = url;
            else
                URL.revokeObjectURL(url);
        }
        catch { /* Foto não bloqueia a sessão. */ }
    }
    function clearProfilePreview() { if (state.profilePhotoPreview)
        URL.revokeObjectURL(state.profilePhotoPreview); state.profilePhotoPreview = ''; }
    function myPhotoChange(event) {
        clearProfilePreview();
        selectedFile = event.target.files?.[0] || null;
        if (selectedFile && selectedFile.size > 2 * 1024 * 1024) {
            state.modal.error = 'A foto deve ter no máximo 2 MB.';
            selectedFile = null;
            return;
        }
        if (selectedFile) {
            state.profilePhotoPreview = URL.createObjectURL(selectedFile);
            state.modal.form.remove_photo = false;
        }
    }
    async function editMyProfile() {
        await safe(async () => {
            const row = await PigeAPI.request('/auth/profile');
            const fields = [field('name', 'Nome de exibição', 'text', true), field('email', 'E-mail de acesso', 'email', true), field('phone', 'Telefone / WhatsApp', 'tel'), field('job_title', 'Cargo / função'), field('department', 'Setor / departamento'), field('photo', 'Foto do usuário (PNG, JPEG ou WebP, até 2 MB)', 'user-photo', false, undefined, true), field('remove_photo', 'Remover minha foto', 'checkbox'), field('bio', 'Sobre mim', 'textarea', false, undefined, true), field('current_password', 'Senha atual (somente para trocar o e-mail)', 'password')];
            clearProfilePreview();
            openModal('my-profile', 'Meu perfil', fields, { ...valuesFrom(row, fields), remove_photo: false }, row);
        });
    }
    function profilePassword() { if (modalDirty()) {
        state.modal.error = 'Salve ou cancele as alterações antes de trocar a senha.';
        return;
    } password(); }
    function password() { openModal('password', 'Alterar minha senha', [field('current_password', 'Senha atual', 'password', true), field('new_password', 'Nova senha (mínimo 12 caracteres)', 'password', true)]); }
    function archiveStudent() { if (state.selectedStudent)
        openModal('archive', 'Arquivar cadastro do aluno', [field('reason', 'Justificativa', 'textarea', true, undefined, true)], {}, state.selectedStudent); }
    async function downloadFile(id, name = 'documento.pdf') { await safe(() => PigeAPI.download(base() + '/files/' + id + '/download', name)); }
    async function saveModal() {
        if (state.busy || PigeDossier.state.loading || !await validateModal())
            return;
        state.busy = true;
        state.modal.error = '';
        const modal = state.modal, form = { ...modal.form }, target = modal.target, studentId = state.selectedStudent?.id;
        let createdStudent = null;
        let savedPersonId = '';
        try {
            const photo = selectedFile;
            delete form.photo;
            if (modal.kind === 'ocr-target') {
                const source = state.assistSource;
                const data = await PigeAPI.request(base() + '/persons/' + form.person_id + '/dossier');
                editPerson(data.person);
                state.assistSource = source;
                return;
            }
            if (modal.kind === 'reuse') {
                await useExisting();
                return;
            }
            if (PigeDossier.eligible(modal.kind)) {
                const saved = await PigeDossier.save(modal.kind, form, photo);
                savedPersonId = saved.person.id;
                if (modal.kind === 'student' && saved.profiles.student)
                    createdStudent = { ...saved.profiles.student, person: saved.person };
            }
            else if (modal.kind === 'business' || modal.kind === 'business-existing') {
                const details = {};
                for (const key of ['contact_name', 'category', 'reference', 'notes']) {
                    details[key] = form['business_' + key] || '';
                    delete form['business_' + key];
                }
                const endpoint = base() + '/business-persons/' + modal.action;
                if (modal.kind === 'business-existing') {
                    await PigeAPI.post(endpoint, { person_id: target.id, version: target.version, details });
                    savedPersonId = target.id;
                }
                else if (target) {
                    await PigeAPI.patch(endpoint + '/' + target.id, { version: target.version, person: form, details });
                    savedPersonId = target.id;
                }
                else {
                    const created = await PigeAPI.post(endpoint, { person: form, details });
                    savedPersonId = created.id;
                }
            }
            else if (modal.kind === 'student-existing') {
                const studentData = {};
                for (const key of studentFieldKeys) {
                    studentData[key] = form[key] ?? '';
                }
                createdStudent = await PigeAPI.post(base() + '/students', { person_id: target.id, ...studentData });
                savedPersonId = target.id;
            }
            else if (modal.kind === 'student') {
                const studentData = {};
                for (const key of studentFieldKeys) {
                    studentData[key] = form[key] ?? '';
                    delete form[key];
                }
                const types = Array.isArray(form.person_types) ? form.person_types.map(text) : [];
                const person = { ...form, person_types: Array.from(new Set([...types, 'student'])), cpf: form.cpf || null, birth_date: form.birth_date || null, rg_issued_on: form.rg_issued_on || null, is_guardian: false };
                const previous = text(studentData.previous_school);
                createdStudent = await PigeAPI.post(base() + '/students', { person, previous_school: previous, ...studentData });
                savedPersonId = createdStudent.person.id;
            }
            else if (modal.kind === 'student-edit') {
                const studentData = {};
                for (const key of studentFieldKeys) {
                    studentData[key] = form[key] ?? '';
                    delete form[key];
                }
                const personTarget = target.person;
                const types = Array.isArray(form.person_types) ? form.person_types.map(text) : [];
                await PigeAPI.patch(base() + '/persons/' + personTarget.id, { version: personTarget.version, data: { ...form, person_types: Array.from(new Set([...types, 'student'])), cpf: form.cpf || null, birth_date: form.birth_date || null, rg_issued_on: form.rg_issued_on || null, is_guardian: Boolean(personTarget.is_guardian) } });
                await PigeAPI.patch(base() + '/students/' + target.id, { version: target.version, data: studentData });
                savedPersonId = personTarget.id;
            }
            else if (['teacher', 'teacher-existing', 'teacher-edit', 'employee', 'employee-existing', 'employee-edit'].includes(modal.kind)) {
                const isTeacher = modal.kind.startsWith('teacher'), profileKeys = isTeacher ? teacherProfileKeys : employeeProfileKeys;
                const profileData = {};
                for (const key of profileKeys) {
                    profileData[key] = form[key] ?? (key === 'workload_hours' ? 0 : '');
                    delete form[key];
                }
                if (modal.kind.endsWith('-existing')) {
                    await PigeAPI.post(base() + '/' + (isTeacher ? 'teachers' : 'employees'), { person_id: target.id, ...profileData });
                    savedPersonId = target.id;
                }
                else if (modal.kind.endsWith('-edit')) {
                    const personTarget = target.person;
                    const types = Array.isArray(form.person_types) ? form.person_types.map(text) : [];
                    await PigeAPI.patch(base() + '/persons/' + personTarget.id, { version: personTarget.version, data: { ...form, person_types: Array.from(new Set([...types, isTeacher ? 'teacher' : 'employee'])), cpf: form.cpf || null, birth_date: form.birth_date || null, rg_issued_on: form.rg_issued_on || null, is_guardian: Boolean(personTarget.is_guardian) } });
                    await PigeAPI.patch(base() + '/' + (isTeacher ? 'teachers' : 'employees') + '/' + target.id, { version: target.version, data: profileData });
                    savedPersonId = personTarget.id;
                }
                else {
                    const types = Array.isArray(form.person_types) ? form.person_types.map(text) : [];
                    const person = { ...form, person_types: Array.from(new Set([...types, isTeacher ? 'teacher' : 'employee'])), cpf: form.cpf || null, birth_date: form.birth_date || null, rg_issued_on: form.rg_issued_on || null, is_guardian: false };
                    const created = await PigeAPI.post(base() + '/' + (isTeacher ? 'teachers' : 'employees'), { person, ...profileData });
                    savedPersonId = text(created.person?.id);
                }
            }
            else if (modal.kind === 'guardian' || modal.kind === 'person') {
                const types = Array.isArray(form.person_types) ? form.person_types.map(text) : [];
                if (modal.kind === 'guardian')
                    types.push('guardian');
                const data = { ...form, person_types: Array.from(new Set(types)), cpf: form.cpf || null, birth_date: form.birth_date || null, rg_issued_on: form.rg_issued_on || null, is_guardian: modal.kind === 'guardian' ? true : Boolean(target?.is_guardian) };
                if (target) {
                    await PigeAPI.patch(base() + '/persons/' + target.id, { version: target.version, data });
                    savedPersonId = target.id;
                }
                else {
                    const created = await PigeAPI.post(base() + '/persons', data);
                    savedPersonId = created.id;
                }
            }
            if (photo && savedPersonId && !PigeDossier.eligible(modal.kind)) {
                const photoData = new FormData();
                photoData.append('file', photo);
                await PigeAPI.request(base() + '/persons/' + savedPersonId + '/photo', { method: 'POST', body: photoData });
            }
            if (modal.kind === 'catalog') {
                if (modal.action === 'document-types')
                    form.grade_id = form.grade_id || null;
                if (modal.action === 'class-groups')
                    form.capacity = Number(form.capacity);
                if (target)
                    await PigeAPI.patch(base() + '/' + modal.action + '/' + target.id, { version: target.version, data: form });
                else
                    await PigeAPI.post(base() + '/' + modal.action, form);
            }
            else if (modal.kind === 'link' || modal.kind === 'link-edit') {
                if (target)
                    await PigeAPI.patch(base() + '/students/' + studentId + '/guardians/' + target.id, { version: target.version, data: { ...form, person_id: target.person_id } });
                else
                    await PigeAPI.post(base() + '/students/' + studentId + '/guardians', { ...form, active: true });
            }
            else if (modal.kind === 'enrollment') {
                form.financial_person_id = form.financial_person_id || null;
                await PigeAPI.post(base() + '/enrollments', form);
            }
            else if (modal.kind === 'draft-edit')
                await PigeAPI.patch(base() + '/enrollments/' + target.id, { ...form, version: target.version });
            else if (modal.kind === 'protocol-note')
                await PigeAPI.post(base() + '/protocols/' + target.id + '/notes', { ...form, version: target.version });
            else if (modal.kind === 'movement')
                await PigeAPI.post(base() + '/enrollments/' + target.id + '/movements', { ...form, version: target.version, action: modal.action });
            else if (modal.kind === 'reenroll')
                await PigeAPI.post(base() + '/enrollments/' + target.id + '/reenroll', form);
            else if (modal.kind === 'upload') {
                if (!selectedFile)
                    throw new Error('Selecione o documento.');
                const data = new FormData();
                data.append('file', selectedFile);
                for (const key of ['document_type_id', 'expires_on', 'notes'])
                    if (form[key])
                        data.append(key, text(form[key]));
                await PigeAPI.request(base() + '/students/' + studentId + '/documents', { method: 'POST', body: data });
            }
            else if (modal.kind === 'review')
                await PigeAPI.patch(base() + '/student-documents/' + target.id, { version: target.version, status: modal.action, notes: form.notes });
            else if (modal.kind === 'waiver')
                await PigeAPI.post(base() + '/students/' + studentId + '/document-waivers', form);
            else if (modal.kind === 'issue') {
                const id = studentId || text(target?.student_id);
                const result = await PigeAPI.post(base() + '/students/' + id + '/issued-documents', { kind: form.kind, enrollment_id: form.enrollment_id || null });
                await PigeAPI.download(base() + '/files/' + text(result.file_id) + '/download', text(form.kind) + '.pdf');
            }
            else if (modal.kind === 'protocol') {
                form.student_id = form.student_id || null;
                form.due_on = form.due_on || null;
                if (target)
                    await PigeAPI.patch(base() + '/protocols/' + target.id, { version: target.version, data: form });
                else
                    await PigeAPI.post(base() + '/protocols', form);
            }
            else if (modal.kind === 'support-hub') {
                const companyId = text(target?.company_id);
                if (!companyId)
                    throw new Error('Empresa da escola não encontrada.');
                const saved = await PigeAPI.request('/companies/' + companyId + '/support-hub', { method: 'PUT', body: JSON.stringify({
                        version: target?.version,
                        enabled: Boolean(form.enabled),
                        base_url: text(form.base_url),
                        token: text(form.token),
                        position: text(form.position) || 'left',
                        widget_type: text(form.widget_type) || 'expanded_bubble',
                        launcher_title: text(form.launcher_title) || 'Suporte',
                    }) });
                state.supportHub = saved;
                void PigeSupport.load(state.schoolId);
            }
            else if (modal.kind === 'identity') {
                const body = new FormData();
                for (const key of ['logo', 'font'])
                    delete form[key];
                body.set('payload', JSON.stringify({ ...form, version: target.version }));
                if (identityFiles.logo)
                    body.set('logo', identityFiles.logo);
                if (identityFiles.font)
                    body.set('font', identityFiles.font);
                const identity = await PigeAPI.request('/institution/identity', { method: 'PUT', body });
                PigeInstitution.apply(identity);
            }
            else if (modal.kind === 'mfa-policy') {
                const updated = await PigeAPI.request('/institution/mfa', { method: 'PUT', body: JSON.stringify({ ...form, version: target.version }) });
                state.modal = blankModal();
                if (updated.requires_login) {
                    await logout();
                    state.success = 'Política de 2FA atualizada. Todos devem entrar novamente.';
                }
                return;
            }
            else if (modal.kind === 'embedding-security') {
                const updated = await PigeAPI.request('/institution/embedding', { method: 'PUT', body: JSON.stringify({ version: target.version, enabled: Boolean(form.enabled), allowed_origins: text(form.allowed_origins).split(/\r?\n/).map(v => v.trim()).filter(Boolean), current_password: form.current_password }) });
                state.modal = blankModal();
                if (updated.requires_login) {
                    await logout();
                    state.success = 'Origens atualizadas. Entre novamente; os demais acessos também precisarão se autenticar.';
                    return;
                }
                state.success = 'Segurança de incorporação atualizada.';
                return;
            }
            else if (modal.kind === 'intake-settings')
                await PigeAPI.request('/institution/intake', { method: 'PUT', body: JSON.stringify({ ...form, version: target.version }) });
            else if (modal.kind === 'company-edit')
                await PigeAPI.patch('/companies/' + target.id, { version: target.version, data: form });
            else if (modal.kind === 'company')
                await PigeAPI.post('/companies', form);
            else if (modal.kind === 'school') {
                if (target)
                    await PigeAPI.patch('/schools/' + target.id, { version: target.version, data: form });
                else
                    await PigeAPI.post('/schools', form);
                state.schools = await PigeAPI.request('/schools');
            }
            else if (modal.kind === 'user') {
                form.person_id = form.person_id || null;
                if (target)
                    await PigeAPI.patch('/users/' + target.id, { ...form, version: target.version });
                else
                    await PigeAPI.post('/users', form);
            }
            else if (modal.kind === 'my-profile') {
                const body = new FormData();
                const { photo, ...payload } = form;
                body.set('payload', JSON.stringify({ ...payload, version: target.version }));
                if (selectedFile)
                    body.set('photo', selectedFile);
                const updated = await PigeAPI.request('/auth/profile', { method: 'PUT', body });
                state.modal = blankModal();
                clearProfilePreview();
                if (updated.requires_login) {
                    await logout();
                    state.login.email = updated.email;
                    state.success = 'E-mail atualizado. Entre novamente.';
                    return;
                }
                state.user = updated;
                await loadMyPhoto();
                state.success = 'Perfil atualizado.';
                return;
            }
            else if (modal.kind === 'password') {
                await PigeAPI.post('/auth/change-password', form);
                state.modal = blankModal();
                await logout();
                state.success = 'Senha alterada. Entre novamente.';
                return;
            }
            else if (modal.kind === 'archive')
                await PigeAPI.post(base() + '/students/' + studentId + '/archive', { version: target.version, data: { reason: form.reason } });
            state.modal = blankModal();
            state.success = 'Operação concluída com sucesso.';
            await loadCatalogs();
            if (createdStudent)
                await viewStudent(createdStudent.id);
            else if (studentId) {
                const tab = state.studentTab;
                await viewStudent(studentId);
                state.studentTab = tab;
            }
            else
                await loadPage();
            if (modal.kind === 'protocol-note')
                await viewProtocol(target.id);
            if (modal.kind === 'draft-edit')
                await viewEnrollment(target.id);
        }
        catch (error) {
            state.busy = false;
            modal.error = error instanceof Error ? error.message : String(error);
            const errors = error?.fields || [];
            const key = errors[0]?.field.split('.').at(-1);
            const field = modal.fields.find(f => f.key === key || f.key === 'business_' + key);
            if (field) {
                state.modalSection = fieldSection(field);
                await Vue.nextTick();
                const input = document.getElementById('modal-field-' + field.key);
                const details = input?.closest('details');
                if (details)
                    details.open = true;
                await Vue.nextTick();
                input?.focus();
            }
            if (state.modal !== modal)
                notify(error);
        }
        finally {
            state.busy = false;
        }
    }
    async function loadReport() { await safe(async () => { if (!state.reportClass) {
        state.reportRows = [];
        return;
    } const result = await PigeAPI.request(base() + '/reports/class/' + state.reportClass); state.reportRows = result.items; }); }
    async function exportStudents() { await safe(() => PigeAPI.download(base() + '/reports/students.csv', 'alunos.csv')); }
    async function exportClass() { if (state.reportClass)
        await safe(() => PigeAPI.download(base() + '/reports/class/' + state.reportClass + '/pdf', 'alunos-da-turma.pdf')); }
    async function logout() {
        try {
            await PigeAPI.post('/auth/logout', {});
        }
        catch { /* Limpar a interface mesmo sem rede. */ }
        if (state.userPhotoUrl)
            URL.revokeObjectURL(state.userPhotoUrl);
        state.userPhotoUrl = '';
        clearProfilePreview();
        PigeAPI.clear();
        state.user = null;
        state.page = 'dashboard';
        history.replaceState(null, '', '#/dashboard');
        state.selectedStudent = null;
        state.contractEnrollmentId = '';
        state.rows = [];
        state.dashboard = {};
        state.studentDocs = { items: [], checklist: [], issued: [] };
        state.history = [];
        state.studentProtocols = [];
        state.studentProtocolTotal = 0;
        resetFilters();
        state.personChoices = [];
        state.studentChoices = [];
        clearPhotos();
        state.catalogs = {};
        state.reportRows = [];
        state.companies = [];
        state.schools = [];
        state.supportHub = { id: '', company_id: '', enabled: false, base_url: '', position: 'left', widget_type: 'expanded_bubble', launcher_title: 'Suporte', token_configured: false, version: 1 };
        state.modal = blankModal();
        state.error = '';
        state.login.password = '';
    }
    async function install() { if (installEvent) {
        await installEvent.prompt();
        installEvent = null;
        state.canInstall = false;
    } }
    function updateApp() { if (waitingWorker && !state.modal.kind)
        waitingWorker.postMessage({ type: 'SKIP_WAITING' }); }
    function setupPWA() {
        window.addEventListener('online', () => { state.online = true; });
        window.addEventListener('offline', () => { state.online = false; });
        window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); installEvent = event; state.canInstall = true; });
        window.addEventListener('pige-session-expired', () => { void logout(); state.error = 'Sua sessão expirou. Entre novamente.'; });
        window.addEventListener('hashchange', () => { const target = location.hash.replace(/^#\/?/, ''); if (pageLabels[target] && target !== state.page && !state.modal.kind)
            void navigate(target); });
        if ('serviceWorker' in navigator && window.isSecureContext) {
            void navigator.serviceWorker.register('/sw.js').then(reg => {
                if (reg.waiting) {
                    waitingWorker = reg.waiting;
                    state.updateAvailable = true;
                }
                reg.addEventListener('updatefound', () => { const worker = reg.installing; worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                    waitingWorker = worker;
                    state.updateAvailable = true;
                } }); });
            }).catch(() => { });
            navigator.serviceWorker.addEventListener('controllerchange', () => { if (state.updateAvailable)
                location.reload(); });
        }
        window.addEventListener('beforeunload', event => { if (state.modal.kind && modalDirty()) {
            event.preventDefault();
            event.returnValue = '';
        } });
    }
    Vue.createApp({ components: { 'diagnostics-panel': PigeDiagnostics.component, 'expansion-panel': PigeExpansion.component, 'diary-panel': PigeDiary.component, 'contracts-panel': PigeContracts.component, 'signing-panel': PigeSigning.component, 'assist-panel': PigeAssist.component }, render: PigeRenders.app, setup() { Vue.onMounted(() => { PigeMFA.init(PigeAPI.request, afterMFA, logout); PigeDialogs.install(); setupPWA(); void initialize(); }); return { state, base, familyAssistFields, assistRequest, assistFields, assistEligible, assistCompany, setupCompany, setupCompanyFields, companyExtra, setupLookup, readStudentDocument, readResponsibleDocument, editIntake, mfa: PigeMFA, dossier: PigeDossier, selectedPersonTypes, availablePersonTypes, togglePersonType, lockedPersonType, familyRelevant, manageMFA, editMFAPolicy, editEmbedding, probeEmbedding, editMyProfile, myPhotoChange, profilePassword, registryPages, integrationPages, businessTypes, isBusiness, newBusiness, reusePerson, personDocument, modalSections, modalTab, visibleSection, modalFieldLabel, modalFieldRelevant, advancedPersonField, isPersonModal, personTypeOptions, personTypeLabel, modalDirty, contractDirty, identity: PigeInstitution.state, supportStatus: PigeSupport.status, editIdentity, identityFileChange, manageUnits, editMaintainer, text, can, isProfileRole, school, label, date, cpf, initials, photoSrc, getName, options, pageLabels, catalogLabels, configure, login, logout, navigate, changeSchool, setCatalog, search, page, loadPage, legacyImportFileChange, previewLegacyImport, applyLegacyImport, populatedImportTables, downloadLegacyArchive, viewStudent, newPerson, newStudent, editStudent, newGuardian, newTeacher, editTeacher, newEmployee, editEmployee, editPerson, newCatalog, newEnrollment, viewEnrollment, contractsForEnrollment, startMovement, reenroll, newLink, editLink, uploadDocument, fileChange, reviewDocument, waiveDocument, issueDocument, downloadFile, newProtocol, newCompany, newSchool, editSupportHub, newUser, password, archiveStudent, closeModal, saveModal, loadReport, exportStudents, exportClass, searchStudents, searchPersons, filteredClasses, clearFilters, yearChanged, editDraft, viewProtocol, protocolNote, protocolReceipt, exportPendencies, install, updateApp }; } }).mount('#app');
})(PigeUI || (PigeUI = {}));
