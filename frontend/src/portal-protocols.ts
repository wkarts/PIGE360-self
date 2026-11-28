namespace PigePortalProtocols {
  interface Summary {id:string;number:string;subject:string;category:string;status:string;preferred_channel:string;updated_at:string}
  interface Entry {id:string;author:'you'|'school';message:string;created_at:string;attachment:{id:string;name:string}|null}
  interface Ticket extends Summary {history:Entry[]}
  interface ChannelOptions {channels:string[];opening_channel?:string;max_attachment_mb?:number;whatsapp_contact?:string|null}
  interface Props {area:'teacher'|'family';schoolId:string;studentId?:string;academic?:boolean;financial?:boolean;
    request:<T>(path:string,options?:RequestInit)=>Promise<T>;download:(path:string,name:string)=>Promise<void>}
  const categories:Record<string,string>={secretaria:'Secretaria',pedagogico:'Pedagógico',financeiro:'Financeiro',tecnico:'Suporte técnico'};
  const statuses:Record<string,string>={open:'Aberto',in_progress:'Em atendimento',waiting:'Aguardando',completed:'Concluído',cancelled:'Cancelado'};
  const channels:Record<string,string>={portal:'No portal',email:'E-mail',whatsapp:'WhatsApp'};
  const dateFormatter=new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'});
  const date=(value:string)=>value&&Number.isFinite(Date.parse(value))?dateFormatter.format(new Date(value)):'';
  const blank=()=>({category:'secretaria',subject:'',message:'',channel:'portal',file:null as File|null});

  export const component={props:['area','schoolId','studentId','academic','financial','request','download'],render:PigeRenders.portalProtocols,setup(props:Props){
    const s=Vue.reactive({view:'list',busy:false,error:'',notice:'',items:[] as Summary[],ticket:null as Ticket|null,
      query:'',term:'',page:1,pageSize:20,total:0,form:blank(),fileVersion:0,options:{channels:['portal']} as ChannelOptions,optionsError:'',openingChannel:'portal'});
    const availableCategories=Vue.computed(()=>Object.keys(categories).filter(key=>key==='financeiro'?props.area==='family'&&props.financial:
      key!=='pedagogico'||props.area==='teacher'||props.academic!==false));
    const dirty=()=>Boolean(s.form.message||s.form.file||(s.view==='detail'&&s.ticket&&s.form.channel!==s.ticket.preferred_channel)||(s.view==='new'&&(s.form.subject||s.form.category!=='secretaria'||s.form.channel!=='portal')));
    const closed=()=>['completed','cancelled'].includes(s.ticket?.status||'');
    const base='/'+props.area+'/schools/'+encodeURIComponent(props.schoolId)+'/protocols';
    const path=(id:string)=>base+'/'+encodeURIComponent(id);
    const controller=new AbortController();
    let active=true,waitingForDiscard=false,optionsVersion=0,clientKey='',lastPayload='',lastFile:File|null=null;
    function reset(){s.form=blank();s.fileVersion++;clientKey='';lastPayload='';lastFile=null;}
    function displayError(e:unknown){return e instanceof Error?e.message:'Não foi possível concluir a solicitação.';}
    async function discard(){
      if(waitingForDiscard)return false;
      waitingForDiscard=true;
      const form=s.form,view=s.view,ticket=s.ticket?.id;
      const {subject,category,channel,message,file}=form;
      const approved=await PigeDialogs.confirm('O texto, o anexo e as alterações ainda não enviados serão descartados.',{
        title:'Descartar a edição do protocolo?',confirmLabel:'Descartar edição',cancelLabel:'Voltar',destructive:true
      });
      waitingForDiscard=false;
      return approved && active && !s.busy && s.form===form && s.view===view && s.ticket?.id===ticket &&
        subject===form.subject && category===form.category && channel===form.channel && message===form.message && file===form.file;
    }
    function focusTitle(){void Vue.nextTick(()=>{if(active)document.getElementById('portal-protocol-title')?.focus();});}
    async function run(work:()=>Promise<void>){
      if(s.busy||!active)return;
      s.busy=true;s.error='';s.notice='';
      try{await work();}catch(e){
        if(active){
          s.error=displayError(e);
          if([403,404].includes((e as {status?:number})?.status||0)){
            reset();s.ticket=null;s.items=[];s.total=0;s.view='list';
          }
        }
      }finally{if(active)s.busy=false;}
    }
    function applyOptions(data:ChannelOptions){
      const allowed=Object.keys(channels).filter(key=>key==='portal'||data.channels.includes(key));
      const opening=data.opening_channel===undefined?undefined:allowed.includes(data.opening_channel)?data.opening_channel:'portal';
      s.options={...data,channels:allowed,opening_channel:opening};
      s.openingChannel=opening||'portal';s.optionsError='';
    }
    async function options(){
      const version=++optionsVersion;
      try{
        const data=await props.request<ChannelOptions>(base+'/options',{signal:controller.signal});
        if(active && version===optionsVersion)applyOptions(data);
      }catch(e){if(active && version===optionsVersion){s.options={channels:['portal']};s.optionsError=displayError(e);}}
    }
    async function saveOpeningChannel(){
      if(!s.options.opening_channel || !s.options.channels.includes(s.openingChannel))return;
      await run(async()=>{
        const version=++optionsVersion;
        const data=await props.request<ChannelOptions>(base+'/opening-channel',{method:'PUT',body:JSON.stringify({preferred_channel:s.openingChannel}),signal:controller.signal});
        if(active && version===optionsVersion){applyOptions(data);s.notice='Preferência de avisos para novos protocolos da escola salva.';}
      });
    }
    const whatsappUrl=Vue.computed(()=>{
      const line=s.options.whatsapp_contact;
      if(!line || !/^[1-9]\d{7,14}$/.test(line) || !s.ticket || closed() || !/^PRO-\d+$/.test(s.ticket.number))return '';
      return 'https://wa.me/'+line+'?'+new URLSearchParams({text:'Olá, quero falar sobre o protocolo '+s.ticket.number}).toString();
    });
    async function list(page=1,search=false){
      if(s.busy || !active || (dirty() && !await discard()))return;
      const term=search?s.query.trim():s.term;
      await run(async()=>{
        const params=new URLSearchParams({page:String(page)});
        if(props.studentId)params.set('student_id',props.studentId);
        if(term)params.set('q',term);
        const data=await props.request<{items:Summary[];total:number;page:number;page_size:number}>(base+'?'+params,{signal:controller.signal});
        if(!active)return;
        const changed=s.view!=='list';s.view='list';s.ticket=null;reset();
        s.items=data.items;s.total=data.total;s.page=data.page;s.pageSize=data.page_size;s.term=term;
        if(changed)focusTitle();
      });
    }
    function showNew(){if(s.busy || (props.area==='family'&&!props.studentId))return;reset();s.view='new';s.ticket=null;s.error='';s.notice='';focusTitle();}
    function showTicket(data:Ticket){reset();s.ticket=data;s.form.channel=data.preferred_channel;s.view='detail';}
    async function open(id:string){
      if(s.busy || !active || (dirty() && !await discard()))return;
      await run(async()=>{const data=await props.request<Ticket>(path(id),{signal:controller.signal});if(active){showTicket(data);focusTitle();}});
    }
    function chooseFile(event:Event){s.form.file=(event.target as HTMLInputElement).files?.[0]||null;}
    async function copyNumber(){
      const ticket=s.ticket;
      if(!ticket)return;
      try{
        await navigator.clipboard.writeText(ticket.number);
        if(active && ticket.id===s.ticket?.id)s.notice='Número do protocolo copiado.';
      }catch{
        if(active && ticket.id===s.ticket?.id)s.notice='Selecione o número '+ticket.number+' no cabeçalho para copiá-lo.';
      }
    }
    async function send(){
      const creating=s.view==='new';
      if((!creating&&(!s.ticket||closed())) || s.busy)return;
      await run(async()=>{
        const message=s.form.message.trim(),subject=s.form.subject.trim();
        if(message.length<3 || (creating&&subject.length<2))throw new Error('Informe ao menos dois caracteres no assunto e três na mensagem.');
        if(s.form.file && s.options.max_attachment_mb && s.form.file.size>s.options.max_attachment_mb*1024*1024)
          throw new Error('O anexo ultrapassa o limite de '+s.options.max_attachment_mb+' MB.');
        const body=new FormData();body.set('message',message);
        if(creating){
          body.set('subject',subject);body.set('category',s.form.category);body.set('preferred_channel',s.form.channel);
          if(props.studentId)body.set('student_id',props.studentId);
        }
        const target=creating?base:path(s.ticket!.id)+'/messages';
        const payload=JSON.stringify(creating?[target,message,subject,s.form.category,s.form.channel]:[target,message]);
        if(!clientKey||payload!==lastPayload||s.form.file!==lastFile){clientKey=crypto.randomUUID();lastPayload=payload;lastFile=s.form.file;}
        body.set('client_key',clientKey);
        if(s.form.file)body.set('file',s.form.file);
        const data=await props.request<Ticket>(target,{method:'POST',body,signal:controller.signal});
        if(active){showTicket(data);s.notice=creating?'Protocolo '+data.number+' aberto.':'Resposta registrada.';if(creating)focusTitle();}
      });
    }
    async function changeChannel(){
      const ticket=s.ticket;
      if(!ticket||closed()||!s.options.channels.includes(s.form.channel)||ticket.preferred_channel===s.form.channel)return;
      await run(async()=>{
        const data=await props.request<Ticket>(path(ticket.id)+'/channel',{method:'PATCH',body:JSON.stringify({preferred_channel:s.form.channel}),signal:controller.signal});
        if(active){s.ticket=data;s.form.channel=data.preferred_channel;s.notice='Preferência de avisos atualizada.';}
      });
    }
    async function attachment(file:Entry['attachment']){
      const ticket=s.ticket;
      if(ticket&&file)await run(()=>props.download(path(ticket.id)+'/attachments/'+encodeURIComponent(file.id),file.name));
    }
    Vue.onMounted(()=>{void options();void list();});
    Vue.onUnmounted(()=>{active=false;if(waitingForDiscard)PigeDialogs.cancelPending();controller.abort();reset();});
    return {s,props,availableCategories,categories,statuses,channels,closed,dirty,date,options,saveOpeningChannel,whatsappUrl,list,showNew,open,chooseFile,copyNumber,send,changeChannel,attachment,chat:PigeSupport.status,openChat:PigeSupport.openChat};
  }};
}
