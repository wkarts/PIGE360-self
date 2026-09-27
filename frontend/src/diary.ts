namespace PigeDiary {
  type Row=PigeAPI.Row;
  type Diary=Row&{class_group_id:string;academic_year_id:string;component_id:string;teacher_assignment_id?:string|null;status:string;class_name:string;component_name:string;year_name:string;teacher_name:string;lessons?:Lesson[];roster?:Roster[]};
  type Lesson=Row&{lesson_date:string;lesson_count:number;content:string;academic_period_id?:string|null;skills:string;methodology:string;activities:string;homework:string;notes:string};
  type Roster={enrollment_id:string;student_id:string;number:string;name:string;enrollment_status:string;attendance?:{status:string;note:string}|null};
  type Props={schoolId:string;permissions:string[]};
  const today=()=>new Date().toISOString().slice(0,10);
  export const component={props:['schoolId','permissions'],render:PigeRenders.diary,setup(props:Props){
    const state=Vue.reactive({
      busy:false,error:'',notice:'',tab:'diaries',
      diaries:[] as Diary[],selected:null as Diary|null,periods:[] as Row[],components:[] as Row[],groups:[] as Row[],assignments:[] as Row[],plans:[] as Row[],
      periodForm:{academic_year_id:'',name:'',starts_on:'',ends_on:'',order_index:1,active:true},
      componentForm:{name:'',code:'',workload_hours:0,active:true},
      diaryForm:{class_group_id:'',component_id:'',teacher_assignment_id:'',notes:''},
      planForm:{class_group_id:'',component_id:'',academic_period_id:'',teacher_assignment_id:'',objectives:'',thematic_units:'',knowledge_objects:'',bncc_references:'',methodology:'',resources:'',assessment_strategy:'',notes:'',status:'draft'},
      lessonForm:{academic_period_id:'',lesson_date:today(),lesson_count:1,content:'',skills:'',methodology:'',activities:'',homework:'',notes:''},
      selectedLesson:null as Lesson|null,attendance:[] as Roster[],closePeriod:'',closeReason:'Fechamento pedagógico conferido.',reopenReason:'',
      summary:null as null|{lessons:number;lesson_count:number;attendance_records:number;absences:number;justified_absences:number;roster:number},
      history:{closures:[] as Row[],revisions:[] as Row[]}
    });
    const base=()=>'/schools/'+props.schoolId;
    const can=(p:string)=>props.permissions.includes(p);
    const str=(v:unknown)=>v==null?'':String(v);
    const date=(v:unknown)=>{const x=str(v);return x?new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC'}).format(new Date(x.length===10?x+'T12:00:00Z':x)):'—';};
    const labels:Record<string,string>={open:'Aberto',draft:'Rascunho',submitted:'Enviado',reviewed:'Revisado',closed:'Fechado',present:'Presente',absent:'Falta',justified_absence:'Falta justificada',active:'Ativo',suspended:'Suspenso'};
    const label=(v:unknown)=>labels[str(v)]||str(v)||'—';
    async function run(action:()=>Promise<void>){if(state.busy)return;state.busy=true;state.error='';state.notice='';try{await action();}catch(e){state.error=e instanceof Error?e.message:String(e);}finally{state.busy=false;}}
    async function loadBase(){const results=await Promise.all([
      PigeAPI.request<Diary[]>(base()+'/diaries'),
      PigeAPI.request<Row[]>(base()+'/academic-periods'),
      PigeAPI.request<Row[]>(base()+'/curriculum-components'),
      PigeAPI.request<Row[]>(base()+'/class-groups').catch(()=>[] as Row[]),
      PigeAPI.request<Row[]>(base()+'/teacher-assignments').catch(()=>[] as Row[])
    ]);state.diaries=results[0] as Diary[];state.periods=results[1] as Row[];state.components=results[2] as Row[];state.groups=results[3] as Row[];state.assignments=results[4] as Row[];
      if(!state.periodForm.academic_year_id&&state.groups.length)state.periodForm.academic_year_id=str(state.groups[0].academic_year_id);
    }
    async function load(){await run(loadBase);}
    async function selectDiary(d:Diary){await run(async()=>{state.selected=await PigeAPI.request<Diary>(base()+'/diaries/'+d.id);state.summary=await PigeAPI.request<any>(base()+'/diaries/'+d.id+'/summary');state.history=await PigeAPI.request<any>(base()+'/diaries/'+d.id+'/history');state.plans=await PigeAPI.request<Row[]>(base()+'/curriculum-plans?class_group_id='+encodeURIComponent(d.class_group_id)+'&component_id='+encodeURIComponent(d.component_id));state.selectedLesson=null;state.attendance=[];state.planForm.class_group_id=d.class_group_id;state.planForm.component_id=d.component_id;state.planForm.teacher_assignment_id=d.teacher_assignment_id||'';});}
    async function createPeriod(){await run(async()=>{await PigeAPI.post(base()+'/academic-periods',state.periodForm);state.periodForm={academic_year_id:state.periodForm.academic_year_id,name:'',starts_on:'',ends_on:'',order_index:state.periodForm.order_index+1,active:true};await loadBase();state.notice='Período letivo criado.';});}
    async function createComponent(){await run(async()=>{await PigeAPI.post(base()+'/curriculum-components',state.componentForm);state.componentForm={name:'',code:'',workload_hours:0,active:true};await loadBase();state.notice='Componente curricular criado.';});}
    async function createDiary(){await run(async()=>{const body={...state.diaryForm,teacher_assignment_id:state.diaryForm.teacher_assignment_id||null};const d=await PigeAPI.post<Diary>(base()+'/diaries',body);state.diaryForm={class_group_id:'',component_id:'',teacher_assignment_id:'',notes:''};await loadBase();await selectDiary(d);state.notice='Diário aberto.';});}
    async function createPlan(){if(!state.selected)return;await run(async()=>{const f=state.planForm;await PigeAPI.post(base()+'/curriculum-plans',{...f,academic_period_id:f.academic_period_id||null,teacher_assignment_id:f.teacher_assignment_id||null,bncc_references:f.bncc_references.split(/[\\s,;]+/).map(x=>x.trim()).filter(Boolean)});state.plans=await PigeAPI.request<Row[]>(base()+'/curriculum-plans?class_group_id='+encodeURIComponent(state.selected!.class_group_id)+'&component_id='+encodeURIComponent(state.selected!.component_id));state.notice='Planejamento registrado.';});}
    async function createLesson(){if(!state.selected)return;await run(async()=>{await PigeAPI.post(base()+'/diaries/'+state.selected!.id+'/lessons',{...state.lessonForm,academic_period_id:state.lessonForm.academic_period_id||null});state.lessonForm={academic_period_id:state.lessonForm.academic_period_id,lesson_date:today(),lesson_count:1,content:'',skills:'',methodology:'',activities:'',homework:'',notes:''};await selectDiary(state.selected!);state.notice='Aula registrada.';});}
    async function openAttendance(lesson:Lesson){if(!state.selected)return;await run(async()=>{const result=await PigeAPI.request<{lesson:Lesson;roster:Roster[]}>(base()+'/diaries/'+state.selected!.id+'/lessons/'+lesson.id+'/attendance');state.selectedLesson=result.lesson;state.attendance=result.roster.map(r=>({...r,attendance:r.attendance||{status:'present',note:''}}));});}
    async function saveAttendance(){if(!state.selected||!state.selectedLesson)return;await run(async()=>{await PigeAPI.request(base()+'/diaries/'+state.selected!.id+'/lessons/'+state.selectedLesson!.id+'/attendance',{method:'PUT',body:JSON.stringify({items:state.attendance.map(r=>({enrollment_id:r.enrollment_id,status:r.attendance?.status||'present',note:r.attendance?.note||''}))})});state.notice='Chamada salva.';await selectDiary(state.selected!);});}
    async function closeDiary(){if(!state.selected)return;await run(async()=>{await PigeAPI.post(base()+'/diaries/'+state.selected!.id+'/close',{academic_period_id:state.closePeriod||null,reason:state.closeReason});await selectDiary(state.selected!);state.notice='Diário fechado com snapshot e hash de integridade.';});}
    async function reopenDiary(){if(!state.selected)return;await run(async()=>{await PigeAPI.post(base()+'/diaries/'+state.selected!.id+'/reopen',{reason:state.reopenReason});state.reopenReason='';await selectDiary(state.selected!);state.notice='Diário reaberto com registro de retificação.';});}
    async function report(){if(state.selected)await run(()=>PigeAPI.download(base()+'/diaries/'+state.selected!.id+'/report.pdf','diario-escolar.pdf'));}
    Vue.onMounted(()=>{void load();});
    return{state,can,str,date,label,load,selectDiary,createPeriod,createComponent,createDiary,createPlan,createLesson,openAttendance,saveAttendance,closeDiary,reopenDiary,report};
  }};
}
