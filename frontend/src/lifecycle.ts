/** Prévia transacional para arquivar, restaurar ou excluir um cadastro. */
namespace PigeLifecycle {
  export type Target={resource:string;id:string};
  type Impact={label:string;count:number;key?:string};
  type Preview={resource:string;id:string;label:string;kind:string;version:number;archived:boolean;archived_at:string|null;archive_reason:string;dependencies:Impact[];owned_records:Impact[];archive_allowed:boolean;archive_blocks:Impact[];restore_allowed:boolean;restore_blocks:Impact[];delete_allowed:boolean;delete_permission:boolean;delete_note:string;preserves_person:boolean;confirmation:string};
  type Action='archive'|'restore'|'delete';
  type Props={schoolId:string;target:Target};
  type Context={emit:(name:string,payload?:unknown)=>void};
  export const component={props:['schoolId','target'],emits:['completed','close'],render:PigeRenders.lifecycle,setup(props:Props,context:Context){
    const s=Vue.reactive({busy:false,error:'',preview:null as Preview|null,action:'archive' as Action,reason:'',confirmation:'',acknowledged:false});
    const endpoint=()=>'/schools/'+encodeURIComponent(props.schoolId)+'/record-lifecycle/'+encodeURIComponent(props.target.resource)+'/'+encodeURIComponent(props.target.id);
    const allowed=()=>Boolean(s.preview?.[s.action+'_allowed' as 'archive_allowed'|'restore_allowed'|'delete_allowed']);
    const caption=()=>s.action==='delete'?'Excluir definitivamente':s.action==='restore'?'Restaurar cadastro':'Arquivar cadastro';
    async function load():Promise<void>{
      s.busy=true;s.error='';
      try{s.preview=await PigeAPI.request<Preview>(endpoint());s.action=s.preview.archived?'restore':'archive';s.acknowledged=false;s.confirmation='';}
      catch(error){s.error=error instanceof Error?error.message:'Não foi possível conferir os vínculos deste cadastro.';}
      finally{s.busy=false;}
    }
    function choose(action:Action):void{s.action=action;s.acknowledged=false;s.confirmation='';s.error='';}
    function close():void{if(!s.busy)context.emit('close');}
    async function submit():Promise<void>{
      if(s.busy||!s.preview||!allowed())return;
      if(s.reason.trim().length<3){s.error='Informe o motivo com pelo menos 3 caracteres.';return;}
      if(!s.acknowledged){s.error='Confirme que conferiu os efeitos desta operação.';return;}
      if(s.action==='delete'&&s.confirmation!==s.preview.confirmation){s.error='Digite o nome completo do cadastro para confirmar.';return;}
      s.busy=true;s.error='';
      try{const result=await PigeAPI.post<{action:Action;resource:string;id:string;message:string}>(endpoint(),{action:s.action,version:s.preview.version,reason:s.reason.trim(),confirmation:s.confirmation});context.emit('completed',result);}
      catch(error){s.error=error instanceof Error?error.message:'Não foi possível concluir a operação. Atualize a prévia e tente novamente.';}
      finally{s.busy=false;}
    }
    Vue.onMounted(()=>{void load();});
    return{s,allowed,caption,choose,close,load,submit};
  }};
}
