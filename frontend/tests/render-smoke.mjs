/** Renderiza o shell compilado sem rede. Detecta vínculos ausentes no setup(),
 * inclusive manipuladores de eventos que o typecheck isolado não alcança. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {webcrypto as crypto} from "node:crypto";
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// A mesma regra cobre os portais e a recuperação de acesso, que usa JavaScript próprio.
for(const directory of ['src','public','templates']){
  for(const file of fs.readdirSync(path.join(root,directory)).filter(file=>/\.(?:js|ts|html)$/.test(file))){
    const source=fs.readFileSync(path.join(root,directory,file),'utf8');
    assert.doesNotMatch(source,/\b(?:window|globalThis|self)\s*\.\s*(?:confirm|alert|prompt)\s*\(/,
      directory+'/'+file+': use o diálogo de confirmação, aviso ou entrada do PIGE360.');
  }
}
// Não aceitar fechamento de fieldset fora do formulário (compilador de produção pode tolerar HTML inválido).
for(const filename of fs.readdirSync(path.join(root,'templates')).filter(name=>name.endsWith('.html'))) {
  let openFieldsets=0;
  for(const tag of fs.readFileSync(path.join(root,'templates',filename),'utf8').matchAll(/<\/?fieldset\b[^>]*>/g)) {
    if(tag[0].startsWith('</')) {assert.ok(openFieldsets>0,filename+': fechamento de fieldset sem abertura');openFieldsets--;}
    else openFieldsets++;
  }
  assert.equal(openFieldsets,0,filename+': fieldset não fechado');
}
const applications=[];
const document={createElement:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],title:''};
const sandbox={crypto,console,document,navigator:{onLine:true},location:{hash:'',pathname:'/',origin:'http://test'},history:{replaceState(){}},localStorage:{getItem:()=>null,setItem:()=>{}},URLSearchParams,URL,Intl,Headers,FormData,Blob,File,Event,CustomEvent,AbortController,AbortSignal,setTimeout,clearTimeout};
sandbox.window=sandbox;sandbox.addEventListener=()=>{};
sandbox.fetch=()=>{throw new Error('O teste de renderização não pode acessar a rede.');};
vm.createContext(sandbox);
for(const name of ['vendor/vue-3.5.13.global.prod.js','renders.js'])vm.runInContext(fs.readFileSync(path.join(root,'dist',name),'utf8'),sandbox,{filename:name});
sandbox.Vue.onMounted=()=>{};
sandbox.Vue.createApp=options=>({mount:()=>applications.push(options)});
vm.runInContext(fs.readFileSync(path.join(root,'dist/app.js'),'utf8'),sandbox,{filename:'app.js'});
const app=applications.pop();assert.ok(app);
const context=app.setup();
const render=()=>app.render.call(context,context,[]);
render();context.state.ready=true;render();context.state.configured=false;render();
context.state.configured=true;
// As marcações do login são removidas sem trocar logo, slogan, formulário ou layout.
function nodes(vnode) {
  if(!vnode || typeof vnode!=='object')return [];
  return [vnode,...(Array.isArray(vnode.children)?vnode.children.flatMap(nodes):[])];
}
// Ambos os atalhos ficam indisponíveis enquanto o assistente conclui a operação atual.
const workflow = sandbox.PigeEnrollmentWorkflow.component;
const enrollment = workflow.setup({schoolId:'school', permissions:[], role:'secretary'}, {emit(){}});
function checkEnrollmentLaunchers(busy) {
  const tree = workflow.render.call(enrollment, enrollment, []);
  for (const label of ['Assistente manual', 'Matricular selecionados']) {
    const button = nodes(tree).find(node => node.type === 'button' && node.children === label);
    assert.ok(button, label);
    assert.equal(Boolean(button.props?.disabled), busy, label);
  }
}
let finishEnrollment;
const pendingEnrollment = enrollment.run(() => new Promise(resolve => { finishEnrollment = resolve; }));
checkEnrollmentLaunchers(true);
finishEnrollment();
await pendingEnrollment;
checkEnrollmentLaunchers(false);
function loginLink(tree){return nodes(tree).filter(n=>n.type==='a' && n.props?.href==='/online');}
function loginText(tree){return nodes(tree).map(n=>typeof n.children==='string'?n.children:'').join(' ');}
let loginTree=render();
assert.equal(loginLink(loginTree).length,1,'Atalho visível nas instalações existentes');
assert.match(loginText(loginTree),/A gestão educacional\./);
assert.match(loginText(loginTree),/Organizada, de verdade\./);
assert.equal(nodes(loginTree).filter(n=>n.type==='form').length,1);
for(const removed of ['GESTÃO ESCOLAR','WEB / PWA','Alunos, famílias, matrículas e documentos reunidos',
                      'Cadastro único','Matrículas e turmas','Documentação e histórico','Dados sob gestão da instituição']) {
  assert.ok(!loginText(loginTree).includes(removed),'Trecho removido: '+removed);
}
context.identity.show_preenrollment_button=false;
loginTree=render();assert.equal(loginLink(loginTree).length,0,'Ocultar o atalho por configuração pública');
context.identity.show_preenrollment_button=true;
assert.equal(loginLink(render()).length,1,'Reativar o atalho sem mudar de tela');
console.log('Login smoke: remoções pontuais, slogan preservado e atalho configurável OK.');
context.state.user={id:'test-admin',name:'Administrador',role:'admin',admin_tools:{portability:true,diagnostics:true,audit:true,develop_build:false},permissions:[...new Set([...fs.readFileSync(path.join(root,'templates/app.html'),'utf8').matchAll(/can\('([^']+)'\)/g)].map(match=>match[1]))]};
context.state.schoolId='school-test';context.state.schools=[{id:'school-test',company_id:'company-test',name:'Escola de teste'}];
context.state.supportHub={id:'support-test',school_id:'school-test',enabled:false,enabled_areas:['online_enrollment','news'],base_url:'https://hub.example.com',position:'left',widget_type:'standard',launcher_title:'Atendimento',token_configured:true,version:1};
context.editSupportHub();await Promise.resolve();
assert.ok(Array.isArray(context.state.modal.form.enabled_areas),'As áreas do atendimento devem iniciar como lista, nunca como booleano');
assert.deepEqual(Array.from(context.state.modal.form.enabled_areas),['online_enrollment','news']);
assert.equal(context.modalDirty(),false,'Abrir sem editar preserva o estado inicial do formulário');
context.state.modal.form.enabled_areas.push('guardian_portal');
assert.deepEqual(Array.from(context.state.supportHub.enabled_areas),['online_enrollment','news'],'Editar não altera a configuração salva antes de confirmar');
context.closeModal(true);context.editSupportHub();await Promise.resolve();
assert.deepEqual(Array.from(context.state.modal.form.enabled_areas),['online_enrollment','news'],'Cancelar e reabrir restaura as áreas salvas');
context.closeModal(true);
{
 const api=sandbox.PigeAPI,originalRequest=api.request,originalPost=api.post;
 const {state}=context,requests=[],replies=[],creations=[];
 const protocol={id:'p1',version:2,number:'PRO-0001',kind:'Atendimento escolar',created_at:'2026-10-10T13:00:00Z',updated_at:'2026-10-10T14:00:00Z',requester_user_id:'u1',requester_name:'Nome do responsável',source:'family',category:'secretaria',status:'open',preferred_channel:'email',history:[
  {id:'e1',visibility:'public',actor_name:'Responsável',message:'Preciso do histórico.',created_at:'2026-10-10T13:00:00Z'},
  {id:'e2',action:'note',actor_name:'Secretaria',message:'Anotação da equipe.',created_at:'2026-10-10T14:00:00Z'}]};
 const priorPage=state.page,priorRows=state.rows;
 try{
  state.page='protocols';
  api.request=async(path,options)=>{
   requests.push(path);
   if(path.includes('/protocol-requesters?'))return {page:1,total:2,page_size:30,items:[{id:'teacher',name:'Docente',role:'teacher'},{id:'u1',name:'Responsável',role:'guardian'}]};
   if(path.endsWith('/u1/students'))return {items:[{id:'pedag',name:'Acadêmico',academic_authorized:true,financial_authorized:false},{id:'fin',name:'Financeiro',academic_authorized:false,financial_authorized:true}]};
   if(path.endsWith('/messages')){
    assert.ok(options.body instanceof FormData);
    replies.push({message:options.body.get('message'),key:options.body.get('client_key')});
    if(replies.length===1)throw Error('Sem confirmação do envio.');
    return protocol;
   }
   if(path.includes('/protocols?'))return {items:[protocol],total:1};
   if(path.endsWith('/protocols/p1'))return protocol;
   throw Error('Consulta inesperada '+path);
  };
  api.post=async(path,body)=>{assert.ok(path.endsWith('/protocols'));creations.push(body);return protocol;};
  state.rows=[protocol];
  assert.ok(nodes(render()).some(node=>node.type==='small' && node.children==='Aberto em 10/10/2026'));
  assert.ok(nodes(render()).some(node=>node.type==='small' && typeof node.children==='string' && node.children.startsWith('Última atividade 10/10/2026')));
  await context.viewProtocol('p1');
  assert.equal(context.protocolEvents('internal').length,1);
  assert.equal(context.protocolEvents('public').length,1);
  assert.equal(context.protocolEvents('public')[0].message,'Preciso do histórico.');
  assert.ok(nodes(render()).some(n=>n.type==='button'&&n.children==='Responder ao solicitante'));
  const notices=()=>nodes(render()).filter(node=>node.type==='small'&&node.props?.class?.includes('protocol-notification'));
  assert.equal(notices().length,0,'Protocolo sem job de aviso não apresenta estado de envio');
  const event=state.modal.target.history[0];
  for(const [status,expected] of Object.entries({pending:'Na fila de envio',retry:'Aguardando nova tentativa',processing:'Envio em andamento',completed:'Aceito pelo serviço de WhatsApp',failed:'Falha no envio',uncertain:'Envio sem confirmação do serviço'})){
   event.notification={channel:'whatsapp',status};
   assert.equal(notices().length,1,'O estado só aparece na mensagem que possui aviso');
   assert.ok(notices()[0].children.includes(expected),status);
  }
  event.notification={channel:'email',status:'completed'};
  assert.equal(notices()[0].children,'Aceito pelo serviço de e-mail');
  event.notification=null;
  assert.equal(notices().length,0);
  context.replyProtocol();state.modal.form.message='  Vamos conferir.  ';
  await context.saveModal();
  assert.match(state.modal.error,/Sem confirmação do envio/);
  await context.saveModal();
  assert.deepEqual(replies[0],replies[1]);
  assert.equal(replies[1].message,'Vamos conferir.');
  assert.equal(state.modal.kind,'protocol-detail');
  context.startPortalProtocol();
  await context.searchProtocolRequesters();
  await context.chooseProtocolRequester('u1');
  state.modal.form.category='financeiro';context.syncProtocolStudent();
  assert.equal(state.modal.form.student_id,'fin');
  state.modal.form.category='pedagogico';context.syncProtocolStudent();
  assert.equal(state.modal.form.student_id,'pedag');
  await context.chooseProtocolRequester('teacher');
  assert.equal(state.modal.form.student_id,'');
  state.modal.form.kind='Orientação escolar';state.modal.form.description='Mensagem institucional.';
  await context.saveModal();
  assert.equal(creations.length,1);
  assert.equal(creations[0].student_id,null);
  assert.equal(creations[0].requester_user_id,'teacher');
  assert.equal(creations[0].category,'pedagogico');
  assert.ok(/^[\da-f-]{36}$/i.test(creations[0].client_key));
  console.log('Protocolos: histórico público e interno, resposta idempotente e abertura autorizada por conta/vínculo OK.');
 }finally{context.closeModal(true);state.page=priorPage;state.rows=priorRows;api.request=originalRequest;api.post=originalPost;}
}
await (await import('./person-record-flow.mjs')).testPersonRecords({context,sandbox,render,nodes});
const originalObjectUrl=sandbox.PigeAPI.objectUrl;
let activePhotos=0,maxActivePhotos=0;
const photoRequests=[];
sandbox.PigeAPI.objectUrl=path=>new Promise(resolve=>{
  activePhotos++;maxActivePhotos=Math.max(maxActivePhotos,activePhotos);
  photoRequests.push({path,done:false,finish(){activePhotos--;this.done=true;resolve('blob:synthetic-'+path);}});
});
for(let index=0;index<9;index++){
  const row={photo_file_id:'photo-'+index};context.photoSrc(row);context.photoSrc(row);
}
await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(photoRequests.length,4,'A lista inicia no máximo quatro downloads simultâneos');
for(let index=0;index<9;index++){
  const request=photoRequests.find(item=>!item.done);assert.ok(request);request.finish();
  await new Promise(resolve=>setTimeout(resolve,0));
}
assert.equal(photoRequests.length,9,'Cada foto é solicitada uma única vez durante re-render');
assert.ok(maxActivePhotos<=4,'Os downloads de foto permanecem limitados durante toda a fila');
sandbox.PigeAPI.objectUrl=originalObjectUrl;
for(const page of Object.keys(context.pageLabels)){context.state.page=page;render();}
context.state.page='legacy-import';
assert.ok(nodes(render()).some(n=>n.type==='legacy-import-panel'||n.type===sandbox.PigeLegacyImport.component),'Importação monta componente seletivo');
const importContext=sandbox.PigeLegacyImport.component.setup({schoolId:'school-test',schoolName:'Escola de teste',units:[]});
const importRender=()=>sandbox.PigeRenders.legacyImport.call(importContext,importContext,[]);
assert.match(loginText(importRender()),/Analisar arquivo/);
importContext.state.inventory={tables:[{name:'alunos',rows:2,selected_rows:0,destination:'Alunos'}],records:{}};
importContext.toggleTable('alunos');
assert.deepEqual(Array.from(importContext.state.selection.tables),['alunos']);
assert.match(loginText(importRender()),/Escolher registros/);
importContext.state.preview={can_apply:true,selected_record_count:2,destination:{school_name:'Escola de teste'},tables:[{name:'alunos',selected_rows:2,destination:'Alunos'}],issues:[],warnings:[]};
assert.match(loginText(importRender()),/Confira antes de importar/);
importContext.toggleTable('alunos');assert.equal(importContext.state.preview,null,'Mudar seleção invalida a confirmação');
{
 const props={schoolId:'school-test',catalogs:{},canIssue:true,canSign:true};
 const reports=sandbox.PigeReports.component.setup(props);
 reports.kit.recipients=[{id:'enrollment-1',name:'Aluno sintético',number:'M1',class_name:'Turma',last_revision:2}];
 const item=reports.kit.recipients[0],post=sandbox.PigeAPI.post,confirmation=sandbox.PigeDialogs.confirm,writes=[];
 let decide,questions=0;
 sandbox.PigeDialogs.confirm=(_message,options)=>{assert.equal(options.confirmLabel,'Emitir e assinar');questions++;return new Promise(resolve=>{decide=resolve;});};
 sandbox.PigeAPI.post=async(path)=>{writes.push(new URL(path,'https://app.test'));return {revision:3};};
 const cancelled=reports.reissue(item);await reports.reissue(item);
 assert.equal(questions,1);decide(false);await cancelled;assert.equal(writes.length,0);
 const revoked=reports.reissue(item);props.canSign=false;decide(true);await revoked;assert.equal(writes.length,0);
 props.canSign=true;
 const approved=reports.reissue(item);decide(true);await approved;
 assert.equal(writes.length,1);assert.equal(writes[0].pathname,'/schools/school-test/reports/bulletins/enrollment-1/issue');
 assert.equal(writes[0].searchParams.get('expected_revision'),'2');assert.ok(writes[0].searchParams.get('operation'));
 assert.equal(item.last_revision,3);
 sandbox.PigeAPI.post=post;sandbox.PigeDialogs.confirm=confirmation;
}
const reportContext=sandbox.PigeReports.component.setup({schoolId:'school-test',catalogs:{}});
reportContext.identity={display_name:'Instituição Sintética',logo_url:'/logo-escola',app_version:'0.0.1'};
const reportRender=()=>sandbox.PigeRenders.reports.call(reportContext,reportContext,[]);
reportContext.period();assert.ok(reportContext.state.dateFrom<reportContext.state.dateTo);
assert.match(loginText(reportRender()),/Últimos três meses completos/);
reportContext.state.result={module:'Matrículas',school_name:'Unidade de teste',generated_at:'2026-09-30T11:00:00Z',description:'Matrículas da unidade',status_summary:[{label:'Ativo',count:1}],title:'Matrículas',period:{label:'Teste',date_from:'2026-07-01',date_to:'2026-09-30'},summary:[{key:'total',label:'Total',value:1,type:'integer'}],filters:[],columns:[{key:'name',label:'Aluno',type:'text'}],items:[{name:'Aluno Sintético'}],total:1,page_size:30,monthly:[],notes:[]};
assert.match(loginText(reportRender()),/Aluno Sintético/);
assert.match(loginText(reportRender()),/Distribuição por situação/);
assert.match(loginText(reportRender()),/Uso restrito/);
assert.ok(nodes(reportRender()).some(node=>node.type==='img' && node.props.src==='/logo-escola'));
context.state.page='help';let guideTree=render();assert.match(loginText(guideTree),/Siga a ordem da rotina escolar/);assert.match(loginText(guideTree),/Cadastre cada pessoa uma vez/);
const guidePermissions=context.state.user.permissions;
context.state.user.permissions=[...guidePermissions,'users.manage','admissions.read','diary.configure','diary.read','enrollments.read','educacenso.manage'];
assert.ok(context.state.guideChoices().some(topic=>topic.id==='census-individual'));
for (const topic of context.state.guideChoices()) {
  context.state.guideSelection.topic=topic.id;
  const image=nodes(render()).find(node=>node.type==='img' && node.props?.src==='/guia/'+topic.image+'.webp');
  assert.ok(image?.props.alt && topic.steps.length>=2, 'Orientações e imagem acessíveis para '+topic.title);
  const bytes=fs.readFileSync(path.join(root,'dist','guia',topic.image+'.webp'));
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
}
context.state.user.permissions=['diary.read'];
assert.ok(!context.state.guideChoices().some(item=>['users','diary','census-individual'].includes(item.id)));
assert.ok(context.state.guideChoices().some(item=>item.id==='teacher'));
context.state.guideSelection.topic='users';
assert.equal(context.state.currentGuide().id,'navigation');
context.state.user.permissions=guidePermissions;
context.state.guideSelection.topic='navigation';
context.state.page='students';assert.match(loginText(render()),/Novo aluno/);assert.ok(!loginText(render()).includes('Pesquise antes de criar uma nova identidade'),'Orientação redundante removida da listagem');
const originalRequest=sandbox.PigeAPI.request;let routeCalls=[];
sandbox.PigeAPI.request=async path=>{routeCalls.push(path);return {};};
context.state.page='diary';await context.loadPage();context.state.page='help';await context.loadPage();context.state.page='contracts';await context.loadPage();
assert.deepEqual(routeCalls,[],'Diário, Contratos e Guia são carregados por seus componentes; não devem requisitar recursos inexistentes');
let shortQueryCalls=0;sandbox.PigeAPI.request=async()=>{shortQueryCalls++;return {items:[],total:0};};
context.searchPersons('a');await new Promise(resolve=>setTimeout(resolve,280));
assert.equal(shortQueryCalls,0,'A busca de identidade exige dois caracteres antes de consultar a API');
let pendingSearches=[];sandbox.PigeAPI.request=path=>new Promise(resolve=>pendingSearches.push({path,resolve}));
context.searchPersons('ma');await new Promise(resolve=>setTimeout(resolve,280));
context.searchPersons('maria');await new Promise(resolve=>setTimeout(resolve,280));
assert.equal(pendingSearches.length,2);
pendingSearches[1].resolve({items:[{id:'latest-person',name:'Maria'}],total:1});await new Promise(resolve=>setTimeout(resolve,0));
pendingSearches[0].resolve({items:[{id:'stale-person',name:'Ma'}],total:1});await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(context.state.personChoices[0].id,'latest-person','Uma resposta antiga não pode substituir os resultados da busca mais recente');
sandbox.PigeAPI.request=originalRequest;
const adminUser=context.state.user;
context.state.user={id:'teacher-test',name:'Professor',role:'teacher',permissions:['diary.read'],school_ids:['school-test']};
context.state.page='dashboard';await context.navigate('help');assert.equal(context.state.page,'help');assert.match(loginText(render()),/Professores acessam somente as turmas atribuídas/);
await context.navigate('diary');assert.equal(context.state.page,'diary','Professor com diary.read deve conseguir abrir o Diário');
context.state.page='dashboard';context.state.user={...context.state.user,permissions:[]};await context.navigate('diary');assert.equal(context.state.page,'dashboard','Acesso ao Diário continua protegido pela permissão');
context.state.user=adminUser;
console.log('Route and registration smoke: Diário sem rota fantasma, Guia acessível e busca de identidade limitada e ordenada OK.');
assert.equal(typeof context.newPerson,'function','newPerson deve ser exposta por setup()');
context.state.page='students';context.newStudent();
const studentFormTree=render();
assert.ok(nodes(studentFormTree).some(n=>n.props?.class==='family-editor'),'Cadastro do aluno preserva o editor de vínculos familiares');
assert.ok(!nodes(studentFormTree).some(n=>n.props?.class==='family-shell'),'Portal independente não substitui fragmento do cadastro');
context.state.modal.kind='';
context.state.page='people';context.newPerson();render();
assert.equal(context.state.modal.kind,'person');
assert.equal(context.state.modal.title,'Cadastrar pessoa');
assert.ok(context.state.modal.fields.some(f=>f.key==='person_types'));
context.closeModal();
vm.runInContext(fs.readFileSync(path.join(root,'dist/portal.js'),'utf8'),sandbox,{filename:'portal.js'});
const portal=applications.pop(),portalContext=portal.setup();
portal.render.call(portalContext,portalContext,[]);
assert.equal(context.identity.display_name,'Sua escola');
console.log('Render smoke: shell, páginas administrativas, Cadastro Único e portal OK.');
portalContext.state.ready=true;portalContext.state.schoolId='school-test';portalContext.state.schools=[{id:'school-test',name:'Escola de teste'}];
let portalTree=portal.render.call(portalContext,portalContext,[]);
assert.equal(nodes(portalTree).filter(n=>n.type==='select').length,0,'Não apresentar seleção vazia');
assert.match(loginText(portalTree),/Não há processo de matrícula aberto/);
portalContext.state.catalogFailed=true;portalTree=portal.render.call(portalContext,portalContext,[]);
assert.match(loginText(portalTree),/Não foi possível consultar/);
assert.ok(!loginText(portalTree).includes('Não há processo de matrícula aberto'));
// The publication controls the one student portal shortcut; all enrollment content stays intact.
const studentPortalLinks=tree=>nodes(tree).filter(n=>n.type==='a'&&n.children==='Portal do Aluno');
portalContext.state.catalogFailed=false;
assert.equal(studentPortalLinks(portal.render.call(portalContext,portalContext,[])).length,0,'No campaign means no publication-specific shortcut');
portalContext.state.campaign={title:'Matrículas',school_name:'Escola',opens_on:'2026-01-01',closes_on:'2027-12-31',accepting:true,show_student_portal_button:true,student_portal_url:'https://portal.example.test/family'};
let shortcutTree=portal.render.call(portalContext,portalContext,[]);
assert.equal(studentPortalLinks(shortcutTree).length,1);
assert.equal(studentPortalLinks(shortcutTree)[0].props.href,'https://portal.example.test/family');
assert.doesNotMatch(loginText(shortcutTree),/Área da escola|Portal do aluno e responsável/);
assert.match(loginText(shortcutTree),/O próximo passo|Cadastro/);
portalContext.state.campaign.show_student_portal_button=false;
assert.equal(studentPortalLinks(portal.render.call(portalContext,portalContext,[])).length,0);
portalContext.state.campaign=null;
const diagnosticContext=sandbox.PigeDiagnostics.component.setup();
sandbox.PigeDiagnostics.component.render.call(diagnosticContext,diagnosticContext,[]);
console.log('Portal vazio, falha de API e render do diagnóstico OK.');

const diaryComponent=sandbox.PigeDiary.component;
const diaryContext=sandbox.Vue.proxyRefs(diaryComponent.setup({schoolId:'school-test',permissions:['diary.read','diary.configure']}));
const renderDiary=()=>diaryComponent.render.call(diaryContext,diaryContext,[]);
let diaryCalls=[];
sandbox.PigeAPI.request=async path=>{diaryCalls.push(path);if(path.endsWith('/academic-years'))return[{id:'year-test',name:'2026',status:'active',starts_on:'2026-01-01',ends_on:'2026-12-31'}];if(path.endsWith('/diary-dashboard'))return{items:[],totals:{}};if(path.endsWith('/diary-entry-fields'))return{version:0,fields:[],standard_columns:{}};return[];};
await diaryContext.load();
assert.ok(diaryCalls.includes('/schools/school-test/academic-years'));
assert.ok(!diaryCalls.includes('/schools/school-test/diary'));
diaryContext.state.tab='setup';let diaryTree=renderDiary();
assert.match(loginText(diaryTree),/Como usar o Diário/);
assert.match(loginText(diaryTree),/2026/);
sandbox.PigeAPI.request=originalRequest;
console.log('Diary smoke: roteiro visível, ano letivo legível e endpoints da tela válidos OK.');

// O kit privado é importado apenas no editor. A emissão depende de prévia sem lacunas.
const contracts=sandbox.PigeContracts.component;
const contractContext=contracts.setup({schoolId:'school-test',permissions:['academic.write','documents.read','documents.generate'],enrollmentId:''});
const renderContracts=()=>contracts.render.call(contractContext,contractContext,[]);
assert.match(loginText(renderContracts()),/Biblioteca de modelos/);
contractContext.state.years=[{id:'year-2027',name:'Ano letivo 2027'}];
let templateCreated=null,issueCalls=0,downloadCalls=0;
const originalPost=sandbox.PigeAPI.post,originalDownload=sandbox.PigeAPI.download;
const newTemplate={id:'template-1',version:1,name:'Prestação de serviços 2027',kind:'educational_contract',header:'',body:'ALUNO: {{aluno.nome}}; ANUIDADE: {{financeiro.anuidade}}',footer:'',academic_year_id:'year-2027',active:false};
sandbox.PigeAPI.post=async(path,payload)=>{
  if(path.endsWith('/document-templates')){templateCreated=payload;return newTemplate;}
  if(path.endsWith('/preview'))return {content:'ALUNO: Maria; ANUIDADE: '+(payload.values['financeiro.anuidade']||'{{financeiro.anuidade}}'),header:'',footer:'',variables:{'aluno.nome':'Maria','financeiro.anuidade':payload.values['financeiro.anuidade']||''},missing_fields:payload.values['financeiro.anuidade']?[]:['financeiro.anuidade'],template_version:1};
  if(path.endsWith('/issue')){issueCalls++;return{id:'issued-1',file_id:'file-1',template_name:'Prestação de serviços 2027'};}
  throw new Error('POST inesperado: '+path);
};
sandbox.PigeAPI.request=async path=>path.includes('/document-templates?')?{items:[{...newTemplate,active:true}]}:[];
sandbox.PigeAPI.download=async()=>{downloadCalls++;};
const kit={name:'Prestação de serviços 2027',kind:'educational_contract',body:newTemplate.body};
await contractContext.importJson({target:{files:[{name:'modelo-2027.json',size:400,text:async()=>JSON.stringify(kit)}],value:'kit'}});
assert.equal(contractContext.state.draft.academic_year_id,'year-2027');
assert.equal(contractContext.state.draft.active,false,'Kit importado aguarda revisão antes de ativar');
assert.equal(contractContext.state.draft.require_signature,true,'Contrato exige assinatura A1 por padrão');
assert.equal(templateCreated,null,'Importação local não publica o contrato');
assert.match(loginText(renderContracts()),/Papel timbrado/);
await contractContext.save();assert.equal(templateCreated.active,false);assert.equal(templateCreated.academic_year_id,'year-2027');assert.equal(templateCreated.require_signature,true);
contractContext.state.enrollment={id:'enrollment-1',student_id:'student-1',number:'1',student_name:'Maria',year_name:'2027'};
contractContext.state.applicable=[{...newTemplate,active:true}];contractContext.state.templateId='template-1';contractContext.state.tab='issue';
await contractContext.preview();assert.deepEqual(Array.from(contractContext.state.preview.missing_fields),['financeiro.anuidade']);
await contractContext.issue();assert.equal(issueCalls,0,'Emissão bloqueada com campos pendentes');
contractContext.setValue('financeiro.anuidade',{target:{value:'1200,00'}});
assert.equal(contractContext.state.previewStale,true);
await contractContext.preview();await contractContext.issue();assert.equal(issueCalls,1);assert.equal(downloadCalls,1);
// A decisão pertence à mesma versão do modelo e da matrícula que abriu a confirmação.
const originalContractDecision=sandbox.PigeDialogs.confirm;
try{
  contractContext.state.draft.name='Modelo com alteração';
  const currentModel=contractContext.state.draft;
  sandbox.PigeDialogs.confirm=async()=>false;
  await contractContext.useBuiltin();
  assert.equal(contractContext.state.draft,currentModel,'Cancelar mantém o modelo em edição e dispensa a consulta ao catálogo.');
  let allowDiscard;
  sandbox.PigeDialogs.confirm=()=>new Promise(resolve=>{allowDiscard=resolve;});
  const closing=contractContext.cancelEdit();
  currentModel.name='Uma revisão posterior';
  allowDiscard(true);await closing;
  assert.equal(contractContext.state.editing,true,'Uma edição posterior invalida a confirmação antiga.');

  contractContext.state.draftDirty=true;
  contractContext.state.templateId='template-1';
  contractContext.state.applicable.push({...newTemplate,id:'template-2'});
  const selector={value:'template-2'};
  sandbox.PigeDialogs.confirm=async()=>false;
  await contractContext.selectTemplate({target:selector});
  assert.equal(selector.value,'template-1');
  assert.equal(contractContext.state.draftDirty,true);
  sandbox.PigeDialogs.confirm=async()=>true;
  selector.value='template-2';await contractContext.selectTemplate({target:selector});
  assert.equal(contractContext.state.templateId,'template-2');
  assert.equal(contractContext.state.draftDirty,false);
}finally{sandbox.PigeDialogs.confirm=originalContractDecision;}
sandbox.PigeAPI.post=originalPost;sandbox.PigeAPI.request=originalRequest;sandbox.PigeAPI.download=originalDownload;
console.log('Contracts smoke: JSON privado, vigência, campos pendentes e emissão conferidos OK.');

// Configuração, pendências e conferência têm dados e ações próprios.
const signingComponent=sandbox.PigeSigning.component;
const signingProps={schoolId:'school-test',permissions:['schools.manage','documents.read','documents.validate','documents.generate'],role:'admin',enrollmentId:'',issuedId:''};
const signing=signingComponent.setup({...signingProps,mode:'certificate'});
let receivedA1=false,receivedValidation=false,receivedPreferences=false,reviewStatus='pending_validation';
const signingRequests=[];
document.getElementById=()=>null;
sandbox.PigeAPI.request=async(path,options={})=>{
  signingRequests.push(path);
  assert.ok(path.startsWith('/schools/school-test/'),'Todos os dados pertencem à escola ativa');
  if(path.endsWith('/signing-certificate/a1')){
    if(options.method==='PUT'){receivedA1=true;assert.equal(options.body.get('password'),'senha-de-teste');return {subject:'CN=Escola',expires_at:'2028-12-31T00:00:00Z',certificate_sha256:'a'.repeat(64)};}
    return{configured:receivedA1,certificate:receivedA1?{subject:'CN=Escola',expires_at:'2028-12-31T00:00:00Z',certificate_sha256:'a'.repeat(64)}:null};
  }
  if(path.endsWith('/signing-certificate/alert-preferences')){
    if(options.method==='PUT'){const prefs=JSON.parse(options.body);assert.equal(prefs.email_enabled,true);assert.equal(prefs.whatsapp_enabled,false);receivedPreferences=true;}
    return{email_enabled:receivedPreferences,whatsapp_enabled:false,email:'direcao@example.com',phone_available:false};
  }
  if(path.includes('/issued-documents/signatures/unsigned'))return{items:[{document_id:'issued-2',student_name:'João',signature_status:'unsigned',file_id:'original-2',kind:'enrollment'}],total:1};
  if(path.includes('/issued-documents/signatures/pending'))return{items:[{document_id:'issued-1',student_name:'Maria',enrollment_id:'enrollment-1',signature_status:'pending_validation'}],total:1};
  if(path.endsWith('/issued-documents/issued-1/signatures'))return{document_id:'issued-1',status:reviewStatus,file_id:'signed-1',signature_valid:true,cryptographic_valid:true,trust_status:'trusted',signatures:[],revisions:[]};
  if(path.endsWith('/issued-documents/issued-1/validate-signature')){receivedValidation=true;reviewStatus='verified';assert.equal(options.body.get('signer_cpf'),'12345678909');return{signature_status:'verified'};}
  if(path.endsWith('/enrollments/enrollment-1'))return{student_id:'student-1'};
  if(path.endsWith('/students/student-1/documents'))return{issued:[{id:'issued-1',kind:'template',enrollment_id:'enrollment-1'},{id:'issued-other',kind:'template',enrollment_id:'enrollment-other'}]};
  throw new Error('Requisição inesperada: '+path);
};
const renderSigning=context=>signingComponent.render.call(context,context,[]);
await signing.load();
assert.match(loginText(renderSigning(signing)),/Certificado A1/);
assert.doesNotMatch(loginText(renderSigning(signing)),/Assinaturas pendentes|Conferência de assinaturas|Assinar XML|Documentos fiscais/);
assert.ok(signingRequests.every(path=>path.includes('/signing-certificate/')),'Configuração não carrega filas de documentos');
const p12=new File(['conteúdo de teste'],'escola.p12',{type:'application/x-pkcs12'});
signing.certificateChanged({target:{files:[p12]}});signing.state.certificatePassword='senha-de-teste';
await signing.saveCertificate();assert.ok(receivedA1);assert.equal(signing.state.certificatePassword,'');
signing.state.alerts.email_enabled=true;await signing.saveAlertPreferences();assert.ok(receivedPreferences);
{
 const permissions={...signingProps,mode:'certificate'},scoped=signingComponent.setup(permissions);
 await scoped.load();
 const confirmation=sandbox.PigeDialogs.confirm,request=sandbox.PigeAPI.request;
 let decide,questions=0,deletions=0;
 sandbox.PigeDialogs.confirm=(_message,options)=>{assert.equal(options.destructive,true);questions++;return new Promise(resolve=>{decide=resolve;});};
 sandbox.PigeAPI.request=async(path,options={})=>{if(options.method==='DELETE'){deletions++;return {};}return request(path,options);};
 const cancelled=scoped.removeCertificate();await scoped.removeCertificate();
 assert.equal(questions,1);decide(false);await cancelled;assert.equal(deletions,0);
 const revoked=scoped.removeCertificate();permissions.role='secretary';decide(true);await revoked;assert.equal(deletions,0);
 permissions.role='admin';
 const stale=scoped.removeCertificate();scoped.state.certificate.certificate_sha256='replacement';decide(true);await stale;assert.equal(deletions,0);
 const approved=scoped.removeCertificate();decide(true);await approved;assert.equal(deletions,1);
 sandbox.PigeDialogs.confirm=confirmation;sandbox.PigeAPI.request=request;
}
let firstRequest=signingRequests.length;
const signatureQueue=signingComponent.setup({...signingProps,mode:'pending-signatures'});
await signatureQueue.load();
assert.match(loginText(renderSigning(signatureQueue)),/Assinaturas pendentes/);
assert.doesNotMatch(loginText(renderSigning(signatureQueue)),/Conferência de assinaturas|Avisos de vencimento|Assinar XML/);
assert.ok(signingRequests.slice(firstRequest).every(path=>path.endsWith('/signing-certificate/a1')||path.includes('/signatures/unsigned')),'Pendências carregam somente assinatura da escola');
firstRequest=signingRequests.length;
const signatureReview=signingComponent.setup({...signingProps,mode:'signature-review'});
await signatureReview.load();
assert.match(loginText(renderSigning(signatureReview)),/Conferência de assinaturas/);
assert.doesNotMatch(loginText(renderSigning(signatureReview)),/Assinaturas pendentes|Avisos de vencimento|Assinar XML/);
assert.ok(signingRequests.slice(firstRequest).every(path=>path.includes('/signatures/pending')),'Conferência não carrega certificado ou fila de assinatura da escola');
await signatureReview.openReview('issued-1');
signatureReview.reportChanged({target:{files:[new File(['%PDF-1.4'],'validar.pdf',{type:'application/pdf'})]}});
signatureReview.state.signerCpf='123.456.789-09';signatureReview.state.validationReference='VALIDAR-123';signatureReview.state.confirmedReview=true;
await signatureReview.validate();assert.ok(receivedValidation);assert.equal(signatureReview.state.review.status,'verified');
firstRequest=signingRequests.length;
const enrollmentDocuments=signingComponent.setup({...signingProps,mode:'document',enrollmentId:'enrollment-1'});
await enrollmentDocuments.load();
assert.equal(enrollmentDocuments.state.enrollmentIssued.length,1,'Documentos de outra matrícula não aparecem no contexto selecionado');
assert.equal(enrollmentDocuments.state.enrollmentIssued[0].id,'issued-1');
assert.ok(signingRequests.slice(firstRequest).every(path=>!path.includes('/signatures/pending')&&!path.includes('/signatures/unsigned')),'A matrícula não carrega filas gerais');
assert.ok(signingRequests.every(path=>!path.includes('/fiscal-signatures')),'Interface fiscal permanece fora destes fluxos');
let finishOldSchool;
const changingProps={...signingProps,schoolId:'school-old',mode:'pending-signatures'};
const staleSigning=signingComponent.setup(changingProps);
sandbox.PigeAPI.request=path=>path.includes('/signatures/unsigned')?new Promise(resolve=>{finishOldSchool=resolve;}):Promise.resolve({configured:false,certificate:null});
const loadingOldSchool=staleSigning.load();
changingProps.schoolId='school-new';
finishOldSchool({items:[{document_id:'old-school-document',student_name:'Documento de outra entidade'}],total:1});
await loadingOldSchool;
assert.equal(staleSigning.state.unsigned.length,0,'Resposta tardia da escola anterior deve ser descartada');
assert.equal(staleSigning.isCurrent(),false);
assert.doesNotMatch(loginText(renderSigning(staleSigning)),/Documento de outra entidade/);
sandbox.PigeAPI.request=originalRequest;
console.log('Signing smoke: telas separadas, A1 efêmero, revisão por matrícula e isolamento de respostas tardias OK.');

// Campanha salva o modelo selecionado; a inscrição aprovada emite a revisão congelada.
const expansion=sandbox.PigeExpansion.component.setup({schoolId:'school-test',page:'online',permissions:['admissions.manage','admissions.write','documents.read','documents.generate']});
const originalPatch=sandbox.PigeAPI.patch;
const templateChoice={id:'template-contract',version:8,name:'Contrato 2027',kind:'educational_contract',active:true,require_signature:true,academic_year_id:'year-2027'};
const group={id:'group-2027',academic_year_id:'year-2027',name:'Turma A',capacity:30};
let campaignSaved=null,frozenPreviewVersion=0,frozenIssueVersion=0,finalizeCount=0;
const admission={id:'admission-1',version:3,number:'PRE-1',status:'approved',enrollment_id:'enrollment-1',contract_template_id:'template-contract',contract_template_version:5,contract:{required:true,template_id:'template-contract',template_version:5,issued_document_id:null,signature_status:'awaiting_school'}};
sandbox.PigeAPI.request=async path=>{
  if(path.endsWith('/admission-readiness'))return{ready:true,campaigns:[],issues:[]};
  if(path.endsWith('/admission-campaigns'))return[];
  if(path.endsWith('/class-groups'))return[group];
  if(path.endsWith('/academic-years'))return[{id:'year-2027',name:'2027',status:'active'}];
  if(path.endsWith('/units'))return[];
  if(path.endsWith('/academic-years'))return[{id:'year-2027',name:'2027'}];
  if(path.endsWith('/document-templates?include_inactive=true'))return{items:[
    templateChoice,
    {...templateChoice,id:'signed-declaration',kind:'declaration'},
    {...templateChoice,id:'expired-contract',valid_until:'2026-12-31'},
  ]};
  if(path.endsWith('/document-templates/fields'))return{fields:[{key:'financeiro.anuidade',label:'Anuidade',source:'manual'}]};
  if(path.includes('/admissions-summary'))return{counts:{}};
  if(path.includes('/preparation?'))return{version:0,values:{}};
  if(path.endsWith('/admission-fee-accounts'))return{items:[]};
  if(path.endsWith('/admissions/admission-1/readiness'))return{ready:false,checks:[{code:'contract',ready:false,message:'Emita o contrato',stage:'contract'}]};
  if(path.includes('/admissions/admission-1'))return admission;
  if(path.includes('/bank-charges'))return{items:[],total:0};
  if(path.includes('/admissions?'))return{items:[],total:0};
  throw new Error('GET inesperado: '+path);
};
sandbox.PigeAPI.post=async(path,payload)=>{
  if(path.endsWith('/admission-campaigns')){campaignSaved=payload;return{};}
  if(path.endsWith('/document-templates/template-contract/preview')){frozenPreviewVersion=payload.template_version;return{header:'',content:'ALUNO Maria',footer:'',variables:{'aluno.nome':'Maria'},missing_fields:[],template_version:5};}
  if(path.endsWith('/document-templates/template-contract/issue')){frozenIssueVersion=payload.template_version;return{id:'issued-1'};}
  if(path.endsWith('/admissions/admission-1/finalize')){finalizeCount++;return{};}
  throw new Error('POST inesperado: '+path);
};
await expansion.load();expansion.newCampaign();
await expansion.saveCampaign();assert.equal(campaignSaved,null,'Sem turma, o processo não deve ser enviado');assert.match(expansion.s.error,/Selecione pelo menos uma turma/);
Object.assign(expansion.s.campaignForm,{academic_year_id:'year-2027',title:'Matrículas 2027',slug:'matriculas-2027',opens_on:'2027-01-01',closes_on:'2027-03-31'});
expansion.s.campaignForm.class_group_ids=['group-2027'];expansion.s.campaignForm.contract_template_id='template-contract';
expansion.s.campaignForm.show_student_portal_button=false;
assert.deepEqual(Array.from(expansion.eligibleContractTemplates(), item=>item.id), ['template-contract']);
await expansion.saveCampaign();assert.equal(campaignSaved.contract_template_id,'template-contract');
assert.equal(campaignSaved.show_student_portal_button,false,'False must be serialized instead of falling back to the default');
expansion.editCampaign({...campaignSaved,id:'campaign-saved',version:2});
assert.equal(expansion.s.campaignForm.show_student_portal_button,false,'Reopening must preserve saved visibility');
expansion.s.selected=admission;
await expansion.previewFrozenContract();assert.equal(frozenPreviewVersion,5);
await expansion.issueFrozenContract();assert.equal(frozenIssueVersion,5);
await expansion.finalize();assert.equal(finalizeCount,0,'Sem revisão verificada, a matrícula não pode ser efetivada');
// A decisão é assíncrona. Uma segunda solicitação não pode reaproveitar a confirmação.
const previousExpansionConfirm=sandbox.PigeDialogs.confirm,previousExpansionPrompt=sandbox.PigeDialogs.prompt;
let resolveAdmissionDialog,admissionDialogCount=0,admissionDialogOpened=()=>{};
sandbox.PigeDialogs.confirm=()=>{admissionDialogCount++;admissionDialogOpened();return new Promise(resolve=>{resolveAdmissionDialog=resolve;});};
expansion.setContractFieldValue('financeiro.anuidade','Rascunho de teste');
const closingAdmission=expansion.closeAdmission();
await expansion.closeAdmission();assert.equal(admissionDialogCount,1);
assert.equal(expansion.s.selected.id,admission.id);assert.equal(expansion.s.busy,true);
resolveAdmissionDialog(false);await closingAdmission;
assert.equal(expansion.s.contractDraftDirty,true);assert.equal(expansion.contractValue('financeiro.anuidade'),'Rascunho de teste');
let requestedAdmission='';
sandbox.PigeAPI.request=async path=>{requestedAdmission=path;if(path.endsWith('/readiness'))return{ready:false,checks:[]};return {...admission,contract:{...admission.contract,template_version:6}};};
const switchAdmission=expansion.view('admission-2');
resolveAdmissionDialog(false);await switchAdmission;assert.equal(requestedAdmission,'');
const refreshDialog=new Promise(resolve=>{admissionDialogOpened=resolve;});
const refreshExisting=expansion.refreshAdmissionStatus();
await refreshDialog;
resolveAdmissionDialog(false);await refreshExisting;
assert.equal(expansion.s.selected.contract.template_version,5);assert.equal(expansion.s.contractDraftDirty,true);
assert.equal(expansion.contractValue('financeiro.anuidade'),'Rascunho de teste');
expansion.s.reason='Justificativa escrita pela equipe.';expansion.s.reviewPreset='Documentação conferida';
const useModel=expansion.useReviewPreset();resolveAdmissionDialog(false);await useModel;
assert.equal(expansion.s.reason,'Justificativa escrita pela equipe.');
expansion.contractHistoryPolicy.value={can_manage:true,allow_removal:true};
let resolveHistory,historyPromptCount=0,historyWrites=0;
sandbox.PigeDialogs.prompt=(_message,options)=>{
  historyPromptCount++;assert.equal(options.minLength,10);return new Promise(resolve=>{resolveHistory=resolve;});
};
sandbox.PigeAPI.post=async()=>{historyWrites++;return {};};
const removing=expansion.removeContractHistory('issued-1');await expansion.removeContractHistory('issued-1');
assert.equal(historyPromptCount,1);resolveHistory(null);await removing;assert.equal(historyWrites,0);
const closeConfirmed=expansion.closeAdmission();resolveAdmissionDialog(true);await closeConfirmed;
assert.equal(expansion.s.selected,null);assert.equal(expansion.s.contractDraftDirty,false);
sandbox.PigeDialogs.confirm=previousExpansionConfirm;sandbox.PigeDialogs.prompt=previousExpansionPrompt;
sandbox.PigeAPI.request=originalRequest;sandbox.PigeAPI.post=originalPost;sandbox.PigeAPI.patch=originalPatch;
console.log('Campaign smoke: modelo do período, revisão congelada e bloqueio da matrícula OK.');

// QR e pareamento pertencem à instância solicitada; resposta vazia não anuncia código pronto.
const connectExpansion=sandbox.PigeExpansion.component.setup({schoolId:'school-test',page:'connect',permissions:['connect.manage']});
const connectA={id:'instance-a',name:'PG360-A',display_name:'Escola A',phone:'+5575999990000',managed_by_pige360:true,preferred_for_school:true,status:'created',connection_state:'created',remote_configured:true};
const connectB={...connectA,id:'instance-b',name:'PG360-B',display_name:'Escola B',preferred_for_school:false};
connectExpansion.s.connect.configured=true;
connectExpansion.s.connectInstances=[connectA,connectB];
let refreshFails=false,adoptCalls=0,inventoryCalls=0,alreadyConnected=false,delayedQr=null;
sandbox.PigeAPI.request=async path=>{
  if(path.endsWith('/connect')){if(refreshFails)throw new Error('Falha sintética na atualização');return{config:connectExpansion.s.connect,items:[connectA,connectB],units:[]};}
  if(path.includes('/connect/jobs'))return{items:[],total:0};
  if(path.endsWith('/connect/remote-instances')){inventoryCalls++;return{items:[]};}
  throw new Error('GET inesperado: '+path);
};
sandbox.PigeAPI.post=async path=>{
  if(path.endsWith('/instance-a/qr'))return delayedQr||{instance:connectA,qrcode:{},pending:!alreadyConnected,connected:alreadyConnected};
  if(path.endsWith('/instance-b/pairing-code'))return{instance:connectB,qrcode:{pairingCode:'ABCD-1234'},pending:false};
  if(path.endsWith('/connect/instances'))return{instance:{...connectB,id:'instance-c',name:'PG360-C'},qrcode:{base64:'data:image/png;base64,AAAA'},pending:false};
  if(path.endsWith('/connect/instances/adopt')){adoptCalls++;return{instance:connectA};}
  throw new Error('POST inesperado: '+path);
};
let releaseQr;
delayedQr=new Promise(resolve=>{releaseQr=resolve;});
const pendingQrRequest=connectExpansion.connectQr(connectA);
const renderConnect=()=>sandbox.PigeExpansion.component.render.call(connectExpansion,connectExpansion,[]);
assert.equal(connectExpansion.s.connectOperation.instanceId,'instance-a');
assert.match(loginText(renderConnect()),/Aguardando QR Code…/);
releaseQr({instance:connectA,qrcode:{},pending:true});
await pendingQrRequest;delayedQr=null;
assert.equal(connectExpansion.s.connectQr.instanceId,'instance-a');
assert.equal(connectExpansion.s.connectQr.pending,true);
assert.match(connectExpansion.s.notice,/Ainda não há QR Code/);
assert.doesNotMatch(connectExpansion.s.notice,/pronto/);
assert.match(loginText(renderConnect()),/O provedor respondeu, mas ainda não disponibilizou o QR Code/);
delayedQr={instance:connectA,qrcode:{code:'texto-sem-imagem'}};
await connectExpansion.connectQr(connectA);
assert.equal(connectExpansion.s.connectQr.pending,true,'O texto bruto não é um QR escaneável');
assert.match(connectExpansion.s.notice,/somente o texto do QR/);
assert.match(loginText(renderConnect()),/sem imagem para escanear/);
delayedQr=null;
alreadyConnected=true;await connectExpansion.connectQr(connectA);
assert.equal(connectExpansion.s.connectQr.pending,false);
assert.equal(connectExpansion.s.connectQr.connected,true);
assert.match(connectExpansion.s.notice,/já conectado/);
await connectExpansion.connectPairingCode(connectB);
assert.equal(connectExpansion.s.connectQr.instanceId,'instance-b');
assert.equal(connectExpansion.s.connectQr.pairingCode,'ABCD-1234');
assert.equal(connectExpansion.s.connectQr.pending,false);
assert.equal(loginText(renderConnect()).split('ABCD-1234').length,2,'Código aparece somente na instância solicitada');
refreshFails=true;await connectExpansion.connectCreate();
assert.equal(connectExpansion.s.connectQr.instanceId,'instance-c');
assert.equal(connectExpansion.s.connectQr.base64,'data:image/png;base64,AAAA');
assert.ok(connectExpansion.s.connectInstances.some(item=>item.id==='instance-c'),'Criação permanece visível quando recarga falha');
assert.match(connectExpansion.s.error,/não foi possível atualizar a lista/);
refreshFails=false;await connectExpansion.connectAdopt({name:'PG360-EXISTENTE'});
assert.equal(adoptCalls,1);assert.equal(inventoryCalls,1,'Inventário é recarregado sem execução aninhada bloqueada');
sandbox.PigeAPI.request=originalRequest;sandbox.PigeAPI.post=originalPost;
console.log('WhatsApp smoke: QR por instância, resposta pendente, criação resiliente e inventário após vínculo OK.');

// Exercita o componente assistido e impede preenchimento fora da lista/edição atrasada.
const target={name:'Nome preservado',cpf:''};
const assistProps={target,fields:['name','cpf'],request:sandbox.fetch,root:'/test',lookupRoot:'',ocr:true,cnpj:true,cep:true,mapping:{},label:'Pessoa de teste',source:''};
let emitted=null;const assisted=sandbox.PigeAssist.component.setup(assistProps,{emit:(_,v)=>emitted=v});
const renderAssist=()=>sandbox.PigeAssist.component.render.call(assisted,assisted,[]);
renderAssist();assisted.openDocument();renderAssist();assisted.openLookup('cnpj');renderAssist();
assisted.s.rows=[{field:'cpf',targetField:'cpf',value:'52998224725',checked:true,before:''},{field:'role',targetField:'role',value:'admin',checked:true}];
assisted.s.confirmed=true;renderAssist();assisted.apply();assert.equal(target.cpf,'52998224725');assert.equal(target.role,undefined);assert.ok(emitted);
assisted.s.rows=[{field:'name',targetField:'name',value:'Leitura atrasada',checked:true,before:'Outro nome'}];
assisted.s.confirmed=true;assisted.apply();assert.equal(target.name,'Nome preservado');assert.ok(assisted.s.error);
console.log('Assist smoke: render, campos permitidos e proteção de edição concorrente OK.');

// Atendimento carrega o SDK no documento da página, sem iframe externo.
const supportScripts=[],supportLinks=[],supportTimers=new Map(),supportEvents=new Map(),destroyCalls=[];
let timeoutId=0,ran=0,mode='throw',scriptFailure=false,sdkMode='current';
const originalAddEvent=sandbox.addEventListener,originalRemoveEvent=sandbox.removeEventListener;
sandbox.addEventListener=(type,handler)=>supportEvents.set(type,handler);
sandbox.removeEventListener=(type,handler)=>{if(supportEvents.get(type)===handler)supportEvents.delete(type);};
sandbox.setTimeout=run=>{supportTimers.set(++timeoutId,run);return timeoutId;};
sandbox.clearTimeout=id=>supportTimers.delete(id);
const sdk={run(){if(mode==='throw')throw new Error('Falha sintética');ran++;sandbox.$hub={hasLoaded:false};},destroy(options){destroyCalls.push(options);delete sandbox.$hub;}};
document.createElement=tag=>{
  assert.notEqual(tag,'iframe','O portal não cria mais um iframe ao redor do SDK');
  return {tag,dataset:{},style:{},addEventListener(_,handler){this.click=handler;},remove(){const i=supportLinks.indexOf(this);if(i>=0)supportLinks.splice(i,1);}};
};
document.head={appendChild(element){if(element.tag==='script'){supportScripts.push(element);queueMicrotask(()=>{
  if(scriptFailure){element.onerror();return;}
  if(sdkMode==='missing')delete sandbox.hubSDK;
  else sandbox.hubSDK=sdkMode==='legacy'||(sdkMode==='stale-once'&&!element.src.includes('pige_reload='))?{run:sdk.run}:sdk;
  element.onload();
});}}};
document.body={appendChild:element=>supportLinks.push(element)};
let config={enabled:true,base_url:'https://support.example.test',website_token:'test-public-token',position:'left',type:'standard',launcherTitle:'Atendimento'};
const supportRequests=[];
sandbox.fetch=async path=>{supportRequests.push(path);return{ok:true,json:async()=>path==='/api/v1/support-widget'?{...config,enabled:false}:config};};
await sandbox.PigeSupport.load();assert.equal(supportScripts.length,0);assert.deepEqual(supportRequests,['/api/v1/support-widget']);
await sandbox.PigeSupport.load('school-a','online_enrollment');
assert.match(sandbox.PigeSupport.status.error,/não iniciou/);assert.equal(supportLinks.length,1);
mode='ready';
await sandbox.PigeSupport.load('school-a','online_enrollment');
await sandbox.PigeSupport.load('school-a','online_enrollment');
assert.equal(ran,1);assert.equal(supportScripts.length,1,'SDK é reutilizado sem downloads duplicados');
supportTimers.values().next().value();assert.equal(supportTimers.size,0);
assert.equal(supportLinks[0].type,'button');assert.match(supportLinks[0].textContent,/Atendimento/);
supportLinks[0].click();await new Promise(resolve=>setImmediate(resolve));
assert.equal(ran,2);assert.equal(supportLinks.length,0);
sandbox.$hub.hasLoaded=true;supportEvents.get('hub:ready')();
assert.equal(supportTimers.size,0);assert.equal(supportLinks.length,0);
await sandbox.PigeSupport.load('school-a','guardian_portal');assert.equal(ran,2,'Mesma conta preserva a conversa');
await sandbox.PigeSupport.load('school-b','online_enrollment');assert.equal(ran,3);
assert.equal(destroyCalls.at(-1).clearSession,true,'Troca de escola descarta sessão anterior');
assert.match(supportRequests.at(-1),/schools\/school-b\/support-widget\?area=online_enrollment/);
config={...config,base_url:'https://offline.example.test'};scriptFailure=true;
await sandbox.PigeSupport.load('school-b','internal');assert.equal(supportLinks.length,1);
assert.match(sandbox.PigeSupport.status.error,/baixar o SDK/);
const priorScript=supportScripts.at(-1);scriptFailure=false;supportLinks[0].click();
await new Promise(resolve=>setImmediate(resolve));assert.notEqual(supportScripts.at(-1),priorScript);
assert.equal(supportLinks.length,0);
config={...config,enabled:false};await sandbox.PigeSupport.load('school-b','internal');
assert.equal(supportLinks.length,0);assert.equal(sandbox.$hub,undefined);
sandbox.PigeSupport.dispose();
const beforeStaleScripts=supportScripts.length,beforeStaleRuns=ran;
config={...config,enabled:true,base_url:'https://cached.example.test'};sdkMode='stale-once';
await sandbox.PigeSupport.load('school-cache','guardian_portal');
assert.equal(supportScripts.length,beforeStaleScripts+2,'SDK antigo causa somente uma atualização automática');
assert.match(supportScripts[beforeStaleScripts].src,/sdk\.js\?pige_sdk=launcher-tooltip-1$/,'URL versionada não reutiliza a cópia antiga sem versão');
assert.match(supportScripts.at(-1).src,/&pige_reload=/);
assert.equal(ran,beforeStaleRuns+1,'Somente o SDK compatível inicia o atendimento');
assert.equal(supportLinks.length,0);
await sandbox.PigeSupport.load('school-cache','student_portal');
assert.equal(supportScripts.length,beforeStaleScripts+2,'SDK atualizado é reutilizado entre áreas');
sandbox.PigeSupport.dispose();
sdkMode='legacy';config={...config,base_url:'https://legacy.example.test'};
const beforeLegacyScripts=supportScripts.length,beforeLegacyRuns=ran;
await sandbox.PigeSupport.load('school-legacy','guardian_portal');
assert.equal(supportScripts.length,beforeLegacyScripts+2,'Servidor ainda antigo não provoca repetição infinita');
assert.equal(ran,beforeLegacyRuns,'Não monta sessão sem descarte seguro');
assert.match(sandbox.PigeSupport.status.error,/SDK antigo após atualizar o cache/);
assert.equal(supportLinks.length,1);
sandbox.PigeSupport.dispose();
sdkMode='missing';config={...config,base_url:'https://missing.example.test'};
await sandbox.PigeSupport.load('school-missing','guardian_portal');
assert.match(sandbox.PigeSupport.status.error,/não disponibilizou o SDK/);
sandbox.PigeSupport.dispose();sdkMode='current';
config={...config,enabled:true,launcherTooltip:'  Falar com a escola  '};sdkMode='modern';scriptFailure=false;mode='ready';
await sandbox.PigeSupport.load('school-tooltip','online_enrollment');
assert.equal(sandbox.hubSettings.launcherTooltip,'Falar com a escola');
assert.equal(sandbox.hubSettings.launcherTitle,'Atendimento','Tooltip não altera o texto visível');
config={...config,launcherTooltip:' '};
await sandbox.PigeSupport.load('school-tooltip','online_enrollment');
assert.equal(sandbox.hubSettings.launcherTooltip,'Abrir Conversa');
sandbox.PigeSupport.dispose();

sandbox.addEventListener=originalAddEvent;sandbox.removeEventListener=originalRemoveEvent;
sandbox.setTimeout=setTimeout;sandbox.clearTimeout=clearTimeout;
assert.equal(context.state.modal.kind,'');
console.log('Support smoke: SDK direto, cache antigo recuperado, erros diferenciados e descarte por escola/conta OK.');

// Consultar a fila não exige permissões financeiras nem leitura de contratos.
const admissionReader=sandbox.PigeExpansion.component.setup({schoolId:'school-test',page:'online',permissions:['admissions.read']});
const beforeReader=sandbox.PigeAPI.request;
const readerCalls=[];
sandbox.PigeAPI.request=async path=>{
  readerCalls.push(path);
  if(path.endsWith('/admission-readiness'))return{ready:true,campaigns:[],issues:[]};
  if(path.endsWith('/admission-campaigns'))return[];
  if(path.endsWith('/admissions-summary'))return{counts:{}};
  if(path.includes('/admissions?'))return{items:[],total:0};
  if(path.endsWith('/admissions/readonly-one/readiness'))return{ready:false,checks:[{code:'approval',ready:false,message:'Aprove a inscrição',stage:'documents'}]};
  if(path.endsWith('/admissions/readonly-one'))return{id:'readonly-one',status:'submitted'};
  throw new Error('Consulta fora das permissões: '+path);
};
await admissionReader.load();await admissionReader.view('readonly-one');
assert.equal(admissionReader.s.error,'');
assert.equal(admissionReader.s.selected.id,'readonly-one');
assert.ok(!readerCalls.some(path=>path.includes('bank-charges')||path.includes('document-templates')));
assert.deepEqual(Array.from(admissionReader.admissionActions(),item=>item.value),['review','request_changes','waitlist','reject','withdraw']);
sandbox.PigeAPI.request=beforeReader;
console.log('Admissões: fila somente leitura não depende de contratos ou cobranças e ações acompanham o estado.');
