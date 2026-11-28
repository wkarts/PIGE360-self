/** Caixa pessoal já vinculada à conta escolar. O SOGo autentica pelo proxy da própria origem. */
namespace PigePortalMail {
  type Requester = <T>(path:string, options?:RequestInit) => Promise<T>;
  type Account = {available:boolean; connected:boolean; address:string; can_auto_connect:boolean; connection_error:string};
  const base = (school:string) => '/schools/'+encodeURIComponent(school)+'/email';

  export function use(request:Requester) {
    const state=Vue.reactive({available:false});
    let version=0;
    function clear(){version++;state.available=false;}
    async function load(school:string){
      clear();
      const current=version;
      if(!school)return;
      try{
        const account=await request<Account>(base(school)+'/account');
        if(current===version)state.available=account.available===true;
      }catch{/* A indisponibilidade do e-mail não interrompe a rotina escolar. */}
    }
    return {state,clear,load,request};
  }

  export const component={props:['schoolId','request'],render:PigeRenders.portalMail,setup(props:{schoolId:string;request:Requester}){
    const m=Vue.reactive({busy:false,opening:false,error:'',password:'',address:'',needsPassword:false});
    const frame=Vue.reactive({src:'about:blank'});
    let active=true, timer:number|undefined;
    async function open(connect=false){
      if(m.busy||m.opening)return;
      m.busy=true;m.error='';
      frame.src='about:blank';
      const password=m.password;
      m.password='';
      try{
        const path=base(props.schoolId);
        let account=await props.request<Account>(path+'/account');
        if(!active)return;
        if(!account.available)throw new Error('Sua caixa institucional está indisponível. Consulte a secretaria.');
        m.address=account.address;
        if(connect){
          account=await props.request<Account>(path+'/connection/linked',{method:'POST',body:JSON.stringify({password})});
        }else if(account.can_auto_connect){
          account=await props.request<Account>(path+'/connection/automatic',{method:'POST'});
        }
        if(!active)return;
        m.needsPassword=!account.connected&&!account.can_auto_connect;
        if(!account.connected){
          m.error=account.connection_error||(!m.needsPassword?'A conexão ainda está sendo preparada. Tente novamente em instantes.':'');
          return;
        }
        const result=await props.request<{action:string;ticket:string}>(path+'/webmail-ticket',{method:'POST'});
        if(!active)return;
        const action='/webmail/'+encodeURIComponent(props.schoolId)+'/launch';
        if(result.action!==action||!result.ticket)throw new Error('Não foi possível iniciar a sessão de e-mail.');
        // Navegação de formulários pode enviar Origin:null em páginas com no-referrer.
        // O POST de mesma origem recebe o cookie HttpOnly antes de navegar o quadro.
        const launch=await fetch(action,{
          method:'POST',body:new URLSearchParams({ticket:result.ticket}),credentials:'same-origin',
          mode:'same-origin',redirect:'manual',referrerPolicy:'same-origin',cache:'no-store'
        });
        if(!active)return;
        if(launch.type!=='opaqueredirect')throw new Error('O webmail não aceitou o convite de sessão. Tente abrir a caixa novamente.');
        frame.src=action.replace(/launch$/,'SOGo/');
        m.opening=true;
        timer=window.setTimeout(()=>{if(active&&m.opening){m.opening=false;m.error='O webmail demorou para responder. Tente abrir a caixa novamente.';}},30000);
      }catch(error){if(active){m.opening=false;m.error=error instanceof Error?error.message:'Não foi possível abrir sua caixa institucional.';}}
      finally{if(active)m.busy=false;}
    }
    function loaded(event:Event){
      if(!active)return;
      const page=(event.target as HTMLIFrameElement).contentDocument;
      if(!page||page.URL==='about:blank')return;
      window.clearTimeout(timer);m.opening=false;
      if(page.contentType==='application/json'||page.contentType==='text/plain'){
        m.error='O webmail não pôde carregar. Tente abrir a caixa novamente.';
        if(page.contentType==='application/json'){
          try{const {detail}=JSON.parse(page.body.innerText);if(typeof detail==='string')m.error=detail;}catch{/* resposta sem detalhe */}
        }
      }
    }
    Vue.onMounted(()=>{void open();});
    Vue.onUnmounted(()=>{active=false;window.clearTimeout(timer);m.password='';});
    return {m,frame,open,loaded};
  }};
}
