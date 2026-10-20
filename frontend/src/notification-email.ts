namespace PigeNotificationEmail {
  type Config={mode:'inherit'|'school'|'disabled';host:string;port:number;username:string;from_address:string;allow_private_network:boolean;version:number|null;password_configured:boolean;available:boolean;installation_configured:boolean;checked_at:string|null;last_error:string};
  type Job={id:string;status:string;label:string;attempts:number;error_code:string;created_at:string};
  const empty=():Config=>({mode:'inherit',host:'',port:587,username:'',from_address:'',allow_private_network:false,version:null,password_configured:false,available:false,installation_configured:false,checked_at:null,last_error:''});
  export const component={props:['schoolId'],render:PigeRenders.notificationEmail,setup(props:{schoolId:string}){
    const s=Vue.reactive({busy:false,error:'',notice:'',open:false,config:empty(),form:empty(),password:'',jobs:[] as Job[],delayed:false,testKey:''});
    const base=()=>'/schools/'+props.schoolId+'/notification-email';
    const dirty=Vue.computed(()=>s.password!==''||['mode','host','port','username','from_address','allow_private_network'].some(k=>s.form[k as keyof Config]!==s.config[k as keyof Config]));
    async function run(task:()=>Promise<void>):Promise<void>{if(s.busy)return;s.busy=true;s.error='';s.notice='';try{await task();}catch(e){s.error=e instanceof Error?e.message:String(e);}finally{s.busy=false;}}
    async function load():Promise<void>{const data=await PigeAPI.request<Config&{jobs:Job[];queue_delayed:boolean}>(base());s.config=data;s.form={...data};s.jobs=data.jobs;s.delayed=data.queue_delayed;}
    async function refresh():Promise<void>{await run(async()=>{if(dirty.value)throw new Error('Salve ou cancele as alterações antes de atualizar.');await load();});}
    async function save():Promise<void>{await run(async()=>{const c=s.form;const data=await PigeAPI.request<Config>(base(),{method:'PUT',body:JSON.stringify({mode:c.mode,host:c.host,port:Number(c.port),username:c.username,from_address:c.from_address||null,allow_private_network:c.allow_private_network,version:c.version,password:s.password})});s.password='';s.config=data;s.form={...data};s.notice='Configuração de envio salva. Valide a autenticação e solicite um teste de envio.';});}
    async function validate():Promise<void>{await run(async()=>{if(dirty.value)throw new Error('Salve as alterações antes de validar.');const result=await PigeAPI.post<Config&{ok:boolean}>(base()+'/validate',{});s.config=result;s.form={...result};if(!result.ok)throw new Error('Falha na autenticação SMTP: '+result.last_error+'. Confira servidor, porta, certificado, usuário e senha.');s.notice='Autenticação SMTP validada. Nenhuma mensagem foi enviada nesta validação.';});}
    async function test():Promise<void>{await run(async()=>{if(dirty.value)throw new Error('Salve as alterações antes do teste.');s.testKey=s.testKey||PigeOnline.newId();const result=await PigeAPI.post<{recipient:string}>(base()+'/test',{client_key:s.testKey});s.testKey='';await load();s.notice='Teste enfileirado para '+result.recipient+'. Atualize a fila e confira o recebimento, inclusive o spam.';});}
    function cancel():void{s.form={...s.config};s.password='';s.open=false;}
    Vue.onMounted(()=>{void run(load);});
    return {s,dirty,refresh,save,validate,test,cancel,dateTime:PigeOnline.dateTime};
  }};
}
