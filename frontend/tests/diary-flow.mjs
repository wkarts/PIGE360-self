/** Exercita operações reais do componente compilado, com API determinística local. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {webcrypto as crypto} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sandbox={crypto,console,document:{createElement:()=>({}),querySelector:()=>null,querySelectorAll:()=>[]},navigator:{onLine:true},location:{hash:'',pathname:'/',origin:'http://test'},history:{replaceState(){}},localStorage:{getItem:()=>null,setItem(){}},URLSearchParams,URL,Intl,Headers,FormData,Blob,File,Event,CustomEvent,AbortController,AbortSignal,setTimeout,clearTimeout};
sandbox.window=sandbox;sandbox.addEventListener=()=>{};
sandbox.fetch=()=>{throw new Error('Este teste não acessa a rede.');};
vm.createContext(sandbox);
for(const file of ['vendor/vue-3.5.13.global.prod.js','renders.js'])vm.runInContext(fs.readFileSync(path.join(root,'dist',file),'utf8'),sandbox);
sandbox.Vue.onMounted=()=>{};sandbox.Vue.createApp=()=>({mount(){}});
vm.runInContext(fs.readFileSync(process.env.PIGE_TEST_APP_JS||path.join(root,'dist/app.js'),'utf8'),sandbox);
const permissions=['diary.read','diary.write','diary.attendance','diary.assessments','diary.reports','communications.send'];
const ctx=sandbox.PigeDiary.component.setup({schoolId:'school-one',permissions});
const calls=[];
let diary={id:'diary-one',academic_year_id:'year-one',class_group_id:'class-one',component_id:'component-one',teacher_assignment_id:'assignment-one',year_name:'2026',class_name:'Turma A',component_name:'Matemática',teacher_name:'Professor de Teste',status:'open',version:1,lessons:[],roster:[]};
let gradePayload,attendancePayload,lessonUpdate,planUpdate;
const composition={version:2,fields:[{id:'field-lesson',scope:'lesson',label:'Laboratório'},{id:'field-plan',scope:'plan',label:'Sequência'}],standard_columns:{}};
const lessonPlan={id:'plan-one',version:3,class_group_id:'class-one',component_id:'component-one',teacher_assignment_id:'assignment-one',academic_period_id:'period-one',status:'draft',objectives:'Analisar',bncc_references:['EF01'],extra_fields:[{id:'field-plan',label:'Sequência',value:'Inicial'}]};
const students=[
  {enrollment_id:'e1',name:'Ana',attendance:{version:4,status:'absent',note:'Ausência confirmada'}},
  {enrollment_id:'e2',name:'Bruno',attendance:null},
  {enrollment_id:'e3',name:'Caio',attendance:null}
];
const base='/schools/school-one';
sandbox.PigeAPI.request=async(url,options={})=>{
  calls.push({url,method:options.method||'GET'});
  if([base+'/academic-years',base+'/class-groups',base+'/teacher-assignments'].includes(url))throw new Error('403: recurso administrativo');
  if(url===base+'/diary-entry-fields')return structuredClone(composition);
  if(url.endsWith('/attendance')){
    if(options.method==='PUT'){
      attendancePayload=JSON.parse(options.body);
      for(const mark of attendancePayload.items)students.find(row=>row.enrollment_id===mark.enrollment_id).attendance={...mark,version:(mark.version||0)+1};
      return {saved:attendancePayload.items.length};
    }
    return {lesson:structuredClone(diary.lessons[0]),roster:structuredClone(students)};
  }
  if(url.endsWith('/lessons/lesson-one')&&options.method==='PATCH'){lessonUpdate=JSON.parse(options.body);return {...lessonUpdate,id:'lesson-one'};}
  if(url.endsWith('/curriculum-plans/plan-one')&&options.method==='PATCH'){planUpdate=JSON.parse(options.body);return {...planUpdate,id:'plan-one'};}
  if(url.includes('/curriculum-plans?'))return [structuredClone(lessonPlan)];
  if(url===base+'/diaries')return[{...diary}];
  if(url===base+'/academic-periods')return[{id:'period-one',academic_year_id:'year-one',name:'3º período'}];
  if(url===base+'/curriculum-components')return[{id:'component-one',name:'Matemática'}];
  if(url===base+'/diary-dashboard')return{items:[],totals:{diaries:1}};
  if(url===base+'/diaries/diary-one')return structuredClone(diary);
  if(url.endsWith('/summary'))return{lessons:diary.lessons.length,lesson_count:diary.lessons.length,attendance_records:0,absences:0,justified_absences:0,roster:2};
  if(url.endsWith('/history'))return{closures:[],revisions:[]};
  if(url.endsWith('/assessments/assessment-one/results')&&options.method==='PUT'){gradePayload=JSON.parse(options.body);return{saved:gradePayload.items.length};}
  if(url.endsWith('/assessments/assessment-one')&&options.method==='PATCH'){const payload=JSON.parse(options.body);assert.equal(payload.status,'published');assert.equal(payload.version,3);return{...payload,id:'assessment-one',version:4};}
  return[];
};
sandbox.PigeAPI.post=async(url,payload)=>{
  calls.push({url,method:'POST'});
  if(url.endsWith('/lessons')){diary.lessons.push({...JSON.parse(JSON.stringify(payload)),id:'lesson-one',version:1,extra_fields:[{id:'field-lesson',label:'Laboratório',value:'Anexo A'},{id:'retired-id',label:'Campo retirado',value:'Histórico'}]});return diary.lessons[0];}
  if(url.endsWith('/submit')){assert.equal(payload.version,1);diary={...diary,status:'submitted',version:2};return diary;}
  throw new Error('POST inesperado '+url);
};

await ctx.load();
assert.equal(ctx.state.error,'','Professor abre o Diário sem erro administrativo');
assert.equal(ctx.state.diaries.length,1);
assert.ok(!calls.some(call=>/\/(academic-years|class-groups|teacher-assignments)$/.test(call.url)));
await ctx.selectDiary(ctx.state.diaries[0]);
ctx.state.lessonForm.content='Operações fundamentais';
await ctx.createLesson();
assert.equal(ctx.state.error,'');
assert.equal(ctx.state.selected.lessons.length,1,'A aula salva aparece imediatamente, sem recarregar a página');
await ctx.submitDiary();
assert.equal(ctx.state.selected.status,'submitted','A transição atualiza a tela');
assert.equal(ctx.state.selected.version,2,'A versão atualizada evita conflitos falsos na próxima operação');

diary={...diary,status:'open',version:3};ctx.state.selected=structuredClone(diary);
ctx.state.selectedAssessment={id:'assessment-one',value_type:'numeric',status:'published'};
ctx.state.assessmentRoster=[{enrollment_id:'enrollment-one',result:{numeric_score:0,concept:'',note:''}},{enrollment_id:'enrollment-two',result:{numeric_score:null,concept:'',note:''}}];
await ctx.saveAssessmentResults();
assert.equal(ctx.state.error,'');
assert.equal(gradePayload.items.length,1,'Salvar parcial não envia alunos ainda sem nota');
assert.equal(gradePayload.items[0].numeric_score,0,'Nota zero é um resultado válido');
assert.equal(gradePayload.items[0].enrollment_id,'enrollment-one');

ctx.editAssessment({id:'assessment-one',version:3,title:'Prova de matemática',kind:'exam',assessment_date:'2026-09-23',academic_period_id:'period-one',value_type:'numeric',max_score:'10',weight:'1',description:'',skills:'',status:'draft'});
ctx.state.assessmentForm.status='published';
await ctx.createAssessment();
assert.equal(ctx.state.error,'');
assert.equal(ctx.state.assessmentEditing,null,'A edição termina depois de publicar');
assert.ok(calls.some(call=>call.method==='PATCH'&&call.url.endsWith('/assessments/assessment-one')));
console.log('Diário: professor, refresh de aulas/transições, nota zero/parcial e publicação de avaliação OK.');

await ctx.openAttendance(ctx.state.selected.lessons[0]);
assert.equal(ctx.state.attendance[1].attendance.status,'','Sem chamada não significa presente');
ctx.state.attendance[1].attendance.status='justified_absence';
await ctx.saveAttendance();
assert.deepEqual(attendancePayload.items,[{enrollment_id:'e2',status:'justified_absence',note:'',version:null,expected_empty:true}]);
ctx.markPendingPresent();
assert.equal(ctx.state.attendance[0].attendance.status,'absent');
assert.equal(ctx.state.attendance[1].attendance.status,'justified_absence');
assert.equal(ctx.state.attendance[2].attendance.status,'present');
await ctx.saveAttendance();
assert.equal(attendancePayload.items[0].enrollment_id,'e3');
ctx.editLesson(ctx.state.selected.lessons[0]);ctx.state.lessonValues['field-lesson']='Anexo B';
await ctx.createLesson();assert.equal(ctx.state.error,'');
assert.equal(lessonUpdate.version,1);assert.deepEqual(lessonUpdate.field_values,{'field-lesson':'Anexo B'});
ctx.editPlan(ctx.state.plans[0]);ctx.state.planForm.status='published';ctx.state.planValues['field-plan']='Revisada';
await ctx.createPlan();assert.equal(ctx.state.error,'');assert.equal(planUpdate.version,3);
assert.equal(planUpdate.status,'published');assert.deepEqual(planUpdate.field_values,{'field-plan':'Revisada'});
console.log('Diário: chamada parcial, preservação de faltas, edição versionada de aulas/planejamento e campos históricos OK.');
