namespace PigeAutoPix {
  type Requester = <T>(path:string,options?:RequestInit)=>Promise<T>;
  interface Authorization {
    id:string; version:number; status:string; frequency:string; payload?:string;
    encoded_image?:string; expires_at?:string;
    cycles:{id:string;amount:string;due_on:string;status:string;instruction_status:string}[];
  }
  interface View {
    can_enroll:boolean; quote:string; amount:string; terms_version:string; terms:string;
    authorization:Authorization|null;
  }
  interface Panel {
    id:string; busy:boolean; error:string; view:View|null; accepted:boolean; frequency:string; confirmCancel:boolean;
  }
  const frequencies:Record<string,string> = {WEEKLY:'Semanal',MONTHLY:'Mensal',QUARTERLY:'Trimestral',SEMIANNUALLY:'Semestral',ANNUALLY:'Anual'};
  const labels:Record<string,string> = {PREPARING:'Em preparação',CREATED:'Aguardando o banco',ACTIVE:'Ativa',
    CANCELLING:'Cancelamento solicitado',CANCELLED:'Cancelada',REFUSED:'Recusada',EXPIRED:'Expirada',
    QUEUED:'Na fila',CREATING:'Em emissão',WAITING:'Aguardando confirmação',RECEIVED:'Recebimento confirmado',
    RELEASED:'Via anterior disponível para reativação pela Secretaria',PREVIOUS_RECEIVED:'Pagamento confirmado na via anterior',
    RESTORE_REVIEW:'Conferência bancária após restauração',SKIPPED:'Pagamento pontual',AWAITING_REQUEST:'Aguardando envio',SCHEDULED:'Agendada',DONE:'Processada'};
  export function use(request:Requester,student:()=>string) {
    let epoch = 0;
    const state=Vue.reactive<Panel>({id:'',busy:false,error:'',view:null,accepted:false,frequency:'MONTHLY',confirmCancel:false});
    function clear():void {
      epoch++;
      Object.assign(state,{id:'',busy:false,error:'',view:null,accepted:false,frequency:'MONTHLY',confirmCancel:false});
    }
    async function send(id:string,action='',body?:Record<string,unknown>):Promise<void> {
      if(!id || !student() || (state.busy && state.id===id))return;
      const sid=student(), current=++epoch;
      state.id=id;state.busy=true;state.error='';
      try {
        const path='/family/students/'+encodeURIComponent(sid)+'/charges/'+encodeURIComponent(id)+'/pix-automatic';
        const view=await request<View>(path+(action?'/'+action:''),action?{method:'POST',body:JSON.stringify(body||{})}:{});
        if(epoch!==current || student()!==sid)return;
        state.view=view;state.accepted=false;state.confirmCancel=false;
      } catch(error) {
        if(epoch===current && student()===sid)state.error=error instanceof Error?error.message:'Não foi possível consultar a cobrança.';
      } finally {if(epoch===current)state.busy=false;}
    }
    function open(id:string) {
      if(state.id===id){clear();return;}
      clear();void send(id);
    }
    function enroll() {
      const v=state.view;
      if(!v?.can_enroll || !state.accepted)return;
      return send(state.id,'enroll',{quote:v.quote,terms_version:v.terms_version,frequency:state.frequency,accepted:true});
    }
    function cancel() {
      if(!state.confirmCancel || !state.view?.authorization)return;
      return send(state.id,'cancel',{version:state.view.authorization.version});
    }
    const label=(value:string)=>labels[value]||value;
    const money=(value:string)=>Number(value).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    return {state,clear,open,enroll,cancel,refresh:()=>send(state.id,'refresh'),reload:()=>send(state.id),frequencies,label,money};
  }
}
