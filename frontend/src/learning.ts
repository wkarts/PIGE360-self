namespace PigeLearning {
  type Attendance={present:number;absent:number;justified_absence:number;unrecorded:number;total:number;percentage:number|string|null};
  type Period={period_id:string;period_name:string;order_index?:number;starts_on?:string;class_name?:string;class_group_id?:string;class_label?:string;component_name?:string;grade_display:string;result_status:string;result_label:string;attendance:Attendance;published:boolean};
  type Subject={diary_id:string;component_name:string;periods:Period[]};
  type Enrollment={enrollment_id:string;number:string;class_name:string;year_name:string;status:string;grade_tables?:{title:string;columns:{key:string;label:string}[];rows:Record<string,string>[]}[];subjects:Subject[]};
  type Student={student_id:string;student_name:string;student_number:string;school_id?:string;school_name?:string;enrollments:Enrollment[]};
  type Props={identity?:{logo_url?:string;display_name?:string;app_version?:string};request:<T>(path:string)=>Promise<T>;download:(path:string,filename:string)=>Promise<void>;rootPath?:string;schoolId?:string;studentId?:string};
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
    const rows=()=> (enrollment()?.subjects||[]).flatMap(subject=>subject.periods.map(period=>({...period,component_name:period.component_name||subject.component_name,diary_id:subject.diary_id})));
    const periodGroups=Vue.computed(()=>{
      const groups=new Map<string,{id:string;label:string;className:string;items:ReturnType<typeof rows>}>();
      for(const row of rows()){
        const className=row.class_label||row.class_name||enrollment()?.class_name||'';
        const id=JSON.stringify([row.period_id,row.class_group_id||className]);
        const group=groups.get(id)||{id,label:row.period_name,className,items:[]};
        group.items.push(row);groups.set(id,group);
      }
      return Array.from(groups.values()).sort((left,right)=>{
        const a=left.items[0], b=right.items[0];
        return (a.order_index??0)-(b.order_index??0) || (a.starts_on||'').localeCompare(b.starts_on||'') || left.className.localeCompare(right.className,'pt-BR');
      });
    });
    const visibleGroups=Vue.computed(()=>periodGroups.value.filter(group=>!state.groupId || group.id===state.groupId));
    const percent=(value:unknown)=>value===null||value===undefined?'Não apurada':Number(value).toLocaleString('pt-BR',{maximumFractionDigits:2})+'%';
    async function download(documentId=''):Promise<void>{await run(async()=>{if(!student()||!enrollment())return;await props.download(base()+'/'+encodeURIComponent(state.studentId)+'/report.pdf?enrollment_id='+encodeURIComponent(state.enrollmentId)+(documentId?'&document_id='+encodeURIComponent(documentId):'')+(props.schoolId?'&school_id='+encodeURIComponent(props.schoolId):''),'boletim-'+student()!.student_number+'.pdf');});}
    Vue.onMounted(()=>{void load();});return{props,state,student,enrollment,selectStudent,rows,periodGroups,visibleGroups,percent,load,download};
  }};
}
