namespace PigeSupport {
  interface WidgetConfig {
    enabled:boolean; base_url:string; website_token:string;
    position:string; type:string; launcherTitle:string;
  }
  interface HubWindow extends Window {
    hubSettings?: {position:string;type:string;launcherTitle:string};
    hubSDK?: {run:(options:{websiteToken:string;baseUrl:string})=>void;destroy?:()=>void};
  }
  export const status=Vue.reactive({error:''});
  let loadedSource='';
  let script:HTMLScriptElement|null=null;
  let generation=0;
  async function fetchConfig(schoolId=''):Promise<WidgetConfig|null> {
    const path=schoolId?'/api/v1/schools/'+encodeURIComponent(schoolId)+'/support-widget':'/api/v1/support-widget';
    try {
      const response=await fetch(path,{credentials:'same-origin',cache:'no-store'});
      return response.ok?await response.json() as WidgetConfig:null;
    } catch { return null; }
  }
  function release():void {
    // Somente utiliza a API de descarte quando oferecida pelo próprio SDK.
    try {(window as HubWindow).hubSDK?.destroy?.();}catch{/* Atendimento não bloqueia o cadastro. */}
    script?.remove();script=null;loadedSource='';
  }
  export async function load(schoolId=''):Promise<void> {
    const request=++generation,config=await fetchConfig(schoolId);
    if(request!==generation||!config)return;
    status.error='';
    if(!config.enabled||!config.base_url||!config.website_token){release();return;}
    let baseUrl:string;
    try {
      const url=new URL(config.base_url);
      if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw new Error('URL inválida');
      baseUrl=url.href.replace(/\/+$/,'');
    } catch {status.error='Revise a URL do HUB na configuração de atendimento.';return;}
    const sourceKey=[baseUrl,config.website_token,config.position,config.type,config.launcherTitle].join('|');
    if(sourceKey===loadedSource&&script)return;
    if(script)release();
    const runtime=window as HubWindow;
    runtime.hubSettings={position:config.position||'left',type:config.type||'expanded_bubble',launcherTitle:config.launcherTitle||'Suporte'};
    const element=document.createElement('script');
    element.dataset.pigeSupportHub='true';element.src=baseUrl+'/packs/js/sdk.js';
    element.defer=true;element.async=true;
    element.onload=()=>{
      if(script!==element)return;
      try {
        const sdk=(window as HubWindow).hubSDK;
        if(!sdk?.run)throw new Error('SDK indisponível');
        sdk.run({websiteToken:config.website_token,baseUrl});
      } catch {
        status.error='O SDK do HUB não iniciou. Verifique a URL, o website token e os cabeçalhos do servidor de atendimento.';
        release();
      }
    };
    element.onerror=()=>{
      if(script!==element)return;
      status.error='Não foi possível carregar o SDK do HUB. O atendimento está indisponível; os cadastros continuam funcionando.';
      release();
    };
    loadedSource=sourceKey;script=element;document.head.appendChild(element);
  }
}
