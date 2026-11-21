namespace PigeDiary {
  type Row=PigeAPI.Row;
  type Diary=Row&{class_group_id:string;academic_year_id:string;component_id:string;teacher_assignment_id?:string|null;version:number;status:string;class_name:string;component_name:string;year_name:string;teacher_name:string;lessons?:Lesson[];roster?:Roster[]};
  type Lesson=Row&{lesson_date:string;lesson_count:number;content:string;academic_period_id?:string|null;skills:string;methodology:string;activities:string;homework:string;notes:string};
  type Roster={enrollment_id:string;student_id:string;number:string;name:string;enrollment_status:string;attendance?:{id?:string;version?:number;status:string;note:string}|null};
  type AssessmentResult={id?:string;version?:number;numeric_score:string|number|null;concept:string;note:string};
  type CommunicationRecipient={guardian_link_id:string;name:string;relationship:string;portal_account_count:number};
  type Props={schoolId:string;schoolName?:string;catalogEnabled?:boolean;permissions:string[];teacherPortal?:boolean;requestedDiary?:{id:string;tab?:string}};
  const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bahia',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  interface DiaryPage {id:string; label:string; tab:string; permission?:string}
  interface DiaryGroup {label:string; pages:DiaryPage[]}
  const groups:DiaryGroup[]=[
    {label:'Hoje',pages:[{id:'dashboard',label:'Pendências',tab:'dashboard'}]},
    {label:'Aulas e chamada',pages:[
      {id:'diaries',label:'Aulas',tab:'diaries'}, {id:'attendance',label:'Frequência',tab:'diaries'},
      {id:'planning',label:'Planejamento',tab:'planning'}]},
    {label:'Aprendizagem',pages:[
      {id:'assessments',label:'Avaliações e recuperação',tab:'assessments'}, {id:'opinions',label:'Pareceres',tab:'opinions'},
      {id:'records',label:'Registros pedagógicos',tab:'records'}]},
    {label:'Acompanhamento',pages:[
      {id:'occurrences',label:'Ocorrências',tab:'occurrences'}, {id:'materials',label:'Materiais',tab:'materials'},
      {id:'communications',label:'Comunicações',tab:'communications',permission:'communications.send'}]},
    {label:'Fechamento',pages:[
      {id:'review',label:'Conferência e retificações',tab:'diaries'}, {id:'results',label:'Consolidação',tab:'assessments'},
      {id:'reports',label:'Relatórios',tab:'diaries',permission:'diary.reports'}]},
    {label:'Configuração',pages:[
      {id:'setup',label:'Períodos',tab:'setup',permission:'diary.configure'},
      {id:'components',label:'Componentes',tab:'setup',permission:'diary.configure'},
      {id:'catalog',label:'Catálogo e vigência',tab:'setup',permission:'diary.configure'},
      {id:'new-diary',label:'Abrir diário',tab:'setup',permission:'diary.configure'},
      {id:'rules',label:'Regras',tab:'assessments',permission:'diary.configure'}]}
  ];
  export function pilotForSchool(schoolId:string){
    return Boolean(schoolId) && new URLSearchParams(location.search).get('diarioPiloto')===schoolId;
  }
  export function clearPilotContext(schoolId:string){
    const url=new URL(location.href);
    if(url.searchParams.get('diarioPiloto')!==schoolId)return;
    for(const key of ['diarioPiloto','guia','diario','periodo'])url.searchParams.delete(key);
    if(url.hash==='#diario')url.hash='';
    history.replaceState(history.state,'',url.pathname+url.search+url.hash);
  }
  export const component={props:['schoolId','schoolName','catalogEnabled','permissions','teacherPortal','requestedDiary'],render:PigeRenders.diary,setup(props:Props){
    const state=Vue.reactive({
      busy:false,error:'',notice:'',tab:'diaries',page:'diaries',diaryFilter:'',lessonPeriod:'',dirty:false,
      diaries:[] as Diary[],selected:null as Diary|null,academicYears:[] as Row[],periods:[] as Row[],components:[] as Row[],groups:[] as Row[],assignments:[] as Row[],plans:[] as Row[],
      periodForm:{academic_year_id:'',name:'',starts_on:'',ends_on:'',order_index:1,active:true},
      componentForm:{name:'',code:'',workload_hours:0,active:true},
      diaryForm:{class_group_id:'',component_id:'',teacher_assignment_id:'',notes:''},
      planForm:{class_group_id:'',component_id:'',academic_period_id:'',teacher_assignment_id:'',objectives:'',thematic_units:'',knowledge_objects:'',bncc_references:'',methodology:'',resources:'',assessment_strategy:'',notes:'',status:'draft'},
      lessonForm:{academic_period_id:'',lesson_date:today(),lesson_count:1,content:'',skills:'',methodology:'',activities:'',homework:'',notes:''},
      selectedLesson:null as Lesson|null,attendance:[] as Roster[],
      assessments:[] as Row[],assessmentEditing:null as Row|null,selectedAssessment:null as Row|null,assessmentRoster:[] as (Roster&{result?:AssessmentResult|null})[],
      assessmentForm:{academic_period_id:'',title:'',kind:'activity',assessment_date:today(),value_type:'numeric',max_score:'10',weight:'1',description:'',skills:'',status:'published'},
      opinions:[] as Row[],opinionForm:{academic_period_id:'',enrollment_id:'',text:'',status:'draft'},
      pedagogicalRecords:[] as Row[],pedagogicalForm:{enrollment_id:'',record_date:today(),kind:'observation',text:''},
      closePeriod:'',closeReason:'Fechamento pedagógico conferido.',reopenReason:'',
      summary:null as null|{lessons:number;lesson_count:number;attendance_records:number;absences:number;justified_absences:number;roster:number;assessments?:number;opinions?:number;pedagogical_records?:number},
      history:{closures:[] as Row[],revisions:[] as Row[]},
      dashboard:{items:[] as Row[],totals:{} as Row},
      assessmentRules:[] as Row[],
      assessmentRuleForm:{period_id:'',method:'arithmetic',scale_max:'10',decimal_places:2,minimum_score:'',minimum_attendance_percent:'',justified_absence_counts_as_present:'',recovery_mode:'none',concept_scale:'',required_opinion:false,version:null as number|null},
      periodResults:[] as Row[],
      materials:[] as Row[],materialForm:{client_key:PigeOnline.newId(),kind:'Atividade',title:'',body:'',enrollment_id:''},
      occurrences:[] as Row[],
      communicationRecipients:[] as CommunicationRecipient[],communications:[] as Row[],
      communicationForm:{enrollment_id:'',academic_period_id:'',occurrence_id:'',recipient_guardian_link_ids:[] as string[],title:'',message:'',client_key:PigeOnline.newId()},
      occurrenceForm:{academic_period_id:'',enrollment_id:'',occurrence_date:today(),kind:'pedagogical',title:'',description:'',status:'draft'},
      reportType:'class_diary',reportPeriod:'',reportEnrollment:''
    });
    const base=()=>(props.teacherPortal?'/teacher':'')+'/schools/'+props.schoolId;
    const can=(p:string)=>props.permissions.includes(p);
    type Impact={id:string;version:number;catalog_status:string;effective_on:string|null;
      discard_allowed:boolean;references:{key:string;label:string;count:number}[]};
    const catalog=Vue.reactive({drafts:[] as Row[],name:'',code:'',hours:0,reason:'',target:'' as string,
      impact:null as Impact|null});
    async function catalogList(){catalog.drafts=await PigeAPI.request<Row[]>(base()+'/diary-catalog/suggestions');}
    function catalogImpact(){
      catalog.impact=null;catalog.reason='';
      if(catalog.target)void run(async()=>{
        catalog.impact=await PigeAPI.request<Impact>(base()+'/diary-catalog/'+catalog.target+'/impact');
      });
    }
    function suggest(){return run(async()=>{
      const row=await PigeAPI.post<Row>(base()+'/diary-catalog/suggestions',{
        name:catalog.name,code:catalog.code,workload_hours:catalog.hours});
      await catalogList();catalog.name='';catalog.code='';catalog.hours=0;
      catalog.target=row.id;catalog.impact=await PigeAPI.request<Impact>(base()+'/diary-catalog/'+row.id+'/impact');
      catalog.reason='';state.notice='Sugestão guardada em rascunho.';
    });}
    function decide(action:'retire'|'publish'|'discard'){
      const impact=catalog.impact;
      if(!impact || catalog.reason.trim().length<3)return;
      const verbs={retire:'Desativar',publish:'Publicar',discard:'Descartar'};
      if(!window.confirm(verbs[action]+' este componente curricular?'))return;
      return run(async()=>{
        await PigeAPI.post(base()+'/diary-catalog/'+impact.id+'/decisions',{action,version:impact.version,reason:catalog.reason});
        catalog.impact=null;catalog.target='';catalog.reason='';await loadBase();await catalogList();
        state.notice='Decisão registrada no histórico do componente.';
      });
    }
    const initial=new URLSearchParams(location.search);
    const pilot=pilotForSchool(props.schoolId);
    const navigation=Vue.computed(()=>groups.map(group=>({...group,pages:group.pages.filter(
      page=>(!page.permission || can(page.permission)) && (page.id!=='catalog' || props.catalogEnabled===true)
    )})).filter(group=>group.pages.length));
    const activeGroup=Vue.computed(()=>navigation.value.find(group=>group.pages.some(page=>page.id===state.page)));
    const filteredDiaries=Vue.computed(()=>{
      const term=state.diaryFilter.trim().toLocaleLowerCase('pt-BR');
      return state.diaries.filter(d=>[d.year_name,d.class_name,d.component_name,d.teacher_name].join(' ').toLocaleLowerCase('pt-BR').includes(term));
    });
    const lessons=Vue.computed(()=>(state.selected?.lessons||[]).filter(
      lesson=>!pilot || !state.lessonPeriod || lesson.academic_period_id===state.lessonPeriod));
    function filterPeriod(event:Event){
      const select=event.target as HTMLSelectElement;
      if(!mayLeave()){select.value=state.lessonPeriod;return;}
      state.lessonPeriod=select.value;
      state.selectedLesson=null;
      syncLink();
    }
    function pageLink(page:string){
      const url=new URL(location.href);
      url.searchParams.set('guia',page);
      if(state.lessonPeriod)url.searchParams.set('periodo',state.lessonPeriod);
      else url.searchParams.delete('periodo');
      if(state.selected)url.searchParams.set('diario',String(state.selected.id));
      else url.searchParams.delete('diario');
      url.hash=props.teacherPortal?'diario':'/diary';
      return url.pathname+url.search+url.hash;
    }
    function syncLink(){if(pilot)history.replaceState(history.state,'',pageLink(state.page));}
    function mayLeave(){return !state.dirty || window.confirm('Continuar com alterações ainda não salvas no Diário?');}
    function navigatePage(id:string,check=true){
      const page=navigation.value.flatMap(group=>group.pages).find(item=>item.id===id);
      if(!page || (check && page.id!==state.page && !mayLeave()))return false;
      state.page=page.id;state.tab=page.tab;
      return true;
    }
    function go(id:string){
      if(navigatePage(id)){
        syncLink();if(id==='catalog')void run(catalogList);
      }
    }
    function show(...pages:string[]){return !pilot || pages.includes(state.page);}
    const draftPages=new Set<string>();
    async function save(action:()=>Promise<void>){
      if(state.busy)return;
      const page=state.page;
      await action();
      if(!state.error && state.notice){draftPages.delete(page);state.dirty=draftPages.size>0;}
    }
    function beforeUnload(event:BeforeUnloadEvent){if(state.dirty){event.preventDefault();event.returnValue='';}}
    function markDraft(event:Event){
      if(pilot && (event.target as Element).closest('form,.x-form,td')){
        draftPages.add(state.page);state.dirty=true;
      }
    }
    function chooseAnother(){
      if(!mayLeave())return;
      draftPages.clear();state.dirty=false;state.lessonPeriod='';state.selected=null;state.selectedLesson=null;syncLink();
    }
    if(pilot && !navigatePage(initial.get('guia')||'dashboard',false))navigatePage('dashboard',false);
    const str=(v:unknown)=>v==null?'':String(v);
    const date=(v:unknown)=>{const x=str(v);return x?new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC'}).format(new Date(x.length===10?x+'T12:00:00Z':x)):'—';};
    const labels:Record<string,string>={open:'Aberto',draft:'Rascunho',submitted:'Enviado',reviewed:'Revisado',closed:'Fechado',present:'Presente',absent:'Falta',justified_absence:'Falta justificada',active:'Ativo',suspended:'Suspenso',published:'Publicada',final:'Final',pending:'Pendente',calculated:'Calculado',below_minimum:'Abaixo da média',attendance_below_minimum:'Frequência abaixo do mínimo',opinion_pending:'Parecer pendente',concept:'Conceito',follow_up:'Acompanhamento',intervention:'Intervenção',recovery:'Recuperação',adaptation:'Adaptação',referral:'Encaminhamento',observation:'Observação',positive:'Positiva',pedagogical:'Pedagógica',behavioral:'Comportamental',safety:'Segurança',other:'Outra',resultados_avaliativos_pendentes:'Há notas pendentes',sem_resultado_aplicavel:'Sem resultado aplicável',chamada_pendente:'Chamada pendente',conceito_fora_da_escala:'Conceito fora da escala',peso_avaliativo_ausente:'Peso não definido',resultado_numerico_ausente:'Nota não informada',frequencia_abaixo_do_limite:'Frequência abaixo do mínimo',parecer_final_pendente:'Parecer final pendente'};
    const label=(v:unknown)=>labels[str(v)]||str(v)||'—';
    async function run(action:()=>Promise<void>){if(state.busy)return;state.busy=true;state.error='';state.notice='';try{await action();}catch(e){state.error=e instanceof Error?e.message:String(e);}finally{state.busy=false;}}
    async function loadBase(){const results=await Promise.all([
      PigeAPI.request<Diary[]>(base()+'/diaries'),
      PigeAPI.request<Row[]>(base()+'/academic-periods'),
      PigeAPI.request<Row[]>(base()+'/curriculum-components'),
      can('diary.configure')?PigeAPI.request<Row[]>(base()+'/academic-years'):Promise.resolve([] as Row[]),
      can('diary.configure')?PigeAPI.request<Row[]>(base()+'/class-groups'):Promise.resolve([] as Row[]),
      can('diary.configure')?PigeAPI.request<Row[]>(base()+'/teacher-assignments'):Promise.resolve([] as Row[]),
      PigeAPI.request<any>(base()+'/diary-dashboard')
    ]);state.diaries=results[0] as Diary[];state.periods=results[1] as Row[];state.components=results[2] as Row[];state.academicYears=results[3] as Row[];state.groups=results[4] as Row[];state.assignments=results[5] as Row[];state.dashboard=results[6] as {items:Row[];totals:Row};
      if(!state.periodForm.academic_year_id&&state.academicYears.length){const year=state.academicYears.find(x=>x.status==='active'||x.active)||state.academicYears[0];state.periodForm.academic_year_id=str(year.id);}
    }
    async function load(){await run(loadBase);}
    async function loadDiary(d:Diary){
      const endpoint=base()+'/diaries/'+d.id;
      const [selected,summary,history,plans,assessments,rules,occurrences,opinions,records,communications,materials]=await Promise.all([
        PigeAPI.request<Diary>(endpoint),PigeAPI.request<any>(endpoint+'/summary'),
        PigeAPI.request<any>(endpoint+'/history'),
        PigeAPI.request<Row[]>(base()+'/curriculum-plans?class_group_id='+encodeURIComponent(d.class_group_id)+'&component_id='+encodeURIComponent(d.component_id)),
        PigeAPI.request<Row[]>(endpoint+'/assessments'),PigeAPI.request<Row[]>(endpoint+'/assessment-rules'),
        PigeAPI.request<Row[]>(endpoint+'/occurrences'),PigeAPI.request<Row[]>(endpoint+'/opinions'),
        PigeAPI.request<Row[]>(endpoint+'/pedagogical-records'),PigeAPI.request<Row[]>(endpoint+'/communications'),PigeAPI.request<Row[]>(endpoint+'/materials')
      ]);
      const changed=state.selected?.id!==d.id;
      state.selected=selected;state.summary=summary;state.history=history;state.plans=plans;
      state.assessments=assessments;state.assessmentRules=rules;state.occurrences=occurrences;
      state.opinions=opinions;state.pedagogicalRecords=records;state.communications=communications;
      state.selectedLesson=null;state.attendance=[];state.assessmentEditing=null;state.selectedAssessment=null;state.assessmentRoster=[];state.periodResults=[];
      state.materials=materials;
      if(changed){
        state.materialForm={client_key:PigeOnline.newId(),kind:'Atividade',title:'',body:'',enrollment_id:''};
        state.planForm={class_group_id:d.class_group_id,component_id:d.component_id,academic_period_id:'',teacher_assignment_id:d.teacher_assignment_id||'',objectives:'',thematic_units:'',knowledge_objects:'',bncc_references:'',methodology:'',resources:'',assessment_strategy:'',notes:'',status:'draft'};
        state.lessonForm={academic_period_id:'',lesson_date:today(),lesson_count:1,content:'',skills:'',methodology:'',activities:'',homework:'',notes:''};
        state.assessmentForm={academic_period_id:'',title:'',kind:'activity',assessment_date:today(),value_type:'numeric',max_score:'10',weight:'1',description:'',skills:'',status:'published'};
        state.opinionForm={academic_period_id:'',enrollment_id:'',text:'',status:'draft'};
        state.pedagogicalForm={enrollment_id:'',record_date:today(),kind:'observation',text:''};
        state.reportPeriod='';state.reportEnrollment='';state.closePeriod='';
      }
      state.occurrenceForm={academic_period_id:'',enrollment_id:'',occurrence_date:today(),kind:'pedagogical',title:'',description:'',status:'draft'};
      const firstPeriod=state.periods.find(p=>p.academic_year_id===d.academic_year_id);
      selectRulePeriod(firstPeriod?str(firstPeriod.id):'');
      state.communicationRecipients=[];
      state.communicationForm={enrollment_id:'',academic_period_id:'',occurrence_id:'',recipient_guardian_link_ids:[],title:'',message:'',client_key:PigeOnline.newId()};
    }
    async function selectDiary(d:Diary){
      if(state.selected?.id!==d.id && !mayLeave())return;
      await run(async()=>{await loadDiary(d);
        draftPages.clear();state.dirty=false;state.lessonPeriod='';syncLink();});
    }
    function selectRulePeriod(periodId:string){const rule=state.assessmentRules.find(x=>x.academic_period_id===periodId);state.assessmentRuleForm={period_id:periodId,method:str(rule?.method)||'arithmetic',scale_max:str(rule?.scale_max)||'10',decimal_places:Number(rule?.decimal_places??2),minimum_score:str(rule?.minimum_score),minimum_attendance_percent:str(rule?.minimum_attendance_percent),justified_absence_counts_as_present:rule?.justified_absence_counts_as_present==null?'':String(rule.justified_absence_counts_as_present),recovery_mode:str(rule?.recovery_mode)||'none',concept_scale:Array.isArray(rule?.concept_scale)?rule.concept_scale.join(', '):'',required_opinion:Boolean(rule?.required_opinion),version:rule?.version==null?null:Number(rule.version)};}
    async function saveAssessmentRule(){if(!state.selected||!state.assessmentRuleForm.period_id)return;await run(async()=>{const f=state.assessmentRuleForm;const body={method:f.method,scale_max:f.scale_max,decimal_places:f.decimal_places,minimum_score:f.minimum_score||null,minimum_attendance_percent:f.minimum_attendance_percent||null,justified_absence_counts_as_present:f.minimum_attendance_percent?(f.justified_absence_counts_as_present==='true'):null,recovery_mode:f.recovery_mode,concept_scale:f.method==='concept'?f.concept_scale.split(/[,;]+/).map(x=>x.trim()).filter(Boolean):[],required_opinion:f.required_opinion,version:f.version};const saved=await PigeAPI.request<Row>(base()+'/diaries/'+state.selected!.id+'/assessment-rules/'+f.period_id,{method:'PUT',body:JSON.stringify(body)});state.assessmentRules=state.assessmentRules.filter(x=>x.academic_period_id!==f.period_id).concat(saved);selectRulePeriod(f.period_id);state.notice='Regra salva. Consolide o período para atualizar os resultados.';});}
    async function loadPeriodResults(){if(!state.selected||!state.assessmentRuleForm.period_id)return;await run(async()=>{const r=await PigeAPI.request<{items:Row[]}>(base()+'/diaries/'+state.selected!.id+'/periods/'+state.assessmentRuleForm.period_id+'/results');state.periodResults=r.items;});}
    async function consolidatePeriod(){if(!state.selected||!state.assessmentRuleForm.period_id)return;await run(async()=>{const r=await PigeAPI.post<{results:Row[];pending:number}>(base()+'/diaries/'+state.selected!.id+'/periods/'+state.assessmentRuleForm.period_id+'/consolidate',{version:state.selected!.version});state.periodResults=r.results;state.notice='Período consolidado. '+r.pending+' resultado(s) pendente(s).';await loadBase();});}
    async function saveOccurrence(){if(!state.selected)return;await run(async()=>{const f=state.occurrenceForm;await PigeAPI.post(base()+'/diaries/'+state.selected!.id+'/occurrences',{...f,academic_period_id:f.academic_period_id||null});state.occurrences=await PigeAPI.request<Row[]>(base()+'/diaries/'+state.selected!.id+'/occurrences');state.occurrenceForm={academic_period_id:f.academic_period_id,enrollment_id:'',occurrence_date:today(),kind:'pedagogical',title:'',description:'',status:'draft'};state.notice='Ocorrência registrada no Diário.';});}
    async function loadCommunicationRecipients(){if(!state.selected||!state.communicationForm.enrollment_id){state.communicationRecipients=[];state.communicationForm.recipient_guardian_link_ids=[];return;}const query='?enrollment_id='+encodeURIComponent(state.communicationForm.enrollment_id);state.communicationRecipients=await PigeAPI.request<CommunicationRecipient[]>(base()+'/diaries/'+state.selected.id+'/communication-recipients'+query);state.communicationForm.recipient_guardian_link_ids=[];}
    function communicationOccurrenceChanged(){const occurrence=state.occurrences.find(x=>x.id===state.communicationForm.occurrence_id);if(occurrence?.academic_period_id)state.communicationForm.academic_period_id=str(occurrence.academic_period_id);}
    async function sendCommunication(){if(!state.selected)return;await run(async()=>{const f=state.communicationForm;const result=await PigeAPI.post<{created:number;messages:Row[];channel:string}>(base()+'/diaries/'+state.selected!.id+'/communications',{...f,academic_period_id:f.academic_period_id||null,occurrence_id:f.occurrence_id||null});state.communications=await PigeAPI.request<Row[]>(base()+'/diaries/'+state.selected!.id+'/communications');state.communicationForm={...f,occurrence_id:'',recipient_guardian_link_ids:[],title:'',message:'',client_key:PigeOnline.newId()};state.communicationRecipients=[];state.notice=result.created?'Comunicado disponibilizado no portal para '+result.created+' conta(s).':'Esta operação já havia sido processada; nenhum comunicado duplicado foi criado.';});}
    async function createPeriod(){await run(async()=>{await PigeAPI.post(base()+'/academic-periods',state.periodForm);state.periodForm={academic_year_id:state.periodForm.academic_year_id,name:'',starts_on:'',ends_on:'',order_index:state.periodForm.order_index+1,active:true};await loadBase();state.notice='Período letivo criado.';});}
    async function createComponent(){await run(async()=>{await PigeAPI.post(base()+'/curriculum-components',state.componentForm);state.componentForm={name:'',code:'',workload_hours:0,active:true};await loadBase();state.notice='Componente curricular criado.';});}
    async function createDiary(){await run(async()=>{const body={...state.diaryForm,teacher_assignment_id:state.diaryForm.teacher_assignment_id||null};const d=await PigeAPI.post<Diary>(base()+'/diaries',body);state.diaryForm={class_group_id:'',component_id:'',teacher_assignment_id:'',notes:''};await loadBase();await loadDiary(d);if(pilot){navigatePage('diaries',false);syncLink();}else state.tab='diaries';state.notice='Diário aberto.';});}
    async function createPlan(){if(!state.selected)return;await run(async()=>{const f=state.planForm;await PigeAPI.post(base()+'/curriculum-plans',{...f,academic_period_id:f.academic_period_id||null,teacher_assignment_id:f.teacher_assignment_id||null,bncc_references:f.bncc_references.split(/[\s,;]+/).map(x=>x.trim()).filter(Boolean)});state.plans=await PigeAPI.request<Row[]>(base()+'/curriculum-plans?class_group_id='+encodeURIComponent(state.selected!.class_group_id)+'&component_id='+encodeURIComponent(state.selected!.component_id));state.notice='Planejamento registrado.';});}
    async function createLesson(){if(!state.selected)return;await run(async()=>{await PigeAPI.post(base()+'/diaries/'+state.selected!.id+'/lessons',{...state.lessonForm,academic_period_id:state.lessonForm.academic_period_id||null});state.lessonForm={academic_period_id:state.lessonForm.academic_period_id,lesson_date:today(),lesson_count:1,content:'',skills:'',methodology:'',activities:'',homework:'',notes:''};await loadDiary(state.selected!);state.notice='Aula registrada.';});}
    async function openAttendance(lesson:Lesson){if(!state.selected)return;await run(async()=>{const result=await PigeAPI.request<{lesson:Lesson;roster:Roster[]}>(base()+'/diaries/'+state.selected!.id+'/lessons/'+lesson.id+'/attendance');state.selectedLesson=result.lesson;state.attendance=result.roster.map(r=>({...r,attendance:r.attendance||{status:'present',note:''}}));});}
    async function saveAttendance(){if(!state.selected||!state.selectedLesson)return;await run(async()=>{await PigeAPI.request(base()+'/diaries/'+state.selected!.id+'/lessons/'+state.selectedLesson!.id+'/attendance',{method:'PUT',body:JSON.stringify({items:state.attendance.map(r=>({enrollment_id:r.enrollment_id,status:r.attendance?.status||'present',note:r.attendance?.note||'',version:r.attendance?.version??null}))})});state.notice='Chamada salva.';await loadDiary(state.selected!);});}
    function editAssessment(assessment:Row){
      state.assessmentEditing=assessment;
      state.assessmentForm={academic_period_id:str(assessment.academic_period_id),title:str(assessment.title),kind:str(assessment.kind),assessment_date:str(assessment.assessment_date),value_type:str(assessment.value_type),max_score:str(assessment.max_score),weight:str(assessment.weight),description:str(assessment.description),skills:str(assessment.skills),status:str(assessment.status)};
      state.tab='assessments';
    }
    function cancelAssessmentEdit(){
      state.assessmentEditing=null;
      state.assessmentForm={academic_period_id:state.assessmentForm.academic_period_id,title:'',kind:'activity',assessment_date:today(),value_type:'numeric',max_score:'10',weight:'1',description:'',skills:'',status:'published'};
    }
    async function createAssessment(){
      if(!state.selected)return;
      await run(async()=>{
        const f=state.assessmentForm;
        const body={...f,academic_period_id:f.academic_period_id||null,max_score:f.value_type==='numeric'?(f.max_score||null):null,weight:f.weight||null};
        const path=base()+'/diaries/'+state.selected!.id+'/assessments';
        const editing=state.assessmentEditing;
        if(editing)await PigeAPI.request(path+'/'+editing.id,{method:'PATCH',body:JSON.stringify({...body,version:editing.version})});
        else await PigeAPI.post(path,body);
        cancelAssessmentEdit();
        state.assessments=await PigeAPI.request<Row[]>(path);
        state.notice=editing?'Avaliação atualizada. Consolide o período para atualizar o boletim.':'Avaliação criada.';
      });
    }
    async function openAssessment(a:Row){if(!state.selected)return;await run(async()=>{const result=await PigeAPI.request<{instrument:Row;roster:(Roster&{result?:AssessmentResult|null})[]}>(base()+'/diaries/'+state.selected!.id+'/assessments/'+a.id+'/results');state.selectedAssessment=result.instrument;state.assessmentRoster=result.roster.map(r=>({...r,result:r.result||{numeric_score:null,concept:'',note:''}}));});}
    async function saveAssessmentResults(){
      if(!state.selected||!state.selectedAssessment)return;
      await run(async()=>{
        const numeric=state.selectedAssessment!.value_type==='numeric';
        const filled=(r:Roster&{result?:AssessmentResult|null})=>numeric?r.result?.numeric_score!==null&&r.result?.numeric_score!==undefined&&str(r.result.numeric_score).trim()!=='':Boolean(str(r.result?.concept).trim());
        if(state.assessmentRoster.some(r=>r.result?.id&&!filled(r)))throw new Error('Para corrigir uma nota já salva, informe o novo resultado.');
        const rows=state.assessmentRoster.filter(filled);
        if(!rows.length)throw new Error('Informe ao menos uma nota ou conceito para salvar.');
        const assessment=state.selectedAssessment!;
        await PigeAPI.request(base()+'/diaries/'+state.selected!.id+'/assessments/'+assessment.id+'/results',{method:'PUT',body:JSON.stringify({items:rows.map(r=>({enrollment_id:r.enrollment_id,numeric_score:numeric?r.result!.numeric_score:null,concept:numeric?'':str(r.result?.concept).trim(),note:str(r.result?.note),version:r.result?.version??null}))})});
        await loadDiary(state.selected!);
        state.notice=rows.length+' resultado(s) salvo(s).';
      });
    }
    async function saveOpinion(){if(!state.selected)return;await run(async()=>{await PigeAPI.post(base()+'/diaries/'+state.selected!.id+'/opinions',{...state.opinionForm,academic_period_id:state.opinionForm.academic_period_id||null});state.opinionForm={academic_period_id:state.opinionForm.academic_period_id,enrollment_id:'',text:'',status:'draft'};state.opinions=await PigeAPI.request<Row[]>(base()+'/diaries/'+state.selected!.id+'/opinions');state.notice='Parecer salvo.';});}
    async function createPedagogicalRecord(){if(!state.selected)return;await run(async()=>{await PigeAPI.post(base()+'/diaries/'+state.selected!.id+'/pedagogical-records',state.pedagogicalForm);state.pedagogicalForm={enrollment_id:'',record_date:today(),kind:'observation',text:''};state.pedagogicalRecords=await PigeAPI.request<Row[]>(base()+'/diaries/'+state.selected!.id+'/pedagogical-records');state.notice='Registro pedagógico incluído.';});}
    async function submitDiary(){if(!state.selected)return;await run(async()=>{await PigeAPI.post(base()+'/diaries/'+state.selected!.id+'/submit',{version:state.selected!.version});await loadDiary(state.selected!);state.notice='Diário enviado para revisão.';});}
    async function reviewDiary(){if(!state.selected)return;await run(async()=>{await PigeAPI.post(base()+'/diaries/'+state.selected!.id+'/review',{version:state.selected!.version});await loadDiary(state.selected!);state.notice='Diário marcado como revisado.';});}
    async function closeDiary(){if(!state.selected)return;await run(async()=>{const period=Boolean(state.closePeriod);await PigeAPI.post(base()+'/diaries/'+state.selected!.id+'/close',{academic_period_id:state.closePeriod||null,reason:state.closeReason,version:state.selected!.version});await loadDiary(state.selected!);state.notice=period?'Período fechado.':'Diário fechado.';});}
    async function reopenDiary(){if(!state.selected)return;await run(async()=>{await PigeAPI.post(base()+'/diaries/'+state.selected!.id+'/reopen',{reason:state.reopenReason,version:state.selected!.version});state.reopenReason='';await loadDiary(state.selected!);state.notice='Diário reaberto com registro de retificação.';});}
    async function publishMaterial(){if(!state.selected)return;await run(async()=>{
      const path=base()+'/diaries/'+state.selected!.id+'/materials',draft=state.materialForm;
      await PigeAPI.post(path,{...draft,enrollment_id:draft.enrollment_id||null});
      state.materials=await PigeAPI.request<Row[]>(path);
      state.materialForm={client_key:PigeOnline.newId(),kind:'Atividade',title:'',body:'',enrollment_id:''};
      state.notice='Material publicado no portal do aluno e do responsável.';
    });}
    async function printMaterial(id:string){if(state.selected)await run(()=>PigeAPI.download(base()+'/diaries/'+state.selected!.id+'/materials/'+id+'/print.pdf','material-escolar.pdf'));}
    async function report(){if(state.selected)await run(()=>{const q=new URLSearchParams();if(state.reportPeriod)q.set('academic_period_id',state.reportPeriod);if(state.reportType==='student_record'&&state.reportEnrollment)q.set('enrollment_id',state.reportEnrollment);const query=q.toString();return PigeAPI.download(base()+'/diaries/'+state.selected!.id+'/reports/'+state.reportType+'.pdf'+(query?'?'+query:''),'diario-'+state.reportType+'.pdf');});}
    let handled:Props['requestedDiary'];
    function openRequestedDiary():void {
      const request=props.requestedDiary;
      if(!request||handled===request||state.busy)return;
      const diary=state.diaries.find(item=>item.id===request.id);
      if(!diary)return;
      handled=request;
      if(pilot){navigatePage(request.tab||'diaries',false);syncLink();}else state.tab=request.tab||'diaries';
      if(state.selected?.id!==diary.id)void selectDiary(diary);
    }
    Vue.watch(()=>props.requestedDiary,openRequestedDiary);
    Vue.watch(()=>state.busy,openRequestedDiary);
    Vue.onMounted(async()=>{
      if(pilot)window.addEventListener('beforeunload',beforeUnload);
      await load();
      if(pilot && state.page==='catalog')await run(catalogList);
      if(props.requestedDiary){openRequestedDiary();return;}
      if(pilot && (!props.teacherPortal || location.hash==='#diario')){
        const diary=state.diaries.find(item=>item.id===initial.get('diario'));
        if(diary){
          await selectDiary(diary);
          const period=initial.get('periodo');
          if(period && state.periods.some(p=>p.id===period && p.academic_year_id===diary.academic_year_id)){
            state.lessonPeriod=period;syncLink();
          }
        }
        else syncLink();
      }
    });
    Vue.onUnmounted(()=>{if(pilot)window.removeEventListener('beforeunload',beforeUnload);});
    return{props,state,pilot,catalog,catalogImpact,suggest,decide,lessons,filterPeriod,save,navigation,activeGroup,filteredDiaries,pageLink,go,show,chooseAnother,markDraft,publishMaterial,printMaterial,can,str,date,label,load,selectDiary,loadCommunicationRecipients,communicationOccurrenceChanged,sendCommunication,createPeriod,createComponent,createDiary,createPlan,createLesson,openAttendance,saveAttendance,createAssessment,editAssessment,cancelAssessmentEdit,openAssessment,saveAssessmentResults,saveOpinion,createPedagogicalRecord,submitDiary,reviewDiary,closeDiary,reopenDiary,report,selectRulePeriod,saveAssessmentRule,loadPeriodResults,consolidatePeriod,saveOccurrence};
  }};
}
