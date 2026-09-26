namespace PigeUI {
  type Row = PigeAPI.Row;
  type Student = PigeAPI.Student;
  type Value = PigeAPI.Value;
  interface Option { value: string; label: string }
  interface Field { key: string; label: string; type: string; required?: boolean; options?: Option[]; wide?: boolean; help?: string }
  interface Modal { kind: string; title: string; fields: Field[]; form: PigeAPI.FormDataMap; target: Row | null; action: string; error: string }
  const text = (value: unknown): string => value === null || value === undefined ? '' : String(value);
  const statusLabels: Record<string,string> = {active:'Ativo', archived:'Arquivado', draft:'Rascunho', suspended:'Suspenso', transferred:'Transferido', cancelled:'Cancelado', completed:'Concluído', pending:'Pendente', received:'Recebido', validated:'Validado', rejected:'Rejeitado', expired:'Vencido', waived:'Dispensado', open:'Aberto', in_progress:'Em atendimento', waiting:'Aguardando', closed:'Fechado', admin:'Administrador', direction:'Direção', coordination:'Coordenação', secretary:'Secretaria', teacher:'Professor', student:'Aluno', guardian:'Responsável', viewer:'Consulta', leave:'Afastado', inactive:'Inativo', clt:'CLT', public:'Serviço público', temporary:'Temporário', substitute:'Substituto', intern:'Estágio', outsourced:'Terceirizado', other:'Outro'};
  const catalogLabels: Record<string,string> = {'units':'Unidades','academic-years':'Anos letivos','grades':'Séries e etapas','shifts':'Turnos','class-groups':'Turmas','document-types':'Tipos de documento'};
  const registryPages=['people','students','teachers','employees','guardians','suppliers','providers','customers','partners'];
  const businessTypes:Record<string,{code:string;singular:string;category:string}>={suppliers:{code:'supplier',singular:'fornecedor',category:'Categoria de fornecimento'},providers:{code:'service_provider',singular:'prestador de serviços',category:'Especialidade / serviço'},customers:{code:'customer',singular:'cliente',category:'Categoria do cliente'},partners:{code:'partner',singular:'sócio',category:'Vínculo societário'}};
  const pageLabels: Record<string,string> = {online:'Inscrições online',banking:'Cobranças',integrations:'Financeiro / ASAAS',connect:'Connect API',dashboard:'Visão geral',people:'Cadastro único',students:'Alunos',teachers:'Professores',employees:'Funcionários',guardians:'Pais e responsáveis',suppliers:'Fornecedores',providers:'Prestadores de serviços',customers:'Clientes',partners:'Sócios',academic:'Estrutura acadêmica',enrollments:'Matrículas',documents:'Pendências documentais',protocols:'Protocolos',reports:'Relatórios',settings:'Instituição',users:'Usuários e acessos',audit:'Auditoria'};
  const blankModal = (): Modal => ({kind:'',title:'',fields:[],form:{},target:null,action:'',error:''});
  const state = Vue.reactive({
    embeddingProbe:{busy:false,message:'',frame_policy:'',x_frame_options:''},
    assistSource:'',
    ready:false, configured:true, embedded:window.self!==window.top, online:navigator.onLine, loginBusy:false, busy:false, loading:false,
    error:'', success:'', menuOpen:false, user:null as PigeAPI.User|null, userPhotoUrl:'', profilePhotoPreview:'',
    schools:[] as PigeAPI.School[], schoolId:'', page:'dashboard', q:'', pageNumber:1, total:0,
    rows:[] as Row[], dashboard:{} as Row, catalogs:{} as Record<string,Row[]>, catalog:'class-groups',
    selectedStudent:null as Student|null, studentTab:'cadastro', profileContext:{} as Row, studentDocs:{items:[],checklist:[],issued:[]} as {items:Row[];checklist:Row[];issued:Row[]}, history:[] as Row[],
    studentChoices:[] as Student[], personChoices:[] as Row[], photoUrls:{} as Record<string,string>, companies:[] as Row[], reportClass:'', reportRows:[] as Row[],
    supportHub:{id:'',company_id:'',enabled:false,base_url:'',position:'left',widget_type:'expanded_bubble',launcher_title:'Suporte',token_configured:false,version:1} as Row,
    personTypeQuery:'',cadastresOpen:true, registryFilter:{type_code:'',entity_kind:'',active:''}, modalSection:'identification', discardChanges:false, modalInitial:'', reuseTarget:'',
    modal:blankModal(), login:{email:'',password:''}, setup:{token:'',admin_name:'',admin_email:'',admin_password:'',company_name:'',company_document:'',school_name:'',unit_name:'Unidade principal',academic_year:new Date().getFullYear()},
    filters:{status:'',academic_year_id:'',class_group_id:'',document_type_id:'',document_status:'',overdue:false},
    pendencySummary:{truncated:false,total_documents:0,scanned_students:0,total_students:0},
    studentProtocols:[] as Row[], studentProtocolTotal:0,
    canInstall:false, updateAvailable:false,
  });
  let selectedFile: File|null = null;
  let identityFiles: {logo?:File;font?:File} = {};
  let sequence = 0;
  let installEvent: (Event & {prompt:()=>Promise<void>})|null = null;
  let waitingWorker: ServiceWorker|null = null;
  function resetFilters():void { state.filters={status:'',academic_year_id:'',class_group_id:'',document_type_id:'',document_status:'',overdue:false}; }
  function filteredClasses():Option[] { return options('class-groups').filter(o=>!state.filters.academic_year_id||state.catalogs['class-groups']?.find(c=>c.id===o.value)?.academic_year_id===state.filters.academic_year_id); }
  function filterQuery():string {
    const query=new URLSearchParams();
    const keys=state.page==='protocols'?['status','overdue']:state.page==='documents'?['academic_year_id','class_group_id','document_type_id','document_status']:['status','academic_year_id','class_group_id'];
    for(const key of keys){const value=(state.filters as unknown as Record<string,unknown>)[key];if(value)query.set(key,text(value));}
    return query.toString();
  }
  async function clearFilters():Promise<void>{resetFilters();state.q='';await search();}
  async function yearChanged():Promise<void>{state.filters.class_group_id='';await search();}
  function base(): string { return '/schools/' + state.schoolId; }
  function can(permission: string): boolean { return Boolean(state.user?.permissions.includes(permission)); }
  function isProfileRole(): boolean { return ['teacher','student','guardian'].includes(text(state.user?.role)); }
  function school(): PigeAPI.School|undefined { return state.schools.find(s=>s.id===state.schoolId); }
  function label(value: unknown): string { const key=text(value); return statusLabels[key] || key || '—'; }
  function date(value: unknown): string { const v=text(value); return v ? new Intl.DateTimeFormat('pt-BR',{timeZone:v.length===10?'UTC':'America/Bahia'}).format(new Date(v.length===10?v+'T12:00:00Z':v)) : '—'; }
  function cpf(value: unknown): string { const v=text(value); return v.length===11 ? `***.${v.slice(3,6)}.${v.slice(6,9)}-**` : 'Não informado'; }
  function initials(value: unknown): string { return text(value).split(' ').filter(Boolean).slice(0,2).map(v=>v[0]).join('').toUpperCase(); }
  function getName(list: string,id: unknown): string { return text(state.catalogs[list]?.find(x=>x.id===id)?.name) || '—'; }
  function options(list: string): Option[] { return (state.catalogs[list]||[]).map(x=>({value:x.id,label:text(x.name)+(list==='class-groups'?' · '+getName('academic-years',x.academic_year_id)+' · '+getName('shifts',x.shift_id):'')})); }
  function field(key:string,caption:string,type='text',required=false,opts?:Option[],wide=false):Field { return {key,label:caption,type,required,options:opts,wide}; }
  const studentFieldKeys=['previous_school','nis','sus_card','inep_code','health_plan','allergies','medications','health_notes','special_needs','authorized_transport','student_notes'];
  const personTypeLabels: Record<string,string> = {
    student:'Aluno', teacher:'Professor', collaborator:'Colaborador', employee:'Funcionário',
    parent:'Pai / mãe', mother:'Mãe', father:'Pai', guardian:'Responsável',
    financial_responsible:'Responsável financeiro', legal_responsible:'Responsável legal',
    staff:'Equipe / administrativo', supplier:'Fornecedor',service_provider:'Prestador de serviços',customer:'Cliente',partner:'Sócio',other:'Outro'
  };
  function personTypeLabel(value:unknown):string { const code=text(value);return personTypeLabels[code]||code.replace(/_/g,' ').replace(/^./,letter=>letter.toUpperCase()); }
  function personTypeOptions(extra:string[]=[]):Option[] {
    const codes=Array.from(new Set([...Object.keys(personTypeLabels),...extra]));
    return codes.map(value=>({value,label:personTypeLabel(value)}));
  }
  const canonicalTypes:Record<string,string>={parent:'guardian',mother:'guardian',father:'guardian',financial_responsible:'guardian',legal_responsible:'guardian',collaborator:'employee',staff:'employee'};
  const quickTypes=['student','teacher','employee','guardian','supplier','service_provider','customer','partner','other'];
  function selectedPersonTypes():string[]{return Array.from(new Set(personTypesFrom(state.modal.form).map(t=>canonicalTypes[t]||t)));}
  function lockedPersonType(type:string):boolean{const primary=state.modal.kind.split('-')[0];if(['student','teacher','employee','guardian'].includes(primary)&&type===primary)return true;return Boolean(PigeDossier.state.profiles[type]||(type==='guardian'&&PigeDossier.state.rows.some(r=>r.direction==='student'&&r.active&&!r.local)));}
  function togglePersonType(type:string):void{if(lockedPersonType(type)||state.busy||PigeDossier.state.loading)return;const types=personTypesFrom(state.modal.form);state.modal.form.person_types=selectedPersonTypes().includes(type)?types.filter(t=>(canonicalTypes[t]||t)!==type):[...types,type];state.personTypeQuery='';}
  function availablePersonTypes():string[]{const selected=selectedPersonTypes();return quickTypes.filter(t=>!selected.includes(t)&&personTypeLabel(t).toLocaleLowerCase('pt-BR').includes(state.personTypeQuery.toLocaleLowerCase('pt-BR'))&&(state.modal.form.entity_kind!=='organization'||['supplier','service_provider','customer','partner','other'].includes(t)));}
  function familyRelevant():boolean{return PigeDossier.eligible(state.modal.kind)&&state.modal.form.entity_kind!=='organization'&&(selectedPersonTypes().some(t=>['student','guardian'].includes(t))||PigeDossier.state.rows.length>0);}
  function personFields(extraTypes:string[]=[]):Field[] { return [
    field('entity_kind','Natureza da pessoa','select',true,[{value:'individual',label:'Pessoa física'},{value:'organization',label:'Pessoa jurídica'}]),
    field('cnpj','CNPJ'),field('trade_name','Nome fantasia'),field('state_registration','Inscrição estadual'),field('municipal_registration','Inscrição municipal'),
    field('registration_status','Situação cadastral CNPJ'),field('opened_on','Data de abertura'),field('legal_nature','Natureza jurídica'),field('main_activity','Atividade principal'),
    field('person_types','Tipos de pessoa','multiselect',false,personTypeOptions(extraTypes),true),
    field('name','Nome completo','text',true),field('social_name','Nome social'),field('cpf','CPF'),field('birth_date','Data de nascimento','date'),
    field('birth_certificate','Certidão / registro de nascimento'),field('birth_city','Cidade de nascimento'),field('birth_state','UF de nascimento'),
    field('nationality','Nacionalidade'),field('sex','Sexo','select',false,[{value:'female',label:'Feminino'},{value:'male',label:'Masculino'},{value:'intersex',label:'Intersexo'},{value:'not_informed',label:'Não informado'}]),
    field('gender','Identidade de gênero'),field('race_color','Raça / cor','select',false,[{value:'branca',label:'Branca'},{value:'preta',label:'Preta'},{value:'parda',label:'Parda'},{value:'amarela',label:'Amarela'},{value:'indigena',label:'Indígena'},{value:'not_informed',label:'Não informado'}]),
    field('marital_status','Estado civil','select',false,[{value:'single',label:'Solteiro(a)'},{value:'married',label:'Casado(a)'},{value:'divorced',label:'Divorciado(a)'},{value:'widowed',label:'Viúvo(a)'},{value:'not_informed',label:'Não informado'}]),
    field('rg','RG / documento de identidade'),field('rg_issuer','Órgão expedidor'),field('rg_state','UF do RG'),field('rg_issued_on','Data de expedição','date'),
    field('mother_name','Nome da mãe'),field('father_name','Nome do pai'),field('phone','Telefone / WhatsApp'),field('phone_secondary','Telefone secundário'),field('email','E-mail','email'),
    field('postal_code','CEP'),field('street','Logradouro'),field('address_number','Número'),field('address_complement','Complemento'),field('district','Bairro'),field('city','Cidade'),field('state','UF'),field('country','País'),
    field('address','Endereço livre / referência','text',false,undefined,true),field('occupation','Profissão'),field('employer','Empresa / empregador'),field('education','Escolaridade'),
    field('emergency_contact_name','Contato de emergência'),field('emergency_contact_phone','Telefone de emergência'),field('active','Cadastro ativo','checkbox'),
    field('photo','Foto da pessoa (PNG ou JPEG)','photo',false,undefined,true),field('notes','Observações administrativas','textarea',false,undefined,true)
  ]; }
  function studentFields():Field[] { return [
    field('previous_school','Escola anterior'),field('nis','NIS / PIS'),field('sus_card','Cartão SUS'),field('inep_code','Código INEP'),
    field('health_plan','Plano de saúde'),field('allergies','Alergias','textarea',false,undefined,true),field('medications','Medicamentos de uso contínuo','textarea',false,undefined,true),
    field('health_notes','Informações de saúde','textarea',false,undefined,true),field('special_needs','Necessidades específicas','textarea',false,undefined,true),
    field('authorized_transport','Transporte autorizado'),field('student_notes','Observações pedagógicas / administrativas','textarea',false,undefined,true)
  ]; }
  const employmentTypes:Option[] = [{value:'clt',label:'CLT'},{value:'public',label:'Serviço público'},{value:'temporary',label:'Temporário'},{value:'substitute',label:'Substituto'},{value:'intern',label:'Estágio'},{value:'outsourced',label:'Terceirizado'},{value:'other',label:'Outro'}];
  const employmentStatuses:Option[] = [{value:'active',label:'Ativo'},{value:'leave',label:'Afastado'},{value:'inactive',label:'Inativo'}];
  const teacherProfileKeys=['registration_number','professional_registration','employment_type','employment_status','admission_date','termination_date','inep_code','education_institution','degree_course','specialization','teaching_areas','workload_hours','profile_notes'];
  const employeeProfileKeys=['employee_number','employment_type','employment_status','admission_date','termination_date','department','job_title','work_schedule','supervisor_name','profile_notes'];
  function teacherFields():Field[] { return [
    field('registration_number','Matrícula funcional'),field('professional_registration','Registro profissional / conselho'),
    field('employment_type','Vínculo de trabalho','select',true,employmentTypes),field('employment_status','Situação funcional','select',true,employmentStatuses),
    field('admission_date','Data de admissão','date'),field('termination_date','Data de desligamento','date'),field('inep_code','Código INEP do docente'),
    field('education_institution','Instituição de formação'),field('degree_course','Curso / licenciatura'),field('specialization','Especializações / pós-graduação','textarea',false,undefined,true),
    field('teaching_areas','Áreas, componentes e etapas de atuação','textarea',false,undefined,true),field('workload_hours','Carga horária semanal','number'),
    field('profile_notes','Observações funcionais','textarea',false,undefined,true)
  ]; }
  function employeeFields():Field[] { return [
    field('employee_number','Matrícula funcional'),field('employment_type','Vínculo de trabalho','select',true,employmentTypes),
    field('employment_status','Situação funcional','select',true,employmentStatuses),field('admission_date','Data de admissão','date'),field('termination_date','Data de desligamento','date'),
    field('department','Setor / departamento'),field('job_title','Cargo / função'),field('work_schedule','Jornada / horário de trabalho'),field('supervisor_name','Gestor / responsável'),
    field('profile_notes','Observações funcionais','textarea',false,undefined,true)
  ]; }
  function photoFileId(row:unknown):string { return text((row as {photo_file_id?:unknown})?.photo_file_id); }
  async function hydratePhoto(row:unknown):Promise<void> {
    const id=photoFileId(row);if(!id||state.photoUrls[id])return;
    try{state.photoUrls[id]=await PigeAPI.objectUrl(base()+'/files/'+id+'/download');}catch{/* A listagem continua utilizável se a foto foi removida. */}
  }
  function photoSrc(row:unknown):string { const id=photoFileId(row);if(id&&!state.photoUrls[id])void hydratePhoto(row);return id?state.photoUrls[id]||'':''; }
  async function hydratePhotos(rows:unknown[]):Promise<void>{await Promise.all(rows.map(row=>hydratePhoto(row)));}
  function catalogFields(kind:string):Field[] {
    if(kind==='academic-years') return [field('name','Nome do ano letivo','text',true),field('starts_on','Data inicial','date',true),field('ends_on','Data final','date',true),field('status','Situação','select',true,[{value:'active',label:'Ativo'},{value:'closed',label:'Fechado'}])];
    if(kind==='class-groups') return [field('name','Nome da turma','text',true),field('unit_id','Unidade','select',true,options('units')),field('academic_year_id','Ano letivo','select',true,options('academic-years')),field('grade_id','Série / etapa','select',true,options('grades')),field('shift_id','Turno','select',true,options('shifts')),field('capacity','Capacidade','number',true),field('active','Turma ativa','checkbox')];
    if(kind==='document-types') return [field('name','Nome do documento','text',true),field('grade_id','Aplicável à série (vazio = todas)','select',false,options('grades')),field('required','Obrigatório para matrícula','checkbox'),field('active','Ativo','checkbox')];
    if(kind==='grades') return [field('name','Nome da série / etapa','text',true),field('level','Nível de ensino','text',true),field('active','Ativo','checkbox')];
    return [field('name','Nome','text',true),field('active','Ativo','checkbox')];
  }
  function notify(error:unknown):void { state.error=error instanceof Error?error.message:String(error); }
  async function safe(action:()=>Promise<void>):Promise<void> { state.error='';try{await action();}catch(error){notify(error);} }
  async function initialize():Promise<void> {
    await PigeInstitution.load();
    await safe(async()=>{
      const info=typeof PigeInstitution.state.configured==='boolean'?{configured:PigeInstitution.state.configured}:await PigeAPI.request<{configured:boolean;version?:string}>('/setup/status');state.configured=info.configured;if('version' in info)PigeInstitution.state.app_version=String(info.version);void PigeSupport.load();
      if(info.configured){try{const session=await PigeAPI.refresh();state.user=session.user;state.ready=true;void loadMyPhoto();await loadShell();}catch{state.user=null;}}
    });
    state.ready=true;
  }
  async function login():Promise<void> {
    state.loginBusy=true;state.error='';
    try{const result=await PigeAPI.post<Record<string,unknown>>('/auth/login',state.login);state.login.password='';if(await PigeMFA.accept(result))return;await afterMFA(result);}
    catch(error){notify(error);}finally{state.loginBusy=false;}
  }
  async function afterMFA(result:Record<string,unknown>):Promise<void>{const session=result as unknown as PigeAPI.SessionResponse;PigeAPI.useSession(session);state.user=session.user;state.modal=blankModal();void loadMyPhoto();await loadShell();}
  async function manageMFA():Promise<void>{if(state.modal.kind&&modalDirty()){state.modal.error='Salve ou cancele a edição do perfil antes de alterar o 2FA.';return;}openModal('mfa-manage','Segurança da minha conta',[]);await PigeMFA.manage();}
  async function editMFAPolicy():Promise<void>{await safe(async()=>{const cfg=await PigeAPI.request<Row>('/institution/mfa');if(!cfg.own_enabled){state.error='Ative primeiro seu 2FA em Meu perfil → Segurança. Depois defina a obrigatoriedade para a instituição.';return;}openModal('mfa-policy','Política de autenticação em duas etapas',[field('required','Exigir 2FA de todos os usuários e contas do portal','checkbox'),field('current_password','Sua senha atual','password',true),field('code','Código do seu autenticador ou de recuperação','text',true)],{required:Boolean(cfg.required)},cfg);});}
  async function configure():Promise<void>{
    state.loginBusy=true;state.error='';
    try{const {token,...data}=state.setup;const payload={...data,company_name:setupCompany.name,company_document:setupCompany.document,company_details:setupCompany};await PigeAPI.request('/setup',{method:'POST',headers:{'X-Setup-Token':token},body:JSON.stringify(payload)});state.configured=true;await PigeInstitution.load();state.login.email=data.admin_email;state.setup.admin_password='';state.setup.token='';state.success='Instalação concluída. Entre com seu usuário.';}
    catch(error){notify(error);}finally{state.loginBusy=false;}
  }
  async function loadShell():Promise<void>{
    state.schools=await PigeAPI.request<PigeAPI.School[]>('/schools');
    let saved:string|null=null;try{saved=localStorage.getItem('pige-school');}catch{/* Navegador pode restringir armazenamento no iframe. */}state.schoolId=state.schools.some(s=>s.id===saved)?saved!:state.schools[0]?.id||'';
    const hash=location.hash.replace(/^#\/?/,'');
    state.page=isProfileRole()?'dashboard':(pageLabels[hash]?hash:'dashboard');
    if(state.schoolId) await changeSchool();
    else state.error='Nenhuma escola está vinculada ao seu usuário. Solicite acesso ao administrador.';
  }
  async function changeSchool():Promise<void>{
    resetFilters();state.studentProtocols=[];state.studentProtocolTotal=0;state.photoUrls={};try{localStorage.setItem('pige-school',state.schoolId);}catch{/* Contexto incorporado sem localStorage. */}state.selectedStudent=null;state.studentDocs={items:[],checklist:[],issued:[]};state.rows=[];state.catalogs={};state.reportRows=[];state.reportClass='';state.q='';state.pageNumber=1;
    await safe(async()=>{if(!isProfileRole()&&state.page!=='academic')await Promise.all([loadCatalogs(),loadPage()]);else await loadPage();});
     void PigeSupport.load(state.schoolId);
  }
  async function loadCatalogs():Promise<void>{
    const sid=state.schoolId;
    const entries=await Promise.all(Object.keys(catalogLabels).map(async key=>[key,await PigeAPI.request<Row[]>(`/schools/${sid}/${key}`)] as const));
    if(state.schoolId===sid) state.catalogs=Object.fromEntries(entries);
  }
  async function loadSupportHub():Promise<void>{
    const companyId=text(state.schools.find(s=>s.id===state.schoolId)?.company_id);
    state.supportHub=companyId
      ? await PigeAPI.request<Row>('/companies/'+companyId+'/support-hub')
      : {id:'',company_id:'',enabled:false,base_url:'',position:'left',widget_type:'expanded_bubble',launcher_title:'Suporte',token_configured:false,version:1};
  }
  async function navigate(page:string):Promise<void>{
    if(state.busy||state.modal.kind||document.querySelector('.modal-backdrop'))return;
    if(isProfileRole() && page!=='dashboard'){state.page='dashboard';history.replaceState({},'', '#/dashboard');return;}
    resetFilters();state.registryFilter={type_code:'',entity_kind:'',active:''};if(registryPages.includes(page))state.cadastresOpen=true;state.page=page;state.pageNumber=1;state.q='';state.selectedStudent=null;state.error='';state.menuOpen=false;
    history.replaceState({},'',`#/${page}`);await safe(loadPage);
  }
  async function loadPage():Promise<void>{
    if(!state.schoolId)return;
    const current=++sequence,sid=state.schoolId;state.loading=true;state.rows=[];
    try{
      const query=`page=${state.pageNumber}&page_size=30&q=${encodeURIComponent(state.q)}&${filterQuery()}`;
      if(['online','banking','integrations','connect'].includes(state.page)){
        state.total=0;
      }else if(state.page==='dashboard'){
        if(isProfileRole()){
          const data=await PigeAPI.request<Row>('/profile/context');
          if(current===sequence)state.profileContext=data;
        }else{
          const data=await PigeAPI.request<Row>(base()+'/dashboard');if(current===sequence)state.dashboard=data;
        }
      }else if(state.page==='academic'){
        await loadCatalogs();if(current===sequence){state.rows=state.catalogs[state.catalog]||[];state.total=state.rows.length;}
      }else if(state.page==='documents'){
        const data=await PigeAPI.request<PigeAPI.Page<Row>&typeof state.pendencySummary>(base()+'/document-pendencies?'+query);if(current===sequence){state.rows=data.items;state.total=data.total;state.pendencySummary=data;}
      }else if(state.page==='settings'){
        if(can('schools.manage')){
          state.companies=await PigeAPI.request<Row[]>('/companies');
          await loadSupportHub();
        }
      }else if(state.page==='users'){
        const data=await PigeAPI.request<Row[]>('/users');if(current===sequence){state.rows=data;state.total=data.length;}
      }else if(state.page!=='reports'){
        const resource=['guardians','people',...Object.keys(businessTypes)].includes(state.page)?'persons':state.page;
        const rf=state.registryFilter,business=businessTypes[state.page];
        const suffix=(state.page==='guardians'?'&guardians_only=true':'')
          +((business?.code||rf.type_code)?'&type_code='+encodeURIComponent(business?.code||rf.type_code):'')
          +(rf.entity_kind?'&entity_kind='+rf.entity_kind:'')+(rf.active!==''?'&active='+rf.active:'');
        const data=await PigeAPI.request<PigeAPI.Page<Row>>(base()+'/'+resource+'?'+query+suffix);
        if(current===sequence&&sid===state.schoolId){state.rows=data.items;state.total=data.total;const photoRows=['students','teachers','employees'].includes(state.page)?data.items.map(x=>(x as {person?:unknown}).person):data.items;void hydratePhotos(photoRows);}
      }
    }finally{if(current===sequence)state.loading=false;}
  }
  async function setCatalog(kind:string):Promise<void>{state.catalog=kind;await safe(loadPage);}
  async function search():Promise<void>{state.pageNumber=1;await safe(loadPage);}
  async function page(delta:number):Promise<void>{state.pageNumber+=delta;await safe(loadPage);}
  async function viewStudent(id:string):Promise<void>{
    const sid=state.schoolId;state.loading=true;state.error='';
    try{
      const [student,docs,events,protocols]=await Promise.all([PigeAPI.request<Student>(base()+'/students/'+id),PigeAPI.request<typeof state.studentDocs>(base()+'/students/'+id+'/documents'),PigeAPI.request<Row[]>(base()+'/students/'+id+'/history'),PigeAPI.request<PigeAPI.Page<Row>>(base()+'/protocols?student_id='+id+'&page_size=100')]);
      if(sid!==state.schoolId)return;
      state.selectedStudent=student;state.studentDocs=docs;state.history=events;state.studentProtocols=protocols.items;state.studentProtocolTotal=protocols.total;void hydratePhotos([student.person,...(student.guardians||[]).map(g=>(g as {person?:unknown}).person)]);state.page='students';state.studentTab='cadastro';
    }catch(error){notify(error);}finally{state.loading=false;}
  }
  function openModal(kind:string,title:string,fields:Field[],values:PigeAPI.FormDataMap={},target:Row|null=null):void{
    const form:PigeAPI.FormDataMap={};for(const f of fields)form[f.key]=values[f.key]??(f.key==='entity_kind'?'individual':f.type==='checkbox'?(f.key==='active'):f.type==='number'?30:f.type==='multiselect'?[]:'');
    state.modal={kind,title,fields,form,target,action:'',error:''};selectedFile=null;identityFiles={};state.error='';state.discardChanges=false;state.reuseTarget='';
    state.personTypeQuery='';state.assistSource='';
    if(PigeDossier.eligible(kind)){
      const primary=kind.split('-')[0], additions:Field[]=[];
      for(const [profile,items] of [['student',studentFields()],['teacher',teacherFields()],['employee',employeeFields()]] as [string,Field[]][]){
        if(primary===profile)continue;
        for(const item of items){const key=profile+'__'+item.key;additions.push({...item,key,label:personTypeLabel(profile)+' · '+item.label});form[key]=item.key==='employment_type'?'other':item.key==='employment_status'?'active':item.type==='number'?0:'';}
      }
      state.modal.fields=[...fields,...additions];
    }
    const currentModal=state.modal;const loading=PigeDossier.start(base(),kind,form,target);
    state.modalInitial=JSON.stringify(form);state.modalSection=modalSections()[0]?.id||'general';
    void loading.then(()=>{if(state.modal===currentModal)state.modalInitial=JSON.stringify(state.modal.form);});
  }
  function modalDirty():boolean{return PigeDossier.dirty()||JSON.stringify(state.modal.form)!==state.modalInitial||Boolean(selectedFile)||Boolean(identityFiles.logo)||Boolean(identityFiles.font);}
  function closeModal(discard=false):void{
    if(state.busy||PigeMFA.state.busy)return;
    if(state.modal.kind==='mfa-manage'&&PigeMFA.state.codes.length){PigeMFA.state.error='Guarde os códigos e confirme para continuar.';return;}
    if(discard!==true&&state.modal.fields.length&&modalDirty()){state.discardChanges=true;return;}
    clearProfilePreview();state.modal=blankModal();state.discardChanges=false;
  }
  function valuesFrom(row:Row|PigeAPI.Person,fields:Field[]):PigeAPI.FormDataMap {const map:PigeAPI.FormDataMap={};for(const f of fields)map[f.key]=(row as unknown as Record<string,Value>)[f.key]??(f.type==='multiselect'?[]:'');return map;}
  function personTypesFrom(row:unknown):string[]{const value=(row as {person_types?:unknown})?.person_types;return Array.isArray(value)?value.map(text):[];}
  function isBusiness():boolean{return Boolean(businessTypes[state.page]);}
  function isPersonModal():boolean{return ['person','guardian','student','student-edit','teacher','teacher-edit','employee','employee-edit','business'].includes(state.modal.kind);}
  const personalKeys=new Set(['social_name','cpf','birth_date','rg','rg_issuer','rg_state','rg_issued_on','birth_certificate','birth_city','birth_state','nationality','sex','gender','race_color','marital_status','mother_name','father_name','occupation','employer','education','emergency_contact_name','emergency_contact_phone']);
  function modalFieldRelevant(f:Field):boolean{
    const kind=state.modal.kind,legal=state.modal.form.entity_kind==='organization';
    if(!isPersonModal())return true;
    if(f.key==='person_types')return false;
    if(f.key.includes('__'))return selectedPersonTypes().includes(f.key.split('__')[0]);
    if(f.key==='entity_kind'&&kind!=='person'&&kind!=='business')return false;
    if(['cnpj','trade_name','state_registration','municipal_registration','registration_status','opened_on','legal_nature','main_activity'].includes(f.key))return legal;
    return !(legal&&personalKeys.has(f.key));
  }
  const complementaryKeys=new Set(['social_name','birth_certificate','birth_city','birth_state','nationality','sex','gender','race_color','marital_status','rg','rg_issuer','rg_state','rg_issued_on','mother_name','father_name','notes','state_registration','municipal_registration']);
  function advancedPersonField(f:Field):boolean{return isPersonModal()&&complementaryKeys.has(f.key);}
  function modalFieldLabel(f:Field):string{if(f.key==='photo'&&state.modal.form.entity_kind==='organization')return 'Imagem / logotipo (PNG ou JPEG)';return f.key==='name'&&state.modal.form.entity_kind==='organization'?'Razão social':f.label;}
  function fieldSection(f:Field):string{
    if(!isPersonModal()&&!state.modal.kind.endsWith('-existing'))return 'details';
    const k=f.key;
    if(k.includes('__')||k.startsWith('business_')||studentFieldKeys.includes(k)||teacherProfileKeys.includes(k)||employeeProfileKeys.includes(k)||['occupation','employer','education'].includes(k))return 'specific';
    if(['postal_code','street','address_number','address_complement','district','city','state','country','address','phone','phone_secondary','email','emergency_contact_name','emergency_contact_phone'].includes(k))return 'contact';
    return 'general';
  }
  const sectionLabels:Record<string,{title:string;hint:string}>={
    general:{title:'Dados gerais',hint:'Identificação e documentos da pessoa. Os tipos são selecionados no topo.'},
    contact:{title:'Contatos e endereço',hint:'Informações compartilhadas entre os cadastros desta pessoa.'},
    specific:{title:'Dados específicos',hint:'Informações dos tipos selecionados. Matrículas e turmas continuam em seus próprios cadastros.'},
    links:{title:'Vínculos',hint:'Alunos, familiares e responsabilidades.'},
    details:{title:'Dados do lançamento',hint:'Revise as informações antes de confirmar.'}
  };
  function modalSections():{id:string;title:string;hint:string;fields:Field[]}[]{
    return Object.entries(sectionLabels).map(([id,value])=>({id,...value,fields:state.modal.fields.filter(f=>modalFieldRelevant(f)&&fieldSection(f)===id)})).filter(s=>s.fields.length>0||(s.id==='links'&&familyRelevant()));
  }
  function modalTab(id:string):void{state.modalSection=id;void Vue.nextTick(()=>document.querySelector('.modal-form .modal-body')?.scrollTo({top:0}));}
  function visibleSection(id:string):boolean{const all=modalSections();return (all.some(s=>s.id===state.modalSection)?state.modalSection:all[0]?.id)===id;}
  async function validateModal():Promise<boolean>{
    const form=document.querySelector<HTMLFormElement>('.modal-form');if(!form)return true;
    const invalid=Array.from(form.querySelectorAll<HTMLInputElement>('input,select,textarea')).find(el=>!el.disabled&&!el.checkValidity());
    if(!invalid)return true;
    const group=invalid.closest<HTMLElement>('[data-form-section]');if(group)state.modalSection=group.dataset.formSection||'';
    state.modal.error='Revise o campo: '+(invalid.closest('label')?.querySelector('span')?.textContent?.trim()||'informação obrigatória')+'.';
    const details=invalid.closest('details');if(details)details.open=true;
    await Vue.nextTick();invalid.focus();invalid.reportValidity();return false;
  }
  function businessFields():Field[]{
    const common=personFields().filter(f=>!['person_types','birth_date','birth_certificate','birth_city','birth_state','nationality','sex','gender','race_color','marital_status','mother_name','father_name','occupation','employer','education','emergency_contact_name','emergency_contact_phone','rg','rg_issuer','rg_state','rg_issued_on'].includes(f.key));
    const config=businessTypes[state.page];
    return [...common,field('business_contact_name','Pessoa de contato'),field('business_category',config?.category||'Categoria'),field('business_reference','Referência interna'),field('business_notes','Observações deste vínculo','textarea',false,undefined,true)];
  }
  function newBusiness(existing:Row|null=null):void{
    const config=businessTypes[state.page];if(!config)return;
    const profile=(existing?.business_profiles as Record<string,PigeAPI.FormDataMap>|undefined)?.[config.code]||{};
    const fields=existing&&state.reuseTarget?businessFields().filter(f=>f.key.startsWith('business_')):businessFields();
    const values:PigeAPI.FormDataMap=existing?valuesFrom(existing,fields):{active:true,entity_kind:'individual'};
    for(const key of ['contact_name','category','reference','notes'])values['business_'+key]=profile[key]||'';
    openModal('business',(existing?'Editar ':'Cadastrar ')+config.singular,fields,values,existing);
    state.modal.action=config.code;
  }
  async function reusePerson():Promise<void>{await safe(async()=>{
    const target=state.page;await searchPersons();openModal('reuse','Vincular pessoa existente',[field('person_id','Pessoa cadastrada','person',true)]);state.reuseTarget=target;
  });}
  async function useExisting():Promise<void>{
    const row=state.personChoices.find(p=>p.id===state.modal.form.person_id);if(!row)throw new Error('Selecione a pessoa cadastrada.');
    const context=state.reuseTarget;
    if(context==='students')newStudent(row);
    else if(context==='teachers')newTeacher(row);
    else if(context==='employees')newEmployee(row);
    else if(context==='guardians'){
      await PigeAPI.post(base()+'/persons/'+row.id+'/responsible',{version:row.version,data:{}});
      state.modal=blankModal();await loadPage();state.success='Pessoa vinculada como responsável, sem duplicar seu cadastro.';
    }else if(businessTypes[context]){
      const config=businessTypes[context];
      openModal('business-existing','Adicionar vínculo de '+config.singular,businessFields().filter(f=>f.key.startsWith('business_')),{},row);state.modal.action=config.code;
    }
  }
  function personDocument(row:Row):string{return text(row.cnpj)||cpf(row.cpf);}
  function newPerson():void{openModal('person','Cadastrar pessoa',personFields(),{active:true,person_types:[]});}
  function newStudent(existing:Row|null=null):void{
    if(existing){openModal('student-existing','Adicionar aluno à pessoa',studentFields(),{},existing);return;}
    const fields=[...personFields(),...studentFields()];const birth=fields.find(f=>f.key==='birth_date');if(birth)birth.required=true;openModal('student','Cadastrar aluno',fields,{active:true,person_types:['student']});
  }
  function editStudent():void{
    const student=state.selectedStudent;if(!student)return;
    const types=personTypesFrom(student.person),personFieldsList=personFields(types),fields=[...personFieldsList,...studentFields()];
    openModal('student-edit','Editar cadastro completo do aluno',fields,{...valuesFrom(student.person,personFieldsList),...valuesFrom(student,studentFields()),is_guardian:student.person.is_guardian,person_types:types},student as unknown as Row);
  }
  function newGuardian():void{openModal('guardian','Cadastrar responsável',personFields(),{active:true,person_types:['guardian']});}
  function newTeacher(existing:Row|null=null):void{
    if(existing){openModal('teacher-existing','Adicionar professor à pessoa',teacherFields(),{employment_type:'other',employment_status:'active',workload_hours:0},existing);return;}
    openModal('teacher','Cadastrar professor',[...personFields(['teacher']),...teacherFields()],{active:true,person_types:['teacher'],employment_type:'other',employment_status:'active',workload_hours:0});
  }
  function editTeacher(row:Row):void{
    const person=(row as unknown as {person:PigeAPI.Person}).person,personList=personFields(personTypesFrom(person)),profileFields=teacherFields();
    openModal('teacher-edit','Editar cadastro do professor',profileFields.concat(personList),{...valuesFrom(person,personList),...valuesFrom(row,profileFields),person_types:personTypesFrom(person),is_guardian:person.is_guardian},row);
  }
  function newEmployee(existing:Row|null=null):void{
    if(existing){openModal('employee-existing','Adicionar funcionário à pessoa',employeeFields(),{employment_type:'other',employment_status:'active'},existing);return;}
    openModal('employee','Cadastrar funcionário',[...personFields(['employee']),...employeeFields()],{active:true,person_types:['employee'],employment_type:'other',employment_status:'active'});
  }
  function editEmployee(row:Row):void{
    const person=(row as unknown as {person:PigeAPI.Person}).person,personList=personFields(personTypesFrom(person)),profileFields=employeeFields();
    openModal('employee-edit','Editar cadastro do funcionário',profileFields.concat(personList),{...valuesFrom(person,personList),...valuesFrom(row,profileFields),person_types:personTypesFrom(person),is_guardian:person.is_guardian},row);
  }
  function editPerson(row:Row):void{const types=personTypesFrom(row);openModal(state.page==='guardians'?'guardian':'person',state.page==='guardians'?'Editar responsável':'Editar cadastro da pessoa',personFields(types),valuesFrom(row,personFields(types)),row);}
  function newCatalog(row:Row|null=null):void{const fields=catalogFields(state.catalog);const defaults:PigeAPI.FormDataMap={active:true,capacity:30,status:'active',level:'Educação básica'};openModal('catalog',(row?'Editar ':'Cadastrar ')+catalogLabels[state.catalog],fields,row?valuesFrom(row,fields):defaults,row);state.modal.action=state.catalog;}
  async function searchStudents(value=''):Promise<void>{
    const data=await PigeAPI.request<PigeAPI.Page<Student>>(base()+'/students?page_size=100&q='+encodeURIComponent(value));state.studentChoices=data.items;
  }
  async function searchPersons(value=''):Promise<void>{
    const data=await PigeAPI.request<PigeAPI.Page<Row>>(base()+'/persons?page_size=100&q='+encodeURIComponent(value));state.personChoices=data.items;
  }
  async function newEnrollment():Promise<void>{await safe(async()=>{
    await searchStudents();await searchPersons();const selected=state.selectedStudent;
    if(selected&&!state.studentChoices.some(s=>s.id===selected.id))state.studentChoices.unshift(selected);
    const fields=[
      field('student_id','Aluno','student',true),field('class_group_id','Turma de destino','select',true,options('class-groups')),
      field('enrolled_on','Data da matrícula','date',true),
      field('enrollment_type','Tipo de entrada','select',true,[{value:'new',label:'Nova matrícula'},{value:'renewal',label:'Rematrícula'},{value:'transfer_in',label:'Transferência recebida'},{value:'returning',label:'Retorno'}]),
      field('financial_person_id','Responsável financeiro','person'),field('origin_school','Escola de origem'),field('origin_city','Cidade de origem'),
      field('entry_reason','Motivo / observação de entrada','textarea',false,undefined,true),field('external_reference','Referência externa'),field('notes','Observações','textarea',false,undefined,true)
    ];
    openModal('enrollment','Nova matrícula',fields,{student_id:selected?.id||'',enrolled_on:new Date().toISOString().slice(0,10),enrollment_type:'new'});
  });}
  async function viewEnrollment(id:string):Promise<void>{await safe(async()=>{const data=await PigeAPI.request<Row>(base()+'/enrollments/'+id);openModal('enrollment-detail','Matrícula '+text(data.number),[],{},data);});}
  function editDraft():void{
    const target=state.modal.target;if(!target||target.status!=='draft')return;
    const groups=options('class-groups').filter(o=>state.catalogs['class-groups'].find(c=>c.id===o.value)?.academic_year_id===target.academic_year_id);
    const fields=[field('class_group_id','Turma de destino','select',true,groups),field('enrolled_on','Data da matrícula','date',true),field('notes','Observações','textarea',false,undefined,true),field('reason','Motivo da alteração','textarea',true,undefined,true)];
    openModal('draft-edit','Editar pré-matrícula',fields,valuesFrom(target,fields),target);
  }
  async function viewProtocol(id:string):Promise<void>{await safe(async()=>{
    const data=await PigeAPI.request<Row>(base()+'/protocols/'+id);openModal('protocol-detail','Protocolo '+text(data.number),[],{},data);
  });}
  function protocolNote():void{
    const target=state.modal.target;if(!target)return;
    openModal('protocol-note','Registrar atendimento',[field('message','Registro do atendimento','textarea',true,undefined,true)],{},target);
  }
  async function protocolReceipt(id:string):Promise<void>{await safe(()=>PigeAPI.download(base()+'/protocols/'+id+'/pdf','comprovante-protocolo.pdf'));}
  async function exportPendencies(format:string):Promise<void>{await safe(()=>PigeAPI.download(base()+'/reports/document-pendencies.'+format+'?q='+encodeURIComponent(state.q)+'&'+filterQuery(),'pendencias-documentais.'+format));}
  function startMovement(action:string):void{
    const target=state.modal.target;if(!target)return;
    const titles:Record<string,string>={activate:'Ativar matrícula',change_class:'Mudar de turma / turno',suspend:'Suspender matrícula',reactivate:'Reativar matrícula',transfer:'Registrar transferência externa',cancel:'Cancelar matrícula',complete:'Concluir matrícula'};
    const fields=[field('reason','Motivo / justificativa','textarea',true,undefined,true)];
    if(action==='change_class')fields.unshift(field('class_group_id','Turma de destino','select',true,options('class-groups')));
    openModal('movement',titles[action],fields,{},target);state.modal.action=action;
  }
  function reenroll():void{
    const target=state.modal.target;if(!target)return;
    openModal('reenroll','Rematricular em outro ano', [field('class_group_id','Turma do novo período','select',true,options('class-groups')),field('enrolled_on','Data da rematrícula','date',true),field('notes','Observações','textarea',false,undefined,true)],{enrolled_on:new Date().toISOString().slice(0,10)},target);
  }
  async function newLink():Promise<void>{await safe(async()=>{
    await searchPersons();openModal('link','Vincular responsável', [field('person_id','Pessoa cadastrada','person',true),field('relationship','Parentesco / vínculo','text',true),field('legal','Responsável legal','checkbox'),field('financial','Responsável financeiro','checkbox'),field('pickup','Autorizado para retirada','checkbox'),field('primary_contact','Contato principal','checkbox')],{relationship:'Responsável',legal:true});
  });}
  function editLink(link:Row):void{
    const fields=[field('relationship','Parentesco / vínculo','text',true),field('legal','Responsável legal','checkbox'),field('financial','Responsável financeiro','checkbox'),field('pickup','Autorizado para retirada','checkbox'),field('primary_contact','Contato principal','checkbox'),field('active','Vínculo ativo','checkbox')];
    openModal('link-edit','Editar vínculo familiar',fields,valuesFrom(link,fields),link);
  }
  function uploadDocument():void{openModal('upload','Receber documento', [field('document_type_id','Tipo de documento','select',true,options('document-types')),field('expires_on','Validade (opcional)','date'),field('file','Arquivo PDF, PNG ou JPEG','file',true,undefined,true),field('notes','Observações','textarea',false,undefined,true)]);}
  function fileChange(event:Event):void{selectedFile=(event.target as HTMLInputElement).files?.[0]||null;}
  function reviewDocument(doc:Row,status:string):void{openModal('review',status==='validated'?'Validar documento':status==='archived'?'Arquivar documento':'Rejeitar documento',[field('notes','Justificativa da análise','textarea',true,undefined,true)],{},doc);state.modal.action=status;}
  function waiveDocument():void{openModal('waiver','Dispensar documento obrigatório',[field('document_type_id','Tipo de documento','select',true,options('document-types')),field('reason','Motivo da dispensa','textarea',true,undefined,true)]);}
  function issueDocument(kind='student_record',enrollment:Row|null=null):void{
    const selected=state.selectedStudent;
    if(!selected&&!enrollment)return;
    const enrollmentChoices=(selected?.enrollments||[]).map(e=>({value:e.id,label:text(e.number)+' · '+getName('academic-years',e.academic_year_id)}));
    const fields=[field('kind','Documento','select',true,[{value:'student_record',label:'Ficha do aluno'},{value:'enrollment_receipt',label:'Comprovante de matrícula'},{value:'enrollment_declaration',label:'Declaração de matrícula'},{value:'enrollment_form',label:'Ficha de matrícula (inclusive rascunho)'}]),field('enrollment_id','Matrícula (comprovantes e declarações exigem situação ativa)','select',false,enrollment?[{value:enrollment.id,label:text(enrollment.number)}]:enrollmentChoices)];
    openModal('issue','Emitir documento em PDF',fields,{kind,enrollment_id:enrollment?.id||''},enrollment);
  }
  async function newProtocol(row:Row|null=null):Promise<void>{await safe(async()=>{await searchStudents();const studentId=text(row?.student_id)||state.selectedStudent?.id;
    if(studentId&&!state.studentChoices.some(s=>s.id===studentId))state.studentChoices.unshift(await PigeAPI.request<Student>(base()+'/students/'+studentId));
    const fields=[field('kind','Tipo de solicitação','text',true),field('student_id','Aluno (opcional)','student'),field('description','Descrição / observações','textarea',false,undefined,true),field('due_on','Prazo','date'),field('status','Situação','select',true,['open','in_progress','waiting','completed','cancelled'].map(v=>({value:v,label:label(v)})))];openModal('protocol',row?'Atualizar protocolo':'Abrir protocolo',fields,row?valuesFrom(row,fields):{status:'open',student_id:studentId||''},row);});}
  async function editIdentity():Promise<void>{await safe(async()=>{
    await PigeInstitution.load();
    const fields=[field('display_name','Nome de apresentação da escola','text',true),field('short_name','Nome curto no aplicativo','text',true),field('primary_color','Cor principal','color',true),field('secondary_color','Cor dos títulos','color',true),field('font_family','Tipografia','select',true,[{value:'system',label:'Padrão do dispositivo'},{value:'arial',label:'Arial'},{value:'verdana',label:'Verdana'},{value:'georgia',label:'Georgia'},{value:'times',label:'Times New Roman'},{value:'custom',label:'Fonte própria da escola (tela e PDF)'}]),field('logo','Logotipo da escola (PNG, JPEG ou WebP)','identity-logo',false,undefined,true),field('font','Fonte da escola para tela e PDF (TTF ou WOFF2)','identity-font',false,undefined,true),field('font_license_confirmed','Confirmo a licença de uso web e incorporação em PDF da fonte enviada','checkbox'),field('remove_logo','Remover o logotipo atual','checkbox'),field('remove_font','Remover a fonte enviada anteriormente','checkbox'),field('show_preenrollment_button','Exibir botão de pré-matrícula na tela de login','checkbox',false,undefined,true)];
    const identity=PigeInstitution.state;
    openModal('identity','Identidade visual da escola',fields,{display_name:identity.display_name,short_name:identity.short_name,primary_color:identity.primary_color,secondary_color:identity.secondary_color,font_family:identity.font_family,show_preenrollment_button:identity.show_preenrollment_button},{id:'1',version:identity.version});
  });}
  async function editEmbedding():Promise<void>{await safe(async()=>{
    state.embeddingProbe={busy:false,message:'',frame_policy:'',x_frame_options:''};
    const row=await PigeAPI.request<Row>('/institution/embedding');
    const fields=[field('enabled','Permitir abertura dentro dos sites autorizados','checkbox'),field('allowed_origins','Origens autorizadas — uma por linha','textarea',false,undefined,true),field('current_password','Sua senha atual para confirmar a alteração','password',true)];
    openModal('embedding-security','Incorporação no HUB',fields,{enabled:Boolean(row.enabled),allowed_origins:(row.allowed_origins as string[]).join('\n'),current_password:''},row);
  });}
  async function probeEmbedding():Promise<void>{
    const probe=state.embeddingProbe;probe.busy=true;probe.message='';probe.frame_policy='';probe.x_frame_options='';
    try{
      let method='HEAD';let response=await fetch('/',{method,cache:'no-store',credentials:'omit'});
      if(response.status===405){method='GET';response=await fetch('/',{method,cache:'no-store',credentials:'omit'});}
      const policies=response.headers.get('Content-Security-Policy')||'';
      probe.frame_policy=policies.split(/[,;]/).map(s=>s.trim()).filter(s=>s.startsWith('frame-ancestors')).join(' | ');
      probe.x_frame_options=response.headers.get('X-Frame-Options')||'';
      const blocked=probe.frame_policy.includes("'none'")||probe.x_frame_options.toUpperCase()==='DENY';
      probe.message=method+' '+response.status+' · versão '+(response.headers.get('X-App-Version')||'não informada')+'. '+(blocked?'A resposta pública ainda bloqueia incorporação. Salve as origens e confira se o proxy acrescenta restrições.':'Confira abaixo se a origem exata do HUB está autorizada em todas as políticas. O teste final é a abertura pelo navegador no HUB.');
      if(method==='GET')probe.message+=' O HEAD respondeu 405: a imagem/rota pública ainda precisa ser atualizada.';
    }catch(error){probe.message='Não foi possível verificar a resposta pública: '+(error instanceof Error?error.message:String(error));}
    finally{probe.busy=false;}
  }
  function identityFileChange(event:Event,key:string):void {if(key==='logo'||key==='font')identityFiles[key]=(event.target as HTMLInputElement).files?.[0];}
  async function manageUnits():Promise<void>{await navigate('academic');await setCatalog('units');}
  function editMaintainer():void {
    const row=state.companies.find(c=>c.id===school()?.company_id);if(!row)return;
    const fields=companyFields();
    openModal('company-edit','Dados da mantenedora',fields,valuesFrom(row,fields),row);
  }
  function newCompany():void{openModal('company','Cadastrar empresa / mantenedora',companyFields());}

  const familyAssistFields=['name', 'cpf', 'birth_date', 'phone', 'email', 'rg', 'rg_issuer', 'birth_certificate', 'mother_name', 'father_name', 'postal_code', 'street', 'address_number', 'address_complement', 'district', 'city', 'state', 'country', 'address'];
  const companyExtra=[['trade_name','Nome fantasia'],['address','Endereço completo'],['postal_code','CEP'],['street','Logradouro'],['address_number','Número'],['address_complement','Complemento'],['district','Bairro'],['city','Cidade'],['state','UF'],['country','País'],['phone','Telefone'],['email','E-mail'],['registration_status','Situação cadastral'],['opened_on','Abertura'],['legal_nature','Natureza jurídica'],['main_activity','Atividade principal']];
  const setupCompany=Vue.reactive<Record<string,string>>(Object.fromEntries([['name',''],['document',''],...companyExtra.map(([key])=>[key,''])]));
  const setupCompanyFields=['name','document',...companyExtra.map(([key])=>key)];
  function companyFields():Field[]{return [field('name','Razão social','text',true),field('document','CPF / CNPJ'),...companyExtra.map(([key,caption])=>field(key,caption,key==='email'?'email':'text'))];}
  const assistRequest=PigeAPI.request;
  function assistEligible():boolean{return isPersonModal()||['company','company-edit','school'].includes(state.modal.kind);}
  function assistFields():string[]{return state.modal.fields.filter(modalFieldRelevant).map(f=>f.key);}
  function assistCompany():boolean{return ['company','company-edit'].includes(state.modal.kind);}
  async function setupLookup<T>(path:string,options:RequestInit={}):Promise<T>{return PigeAPI.request<T>(path,{...options,headers:{'X-Setup-Token':state.setup.token}});}
  async function readResponsibleDocument(id:string):Promise<void>{await safe(async()=>{await searchPersons();openModal('ocr-target','Escolher pessoa responsável para a leitura',[field('person_id','Pessoa responsável cadastrada','person',true)]);state.assistSource=base()+'/files/'+id+'/ocr';});}
  function readStudentDocument(id:string):void{editStudent();state.assistSource=base()+'/files/'+id+'/ocr';}
  async function editIntake():Promise<void>{await safe(async()=>{const cfg=await PigeAPI.request<Row>('/institution/intake');openModal('intake-settings','Leitura de documentos e consultas cadastrais',[field('ocr_enabled','Permitir leitura local de documentos (OCR)','checkbox'),field('lookups_enabled','Permitir consulta online de CNPJ e CEP','checkbox')],{ocr_enabled:Boolean(cfg.ocr_enabled),lookups_enabled:Boolean(cfg.lookups_enabled)},cfg);});}

  function newSchool(row:Row|null=null):void{const fields=[field('company_id','Empresa / mantenedora','select',true,state.companies.map(c=>({value:c.id,label:text(c.name)}))),field('name','Nome da escola','text',true),field('address','Endereço','text',false,undefined,true),field('phone','Telefone'),field('email','E-mail','email'),field('document_policy','Pendências na ativação da matrícula','select',true,[{value:'warn',label:'Avisar sem bloquear'},{value:'block',label:'Exigir validação dos documentos obrigatórios'}]),field('active','Escola ativa','checkbox')];openModal('school',row?'Editar escola':'Cadastrar escola',fields,row?valuesFrom(row,fields):{document_policy:'warn',active:true},row);}
   function editSupportHub():void{
     const companyId=text(state.schools.find(s=>s.id===state.schoolId)?.company_id);
     if(!companyId)return;
     const fields=[
       field('enabled','Exibir chat de suporte no site','checkbox'),
       field('base_url','URL base do Hub','url',false,undefined,true),
       field('token','Website token do Hub','password',false,undefined,true),
       field('position','Posição do botão','select',true,[{value:'left',label:'Esquerda'},{value:'right',label:'Direita'}]),
       field('widget_type','Tipo do botão','select',true,[{value:'expanded_bubble',label:'Bolha expandida'},{value:'standard',label:'Bolha padrão'}]),
       field('launcher_title','Texto do botão','text',true),
     ];
     openModal('support-hub','Chat de suporte via site',fields,{...state.supportHub,token:''},state.supportHub);
   }
  async function newUser(row:Row|null=null):Promise<void>{
    await searchPersons();
    const fields=[field('name','Nome completo','text',true)];
    if(!row)fields.push(field('email','E-mail de acesso','email',true),field('password','Senha inicial (mínimo 12 caracteres)','password',true));
    fields.push(field('role','Perfil','select',true,['admin','direction','coordination','secretary','teacher','student','guardian','viewer'].map(v=>({value:v,label:label(v)}))),field('person_id','Pessoa vinculada (Professor, Aluno ou Responsável)','person',false),field('school_ids','Escolas autorizadas','multiselect',false,state.schools.map(s=>({value:s.id,label:s.name})),true));
    if(row)fields.push(field('active','Usuário ativo','checkbox'));
    openModal('user',row?'Editar acesso':'Criar usuário',fields,row?valuesFrom(row,fields):{role:'secretary',person_id:'',school_ids:[state.schoolId]},row);
  }
  async function loadMyPhoto():Promise<void>{
    const id=state.user?.id;
    if(state.userPhotoUrl)URL.revokeObjectURL(state.userPhotoUrl);state.userPhotoUrl='';
    if(!id||!state.user?.has_photo)return;
    try{const url=await PigeAPI.objectUrl('/auth/profile/photo');if(state.user?.id===id)state.userPhotoUrl=url;else URL.revokeObjectURL(url);}catch{/* Foto não bloqueia a sessão. */}
  }
  function clearProfilePreview():void{if(state.profilePhotoPreview)URL.revokeObjectURL(state.profilePhotoPreview);state.profilePhotoPreview='';}
  function myPhotoChange(event:Event):void{
    clearProfilePreview();selectedFile=(event.target as HTMLInputElement).files?.[0]||null;
    if(selectedFile&&selectedFile.size>2*1024*1024){state.modal.error='A foto deve ter no máximo 2 MB.';selectedFile=null;return;}
    if(selectedFile){state.profilePhotoPreview=URL.createObjectURL(selectedFile);state.modal.form.remove_photo=false;}
  }
  async function editMyProfile():Promise<void>{await safe(async()=>{
    const row=await PigeAPI.request<Row>('/auth/profile');
    const fields=[field('name','Nome de exibição','text',true),field('email','E-mail de acesso','email',true),field('phone','Telefone / WhatsApp','tel'),field('job_title','Cargo / função'),field('department','Setor / departamento'),field('photo','Foto do usuário (PNG, JPEG ou WebP, até 2 MB)','user-photo',false,undefined,true),field('remove_photo','Remover minha foto','checkbox'),field('bio','Sobre mim','textarea',false,undefined,true),field('current_password','Senha atual (somente para trocar o e-mail)','password')];
    clearProfilePreview();openModal('my-profile','Meu perfil',fields,{...valuesFrom(row,fields),remove_photo:false},row);
  });}
  function profilePassword():void{if(modalDirty()){state.modal.error='Salve ou cancele as alterações antes de trocar a senha.';return;}password();}
  function password():void{openModal('password','Alterar minha senha',[field('current_password','Senha atual','password',true),field('new_password','Nova senha (mínimo 12 caracteres)','password',true)]);}
  function archiveStudent():void{if(state.selectedStudent)openModal('archive','Arquivar cadastro do aluno',[field('reason','Justificativa','textarea',true,undefined,true)],{},state.selectedStudent);}
  async function downloadFile(id:string,name='documento.pdf'):Promise<void>{await safe(()=>PigeAPI.download(base()+'/files/'+id+'/download',name));}
  async function saveModal():Promise<void>{
    if(state.busy||PigeDossier.state.loading||!await validateModal())return;state.busy=true;state.modal.error='';
    const modal=state.modal,form={...modal.form},target=modal.target,studentId=state.selectedStudent?.id;let createdStudent:Student|null=null;let savedPersonId='';
    try{
      const photo=selectedFile;delete form.photo;
      if(modal.kind==='ocr-target'){const source=state.assistSource;const data=await PigeAPI.request<{person:Row}>(base()+'/persons/'+form.person_id+'/dossier');editPerson(data.person);state.assistSource=source;return;}
      if(modal.kind==='reuse'){await useExisting();return;}
      if(PigeDossier.eligible(modal.kind)){
        const saved=await PigeDossier.save(modal.kind,form,photo);savedPersonId=saved.person.id;
        if(modal.kind==='student'&&saved.profiles.student)createdStudent={...saved.profiles.student,person:saved.person} as unknown as Student;
      }else if(modal.kind==='business'||modal.kind==='business-existing'){
        const details:Record<string,Value>={};for(const key of ['contact_name','category','reference','notes']){details[key]=form['business_'+key]||'';delete form['business_'+key];}
        const endpoint=base()+'/business-persons/'+modal.action;
        if(modal.kind==='business-existing'){
          await PigeAPI.post(endpoint,{person_id:target!.id,version:target!.version,details});savedPersonId=target!.id;
        }else if(target){
          await PigeAPI.patch(endpoint+'/'+target.id,{version:target.version,person:form,details});savedPersonId=target.id;
        }else{
          const created=await PigeAPI.post<Row>(endpoint,{person:form,details});savedPersonId=created.id;
        }
      }else if(modal.kind==='student-existing'){
        const studentData:{[key:string]:Value}={};for(const key of studentFieldKeys){studentData[key]=form[key]??'';}
        createdStudent=await PigeAPI.post<Student>(base()+'/students',{person_id:target!.id,...studentData});
        savedPersonId=target!.id;
      }else if(modal.kind==='student'){
        const studentData:{[key:string]:Value}={};for(const key of studentFieldKeys){studentData[key]=form[key]??'';delete form[key];}
        const types=Array.isArray(form.person_types)?form.person_types.map(text):[];
        const person={...form,person_types:Array.from(new Set([...types,'student'])),cpf:form.cpf||null,birth_date:form.birth_date||null,rg_issued_on:form.rg_issued_on||null,is_guardian:false};
        const previous=text(studentData.previous_school);createdStudent=await PigeAPI.post<Student>(base()+'/students',{person,previous_school:previous,...studentData});
        savedPersonId=createdStudent.person.id;
      }else if(modal.kind==='student-edit'){
        const studentData:{[key:string]:Value}={};for(const key of studentFieldKeys){studentData[key]=form[key]??'';delete form[key];}
        const personTarget=(target as unknown as Student).person;
        const types=Array.isArray(form.person_types)?form.person_types.map(text):[];
        await PigeAPI.patch(base()+'/persons/'+personTarget.id,{version:personTarget.version,data:{...form,person_types:Array.from(new Set([...types,'student'])),cpf:form.cpf||null,birth_date:form.birth_date||null,rg_issued_on:form.rg_issued_on||null,is_guardian:Boolean(personTarget.is_guardian)}});
        await PigeAPI.patch(base()+'/students/'+target!.id,{version:target!.version,data:studentData});
        savedPersonId=personTarget.id;
      }else if(['teacher','teacher-existing','teacher-edit','employee','employee-existing','employee-edit'].includes(modal.kind)){
        const isTeacher=modal.kind.startsWith('teacher'), profileKeys=isTeacher?teacherProfileKeys:employeeProfileKeys;
        const profileData:{[key:string]:Value}={};for(const key of profileKeys){profileData[key]=form[key]??(key==='workload_hours'?0:'');delete form[key];}
        if(modal.kind.endsWith('-existing')){
          await PigeAPI.post<Row>(base()+'/'+(isTeacher?'teachers':'employees'),{person_id:target!.id,...profileData});
          savedPersonId=target!.id;
        }else if(modal.kind.endsWith('-edit')){
          const personTarget=(target as unknown as {person:PigeAPI.Person}).person;
          const types=Array.isArray(form.person_types)?form.person_types.map(text):[];
          await PigeAPI.patch(base()+'/persons/'+personTarget.id,{version:personTarget.version,data:{...form,person_types:Array.from(new Set([...types,isTeacher?'teacher':'employee'])),cpf:form.cpf||null,birth_date:form.birth_date||null,rg_issued_on:form.rg_issued_on||null,is_guardian:Boolean(personTarget.is_guardian)}});
          await PigeAPI.patch(base()+'/'+(isTeacher?'teachers':'employees')+'/'+target!.id,{version:target!.version,data:profileData});
          savedPersonId=personTarget.id;
        }else{
          const types=Array.isArray(form.person_types)?form.person_types.map(text):[];
          const person={...form,person_types:Array.from(new Set([...types,isTeacher?'teacher':'employee'])),cpf:form.cpf||null,birth_date:form.birth_date||null,rg_issued_on:form.rg_issued_on||null,is_guardian:false};
          const created=await PigeAPI.post<Row>(base()+'/'+(isTeacher?'teachers':'employees'),{person,...profileData});
          savedPersonId=text((created.person as {id?:unknown})?.id);
        }
      }else if(modal.kind==='guardian'||modal.kind==='person'){
        const types=Array.isArray(form.person_types)?form.person_types.map(text):[];
        if(modal.kind==='guardian')types.push('guardian');
        const data={...form,person_types:Array.from(new Set(types)),cpf:form.cpf||null,birth_date:form.birth_date||null,rg_issued_on:form.rg_issued_on||null,is_guardian:modal.kind==='guardian'?true:Boolean(target?.is_guardian)};
        if(target){await PigeAPI.patch(base()+'/persons/'+target.id,{version:target.version,data});savedPersonId=target.id;}else{const created=await PigeAPI.post<PigeAPI.Person>(base()+'/persons',data);savedPersonId=created.id;}
      }
      if(photo&&savedPersonId&&!PigeDossier.eligible(modal.kind)){
        const photoData=new FormData();photoData.append('file',photo);
        await PigeAPI.request(base()+'/persons/'+savedPersonId+'/photo',{method:'POST',body:photoData});
      }
      if(modal.kind==='catalog'){
        if(modal.action==='document-types')form.grade_id=form.grade_id||null;
        if(modal.action==='class-groups')form.capacity=Number(form.capacity);
        if(target)await PigeAPI.patch(base()+'/'+modal.action+'/'+target.id,{version:target.version,data:form});else await PigeAPI.post(base()+'/'+modal.action,form);
      }else if(modal.kind==='link'||modal.kind==='link-edit'){
        if(target)await PigeAPI.patch(base()+'/students/'+studentId+'/guardians/'+target.id,{version:target.version,data:{...form,person_id:target.person_id}});else await PigeAPI.post(base()+'/students/'+studentId+'/guardians',{...form,active:true});
      }else if(modal.kind==='enrollment'){form.financial_person_id=form.financial_person_id||null;await PigeAPI.post(base()+'/enrollments',form);}
      else if(modal.kind==='draft-edit')await PigeAPI.patch(base()+'/enrollments/'+target!.id,{...form,version:target!.version});
      else if(modal.kind==='protocol-note')await PigeAPI.post(base()+'/protocols/'+target!.id+'/notes',{...form,version:target!.version});
      else if(modal.kind==='movement')await PigeAPI.post(base()+'/enrollments/'+target!.id+'/movements',{...form,version:target!.version,action:modal.action});
      else if(modal.kind==='reenroll')await PigeAPI.post(base()+'/enrollments/'+target!.id+'/reenroll',form);
      else if(modal.kind==='upload'){
        if(!selectedFile)throw new Error('Selecione o documento.');const data=new FormData();data.append('file',selectedFile);for(const key of ['document_type_id','expires_on','notes'])if(form[key])data.append(key,text(form[key]));
        await PigeAPI.request(base()+'/students/'+studentId+'/documents',{method:'POST',body:data});
      }else if(modal.kind==='review')await PigeAPI.patch(base()+'/student-documents/'+target!.id,{version:target!.version,status:modal.action,notes:form.notes});
      else if(modal.kind==='waiver')await PigeAPI.post(base()+'/students/'+studentId+'/document-waivers',form);
      else if(modal.kind==='issue'){
        const id=studentId||text(target?.student_id);
        const result=await PigeAPI.post<Row>(base()+'/students/'+id+'/issued-documents',{kind:form.kind,enrollment_id:form.enrollment_id||null});
        await PigeAPI.download(base()+'/files/'+text(result.file_id)+'/download',text(form.kind)+'.pdf');
      }else if(modal.kind==='protocol'){
        form.student_id=form.student_id||null;form.due_on=form.due_on||null;
        if(target)await PigeAPI.patch(base()+'/protocols/'+target.id,{version:target.version,data:form});else await PigeAPI.post(base()+'/protocols',form);
      }else if(modal.kind==='support-hub'){
         const companyId=text((target as Row)?.company_id);
         if(!companyId)throw new Error('Empresa da escola não encontrada.');
         const saved=await PigeAPI.request<Row>('/companies/'+companyId+'/support-hub',{method:'PUT',body:JSON.stringify({
           version:target?.version,
           enabled:Boolean(form.enabled),
           base_url:text(form.base_url),
           token:text(form.token),
           position:text(form.position)||'left',
           widget_type:text(form.widget_type)||'expanded_bubble',
           launcher_title:text(form.launcher_title)||'Suporte',
         })});
         state.supportHub=saved;
         void PigeSupport.load(state.schoolId);
       }else if(modal.kind==='identity'){
        const body=new FormData();
        for(const key of ['logo','font'])delete form[key];
        body.set('payload',JSON.stringify({...form,version:target!.version}));
        if(identityFiles.logo)body.set('logo',identityFiles.logo);
        if(identityFiles.font)body.set('font',identityFiles.font);
        const identity=await PigeAPI.request<PigeInstitution.Identity>('/institution/identity',{method:'PUT',body});
        PigeInstitution.apply(identity);
      }else if(modal.kind==='mfa-policy'){
        const updated=await PigeAPI.request<Row>('/institution/mfa',{method:'PUT',body:JSON.stringify({...form,version:target!.version})});state.modal=blankModal();if(updated.requires_login){await logout();state.success='Política de 2FA atualizada. Todos devem entrar novamente.';}return;
      }else if(modal.kind==='embedding-security'){
        const updated=await PigeAPI.request<Row>('/institution/embedding',{method:'PUT',body:JSON.stringify({version:target!.version,enabled:Boolean(form.enabled),allowed_origins:text(form.allowed_origins).split(/\r?\n/).map(v=>v.trim()).filter(Boolean),current_password:form.current_password})});
        state.modal=blankModal();
        if(updated.requires_login){await logout();state.success='Origens atualizadas. Entre novamente; os demais acessos também precisarão se autenticar.';return;}
        state.success='Segurança de incorporação atualizada.';return;
      }else if(modal.kind==='intake-settings')await PigeAPI.request('/institution/intake',{method:'PUT',body:JSON.stringify({...form,version:target!.version})});
      else if(modal.kind==='company-edit')await PigeAPI.patch('/companies/'+target!.id,{version:target!.version,data:form});
      else if(modal.kind==='company')await PigeAPI.post('/companies',form);
      else if(modal.kind==='school'){
        if(target)await PigeAPI.patch('/schools/'+target.id,{version:target.version,data:form});else await PigeAPI.post('/schools',form);
        state.schools=await PigeAPI.request<PigeAPI.School[]>('/schools');
      }else if(modal.kind==='user'){
        form.person_id=form.person_id||null;
        if(target)await PigeAPI.patch('/users/'+target.id,{...form,version:target.version});else await PigeAPI.post('/users',form);
      }else if(modal.kind==='my-profile'){
        const body=new FormData();const {photo,...payload}=form;body.set('payload',JSON.stringify({...payload,version:target!.version}));if(selectedFile)body.set('photo',selectedFile);
        const updated=await PigeAPI.request<PigeAPI.User&{requires_login:boolean}>('/auth/profile',{method:'PUT',body});
        state.modal=blankModal();clearProfilePreview();
        if(updated.requires_login){await logout();state.login.email=updated.email;state.success='E-mail atualizado. Entre novamente.';return;}
        state.user=updated;await loadMyPhoto();state.success='Perfil atualizado.';return;
      }else if(modal.kind==='password'){
        await PigeAPI.post('/auth/change-password',form);state.modal=blankModal();await logout();state.success='Senha alterada. Entre novamente.';return;
      }else if(modal.kind==='archive')await PigeAPI.post(base()+'/students/'+studentId+'/archive',{version:target!.version,data:{reason:form.reason}});
      state.modal=blankModal();state.success='Operação concluída com sucesso.';await loadCatalogs();
      if(createdStudent)await viewStudent(createdStudent.id);
      else if(studentId){const tab=state.studentTab;await viewStudent(studentId);state.studentTab=tab;}
      else await loadPage();
      if(modal.kind==='protocol-note')await viewProtocol(target!.id);
      if(modal.kind==='draft-edit')await viewEnrollment(target!.id);
    }catch(error){modal.error=error instanceof Error?error.message:String(error);
      const errors=(error as {fields?:{field:string}[]})?.fields||[];
      const key=errors[0]?.field.split('.').at(-1);const field=modal.fields.find(f=>f.key===key||f.key==='business_'+key);
      if(field)state.modalSection=fieldSection(field);
      if(state.modal!==modal)notify(error);
    }
    finally{state.busy=false;}
  }
  async function loadReport():Promise<void>{await safe(async()=>{if(!state.reportClass){state.reportRows=[];return;}const result=await PigeAPI.request<{items:Row[]}>(base()+'/reports/class/'+state.reportClass);state.reportRows=result.items;});}
  async function exportStudents():Promise<void>{await safe(()=>PigeAPI.download(base()+'/reports/students.csv','alunos.csv'));}
  async function exportClass():Promise<void>{if(state.reportClass)await safe(()=>PigeAPI.download(base()+'/reports/class/'+state.reportClass+'/pdf','alunos-da-turma.pdf'));}
  async function logout():Promise<void>{
    try{await PigeAPI.post('/auth/logout',{});}catch{/* Limpar a interface mesmo sem rede. */}
    if(state.userPhotoUrl)URL.revokeObjectURL(state.userPhotoUrl);state.userPhotoUrl='';clearProfilePreview();
    PigeAPI.clear();state.user=null;state.page='dashboard';history.replaceState(null,'','#/dashboard');state.selectedStudent=null;state.rows=[];state.dashboard={} as Row;state.studentDocs={items:[],checklist:[],issued:[]};state.history=[];state.studentProtocols=[];state.studentProtocolTotal=0;resetFilters();state.personChoices=[];state.studentChoices=[];state.photoUrls={};state.catalogs={};state.reportRows=[];state.companies=[];state.schools=[];state.supportHub={id:'',company_id:'',enabled:false,base_url:'',position:'left',widget_type:'expanded_bubble',launcher_title:'Suporte',token_configured:false,version:1};state.modal=blankModal();state.error='';state.login.password='';
  }
  async function install():Promise<void>{if(installEvent){await installEvent.prompt();installEvent=null;state.canInstall=false;}}
  function updateApp():void{if(waitingWorker&&!state.modal.kind)waitingWorker.postMessage({type:'SKIP_WAITING'});}
  function setupPWA():void{
    window.addEventListener('online',()=>{state.online=true;});window.addEventListener('offline',()=>{state.online=false;});
    window.addEventListener('beforeinstallprompt',(event)=>{event.preventDefault();installEvent=event as Event&{prompt:()=>Promise<void>};state.canInstall=true;});
    window.addEventListener('pige-session-expired',()=>{void logout();state.error='Sua sessão expirou. Entre novamente.';});
    window.addEventListener('hashchange',()=>{const target=location.hash.replace(/^#\/?/,'');if(pageLabels[target]&&target!==state.page&&!state.modal.kind)void navigate(target);});
    if('serviceWorker' in navigator&&window.isSecureContext){
      void navigator.serviceWorker.register('/sw.js').then(reg=>{
        if(reg.waiting){waitingWorker=reg.waiting;state.updateAvailable=true;}
        reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller){waitingWorker=worker;state.updateAvailable=true;}});});
      }).catch(()=>{/* A aplicação online continua disponível sem SW. */});
      navigator.serviceWorker.addEventListener('controllerchange',()=>{if(state.updateAvailable)location.reload();});
    }
    window.addEventListener('beforeunload',event=>{if(state.modal.kind&&modalDirty()){event.preventDefault();event.returnValue='';}});
  }
  Vue.createApp({components:{'expansion-panel':PigeExpansion.component,'assist-panel':PigeAssist.component},render:PigeRenders.app,setup(){Vue.onMounted(()=>{PigeMFA.init(PigeAPI.request,afterMFA,logout);PigeDialogs.install();setupPWA();void initialize();});return{state,base,familyAssistFields,assistRequest,assistFields,assistEligible,assistCompany,setupCompany,setupCompanyFields,companyExtra,setupLookup,readStudentDocument,readResponsibleDocument,editIntake,mfa:PigeMFA,dossier:PigeDossier,selectedPersonTypes,availablePersonTypes,togglePersonType,lockedPersonType,familyRelevant,manageMFA,editMFAPolicy,editEmbedding,probeEmbedding,editMyProfile,myPhotoChange,profilePassword,registryPages,businessTypes,isBusiness,newBusiness,reusePerson,personDocument,modalSections,modalTab,visibleSection,modalFieldLabel,modalFieldRelevant,advancedPersonField,isPersonModal,personTypeOptions,personTypeLabel,modalDirty,identity:PigeInstitution.state,supportStatus:PigeSupport.status,editIdentity,identityFileChange,manageUnits,editMaintainer,text,can,isProfileRole,school,label,date,cpf,initials,photoSrc,getName,options,pageLabels,catalogLabels,configure,login,logout,navigate,changeSchool,setCatalog,search,page,loadPage,viewStudent,newPerson,newStudent,editStudent,newGuardian,newTeacher,editTeacher,newEmployee,editEmployee,editPerson,newCatalog,newEnrollment,viewEnrollment,startMovement,reenroll,newLink,editLink,uploadDocument,fileChange,reviewDocument,waiveDocument,issueDocument,downloadFile,newProtocol,newCompany,newSchool,editSupportHub,newUser,password,archiveStudent,closeModal,saveModal,loadReport,exportStudents,exportClass,searchStudents,searchPersons,filteredClasses,clearFilters,yearChanged,editDraft,viewProtocol,protocolNote,protocolReceipt,exportPendencies,install,updateApp};}}).mount('#app');
}
