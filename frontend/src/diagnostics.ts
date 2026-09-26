namespace PigeDiagnostics {
  type Event={timestamp:string;service:string;level:string;event:string;request_id?:string;status?:number;route?:string;duration_ms?:number;error_type?:string;code?:string;frames?:unknown[]};
  type Summary={version:string;generated_at:string;build:Record<string,unknown>;database:Record<string,unknown>;storage:Record<string,unknown>;configuration:Record<string,unknown>;logging:Record<string,unknown>;services:{service:string;status:string;last_seen:string|null}[];queues:Record<string,Record<string,number>>;portal:{school_name:string;ready:boolean;issues:{code:string;message:string}[]}[]};
  export const component={render:PigeRenders.diagnostics,setup(){
    const state=Vue.reactive({busy:false,error:'',notice:'',summary:null as Summary|null,rows:[] as Event[],page:1,total:0,truncated:false,service:'',level:'',reference:'',since:'',until:''});
    const query=()=>{const q=new URLSearchParams();for(const [k,v] of Object.entries({service:state.service,level:state.level,request_id:state.reference,since:state.since?new Date(state.since).toISOString():'',until:state.until?new Date(state.until).toISOString():''}))if(v)q.set(k,v);return q.toString();};
    async function run(action:()=>Promise<void>):Promise<void>{if(state.busy)return;state.busy=true;state.error='';try{await action();}catch(e){state.error=e instanceof Error?e.message:'Falha de diagnóstico.';}finally{state.busy=false;}}
    async function events():Promise<void>{const r=await PigeAPI.request<{items:Event[];total:number;truncated:boolean}>('/diagnostics/events?'+query()+'&page='+state.page);state.rows=r.items;state.total=r.total;state.truncated=r.truncated;}
    async function load():Promise<void>{await run(async()=>{state.summary=await PigeAPI.request<Summary>('/diagnostics/summary');await events();});}
    async function search():Promise<void>{state.page=1;await run(events);}
    async function page(delta:number):Promise<void>{state.page+=delta;await run(events);}
    async function download():Promise<void>{await run(async()=>{await PigeAPI.download('/diagnostics/export?'+query(),'diagnostico-escola.zip');state.notice='Pacote gerado. Compartilhe somente com o suporte autorizado.';});}
    const pretty=(v:unknown)=>JSON.stringify(v,null,2);
    const date=(v:string)=>v?new Date(v).toLocaleString('pt-BR'): 'Não observado';
    Vue.onMounted(()=>{void load();});return {state,load,search,page,download,pretty,date};
  }};
}
