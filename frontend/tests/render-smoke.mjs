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
const sandbox={crypto,console,document,navigator:{onLine:true},location:{hash:'',pathname:'/',origin:'http://test'},history:{replaceState(){}},localStorage:{getItem:()=>null,setItem:()=>{}},URLSearchParams,URL,Intl,Headers,FormData,Blob,File,Event,CustomEvent,setTimeout,clearTimeout};
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
context.state.user={id:'test-admin',name:'Administrador',role:'admin',permissions:[...new Set([...fs.readFileSync(path.join(root,'templates/app.html'),'utf8').matchAll(/can\('([^']+)'\)/g)].map(match=>match[1]))]};
context.state.schoolId='school-test';context.state.schools=[{id:'school-test',company_id:'company-test',name:'Escola de teste'}];
for(const page of Object.keys(context.pageLabels)){context.state.page=page;render();}
context.state.page='legacy-import';context.state.legacyImport.preview={fingerprint:'a'.repeat(64),source_system:'School Desktop Suite',source_database:'app.db',source_record_count:5,table_count:5,max_package_mb:128,tables:[{name:'alunos',rows:1,destination:'alunos e pessoas'}],media:{inline_photos_convertible:1,container_files_candidate_count:0,container_unsupported_files_ignored:0,container_unsafe_or_cache_paths_ignored:0,unresolved_media_references:0,container_magento_paths_ignored:0},warnings:['Aviso de teste']};
const legacyImportTree=render();assert.match(loginText(legacyImportTree),/Gerar prévia segura/);assert.match(loginText(legacyImportTree),/Confirme a importação/);assert.match(loginText(legacyImportTree),/alunos e pessoas/);
assert.equal(typeof context.previewLegacyImport,'function');assert.equal(typeof context.applyLegacyImport,'function');
context.state.legacyImport.preview=null;
context.state.page='help';let guideTree=render();assert.match(loginText(guideTree),/Siga a ordem da rotina escolar/);assert.match(loginText(guideTree),/Cadastre cada pessoa uma vez/);
context.state.page='students';assert.match(loginText(render()),/Pesquise antes de criar uma nova identidade/);
const originalRequest=sandbox.PigeAPI.request;let routeCalls=[];
sandbox.PigeAPI.request=async path=>{routeCalls.push(path);return {};};
context.state.page='diary';await context.loadPage();context.state.page='help';await context.loadPage();
assert.deepEqual(routeCalls,[],'Diário e Guia são carregados por seus componentes; não devem requisitar recursos /diary ou /help');
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
assert.match(loginText(diaryTree),/Como começar no Diário/);
assert.match(loginText(diaryTree),/2026/);
sandbox.PigeAPI.request=originalRequest;
console.log('Diary smoke: roteiro visível, ano letivo legível e endpoints da tela válidos OK.');

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

// SDK opcional com falha não pode produzir uma exceção na operação escolar.
const elements=[];
document.createElement=()=>({dataset:{},remove(){const i=elements.indexOf(this);if(i>=0)elements.splice(i,1);}});
document.head={appendChild:element=>elements.push(element)};
let config={enabled:true,base_url:'https://hub.example.test',website_token:'test-public-token',position:'left',type:'standard',launcherTitle:'Atendimento'};
sandbox.fetch=async()=>({ok:true,json:async()=>config});
sandbox.hubSDK={run(){throw new Error('Falha sintética do SDK');}};
await sandbox.PigeSupport.load();
assert.equal(elements.length,1);elements[0].onload();
assert.match(sandbox.PigeSupport.status.error,/não iniciou/);
assert.equal(elements.length,0);
let ran=0;sandbox.hubSDK={run(){ran++;}};
await sandbox.PigeSupport.load();await sandbox.PigeSupport.load();elements[0].onload();
assert.equal(ran,1);await sandbox.PigeSupport.load();assert.equal(elements.length,1);
config={...config,enabled:false};await sandbox.PigeSupport.load();assert.equal(elements.length,0);
assert.equal(context.state.modal.kind,'');
console.log('Support smoke: falha do SDK isolada, carga idempotente e descarte do script OK.');
