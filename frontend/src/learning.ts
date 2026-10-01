namespace PigeLearning {
  type Attendance={present:number;absent:number;justified_absence:number;unrecorded:number;total:number;percentage:number|string|null};
  type Period={period_id:string;period_name:string;grade_display:string;result_status:string;result_label:string;attendance:Attendance;published:boolean};
  type Subject={diary_id:string;component_name:string;periods:Period[]};
  type Enrollment={enrollment_id:string;number:string;class_name:string;year_name:string;status:string;subjects:Subject[]};
  type Student={student_id:string;student_name:string;student_number:string;school_id?:string;school_name?:string;enrollments:Enrollment[]};
  type Props={request:<T>(path:string)=>Promise<T>;download:(path:string,filename:string)=>Promise<void>;rootPath?:string;schoolId?:string};
  export const component={props:['request','download','rootPath','schoolId'],render:PigeRenders.learning,setup(props:Props){
    const state=Vue.reactive({busy:false,error:'',students:[] as Student[],studentId:'',enrollmentId:'',note:''});
    const base=()=> (props.rootPath||'/profile')+'/learning';
    const student=()=>state.students.find(s=>s.student_id===state.studentId);
    const enrollment=()=>student()?.enrollments.find(e=>e.enrollment_id===state.enrollmentId);
    function selectStudent():void{state.enrollmentId=student()?.enrollments[0]?.enrollment_id||'';}
    async function run(action:()=>Promise<void>):Promise<void>{if(state.busy)return;state.busy=true;state.error='';try{await action();}catch(e){state.error=e instanceof Error?e.message:'Não foi possível carregar o boletim.';}finally{state.busy=false;}}
    async function load():Promise<void>{await run(async()=>{const data=await props.request<{students:Student[];note:string}>(base()+(props.schoolId?'?school_id='+encodeURIComponent(props.schoolId):''));state.students=data.students;state.note=data.note;if(!student())state.studentId=state.students[0]?.student_id||'';selectStudent();});}
    const rows=()=> (enrollment()?.subjects||[]).flatMap(subject=>subject.periods.map(period=>({...period,component_name:subject.component_name,diary_id:subject.diary_id})));
    const percent=(value:unknown)=>value===null||value===undefined?'Não apurada':Number(value).toLocaleString('pt-BR',{maximumFractionDigits:2})+'%';
    async function download():Promise<void>{await run(async()=>{if(!student()||!enrollment())return;await props.download(base()+'/'+encodeURIComponent(state.studentId)+'/report.pdf?enrollment_id='+encodeURIComponent(state.enrollmentId),'boletim-'+student()!.student_number+'.pdf');});}
    Vue.onMounted(()=>{void load();});return{state,student,enrollment,selectStudent,rows,percent,load,download};
  }};
}
