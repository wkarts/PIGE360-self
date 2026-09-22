namespace PigeUI {
  type Row = PigeAPI.Row;
  type Student = PigeAPI.Student;
  type Value = PigeAPI.Value;
  interface Option { value: string; label: string }
  interface Field { key: string; label: string; type: string; required?: boolean; options?: Option[]; wide?: boolean; help?: string }
  interface Modal { kind: string; title: string; fields: Field[]; form: PigeAPI.FormDataMap; target: Row | null; action: string; error: string }
  const text = (value: unknown): string => value === null || value === undefined ? '' : String(value);
  const statusLabels: Record<string,string> = {active:'Ativo', archived:'Arquivado', draft:'Rascunho', suspended:'Suspenso', transferred:'Transferido', cancelled:'Cancelado', completed:'Concluído', pending:'Pendente', received:'Recebido', validated:'Validado', rejected:'Rejeitado', expired:'Vencido', waived:'Dispensado', open:'Aberto', in_progress:'Em atendimento', waiting:'Aguardando', closed:'Fechado', admin:'Administrador', direction:'Direção', coordination:'Coordenação', secretary:'Secretaria', teacher:'Professor', student:'Aluno', guardian:'Responsável', viewer:'Consulta'};
  const catalogLabels: Record<string,string> = {'units':'Unidades','academic-years':'Anos letivos','grades':'Séries e etapas','shifts':'Turnos','class-groups':'Turmas','document-types':'Tipos de documento'};
  const pageLabels: Record<string,string> = {online:'Inscrições online',banking:'Cobranças',integrations:'Integrações',dashboard:'Visão geral',people:'Cadastro único',students:'Alunos',guardians:'Responsáveis',academic:'Estrutura acadêmica',enrollments:'Matrículas',documents:'Pendências documentais',protocols:'Protocolos',reports:'Relatórios',settings:'Instituição',users:'Usuários e acessos',audit:'Auditoria'};
  const blankModal = (): Modal => ({kind:'',title:'',fields:[],form:{},target:null,action:'',error:''});
  const state = Vue.reactive({
    ready:false, configured:true, online:navigator.onLine, loginBusy:false, busy:false, loading:false,
    error:'', success:'', menuOpen:false, user:null as PigeAPI.User|null,
    schools:[] as PigeAPI.School[], schoolId:'', page:'dashboard', q:'', pageNumber:1, total:0,
    rows:[] as Row[], dashboard:{} as Row, catalogs:{} as Record<string,Row[]>, catalog:'class-groups',
    selectedStudent:null as Student|null, studentTab:'cadastro', profileContext:{} as Row, studentDocs:{items:[],checklist:[],issued:[]} as {items:Row[];checklist:Row[];issued:Row[]}, history:[] as Row[],
    studentChoices:[] as Student[], personChoices:[] as Row[], photoUrls:{} as Record<string,string>, companies:[] as Row[], reportClass:'', reportRows:[] as Row[],
    modal:blankModal(), login:{email:'',password:''}, setup:{token:'',admin_name:'',admin_email:'',admin_password:'',company_name:'',company_document:'',school_name:'',unit_name:'Unidade principal',academic_year:new Date().getFullYear()},
    filters:{status:'',academic_year_id:'',class_group_id:'',document_type_id:'',document_status:'',overdue:false},
    pendencySummary:{truncated:false,total_documents:0,scanned_students:0,total_students:0},
    studentProtocols:[] as Row[], studentProtocolTotal:0,
    canInstall:false, updateAvailable:false,
  });
  let selectedFile: File|null = null;
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
  function personFields():Field[] { return [
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
    await safe(async()=>{
      const info=await PigeAPI.request<{configured:boolean}>('/setup/status');state.configured=info.configured;
      if(info.configured){try{const session=await PigeAPI.refresh();state.user=session.user;await loadShell();}catch{state.user=null;}}
    });
    state.ready=true;
  }
  async function login():Promise<void> {
    state.loginBusy=true;state.error='';
    try{const session=await PigeAPI.post<PigeAPI.SessionResponse>('/auth/login',state.login);PigeAPI.useSession(session);state.user=session.user;state.login.password='';await loadShell();}
    catch(error){notify(error);}finally{state.loginBusy=false;}
  }
  async function configure():Promise<void>{
    state.loginBusy=true;state.error='';
    try{const {token,...data}=state.setup;await PigeAPI.request('/setup',{method:'POST',headers:{'X-Setup-Token':token},body:JSON.stringify(data)});state.configured=true;state.login.email=data.admin_email;state.setup.admin_password='';state.setup.token='';state.success='Instalação concluída. Entre com seu usuário.';}
    catch(error){notify(error);}finally{state.loginBusy=false;}
  }
  async function loadShell():Promise<void>{
    state.schools=await PigeAPI.request<PigeAPI.School[]>('/schools');
    const saved=localStorage.getItem('pige-school');state.schoolId=state.schools.some(s=>s.id===saved)?saved!:state.schools[0]?.id||'';
    const hash=location.hash.replace(/^#\/?/,'');
    state.page=isProfileRole()?'dashboard':(pageLabels[hash]?hash:'dashboard');
    if(state.schoolId) await changeSchool();
    else state.error='Nenhuma escola está vinculada ao seu usuário. Solicite acesso ao administrador.';
  }
  async function changeSchool():Promise<void>{
    resetFilters();state.studentProtocols=[];state.studentProtocolTotal=0;localStorage.setItem('pige-school',state.schoolId);state.selectedStudent=null;state.studentDocs={items:[],checklist:[],issued:[]};state.rows=[];state.catalogs={};state.reportRows=[];state.reportClass='';state.q='';state.pageNumber=1;
    await safe(async()=>{if(!isProfileRole()) await loadCatalogs();await loadPage();});
  }
  async function loadCatalogs():Promise<void>{
    const sid=state.schoolId;
    const entries=await Promise.all(Object.keys(catalogLabels).map(async key=>[key,await PigeAPI.request<Row[]>(`/schools/${sid}/${key}`)] as const));
    if(state.schoolId===sid) state.catalogs=Object.fromEntries(entries);
  }
  async function navigate(page:string):Promise<void>{
    if(state.busy||state.modal.kind)return;
    if(isProfileRole() && page!=='dashboard'){state.page='dashboard';history.replaceState({},'', '#/dashboard');return;}
    resetFilters();state.page=page;state.pageNumber=1;state.q='';state.selectedStudent=null;state.error='';state.menuOpen=false;
    history.replaceState({},'',`#/${page}`);await safe(loadPage);
  }
  async function loadPage():Promise<void>{
    if(!state.schoolId)return;
    const current=++sequence,sid=state.schoolId;state.loading=true;state.rows=[];
    try{
      const query=`page=${state.pageNumber}&page_size=30&q=${encodeURIComponent(state.q)}&${filterQuery()}`;
      if(['online','banking','integrations'].includes(state.page)){
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
        if(can('schools.manage'))state.companies=await PigeAPI.request<Row[]>('/companies');
      }else if(state.page==='users'){
        const data=await PigeAPI.request<Row[]>('/users');if(current===sequence){state.rows=data;state.total=data.length;}
      }else if(state.page!=='reports'){
        const resource=['guardians','people'].includes(state.page)?'persons':state.page;
        const suffix=state.page==='guardians'?'&guardians_only=true':'';
        const data=await PigeAPI.request<PigeAPI.Page<Row>>(base()+'/'+resource+'?'+query+suffix);
        if(current===sequence&&sid===state.schoolId){state.rows=data.items;state.total=data.total;void hydratePhotos(state.page==='students'?data.items.map(x=>(x as {person?:unknown}).person):data.items);}
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
    const form:PigeAPI.FormDataMap={};for(const f of fields)form[f.key]=values[f.key]??(f.type==='checkbox'?(f.key==='active'):f.type==='number'?30:'');
    state.modal={kind,title,fields,form,target,action:'',error:''};selectedFile=null;state.error='';
  }
  function closeModal():void{if(!state.busy)state.modal=blankModal();}
  function valuesFrom(row:Row|PigeAPI.Person,fields:Field[]):PigeAPI.FormDataMap {const map:PigeAPI.FormDataMap={};for(const f of fields)map[f.key]=(row as unknown as Record<string,Value>)[f.key]??'';return map;}
  function newPerson():void{openModal('person','Cadastrar pessoa',personFields(),{active:true});}
  function newStudent():void{const fields=[...personFields(),...studentFields()];const birth=fields.find(f=>f.key==='birth_date');if(birth)birth.required=true;openModal('student','Cadastrar aluno',fields,{active:true});}
  function editStudent():void{
    const student=state.selectedStudent;if(!student)return;
    const personFieldsList=personFields(),fields=[...personFieldsList,...studentFields()];
    openModal('student-edit','Editar cadastro completo do aluno',fields,{...valuesFrom(student.person,personFieldsList),...valuesFrom(student,studentFields()),is_guardian:student.person.is_guardian},student as unknown as Row);
  }
  function newGuardian():void{openModal('guardian','Cadastrar responsável',personFields(),{active:true});}
  function editPerson(row:Row):void{openModal('person','Editar cadastro da pessoa',personFields(),valuesFrom(row,personFields()),row);}
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
  function newCompany():void{openModal('company','Cadastrar empresa / mantenedora',[field('name','Razão social','text',true),field('document','CPF / CNPJ')]);}
  function newSchool(row:Row|null=null):void{const fields=[field('company_id','Empresa / mantenedora','select',true,state.companies.map(c=>({value:c.id,label:text(c.name)}))),field('name','Nome da escola','text',true),field('address','Endereço','text',false,undefined,true),field('phone','Telefone'),field('email','E-mail','email'),field('document_policy','Pendências na ativação da matrícula','select',true,[{value:'warn',label:'Avisar sem bloquear'},{value:'block',label:'Exigir validação dos documentos obrigatórios'}]),field('active','Escola ativa','checkbox')];openModal('school',row?'Editar escola':'Cadastrar escola',fields,row?valuesFrom(row,fields):{document_policy:'warn',active:true},row);}
  async function newUser(row:Row|null=null):Promise<void>{
    await searchPersons();
    const fields=[field('name','Nome completo','text',true)];
    if(!row)fields.push(field('email','E-mail de acesso','email',true),field('password','Senha inicial (mínimo 12 caracteres)','password',true));
    fields.push(field('role','Perfil','select',true,['admin','direction','coordination','secretary','teacher','student','guardian','viewer'].map(v=>({value:v,label:label(v)}))),field('person_id','Pessoa vinculada (Professor, Aluno ou Responsável)','person',false),field('school_ids','Escolas autorizadas','multiselect',false,state.schools.map(s=>({value:s.id,label:s.name})),true));
    if(row)fields.push(field('active','Usuário ativo','checkbox'));
    openModal('user',row?'Editar acesso':'Criar usuário',fields,row?valuesFrom(row,fields):{role:'secretary',person_id:'',school_ids:[state.schoolId]},row);
  }
  function password():void{openModal('password','Alterar minha senha',[field('current_password','Senha atual','password',true),field('new_password','Nova senha (mínimo 12 caracteres)','password',true)]);}
  function archiveStudent():void{if(state.selectedStudent)openModal('archive','Arquivar cadastro do aluno',[field('reason','Justificativa','textarea',true,undefined,true)],{},state.selectedStudent);}
  async function downloadFile(id:string,name='documento.pdf'):Promise<void>{await safe(()=>PigeAPI.download(base()+'/files/'+id+'/download',name));}
  async function saveModal():Promise<void>{
    if(state.busy)return;state.busy=true;state.modal.error='';
    const modal=state.modal,form={...modal.form},target=modal.target,studentId=state.selectedStudent?.id;let createdStudent:Student|null=null;let savedPersonId='';
    try{
      const photo=selectedFile;delete form.photo;
      if(modal.kind==='student'){
        const studentData:{[key:string]:Value}={};for(const key of studentFieldKeys){studentData[key]=form[key]??'';delete form[key];}
        const previous=text(studentData.previous_school);createdStudent=await PigeAPI.post<Student>(base()+'/students',{person:{...form,cpf:form.cpf||null,birth_date:form.birth_date||null,is_guardian:false},previous_school:previous,...studentData});
        savedPersonId=createdStudent.person.id;
      }else if(modal.kind==='student-edit'){
        const studentData:{[key:string]:Value}={};for(const key of studentFieldKeys){studentData[key]=form[key]??'';delete form[key];}
        const personTarget=(target as unknown as Student).person;
        await PigeAPI.patch(base()+'/persons/'+personTarget.id,{version:personTarget.version,data:{...form,cpf:form.cpf||null,birth_date:form.birth_date||null,is_guardian:Boolean(personTarget.is_guardian)}});
        await PigeAPI.patch(base()+'/students/'+target!.id,{version:target!.version,data:studentData});
        savedPersonId=personTarget.id;
      }else if(modal.kind==='guardian'||modal.kind==='person'){
        const data={...form,cpf:form.cpf||null,birth_date:form.birth_date||null,is_guardian:modal.kind==='guardian'?true:Boolean(target?.is_guardian)};
        if(target){await PigeAPI.patch(base()+'/persons/'+target.id,{version:target.version,data});savedPersonId=target.id;}else{const created=await PigeAPI.post<PigeAPI.Person>(base()+'/persons',data);savedPersonId=created.id;}
      }
      if(photo&&savedPersonId){
        const photoData=new FormData();photoData.append('file',photo);
        await PigeAPI.request(base()+'/persons/'+savedPersonId+'/photo',{method:'POST',body:photoData});
      }
      if(modal.kind==='catalog'){
        if(modal.action==='document-types')form.grade_id=form.grade_id||null;
        if(modal.action==='class-groups')form.capacity=Number(form.capacity);
        if(target)await PigeAPI.patch(base()+'/'+modal.action+'/'+target.id,{version:target.version,data:form});else await PigeAPI.post(base()+'/'+modal.action,form);
      }else if(modal.kind==='link'||modal.kind==='link-edit'){
        if(target)await PigeAPI.patch(base()+'/students/'+studentId+'/guardians/'+target.id,{version:target.version,data:{...form,person_id:target.person_id}});else await PigeAPI.post(base()+'/students/'+studentId+'/guardians',{...form,active:true});
      }else if(modal.kind==='enrollment')await PigeAPI.post(base()+'/enrollments',form);
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
      }else if(modal.kind==='company')await PigeAPI.post('/companies',form);
      else if(modal.kind==='school'){
        if(target)await PigeAPI.patch('/schools/'+target.id,{version:target.version,data:form});else await PigeAPI.post('/schools',form);
        state.schools=await PigeAPI.request<PigeAPI.School[]>('/schools');
      }else if(modal.kind==='user'){
        form.person_id=form.person_id||null;
        if(target)await PigeAPI.patch('/users/'+target.id,{...form,version:target.version});else await PigeAPI.post('/users',form);
      }else if(modal.kind==='password'){
        await PigeAPI.post('/auth/change-password',form);state.modal=blankModal();await logout();state.success='Senha alterada. Entre novamente.';return;
      }else if(modal.kind==='archive')await PigeAPI.post(base()+'/students/'+studentId+'/archive',{version:target!.version,data:{reason:form.reason}});
      state.modal=blankModal();state.success='Operação concluída com sucesso.';await loadCatalogs();
      if(createdStudent)await viewStudent(createdStudent.id);
      else if(studentId){const tab=state.studentTab;await viewStudent(studentId);state.studentTab=tab;}
      else await loadPage();
      if(modal.kind==='protocol-note')await viewProtocol(target!.id);
      if(modal.kind==='draft-edit')await viewEnrollment(target!.id);
    }catch(error){modal.error=error instanceof Error?error.message:String(error);if(state.modal!==modal)notify(error);}
    finally{state.busy=false;}
  }
  async function loadReport():Promise<void>{await safe(async()=>{if(!state.reportClass){state.reportRows=[];return;}const result=await PigeAPI.request<{items:Row[]}>(base()+'/reports/class/'+state.reportClass);state.reportRows=result.items;});}
  async function exportStudents():Promise<void>{await safe(()=>PigeAPI.download(base()+'/reports/students.csv','alunos.csv'));}
  async function exportClass():Promise<void>{if(state.reportClass)await safe(()=>PigeAPI.download(base()+'/reports/class/'+state.reportClass+'/pdf','alunos-da-turma.pdf'));}
  async function logout():Promise<void>{
    try{await PigeAPI.post('/auth/logout',{});}catch{/* Limpar a interface mesmo sem rede. */}
    PigeAPI.clear();state.user=null;state.selectedStudent=null;state.rows=[];state.dashboard={} as Row;state.studentDocs={items:[],checklist:[],issued:[]};state.history=[];state.studentProtocols=[];state.studentProtocolTotal=0;resetFilters();state.personChoices=[];state.studentChoices=[];state.photoUrls={};state.catalogs={};state.reportRows=[];state.companies=[];state.schools=[];state.modal=blankModal();state.error='';state.login.password='';
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
    window.addEventListener('keydown',(event)=>{if(event.key==='Escape')closeModal();});
  }
  Vue.createApp({components:{'expansion-panel':PigeExpansion.component},render:PigeRenders.app,setup(){Vue.onMounted(()=>{setupPWA();void initialize();});return{state,text,can,isProfileRole,school,label,date,cpf,initials,photoSrc,getName,options,pageLabels,catalogLabels,configure,login,logout,navigate,changeSchool,setCatalog,search,page,loadPage,viewStudent,newStudent,editStudent,newGuardian,editPerson,newCatalog,newEnrollment,viewEnrollment,startMovement,reenroll,newLink,editLink,uploadDocument,fileChange,reviewDocument,waiveDocument,issueDocument,downloadFile,newProtocol,newCompany,newSchool,newUser,password,archiveStudent,closeModal,saveModal,loadReport,exportStudents,exportClass,searchStudents,searchPersons,filteredClasses,clearFilters,yearChanged,editDraft,viewProtocol,protocolNote,protocolReceipt,exportPendencies,install,updateApp};}}).mount('#app');
}
