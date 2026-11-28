/** Exercita os componentes compilados com respostas bancárias sintéticas e sem acesso à rede. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {webcrypto as crypto} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sandbox={crypto,console,document:{createElement:()=>({}),querySelector:()=>null,querySelectorAll:()=>[]},navigator:{onLine:true},
  location:{hash:'',pathname:'/',origin:'http://test'},history:{replaceState(){}},localStorage:{getItem:()=>null,setItem(){}},
  URLSearchParams,URL,Intl,Headers,FormData,Blob,File,Event,CustomEvent,AbortController,AbortSignal,setTimeout,clearTimeout};
sandbox.window=sandbox;
sandbox.confirm=()=>{throw Error('O diálogo deve ser exibido no PIGE360.');};
sandbox.addEventListener=()=>{};
sandbox.fetch=()=>{throw new Error('Requisição de rede inesperada');};
vm.createContext(sandbox);
const load=file=>vm.runInContext(fs.readFileSync(path.join(root,'dist',file),'utf8'),sandbox);
load('vendor/vue-3.5.13.global.prod.js');
load('renders.js');
sandbox.Vue.onMounted=()=>{};
sandbox.Vue.onUnmounted=()=>{};
sandbox.Vue.createApp=()=>({mount(){}});
load('app.js');
sandbox.PigeDialogs.confirm=async()=>true;

const charge={id:'charge-1',description:'Mensalidade',amount:'100.00',status:'pending',version:2,collection_mode:'manual',billing_type:'MANUAL',due_on:'2027-02-01'};
const base='/schools/escola%2Fum/banking/asaas';
const api=sandbox.PigeAPI;
function view(mode,permissions,selected){
  const ctx=sandbox.PigeAsaas.component.setup({schoolId:'escola/um',mode,permissions,charge:selected},{emit(){}});
  return {ctx,state:ctx.s,render:()=>sandbox.PigeAsaas.component.render.call(ctx,ctx,[])};
}
const catalog={id:'statement',title:'Extrato de transações',description:'Consulta de lançamentos',group:'Conta',kind:'list',
  dates:{paymentDate:'Pagamento'},defaults:{},filters:[],columns:[{key:'value',label:'Valor',type:'money'}]};
const getCalls=[],downloads=[];
api.request=async url=>{
  getCalls.push(url);
  if(url===base+'/reports/catalog')return {items:[catalog],can_export:true};
  const query=new URL('https://app.test'+url).searchParams;
  assert.ok(url.startsWith(base+'/reports/statement?'));
  const offset=Number(query.get('offset'));
  return {id:'statement',columns:catalog.columns,items:[{value:'10.00'}],offset,per_page:25,total:26,has_more:offset===0,next_offset:offset+25,environment:'sandbox',generated_at:'2027-01-01',filter_description:'Período'};
};
api.download=async(url,name)=>downloads.push({url,name});
const reports=view('reports',['asaas.reports.read','asaas.reports.export']);
await reports.ctx.initialize();
assert.equal(getCalls.length,1);
reports.state.filters.date_from='2027-01-01';
await reports.ctx.consult();
reports.state.filters.date_from='2027-02-01';
await reports.ctx.consult(25,false);
await reports.ctx.exportReport('pdf');
await reports.ctx.exportReport('csv');
assert.ok(getCalls.every(url=>!url.includes('2027-02-01')));
for(const [index,format] of ['pdf','csv'].entries()){
  const url=new URL('https://app.test'+downloads[index].url);
  assert.equal(url.pathname,base+'/reports/statement.'+format);
  assert.equal(url.searchParams.get('offset'),index===0?'25':'0');
  assert.equal(url.searchParams.get('date_from'),'2027-01-01');
}
assert.ok(reports.render());
const viewer=view('reports',['asaas.reports.read']);
await viewer.ctx.initialize();
await viewer.ctx.consult();
await viewer.ctx.exportReport('csv');
assert.equal(downloads.length,2);
const cashier=view('charge',['banking.read','banking.write'],charge);
api.request=async url=>{assert.ok(url.startsWith(base+'/cards/checkouts?'));return {items:[],total:0,page:1};};
await cashier.ctx.initialize();
assert.ok(cashier.render());
assert.equal(cashier.ctx.checkoutLink('https://asaas.com/checkoutSession/show?id=cs_12'),'https://asaas.com/checkoutSession/show?id=cs_12');
for(const url of ['https://asaas.com.evil.test/checkoutSession/show?id=cs_12','https://asaas.com:4433/checkoutSession/show?id=cs','http://asaas.com/checkoutSession/show?id=cs','https://asaas.com/login','https://asaas.com/checkoutSession/show?id=cs&next=external']){
  assert.equal(cashier.ctx.checkoutLink(url),'');
}
const writes=[];
let pending;
api.post=(url,payload)=>{writes.push({url,payload});return new Promise((resolve,reject)=>{pending={resolve,reject};});};
const first=cashier.ctx.createCard();
await cashier.ctx.createCard();
assert.equal(writes.length,1);
pending.reject(new Error('Tempo limite'));
await first;
const retry=cashier.ctx.createCard();
pending.resolve({status:'creating'});
await retry;
assert.equal(writes.length,2);
assert.equal(writes[0].payload.client_key,writes[1].payload.client_key);
assert.ok(cashier.state.warning.includes('Em criação'));
await cashier.ctx.updateCard({id:'test'},'sync');
assert.equal(writes.length,2,'Consultar checkout exige permissão de conciliação');
const history=view('charge',['banking.read','asaas.monitor.read','asaas.reconcile'],charge);
const operation={id:'op-1',status:'uncertain',kind:'pix_auto_authorize',remote_id:'',updated_at:'2027-01-01'};
api.request=async url=>{
  if(url===base+'/operations/op-1')return operation;
  assert.ok(url.includes('charge_id=charge-1'));return {items:[operation],offset:0,total:1};
};
await history.ctx.chargeTab('history');
await history.ctx.inspectOp('op-1');
api.post=async(url,payload)=>{writes.push({url,payload});return {...operation,status:'completed'};};
await history.ctx.verifyOp();
assert.equal(writes.at(-1).url,base+'/operations/op-1/reconcile');
assert.equal(history.state.op.status,'completed');
assert.ok(history.render());
const refund=view('cards',['banking.read','asaas.monitor.read','asaas.refund']);
const payments=[{id:'pay_1',dueDate:'2027-01-01',value:'100.10',status:'RECEIVED'},{id:'pay_2',dueDate:'2027-02-01',value:'100.10',status:'CONFIRMED'}];
const plan={id:'card_1',charge_id:charge.id,mode:'installment',quote:{charged_cents:20020},status:'paid',payments};
assert.equal(refund.ctx.cardRefundLimit(plan,payments[0]),20020);
assert.equal(refund.ctx.cardRefundLimit(plan,payments[1]),0);
assert.equal(refund.ctx.cardRefundLimit({...plan,payments:payments.slice(0,1)},payments[0]),0);
assert.equal(view('cards',['asaas.refund']).ctx.cardRefundLimit(plan,payments[0]),0);
refund.ctx.openCardRefund(plan,payments[0]);
refund.state.cardRefund.reason='Acordo da escola';
api.request=async()=>({items:[plan],total:1,page:1});
api.post=async(url,payload)=>{writes.push({url,payload});return {status:'completed'};};
// Aguardar o diálogo não pode fazer uma cobrança nem duplicar o envio.
let answerDialog;
let asks=0;
sandbox.PigeDialogs.confirm=async(message,options)=>{
  asks++;
  assert.equal(options.confirmLabel,'Solicitar estorno');
  assert.match(message,/200,20/);
  return await new Promise(resolve=>{answerDialog=resolve;});
};
const countBeforeRefund=writes.length;
const cancelled=refund.ctx.refundCard();
await refund.ctx.refundCard();
assert.equal(asks,1);
answerDialog(false);
await cancelled;
assert.equal(writes.length,countBeforeRefund);
assert.equal(refund.state.cardRefund.amount,'200.20');
const lostAccess=refund.ctx.refundCard();
refund.ctx.props.permissions=['banking.read'];
answerDialog(true);
await lostAccess;
assert.equal(writes.length,countBeforeRefund);
refund.ctx.props.permissions=['banking.read','asaas.monitor.read','asaas.refund'];
const approved=refund.ctx.refundCard();
answerDialog(true);
await approved;
assert.equal(writes.length,countBeforeRefund+1);
assert.equal(writes.at(-1).url,base+'/cards/checkouts/card_1/refund');
assert.equal(writes.at(-1).payload.amount,'200.20');
assert.equal(writes.at(-1).payload.payment_id,'pay_1');
await refund.ctx.cardReceipt(plan,payments[1]);
assert.equal(downloads.length,2,'Confirmação inicial do cartão não libera comprovante de recebimento.');
await refund.ctx.cardReceipt(plan,payments[0]);
assert.equal(downloads.at(-1).url,base+'/cards/checkouts/card_1/payments/pay_1/receipt.pdf');

const bankCharge={...charge,collection_mode:'provider',billing_type:'PIX',remote_payment_id:'pay_teste',status:'received'};
const bankRefund=view('charge',['asaas.refund','asaas.monitor.read'],bankCharge);
bankRefund.state.refundAmount='33.00';
bankRefund.state.refundReason='Ajuste solicitado';
let approveCharge;
sandbox.PigeDialogs.confirm=()=>new Promise(resolve=>{approveCharge=resolve;});
const pendingRefund=bankRefund.ctx.refund();
bankRefund.ctx.props.charge={...bankCharge,id:'outra-cobranca'};
approveCharge(true);
await pendingRefund;
assert.equal(writes.length,countBeforeRefund+1,'Trocar de cobrança antes de confirmar invalida o estorno.');
bankRefund.ctx.props.charge=bankCharge;
sandbox.PigeDialogs.confirm=async()=>true;
await bankRefund.ctx.refund();
assert.equal(writes.at(-1).url,base+'/monitor/charges/charge-1/refund');
assert.equal(writes.at(-1).payload.amount,'33.00');

const settings=view('settings',['integrations.manage']);
let policyPayload;
api.request=async(url,opts)=>{
  if(url.endsWith('/pix-automatic/settings'))return {enabled:false,version:4,additional_holidays:[]};
  if(opts)policyPayload=JSON.parse(opts.body);
  return {connection_id:'conn',version:opts?5:4,settings:policyPayload?.settings??{card_recurring_enabled:true,periodic_reconciliation_enabled:true,settled_review_days:0,reconciliation_batch_size:25}};
};
await settings.ctx.initialize();
assert.ok(settings.render());
const reviewFields=settings.ctx.policyGroups.find(group=>group.title==='Conciliação periódica').fields;
assert.deepEqual(Array.from(reviewFields[1].slice(3)),['0','365']);
assert.deepEqual(Array.from(reviewFields[2].slice(3)),['1','100']);
Object.assign(settings.state.policy.settings,{periodic_reconciliation_enabled:false,settled_review_days:14,reconciliation_batch_size:8});
await settings.ctx.savePolicy();
assert.equal(policyPayload.settings.periodic_reconciliation_enabled,false);
assert.equal(policyPayload.settings.settled_review_days,14);
assert.equal(policyPayload.settings.reconciliation_batch_size,8);
assert.equal(settings.state.settings.version,5);
settings.state.holidays='01/01/2027';
await settings.ctx.saveSettings();
assert.match(settings.state.error,/AAAA-MM-DD/);
console.log('Asaas: filtros e exportação, permissões, checkout idempotente, histórico, conferência e política bancária.');
