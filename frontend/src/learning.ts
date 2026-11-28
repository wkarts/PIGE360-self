namespace PigeLearning {
  type Attendance = {present:number; absent:number; justified_absence:number; unrecorded:number; total:number; percentage:number|string|null};
  type CalendarPeriod = {period_id:string; period_name:string; order_index?:number; starts_on?:string};
  type Period = CalendarPeriod & {
    class_name?:string; class_group_id?:string; class_label?:string; component_name?:string; grade_display:string;
    result_status:string; result_label:string; attendance:Attendance; published:boolean; recovery?:string[]; opinions?:string[];
  };
  type Subject = {diary_id:string; component_name:string; periods:Period[]};
  type Model = 'integrated'|'panel'|'journey';
  type Enrollment = {
    enrollment_id:string; number:string; class_name:string; year_name:string; status:string; subjects:Subject[];
    grade_name?:string; stage?:string; unit?:string; shift?:string; bulletin_model?:Model; report_color?:string;
    class_calendars?:Record<string,CalendarPeriod[]>; official_editions?:{id:string;revision:number;date:string}[];
  };
  type Student = {student_id:string; student_name:string; student_number:string; school_id?:string; school_name?:string; report_logo?:string; photo?:string; report_font?:string; enrollments:Enrollment[]};
  type Props = {identity?:{logo_url?:string;display_name?:string}; request:<T>(path:string)=>Promise<T>; download:(path:string,filename:string)=>Promise<void>; rootPath?:string; schoolId?:string; studentId?:string};
  type Result = Period & {diary_id:string; component_name:string};
  type Group = {id:string; label:string; classId:string; className:string; items:Result[]};
  type ComponentRow = {id:string; name:string; results:Map<string,Result>};
  type ClassMatrix = {className:string; periods:Map<string,CalendarPeriod>; components:Map<string,ComponentRow>; published:Set<string>};

  function orderPeriod(a:CalendarPeriod,b:CalendarPeriod):number {
    return (a.order_index??0)-(b.order_index??0) || (a.starts_on||'').localeCompare(b.starts_on||'') || a.period_id.localeCompare(b.period_id);
  }

  // Um diário pertence a uma turma de origem; nomes iguais podem identificar diários distintos.
  function matrices(groups:Group[],calendars:Enrollment['class_calendars'],filtered:boolean) {
    const classes=new Map<string,ClassMatrix>();
    for(const group of groups){
      let matrix=classes.get(group.classId);
      if(!matrix){
        const periods=new Map<string,CalendarPeriod>();
        if(!filtered)for(const period of calendars?.[group.classId]||[])periods.set(period.period_id,period);
        matrix={className:group.className,periods,components:new Map(),published:new Set()};
        classes.set(group.classId,matrix);
      }
      for(const item of group.items){
        matrix.periods.set(item.period_id,item);
        matrix.published.add(item.period_id);
        const key=JSON.stringify([item.diary_id,item.component_name]);
        const component=matrix.components.get(key)||{id:key,name:item.component_name,results:new Map<string,Result>()};
        component.results.set(item.period_id,item);
        matrix.components.set(key,component);
      }
    }
    const windows=[];
    for(const [classId,matrix] of classes){
      const periods=Array.from(matrix.periods.values()).sort(orderPeriod);
      const components=Array.from(matrix.components.values()).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
      for(let start=0; start<periods.length; start+=4){
        const window=periods.slice(start,start+4);
        windows.push({key:JSON.stringify([classId,window[0].period_id]),className:matrix.className,periods:window,
          periodLabel:window.map(p=>p.period_name).join(', '), rows:components.map(component=>({
            id:component.id,name:component.name,cells:window.map(p=>({
              period:p,result:component.results.get(p.period_id),empty:matrix.published.has(p.period_id)?'Sem resultado publicado':'Não publicado',
            })),
          }))});
      }
    }
    return windows;
  }

  export const component={props:['request','download','rootPath','schoolId','studentId','identity'],render:PigeRenders.learning,setup(props:Props){
    const state=Vue.reactive({busy:false,error:'',students:[] as Student[],studentId:'',enrollmentId:'',groupId:'',note:''});
    const base=()=> (props.rootPath||'/profile')+'/learning';
    const student=()=>state.students.find(s=>s.student_id===state.studentId);
    const enrollment=()=>student()?.enrollments.find(e=>e.enrollment_id===state.enrollmentId);
    function selectStudent():void {
      const enrollments=student()?.enrollments||[];
      state.enrollmentId=(enrollments.find(item=>item.status==='active')||enrollments[0])?.enrollment_id||'';
      state.groupId='';
    }
    async function run(action:()=>Promise<void>):Promise<void>{if(state.busy)return;state.busy=true;state.error='';try{await action();}catch(e){state.error=e instanceof Error?e.message:'Não foi possível carregar o boletim.';}finally{state.busy=false;}}
    async function load():Promise<void>{await run(async()=>{
      const data=await props.request<{students:Student[];note:string}>(base()+(props.schoolId?'?school_id='+encodeURIComponent(props.schoolId):''));
      state.students=props.studentId?data.students.filter(item=>item.student_id===props.studentId):data.students;
      state.note=data.note;
      if(!student()){state.studentId=state.students[0]?.student_id||'';selectStudent();}
      else if(!enrollment()){selectStudent();}
      if(!periodGroups.value.some(group=>group.id===state.groupId))state.groupId='';
    });}
    const periodGroups=Vue.computed(()=>{
      const groups=new Map<string,Group>();
      for(const subject of enrollment()?.subjects||[]){
        for(const period of subject.periods){
          const className=period.class_label||period.class_name||enrollment()?.class_name||'';
          const classId=period.class_group_id||className;
          const id=JSON.stringify([period.period_id,classId]);
          const group=groups.get(id)||{id,label:period.period_name,classId,className,items:[]};
          group.items.push({...period,component_name:period.component_name||subject.component_name,diary_id:subject.diary_id});
          groups.set(id,group);
        }
      }
      return Array.from(groups.values()).sort((a,b)=>orderPeriod(a.items[0],b.items[0])||a.className.localeCompare(b.className,'pt-BR'));
    });
    const visibleGroups=Vue.computed(()=>periodGroups.value.filter(group=>!state.groupId || group.id===state.groupId));
    const model=Vue.computed(()=>enrollment()?.bulletin_model||'integrated');
    const tables=Vue.computed(()=>matrices(visibleGroups.value,enrollment()?.class_calendars,Boolean(state.groupId)));
    const tableKinds=Vue.computed(()=>model.value==='panel'?['grade','attendance']:[model.value]);
    const titles:Record<string,string>={integrated:'Rendimento e frequência',grade:'Rendimento por componente',attendance:'Aulas, faltas e frequência',journey:'Percurso por componente'};
    const modelNames:Record<Model,string>={integrated:'Grade integrada',panel:'Painel do aluno',journey:'Percurso acadêmico'};
    const fonts:Record<string,string>={system:'system-ui, sans-serif',arial:'Arial, sans-serif',verdana:'Verdana, sans-serif',georgia:'Georgia, serif',times:'Times New Roman, serif'};
    const facts=Vue.computed(()=>{
      const e=enrollment();
      return [['Registro escolar',student()?.student_number],['Matrícula',e?.number],['Ano letivo',e?.year_name],['Etapa',e?.stage],['Unidade',e?.unit],['Turno',e?.shift]].filter(([,value])=>value);
    });
    const uniformStatus=Vue.computed(()=>{
      const values=new Set(visibleGroups.value.flatMap(group=>group.items.map(item=>item.result_label)));
      return values.size===1?Array.from(values)[0]:'';
    });
    const opinions=Vue.computed(()=>visibleGroups.value.flatMap(group=>group.items.filter(item=>item.opinions?.length)));
    const percent=(value:unknown)=>value===null||value===undefined?'Não apurada':Number(value).toLocaleString('pt-BR',{maximumFractionDigits:2})+'%';
    async function download(documentId=''):Promise<void>{await run(async()=>{if(!student()||!enrollment())return;await props.download(base()+'/'+encodeURIComponent(state.studentId)+'/report.pdf?enrollment_id='+encodeURIComponent(state.enrollmentId)+(documentId?'&document_id='+encodeURIComponent(documentId):'')+(props.schoolId?'&school_id='+encodeURIComponent(props.schoolId):''),'boletim-'+student()!.student_number+'.pdf');});}
    Vue.onMounted(()=>{void load();});
    return{props,state,student,enrollment,selectStudent,model,modelNames,fonts,facts,periodGroups,visibleGroups,tables,tableKinds,titles,uniformStatus,opinions,percent,load,download};
  }};
}
