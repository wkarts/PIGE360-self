namespace PigeLegacyImport {
  type Selection={tables:string[];record_ids:Record<string,string[]>;include_photos:boolean;include_media:boolean;unit_id:string};
  type RecordChoice={id:string;name:string;selected:boolean};
  type RecordPage={items:RecordChoice[];total:number;page:number;page_size:number};
  type Preview={fingerprint:string;source_record_count:number;selected_record_count:number;can_apply:boolean;issues:string[];warnings:string[];max_package_mb:number;destination:{school_id:string;school_name:string;unit_id:string;unit_name:string;creates_institution:boolean};tables:{name:string;rows:number;selected_rows:number;destination:string}[];records:Record<string,RecordPage>;selection:Selection};
  const labels:Record<string,string>={alunos:'Alunos',responsaveis:'Pais e responsáveis',aluno_responsaveis:'Vínculos familiares',professores:'Professores',colaboradores:'Funcionários',periodos_letivos:'Anos letivos',cursos:'Séries e cursos',disciplinas:'Disciplinas',turmas:'Turmas',matriculas:'Matrículas',documentos_alunos:'Documentos dos alunos',usuarios:'Usuários',unidades_escolares:'Unidades da escola'};
  export const component={props:['schoolId','schoolName','units'],render:PigeRenders.legacyImport,setup(props:{schoolId:string;schoolName:string;units:PigeAPI.Row[]}) {
    let backup:File|null=null,media:File|null=null;
    const state=Vue.reactive({busy:false,error:'',backupName:'',mediaName:'',inventory:null as Preview|null,preview:null as Preview|null,selection:{tables:[],record_ids:{},include_photos:false,include_media:false,unit_id:''} as Selection,confirmation:'',recordTable:'',recordQuery:'',records:null as RecordPage|null,runs:[] as PigeAPI.Row[],result:null as {summary:Record<string,unknown>}|null});
    const base=()=>'/schools/'+props.schoolId+'/legacy-import';
    function invalidate():void{state.preview=null;state.confirmation='';state.result=null;state.error='';}
    function fileChange(event:Event,kind:string):void{const input=event.target as HTMLInputElement,file=input.files?.[0]||null;if(kind==='backup'){backup=file;state.backupName=file?.name||'';state.inventory=null;state.selection.tables=[];state.selection.record_ids={};state.records=null;state.recordTable='';}else{media=file;state.mediaName=file?.name||'';}invalidate();}
    function form(includeSelection=true):FormData{const f=new FormData();if(backup)f.append('backup',backup);if(media)f.append('container_media',media);if(includeSelection)f.append('selection',JSON.stringify(state.selection));return f;}
    async function run(action:()=>Promise<void>):Promise<void>{if(state.busy)return;state.busy=true;state.error='';try{await action();}catch(e){state.error=e instanceof Error?e.message:'Não foi possível concluir a importação.';}finally{state.busy=false;}}
    async function analyze():Promise<void>{await run(async()=>{if(!backup)throw new Error('Selecione o arquivo da aplicação anterior.');state.inventory=await PigeAPI.request<Preview>(base()+'/preview',{method:'POST',body:form(false)});invalidate();if(!state.selection.unit_id&&props.units.length===1)state.selection.unit_id=props.units[0].id;});}
    function toggleTable(table:string):void{invalidate();if(state.selection.tables.includes(table)){state.selection.tables=state.selection.tables.filter(t=>t!==table);delete state.selection.record_ids[table];if(state.recordTable===table){state.recordTable='';state.records=null;}}else state.selection.tables.push(table);}
    function destinationChanged():void{if(state.selection.unit_id){state.selection.tables=state.selection.tables.filter(t=>t!=='unidades_escolares');delete state.selection.record_ids.unidades_escolares;}invalidate();}
    async function chooseRecords(table:string):Promise<void>{state.recordTable=table;state.recordQuery='';if(!(table in state.selection.record_ids)){state.selection.record_ids[table]=[];invalidate();}await loadRecords(1);}
    async function loadRecords(page=1):Promise<void>{await run(async()=>{const f=form();f.append('table',state.recordTable);f.append('query',state.recordQuery);f.append('page',String(page));f.append('page_size','30');state.records=await PigeAPI.request<RecordPage>(base()+'/records',{method:'POST',body:f});});}
    function toggleRecord(id:string):void{const list=state.selection.record_ids[state.recordTable]||[];state.selection.record_ids[state.recordTable]=list.includes(id)?list.filter(i=>i!==id):[...list,id];invalidate();}
    function allRecords(table:string):void{delete state.selection.record_ids[table];if(state.recordTable===table){state.recordTable='';state.records=null;}invalidate();}
    function count(table:string,total:number):number{return table in state.selection.record_ids?state.selection.record_ids[table].length:total;}
    async function review():Promise<void>{await run(async()=>{if(!state.selection.tables.length)throw new Error('Selecione pelo menos uma categoria para importar.');state.preview=await PigeAPI.request<Preview>(base()+'/preview',{method:'POST',body:form()});state.confirmation='';});}
    async function loadRuns():Promise<void>{state.runs=await PigeAPI.request<PigeAPI.Row[]>(base()+'/runs');}
    async function apply():Promise<void>{await run(async()=>{if(!state.preview?.can_apply||state.confirmation.trim().toUpperCase()!=='IMPORTAR')throw new Error('Revise a seleção e confirme a importação.');const f=form();f.append('fingerprint',state.preview.fingerprint);f.append('confirmation',state.confirmation);state.result=await PigeAPI.request<{summary:Record<string,unknown>}>(base()+'/apply',{method:'POST',body:f});state.preview=null;state.inventory=null;backup=null;media=null;state.backupName='';state.mediaName='';state.confirmation='';state.selection.tables=[];state.selection.record_ids={};state.records=null;state.recordTable='';await loadRuns();});}
    async function download(id:string):Promise<void>{await run(()=>PigeAPI.download(base()+'/runs/'+id+'/archive','importacao-'+id.slice(0,8)+'.jsonl'));}
    const tableName=(table:string)=>labels[table]||table.replace(/_/g,' ');
    const categories=()=>state.inventory?.tables.filter(t=>t.rows>0&&Boolean(labels[t.name]))||[];
    const extras=()=>state.inventory?.tables.filter(t=>t.rows>0&&!labels[t.name])||[];
    const date=(v:unknown)=>new Date(String(v)).toLocaleString('pt-BR',{timeZone:'America/Bahia'});
    Vue.onMounted(()=>{void run(loadRuns);});
    return{state,fileChange,analyze,toggleTable,destinationChanged,chooseRecords,loadRecords,toggleRecord,allRecords,count,review,apply,download,invalidate,tableName,categories,extras,date,schoolName:props.schoolName,get units(){return props.units;}};
  }};
}
