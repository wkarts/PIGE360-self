namespace PigePortal {
  type Admission=PigeOnline.Admission;type Campaign=PigeOnline.Campaign;type Account=PigeOnline.Account;
  type DiaryStudent={student_id:string;student_name:string;student_number:string;relationship:string;consented_at:string};
  type EligibleDiaryStudent={student_id:string;student_name:string;student_number:string;relationship:string;access_active:boolean};
  type DiaryAccess={consent_version:string;consent_required:boolean;eligible_student_count:number;eligible_students:EligibleDiaryStudent[];students:DiaryStudent[]};
  type DiaryCommunication={id:string;student_id:string;student_name:string;title:string;message:string;sent_at:string;read_at:string|null;occurrence_title:string|null};
  const state=Vue.reactive({schools:[] as {id:string;name:string}[],schoolId:new URLSearchParams(location.search).get('school')||'',catalogFailed:false,assistSource:'',profileReadSource:'',profileOpen:false,ready:false,busy:false,section:'admissions',step:0,diaryError:'',error:'',notice:'',online:navigator.onLine,diaryConsent:{version:'',text:''},diaryConsentAccepted:false,diaryAccess:{consent_version:'',consent_required:false,eligible_student_count:0,eligible_students:[],students:[]} as DiaryAccess,diaryCommunications:[] as DiaryCommunication[],registrationTerms:{version:'',text:''},account:null as Account|null,campaign:null as Campaign|null,campaigns:[] as Campaign[],slug:new URLSearchParams(location.search).get('campaign')||'',mode:'login',registerPurpose:'admission',rows:[] as Admission[],total:0,page:1,selected:null as Admission|null,editing:false,charges:[] as PigeOnline.Charge[],code:'',verifyChannel:'email',message:'',documentType:'',acceptTerms:false,legal:false,register:{name:'',email:'',password:'',cpf:'',phone:'',address:'',accept_privacy:false,whatsapp_opt_in:false},login:{email:'',password:''},reset:{email:'',code:'',password:''},form:{student:PigeOnline.person(),class_group_id:'',previous_school:'',relationship:'Responsável legal',notes:'',client_key:PigeOnline.newId()}});
  let selectedFile:File|null=null;
  let signedContractFile:File|null=null;
  const signing=Vue.reactive({method:'',password:'',fileName:'',consent:false,pending:false,sessionId:'',admissionId:'',integrated:false});
  let personalCertificate:File|null=null,signingPopup:Window|null=null,signingTimer:number|undefined;
  function resetSigning():void{personalCertificate=null;signing.password='';signing.fileName='';signing.consent=false;}
  function personalCertificateChange(event:Event):void{personalCertificate=(event.target as HTMLInputElement).files?.[0]||null;signing.fileName=personalCertificate?.name||'';}
  async function loadSigningMethods():Promise<void>{if(!state.selected?.contract?.issued_document_id)return;const result=await request<{govbr_integrated:boolean}>('/signing/methods');signing.integrated=result.govbr_integrated;}
  async function signPersonalA1():Promise<void>{await run(async()=>{const a=state.selected,file=personalCertificate,password=signing.password;
    try{if(!a?.contract?.issued_document_id||!file||!signing.consent)throw new Error('Selecione seu certificado e autorize a assinatura do contrato.');
      if(!/\.(pfx|p12)$/i.test(file.name)||file.size>1024*1024||!password)throw new Error('Informe um certificado A1 PFX/P12 de até 1 MB e sua senha.');
      const data=new FormData();data.set('file',file);data.set('password',password);data.set('consent','true');
      await request('/admissions/'+a.id+'/issued/'+a.contract.issued_document_id+'/sign-a1',{method:'POST',body:data});
      await openRecord(a.id);state.notice='Contrato assinado e enviado para conferência da escola.';
    }finally{resetSigning();const input=document.getElementById('personal-a1') as HTMLInputElement|null;if(input)input.value='';}});}
  async function checkSigning():Promise<void>{if(!signing.sessionId || !signing.pending)return;
    try{const result=await request<{status:string;message:string}>('/signing/sessions/'+signing.sessionId);
      if(['completed','failed','expired'].includes(result.status)){signing.pending=false;if(signingTimer)window.clearInterval(signingTimer);signingTimer=undefined;
        const id=signing.admissionId;if(result.status==='completed'){if(id)await openRecord(id);state.notice=result.message;signingPopup?.close();}else{state.error=result.message||'A solicitação expirou. Inicie a assinatura novamente.';}}
    }catch(error){signing.pending=false;if(signingTimer)window.clearInterval(signingTimer);signingTimer=undefined;state.error=error instanceof Error?error.message:String(error);}}
  async function signGovbr():Promise<void>{if(!signing.consent){state.error='Confirme a leitura e a assinatura do contrato.';return;}
    const popup=window.open(signing.integrated?'about:blank':'https://assinador.iti.br/','pige-signature-govbr','popup,width=560,height=760');
    if(!popup){state.error='Permita a abertura da janela de assinatura no navegador e tente novamente.';return;}signingPopup=popup;
    if(!signing.integrated){popup.opener=null;state.notice='Após assinar no GOV.BR, envie o PDF assinado neste formulário.';return;}
    await run(async()=>{try{const a=state.selected;if(!a?.contract?.issued_document_id)throw new Error('Contrato indisponível.');const data=new FormData();data.set('consent','true');
      const result=await request<{session_id:string;authorization_url:string}>('/admissions/'+a.id+'/issued/'+a.contract.issued_document_id+'/sign-govbr',{method:'POST',body:data});
      const authorization=new URL(result.authorization_url);if(authorization.protocol!=='https:'||!['sso.acesso.gov.br','sso.staging.acesso.gov.br'].includes(authorization.hostname))throw new Error('Endereço de autorização inválido.');
      signing.sessionId=result.session_id;signing.admissionId=a.id;signing.pending=true;popup.location.replace(result.authorization_url);if(signingTimer)window.clearInterval(signingTimer);signingTimer=window.setInterval(()=>{void checkSigning();},3000);
    }catch(error){popup.close();throw error;}});}
  window.addEventListener('message',(event:MessageEvent)=>{if(event.origin===location.origin&&event.source===signingPopup&&event.data?.type==='pige-signature-return')void checkSigning();});
  window.addEventListener('pagehide',()=>{resetSigning();if(signingTimer)window.clearInterval(signingTimer);});
  async function request<T>(path:string,options:RequestInit={}):Promise<T>{
    if(!navigator.onLine)throw new Error('Sem conexão. Nenhuma matrícula é confirmada offline.');
    const headers=new Headers(options.headers);headers.set('X-CSRF-Protection','1');if(options.body&&!(options.body instanceof FormData))headers.set('Content-Type','application/json');
    const response=await fetch('/api/v1/portal'+path,{...options,headers,credentials:'same-origin',cache:'no-store'});
    if(!response.ok){let value:{detail?:string;request_id?:string;errors?:{field:string;message:string}[]}={};try{value=await response.json();}catch{}const ref=value.request_id||response.headers.get('X-Request-ID')||'';const error=new Error((value.errors?.map(x=>friendlyField(x.field)+': '+x.message.replace(/^Value error, /,'')).join('\n')||(typeof value.detail==='string'?value.detail:'')||'Não foi possível concluir. Tente novamente.')+(ref?' · Referência: '+ref:''));Object.assign(error,{status:response.status});throw error;}
    return await response.json() as T;
  }
  const post=<T>(path:string,value:unknown):Promise<T>=>request<T>(path,{method:'POST',body:JSON.stringify(value)});
  async function run(action:()=>Promise<void>):Promise<void>{if(state.busy)return;state.busy=true;state.error='';state.notice='';try{await action();}catch(e){state.error=e instanceof Error?e.message:String(e);}finally{state.busy=false;if(state.error)focusError();}}
  async function loadList():Promise<void>{const data=await request<PigeOnline.Page<Admission>>('/admissions?page='+state.page);state.rows=data.items;state.total=data.total;}
  async function loadRegistrationTerms():Promise<void>{if(!state.schoolId)return;state.registrationTerms=await request<{version:string;text:string}>('/registration-terms?school_id='+encodeURIComponent(state.schoolId));}
  async function openRegistration():Promise<void>{state.mode='register';state.registerPurpose=state.campaign?.accepting?'admission':'portal';state.register.accept_privacy=false;state.error='';if(state.registerPurpose==='portal')await run(loadRegistrationTerms);}
  async function chooseRegistrationPurpose(purpose:'admission'|'portal'):Promise<void>{state.registerPurpose=purpose;state.register.accept_privacy=false;if(purpose==='portal')await run(loadRegistrationTerms);}
  async function loadDiaryPortal():Promise<void>{
    state.diaryError='';
    try{const [consent,access]=await Promise.all([request<{version:string;text:string}>('/diary/access-consent'),request<DiaryAccess>('/diary/access')]);
    if(consent.version!==state.diaryConsent.version||consent.text!==state.diaryConsent.text||JSON.stringify(access.eligible_students)!==JSON.stringify(state.diaryAccess.eligible_students))state.diaryConsentAccepted=false;
    state.diaryConsent=consent;state.diaryAccess=access;
    state.diaryCommunications=access.students.length?await request<DiaryCommunication[]>('/diary/communications'):[];
    }catch(e){state.diaryError=e instanceof Error?e.message:'Não foi possível carregar o Diário. Tente novamente.';}
  }
  async function activateDiaryAccess():Promise<void>{await run(async()=>{if(!state.diaryConsentAccepted)throw new Error('Leia e confirme a autorização para ativar o acesso.');state.diaryAccess=await post<DiaryAccess>('/diary/access',{accepted:true,consent_version:state.diaryConsent.version,student_ids:state.diaryAccess.eligible_students.map(student=>student.student_id)});state.diaryConsentAccepted=false;await loadDiaryPortal();state.notice='Acesso ao Diário atualizado.';});}
  async function revokeDiaryAccess(studentId:string):Promise<void>{await run(async()=>{await post('/diary/access/'+encodeURIComponent(studentId)+'/revoke',{});state.diaryConsentAccepted=false;await loadDiaryPortal();state.notice='Acesso ao Diário revogado.';});}
  async function markDiaryCommunicationRead(id:string):Promise<void>{await run(async()=>{await post('/diary/communications/'+encodeURIComponent(id)+'/read',{});await loadDiaryPortal();});}
  const visibleCampaigns=():Campaign[]=>state.campaigns.filter(c=>!state.schoolId||c.school_id===state.schoolId);
  const authContext=()=>({school_id:state.schoolId,campaign_slug:''});
  async function loadCampaign():Promise<void>{
    state.campaign=null;
    if(state.slug){state.campaign=await request<Campaign>('/campaigns/'+encodeURIComponent(state.slug));state.schoolId=state.campaign.school_id;history.replaceState({},'','/online.html?campaign='+encodeURIComponent(state.slug));}
  }
  async function start():Promise<void>{
    await run(async()=>{
      state.catalogFailed=false;
      try{
        const context=await request<{schools:{id:string;name:string}[];default_school_id:string}>('/context');state.schools=context.schools;
        if(!state.schools.some(s=>s.id===state.schoolId))state.schoolId=context.default_school_id;
        state.campaigns=await request<Campaign[]>('/campaigns');
        if(state.slug){try{await loadCampaign();}catch(e){if((e as {status?:number}).status!==404)throw e;state.slug='';state.notice='O link deste processo não está disponível. Acesse sua conta ou consulte a Secretaria.';}}
        if(state.schoolId)await loadRegistrationTerms();
      }catch(e){state.catalogFailed=true;state.error=e instanceof Error?e.message:'Não foi possível carregar o portal.';}
      try{state.account=await request<Account>('/me');state.schoolId=state.account.school_id;await loadList();await loadDiaryPortal();}catch(e){if((e as {status?:number}).status===401)state.account=null;else if(!state.error)state.error=e instanceof Error?e.message:'Não foi possível recuperar a sessão.';}
      if(state.campaign&&state.schoolId!==state.campaign.school_id){state.campaign=null;state.slug='';}
      if(!state.campaign&&!state.catalogFailed){const rows=visibleCampaigns();if(rows.length===1){state.slug=rows[0].slug;await loadCampaign();}}
    });state.ready=true;
  }
  async function selectSchool():Promise<void>{await run(async()=>{state.slug='';state.campaign=null;state.register.accept_privacy=false;const rows=visibleCampaigns();if(rows.length===1){state.slug=rows[0].slug;await loadCampaign();}else history.replaceState({},'','/online.html?school='+encodeURIComponent(state.schoolId));await loadRegistrationTerms();});}
  async function selectCampaign():Promise<void>{await run(async()=>{state.selected=null;state.editing=false;state.register.accept_privacy=false;await loadCampaign();});}
  async function afterMFA(result:Record<string,unknown>):Promise<void>{state.account=result as unknown as Account;state.schoolId=state.account.school_id;state.page=1;state.section='admissions';if(state.campaign?.school_id!==state.schoolId){state.campaign=null;state.slug='';const rows=visibleCampaigns();if(rows.length===1){state.slug=rows[0].slug;await loadCampaign();}}await loadList();await loadDiaryPortal();}
  async function mfaRequest<T>(path:string,options:RequestInit={}):Promise<T>{const headers=new Headers(options.headers);headers.set('X-CSRF-Protection','1');if(options.body)headers.set('Content-Type','application/json');const r=await fetch('/api/v1'+path,{...options,headers,credentials:'same-origin',cache:'no-store'});const data=await r.json();if(!r.ok)throw new Error(data.detail||'Não foi possível confirmar a autenticação.');return data as T;}
  async function login():Promise<void>{await run(async()=>{if(!state.schoolId)throw new Error('Selecione a unidade para acessar sua conta.');const result=await post<Record<string,unknown>>('/login',{...state.login,...authContext()});state.login.password='';if(await PigeMFA.accept(result))return;await afterMFA(result);});}
  async function register():Promise<void>{await run(async()=>{
    let result:Record<string,unknown>;
    validateContact(state.register);
    if(state.registerPurpose==='admission'){
      const campaign=state.campaign;
      if(!campaign?.accepting)throw new Error('Selecione um processo de matrícula aberto.');
      result=await post<Record<string,unknown>>('/register',{...state.register,cpf:state.register.cpf||null,campaign_slug:state.slug,terms_version:campaign.terms_version});
    }else{
      if(!state.registrationTerms.version)throw new Error('Atualize o aviso de privacidade antes de criar a conta.');
      result=await post<Record<string,unknown>>('/account/register',{...state.register,school_id:state.schoolId,terms_version:state.registrationTerms.version});
    }
    state.register.password='';
    if(await PigeMFA.accept(result))return;
    await afterMFA(result);
    state.notice='Conta criada. Confirme um contato para validar o vínculo com o cadastro escolar.';
  });}
  async function logout():Promise<void>{state.assistSource='';state.profileReadSource='';state.profileOpen=false;await run(async()=>{await post('/logout',{});state.account=null;state.rows=[];state.diaryAccess={consent_version:'',consent_required:false,eligible_student_count:0,eligible_students:[],students:[]};state.diaryCommunications=[];state.diaryConsentAccepted=false;state.selected=null;state.charges=[];state.editing=false;state.register={name:'',email:'',password:'',cpf:'',phone:'',address:'',accept_privacy:false,whatsapp_opt_in:false};state.login.password='';state.form.student=PigeOnline.person();resetSigning();if(signingTimer)window.clearInterval(signingTimer);});if(!state.account&&signing.sessionId)location.assign('/api/v1/portal/signing/govbr/logout');}
  async function verifyRequest():Promise<void>{await run(async()=>{await post('/verification/request',{channel:state.verifyChannel});state.notice='Código solicitado. Confira seu e-mail ou WhatsApp. O código vale por 10 minutos.';});}
  async function verifyConfirm():Promise<void>{await run(async()=>{state.account=await post<Account>('/verification/confirm',{code:state.code});state.code='';await loadDiaryPortal();state.notice='Contato confirmado.';});}
  async function resetRequest():Promise<void>{await run(async()=>{await post('/password/request',{email:state.reset.email,...authContext()});state.notice='Caso exista uma conta elegível, o código será enviado ao e-mail informado.';});}
  async function resetConfirm():Promise<void>{await run(async()=>{await post('/password/confirm',{...state.reset,...authContext()});state.reset.password='';state.reset.code='';state.mode='login';state.notice='Senha redefinida. Entre novamente.';});}
  function newAdmission():void{state.assistSource='';state.error='';state.notice='';state.step=0;state.section='admissions';selectedFile=null;if(!state.campaign||!state.campaign.accepting){state.error='Selecione um processo aberto.';return;}if(state.account?.school_id!==state.campaign.school_id){state.error='Esta conta pertence a outra escola. Entre com a conta da unidade escolhida.';return;}state.selected=null;state.form={student:PigeOnline.person(),class_group_id:'',previous_school:'',relationship:'Responsável legal',notes:'',client_key:PigeOnline.newId()};state.editing=true;}
  function edit():void{state.assistSource='';state.step=0;state.section='admissions';selectedFile=null;const a=state.selected;if(!a)return;const {previous_school,...student}=a.student_data;state.form={student:{...student},class_group_id:a.class_group_id,previous_school:previous_school||'',relationship:a.relationship,notes:a.notes,client_key:PigeOnline.newId()};state.editing=true;}
  async function openRecord(id:string):Promise<void>{state.assistSource='';selectedFile=null;signedContractFile=null;const a=await request<Admission>('/admissions/'+id);state.selected=a;state.editing=false;state.acceptTerms=false;state.legal=false;state.charges=await request<PigeOnline.Charge[]>('/admissions/'+id+'/charges');state.campaign=await request<Campaign>('/admissions/'+id+'/campaign');state.slug=state.campaign.slug;state.schoolId=state.account?.school_id||state.campaign.school_id;state.documentType=a.document_types.find(d=>!a.attachments.some(f=>f.document_type_id===d.id&&f.review_status!=='rejected'))?.id||a.document_types[0]?.id||'';resetSigning();await loadSigningMethods();}
  async function view(id:string):Promise<void>{await run(()=>openRecord(id));}
  async function backToAdmissions():Promise<void>{await run(async()=>{state.selected=null;state.editing=false;selectedFile=null;signedContractFile=null;state.assistSource='';if(!state.campaign?.accepting){state.campaign=null;state.slug='';const campaigns=visibleCampaigns();if(campaigns.length===1){state.slug=campaigns[0].slug;await loadCampaign();}}});}
  async function save():Promise<void>{await run(async()=>{if(!state.campaign)throw new Error('Selecione um processo.');const issue=studentIssue(true);if(issue){state.step=issue.step;throw new Error(issue.message);}const a=state.selected;const {client_key,...data}=state.form;const body={...data,student:{...data.student,cpf:data.student.cpf||null}};const result=a?await request<Admission>('/admissions/'+a.id,{method:'PATCH',body:JSON.stringify({...body,version:a.version})}):await post<Admission>('/admissions',{...body,campaign_id:state.campaign.id,client_key});await openRecord(result.id);await loadList();state.notice='Dados salvos. Confira os documentos e conclua o envio para a escola.';});}
  function fileChange(e:Event):void{selectedFile=(e.target as HTMLInputElement).files?.[0]||null;}
  function signedContractChange(e:Event):void{signedContractFile=(e.target as HTMLInputElement).files?.[0]||null;}
  async function uploadSignedContract():Promise<void>{await run(async()=>{
    const a=state.selected;const contract=a?.contract;
    if(!a||!contract?.issued_document_id||!signedContractFile)throw new Error('Selecione o contrato em PDF assinado pelo responsável.');
    if(signedContractFile.type!=='application/pdf'||!signedContractFile.name.toLowerCase().endsWith('.pdf'))throw new Error('Envie o PDF assinado, sem imprimir nem converter em imagem.');
    const form=new FormData();form.set('file',signedContractFile);
    await request('/admissions/'+a.id+'/issued/'+contract.issued_document_id+'/external-signature',{method:'POST',body:form});
    await openRecord(a.id);await loadList();state.notice='Contrato recebido. A Secretaria verificará as assinaturas antes de efetivar a matrícula.';
  });}
  async function upload():Promise<void>{await run(async()=>{const a=state.selected;if(!a||!selectedFile||!state.documentType)throw new Error('Selecione o tipo e um arquivo PDF, PNG ou JPEG.');if(!/\.(pdf|png|jpe?g)$/i.test(selectedFile.name))throw new Error('Escolha um arquivo PDF, PNG ou JPEG.');if(!selectedFile.size)throw new Error('O arquivo está vazio. Selecione outro documento.');const data=new FormData();data.set('version',String(a.version));data.set('document_type_id',state.documentType);data.set('file',selectedFile);await request('/admissions/'+a.id+'/attachments',{method:'POST',body:data});selectedFile=null;await openRecord(a.id);state.notice='Documento enviado para conferência.';});}
  async function submit():Promise<void>{await run(async()=>{const a=state.selected;if(!a||!state.campaign)return;if(submissionIssues().length)throw new Error(submissionIssues().join('\n'));await post('/admissions/'+a.id+'/submit',{version:a.version,accept_terms:state.acceptTerms,legal_responsibility:state.legal,terms_version:state.campaign.terms_version});await openRecord(a.id);await loadList();state.notice='Inscrição enviada. Acompanhe a análise nesta página.';});}
  async function sendMessage():Promise<void>{await run(async()=>{if(!state.selected)return;await post('/admissions/'+state.selected.id+'/messages',{text:state.message});state.message='';await openRecord(state.selected.id);});}
  async function withdraw():Promise<void>{await run(async()=>{if(!state.selected||state.message.length<3)throw new Error('Descreva o motivo da desistência no campo de mensagem.');await post('/admissions/'+state.selected.id+'/withdraw',{version:state.selected.version,reason:state.message});state.message='';await openRecord(state.selected.id);await loadList();});}
  async function download(path:string,name:string):Promise<void>{await run(async()=>{const r=await fetch('/api/v1/portal'+path,{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw new Error('Não foi possível baixar o documento. Recarregue a página e confira seu acesso.');const url=URL.createObjectURL(await r.blob());const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);});}
  async function paginate(delta:number):Promise<void>{await run(async()=>{const previous=state.page;state.page=Math.max(1,state.page+delta);try{await loadList();}catch(e){state.page=previous;throw e;}});}
  async function refresh():Promise<void>{await run(async()=>{state.account=await request<Account>('/me');await loadList();await loadDiaryPortal();if(state.selected)await openRecord(state.selected.id);});}
  async function copy(value:string):Promise<void>{await run(async()=>{await navigator.clipboard.writeText(value);state.notice='Código copiado. Confira o beneficiário antes de pagar.';});}
  async function saveProfile():Promise<void>{await run(async()=>{if(!state.account)return;const a=state.account;validateContact(a);state.account=await request<Account>('/me',{method:'PATCH',body:JSON.stringify({version:a.version,name:a.name,cpf:a.cpf||null,phone:a.phone,address:a.address,whatsapp_opt_in:a.whatsapp_opt_in,...Object.fromEntries(detailFields.map(([key])=>[key,(a as unknown as Record<string,unknown>)[key]||(key==='birth_date'?null:'')]))})});await loadDiaryPortal();state.notice='Seus dados de contato foram atualizados.';});}

  const detailFields=[["birth_date", "Nascimento"], ["rg", "RG"], ["rg_issuer", "Órgão emissor"], ["birth_certificate", "Certidão"], ["mother_name", "Nome da mãe"], ["father_name", "Nome do pai"], ["postal_code", "CEP"], ["street", "Logradouro"], ["address_number", "Número"], ["address_complement", "Complemento"], ["district", "Bairro"], ["city", "Cidade"], ["state", "UF"], ["country", "País"]];
  const personAssistFields=['name','cpf','birth_date','phone','email','address',...detailFields.map(([key])=>key)];
  async function learningDownload(path:string,name:string):Promise<void>{await download(path.replace(/^\/portal/,''),name);}
  async function assistRequest<T>(path:string,options:RequestInit={}):Promise<T>{return request<T>(path.replace(/^\/portal/,''),options);}
  function readAttachment(id:string,who:'student'|'guardian'):void{
    if(!state.selected)return;const source='/portal/admissions/'+state.selected.id+'/attachments/'+id+'/ocr';
    if(who==='student'){edit();state.assistSource=source;}
    else{state.section='account';state.profileOpen=true;state.profileReadSource=source;void Vue.nextTick(()=>document.getElementById('portal-profile')?.scrollIntoView({block:'start'}));}
  }


  const formSteps=['Aluno','Turma e endereço','Revisão'];
  function friendlyField(field:string):string{
    const names:Record<string,string>={name:'Nome',email:'E-mail',password:'Senha',cpf:'CPF',phone:'Telefone',birth_date:'Nascimento',class_group_id:'Turma',relationship:'Vínculo com o aluno',accept_privacy:'Aviso de privacidade',accept_terms:'Confirmação dos dados',legal_responsibility:'Responsabilidade legal',terms_version:'Aviso de privacidade',student:'Dados do aluno',body:'Dados informados',code:'Código',address:'Endereço'};
    const parts=field.split('.');return names[parts[parts.length-1]]||'Dados informados';
  }
  function focusError():void{void Vue.nextTick(()=>{const alert=document.querySelector<HTMLElement>('#portal-error');alert?.focus();alert?.scrollIntoView({block:'nearest'});});}
  const today=():string=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bahia',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  function cpfValid(value:string|null):boolean{
    const digits=(value||'').replace(/\D/g,'');if(!digits)return true;
    if(!/^\d{11}$/.test(digits)||/^(\d)\1{10}$/.test(digits))return false;
    for(const size of [9,10]){let sum=0;for(let i=0;i<size;i++)sum+=Number(digits[i])*(size+1-i);const digit=(sum*10)%11;if(Number(digits[size])!==(digit===10?0:digit))return false;}return true;
  }
  function formatCPF(value:string|null):string{
    const v=(value||'').replace(/\D/g,'').slice(0,11);return v.replace(/^(\d{3})(\d)/,'$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/,'$1.$2.$3').replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/,'$1.$2.$3-$4');
  }
  function formatPhone(value:string):string{
    let v=value.replace(/\D/g,'');if(v.startsWith('55')&&(v.length===12||v.length===13))v=v.slice(2);
    if(v.length!==10&&v.length!==11)return value.trim();return '('+v.slice(0,2)+') '+v.slice(2,-4)+'-'+v.slice(-4);
  }
  function validateContact(person:{cpf:string|null;phone:string;whatsapp_opt_in:boolean}):void{
    if(!cpfValid(person.cpf))throw new Error('Confira o CPF do responsável. Informe os 11 dígitos válidos.');
    let digits=person.phone.replace(/\D/g,'');if(digits.length===10||digits.length===11)digits='55'+digits;
    if(digits&&!/^\d{12,15}$/.test(digits))throw new Error('Confira o telefone. Informe o DDD e o número completo.');
    if(person.whatsapp_opt_in&&!digits)throw new Error('Informe seu telefone para receber avisos por WhatsApp.');
  }
  function studentIssue(all=false):{step:number;message:string}|null{
    const student=state.form.student;
    if(student.name.trim().length<2)return{step:0,message:'Informe o nome completo do aluno.'};
    if(!student.birth_date||student.birth_date>today())return{step:0,message:'Informe uma data de nascimento válida, até hoje.'};
    if(!cpfValid(student.cpf))return{step:0,message:'Confira o CPF do aluno. Se ele não possui CPF, deixe o campo em branco.'};
    if(all||state.step>=1){
      if(!state.campaign?.groups.some(g=>g.id===state.form.class_group_id))return{step:1,message:'Selecione a turma pretendida.'};
      if(state.form.relationship.trim().length<2)return{step:1,message:'Informe seu vínculo com o aluno.'};
    }
    return null;
  }
  async function nextStep():Promise<void>{
    state.error='';const issue=studentIssue(state.step===2);if(issue){state.error=issue.message;state.step=issue.step;focusError();return;}
    if(state.step<2){state.step++;void Vue.nextTick(()=>document.querySelector<HTMLElement>('#admission-step-title')?.focus());return;}
    await save();
  }
  function selectSection(section:string):void{state.section=section;state.error='';state.notice='';if(section==='diary')void loadDiaryPortal();}
  function useGuardianAddress():void{
    const account=state.account;if(!account)return;state.form.student.address=account.address;
    for(const key of ['postal_code','street','address_number','address_complement','district','city','state','country'] as const)state.form.student[key]=account[key]||'';
  }
  const selectedGroup=():PigeOnline.Group|undefined=>state.campaign?.groups.find(g=>g.id===state.form.class_group_id);
  function documentStatus(id:string):string{
    const file=state.selected?.attachments.find(a=>a.document_type_id===id);
    return !file?'Pendente':file.review_status==='rejected'?'Reenviar documento':file.review_status==='validated'?'Conferido':'Enviado para conferência';
  }
  function submissionIssues():string[]{
    const issues:string[]=[];const campaign=state.campaign;const admission=state.selected;if(!campaign||!admission)return issues;
    if(!campaign.accepting&&admission.status!=='changes_requested')issues.push('O prazo de novas inscrições foi encerrado. Consulte a Secretaria.');
    if(campaign.require_verified_contact&&!state.account?.email_verified&&!state.account?.phone_verified)issues.push('Confirme seu e-mail ou telefone em Minha conta.');
    if(campaign.require_documents){const missing=admission.document_types.filter(d=>d.required&&!admission.attachments.some(a=>a.document_type_id===d.id&&a.review_status!=='rejected'));if(missing.length)issues.push('Envie os documentos obrigatórios: '+missing.map(d=>d.name).join(', ')+'.');}
    return issues;
  }
  function progressStep():number{const status=state.selected?.status;return status==='enrolled'?4:status==='approved'?3:status&&['submitted','under_review','waitlisted','rejected'].includes(status)?2:1;}

  const editable=():boolean=>!state.selected||['draft','changes_requested'].includes(state.selected.status);
  Vue.createApp({components:{'assist-panel':PigeAssist.component,'learning-portal':PigeLearning.component,'school-community':PigeCommunity.component},render:PigeRenders.portal,setup(){Vue.onMounted(()=>{PigeMFA.init(mfaRequest,afterMFA,logout,true);window.addEventListener('online',()=>{state.online=true;});window.addEventListener('offline',()=>{state.online=false;});if('serviceWorker'in navigator&&window.isSecureContext)void navigator.serviceWorker.register('/sw.js').catch(()=>{});void PigeInstitution.load();void start();});return {state,learningDownload,formSteps,today,formatCPF,formatPhone,nextStep,selectSection,useGuardianAddress,selectedGroup,documentStatus,submissionIssues,progressStep,start,visibleCampaigns,selectSchool,assistRequest,personAssistFields,detailFields,readAttachment,mfa:PigeMFA,identity:PigeInstitution.state,run,selectCampaign,login,register,logout,verifyRequest,verifyConfirm,resetRequest,resetConfirm,newAdmission,edit,view,backToAdmissions,save,fileChange,signing,personalCertificateChange,signPersonalA1,signGovbr,signedContractChange,uploadSignedContract,upload,submit,sendMessage,withdraw,download,paginate,refresh,copy,saveProfile,loadRegistrationTerms,openRegistration,chooseRegistrationPurpose,loadDiaryPortal,activateDiaryAccess,revokeDiaryAccess,markDiaryCommunicationRead,editable,label:PigeOnline.label,date:PigeOnline.date,money:PigeOnline.money,safeLink:PigeOnline.safeLink};}}).mount('#portal');
}
