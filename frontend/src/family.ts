/** Portal privado: shell da aplicação, transporte e autorizações escolares preservados. */
namespace PigeFamily {
  type Document={id:string;type_name:string;status:string;file_id:string|null};
  type Student={id:string;name:string;number:string;financial_authorized:boolean;academic_authorized?:boolean;enrollments:{id:string;number:string;class_name:string;year_name:string;status:string}[];documents:Document[];document_pendencies:{document_type_id:string;name:string;status:string}[]};
  type Account={id:string;name:string;role:string;school_ids:string[]};
  type PaymentSource='asaas'|'crm'|'manual';
  type FamilyCharge={id:string;description:string;amount:string;due_on:string;status:string;billing_type?:string;collection_mode?:string;has_card_checkout?:boolean;payment_source?:PaymentSource;has_payment_documents?:boolean;external_payment_status?:'settled'|'cancelled'|'open'|'unavailable'|null};
  type ChargeDocuments={source:PaymentSource;billing_type:string;invoice_url?:string;bank_slip_url?:string;pix_copy_paste?:string;pix_expires_at?:string;identification_field?:string;bar_code?:string};
  type Post={id:string;title:string;summary:string;content:string;kind:string;publish_at:string|null;event_start:string|null;event_end:string|null;location:string};
  type Feed={items:Post[];total:number};
  const titles:Record<string,string>={webmail:'E-mail',materials:'Atividades',absences:'Justificativas de ausência',overview:'Visão geral',students:'Alunos que acompanho',academic:'Vida acadêmica',news:'Comunicados',agenda:'Agenda escolar',finance:'Financeiro',documents:'Documentos',support:'Atendimento'};
  function routeSection():string{const view=new URLSearchParams(location.search).get('view');return view&&titles[view]?view:location.pathname.includes('documents')?'documents':location.pathname.includes('finance')?'finance':location.pathname.includes('academic')?'academic':'overview';}
  function savedSidebarPreference():boolean {
    try { return window.localStorage.getItem('pige-family-sidebar-collapsed')==='true'; }
    catch { return false; }
  }
  function toggleSidebar():void {
    rail.close();
    s.sidebarCollapsed=!s.sidebarCollapsed;PigePortalTabs.reveal();
    try { window.localStorage.setItem('pige-family-sidebar-collapsed',String(s.sidebarCollapsed)); }
    catch { /* O menu continua utilizável se o armazenamento do navegador estiver bloqueado. */ }
  }
  const s=Vue.reactive({ready:false,busy:false,error:'',contextError:false,account:null as Account|null,email:'',password:'',passwordVisible:false,menuOpen:false,sidebarCollapsed:savedSidebarPreference(),feedQuery:'',feedTerm:'',schoolId:'',schools:{} as Record<string,string>,section:routeSection(),tabs:[] as string[],students:[] as Student[],studentId:new URLSearchParams(location.search).get('student')||'',charges:[] as FamilyCharge[],financePage:1,financePageSize:30,financeTotal:0,financeOverdue:0,financeNote:'',financeError:'',financeLoaded:false,news:[] as Post[],events:[] as Post[],feedItems:[] as Post[],feedTotal:0,feedPage:1,feedBusy:false,feedError:'',overviewFeedError:'',selectedPost:null as Post|null});
  type Material={id:string;title:string;body:string;kind:string};
  type RecentMaterial={id:string;title:string;kind:string;created_at:string};
  const recentMaterials=Vue.reactive({items:[] as RecentMaterial[],loading:false,error:''});
  const rail=PigeSidebarRail.use(()=>s.sidebarCollapsed);
  let recentSequence=0;
  function clearRecentMaterials(){
    recentSequence++;recentMaterials.items=[];recentMaterials.loading=false;recentMaterials.error='';
  }
  async function loadRecentMaterials(){
    clearRecentMaterials();
    const selected=student();
    if(s.section!=='overview'||!selected||selected.academic_authorized===false)return;
    const sequence=recentSequence,school=s.schoolId;
    const current=()=>sequence===recentSequence && selected.id===s.studentId && school===s.schoolId;
    recentMaterials.loading=true;
    try{
      const items=await request<RecentMaterial[]>('/family/students/'+selected.id+'/materials?view=recent');
      if(current())recentMaterials.items=items;
    }catch(e){
      if(current())recentMaterials.error=e instanceof Error?e.message:'Não foi possível consultar as atividades.';
    }finally{if(current())recentMaterials.loading=false;}
  }
  type Absence={number:string;status:string;absence_date:string};
  let schoolworkSequence=0;
  const schoolwork=Vue.reactive({requestedMaterial:'',materialNotice:'',loading:false,error:'',materials:[] as Material[],absences:[] as Absence[],filter:'',day:'',reason:'',file:null as File|null,key:'',receipt:'',fileVersion:0});
  function clearSchoolwork(){schoolworkSequence++;schoolwork.requestedMaterial='';schoolwork.materialNotice='';schoolwork.loading=false;schoolwork.error='';schoolwork.materials=[];schoolwork.absences=[];schoolwork.filter='';schoolwork.file=null;schoolwork.key='';schoolwork.day='';schoolwork.reason='';schoolwork.receipt='';schoolwork.fileVersion++;}
  function pickEvidence(event:Event){schoolwork.file=(event.target as HTMLInputElement).files?.[0]||null;}
  async function loadSchoolwork(){
    const sequence=++schoolworkSequence,id=s.studentId,section=s.section;
    schoolwork.error='';
    schoolwork.loading=false;
    if(!id||student()?.academic_authorized===false||!['materials','absences'].includes(section)||(section==='absences'&&s.account?.role!=='guardian'))return;
    schoolwork.loading=true;
    const path='/family/students/'+id+'/'+section;
    const current=()=>sequence===schoolworkSequence && s.studentId===id && s.section===section;
    try {
      if(section==='materials'){
        const items=await request<Material[]>(path);
        if(current()){
          schoolwork.materials=items;schoolwork.materialNotice='';
          const target=schoolwork.requestedMaterial;
          if(target && !items.some(item=>item.id===target))schoolwork.materialNotice='Esta atividade já não está disponível para a matrícula selecionada.';
        }
      }else{
        const items=await request<Absence[]>(path);
        if(current())schoolwork.absences=items;
      }
    }catch(error){
      if(current())schoolwork.error=error instanceof Error?error.message:'Não foi possível consultar os registros.';
    }finally{
      if(current()){
        schoolwork.loading=false;
        const target=schoolwork.requestedMaterial;
        if(section==='materials' && target && !schoolwork.error){
          schoolwork.requestedMaterial='';
          void Vue.nextTick(()=>{
            if(!current())return;
            const heading=window.document.getElementById('material-'+target);
            heading?.focus();
          });
        }
      }
    }
  }
  async function submitAbsence(){await run(async()=>{
    const id=s.studentId,current=generation,form=new FormData();
    schoolwork.key||=crypto.randomUUID();form.set('client_key',schoolwork.key);
    form.set('absence_date',schoolwork.day);form.set('reason',schoolwork.reason);
    if(schoolwork.file)form.set('evidence',schoolwork.file);
    const result=await request<{number:string}>('/family/students/'+id+'/absences',{method:'POST',body:form});
    if(current!==generation||s.studentId!==id)return;
    clearSchoolwork();schoolwork.receipt=result.number;await loadSchoolwork();
  });}
  let postTrigger:HTMLElement|null=null;
  let generation=0,feedGeneration=0,authEpoch=0;let token='';
  let refreshing:{epoch:number;promise:Promise<void>}|null=null;
  class SessionChanged extends Error {constructor(){super('A sessão mudou.');this.name='AbortError';}}
  function checkAuth(epoch:number):void{if(epoch!==authEpoch)throw new SessionChanged();}
  function invalidateAuth():void{authEpoch++;refreshing=null;}
  function clearPrivate():void{rail.close();PigePortalTabs.cancelClose();generation++;s.tabs=[];savedFeeds.clear();postTrigger=null;clearRecentMaterials();mail.clear();autoPix.clear();cards.clear();clearChargeDocuments();feedGeneration++;clearSchoolwork();s.students=[];s.charges=[];s.financeTotal=0;s.financePage=1;s.financeOverdue=0;s.financeNote='';s.financeError='';s.financeLoaded=false;s.news=[];s.events=[];s.feedItems=[];s.feedTotal=0;s.feedPage=1;s.feedBusy=false;s.selectedPost=null;s.feedError='';s.feedQuery='';s.feedTerm='';s.overviewFeedError='';s.menuOpen=false;}
  async function raw(path:string,options:RequestInit={}):Promise<Response>{const headers=new Headers(options.headers);headers.set('X-CSRF-Protection','1');if(token)headers.set('Authorization','Bearer '+token);if(s.schoolId)headers.set('X-School-Id',s.schoolId);if(typeof options.body==='string')headers.set('Content-Type','application/json');return fetch('/api/v1'+path,{...options,headers,credentials:'same-origin',cache:'no-store'});}
  async function renew():Promise<void>{
    const epoch=authEpoch;
    if(!refreshing||refreshing.epoch!==epoch){
      const pending={epoch,promise:Promise.resolve()};
      pending.promise=(async()=>{const r=await raw('/auth/refresh',{method:'POST'});const data=await r.json();checkAuth(epoch);
        if(!r.ok){invalidateAuth();token='';s.account=null;clearPrivate();throw new Error('Sua sessão expirou. Entre novamente.');}
        if(s.account && (s.account.id!==data.user.id || s.account.role!==data.user.role || (s.schoolId && !data.user.school_ids.includes(s.schoolId)))){
          invalidateAuth();token='';s.account=null;clearPrivate();
          throw new Error('Seu acesso à escola mudou. Entre novamente.');
        }
        token=data.access_token;s.account=data.user;
      })().finally(()=>{if(refreshing===pending)refreshing=null;});
      refreshing=pending;
    }
    await refreshing.promise;checkAuth(epoch);
  }
  async function response(path:string,options:RequestInit={}):Promise<Response>{
    const epoch=authEpoch;let r=await raw(path,options);checkAuth(epoch);
    // Login/logout never renew a prior session. An old request cannot replay in a new one.
    if(r.status===401&&token&&!/^\/auth\/(?:login|logout|refresh)$/.test(path)){await r.arrayBuffer();checkAuth(epoch);await renew();checkAuth(epoch);r=await raw(path,options);checkAuth(epoch);}
    if(!r.ok){
      let detail='Não foi possível carregar. Tente novamente.';
      try{detail=(await r.json()).detail||detail;}catch{}
      checkAuth(epoch);
      if(r.status===403 && s.schoolId && (path.startsWith('/family/students/') || path.startsWith('/profile/learning')))void checkStudentAccess();
      throw Object.assign(new Error(detail),{status:r.status});
    }
    return r;
  }
  async function request<T>(path:string,options:RequestInit={}):Promise<T>{const epoch=authEpoch;const data=await (await response(path,options)).json();checkAuth(epoch);return data as T;}
  async function run(fn:()=>Promise<void>):Promise<void>{if(s.busy)return;s.busy=true;s.error='';try{await fn();}catch(e){if(!(e instanceof SessionChanged))s.error=e instanceof Error?e.message:'Não foi possível concluir.';}finally{s.busy=false;}}
  async function authenticated(data:Record<string,unknown>):Promise<void>{token=String(data.access_token||'');s.account=data.user as Account;s.password='';s.passwordVisible=false;s.schoolId=s.account.school_ids[0]||'';await load();}
  async function login():Promise<void>{if(s.busy)return;invalidateAuth();clearPrivate();token='';s.account=null;s.schoolId='';await run(async()=>{const result=await request<Record<string,unknown>>('/auth/login',{method:'POST',body:JSON.stringify({email:s.email,password:s.password})});s.password='';s.passwordVisible=false;if(await PigeMFA.accept(result))return;await authenticated(result);});}
  async function logout():Promise<void>{
    if(s.busy)return;
    if(isOpen('support') && workspaceBusy(['support']))return;
    if(drafts(['support']).length && !window.confirm('Descartar a mensagem de atendimento ainda não enviada e sair?'))return;
    // Invalidate pending renewals before the logout network request, not after it.
    invalidateAuth();clearPrivate();
    await run(async()=>{try{await request('/auth/logout',{method:'POST'});}finally{token='';s.account=null;s.schoolId='';s.studentId='';s.section='overview';s.password='';s.passwordVisible=false;updateLocation();PigeMFA.clear();}});
  }
  const mail=PigePortalMail.use(request);
  async function load():Promise<void>{
    clearPrivate();s.contextError=false;
    const current=generation;
    try{
      const [data]=await Promise.all([
        request<{students:Student[];schools:{id:string;name:string}[]}>('/family/context'),
        mail.load(s.schoolId)
      ]);
      if(current!==generation)return;
      s.schools=Object.fromEntries((data.schools||[]).map(item=>[item.id,item.name]));
      s.students=data.students;
      if(!s.students.some(item=>item.id===s.studentId))s.studentId=s.students[0]?.id||'';
      const previous=s.section;
      setActiveTab(previous);
      if(s.section!==previous)updateLocation();
      void loadRecentMaterials();
      await Promise.all([finance(),overviewFeed(),loadSchoolwork()]);
      if(current===generation&&['news','agenda'].includes(s.section))await loadFeed();
    }catch(error){if(current===generation)s.contextError=true;throw error;}
  }
  let accessCheck:Promise<void>|null=null;
  function checkStudentAccess():Promise<void>{
    if(accessCheck)return accessCheck;
    if(!s.account || !s.schoolId || s.contextError)return Promise.resolve();
    const scope=generation;
    const fingerprint=(items:Student[])=>JSON.stringify(items.map(item=>
      [item.id,item.academic_authorized!==false,item.financial_authorized]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))));
    const pending=(async()=>{
      try{
        const result=await request<{students:Student[]}>('/family/context');
        if(scope===generation && fingerprint(result.students)!==fingerprint(s.students))await load();
      }catch(e){
        if(scope===generation && (e as {status?:number}).status===403){
          clearPrivate();s.contextError=true;s.error='A escola alterou as permissões deste acesso.';
        }
      }
    })();
    accessCheck=pending;
    void pending.finally(()=>{if(accessCheck===pending)accessCheck=null;});
    return pending;
  }
  function checkWhenVisible():void{if(!window.document.hidden)void checkStudentAccess();}
  const label=(value:string):string=>({open:'Aberto',in_progress:'Em atendimento',waiting:'Aguardando',draft:'Em preparação',active:'Efetivada',suspended:'Suspensa',completed:'Concluída',pending:'Pendente',overdue:'Vencida',validated:'Validado',received:'Recebido',received_external:'Recebido externamente',confirmed:'Confirmada',refunded:'Estornada',partially_refunded:'Estorno parcial',refund_requested:'Estorno solicitado',disputed:'Em contestação',awaiting_review:'Em análise',failed:'Falha na emissão',uncertain:'Em conciliação',waived:'Dispensado',rejected:'Revisão necessária',expired:'Vencido',queued:'Em processamento',cancelled:'Cancelada',paid:'Paga',settled:'Liquidada',issued:'Emitida',registered:'Registrada'}[value]||value);
  const student=()=>s.students.find(x=>x.id===s.studentId);
  const activeEnrollments=()=>student()?.enrollments.filter(item=>item.status==='active')||[];
  function normalized(value:string):string {return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();}
  function visibleMaterials():Material[] {
    const query=normalized(schoolwork.filter);
    return query?schoolwork.materials.filter(item=>normalized(item.title+' '+item.body).includes(query)):schoolwork.materials;
  }
  const pendingDocuments=()=>student()?.document_pendencies??[];
  const studentView=()=>s.account?.role==='student';
  const portalName=()=>studentView()?'Portal do aluno':'Portal da família';
  const initials=(name:string)=>name.trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toLocaleUpperCase('pt-BR');
  const title=(name=s.section)=>studentView()&&name==='students'?'Meu cadastro':studentView()&&name==='academic'?'Minha vida escolar':titles[name]||titles.overview;
  const date=(value:string|null)=>{if(!value)return 'Data não informada';const d=new Date(value.length===10?value+'T12:00:00':value);return Number.isNaN(d.getTime())?'Data não informada':new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Bahia',day:'2-digit',month:'short',year:'numeric',...(value.length>10?{hour:'2-digit',minute:'2-digit'}:{})}).format(d);};
  const money=(value:string)=>Number(value).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const autoPix=PigeAutoPix.use(request,()=>s.studentId);
  const cards=PigeFamilyCard.use(request,()=>s.studentId);
  const paymentSources={asaas:'Asaas',crm:'CRM',manual:'Lançamento da escola'};
  function chargeStatus(charge:FamilyCharge):string {
    if(charge.payment_source==='crm'){
      if(charge.external_payment_status==='settled')return 'Pagamento identificado no CRM';
      if(charge.external_payment_status==='cancelled')return 'Cancelada no CRM';
      if(charge.external_payment_status==='unavailable')return 'Situação no CRM indisponível';
    }
    return label(charge.status);
  }
  const paymentKinds:Record<string,string>={PIX:'Pix',BOLETO:'Boleto',CREDIT_CARD:'Cartão de crédito',MANUAL:'Cobrança manual'};
  const documentsPanel=Vue.reactive({chargeId:'',loading:false,error:'',notice:'',data:null as ChargeDocuments|null});
  let documentRequest=0,financeRequest=0;
  function clearChargeDocuments():void{
    documentRequest++;documentsPanel.chargeId='';documentsPanel.data=null;
    documentsPanel.loading=false;documentsPanel.error='';documentsPanel.notice='';
  }
  function instrumentLink(value?:string):string{
    if(!value)return '';
    try{
      const url=new URL(value);
      return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&
        (url.hostname==='asaas.com'||url.hostname.endsWith('.asaas.com'))?url.href:'';
    }catch{return '';}
  }
  async function showChargeDocuments(charge:FamilyCharge,retry=false):Promise<void>{
    if(documentsPanel.chargeId===charge.id&&!retry){clearChargeDocuments();return;}
    clearChargeDocuments();
    if(!student()?.financial_authorized || !charge.has_payment_documents || !s.charges.some(row=>row.id===charge.id))return;
    const sequence=documentRequest,school=s.schoolId,selected=s.studentId;
    const current=()=>sequence===documentRequest&&school===s.schoolId&&selected===s.studentId;
    documentsPanel.chargeId=charge.id;documentsPanel.loading=true;
    try{
      const data=await request<ChargeDocuments>('/family/students/'+encodeURIComponent(selected)+'/charges/'+encodeURIComponent(charge.id)+'/documents');
      if(!current())return;
      documentsPanel.data={...data,invoice_url:instrumentLink(data.invoice_url),bank_slip_url:instrumentLink(data.bank_slip_url)};
    }catch(error){
      if(current())documentsPanel.error=error instanceof Error?error.message:'Não foi possível consultar os documentos desta cobrança.';
    }finally{if(current())documentsPanel.loading=false;}
  }
  async function copyChargeCode(controlId:string):Promise<void>{
    const control=window.document.getElementById(controlId) as HTMLInputElement|null;
    if(!control||!documentsPanel.data||!student()?.financial_authorized)return;
    const current=documentRequest;
    try{
      await navigator.clipboard.writeText(control.value);
      if(current===documentRequest)documentsPanel.notice='Código copiado.';
    }catch{
      if(current!==documentRequest)return;
      control.focus();control.select();documentsPanel.notice='Código selecionado. Use a opção Copiar do seu dispositivo.';
    }
  }
  async function finance(page=1):Promise<void>{
    const sequence=++financeRequest;
    clearChargeDocuments();
    s.charges=[];s.financeLoaded=false;s.financeNote='';s.financeError='';s.financeOverdue=0;s.financeTotal=0;
    if(!student()?.financial_authorized)return;
    const selected=s.studentId,current=generation;
    try{
      const data=await request<{items:typeof s.charges;note:string;overdue_count?:number;total?:number}>(`/family/students/${selected}/charges?page=${page}&page_size=${s.financePageSize}`);
      if(sequence!==financeRequest||selected!==s.studentId||current!==generation)return;
      s.charges=data.items;s.financeTotal=data.total??0;
      s.financeOverdue=data.overdue_count??data.items.filter(row=>row.status==='overdue').length;
      s.financePage=page;s.financeNote=data.note;s.financeLoaded=true;
    }catch(e){
      if(sequence===financeRequest&&selected===s.studentId&&current===generation)s.financeError=e instanceof Error?e.message:'Não foi possível carregar o financeiro.';
    }
  }
  function feedPath(kind:string,page=1,size=12,upcoming=false,query=''):string {
    const params=new URLSearchParams({kind,page:String(page),page_size:String(size),upcoming:String(upcoming)});
    if(query.trim())params.set('q',query.trim());
    return '/schools/'+encodeURIComponent(s.schoolId)+'/community-feed?'+params;
  }
  let overviewFeedGeneration=-1;
  async function overviewFeed():Promise<void>{if(!s.schoolId||student()?.academic_authorized===false||overviewFeedGeneration===generation)return;const current=generation;overviewFeedGeneration=current;try{const [news,events]=await Promise.all([request<Feed>(feedPath('news',1,3)),request<Feed>(feedPath('event',1,3,true))]);if(current!==generation)return;s.news=news.items;s.events=events.items;}catch(e){if(current===generation)s.overviewFeedError=e instanceof Error?e.message:'Não foi possível carregar os comunicados e a agenda.';}}
  async function loadFeed(page=1):Promise<void>{if(!s.schoolId||s.contextError||student()?.academic_authorized===false)return;const current=generation,id=++feedGeneration,kind=s.section==='agenda'?'event':'news';s.feedBusy=true;s.feedError='';s.feedItems=[];s.selectedPost=null;try{const data=await request<Feed>(feedPath(kind,page,12,false,s.feedTerm));if(current!==generation||id!==feedGeneration)return;s.feedItems=data.items;s.feedTotal=data.total;s.feedPage=page;}catch(e){if(current===generation&&id===feedGeneration)s.feedError=e instanceof Error?e.message:'Não foi possível carregar as publicações.';}finally{if(id===feedGeneration)s.feedBusy=false;}}
  async function searchFeed():Promise<void> {
    s.feedTerm=s.feedQuery.trim();await loadFeed(1);
  }
  function updateLocation(push=false):void{
    const params=new URLSearchParams({view:s.section});
    if(s.studentId)params.set('student',s.studentId);
    const scope={familyAccount:s.account?.id,familySchool:s.schoolId};
    history[push?'pushState':'replaceState'](scope,'','/family?'+params);
  }
  function clearStudentWorkspace():void {
    rail.close();
    generation++;feedGeneration++;clearRecentMaterials();autoPix.clear();cards.clear();clearChargeDocuments();clearSchoolwork();savedFeeds.clear();
    s.tabs=[];s.feedItems=[];s.feedTotal=0;s.feedBusy=false;s.feedPage=1;s.feedTerm='';s.feedQuery='';
    s.news=[];s.events=[];s.overviewFeedError='';s.selectedPost=null;s.feedError='';postTrigger=null;
  }
  async function changeStudent():Promise<void>{
    if(s.busy)return;
    clearStudentWorkspace();setActiveTab(s.section);updateLocation();
    void loadRecentMaterials();
    if(s.section==='overview')void overviewFeed();
    await run(async()=>{await Promise.all([finance(),loadSchoolwork()]);if(isFeed(s.section))await loadFeed();});
  }
  async function selectStudent(event:Event):Promise<void>{
    const input=event.currentTarget as HTMLSelectElement;
    if(!canLeaveContext()){input.value=s.studentId;return;}
    s.studentId=input.value;await changeStudent();
  }
  async function chooseStudent(id:string):Promise<void>{
    if(s.busy)return;
    if(id!==s.studentId){
      if(!canLeaveContext())return;
      s.studentId=id;await changeStudent();
    }
    section('academic');
  }
  async function changeSchool():Promise<void>{if(s.busy)return;s.studentId='';s.section='overview';await run(load);updateLocation();}
  async function selectSchool(event:Event):Promise<void>{
    const input=event.currentTarget as HTMLSelectElement;
    if(!canLeaveContext()){input.value=s.schoolId;return;}
    s.schoolId=input.value;await changeSchool();
  }
  function refreshWorkspace():void{if(canLeaveContext())void run(load);}
  async function download(path:string,filename:string):Promise<void>{const current=generation,selected=s.studentId;const r=await response(path);const blob=await r.blob();if(current!==generation||selected!==s.studentId)return;const url=URL.createObjectURL(blob);const a=window.document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function document(file:Document):Promise<void>{await run(()=>download('/family/students/'+s.studentId+'/documents/'+file.id,'documento-escolar'));}
  async function start():Promise<void>{await PigeInstitution.load();try{await renew();if(s.account){s.schoolId=s.account.school_ids[0]||'';await load();}}catch(e){if(s.account)s.error=e instanceof Error?e.message:'Não foi possível carregar seus dados.';}finally{s.ready=true;}}
  function openPost(post:Post):void{postTrigger=window.document.activeElement as HTMLElement|null;s.selectedPost=post;void Vue.nextTick(()=>{const target=window.document.getElementById('family-post-detail');target?.focus();target?.scrollIntoView({block:'start'});});}
  function closePost():void{s.selectedPost=null;if(postTrigger?.isConnected)postTrigger.focus();postTrigger=null;}
  function resized():void{if(window.innerWidth>800)closeMenu(false);PigePortalTabs.reveal();}
  function closeMenu(restore=true):void{s.menuOpen=false;if(restore)void Vue.nextTick(()=>{if(!s.menuOpen)window.document.getElementById('family-menu-toggle')?.focus();});}
  function openMenu():void{s.menuOpen=true;void Vue.nextTick(()=>{if(s.menuOpen)window.document.getElementById('family-menu-close')?.focus();});}
  function menuKeys(event:KeyboardEvent):void{if(!s.menuOpen)return;if(event.key==='Escape'){event.preventDefault();closeMenu();}if(event.key==='Tab'){const elements=Array.from(window.document.querySelectorAll<HTMLElement>('#family-navigation button:not(:disabled),#family-navigation a[href]'));const first=elements[0],last=elements[elements.length-1];if(event.shiftKey&&window.document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&window.document.activeElement===last){event.preventDefault();first?.focus();}}}
  function allowedSection(name:string):string{if(name==='webmail'&&mail.state.available)return name;if(name==='webmail'||(name==='absences'&&s.account?.role!=='guardian'))name='overview';return student()?.academic_authorized===false&&name!=='support'?(student()?.financial_authorized?'finance':'support'):name;}
  function sidebarGroups(){
    const academic=student()?.academic_authorized!==false;
    const groups=[];
    if(academic)groups.push({id:'family-learning-menu',label:'Acompanhamento escolar',icon:'academic',items:[
      {id:'students',label:title('students'),icon:'students'},
      {id:'materials',label:'Atividades',icon:'documents'},
      {id:'academic',label:title('academic'),icon:'academic'},
      {id:'agenda',label:'Agenda escolar',icon:'clock'},
      {id:'news',label:'Comunicados',icon:'bell'},
    ]});
    const services=[];
    if(mail.state.available)services.push({id:'webmail',label:'E-mail',icon:'email'});
    if(s.account?.role==='guardian'&&academic)services.push({id:'absences',label:'Justificativas de ausência',icon:'documents'});
    if(student()?.financial_authorized)services.push({id:'finance',label:'Financeiro',icon:'billing'});
    if(academic)services.push({id:'documents',label:'Documentos',icon:'documents'});
    services.push({id:'support',label:'Atendimento',icon:'school'},{id:'online',label:'Inscrição e contratos',icon:'online'});
    groups.push({id:'family-services-menu',label:'Serviços escolares',icon:'school',items:services});
    return groups;
  }
  const isFeed=(key:string)=>key==='news'||key==='agenda';
  type FeedTab={query:string;term:string;items:Post[];total:number;page:number;post:Post|null;loaded:boolean};
  const savedFeeds=new Map<string,FeedTab>();
  function rememberFeed():void {
    if(!isFeed(s.section))return;
    savedFeeds.set(s.section,{query:s.feedQuery,term:s.feedTerm,items:s.feedItems,total:s.feedTotal,
      page:s.feedPage,post:s.selectedPost,loaded:!s.feedError && !s.feedBusy});
  }
  function restoreFeed(key:string):boolean {
    const saved=savedFeeds.get(key);
    s.feedQuery=saved?.query||'';s.feedTerm=saved?.term||'';s.feedItems=saved?.items||[];
    s.feedPage=saved?.page||1;s.feedTotal=saved?.total||0;s.selectedPost=saved?.post||null;
    s.feedBusy=false;s.feedError='';
    return saved?.loaded===true;
  }
  function setActiveTab(requested:string):void{
    const home=allowedSection('overview');
    const name=allowedSection(requested);
    if(s.tabs[0]!==home)s.tabs=[home];
    s.tabs=s.tabs.filter(id=>allowedSection(id)===id);
    if(!s.tabs.includes(name))s.tabs.push(name);
    s.section=name;PigePortalTabs.reveal();
  }
  function isOpen(key:string):boolean{
    return (s.section===key || s.tabs.includes(key)) && allowedSection(key)===key;
  }
  let navigationVersion=0;
  function setView(requested:string,materialId='',focusHeading=true):boolean {
    rail.close();navigationVersion++;
    const name=allowedSection(requested),changed=s.section!==name;
    let cached=false;
    if(changed){rememberFeed();feedGeneration++;s.selectedPost=null;postTrigger=null;}
    setActiveTab(name);closeMenu(false);
    if(changed && isFeed(name))cached=restoreFeed(name);
    schoolwork.requestedMaterial=name==='materials'?materialId:'';schoolwork.materialNotice='';
    if(materialId)schoolwork.filter='';
    if(name==='overview'){void loadRecentMaterials();void overviewFeed();}
    if(name==='materials'||name==='absences')void loadSchoolwork();
    if(isFeed(name) && changed && !cached)void loadFeed(s.feedPage);
    if(focusHeading)void Vue.nextTick(()=>window.document.getElementById('family-title')?.focus());
    return changed;
  }
  function section(name:string,materialId='',focusHeading=true):void{
    if(!titles[name])return;
    if(setView(name,materialId,focusHeading))updateLocation(true);
  }
  function financeDraft():boolean {
    const card=cards.state,pix=autoPix.state;
    const initialLimit=String((card.view?.checkout?.quote.charged_cents||0)/100);
    return Boolean(pix.accepted||pix.confirmCancel||(pix.view?.can_enroll && pix.frequency!=='MONTHLY')||
      card.agreed||card.revoke||card.until||(card.view?.can_authorize && card.limit!==initialLimit));
  }
  function drafts(tabs:string[]):string[] {
    const result=[];
    if(tabs.includes('support') && window.document.querySelector?.('#family-protocols [data-workspace-dirty="true"]'))result.push('mensagem de atendimento');
    if(tabs.includes('absences') && (schoolwork.day||schoolwork.reason||schoolwork.file))result.push('justificativa de ausência');
    if(tabs.includes('finance') && financeDraft())result.push('dados financeiros em edição');
    return result;
  }
  function workspaceBusy(tabs:string[]):boolean {
    return s.busy || (tabs.includes('support') && Boolean(window.document.querySelector?.('#family-protocols [aria-busy="true"]'))) || (tabs.includes('finance') && (autoPix.state.busy || cards.state.loading));
  }
  function canLeaveContext():boolean {
    if(workspaceBusy(s.tabs))return false;
    const pending=drafts(s.tabs);
    const mailOpen=s.tabs.includes('webmail');
    if(!pending.length && !mailOpen)return true;
    return window.confirm('Continuar e fechar as guias deste contexto?'+(pending.length?' Alterações ainda não salvas: '+pending.join(', ')+'.':'')+
      (mailOpen?' Confira se as mensagens em edição foram salvas em Rascunhos.':''));
  }
  function forget(key:string):void {
    savedFeeds.delete(key);
    if(key==='finance'){autoPix.clear();cards.clear();clearChargeDocuments();}
    if(key==='absences'){
      schoolwork.day='';schoolwork.reason='';schoolwork.file=null;schoolwork.fileVersion++;schoolwork.key='';schoolwork.receipt='';
    }
    if(key==='materials'){schoolwork.filter='';schoolwork.requestedMaterial='';schoolwork.materialNotice='';}
  }
  function focusTab():void{void Vue.nextTick(()=>window.document.getElementById('family-tab-'+s.section)?.focus());}
  async function closeTabs(key?:string):Promise<void>{
    const home=s.tabs[0];
    if(!home || s.tabs.length<2 || key===home || (key && !s.tabs.includes(key)))return;
    const closing=key?[key]:s.tabs.slice(1);
    if(workspaceBusy(closing))return;
    const pending=drafts(closing),mailOpen=closing.includes('webmail');
    if(key){
      if((pending.length || mailOpen) && !window.confirm('Fechar a guia '+title(key)+'?'+
        (pending.length?' As alterações em '+pending.join(' e ')+' serão descartadas.':'')+
        (mailOpen?' Confira se as mensagens em edição foram salvas em Rascunhos.':'')))return;
    }else{
      const account=s.account,school=s.schoolId,student=s.studentId;
      if(mailOpen)pending.push('mensagens em edição no E-mail');
      if(!await PigePortalTabs.confirmClose(title(home),pending))return;
      if(account!==s.account || school!==s.schoolId || student!==s.studentId || workspaceBusy(closing))return;
    }
    if(closing.includes(s.section)){setView(home,'',false);updateLocation(true);}
    closing.forEach(forget);s.tabs=s.tabs.filter(id=>!closing.includes(id));focusTab();
  }
  function tabKeys(event:KeyboardEvent):void{
    const key=PigePortalTabs.keyTarget(event,s.tabs,s.section);
    if(key){section(key,'',false);focusTab();}
  }
  async function popstate(event?:PopStateEvent):Promise<void>{
    if(!s.account)return;
    const requested=routeSection(),id=new URLSearchParams(location.search).get('student');
    const ctx=event?.state;
    if(ctx?.familyAccount && (ctx.familyAccount!==s.account.id || ctx.familySchool!==s.schoolId)){
      updateLocation();return;
    }
    const changed=Boolean(id && id!==s.studentId && s.students.some(item=>item.id===id));
    if(changed && id){
      if(!canLeaveContext()){updateLocation();return;}
      clearStudentWorkspace();s.studentId=id;
      const current=++navigationVersion,scope=generation;
      await finance();
      if(scope!==generation || current!==navigationVersion)return;
    }
    setView(requested);
    if(s.section!==requested || (id && id!==s.studentId))updateLocation();
  }
  Vue.createApp({components:{'portal-protocols':PigePortalProtocols.component,'portal-mail':PigePortalMail.component,'learning-portal':PigeLearning.component},render:PigeRenders.familyPortal,setup(){
    Vue.watch(()=>[s.schoolId,s.account?.id,s.studentId,student()?.academic_authorized,student()?.financial_authorized,mail.state.available].join('|'),()=>rail.close());
    Vue.watch(()=>[s.ready,s.account?.id,s.account?.role,s.schoolId].join('|'),()=>{
      if(s.account&&s.schoolId)void PigeSupport.load(s.schoolId,s.account.role==='student'?'student_portal':'guardian_portal',s.account.id);
      else if(s.ready&&!s.account)void PigeSupport.load(undefined,'login');
      else PigeSupport.dispose();
    });
    Vue.onMounted(rail.mount);Vue.onUnmounted(rail.dispose);
    Vue.onUnmounted(PigeSupport.dispose);
Vue.onMounted(()=>{window.addEventListener('popstate',popstate);window.document.addEventListener?.('visibilitychange',checkWhenVisible);window.addEventListener('keydown',menuKeys);window.addEventListener('resize',resized);PigeMFA.init(request,authenticated,logout);void start();});Vue.onUnmounted(()=>{window.removeEventListener('popstate',popstate);window.document.removeEventListener?.('visibilitychange',checkWhenVisible);window.removeEventListener('keydown',menuKeys);window.removeEventListener('resize',resized);});return{s,rail,sidebarGroups,chargeStatus,documentsPanel,paymentSources,paymentKinds,showChargeDocuments,copyChargeCode,closeTabs,tabKeys,isOpen,selectSchool,selectStudent,refreshWorkspace,recentMaterials,loadRecentMaterials,toggleSidebar,activeEnrollments,visibleMaterials,mail,autoPix,cards,schoolwork,loadSchoolwork,studentView,portalName,pickEvidence,submitAbsence,label,student,title,initials,date,money,pendingDocuments,finance,login,logout,changeSchool,changeStudent,chooseStudent,document,request,download,section,run,load,loadFeed,searchFeed,openPost,closePost,openMenu,closeMenu,mfa:PigeMFA,identity:PigeInstitution.state};}}).mount('#family');
}
