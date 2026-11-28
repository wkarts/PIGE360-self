namespace PigeDiary {
  type Row=PigeAPI.Row;
  type Diary=Row&{class_group_id:string;academic_year_id:string;component_id:string;teacher_assignment_id?:string|null;version:number;status:string;class_name:string;component_name:string;year_name:string;teacher_name:string;lessons?:Lesson[];roster?:Roster[]};
  type Lesson=Row&{lesson_date:string;lesson_count:number;content:string;academic_period_id?:string|null;skills:string;methodology:string;activities:string;homework:string;notes:string};
  type Roster={enrollment_id:string;student_id:string;number:string;name:string;enrollment_status:string;attendance?:{id?:string;version?:number;status:string;note:string}|null};
  type EntryScope='lesson'|'plan';
  type EntryField={id:string;label:string;scope:EntryScope};
  type EntrySettings={version:number;fields:EntryField[];standard_columns:Record<string,string>;standard_labels?:Record<string,string>};
  type StoredField={id:string;label:string;value:string;column?:string};
  const emptyLesson=()=>({academic_period_id:'',lesson_date:today(),lesson_count:1,content:'',skills:'',methodology:'',activities:'',homework:'',notes:''});
  const emptyPlan=(d?:Diary|null)=>({class_group_id:d?.class_group_id||'',component_id:d?.component_id||'',academic_period_id:'',teacher_assignment_id:d?.teacher_assignment_id||'',objectives:'',thematic_units:'',knowledge_objects:'',bncc_references:'',methodology:'',resources:'',assessment_strategy:'',notes:'',status:'draft'});
  type AssessmentResult={id?:string;version?:number;numeric_score:string|number|null;concept:string;note:string};
  type CommunicationRecipient={guardian_link_id:string;name:string;relationship:string;portal_account_count:number};
  type Props={schoolId:string;schoolName?:string;catalogEnabled?:boolean;permissions:string[];teacherPortal?:boolean;allowMaterials?:boolean;requestedDiary?:{id:string;tab?:string;discardApproved?:boolean}};
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
  export const component={props:['schoolId','schoolName','catalogEnabled','permissions','teacherPortal','allowMaterials','requestedDiary'],render:PigeRenders.diary,setup(props:Props){
    const state=Vue.reactive({
      busy:false,error:'',notice:'',tab:'diaries',page:'diaries',diaryFilter:'',lessonPeriod:'',dirty:false,
      diaries:[] as Diary[],selected:null as Diary|null,academicYears:[] as Row[],periods:[] as Row[],components:[] as Row[],groups:[] as Row[],assignments:[] as Row[],plans:[] as Row[],
      calendarIds:[] as string[],periodForm:{academic_year_id:'',class_group_id:'',name:'',starts_on:'',ends_on:'',order_index:1,active:true},
      fields:{version:0,fields:[],standard_columns:{}} as EntrySettings,configFields:[] as EntryField[],configVersion:0,newFieldLabel:'',restoreFieldId:'',newFieldScope:'lesson' as EntryScope,
      componentEditing:null as Row|null,
      lessonEditing:null as Row|null,planEditing:null as Row|null,lessonValues:{} as Record<string,string>,planValues:{} as Record<string,string>,
      attendanceBase:{} as Record<string,{status:string;note:string}>,
      componentForm:{name:'',code:'',workload_hours:0,active:true},
      diaryForm:{class_group_id:'',component_id:'',teacher_assignment_id:'',notes:''},
      teacherSearch:'',teacherPersonId:'',teacherResults:[] as PigeAPI.TeacherProfile[],teacherSearched:false,
      planForm:emptyPlan(),lessonForm:emptyLesson(),
      selectedLesson:null as Lesson|null,attendance:[] as Roster[],
      assessments:[] as Row[],assessmentEditing:null as Row|null,selectedAssessment:null as Row|null,assessmentBaseline:'',assessmentRoster:[] as (Roster&{result?:AssessmentResult|null})[],
      assessmentForm:{academic_period_id:'',title:'',kind:'activity',assessment_date:today(),value_type:'numeric',max_score:'10',weight:'1',description:'',skills:'',status:'published'},
      opinions:[] as Row[],opinionForm:{academic_period_id:'',enrollment_id:'',text:'',status:'draft'},
      pedagogicalRecords:[] as Row[],pedagogicalForm:{enrollment_id:'',record_date:today(),kind:'observation',text:''},
      closePeriod:'',closeReason:'Fechamento pedagógico conferido.',reopenReason:'',reopenPeriod:'',
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
      reportFrom:'',reportTo:'',reportType:'class_diary',reportPeriod:'',reportEnrollment:''
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
    async function decide(action:'retire'|'publish'|'discard'){
      const impact=catalog.impact;
      if(!impact || catalog.reason.trim().length<3)return;
      const verbs={retire:'Desativar',publish:'Publicar',discard:'Descartar'};
      const reason=catalog.reason, school=props.schoolId;
      if(!await PigeDialogs.confirm(verbs[action]+' este componente curricular?',{
        title:'Componente curricular',confirmLabel:verbs[action]+' componente',destructive:action!=='publish'
      }))return;
      if(!active || props.schoolId!==school || catalog.impact!==impact || catalog.reason!==reason)return;
      return run(async()=>{
        await PigeAPI.post(base()+'/diary-catalog/'+impact.id+'/decisions',{action,version:impact.version,reason});
        catalog.impact=null;catalog.target='';catalog.reason='';await loadBase();await catalogList();
        state.notice='Decisão registrada no histórico do componente.';
      });
    }
    const initial=new URLSearchParams(location.search);
    const pilot=props.catalogEnabled===true || pilotForSchool(props.schoolId);
    const materialsAllowed=()=>!props.teacherPortal || props.allowMaterials!==false;
    const navigation=Vue.computed(()=>groups.map(group=>({...group,pages:group.pages.filter(
      page=>(page.id!=='materials' || materialsAllowed()) && (!page.permission || can(page.permission)) && (page.id!=='catalog' || props.catalogEnabled===true)
    )})).filter(group=>group.pages.length));
    const activeGroup=Vue.computed(()=>navigation.value.find(group=>group.pages.some(page=>page.id===state.page)));
    const filteredDiaries=Vue.computed(()=>{
      const term=state.diaryFilter.trim().toLocaleLowerCase('pt-BR');
      return state.diaries.filter(d=>[d.year_name,d.class_name,d.component_name,d.teacher_name].join(' ').toLocaleLowerCase('pt-BR').includes(term));
    });
    const lessons=Vue.computed(()=>(state.selected?.lessons||[]).filter(
      lesson=>!pilot || !state.lessonPeriod || lesson.academic_period_id===state.lessonPeriod));
    async function filterPeriod(event:Event){
      const select=event.target as HTMLSelectElement;
      const next=select.value;
      select.value=state.lessonPeriod;
      if(workspaceDirty.value && !await confirmLeave())return;
      state.lessonPeriod=next;select.value=next;
      state.selectedLesson=null;
      syncLink();
    }
    function pageLink(page:string){
      const url=new URL(location.href);
      url.searchParams.set('diarioPiloto',props.schoolId);
      url.searchParams.set('guia',page);
      if(state.lessonPeriod)url.searchParams.set('periodo',state.lessonPeriod);
      else url.searchParams.delete('periodo');
      if(state.selected)url.searchParams.set('diario',String(state.selected.id));
      else url.searchParams.delete('diario');
      url.hash=props.teacherPortal?'diario':'/diary';
      return url.pathname+url.search+url.hash;
    }
    function syncLink(){if(pilot)history.replaceState(history.state,'',pageLink(state.page));}
    let active=true;
    async function confirmLeave(){
      const selected=state.selected, page=state.page, school=props.schoolId;
      const accepted=await PigeDialogs.confirm('Há alterações ainda não salvas no diário. Deseja continuar?',{
        title:'Sair da edição do diário?',confirmLabel:'Continuar',cancelLabel:'Voltar à edição'
      });
      return accepted && active && props.schoolId===school && state.selected===selected && page===state.page;
    }
    function navigatePage(id:string){
      const page=navigation.value.flatMap(group=>group.pages).find(item=>item.id===id);
      if(!page)return false;
      state.page=page.id;state.tab=page.tab;
      return true;
    }
    async function go(id:string){
      if(id!==state.page && workspaceDirty.value && !await confirmLeave())return;
      if(navigatePage(id)){
        syncLink();if(id==='catalog')void run(catalogList);
      }
    }
    function show(...pages:string[]){return !pilot || pages.includes(state.page);}
    const draftPages=new Set<string>();
    const tracksDrafts=pilot || props.teacherPortal===true;
    const draftSection=()=>pilot?state.page:state.tab;
    async function save(action:()=>Promise<void>){
      if(state.busy)return;
      const page=draftSection();
      await action();
      if(!state.error && state.notice){draftPages.delete(page);state.dirty=draftPages.size>0;}
    }
    function markDraft(event:Event){
      if(tracksDrafts && (event.target as Element).closest('form,.x-form,td')){
        draftPages.add(draftSection());state.dirty=true;
      }
    }
    async function chooseAnother(){
      if(workspaceDirty.value && !await confirmLeave())return;
      draftPages.clear();state.dirty=false;state.lessonPeriod='';state.selected=null;state.selectedLesson=null;syncLink();
    }
    if(pilot && !navigatePage(initial.get('guia')||'dashboard'))navigatePage('dashboard');
    const str=(v:unknown)=>v==null?'':String(v);
    const date=(v:unknown)=>{const x=str(v);return x?new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC'}).format(new Date(x.length===10?x+'T12:00:00Z':x)):'—';};
    const labels:Record<string,string>={archived:'Arquivado',open:'Aberto',draft:'Rascunho',submitted:'Enviado',reviewed:'Revisado',closed:'Fechado',present:'Presente',absent:'Falta',justified_absence:'Falta justificada',active:'Ativo',suspended:'Suspenso',published:'Publicada',final:'Final',pending:'Pendente',calculated:'Calculado',below_minimum:'Abaixo da média',attendance_below_minimum:'Frequência abaixo do mínimo',opinion_pending:'Parecer pendente',concept:'Conceito',follow_up:'Acompanhamento',intervention:'Intervenção',recovery:'Recuperação',adaptation:'Adaptação',referral:'Encaminhamento',observation:'Observação',positive:'Positiva',pedagogical:'Pedagógica',behavioral:'Comportamental',safety:'Segurança',other:'Outra',resultados_avaliativos_pendentes:'Há notas pendentes',sem_resultado_aplicavel:'Sem resultado aplicável',chamada_pendente:'Chamada pendente',conceito_fora_da_escala:'Conceito fora da escala',peso_avaliativo_ausente:'Peso não definido',resultado_numerico_ausente:'Nota não informada',frequencia_abaixo_do_limite:'Frequência abaixo do mínimo',parecer_final_pendente:'Parecer final pendente'};
    const label=(v:unknown)=>labels[str(v)]||str(v)||'—';
    async function run(action:()=>Promise<void>){if(state.busy)return;state.busy=true;state.error='';state.notice='';try{await action();}catch(e){state.error=e instanceof Error?e.message:String(e);}finally{state.busy=false;}}
    async function loadBase(){const results=await Promise.all([
      PigeAPI.request<Diary[]>(base()+'/diaries'),
      PigeAPI.request<Row[]>(base()+'/academic-periods'),
      PigeAPI.request<Row[]>(base()+'/curriculum-components'),
      can('diary.configure')?PigeAPI.request<Row[]>(base()+'/academic-years'):Promise.resolve([] as Row[]),
      can('diary.configure')?PigeAPI.request<Row[]>(base()+'/class-groups'):Promise.resolve([] as Row[]),
      can('diary.configure') && can('staff.assignments.read')?PigeAPI.request<Row[]>(base()+'/teacher-assignments'):Promise.resolve([] as Row[]),
      PigeAPI.request<any>(base()+'/diary-dashboard'),
      PigeAPI.request<EntrySettings>(base()+'/diary-entry-fields')
    ]);state.diaries=results[0] as Diary[];state.periods=results[1] as Row[];state.components=results[2] as Row[];state.academicYears=results[3] as Row[];state.groups=results[4] as Row[];state.assignments=results[5] as Row[];state.dashboard=results[6] as {items:Row[];totals:Row};
      const current=results[7] as EntrySettings;
      if(compositionDirty.value)state.fields=current;else setComposition(current);
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
        PigeAPI.request<Row[]>(endpoint+'/pedagogical-records'),PigeAPI.request<Row[]>(endpoint+'/communications'),
        materialsAllowed()?PigeAPI.request<Row[]>(endpoint+'/materials'):Promise.resolve([] as Row[])
      ]);
      const changed=state.selected?.id!==d.id;
      state.reopenPeriod='';state.selected=selected;state.summary=summary;state.history=history;state.plans=plans;
      state.assessments=assessments;state.assessmentRules=rules;state.occurrences=occurrences;
      state.opinions=opinions;state.pedagogicalRecords=records;state.communications=communications;
      state.selectedLesson=null;state.attendance=[];state.assessmentEditing=null;state.selectedAssessment=null;state.assessmentRoster=[];state.periodResults=[];
      state.materials=materials;
      if(changed){
        state.materialForm={client_key:PigeOnline.newId(),kind:'Atividade',title:'',body:'',enrollment_id:''};
        resetPlan();resetLesson();
        state.assessmentForm={academic_period_id:'',title:'',kind:'activity',assessment_date:today(),value_type:'numeric',max_score:'10',weight:'1',description:'',skills:'',status:'published'};
        state.opinionForm={academic_period_id:'',enrollment_id:'',text:'',status:'draft'};
        state.pedagogicalForm={enrollment_id:'',record_date:today(),kind:'observation',text:''};
        state.reportPeriod='';state.reportEnrollment='';state.closePeriod='';
      }
      state.occurrenceForm={academic_period_id:'',enrollment_id:'',occurrence_date:today(),kind:'pedagogical',title:'',description:'',status:'draft'};
      const firstPeriod=periodsFor(d)[0];
      selectRulePeriod(firstPeriod?str(firstPeriod.id):'');
      state.communicationRecipients=[];
      state.communicationForm={enrollment_id:'',academic_period_id:'',occurrence_id:'',recipient_guardian_link_ids:[],title:'',message:'',client_key:PigeOnline.newId()};
    }
    async function selectDiary(d:Diary,discardApproved=false){
      if(state.selected?.id!==d.id && discardApproved!==true && workspaceDirty.value && !await confirmLeave())return;
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
    function periodsFor(d:Diary){const group=state.groups.find(g=>g.id===d.class_group_id);
      const ids=group?.academic_period_ids||d.academic_period_ids;
      return state.periods.filter(p=>p.academic_year_id===d.academic_year_id && (Array.isArray(ids)&&ids.length?ids.includes(p.id):!p.class_calendar_only));}
    function loadCalendar(){const group=state.groups.find(g=>g.id===state.periodForm.class_group_id);
      state.calendarIds=Array.isArray(group?.academic_period_ids)&&group.academic_period_ids.length?[...group.academic_period_ids]:
        state.periods.filter(p=>p.academic_year_id===state.periodForm.academic_year_id && !p.class_calendar_only).map(p=>p.id);}
    async function saveCalendar(){await run(async()=>{const group=state.groups.find(g=>g.id===state.periodForm.class_group_id);
      if(!group)return;await PigeAPI.request(base()+'/class-groups/'+group.id+'/calendar',{method:'PUT',body:JSON.stringify({period_ids:state.calendarIds,version:group.version})});
      await loadBase();loadCalendar();state.notice='Calendário da turma atualizado.';});}
    async function createPeriod(){await run(async()=>{await PigeAPI.post(base()+'/academic-periods',state.periodForm);state.periodForm={class_group_id:state.periodForm.class_group_id,academic_year_id:state.periodForm.academic_year_id,name:'',starts_on:'',ends_on:'',order_index:state.periodForm.order_index+1,active:true};await loadBase();loadCalendar();state.notice='Período letivo criado.';});}
    const compositionDirty=Vue.computed(()=>JSON.stringify(state.configFields)!==JSON.stringify(state.fields.fields));
    function setComposition(settings:EntrySettings){
      state.fields=settings;state.configVersion=settings.version;
      state.configFields=settings.fields.map(field=>({...field}));
    }
    const restorableFields=Vue.computed(()=>Object.keys(state.fields.standard_columns).filter(
      id=>!state.configFields.some(field=>field.id===id)));
    function restoreField(){
      const id=state.restoreFieldId;
      if(!restorableFields.value.includes(id) || state.configFields.length>=40)return;
      state.configFields.push({id,scope:id.startsWith('standard-plan-')?'plan':'lesson',label:state.fields.standard_labels?.[id]||''});
      state.restoreFieldId='';
    }
    function addField(){
      const label=state.newFieldLabel.trim();
      if(label.length<2 || state.configFields.length>=40)return;
      state.configFields.push({id:PigeOnline.newId(),label,scope:state.newFieldScope});
      state.newFieldLabel='';
    }
    function moveField(index:number,offset:number){
      const target=index+offset;
      if(target<0 || target>=state.configFields.length)return;
      const [field]=state.configFields.splice(index,1);
      state.configFields.splice(target,0,field);
    }
    async function saveFields(){await run(async()=>{
      const result=await PigeAPI.request<EntrySettings>(base()+'/diary-entry-fields',{method:'PUT',
        body:JSON.stringify({version:state.configVersion,fields:state.configFields})});
      setComposition(result);state.notice='Composição atualizada para esta escola.';
    });}
    function resetComponent(){
      state.componentEditing=null;state.componentForm={name:'',code:'',workload_hours:0,active:true};
    }
    function editComponent(row:Row){
      state.componentEditing=row;state.componentForm={name:str(row.name),code:str(row.code),workload_hours:Number(row.workload_hours),active:Boolean(row.active)};
      focusHeading('diary-component-heading');
    }
    async function createComponent(){await run(async()=>{
      const endpoint=base()+'/curriculum-components', editing=state.componentEditing;
      if(editing)await PigeAPI.request(endpoint+'/'+editing.id,{method:'PATCH',body:JSON.stringify({...state.componentForm,version:editing.version})});
      else await PigeAPI.post(endpoint,state.componentForm);
      resetComponent();await loadBase();state.notice=editing?'Componente curricular atualizado.':'Componente curricular criado.';
    });}
    async function removeComponent(row:Row){
      if(state.busy||!can('diary.configure'))return;
      const school=props.schoolId,version=row.version;
      const reason=await PigeDialogs.prompt('Componentes com registros serão desativados. Componentes sem vínculos serão excluídos.',{
        title:'Retirar '+row.name+'?',inputLabel:'Justificativa',minLength:3,maxLength:1000,
        confirmLabel:'Confirmar retirada',destructive:true
      });
      if(reason===null||!active||props.schoolId!==school||!can('diary.configure')||!state.components.some(item=>item.id===row.id&&item.version===version))return;
      await run(async()=>{
        const result=await PigeAPI.post<{action:string}>(base()+'/curriculum-components/'+row.id+'/remove',{version,reason});
        if(state.componentEditing?.id===row.id)resetComponent();
        await loadBase();
        state.notice=result.action==='retired'?'Componente desativado. Os vínculos históricos foram preservados.':'Componente sem vínculos removido.';
      });
    }
    const existingDiary=Vue.computed(()=>state.diaries.find(row=>row.class_group_id===state.diaryForm.class_group_id && row.component_id===state.diaryForm.component_id));
    const selectedComponent=Vue.computed(()=>state.components.find(row=>row.id===state.diaryForm.component_id));
    const matchingAssignments=Vue.computed(()=>{
      const subject=str(selectedComponent.value?.name).trim().toLocaleLowerCase('pt-BR');
      if(!subject)return [];
      return state.assignments.filter(row=>row.active && row.class_group_id===state.diaryForm.class_group_id &&
        (!str(row.subject_name).trim() || str(row.subject_name).trim().toLocaleLowerCase('pt-BR')===subject));
    });
    function resetTeacherSearch(){
      state.teacherPersonId='';state.teacherResults=[];state.teacherSearched=false;
    }
    function syncDiaryAssignment(){
      state.diaryForm.teacher_assignment_id=existingDiary.value?.teacher_assignment_id||'';
      state.teacherSearch='';resetTeacherSearch();
    }
    async function configureTeacher(d:Diary){
      if(pilot){await go('new-diary');if(state.page!=='new-diary')return;}else state.tab='setup';
      state.diaryForm.class_group_id=d.class_group_id;state.diaryForm.component_id=d.component_id;
      syncDiaryAssignment();focusHeading('diary-assignment-heading');
    }
    async function searchTeachers(){
      const term=state.teacherSearch.trim();
      if(term.length<2)return;
      await run(async()=>{
        resetTeacherSearch();
        const result=await PigeAPI.request<PigeAPI.Page<PigeAPI.TeacherProfile>>(base()+'/teachers?q='+encodeURIComponent(term)+'&page_size=30');
        if(state.teacherSearch.trim()===term){
          state.teacherResults=result.items.filter(row=>row.person.active);
          state.teacherSearched=true;
        }
      });
    }
    async function createDiary(){await run(async()=>{
      const current=existingDiary.value;
      const form=state.diaryForm;
      let assignment=form.teacher_assignment_id||null;
      if(state.teacherPersonId && selectedComponent.value){
        const row=await PigeAPI.post<Row>(base()+'/teacher-assignments',{teacher_person_id:state.teacherPersonId,
          class_group_id:form.class_group_id,subject_name:str(selectedComponent.value.name),active:true});
        if(!state.assignments.some(item=>item.id===row.id))state.assignments.push(row);
        assignment=row.id;form.teacher_assignment_id=row.id;resetTeacherSearch();
      }
      let diary:Diary;
      if(current){
        diary=await PigeAPI.request<Diary>(base()+'/diaries/'+current.id+'/teacher-assignment',
          {method:'PUT',body:JSON.stringify({version:current.version,teacher_assignment_id:assignment})});
      }else{
        diary=await PigeAPI.post<Diary>(base()+'/diaries',{...form,teacher_assignment_id:assignment});
      }
      state.diaryForm={class_group_id:'',component_id:'',teacher_assignment_id:'',notes:''};
      state.teacherSearch='';resetTeacherSearch();
      await loadBase();await loadDiary(diary);
      if(pilot){navigatePage('diaries');syncLink();}else state.tab='diaries';
      state.notice=current?'Vínculo docente do diário atualizado.':'Diário aberto.';
    });}
    function focusHeading(id:string){
      void Vue.nextTick(()=>document.getElementById?.(id)?.focus());
    }
    function storedFields(row:Row|null):StoredField[]{
      if(!row)return [];
      const fields:StoredField[]=Array.isArray(row.extra_fields)?row.extra_fields:[];
      const items=fields.map(field=>{
        const value=field.column?row[field.column]:field.value;
        return {...field,value:Array.isArray(value)?value.join(', '):str(value)};
      });
      // Documentos anteriores à migração contêm apenas as colunas nativas.
      const scope=row.lesson_date?'lesson':'plan';
      for(const [id,column] of Object.entries(state.fields.standard_columns)){
        if(!id.startsWith('standard-'+scope+'-') || items.some(field=>field.id===id) || !row[column])continue;
        const value=row[column],label=state.fields.standard_labels?.[id];
        if(label && (!Array.isArray(value) || value.length))items.push({id,column,label,value:Array.isArray(value)?value.join(', '):str(value)});
      }
      return items;
    }
    function editableValues(row:Row,scope:EntryScope){
      const active=new Set(state.fields.fields.filter(field=>field.scope===scope).map(field=>field.id));
      return Object.fromEntries(storedFields(row).filter(field=>!field.column && active.has(field.id)).map(field=>[field.id,field.value]));
    }
    function resetPlan(){
      state.planEditing=null;state.planValues={};state.planForm=emptyPlan(state.selected);
    }
    function editPlan(row:Row){
      resetPlan();state.planEditing=row;state.planValues=editableValues(row,'plan');
      for(const key of Object.keys(state.planForm) as (keyof typeof state.planForm)[]){
        state.planForm[key]=key==='bncc_references' && Array.isArray(row[key])?row[key].join(', '):str(row[key]);
      }
      focusHeading('diary-plan-heading');
    }
    async function createPlan(){if(!state.selected)return;await run(async()=>{
      const f=state.planForm,editing=state.planEditing,endpoint=base()+'/curriculum-plans';
      const body={...f,academic_period_id:f.academic_period_id||null,teacher_assignment_id:f.teacher_assignment_id||null,
        bncc_references:f.bncc_references.split(/[\s,;]+/).filter(Boolean),field_values:state.planValues};
      if(editing)await PigeAPI.request(endpoint+'/'+editing.id,{method:'PATCH',body:JSON.stringify({...body,version:editing.version})});
      else await PigeAPI.post(endpoint,body);
      state.plans=await PigeAPI.request<Row[]>(endpoint+'?class_group_id='+encodeURIComponent(f.class_group_id)+'&component_id='+encodeURIComponent(f.component_id));
      resetPlan();state.notice=editing?'Planejamento atualizado.':'Planejamento registrado.';
    });}
    function resetLesson(){state.lessonEditing=null;state.lessonValues={};state.lessonForm=emptyLesson();}
    async function editLesson(row:Lesson){
      if(pilot && state.page!=='diaries'){
        await go('diaries');
        if(state.page!=='diaries')return;
      }
      syncLink();state.lessonEditing=row;state.lessonValues=editableValues(row,'lesson');
      const {academic_period_id,lesson_date,lesson_count,content,skills,methodology,activities,homework,notes}=row;
      state.lessonForm={academic_period_id:academic_period_id||'',lesson_date,lesson_count,content,skills,methodology,activities,homework,notes};
      focusHeading('diary-lesson-heading');
    }
    async function createLesson(){if(!state.selected)return;await run(async()=>{
      const endpoint=base()+'/diaries/'+state.selected!.id+'/lessons',editing=state.lessonEditing;
      const body={...state.lessonForm,academic_period_id:state.lessonForm.academic_period_id||null,field_values:state.lessonValues};
      if(editing)await PigeAPI.request(endpoint+'/'+editing.id,{method:'PATCH',body:JSON.stringify({...body,version:editing.version})});
      else await PigeAPI.post(endpoint,body);
      const period=state.lessonForm.academic_period_id;resetLesson();state.lessonForm.academic_period_id=period;
      await loadDiary(state.selected!);state.notice=editing?'Aula atualizada.':'Aula registrada.';
    });}
    async function removeLesson(){
      const diary=state.selected,lesson=state.lessonEditing;
      if(!diary||!lesson||state.busy||diary.status!=='open'||!can('diary.write'))return;
      const school=props.schoolId,version=lesson.version;
      const reason=await PigeDialogs.prompt('Somente aulas sem chamada e sem fechamento anterior podem ser removidas.',{
        title:'Remover aula de '+date(lesson.lesson_date)+'?',inputLabel:'Justificativa',minLength:3,maxLength:1000,
        confirmLabel:'Confirmar remoção da aula',destructive:true
      });
      if(reason===null||!active||props.schoolId!==school||state.selected!==diary||diary.status!=='open'||!can('diary.write')||state.lessonEditing!==lesson||lesson.version!==version)return;
      await run(async()=>{
        await PigeAPI.post(base()+'/diaries/'+diary.id+'/lessons/'+lesson.id+'/remove',{version,reason});
        resetLesson();await loadDiary(diary);state.notice='Aula removida do diário.';
      });
    }
    function attendancePath(lesson:Lesson){return base()+'/diaries/'+state.selected!.id+'/lessons/'+lesson.id+'/attendance';}
    async function fetchAttendance(lesson:Lesson){
      const result=await PigeAPI.request<{lesson:Lesson;roster:Roster[]}>(attendancePath(lesson));
      state.selectedLesson=result.lesson;
      state.attendanceBase=Object.fromEntries(result.roster.map(r=>[r.enrollment_id,{status:r.attendance?.status||'',note:r.attendance?.note||''}]));
      state.attendance=result.roster.map(r=>({...r,attendance:r.attendance||{status:'',note:''}}));
    }
    const changedAttendance=Vue.computed(()=>state.attendance.filter(r=>{
      const previous=state.attendanceBase[r.enrollment_id],current=r.attendance;
      return current?.status && (previous?.status!==current.status || previous?.note!==current.note);
    }));
    const pendingAttendance=Vue.computed(()=>state.attendance.filter(row=>!row.attendance?.status).length);
    function markPendingPresent(){
      for(const row of state.attendance)if(row.attendance && !row.attendance.status)row.attendance.status='present';
    }
    async function confirmDiscardAttendance(){
      const lesson=state.selectedLesson, selected=state.selected;
      const accepted=await PigeDialogs.confirm('As presenças, faltas e justificativas em edição serão descartadas.',{
        title:'Descartar as alterações desta chamada?',confirmLabel:'Descartar alterações',destructive:true
      });
      return accepted && active && state.selectedLesson===lesson && state.selected===selected;
    }
    async function closeAttendance(){
      if(changedAttendance.value.length && !await confirmDiscardAttendance())return false;
      state.selectedLesson=null;state.attendance=[];state.attendanceBase={};return true;
    }
    async function openAttendance(lesson:Lesson){
      if(!state.selected || (state.selectedLesson && changedAttendance.value.length && !await confirmDiscardAttendance()))return;
      await run(async()=>{await fetchAttendance(lesson);focusHeading('diary-attendance-heading');});
    }
    async function saveAttendance(){
      const lesson=state.selectedLesson;if(!state.selected||!lesson||!changedAttendance.value.length)return;
      await run(async()=>{
        const items=changedAttendance.value.map(r=>({enrollment_id:r.enrollment_id,status:r.attendance!.status,note:r.attendance!.note,
          version:r.attendance!.version??null,expected_empty:r.attendance!.version==null}));
        await PigeAPI.request(attendancePath(lesson),{method:'PUT',body:JSON.stringify({items})});
        await fetchAttendance(lesson);
        state.summary=await PigeAPI.request<typeof state.summary>(base()+'/diaries/'+state.selected!.id+'/summary');
        state.notice=items.length+' registro(s) de frequência salvo(s).';
      });
    }
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
    function gradeValues():string {
      return JSON.stringify(state.assessmentRoster.map(({enrollment_id,result})=>
        [enrollment_id,str(result?.numeric_score),str(result?.concept),str(result?.note)]));
    }
    const workspaceDirty=Vue.computed(()=>state.dirty||compositionDirty.value||changedAttendance.value.length>0||
      Boolean(state.selectedAssessment&&gradeValues()!==state.assessmentBaseline));
    async function openAssessment(a:Row){
      if(!state.selected)return;
      await run(async()=>{
        const result=await PigeAPI.request<{instrument:Row;roster:(Roster&{result?:AssessmentResult|null})[]}>(
          base()+'/diaries/'+state.selected!.id+'/assessments/'+a.id+'/results');
        state.selectedAssessment=result.instrument;
        state.assessmentRoster=result.roster.map(r=>({...r,result:r.result||{numeric_score:null,concept:'',note:''}}));
        state.assessmentBaseline=gradeValues();
      });
    }
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
    async function resumeDiary(){
      const diary = state.selected;
      if (!diary) return;
      await run(async()=>{
        await PigeAPI.post(base()+'/diaries/'+diary.id+'/resume', {version:diary.version});
        await loadDiary(diary);
        state.notice='Lançamentos liberados nos períodos abertos.';
      });
    }
    async function reopenDiary(){if(!state.selected)return;await run(async()=>{await PigeAPI.post(base()+'/diaries/'+state.selected!.id+'/reopen',{academic_period_id:state.reopenPeriod||null,reason:state.reopenReason,version:state.selected!.version});state.reopenReason='';await loadDiary(state.selected!);state.notice='Diário reaberto com registro de retificação.';});}
    async function publishMaterial(){if(!state.selected)return;await run(async()=>{
      const path=base()+'/diaries/'+state.selected!.id+'/materials',draft=state.materialForm;
      await PigeAPI.post(path,{...draft,enrollment_id:draft.enrollment_id||null});
      state.materials=await PigeAPI.request<Row[]>(path);
      state.materialForm={client_key:PigeOnline.newId(),kind:'Atividade',title:'',body:'',enrollment_id:''};
      state.notice='Material publicado no portal do aluno e do responsável.';
    });}
    async function printMaterial(id:string){if(state.selected)await run(()=>PigeAPI.download(base()+'/diaries/'+state.selected!.id+'/materials/'+id+'/print.pdf','material-escolar.pdf'));}
    async function report(){if(state.selected)await run(()=>{const q=new URLSearchParams();if(['attendance','pedagogical_register'].includes(state.reportType)){if(state.reportFrom)q.set('date_from',state.reportFrom);if(state.reportTo)q.set('date_to',state.reportTo);}if(state.reportPeriod)q.set('academic_period_id',state.reportPeriod);if(state.reportType==='student_record'&&state.reportEnrollment)q.set('enrollment_id',state.reportEnrollment);const query=q.toString();return PigeAPI.download(base()+'/diaries/'+state.selected!.id+'/reports/'+state.reportType+'.pdf'+(query?'?'+query:''),'diario-'+state.reportType+'.pdf');});}
    let handled:Props['requestedDiary'];
    async function openRequestedDiary():Promise<void> {
      const request=props.requestedDiary;
      if(!request||handled===request||state.busy||(request.tab==='materials'&&!materialsAllowed()))return;
      const diary=state.diaries.find(item=>item.id===request.id);
      if(!diary)return;
      handled=request;
      if(state.selected?.id!==diary.id){
        await selectDiary(diary,request.discardApproved===true);
        if(!active || props.requestedDiary!==request || state.selected?.id!==diary.id)return;
      }else if(!request.discardApproved && workspaceDirty.value && state.page!==request.tab && !await confirmLeave())return;
      if(pilot){navigatePage(request.tab||'diaries');syncLink();}else state.tab=request.tab==='attendance'?'diaries':request.tab||'diaries';
      if(request.tab==='attendance')focusHeading('diary-lessons-heading');
    }
    Vue.watch(()=>props.requestedDiary,openRequestedDiary);
    Vue.watch(()=>state.busy,openRequestedDiary);
    Vue.onMounted(async()=>{
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
    Vue.onUnmounted(()=>{active=false;});
    return{props,state,workspaceDirty,existingDiary,matchingAssignments,configureTeacher,syncDiaryAssignment,resetTeacherSearch,searchTeachers,compositionDirty,setComposition,restorableFields,restoreField,addField,moveField,saveFields,editComponent,resetComponent,removeComponent,editLesson,resetLesson,removeLesson,editPlan,resetPlan,storedFields,markPendingPresent,pendingAttendance,changedAttendance,closeAttendance,periodsFor,loadCalendar,saveCalendar,pilot,catalog,catalogImpact,suggest,decide,lessons,filterPeriod,save,navigation,activeGroup,filteredDiaries,pageLink,go,show,chooseAnother,markDraft,publishMaterial,printMaterial,can,str,date,label,load,selectDiary,loadCommunicationRecipients,communicationOccurrenceChanged,sendCommunication,createPeriod,createComponent,createDiary,createPlan,createLesson,openAttendance,saveAttendance,createAssessment,editAssessment,cancelAssessmentEdit,openAssessment,saveAssessmentResults,saveOpinion,createPedagogicalRecord,submitDiary,reviewDiary,closeDiary,resumeDiary,reopenDiary,report,selectRulePeriod,saveAssessmentRule,loadPeriodResults,consolidatePeriod,saveOccurrence};
  }};
}
