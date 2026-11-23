namespace PigeSupport {
  export type Area='online_enrollment'|'student_portal'|'teacher_portal'|'guardian_portal'|'internal'|'login'|'news';
  interface WidgetConfig {
    enabled:boolean; base_url:string; website_token:string;
    position:string; type:string; launcherTitle:string;
  }
  interface HubSDK {
    run:(options:{websiteToken:string;baseUrl:string})=>void;
    destroy?:(options?:{clearSession?:boolean})=>void;
  }
  interface HubWindow extends Window {
    hubSettings?: {position:string;type:string;launcherTitle:string};
    hubSDK?:HubSDK;
    $hub?:{hasLoaded?:boolean};
  }
  const runtime=window as HubWindow;
  export const status=Vue.reactive({error:''});
  const busyMessage='O atendimento recebeu muitas solicitações. Aguarde antes de tentar novamente.';
  const roots='#hub-widget-holder,#hub-bubble-holder';
  let loadedSource='',activeScope='',sdkSource='',sessionSource='';
  let pending:{context:string;promise:Promise<void>}|null=null;
  let sdkQueue:Promise<void>=Promise.resolve();
  let script:HTMLScriptElement|null=null,activeSDK:HubSDK|null=null,lastSDK:HubSDK|null=null;
  let generation=0,retryAt=0,startupTimer:number|undefined;
  let recovery:HTMLButtonElement|null=null,checkingArea=false,retryArea:(()=>void)|null=null;
  let visibilityStyle:HTMLStyleElement|null=null;
  let listeningReady=false;
  function setChecking(checking:boolean):void {
    checkingArea=checking;
    visibilityStyle?.remove();visibilityStyle=null;
    if(checking){
      visibilityStyle=document.createElement('style');
      visibilityStyle.textContent=roots+'{display:none!important}';
      document.head.appendChild(visibilityStyle);
    }
    if(recovery)recovery.hidden=checking;
  }
  function cancelStartup(stopListening=true):void {
    if(startupTimer!==undefined){
      window.clearTimeout(startupTimer);
    }
    startupTimer=undefined;
    if(stopListening&&listeningReady){window.removeEventListener('hub:ready',onReady);listeningReady=false;}
  }
  function onReady():void {
    if(!activeSDK||!runtime.$hub?.hasLoaded)return;
    cancelStartup();recovery?.remove();recovery=null;status.error='';
  }
  function release(clearSession=false):void {
    cancelStartup();recovery?.remove();recovery=null;
    // O SDK remove apenas seus próprios elementos e listeners no documento atual.
    (activeSDK||(clearSession?lastSDK:null))?.destroy?.({clearSession});
    if(clearSession){lastSDK=null;sessionSource='';}
    activeSDK=null;loadedSource='';
  }
  export function dispose():void {
    ++generation;pending=null;retryAt=0;retryArea=null;
    release(true);activeScope='';setChecking(false);status.error='';
  }
  function offerRecovery(config:WidgetConfig,message:string):void {
    if(recovery)return;
    cancelStartup(false);status.error=message;
    const button=document.createElement('button');
    button.dataset.pigeSupportRecovery='true';button.type='button';
    button.textContent=(config.launcherTitle||'Suporte')+': tentar novamente';button.title=message;
    const side=config.position==='right'?'right':'left';
    button.style.cssText=`position:fixed;${side}:max(1rem,env(safe-area-inset-${side}));bottom:max(1rem,env(safe-area-inset-bottom));z-index:2147483000;max-width:calc(100vw - 2rem);padding:.7rem 1rem;border:0;border-radius:999px;background:#174576;color:#fff;font:600 1rem/1.35 system-ui;cursor:pointer;`;
    button.hidden=checkingArea;
    button.addEventListener('click',()=>{
      if(checkingArea||recovery!==button)return;
      const retry=retryArea;release();retry?.();
    });
    recovery=button;document.body.appendChild(button);
  }
  function loadSDK(baseUrl:string):Promise<void> {
    // Serializa downloads: um script antigo não pode sobrescrever o SDK novo.
    const task=sdkQueue.catch(()=>{}).then(()=>{
      if(sdkSource===baseUrl&&runtime.hubSDK)return;
      return new Promise<void>((resolve,reject)=>{
        script?.remove();
        const element=document.createElement('script');script=element;
        element.dataset.pigeSupportHub='true';
        element.src=baseUrl+'/packs/js/sdk.js';element.defer=true;element.async=true;
        element.onload=()=>{sdkSource=baseUrl;resolve();};
        element.onerror=()=>{sdkSource='';element.remove();reject(new Error('SDK indisponível'));};
        document.head.appendChild(element);
      });
    });
    sdkQueue=task;
    return task;
  }
  export async function load(schoolId='',area:Area='login',sessionKey='public'):Promise<void> {
    const scope=JSON.stringify([schoolId,sessionKey]),context=JSON.stringify([scope,area]);
    if(scope!==activeScope){dispose();activeScope=scope;}
    if(pending?.context===context)return pending.promise;
    pending=null;
    const request=++generation;
    setChecking(true);
    if(!schoolId&&area!=='login'){release();setChecking(false);return;}
    if(Date.now()<retryAt){release();setChecking(false);status.error=busyMessage;return;}
    status.error='';
    const promise=loadArea(schoolId,area,scope,request,()=>{void load(schoolId,area,sessionKey);});
    pending={context,promise};
    try{await promise;}finally{if(pending?.promise===promise)pending=null;}
  }
  async function loadArea(schoolId:string,area:Area,scope:string,request:number,retry:()=>void):Promise<void> {
    let config:WidgetConfig|null=null;
    try{
      const path=schoolId?'/api/v1/schools/'+encodeURIComponent(schoolId)+'/support-widget?area='+encodeURIComponent(area):'/api/v1/support-widget';
      const response=await fetch(path,{credentials:'same-origin',cache:'no-store'});
      if(request!==generation)return;
      if(response.status===429){
        const header=response.headers.get('Retry-After')?.trim()||'';
        const delay=/^\d+$/.test(header)?Number(header)*1000:Date.parse(header)-Date.now();
        retryAt=Date.now()+(Number.isFinite(delay)&&delay>=0?delay:60000);
        release();setChecking(false);status.error=busyMessage;return;
      }
      if(response.ok)config=await response.json() as WidgetConfig;
    }catch{/* Indisponibilidade do atendimento não bloqueia o formulário. */}
    if(request!==generation)return;
    retryArea=retry;
    if(!config?.enabled||!config.base_url||!config.website_token){release();setChecking(false);return;}
    let baseUrl:string;
    try{
      const url=new URL(config.base_url);
      if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw new Error('URL inválida');
      baseUrl=url.href.replace(/\/+$/,'');
    }catch{release();setChecking(false);status.error='Revise o endereço configurado para o atendimento.';return;}
    const sourceKey=JSON.stringify([scope,baseUrl,config.website_token,config.position,config.type,config.launcherTitle]);
    const sessionKey=JSON.stringify([scope,baseUrl,config.website_token]);
    if(sourceKey===loadedSource&&activeSDK){setChecking(false);if(recovery)status.error=recovery.title;return;}
    release(sessionSource!==''&&sessionKey!==sessionSource);
    try{
      await loadSDK(baseUrl);
      if(request!==generation)return;
      const sdk=runtime.hubSDK;
      // O descarte é necessário para trocar escola/conta sem manter a conversa anterior.
      if(!sdk?.run||!sdk.destroy){sdkSource='';throw new Error('SDK sem descarte');}
      runtime.hubSettings={position:config.position||'left',type:config.type||'expanded_bubble',launcherTitle:config.launcherTitle||'Suporte'};
      activeSDK=sdk;lastSDK=sdk;loadedSource=sourceKey;sessionSource=sessionKey;
      window.addEventListener('hub:ready',onReady);
      listeningReady=true;
      startupTimer=window.setTimeout(()=>offerRecovery(config!,
        'O atendimento não ficou pronto nesta página. Tente novamente.'),15000);
      sdk.run({websiteToken:config.website_token,baseUrl});
      setChecking(false);
      if(runtime.$hub?.hasLoaded)onReady();
    }catch{
      if(request!==generation)return;
      release();setChecking(false);
      offerRecovery(config,'O atendimento não iniciou. Confira se o SDK do HUB está atualizado e tente novamente.');
    }
  }
  window.addEventListener('pagehide',()=>{++generation;release();setChecking(false);});
}
