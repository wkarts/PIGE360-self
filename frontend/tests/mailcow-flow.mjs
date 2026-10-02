/** Mailcow: edit/save/test uses the intended configuration and never claims write access. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {webcrypto as crypto} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sandbox={crypto,console,document:{createElement:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],title:''},navigator:{onLine:true},location:{hash:'',pathname:'/',origin:'http://test'},history:{replaceState(){}},localStorage:{getItem:()=>null,setItem(){}},URLSearchParams,URL,Intl,Headers,FormData,Blob,File,Event,CustomEvent,setTimeout,clearTimeout};
sandbox.window=sandbox;sandbox.addEventListener=()=>{};
sandbox.fetch=()=>{throw new Error('Mailcow smoke does not access a real server.');};
vm.createContext(sandbox);
for(const file of ['vendor/vue-3.5.13.global.prod.js','renders.js'])vm.runInContext(fs.readFileSync(path.join(root,'dist',file),'utf8'),sandbox);
sandbox.Vue.onMounted=()=>{};sandbox.Vue.onUnmounted=()=>{};
sandbox.Vue.createApp=()=>({mount(){}});
vm.runInContext(fs.readFileSync(path.join(root,'dist/app.js'),'utf8'),sandbox);
let config={configured:true,enabled:true,base_url:'https://mail.example.test',domain:'example.test',default_quota_mb:1024,allow_private_network:false,api_key_configured:true,version:1,last_test_ok:true};
const calls=[];
let failTest=false;
sandbox.PigeAPI.request=async(url,options={})=>{
  calls.push({url,method:options.method||'GET',body:options.body});
  if(url.endsWith('/config')){
    if(options.method==='PUT'){
      const {api_key,...values}=JSON.parse(options.body);
      config={...config,...values,version:config.version+1,last_test_ok:null};
    }
    return {...config};
  }
  if(url.endsWith('/mailboxes')||url==='/users')return [];
  throw new Error('Unexpected request '+url);
};
sandbox.PigeAPI.post=async(url)=>{
  calls.push({url,method:'POST'});
  assert.ok(url.endsWith('/test'));
  return {ok:!failTest,code:failTest?'MAILCOW_READ_ONLY_KEY':'',message:failTest?'A chave salva permite apenas leitura.':'Consulta ao domínio validada. A permissão de criação será confirmada ao provisionar uma caixa.',read_authenticated:!failTest,write_verified:false};
};
const context=sandbox.PigeMailcow.component.setup({schoolId:'school-test'});
const nodes=node=>!node||typeof node!=='object'?[]:[node,...(Array.isArray(node.children)?node.children.flatMap(nodes):[])];
const render=()=>sandbox.PigeMailcow.component.render.call(context,context,[]);
const text=tree=>nodes(tree).map(node=>typeof node.children==='string'?node.children:'').join(' ');
await context.refresh();
context.openConfig();
context.state.draft.base_url='https://newmail.example.test';context.state.apiKey=' new-api-key-only-for-tests ';
assert.equal(context.state.config.base_url,'https://mail.example.test','Editing never changes the saved summary');
assert.equal(context.dirty.value,true);
const previous=calls.length;
await context.test();
assert.equal(calls.length,previous,'Never test an old saved key while the form has unsaved changes');
assert.match(context.state.error,/Salvar e testar/);
const testButton=nodes(render()).find(node=>node.type==='button'&&node.children==='Testar conexão');
assert.ok(testButton.props.disabled,'The saved-configuration test is disabled while editing');
await context.save(true);
assert.equal(calls.at(-2).method,'PUT');assert.ok(calls.at(-2).url.endsWith('/config'));
assert.ok(calls.at(-1).url.endsWith('/test'),'Save finishes before test');
assert.equal(JSON.parse(calls.at(-2).body).api_key,'new-api-key-only-for-tests');
assert.equal(context.state.config.base_url,'https://newmail.example.test');
assert.equal(context.state.apiKey,'','The key is cleared after saving');
assert.equal(context.dirty.value,false);
assert.equal(context.state.config.last_test_ok,true);
assert.equal(context.state.testResult.write_verified,false);
assert.match(context.state.notice,/permissão de criação será confirmada/);
failTest=true;await context.test();
assert.equal(context.state.config.last_test_ok,false,'Failure must replace an earlier success');
assert.equal(context.state.notice,'');
assert.match(context.state.error,/apenas leitura/);
assert.match(text(render()),/MAILCOW_READ_ONLY_KEY/);
context.state.draft.domain='unsaved.example.test';context.state.apiKey='discard-this-key';context.closeConfig();
assert.equal(context.state.draft.domain,context.state.config.domain);assert.equal(context.state.apiKey,'');assert.equal(context.dirty.value,false);
context.openConfig();context.state.draft.enabled=false;await context.save(false);failTest=false;await context.test();
assert.equal(context.state.config.enabled,false,'A disabled integration can be tested before provisioning is enabled');
assert.equal(context.state.config.last_test_ok,true);
context.state.credentials={address:'test@example.test',password:'synthetic-only-password',webmail_url:'https://mail.example.test/SOGo/'};
assert.ok(nodes(render()).some(node=>node.type==='button'&&node.props?.['data-dialog-close']!==undefined),'Initial credentials can be closed with Escape');
console.log('Mailcow flow: isolated draft, save-before-test, failure state, read-only result, key clearing and credential dialog OK.');
