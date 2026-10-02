/** Renderiza o shell compilado sem rede. Detecta vínculos ausentes no setup(),
 * inclusive manipuladores de eventos que o typecheck isolado não alcança. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {webcrypto as crypto} from "node:crypto";
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
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
function loginLink(tree){return nodes(tree).filter(n=>n.type==='a' && n.props?.href==='/online.html');}
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
const reportContext=sandbox.PigeReports.component.setup({schoolId:'school-test',catalogs:{}});
const reportRender=()=>sandbox.PigeRenders.reports.call(reportContext,reportContext,[]);
reportContext.period();assert.ok(reportContext.state.dateFrom<reportContext.state.dateTo);
assert.match(loginText(reportRender()),/Últimos três meses completos/);
reportContext.state.result={title:'Matrículas',period:{label:'Teste',date_from:'2026-07-01',date_to:'2026-09-30'},summary:[{key:'total',label:'Total',value:1,type:'integer'}],filters:[],columns:[{key:'name',label:'Aluno',type:'text'}],items:[{name:'Aluno Sintético'}],total:1,page_size:30,monthly:[],notes:[]};
assert.match(loginText(reportRender()),/Aluno Sintético/);
context.state.page='help';let guideTree=render();assert.match(loginText(guideTree),/Siga a ordem da rotina escolar/);assert.match(loginText(guideTree),/Cadastre cada pessoa uma vez/);
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
const diagnosticContext=sandbox.PigeDiagnostics.component.setup();
sandbox.PigeDiagnostics.component.render.call(diagnosticContext,diagnosticContext,[]);
console.log('Portal vazio, falha de API e render do diagnóstico OK.');

const diaryComponent=sandbox.PigeDiary.component;
const diaryContext=diaryComponent.setup({schoolId:'school-test',permissions:['diary.read','diary.configure']});
const renderDiary=()=>diaryComponent.render.call(diaryContext,diaryContext,[]);
let diaryCalls=[];
sandbox.PigeAPI.request=async path=>{diaryCalls.push(path);if(path.endsWith('/academic-years'))return[{id:'year-test',name:'2026',status:'active',starts_on:'2026-01-01',ends_on:'2026-12-31'}];if(path.endsWith('/diary-dashboard'))return{items:[],totals:{}};return[];};
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
const templateChoice={id:'template-contract',version:8,name:'Contrato 2027',active:true,require_signature:true,academic_year_id:'year-2027'};
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
  if(path.endsWith('/document-templates'))return{items:[templateChoice]};
  if(path.endsWith('/document-templates/fields'))return{fields:[{key:'financeiro.anuidade',label:'Anuidade',source:'manual'}]};
  if(path.includes('/admissions-summary'))return{counts:{}};
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
Object.assign(expansion.s.campaignForm,{title:'Matrículas 2027',slug:'matriculas-2027',opens_on:'2027-01-01',closes_on:'2027-03-31'});
expansion.s.campaignForm.class_group_ids=['group-2027'];expansion.s.campaignForm.contract_template_id='template-contract';
await expansion.saveCampaign();assert.equal(campaignSaved.contract_template_id,'template-contract');
expansion.s.selected=admission;
await expansion.previewFrozenContract();assert.equal(frozenPreviewVersion,5);
await expansion.issueFrozenContract();assert.equal(frozenIssueVersion,5);
await expansion.finalize();assert.equal(finalizeCount,0,'Sem revisão verificada, a matrícula não pode ser efetivada');
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

// Atendimento pertence à instituição/área selecionada e tem contexto descartável.
const supportFrames=[],supportScripts=[];
let supportRun=()=>{throw new Error('Falha sintética do atendimento');};
sandbox.setInterval=setInterval;sandbox.clearInterval=clearInterval;
sandbox.MutationObserver=class{observe(){}disconnect(){}};
document.createElement=()=>({dataset:{},style:{},contentWindow:{innerWidth:390,innerHeight:844,hubSDK:{run:()=>supportRun()}},contentDocument:{documentElement:{style:{}},body:{style:{}},createElement:()=>({}),head:{appendChild:element=>supportScripts.push(element)},querySelectorAll:()=>[]},remove(){const i=supportFrames.indexOf(this);if(i>=0)supportFrames.splice(i,1);}});
document.body={appendChild:element=>supportFrames.push(element)};
let config={enabled:true,base_url:'https://support.example.test',website_token:'test-public-token',position:'left',type:'standard',launcherTitle:'Atendimento'};
const supportRequests=[];
sandbox.fetch=async path=>{supportRequests.push(path);return{ok:true,json:async()=>path==='/api/v1/support-widget'?{...config,enabled:false}:config};};
await sandbox.PigeSupport.load();assert.equal(supportFrames.length,0);assert.deepEqual(supportRequests,['/api/v1/support-widget']);
await sandbox.PigeSupport.load('school-a','online_enrollment');
assert.equal(supportFrames.length,1);supportScripts.at(-1).onload();
assert.match(sandbox.PigeSupport.status.error,/não iniciou/);assert.equal(supportFrames.length,0);
let ran=0;supportRun=()=>{ran++;};
await sandbox.PigeSupport.load('school-a','online_enrollment');await sandbox.PigeSupport.load('school-a','online_enrollment');supportScripts.at(-1).onload();
assert.equal(ran,1);assert.equal(supportFrames.length,1);
const formerFrame=supportFrames[0];
await sandbox.PigeSupport.load('school-b','online_enrollment');
assert.equal(supportFrames.includes(formerFrame),false);assert.match(supportRequests.at(-1),/schools\/school-b\/support-widget\?area=online_enrollment/);
config={...config,enabled:false};await sandbox.PigeSupport.load('school-b','internal');assert.equal(supportFrames.length,0);
sandbox.PigeSupport.dispose();assert.equal(context.state.modal.kind,'');
console.log('Support smoke: entidade e área explícitas, falha isolada, carga idempotente e descarte do contexto OK.');

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
