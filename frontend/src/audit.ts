namespace PigeAudit {
  type Event={id:string;created_at:string;action:string;entity_type:string;entity_id:string;actor_id:string|null;actor_name:string;request_id:string;ip:string;scope:string;details:Record<string,unknown>};
  type Choices={actions:string[];entities:string[];actors:{id:string;name:string}[]};
  export const component={props:['schoolId'],render:PigeRenders.audit,setup(props:{schoolId:string}){
    const state=Vue.reactive({filtersOpen:window.innerWidth>600,busy:false,error:'',notice:'',rows:[] as Event[],total:0,page:1,action:'',entity:'',entityId:'',actor:'',reference:'',since:'',until:'',selected:null as Event|null,choices:{actions:[],entities:[],actors:[]} as Choices});
    const base=()=>'/schools/'+props.schoolId+'/audit';
    function query():string{const q=new URLSearchParams();for(const[k,v]of Object.entries({action:state.action,entity_type:state.entity,entity_id:state.entityId.trim(),actor_id:state.actor,request_id:state.reference.trim(),since:state.since?new Date(state.since).toISOString():'',until:state.until?new Date(state.until).toISOString():''}))if(v)q.set(k,v);return q.toString();}
    async function run(fn:()=>Promise<void>):Promise<void>{if(state.busy)return;state.busy=true;state.error='';try{await fn();}catch(e){state.error=e instanceof Error?e.message:'Não foi possível consultar a auditoria.';}finally{state.busy=false;}}
    async function rows():Promise<void>{const r=await PigeAPI.request<{items:Event[];total:number}>(base()+'?'+query()+'&page='+state.page);state.rows=r.items;state.total=r.total;}
    async function load():Promise<void>{await run(async()=>{state.choices=await PigeAPI.request<Choices>(base()+'/options');await rows();});}
    async function search():Promise<void>{state.page=1;state.selected=null;await load();}
    async function page(delta:number):Promise<void>{const previous=state.page;state.page=Math.max(1,state.page+delta);await run(rows);if(state.error)state.page=previous;}
    function reset():void{Object.assign(state,{action:'',entity:'',entityId:'',actor:'',reference:'',since:'',until:''});}
    async function clear():Promise<void>{reset();await search();}
    async function related(item:Event,kind:string):Promise<void>{reset();if(kind==='record'){state.entity=item.entity_type;state.entityId=item.entity_id;}else{state.reference=item.request_id;}await search();}
    async function download():Promise<void>{await run(async()=>{await PigeAPI.download(base()+'/export?'+query(),'auditoria-'+new Date().toISOString().replace(/[:.]/g,'-')+'.csv');state.notice='Arquivo de auditoria gerado com os filtros selecionados.';});}
    function investigate(item:Event):void{if(/^[a-f0-9]{24}$/.test(item.request_id)){sessionStorage.setItem('pige-diagnostic-reference',item.request_id);location.hash='#/diagnostics';}}
    const date=(v:string)=>v?new Date(v).toLocaleString('pt-BR'):'—';
    const pretty=(v:unknown)=>JSON.stringify(v,null,2);
    const actionName=(v:string)=>{const parts=v.split('.');const suffix=parts.pop()||v;const labels:Record<string,string>={created:'Criado',updated:'Alterado',deleted:'Excluído',delete:'Excluído',archived:'Arquivado',archive:'Arquivado',restored:'Restaurado',restore:'Restaurado',exported:'Exportado',login:'Acesso',logout:'Saída',viewed:'Consulta',applied:'Aplicado',previewed:'Prévia',configured:'Configurado',signed:'Assinado',activated:'Ativado',cancelled:'Cancelado',password_changed:'Senha alterada',connection_test:'Teste de conexão',mailbox_queued:'Caixa solicitada',mailbox_retried:'Nova tentativa',mailbox_credentials_viewed:'Acesso à caixa consultado',saved:'Salvo'};return labels[suffix]||suffix.replace(/_/g,' ');};
    const entityName=(v:string)=>({school:'Instituição',company:'Mantenedora',institution:'Instituição',auth:'Acesso',audit:'Auditoria',diagnostics:'Diagnóstico',legacy_import:'Portabilidade',mailcow:'E-mail institucional',persons:'Pessoa',students:'Aluno',enrollments:'Matrícula',schools:'Instituição',users:'Usuário',class_groups:'Turma',academic_years:'Ano letivo',grades:'Série',units:'Unidade',protocols:'Protocolo',files:'Arquivo',issued_documents:'Documento emitido',school_mailboxes:'Caixa de e-mail',mailcow_configs:'Serviço de e-mail',connect_configs:'Comunicação',companies:'Mantenedora'}[v]||v.replace(/_/g,' '));
    function changes(item:Event):{field:string;before:unknown;after:unknown}[]{const before=item.details.before,after=item.details.after;if(!before||!after||typeof before!=='object'||typeof after!=='object'||Array.isArray(before)||Array.isArray(after))return[];const a=before as Record<string,unknown>,b=after as Record<string,unknown>;return[...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>JSON.stringify(a[k])!==JSON.stringify(b[k])).map(field=>({field,before:a[field]??'—',after:b[field]??'—'}));}
    const value=(v:unknown)=>typeof v==='object'?JSON.stringify(v):String(v??'—');
    Vue.onMounted(()=>{void load();});return{state,load,search,page,clear,related,download,date,pretty,actionName,entityName,changes,value,investigate};
  }};
}
