/** Identidade pública da escola. Sem segredos, rotas bancárias ou seleção de cliente. */
namespace PigeInstitution {
  export interface Identity {
    display_name:string; short_name:string; primary_color:string; secondary_color:string;
    font_family:string; logo_url:string; font_configured:boolean; version:number; app_version?:string; configured?:boolean;
  }
  const initial = (()=>{
    try{return JSON.parse(document.querySelector('#institution-bootstrap')?.textContent||'null') as Identity|null;}catch{return null;}
  })();
  let hydrated=Boolean(initial);
  export const state = Vue.reactive<Identity>({display_name:'Sua escola',short_name:'Escola',primary_color:'#006D77',secondary_color:'#0D1B2A',font_family:'system',logo_url:'',font_configured:false,version:1,...(initial||{})});
  export function apply(value:Identity):void {
    Object.assign(state,value);
    document.title=value.display_name+' · '+(location.pathname==='/online.html'?'Portal dos responsáveis':'Gestão escolar');
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content',value.primary_color);
    const theme=document.querySelector<HTMLLinkElement>('link[data-institution-theme]');
    if(theme && !theme.href.endsWith('/api/v1/institution/theme.css?v='+value.version))theme.href='/api/v1/institution/theme.css?v='+value.version;
    document.querySelectorAll<HTMLLinkElement>('link[rel="icon"],link[rel="apple-touch-icon"]').forEach(link=>{
      link.href='/api/v1/institution/icon.png?size='+(link.rel==='apple-touch-icon'?'180':'32')+'&v='+value.version;
    });
    const manifest=document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if(manifest)manifest.href='/manifest.webmanifest?v='+value.version;
  }
  export async function load():Promise<void> {
    if(hydrated){hydrated=false;apply(state);return;}
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
    try {
      const response=await fetch('/api/v1/institution/identity',{credentials:'same-origin',cache:'no-store',signal:controller.signal});
      if(response.ok)apply(await response.json() as Identity);
    } catch { /* Mantém a última identidade pública; não exibe marca do fornecedor. */ } finally{clearTimeout(timer);}
  }
}
