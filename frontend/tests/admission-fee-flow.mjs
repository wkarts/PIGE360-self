/** Percurso da taxa opcional usando os handlers e o render Vue entregues ao navegador. */
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const dist = new URL('../dist/', import.meta.url);
const base = '/api/v1/portal/admissions/admission-1';
const document = {createElement: () => ({}), querySelector: () => null, querySelectorAll: () => []};
const tick = () => new Promise(resolve => setImmediate(resolve));

function nodes(node) {
  return node && typeof node === 'object'
    ? [node, ...(Array.isArray(node.children) ? node.children.flatMap(nodes) : [])] : [];
}
function label(node) {
  return typeof node.children === 'string' ? node.children
    : Array.isArray(node.children) ? node.children.map(label).join('') : '';
}

async function scenario(billingType) {
  const requests = [];
  const campaign = {id:'campaign-1', slug:'school', school_id:'school-1', school_name:'Escola',
    title:'Matrícula', accepting:true, fee_enabled:true, fee_amount:'27.50', fee_billing_type:billingType,
    terms_version:'1', groups:[]};
  const admission = {id:'admission-1', number:'PRE-1', school_id:'school-1', version:1, student_data:{name:'Aluno'},
    attachments:[], document_types:[], messages:[], issued_documents:[], preserved_contracts:[], status:'draft'};
  const fee = {enabled:true, can_issue:true, amount:'27.50', billing_type:billingType, charge:null, quote:'xyz-test-quote', message:''};
  let finishIssuance;
  const waitForIssuance = new Promise(resolve => { finishIssuance = resolve; });
  const sandbox = {console, crypto:webcrypto, document, navigator:{onLine:true}, location:{pathname:'/online',search:'',origin:'http://test'},
    URL, URLSearchParams, Intl, Headers, FormData, File, Blob, Event, CustomEvent, setTimeout, clearTimeout, AbortController, AbortSignal,
    localStorage:{getItem:()=>null,setItem(){}}, addEventListener(){}};
  sandbox.window = sandbox;
  sandbox.fetch = async (url, options={}) => {
    const method = options.method || 'GET';
    const payload = options.body && JSON.parse(options.body);
    requests.push({url, method, payload});
    let value;
    if (url===base && method==='GET') value=admission;
    else if (url===base+'/charges' && method==='GET') value=fee.charge?[fee.charge]:[];
    else if (url===base+'/campaign' && method==='GET') value=campaign;
    else if (url===base+'/fee' && method==='GET') value=fee;
    else if (url.startsWith('/api/v1/portal/admissions?page=') && method==='GET') value={items:[admission],total:1};
    else if (url===base+'/submit' && method==='POST') {
      assert.equal(payload.accept_terms,true);
      assert.equal(payload.legal_responsibility,true);
      admission.status='submitted'; admission.version++; value=admission;
    } else if (url===base+'/fee' && method==='POST') {
      await waitForIssuance;
      assert.deepEqual(payload,{quote:'xyz-test-quote'});
      fee.charge={id:'charge-1',status:'queued',amount:'27.50',billing_type:billingType};
      fee.can_issue=false;
      value=fee;
    } else throw new Error('Requisição inesperada: '+method+' '+url);
    return Response.json(value);
  };
  vm.createContext(sandbox);
  const load = name => vm.runInContext(readFileSync(new URL(name,dist),'utf8'),sandbox,{filename:name});
  load('vendor/vue-3.5.13.global.prod.js');
  load('renders.js');
  let component;
  sandbox.Vue.createApp = options => ({mount:()=>{component=options;}});
  sandbox.Vue.onMounted = () => {};
  load('portal.js');
  sandbox.PigeSupport.load = async()=>{};
  const context=component.setup();
  const render=()=>component.render.call(context,context,[]);
  const buttons=()=>nodes(render()).filter(node=>node.type==='button');
  const findButton=regex=>buttons().find(node=>regex.test(label(node)));
  const feePosts=()=>requests.filter(row=>row.url===base+'/fee' && row.method==='POST');
  Object.assign(context.state,{ready:true,schoolId:'school-1',account:{id:'family-1',school_id:'school-1',name:'Família'}});
  await context.view('admission-1');
  assert.equal(context.state.error,'');
  assert.equal(feePosts().length,0);
  assert.equal(findButton(/^Gerar (Pix|boleto)/i),undefined);
  context.state.acceptTerms=true;
  context.state.legal=true;
  const submit = findButton(/^Enviar pré-matrícula/);
  assert.ok(submit,'Botão real da pré-matrícula');
  await submit.props.onClick();
  assert.equal(context.state.error,'');
  assert.equal(requests.filter(row=>row.url===base+'/submit' && row.method==='POST').length,1);
  assert.equal(requests.filter(row=>row.url===base+'/fee' && row.method==='GET').length,1);
  assert.equal(feePosts().length,0,'Enviar inscrição somente consulta a taxa opcional');
  const generate=findButton(billingType==='PIX' ? /^Gerar Pix de/ : /^Gerar boleto de/);
  assert.ok(generate);
  assert.match(label(generate),/27,50/);
  const first=generate.props.onClick();
  await tick();
  const busyButton=findButton(/^Gerar (Pix|boleto)/i);
  assert.equal(busyButton.props.disabled,true);
  await busyButton.props.onClick();
  assert.equal(feePosts().length,1,'Duplo clique não envia segunda emissão');
  finishIssuance();
  await first;
  assert.equal(context.state.error,'');
  assert.equal(context.state.charges[0].id,'charge-1');
  assert.equal(findButton(/^Gerar (Pix|boleto)/i),undefined);
  await context.view('admission-1');
  assert.equal(feePosts().length,1,'Reabrir apenas consulta a cobrança vinculada');
}
await scenario('PIX');
await scenario('BOLETO');
console.log('Taxa opcional: abrir, enviar e reabrir preservam o consentimento; clique explícito usa a cotação para Pix e boleto.');
