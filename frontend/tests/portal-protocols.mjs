import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const dist=fileURLToPath(new URL('../dist/',import.meta.url));
const row={id:'t',number:'PRO-000123',subject:'Segunda via',category:'secretaria',status:'open',preferred_channel:'portal',updated_at:'2027-02-10T10:00:00Z'};
const history=[{id:'m',author:'you',message:'Preciso da segunda via.',created_at:row.updated_at,attachment:{id:'f',name:'arquivo.pdf'}}];
const ticket={...row,history};
function setup(area,props={}){
  const app={},calls=[],files=[],clipboard=[];
  let mounted,unmounted;
  const win={console,navigator:{clipboard:{writeText:async value=>clipboard.push(value)}},location:{search:'',pathname:'/'},URL,URLSearchParams,AbortController,FormData,Headers,Intl,crypto:webcrypto,
    document:{getElementById(){},querySelector:()=>null,createElement:()=>({})},addEventListener(){}};
  win.window=win;win.localStorage={getItem:()=>null};vm.createContext(win);
  for(const f of ['vendor/vue-3.5.13.global.prod.js',area+'-renders.js'])vm.runInContext(fs.readFileSync(dist+f,'utf8'),win);
  Object.assign(win.Vue,{createApp:opts=>({mount(){Object.assign(app,opts);}}),onMounted:fn=>{mounted=fn;},onUnmounted:fn=>{unmounted=fn;}});
  vm.runInContext(fs.readFileSync(dist+area+'.js','utf8'),win);
  let handler=async path=>path.endsWith('/options')?{channels:['portal','email','whatsapp'],whatsapp_contact:'5571999999901',max_attachment_mb:3,opening_channel:'portal'}:
    path.includes('?')?{items:[row],page:1,page_size:5,total:1}:ticket;
  win.PigeDialogs.confirm=async()=>false;
  const component=app.components['portal-protocols'];
  assert.ok(component);
  const ctx=component.setup({area,schoolId:'escola',...props,request:async(path,opts)=>{calls.push({path,opts});return handler(path,opts);},download:async(...args)=>files.push(args)});
  const render=()=>{const actual=win.Vue.reactive(ctx);return component.render.call(actual,actual,[]);};
  return {ctx,calls,files,clipboard,dialogs:win.PigeDialogs,mount:mounted,close:unmounted,render,setHandler:fn=>handler=fn};
}
const labels=node=>node&&typeof node==='object'?(Array.isArray(node.children)?node.children.map(labels).join(' '):node.children||''):'';
for(const area of ['family','teacher']){
  const f=setup(area,area==='family'?{studentId:'aluno',academic:true,financial:false}:{});
  f.mount();await new Promise(resolve=>setImmediate(resolve));
  const base='/'+area+'/schools/escola/protocols';
  assert.ok(f.calls.some(c=>c.path===base+'?page=1'+(area==='family'?'&student_id=aluno':'')));
  assert.match(labels(f.render()),/Segunda via/);
  assert.match(labels(f.render()),/Avisos de novos protocolos abertos pela escola/);assert.equal(f.ctx.s.openingChannel,'portal');
  f.ctx.s.openingChannel='whatsapp';
  f.setHandler(async()=>({channels:['portal','email','whatsapp'],opening_channel:'whatsapp',whatsapp_contact:'5571999999901'}));
  await f.ctx.saveOpeningChannel();const preference=f.calls.at(-1);
  assert.equal(preference.path,base+'/opening-channel');assert.equal(preference.opts.method,'PUT');assert.deepEqual(JSON.parse(preference.opts.body),{preferred_channel:'whatsapp'});
  assert.equal(f.ctx.s.options.opening_channel,'whatsapp');

  assert.deepEqual(Array.from(f.ctx.availableCategories.value),['secretaria','pedagogico','tecnico']);
  f.ctx.showNew();assert.equal(f.ctx.s.form.channel,'portal','a abertura anterior não altera o canal de um protocolo criado pelo usuário');assert.match(labels(f.render()),/Anexo \(opcional\)/);
  f.ctx.s.form.subject='Segunda via';f.ctx.s.form.message='Quero uma segunda via.';f.ctx.s.form.channel='email';
  await f.ctx.list();assert.equal(f.ctx.s.view,'new','cancelar descarte preserva a solicitação');
  f.setHandler(async()=>{throw new Error('resposta interrompida');});await f.ctx.send();
  const firstKey=f.calls.at(-1).opts.body.get('client_key');assert.ok(firstKey);assert.equal(f.ctx.s.form.subject,'Segunda via');
  f.setHandler(async()=>ticket);await f.ctx.send();
  const sent=f.calls.at(-1);assert.equal(sent.opts.method,'POST');assert.equal(sent.path,base);assert.equal(sent.opts.body.get('client_key'),firstKey);
  assert.equal(sent.opts.body.get('student_id'),area==='family'?'aluno':null);assert.equal(sent.opts.body.get('preferred_channel'),'email');
  assert.match(labels(f.render()),/Histórico do protocolo/);assert.match(labels(f.render()),/arquivo.pdf/);
  await f.ctx.copyNumber();assert.deepEqual(f.clipboard,[ticket.number]);
  const external=new URL(f.ctx.whatsappUrl.value);assert.equal(external.origin,'https://wa.me');assert.equal(external.searchParams.get('text'),'Olá, quero falar sobre o protocolo PRO-000123');
  f.ctx.s.options.whatsapp_contact='https://externo.test';assert.equal(f.ctx.whatsappUrl.value,'');f.ctx.s.options.whatsapp_contact='5571999999901';
  await f.ctx.attachment(history[0].attachment);assert.deepEqual(f.files,[[base+'/t/attachments/f','arquivo.pdf']]);
  f.ctx.s.form.message='Minha resposta';f.ctx.s.form.channel='whatsapp';f.setHandler(async()=>({...ticket,preferred_channel:'whatsapp'}));
  await f.ctx.changeChannel();assert.equal(f.calls.at(-1).path,base+'/t/channel');assert.deepEqual(JSON.parse(f.calls.at(-1).opts.body),{preferred_channel:'whatsapp'});assert.equal(f.ctx.s.form.message,'Minha resposta');
  f.setHandler(async()=>({...ticket,status:'completed'}));await f.ctx.send();assert.equal(f.calls.at(-1).path,base+'/t/messages');
  assert.match(labels(f.render()),/foi encerrado/);assert.doesNotMatch(labels(f.render()),/Enviar resposta/);
  const previous=f.calls.length;await f.ctx.send();assert.equal(f.calls.length,previous);
  assert.equal(f.ctx.whatsappUrl.value,'');
  f.close();
}
{
  const f=setup('family',{studentId:'aluno',academic:false,financial:true});
  assert.deepEqual(Array.from(f.ctx.availableCategories.value),['secretaria','financeiro','tecnico']);
  let complete;f.setHandler(()=>new Promise(resolve=>{complete=resolve;}));
  const read=f.ctx.open('t');f.close();complete(ticket);await read;
  assert.equal(f.ctx.s.ticket,null,'uma resposta atrasada não preenche o contexto desmontado');
}
console.log('Atendimento nos dois portais: histórico, reenvio idempotente, anexos, categorias, canais, encerramento e troca de contexto conferidos.');

{
  const f=setup('family',{studentId:'aluno',academic:true});
  f.ctx.showNew();f.ctx.s.form.subject='Edição';f.ctx.s.form.message='Rascunho em andamento.';
  let answer;
  f.dialogs.confirm=(_message,options)=>{assert.equal(options.confirmLabel,'Descartar edição');return new Promise(resolve=>{answer=resolve;});};
  const original=f.ctx.list();
  assert.equal(f.ctx.s.view,'new');assert.equal(f.calls.length,0);
  f.ctx.s.form.message='Nova versão do rascunho.';answer(true);await original;
  assert.equal(f.ctx.s.view,'new');assert.equal(f.calls.length,0,'Uma decisão anterior não descarta uma edição mais recente');
  const changed=f.ctx.list();f.close();answer(true);await changed;
  assert.equal(f.calls.length,0,'A confirmação de uma aba desmontada não busca dados do protocolo');
}
