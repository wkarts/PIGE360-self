/** Transporte simulado: nenhuma caixa externa é acessada e nenhum e-mail é enviado. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const template=fs.readFileSync(path.join(root,'templates/email.html'),'utf8');
assert.ok(!/v-html|<iframe|<object/i.test(template),'A leitura não injeta HTML recebido');
const folders=['inbox','sent','drafts','spam','trash','archive'].map(role=>({id:role,name:role,role,total:2,unread:1}));
const message={uid:3,uidvalidity:7,subject:'Reunião da escola',from:'Secretaria <secretaria@example.com>',to:'Docente <docente@example.com>',cc:'Coordenação <coordenacao@example.com>',date:'2026-10-02T12:00:00Z',seen:false,flagged:false,size:500,text:'Texto seguro <img src=x onerror=alert(1)>',message_id:'<sample@example.com>',attachments:[]};
const calls=[];let connected=false,sendResponse='timeout',pageResponse=null;
async function request(url,options={}){
  const body=options.body?JSON.parse(options.body):null;const method=options.method||'GET';calls.push({url,method,body});
  if(url.endsWith('/account'))return{available:true,connected,address:'docente@example.com',display_name:'Docente',needs_password:!connected,limits:{attachment_bytes:5242880,recipients:50,message_bytes:10485760}};
  if(url.endsWith('/connection')){connected=method==='POST';return{connected};}
  if(url.endsWith('/folders'))return method==='POST'?{id:'new',name:body.name,role:'custom'}:{items:structuredClone(folders)};
  if(url.includes('/messages?'))return pageResponse||{items:[structuredClone(message)],folder:'inbox',uidvalidity:7,next_before_uid:2};
  if(url.includes('/messages/3?')&&method==='GET')return structuredClone(message);
  if(url.endsWith('/flags'))return{updated:true};
  if(url.endsWith('/move'))return{moved:true};
  if(url.includes('/messages/3?')&&method==='DELETE')return{deleted:true};
  if(url.endsWith('/drafts'))return{folder:'drafts',uid:10,uidvalidity:7,saved:true,previous_removed:true};
  if(url.endsWith('/send')){if(sendResponse==='timeout')throw new Error('network disconnected');if(sendResponse==='invalid')throw Object.assign(new Error('Destinatário inválido'),{status:422});return{status:'sent',message_id:'<sent@example.com>',sent_saved:true,refused:[],message:'Mensagem enviada.'};}
  throw new Error('Unexpected request '+method+' '+url);
}
const mounted=[],unmounted=[];
const context=vm.createContext({Vue:{reactive:v=>v,computed:fn=>({get value(){return fn();}}),onMounted:fn=>mounted.push(fn),onUnmounted:fn=>unmounted.push(fn),nextTick:async()=>{}},PigeRenders:{email(){}},PigeAPI:{request,post:(url,body)=>request(url,{method:'POST',body:JSON.stringify(body)}),patch:(url,body)=>request(url,{method:'PATCH',body:JSON.stringify(body)}),download:async()=>{}},URLSearchParams,Intl,Date,crypto:webcrypto,window:{addEventListener(){},removeEventListener(){}},document:{getElementById:()=>({focus(){}})},console,Uint8Array,btoa,fetch});
vm.runInContext(ts.transpileModule(fs.readFileSync(path.join(root,'src/email.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText,context);
const ui=context.PigeEmail.component.setup({schoolId:'school-one',admin:false});
await ui.refresh();assert.equal(ui.s.account.connected,false);
ui.s.password='Synthetic-mail-password';await ui.connect();assert.equal(ui.s.password,'');assert.equal(ui.s.account.connected,true);assert.equal(ui.s.folder,'inbox');assert.equal(ui.s.items.length,1);
await ui.open(ui.s.items[0]);assert.equal(ui.s.selected.text,message.text);assert.equal(ui.s.selected.seen,true);assert.ok(calls.some(c=>c.url.endsWith('/flags')&&c.body.seen===true));
ui.begin('all');assert.equal(ui.s.compose.to,'secretaria@example.com');assert.equal(ui.s.compose.cc,'coordenacao@example.com');assert.equal(ui.s.compose.in_reply_to,message.message_id);assert.ok(!ui.s.compose.cc.includes('docente@example.com'));
ui.s.compose.text='Resposta à secretaria';await ui.saveDraft();assert.equal(ui.s.compose.draft.uid,10);assert.equal(ui.dirty(),false);assert.match(ui.s.composeNotice,/Rascunho salvo/);
ui.s.compose.text+=' com alteração';ui.closeCompose();assert.equal(ui.s.discard,true);ui.s.discard=false;
await ui.send();assert.equal(ui.s.sendResult.status,'uncertain');const first=calls.filter(c=>c.url.endsWith('/send')).at(-1).body;assert.match(first.request_id,/^[a-f\d-]{36}$/);assert.equal(first.draft.uid,10);
sendResponse='sent';await ui.send();const second=calls.filter(c=>c.url.endsWith('/send')).at(-1).body;assert.deepEqual(second,first,'Consultar envio preserva UUID e payload para não duplicar');assert.equal(ui.s.sendResult.status,'sent');ui.closeCompose();assert.equal(ui.s.compose,null);
ui.begin();ui.s.compose.to='invalid';await ui.send();assert.match(ui.s.composeError,/endereços/);assert.equal(ui.s.pendingPayload,null);ui.s.compose.to='valid@example.com';sendResponse='invalid';await ui.send();assert.equal(ui.s.sendResult.status,'failed');ui.editAfterFailure();assert.equal(ui.s.pendingPayload,null);ui.closeCompose(true);
await ui.open(ui.s.items[0]);await ui.move('trash');assert.ok(calls.some(c=>c.url.endsWith('/move')&&c.body.destination==='trash'&&c.body.uidvalidity===7));
await ui.selectFolder('trash');await ui.open(ui.s.items[0]);await ui.remove();assert.equal(calls.filter(c=>c.method==='DELETE'&&c.url.includes('/messages/')).length,0);ui.s.deleteConfirm=true;await ui.remove();assert.ok(calls.some(c=>c.method==='DELETE'&&c.url.includes('confirm=true')&&c.url.includes('uidvalidity=7')));
await ui.selectFolder('inbox');ui.s.q='reunião';await ui.search();assert.ok(calls.some(c=>c.url.includes('q=reuni%C3%A3o')));await ui.nextPage();assert.equal(ui.s.cursors.length,1);assert.ok(calls.some(c=>c.url.includes('before_uid=2')));await ui.previousPage();assert.equal(ui.s.cursors.length,0);
await ui.disconnect();assert.equal(ui.s.account.connected,false);assert.equal(ui.s.items.length,0);
console.log('Email flow: conexão pessoal, leitura segura, resposta a todos, rascunho, descarte, envio idempotente, validação, paginação, movimento e exclusão confirmada OK.');
