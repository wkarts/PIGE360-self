/** Notícias e agenda com transporte compartilhável entre gestão, portal e página pública. */
namespace PigeCommunity {
  export type Post={id:string;school_id:string;version?:number;title:string;summary:string;content:string;kind:'news'|'event';audience:string;status?:string;pinned:boolean;publish_at:string|null;expires_at:string|null;event_start:string|null;event_end:string|null;location:string};
  type Page={items:Post[];total:number;page:number;page_size:number};
  type Transport=(path:string,options?:RequestInit)=>Promise<unknown>;
  type Props={schoolId:string;permissions?:string[];publicMode?:boolean;portalMode?:boolean;request?:Transport;compact?:boolean};
  const audienceLabels:Record<string,string>={public:'Público — qualquer visitante',authenticated:'Comunidade escolar autenticada',students:'Alunos',guardians:'Pais e responsáveis',teachers:'Professores'};
  const statusLabels:Record<string,string>={draft:'Rascunho',published:'Publicado',archived:'Arquivado'};
  const empty=()=>({id:'',version:1,title:'',summary:'',content:'',kind:'news' as 'news'|'event',audience:'authenticated',status:'draft',pinned:false,publish_at:'',expires_at:'',event_start:'',event_end:'',location:''});
  export async function request(path:string,options:RequestInit={}):Promise<unknown>{
    const response=await fetch('/api/v1'+path,{...options,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-CSRF-Protection':'1',...options.headers}});
    const payload=await response.json();
    if(!response.ok)throw new Error(payload.errors?.map((item:{message:string})=>item.message).join(' ')||payload.detail||'Não foi possível carregar as publicações.');
    return payload;
  }
  function date(value:string|null|undefined,withTime=false):string{return value?new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Bahia',day:'2-digit',month:'short',year:'numeric',...(withTime?{hour:'2-digit',minute:'2-digit'}:{})}).format(new Date(value)):'—';}
  function local(value:string|null):string{
    if(!value)return '';
    const parts=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Bahia',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value));
    return parts.replace(' ','T');
  }
  export const component={props:['schoolId','permissions','publicMode','portalMode','request','compact'],render:PigeRenders.community,setup(props:Props){
    const s=Vue.reactive({busy:false,error:'',notice:'',items:[] as Post[],page:1,total:0,q:'',kind:'',status:'',upcoming:false,selected:null as Post|null,editing:false,discard:false,deleteConfirm:false,initial:'',form:empty()});
    const manage=()=>!props.publicMode&&!props.portalMode&&Boolean(props.permissions?.includes('schools.manage'));
    const endpoint=()=>props.portalMode?'/portal/community-feed':props.publicMode?'/public/schools/'+props.schoolId+'/community-feed':'/schools/'+props.schoolId+(manage()?'/community-posts':'/community-feed');
    const transport=(path:string,options?:RequestInit)=>(props.request||request)(path,options);
    async function run(action:()=>Promise<void>):Promise<void>{if(s.busy)return;s.busy=true;s.error='';s.notice='';try{await action();}catch(error){s.error=error instanceof Error?error.message:String(error);}finally{s.busy=false;}}
    async function load():Promise<void>{
      if(!props.schoolId&&!props.portalMode)return;
      const params=new URLSearchParams({page:String(s.page),page_size:props.compact?'4':'12',q:s.q,kind:s.kind,...(manage()?{status:s.status}:{upcoming:String(s.upcoming)})});
      const result=await transport(endpoint()+'?'+params) as Page;s.items=result.items;s.total=result.total;
    }
    async function search():Promise<void>{s.page=1;await run(load);}
    async function page(delta:number):Promise<void>{s.page+=delta;await run(load);}
    function open(post:Post):void{s.selected=post;s.error='';}
    function edit(post?:Post):void{
      s.form=post?{id:post.id,version:post.version||1,title:post.title,summary:post.summary,content:post.content,kind:post.kind,audience:post.audience,status:post.status||'draft',pinned:post.pinned,publish_at:local(post.publish_at),expires_at:local(post.expires_at),event_start:local(post.event_start),event_end:local(post.event_end),location:post.location}:empty();
      s.initial=JSON.stringify(s.form);s.editing=true;s.discard=false;s.deleteConfirm=false;s.selected=null;s.error='';
    }
    function closeEditor(force=false):void{if(s.busy)return;if(!force&&JSON.stringify(s.form)!==s.initial){s.discard=true;return;}s.editing=false;s.discard=false;s.deleteConfirm=false;}
    async function save():Promise<void>{await run(async()=>{
      const {id,version,...form}=s.form;const stamp=(value:string)=>value?value+':00-03:00':null;
      const payload={...form,publish_at:stamp(form.publish_at),expires_at:stamp(form.expires_at),event_start:form.kind==='event'?stamp(form.event_start):null,event_end:form.kind==='event'?stamp(form.event_end):null,location:form.kind==='event'?form.location:'',...(id?{version}:{})};
      await transport('/schools/'+props.schoolId+'/community-posts'+(id?'/'+id:''),{method:id?'PATCH':'POST',body:JSON.stringify(payload)});
      s.editing=false;await load();s.notice=form.status==='published'?(form.publish_at&&new Date(payload.publish_at as string)>new Date()?'Publicação agendada.':'Publicação disponível para o público selecionado.'):form.status==='archived'?'Publicação arquivada.':'Rascunho salvo.';
    });}
    async function remove():Promise<void>{await run(async()=>{if(!s.deleteConfirm||!s.form.id)return;await transport('/schools/'+props.schoolId+'/community-posts/'+s.form.id+'?version='+s.form.version,{method:'DELETE'});s.editing=false;await load();s.notice='Rascunho excluído.';});}
    const scheduled=(post:Post)=>post.status==='published'&&Boolean(post.publish_at)&&new Date(post.publish_at as string)>new Date();
    const expired=(post:Post)=>Boolean(post.expires_at)&&new Date(post.expires_at as string)<=new Date();
    const paragraphs=(value:string)=>value.split(/\n\s*\n/).filter(Boolean);
    Vue.onMounted(()=>{void run(load);});
    return {s,props,manage,run,load,search,page,open,edit,closeEditor,save,remove,date,audienceLabels,statusLabels,scheduled,expired,paragraphs};
  }};
}
