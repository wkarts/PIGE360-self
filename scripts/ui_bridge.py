"""Harness local explícito: UI Vue real e API real por HTTPX, sem simular respostas.
Não substitui navegação HTTP, cookies nativos, download nativo, CSP ou instalação PWA.
Somente para testes em navegador com navegação de URLs desabilitada por política.
"""
import base64
import json
import mimetypes
from pathlib import Path
import httpx

def install(page, root, url, output, entry="app", campaign=""):
    if entry not in ("app","portal"): raise ValueError("Entrada de teste inválida.")
    client=httpx.Client(base_url=url, timeout=30)
    def request(data):
        target=data['url']
        if not target.startswith('/api/'):
            raise ValueError('O harness só encaminha a API local de teste.')
        kw={'headers':data.get('headers',{})}
        if data.get('form') is not None:
            kw['data']={x['key']:x['value'] for x in data['form'] if 'value' in x}
            kw['files']=[(x['key'],(x['filename'],base64.b64decode(x['base64']),x['mime'])) for x in data['form'] if 'base64' in x]
        elif data.get('body') is not None:kw['content']=data['body']
        r=client.request(data.get('method','GET'),target,**kw)
        return {'status':r.status_code,'headers':dict(r.headers),'base64':base64.b64encode(r.content).decode()}
    def capture(data):
        filename=Path(data['name']).name
        (output/filename).write_bytes(base64.b64decode(data['base64']))
        return filename
    page.expose_function('__localApiTest',request)
    page.expose_function('__captureDownloadTest',capture)
    page.set_content('<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="' + entry + '"></div></body></html>')
    page.add_style_tag(content=(root/'frontend/dist/branding/pige360/tokens.css').read_text())
    page.add_style_tag(content=(root/'frontend/dist/app.css').read_text())
    # Mesmos estilos locais da entrada administrativa, sem requisição externa.
    for name in ['institution-layout.css', 'workspace.css', 'mfa.css', 'dossier.css']:
        asset=root/'frontend/dist'/name
        if asset.exists():page.add_style_tag(content=asset.read_text())
    icons=root/'frontend/dist/ui-icons.svg'
    if icons.exists():
        page.evaluate("svg => { const el=document.createElement('div');el.hidden=true;el.innerHTML=svg;document.body.appendChild(el); }",icons.read_text())
        page.add_script_tag(content="""new MutationObserver(()=>{for(const icon of document.querySelectorAll('use')) {
          const href=icon.getAttribute('href');if(href?.startsWith('/ui-icons.svg#'))icon.setAttribute('href',href.slice('/ui-icons.svg'.length));
        }}).observe(document.body,{childList:true,subtree:true});""")
    # Usa os mesmos bytes oficiais, incorporados apenas no harness de inspeção.
    # Não navega para URLs bloqueadas nem altera qualquer política do navegador.
    images={}
    for asset in (root/'frontend/dist/branding/pige360').glob('*.png'):
        images['/branding/pige360/'+asset.name]='data:image/png;base64,'+base64.b64encode(asset.read_bytes()).decode()
    page.add_script_tag(content='const localInspectionImages='+json.dumps(images)+''';
      new MutationObserver(()=>{for(const image of document.querySelectorAll('img')) {
        const source=image.getAttribute('src');if(localInspectionImages[source])image.src=localInspectionImages[source];
      }}).observe(document.documentElement,{childList:true,subtree:true});
    ''')
    page.add_script_tag(content='''
window.__downloads=[];const storageMap=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>storageMap.get(k)||null,setItem:(k,v)=>storageMap.set(k,String(v)),removeItem:k=>storageMap.delete(k)}});
history.replaceState=()=>{};
const nativeFetch=window.fetch.bind(window);const blobs=new Map();
const nativeCreate=URL.createObjectURL.bind(URL);URL.createObjectURL=(b)=>{const u=nativeCreate(b);blobs.set(u,b);return u;};
const oldClick=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){
 const b=blobs.get(this.href);if(b&&this.download){const name=this.download; b.arrayBuffer().then(a=>{const bytes=new Uint8Array(a);let s='';for(const v of bytes)s+=String.fromCharCode(v);return window.__captureDownloadTest({name,base64:btoa(s)});}).then(name=>window.__downloads.push(name));return;}
 oldClick.call(this);
};
window.fetch=async(input,options={})=>{
 const url=String(input);if(!url.startsWith('/api/'))return nativeFetch(input,options);
 const headers=Object.fromEntries(new Headers(options.headers||{}).entries());const payload={url,method:options.method||'GET',headers};
 if(options.body instanceof FormData){payload.form=[];for(const [key,v] of options.body.entries()){
   if(v instanceof File){const bytes=new Uint8Array(await v.arrayBuffer());let s='';for(const b of bytes)s+=String.fromCharCode(b);payload.form.push({key,filename:v.name,mime:v.type,base64:btoa(s)});}
   else payload.form.push({key,value:v});
 }}else if(options.body)payload.body=options.body;
 const r=await window.__localApiTest(payload);const bytes=Uint8Array.from(atob(r.base64),c=>c.charCodeAt(0));
 return new Response(bytes,{status:r.status,headers:r.headers});
};
''')
    if campaign:
        page.add_script_tag(content='history.replaceState=()=>{}; window.__testCampaign='+json.dumps(campaign)+';')
    for name in ['vendor/vue-3.5.13.global.prod.js','renders.js',entry+'.js']:
        page.add_script_tag(content=(root/'frontend/dist'/name).read_text())
    return client
