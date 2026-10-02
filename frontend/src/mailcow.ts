namespace PigeMailcow {
  type Config={configured:boolean;enabled:boolean;base_url:string;domain:string;default_quota_mb:number;allow_private_network:boolean;api_key_configured:boolean;version:number|null;last_test_ok?:boolean|null;webmail_url?:string};
  type Mailbox={id:string;address:string;user_name:string;quota_mb:number;quota_used_bytes:number;status:string;job_status:string;attempts:number;error_code:string;error_message?:string;credentials_available:boolean;user_id:string};
  type ConnectionTest={ok:boolean;code:string;message:string;read_authenticated:boolean;write_verified:boolean};
  type Credentials={address:string;password:string;webmail_url:string};
  const defaults=():Config=>({configured:false,enabled:false,base_url:'',domain:'',default_quota_mb:1024,allow_private_network:false,api_key_configured:false,version:null});
  export const component={props:['schoolId'],render:PigeRenders.mailcow,setup(props:{schoolId:string}){
    const state=Vue.reactive({busy:false,error:'',notice:'',config:defaults(),draft:defaults(),apiKey:'',testResult:null as ConnectionTest|null,mailboxes:[] as Mailbox[],users:[] as PigeAPI.User[],showConfig:false,showNew:false,userId:'',localPart:'',quota:1024,credentials:null as Credentials|null});
    const base=()=>'/schools/'+props.schoolId+'/mailcow';
    const dirty=Vue.computed(()=>state.apiKey.trim()!==''||(['enabled','base_url','domain','default_quota_mb','allow_private_network'] as const).some(key=>state.draft[key]!==state.config[key]));
    function openConfig():void{state.draft={...state.config};state.apiKey='';state.showConfig=true;state.error='';}
    function closeConfig():void{state.draft={...state.config};state.apiKey='';state.showConfig=false;}
    function toggleConfig():void{if(state.showConfig)closeConfig();else openConfig();}
    async function run(action:()=>Promise<void>):Promise<void>{if(state.busy)return;state.busy=true;state.error='';state.notice='';try{await action();}catch(e){state.error=e instanceof Error?e.message:'Não foi possível concluir a operação.';}finally{state.busy=false;}}
    async function load():Promise<void>{const [config,mailboxes,users]=await Promise.all([PigeAPI.request<Config>(base()+'/config'),PigeAPI.request<Mailbox[]>(base()+'/mailboxes'),PigeAPI.request<PigeAPI.User[]>('/users')]);state.config=config;state.draft={...config};state.mailboxes=mailboxes;state.users=users.filter(user=>user.active&&(user.role==='admin'||user.school_ids.includes(props.schoolId)));state.quota=config.default_quota_mb;if(!config.configured)state.showConfig=true;}
    async function refresh():Promise<void>{await run(async()=>{if(dirty.value)throw new Error('Salve ou cancele as alterações do servidor antes de atualizar.');await load();});}
    async function testSaved():Promise<void>{
      state.testResult=null;state.config.last_test_ok=null;
      try{const result=await PigeAPI.post<ConnectionTest>(base()+'/test',{});state.config.last_test_ok=result.ok;state.testResult=result;if(!result.ok)throw new Error(result.message);state.notice=result.message;}
      catch(error){state.config.last_test_ok=false;throw error;}
    }
    async function save(testAfter=false):Promise<void>{await run(async()=>{
      const c=state.draft;
      state.config=await PigeAPI.request<Config>(base()+'/config',{method:'PUT',body:JSON.stringify({enabled:c.enabled,base_url:c.base_url.trim(),domain:c.domain.trim(),default_quota_mb:Number(c.default_quota_mb),allow_private_network:c.allow_private_network,version:c.version,api_key:state.apiKey.trim()})});
      state.draft={...state.config};state.apiKey='';state.testResult=null;state.notice='Configuração de e-mail salva.';
      if(testAfter){await testSaved();}else{state.showConfig=false;}
    });}
    async function test():Promise<void>{await run(async()=>{if(dirty.value)throw new Error('Há alterações não salvas. Use Salvar e testar para validar a nova configuração.');await testSaved();});}
    function beginNew():void{state.showNew=true;state.userId='';state.localPart='';state.quota=state.config.default_quota_mb;state.error='';}
    function selectUser():void{state.localPart=state.users.find(user=>user.id===state.userId)?.email.split('@')[0]||'';}
    const availableUsers=Vue.computed(()=>state.users.filter(user=>!state.mailboxes.some(box=>box.user_id===user.id)));
    async function create():Promise<void>{await run(async()=>{if(!state.userId)throw new Error('Selecione o usuário que receberá a caixa de e-mail.');await PigeAPI.post<Mailbox>(base()+'/mailboxes',{user_id:state.userId,local_part:state.localPart,quota_mb:Number(state.quota)});state.showNew=false;await load();state.notice='Caixa solicitada. A criação será processada em segundo plano.';});}
    async function action(box:Mailbox,kind:'retry'|'sync'):Promise<void>{await run(async()=>{await PigeAPI.post(base()+'/mailboxes/'+box.id+'/'+kind,{});state.mailboxes=await PigeAPI.request<Mailbox[]>(base()+'/mailboxes');state.notice=kind==='retry'?'A criação será tentada novamente.':'Situação da caixa atualizada.';});}
    async function credentials(box:Mailbox):Promise<void>{await run(async()=>{state.credentials=await PigeAPI.post<Credentials>(base()+'/mailboxes/'+box.id+'/credentials',{});box.credentials_available=false;});}
    const status=(value:string)=>({active:'Ativa',disabled:'Desativada',pending:'Aguardando criação',processing:'Criando',retry:'Nova tentativa agendada',failed:'Requer atenção',uncertain:'Aguardando conferência',completed:'Concluída'}[value]||'Aguardando');
    const issue=(box:Mailbox)=>box.error_message||({MAILCOW_ADDRESS_CONFLICT:'Este endereço já existe no servidor e pertence a outro cadastro.',MAILCOW_ACCESS_DENIED:'A API recusou o acesso. Confira a chave de leitura e escrita e os IPs de saída autorizados no Mailcow.',MAILCOW_DOMAIN_UNAVAILABLE:'O domínio precisa estar ativo no servidor de e-mail.',MAILCOW_DISABLED:'A integração está desativada.',MAILCOW_CREATE_REJECTED:'O servidor recusou a criação. Confira as cotas e a disponibilidade do endereço.',MAILCOW_ADDRESS_BLOCKED:'O endereço do servidor não atende à configuração de rede.',MAILCOW_NETWORK_ERROR:'O servidor não respondeu. A criação será tentada novamente.',MAILCOW_REMOTE_MAILBOX_MISSING:'A caixa não foi encontrada no servidor.'}[box.error_code]||'Confira a configuração do servidor e tente novamente.');
    const usage=(bytes:number)=>bytes>=1073741824?(bytes/1073741824).toLocaleString('pt-BR',{maximumFractionDigits:1})+' GB':(bytes/1048576).toLocaleString('pt-BR',{maximumFractionDigits:1})+' MB';
    let poll:number|undefined;let disposed=false;
    Vue.onMounted(()=>{void refresh();poll=window.setInterval(()=>{if(!state.busy&&state.mailboxes.some(box=>['pending','processing','retry'].includes(box.job_status))){void PigeAPI.request<Mailbox[]>(base()+'/mailboxes').then(boxes=>{if(!disposed)state.mailboxes=boxes;}).catch(()=>{});}},10000);});
    Vue.onUnmounted(()=>{disposed=true;if(poll!==undefined)window.clearInterval(poll);state.apiKey='';state.credentials=null;});
    return{state,dirty,openConfig,closeConfig,toggleConfig,availableUsers,refresh,save,test,beginNew,selectUser,create,action,credentials,status,issue,usage};
  }};
}
