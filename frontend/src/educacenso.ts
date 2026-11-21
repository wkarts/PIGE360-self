namespace PigeEducacenso {
  type Row=PigeAPI.Row;
  interface Snapshot {
    collection_year?:number; replacement_rule?:string; return_statuses?:string[];
    rows:{enrollment_id:string;class_group_id:string;local_status:string}[];
    blocks:string[]; official_source:string;
  }
  interface Draft extends Row {snapshot:Snapshot;digest:string;reference_date:string;stage:string;evidence?:Evidence[]}
  interface Evidence extends Row {file_id:string;digest:string}
  const reasons:Record<string,string>={
    leiaute_e_dominios_sem_homologacao:'Leiaute e tabelas de domínio ainda não homologados.',
    declaracao_oficial_sem_comparacao:'Cobertura ainda não comparada com a declaração oficial.',
    selecao_parcial:'Seleção parcial, restrita ao diagnóstico.',
    selecao_sem_matriculas:'Nenhuma matrícula na seleção.'
  };
  export const component={props:['schoolId','schoolName'],render:PigeRenders.educacenso,setup(props:{schoolId:string;schoolName:string}){
    const root='/schools/'+props.schoolId;
    const base=root+'/educacenso';
    const state=Vue.reactive({busy:false,error:'',years:[] as Row[],groups:[] as Row[],year:'',stage:'matricula_inicial',
      environment:'treinamento',day:'',group:'',preview:null as Snapshot|null,draft:null as Draft|null,history:[] as Draft[],offset:0,
      file:null as File|null,reportedStatus:'',tab:'prepare',visibleRows:25});
    const stageLabel=(s:string)=>s==='matricula_inicial'?'Matrícula Inicial':'Situação do Aluno';
    async function run(work:()=>Promise<void>){
      if(state.busy)return;
      state.busy=true;state.error='';
      try{await work();}catch(error){state.error=(error as Error).message;}finally{state.busy=false;}
    }
    function reset(){state.preview=null;state.draft=null;state.file=null;state.visibleRows=25;}
    function payload(){return {year_id:state.year,stage:state.stage,reference_date:state.day,
      environment:state.environment,class_group_ids:state.group?[state.group]:null};}
    async function refreshHistory(){state.history=await PigeAPI.request<Draft[]>(base+'/drafts?environment='+state.environment+'&offset='+state.offset);}
    async function load(){await run(async()=>{
      const [years,groups]=await Promise.all([PigeAPI.request<Row[]>(root+'/academic-years'),PigeAPI.request<Row[]>(root+'/class-groups')]);
      state.years=years;state.groups=groups;
      state.year=(years.find(y=>y.status==='active')||years[0])?.id||'';
      await refreshHistory();
    });}
    function preview(){return run(async()=>{
      reset();state.preview=await PigeAPI.post<Snapshot>(base+'/preview',payload());
    });}
    function save(){return run(async()=>{
      if(!state.preview)return;
      const draft=await PigeAPI.post<Draft>(base+'/drafts',payload());
      await select(draft.id);state.offset=0;await refreshHistory();
    });}
    async function select(id:string){
      const draft=await PigeAPI.request<Draft>(base+'/drafts/'+id+'?environment='+state.environment);
      state.draft=draft;state.reportedStatus='';state.preview=null;state.file=null;state.visibleRows=25;state.tab='detail';
    }
    function open(id:string){return run(()=>select(id));}
    function attach(){return run(async()=>{
      if(!state.draft || !state.file)return;
      const id=state.draft.id;
      const form=new FormData();form.set('file',state.file);
      if(state.reportedStatus)form.set('reported_status',state.reportedStatus);
      await PigeAPI.request(base+'/drafts/'+id+'/evidence?environment='+state.environment,{method:'POST',body:form});
      await select(id);
    });}
    function diagnostic(){if(state.draft)return run(()=>PigeAPI.download(base+'/drafts/'+state.draft!.id+'/diagnostico.json?environment='+state.environment,'diagnostico-local.json'));}
    function fileChanged(event:Event){state.file=(event.target as HTMLInputElement).files?.[0]||null;}
    function download(item:Evidence){return run(()=>PigeAPI.download(root+'/files/'+item.file_id+'/download','evidencia.bin'));}
    function page(delta:number){return run(async()=>{state.offset=Math.max(0,state.offset+delta);await refreshHistory();});}
    function changeEnvironment(){reset();state.offset=0;state.history=[];state.tab='prepare';return run(refreshHistory);}
    Vue.onMounted(load);
    return {props,state,reasons,stageLabel,changeEnvironment,reset,preview,save,open,attach,diagnostic,fileChanged,download,page};
  }};
}
