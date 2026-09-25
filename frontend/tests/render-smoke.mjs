/** Renderiza o shell compilado sem rede. Detecta vínculos ausentes no setup(),
 * inclusive manipuladores de eventos que o typecheck isolado não alcança. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {webcrypto as crypto} from "node:crypto";
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const applications=[];
const document={createElement:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],title:''};
const sandbox={crypto,console,document,navigator:{onLine:true},location:{hash:'',pathname:'/',origin:'http://test'},localStorage:{getItem:()=>null,setItem:()=>{}},URLSearchParams,URL,Intl,Headers,FormData,Blob,File,Event,CustomEvent,setTimeout,clearTimeout};
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
