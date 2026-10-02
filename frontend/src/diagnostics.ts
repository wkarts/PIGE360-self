namespace PigeDiagnostics {
  type Event={timestamp:string;service:string;level:string;event:string;request_id?:string;job_id?:string;status?:number;route?:string;duration_ms?:number;error_type?:string;code?:string;frames?:unknown[]};
  type Summary={version:string;generated_at:string;installation_slug:string;build:Record<string,unknown>;database:Record<string,unknown>;storage:Record<string,unknown>;configuration:Record<string,unknown>;logging:Record<string,unknown>;services:{service:string;status:string;last_seen:string|null}[];queues:Record<string,Record<string,number>>;portal:{school_name:string;ready:boolean;issues:{code:string;message:string}[]}[]};
  type Statistics={levels:Record<string,number>;http_errors:number;recurring:{event:string;code:string;route:string;count:number}[]};
  export const component={render:PigeRenders.diagnostics,setup(){
    const state=Vue.reactive({filtersOpen:window.innerWidth>600,busy:false,error:'',notice:'',summary:null as Summary|null,rows:[] as Event[],statistics:null as Statistics|null,page:1,total:0,truncated:false,unreadable:0,service:'',level:'',reference:'',since:'',until:'',event:'',code:'',route:'',job:'',minStatus:'',selected:null as Event|null});
    const query=()=>{const q=new URLSearchParams();for(const [k,v] of Object.entries({service:state.service,level:state.level,request_id:state.reference.trim(),since:state.since?new Date(state.since).toISOString():'',until:state.until?new Date(state.until).toISOString():'',event:state.event.trim(),code:state.code.trim(),route:state.route.trim(),job_id:state.job.trim(),min_status:state.minStatus}))if(v)q.set(k,v);return q.toString();};
    async function run(action:()=>Promise<void>):Promise<void>{if(state.busy)return;state.busy=true;state.error='';try{await action();}catch(e){state.error=e instanceof Error?e.message:'Não foi possível consultar o diagnóstico.';}finally{state.busy=false;}}
    async function events():Promise<void>{const r=await PigeAPI.request<{items:Event[];total:number;truncated:boolean;unreadable_records:number;statistics:Statistics}>('/diagnostics/events?'+query()+'&page='+state.page);state.rows=r.items;state.total=r.total;state.truncated=r.truncated;state.unreadable=r.unreadable_records;state.statistics=r.statistics;}
    async function load():Promise<void>{await run(async()=>{state.summary=await PigeAPI.request<Summary>('/diagnostics/summary');await events();});}
    async function search():Promise<void>{state.page=1;state.selected=null;await run(events);}
    async function page(delta:number):Promise<void>{const previous=state.page;state.page=Math.max(1,state.page+delta);await run(events);if(state.error)state.page=previous;}
    async function download():Promise<void>{await run(async()=>{await PigeAPI.download('/diagnostics/export?'+query(),'diagnostico-'+new Date().toISOString().replace(/[:.]/g,'-')+'.zip');state.notice='Pacote gerado com os filtros selecionados.';});}
    function reset():void{Object.assign(state,{service:'',level:'',reference:'',since:'',until:'',event:'',code:'',route:'',job:'',minStatus:''});}
    async function preset(value:string):Promise<void>{reset();if(value==='errors')state.level='ERROR';if(value==='day'){const d=new Date(Date.now()-86400000);state.since=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}await search();}
    async function correlate(item:Event):Promise<void>{reset();state.reference=item.request_id||'';state.job=state.reference?'':item.job_id||'';await search();}
    async function recurrence(item:{event:string;code:string;route:string}):Promise<void>{state.level='';state.reference='';state.job='';state.event=item.event;state.code=item.code;state.route=item.route;await search();}
    const pretty=(v:unknown)=>JSON.stringify(v,null,2);
    const date=(v:string)=>v?new Date(v).toLocaleString('pt-BR'): 'Não observado';
    const serviceName=(v:string)=>({'app':'Aplicação','worker':'Tarefas automáticas','worker-ocr':'Leitura de documentos'}[v]||v);
    const levelName=(v:string)=>({'INFO':'Informação','WARNING':'Atenção','ERROR':'Erro'}[v]||v);
    const queueName=(v:string)=>({'integrations':'Integrações','communication':'Comunicações','ocr':'Leitura de documentos'}[v]||v);
    const failures=(items:Record<string,number>)=>Object.entries(items).filter(([k])=>['failed','error','dead'].includes(k)).reduce((n,[,v])=>n+v,0);
    Vue.onMounted(()=>{const reference=sessionStorage.getItem('pige-diagnostic-reference')||'';sessionStorage.removeItem('pige-diagnostic-reference');if(/^[a-f0-9]{24}$/.test(reference))state.reference=reference;void load();});return {state,load,search,page,download,pretty,date,reset,preset,correlate,recurrence,serviceName,levelName,queueName,failures};
  }};
}
