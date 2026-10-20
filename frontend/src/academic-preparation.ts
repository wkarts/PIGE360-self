namespace PigeAcademicPreparation {
  type Plan={preview_hash:string;scope:string;create_count:number;reuse_count:number;conflicts:string[];rows:{source_id:string;name:string;unit:string;grade:string;shift:string;capacity:number;active:boolean;action:string}[]};
  export const component={props:['schoolId','years'],render:PigeRenders.academicPreparation,setup(props:{schoolId:string;years:PigeAPI.Row[]},context:{emit:(event:string)=>void}){
    const next=String(new Date().getFullYear()+1);
    const s=Vue.reactive({open:false,busy:false,error:'',notice:'',source:'',targetId:'',name:next,starts:next+'-01-01',ends:next+'-12-31',plan:null as Plan|null});
    const payload=()=>({source_year_id:s.source,target:{name:s.name,starts_on:s.starts,ends_on:s.ends,status:'active'}});
    const base=()=>'/schools/'+props.schoolId+'/academic-preparation';
    Vue.watch(()=>JSON.stringify(payload()),()=>{s.plan=null;s.error='';});
    function targetChanged():void{const year=props.years.find(y=>y.id===s.targetId);if(year){s.name=String(year.name);s.starts=String(year.starts_on);s.ends=String(year.ends_on);}else{s.name=next;s.starts=next+'-01-01';s.ends=next+'-12-31';}s.plan=null;}
    async function run(task:()=>Promise<void>):Promise<void>{if(s.busy)return;s.busy=true;s.error='';s.notice='';try{await task();}catch(e){s.error=e instanceof Error?e.message:String(e);}finally{s.busy=false;}}
    async function preview():Promise<void>{await run(async()=>{s.plan=null;s.plan=await PigeAPI.post<Plan>(base()+'/preview',payload());});}
    async function apply():Promise<void>{if(!s.plan||s.plan.conflicts.length)return;await run(async()=>{const result=await PigeAPI.post<{created:number;reused:number}>(base()+'/apply',{...payload(),preview_hash:s.plan!.preview_hash});s.plan=null;s.source='';s.open=false;s.notice=`Ano letivo preparado: ${result.created} turma(s) criada(s), ${result.reused} já existente(s) preservada(s).`;context.emit('prepared');});}
    function close():void{s.open=false;s.source='';s.plan=null;s.error='';}
    return {s,props,preview,apply,targetChanged,close};
  }};
}
