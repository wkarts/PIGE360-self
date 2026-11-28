import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const dist=fileURLToPath(new URL('../dist/',import.meta.url));
const app={console,document:{createElement:()=>({}),querySelector:()=>null},navigator:{onLine:true},
  location:{hash:'',pathname:'/'},history:{replaceState(){}},localStorage:{getItem:()=>null},
  URL,URLSearchParams,Headers,FormData,AbortController,AbortSignal,Intl,addEventListener(){}};
app.window=app;vm.createContext(app);
for(const file of ['vendor/vue-3.5.13.global.prod.js','renders.js'])vm.runInContext(fs.readFileSync(dist+file,'utf8'),app);
let mounted,unmount;
Object.assign(app.Vue,{onMounted:fn=>mounted=fn,onUnmounted:fn=>unmount=fn,createApp:()=>({mount(){}})});
vm.runInContext(fs.readFileSync(dist+'app.js','utf8'),app);
const {component}=app.PigeEducacenso;
const ctx=app.Vue.reactive(component.setup({schoolId:'escola/um',schoolName:'Escola teste'})),s=ctx.state;
const api=app.PigeAPI,calls=[],downloads=[];
const row={enrollment_id:'m/a',enrollment_number:'MAT-703',class_group_id:'g',class_name:'Turma Azul',
  student_name:'Aluna sintética',student_number:'AL-1',local_status:'active',birth_date:'2010-01-03',student_inep_code:'A123',
  declaration:{student_name:'Aluna sintética',birth_date:'2010-01-03',student_inep_code:'A123',status:''}};
let snapshot={rows:[row],blocks:[],official_source:'https://www.gov.br/inep'};
let draft={id:'rascunho',version:1,reference_date:'2025-06-02',stage:'matricula_inicial',status:'rascunho',
  snapshot,rows_display:[row],digest:'1'.repeat(64),evidence:[]};
const copy=o=>JSON.parse(JSON.stringify(o));
api.request=async(path,opts)=>{
  calls.push({path,method:opts?.method||'GET',body:opts?.body?JSON.parse(opts.body):undefined});
  if(path.endsWith('/academic-years'))return [{id:'y',status:'active',name:'2025'}];
  if(path.endsWith('/class-groups'))return [{id:'g',academic_year_id:'y',name:'Turma Azul'}];
  if(path.includes('/revisions?'))return {items:[{version:draft.version,reason:'Registro escolar',created_at:'2025-10-30'}]};
  if(path.endsWith('/enrollments/search'))return {items:[row],offset:0,total:1};
  if(path.endsWith('/preview'))return copy(snapshot);
  if(path.endsWith('/drafts')||path.includes('/drafts/rascunho?'))return copy(draft);
  if(opts?.method==='PATCH'){
    const {version,reason,...changes}=JSON.parse(opts.body);Object.assign(row.declaration,changes);draft.version++;return copy(draft);
  }
  if(path.includes('/archive?')){draft.version++;draft.status='arquivado';return copy(draft);}
  if(path.includes('/drafts?'))return [];
  throw Error('Caminho inesperado '+path);
};
api.post=(path,body)=>api.request(path,{method:'POST',body:JSON.stringify(body)});
api.patch=(path,body)=>api.request(path,{method:'PATCH',body:JSON.stringify(body)});
api.download=async(path)=>downloads.push(path);
const render=()=>component.render.call(ctx,ctx,[]);
function text(node){return !node?'':Array.isArray(node)?node.map(text).join(' '):typeof node==='object'?text(node.children):String(node);}

await mounted();s.day='2025-06-02';s.scope='single';
const before=calls.length;await ctx.preview();
assert.equal(calls.length,before);assert.match(s.error,/Selecione a matrícula/);
s.q='Aluna';await ctx.search();ctx.choose(s.results[0]);await ctx.preview();
assert.deepEqual(calls.at(-1).body.enrollment_ids,['m/a']);assert.match(text(render()),/Aluna sintética/);
await ctx.save();assert.equal(s.tab,'detail');assert.match(text(render()),/Código Inep na declaração/);
await ctx.studentFile(s.draft.rows_display[0]);assert.match(downloads[0],/escola%2Fum.*m%2Fa\/ficha.pdf\?environment=treinamento&version=1/);
ctx.edit(s.draft.rows_display[0]);s.editBirth='';s.editInep='';s.editReason='Revisão cadastral';
await ctx.updateRow();const changed=calls.find(c=>c.method==='PATCH');
assert.deepEqual(changed.body,{version:1,reason:'Revisão cadastral',student_inep_code:null,birth_date:null});
assert.equal(ctx.declaredField(s.draft.rows_display[0],'birth_date'),'');assert.equal(s.draft.rows_display[0].birth_date,'2010-01-03');
draft.stage='situacao_aluno';await ctx.open('rascunho');ctx.edit(s.draft.rows_display[0]);
assert.equal(s.editValue,'');assert.match(text(render()),/Não informada/);
s.editValue='active';s.editReason='Rendimento conferido';const edits=calls.filter(c=>c.method==='PATCH').length;
await ctx.updateRow();assert.equal(calls.filter(c=>c.method==='PATCH').length,edits);
s.editValue='Aprovado';await ctx.updateRow();
assert.equal(calls.filter(c=>c.method==='PATCH').at(-1).body.status,'Aprovado');
let resolve;
app.PigeDialogs.prompt=()=>new Promise(r=>resolve=r);
const removing=ctx.remove(s.draft.rows_display[0]);s.draft.version++;resolve('Pedido cancelado pela troca de versão');await removing;
assert.equal(calls.some(c=>c.method==='DELETE'),false);
app.PigeDialogs.prompt=async()=>null;await ctx.remove();assert.equal(s.draft.status,'rascunho');
app.PigeDialogs.prompt=async()=>'Encerramento da revisão';await ctx.remove();assert.equal(s.draft.status,'arquivado');assert.equal(ctx.editable(),false);
assert.doesNotMatch(text(render()),/Retirar do rascunho|Arquivar rascunho/);
await ctx.openTab('history');await ctx.historyType(true);assert.match(calls.at(-1).path,/archived=true/);
await ctx.openTab('prepare');ctx.resetFilters();assert.equal(s.chosen,null);assert.equal(s.preview,null);
s.scope='school';s.group='g';await ctx.preview();assert.deepEqual(calls.at(-1).body.class_group_ids,['g']);assert.ok(!('enrollment_ids' in calls.at(-1).body));
unmount();
console.log('Educacenso: seleção individual estrita, ficha PDF da revisão, edição parcial e campo vazio, histórico, confirmação e arquivamento OK.');
