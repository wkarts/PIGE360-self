namespace PigeSupport {
  export type Area='online_enrollment'|'student_portal'|'teacher_portal'|'guardian_portal'|'internal'|'login'|'news';
  interface WidgetConfig {
    enabled:boolean; base_url:string; website_token:string;
    position:string; type:string; launcherTitle:string;
  }
  interface HubWindow extends Window {
    hubSettings?: {position:string;type:string;launcherTitle:string};
    hubSDK?: {run:(options:{websiteToken:string;baseUrl:string})=>void;destroy?:()=>void};
  }
  export const status=Vue.reactive({error:''});
  let loadedSource='',activeContext='';
  let frame:HTMLIFrameElement|null=null;
  let observer:MutationObserver|null=null;
  let viewportTimer:number|undefined;
  let generation=0;
  function release():void {
    observer?.disconnect();observer=null;
    if(viewportTimer!==undefined)window.clearInterval(viewportTimer);
    viewportTimer=undefined;
    const previous=frame;frame=null;loadedSource='';
    // O SDK executa em outro documento. Remover esse contexto encerra seus
    // timers, listeners, iframes e DOM mesmo quando ele não oferece destroy.
    try{(previous?.contentWindow as HubWindow|null)?.hubSDK?.destroy?.();}catch{/* Atendimento não bloqueia a aplicação. */}
    previous?.remove();
  }
  export function dispose():void {++generation;activeContext='';release();status.error='';}
  function clipWidget(element:HTMLIFrameElement):void {
    if(frame!==element)return;
    const doc=element.contentDocument,win=element.contentWindow;
    if(!doc||!win)return;
    let left=win.innerWidth,top=win.innerHeight,right=0,bottom=0;
    // Recorta o documento do SDK à bolha/painel visível. A área transparente
    // não intercepta cliques, scroll ou campos da página da escola.
    for(const node of Array.from(doc.querySelectorAll<HTMLElement>('iframe,button,[role="button"],[class*="bubble-holder"],[class*="launcher"]'))){
      let visible=true;
      for(let ancestor:Element|null=node;ancestor&&ancestor!==doc.documentElement;ancestor=ancestor.parentElement){
        const css=win.getComputedStyle(ancestor);
        if(css.display==='none'||css.visibility==='hidden'||Number(css.opacity)===0){visible=false;break;}
      }
      if(!visible)continue;
      const rect=node.getBoundingClientRect();
      if(rect.width<2||rect.height<2||rect.right<=0||rect.bottom<=0||rect.left>=win.innerWidth||rect.top>=win.innerHeight)continue;
      left=Math.min(left,Math.max(0,rect.left-4));top=Math.min(top,Math.max(0,rect.top-4));
      right=Math.max(right,Math.min(win.innerWidth,rect.right+4));bottom=Math.max(bottom,Math.min(win.innerHeight,rect.bottom+4));
    }
    element.style.clipPath=right>left&&bottom>top?`inset(${top}px ${Math.max(0,win.innerWidth-right)}px ${Math.max(0,win.innerHeight-bottom)}px ${left}px)`:'inset(100%)';
    element.style.visibility=right>left&&bottom>top?'visible':'hidden';
  }
  export async function load(schoolId='',area:Area='login',sessionKey='public'):Promise<void> {
    const context=[schoolId,area,sessionKey].join('|');
    if(context!==activeContext){release();activeContext=context;}
    const request=++generation;
    status.error='';
    if(!schoolId&&area!=='login'){release();return;}
    let config:WidgetConfig|null=null;
    try{
      const path=schoolId?'/api/v1/schools/'+encodeURIComponent(schoolId)+'/support-widget?area='+encodeURIComponent(area):'/api/v1/support-widget';
      const response=await fetch(path,{credentials:'same-origin',cache:'no-store'});
      if(response.ok)config=await response.json() as WidgetConfig;
    }catch{/* Indisponibilidade do atendimento não bloqueia o formulário. */}
    if(request!==generation)return;
    if(!config?.enabled||!config.base_url||!config.website_token){release();return;}
    let baseUrl:string;
    try{
      const url=new URL(config.base_url);
      if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw new Error('URL inválida');
      baseUrl=url.href.replace(/\/+$/,'');
    }catch{release();status.error='Revise o endereço configurado para o atendimento.';return;}
    const sourceKey=[context,baseUrl,config.website_token,config.position,config.type,config.launcherTitle].join('|');
    if(sourceKey===loadedSource&&frame)return;
    release();
    const element=document.createElement('iframe');
    element.dataset.pigeSupportFrame='true';element.title='Atendimento da instituição';
    element.tabIndex=-1;element.src='about:blank';
    element.style.cssText='position:fixed;inset:0;width:100%;height:100%;border:0;background:transparent;z-index:2147483000;clip-path:inset(100%);visibility:hidden;color-scheme:light;';
    frame=element;loadedSource=sourceKey;document.body.appendChild(element);
    const doc=element.contentDocument,runtime=element.contentWindow as HubWindow|null;
    if(!doc||!runtime){release();status.error='Não foi possível abrir o atendimento.';return;}
    doc.documentElement.lang='pt-BR';doc.documentElement.style.background='transparent';
    doc.body.style.cssText='margin:0;background:transparent;';
    runtime.hubSettings={position:config.position||'left',type:config.type||'expanded_bubble',launcherTitle:config.launcherTitle||'Suporte'};
    const sdk=doc.createElement('script');sdk.src=baseUrl+'/packs/js/sdk.js';sdk.defer=true;sdk.async=true;
    sdk.onload=()=>{
      if(frame!==element)return;
      try{
        if(!runtime.hubSDK?.run)throw new Error('SDK indisponível');
        runtime.hubSDK.run({websiteToken:config!.website_token,baseUrl});
        observer=new MutationObserver(()=>clipWidget(element));
        observer.observe(doc.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class','hidden']});
        viewportTimer=window.setInterval(()=>clipWidget(element),250);
        clipWidget(element);
      }catch{status.error='O atendimento não iniciou. Confira a configuração com o administrador.';release();}
    };
    sdk.onerror=()=>{if(frame!==element)return;status.error='O atendimento está indisponível. Tente novamente mais tarde.';release();};
    doc.head.appendChild(sdk);
  }
  window.addEventListener('pagehide',dispose);
}
