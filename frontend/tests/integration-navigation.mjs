/** Verifica links visíveis, controle de acesso por rota e estado de SMTP no shell compilado. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {webcrypto as crypto} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=name=>fs.readFileSync(path.join(root,'dist',name),'utf8');
const school={id:'school-test',company_id:'company-test',name:'Escola de teste'};
const flush=()=>new Promise(resolve=>setTimeout(resolve,0));

async function boot(hash,role,permissions,configured=true){
  const calls=[],listeners={};let mounted,options;
  const location={hash,pathname:'/',origin:'http://test'};
  const document={createElement:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],title:''};
  const sandbox={crypto,console,document,navigator:{onLine:true},location,
    history:{replaceState(_data,_title,url){location.hash=url;}},
    localStorage:{getItem:()=>null,setItem:()=>{}},URLSearchParams,URL,Intl,Headers,FormData,Blob,File,Event,CustomEvent,setTimeout,clearTimeout};
  sandbox.window=sandbox;
  sandbox.addEventListener=(name,listener)=>{listeners[name]=listener;};
  sandbox.fetch=()=>{throw new Error('Este teste não acessa a rede.');};
  vm.createContext(sandbox);
  vm.runInContext(source('vendor/vue-3.5.13.global.prod.js'),sandbox);
  vm.runInContext(source('renders.js'),sandbox);
  sandbox.Vue.onMounted=callback=>{mounted=callback;};
  sandbox.Vue.createApp=component=>({mount:()=>{options=component;}});
  vm.runInContext(source('app.js'),sandbox);
  const context=options.setup();
  sandbox.PigeInstitution.load=async()=>{sandbox.PigeInstitution.state.configured=true;};
  sandbox.PigeAPI.refresh=async()=>({user:{id:'test-user',name:'Usuário',role,permissions,school_ids:[school.id]}});
  sandbox.PigeAPI.request=async url=>{
    calls.push(url);
    if(url==='/schools')return[school];
    if(url==='/diagnostics/summary')return{configuration:{smtp_configured:configured}};
    if(url===`/schools/${school.id}/dashboard`)return{};
    if(url.startsWith(`/schools/${school.id}/`))return[];
    throw new Error('Requisição inesperada: '+url);
  };
  sandbox.PigeSupport.load=async()=>{};
  sandbox.PigeDialogs.install=()=>{};
  mounted();
  for(let retry=0;retry<16&&!context.state.ready;retry++)await flush();
  assert.equal(context.state.ready,true,'Shell inicializado');
  for(let retry=0;retry<16&&(context.state.schoolId!==school.id||context.state.loading||(context.state.page==='email'&&context.state.emailStatus==='idle'));retry++)await flush();
  assert.equal(context.state.schoolId,school.id,'Escola carregada antes de verificar a navegação');
  assert.equal(context.state.loading,false,'Página inicial pronta');
  const render=()=>options.render.call(context,context,[]);
  return{context,render,calls,location,listeners,sandbox};
}

function nodes(vnode){
  if(!vnode||typeof vnode!=='object')return[];
  return[vnode,...(Array.isArray(vnode.children)?vnode.children.flatMap(nodes):[])];
}
const hrefs=tree=>nodes(tree).filter(node=>node.type==='a').map(node=>node.props?.href);
const content=tree=>nodes(tree).map(node=>typeof node.children==='string'?node.children:'').join(' ');

const admin=await boot('#/email','admin',['connect.manage','integrations.manage']);
assert.equal(admin.context.state.page,'email');
assert.equal(admin.context.state.emailStatus,'configured');
const adminTree=admin.render();
for(const link of ['#/connect','#/email','#/integrations'])assert.ok(hrefs(adminTree).includes(link),link+' visível para administrador');
for(const oldLabel of ['Financeiro / ASAAS','Connect API'])assert.ok(!content(adminTree).includes(oldLabel),'Menu antigo ausente: '+oldLabel);
assert.match(content(adminTree),/SMTP configurado na instalação/);
assert.ok(admin.calls.includes('/diagnostics/summary'));
await admin.context.navigate('connect');assert.equal(admin.context.state.page,'connect');
await admin.context.navigate('integrations');assert.equal(admin.context.state.page,'integrations');

const secretary=await boot('#/connect','secretary',[]);
assert.equal(secretary.context.state.page,'dashboard','URL direta sem permissão volta ao painel');
assert.equal(secretary.location.hash,'#/dashboard');
const secretaryLinks=hrefs(secretary.render());
for(const link of ['#/connect','#/email','#/integrations'])assert.ok(!secretaryLinks.includes(link),link+' oculto sem permissão');
secretary.location.hash='#/email';secretary.listeners.hashchange();
assert.equal(secretary.context.state.page,'dashboard');
assert.equal(secretary.location.hash,'#/dashboard','A URL negada não permanece no navegador');
assert.ok(!secretary.calls.includes('/diagnostics/summary'),'Perfil sem acesso não consulta a configuração SMTP');
secretary.context.state.user.permissions=['connect.manage'];
assert.ok(hrefs(secretary.render()).includes('#/connect'));
assert.ok(!hrefs(secretary.render()).includes('#/integrations'));
await secretary.context.navigate('connect');assert.equal(secretary.context.state.page,'connect');
await secretary.context.navigate('integrations');assert.equal(secretary.context.state.page,'connect','Bancária exige sua própria permissão');

const missing=await boot('#/email','admin',[],false);
assert.equal(missing.context.state.emailStatus,'missing');
assert.match(content(missing.render()),/SMTP não configurado/);
console.log('Integrações: grupo e permissões por rota, deep links e estado SMTP OK.');
