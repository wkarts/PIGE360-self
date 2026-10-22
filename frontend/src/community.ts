/** Notícias e agenda com transporte compartilhável entre gestão, portal e página pública. */
namespace PigeCommunity {
  export type Post={image?:SiteImage|null;id:string;school_id:string;version?:number;title:string;summary:string;content:string;kind:'news'|'event';audience:string;status?:string;pinned:boolean;publish_at:string|null;expires_at:string|null;event_start:string|null;event_end:string|null;location:string};
  type Page={items:Post[];total:number;page:number;page_size:number};
  type Transport=(path:string,options?:RequestInit)=>Promise<unknown>;
  type Props={schoolId:string;permissions?:string[];publicMode?:boolean;portalMode?:boolean;request?:Transport;compact?:boolean};
  const audienceLabels:Record<string,string>={public:'Público — qualquer visitante',authenticated:'Comunidade escolar autenticada',students:'Alunos',guardians:'Pais e responsáveis',teachers:'Professores'};
  const statusLabels:Record<string,string>={draft:'Rascunho',published:'Publicado',archived:'Arquivado'};
  const empty=()=>({image:null as SiteImage|null,id:'',version:1,title:'',summary:'',content:'',kind:'news' as 'news'|'event',audience:'authenticated',status:'draft',pinned:false,publish_at:'',expires_at:'',event_start:'',event_end:'',location:''});
  export async function request(path:string,options:RequestInit={}):Promise<unknown>{
    const response=await fetch('/api/v1'+path,{...options,credentials:'same-origin',cache:'no-store',headers:{...(options.body instanceof FormData?{}:{'Content-Type':'application/json'}),'X-CSRF-Protection':'1',...options.headers}});
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
  interface SiteImage {caption?:string;url:string;alt:string;focal_x:number;focal_y:number}
  interface SiteLink {label:string;url:string}
  interface SiteItem {eyebrow?:string;title:string;text:string;image:SiteImage|null;action:SiteLink|null}
  interface SiteSection {layout?:string;id:string;kind:string;visible:boolean;eyebrow:string;title:string;text:string;image:SiteImage|null;action:SiteLink|null;items:SiteItem[]}
  interface SitePage {model_origin?:string;show_contact_details?:boolean;slug:string;title:string;introduction:string;image:SiteImage|null;published:boolean;sections:SiteSection[]}
  interface SiteDesign {composition_version?:number;heading_style?:string;topline?:string;hero_caption?:string;demonstration?:boolean;pages:SitePage[];configured:boolean;header_sticky:boolean;mobile_actions:boolean;eyebrow:string;hero_image:SiteImage|null;hero_gallery:SiteImage[];primary_action:SiteLink|null;secondary_action:SiteLink|null;menu:SiteLink[];footer_text:string;sections:SiteSection[]}
  const newImage=():SiteImage=>({url:'',alt:'',focal_x:50,focal_y:50});
  const newLink=():SiteLink=>({label:'',url:''});
  const newItem=():SiteItem=>({title:'',text:'',image:null,action:null});
  const newDesign=():SiteDesign=>({pages:[],configured:false,header_sticky:false,mobile_actions:false,eyebrow:'',hero_image:null,hero_gallery:[],primary_action:null,secondary_action:null,menu:[],footer_text:'',sections:[]});
  const sectionLabels:Record<string,string>={cards:'Etapas e cartões',split:'Texto e fotografia',gallery:'Galeria de imagens',steps:'Jornada e passos',cta:'Convite e botão',news:'Notícias publicadas',agenda:'Agenda publicada',text:'Texto de conteúdo'};
  interface Website {has_checkpoint?:boolean;design?:SiteDesign;admission_url?:string;brand?:{display_name:string;primary_color:string;secondary_color:string;font_family:string};draft?:Record<string,unknown>|null;published_version?:number;version?:number;enabled:boolean;theme:string;headline:string;introduction:string;about:string;public_url:string;portal_url:string;notice:string}
  interface SiteModel {id:string;name:string;description:string;website:Partial<Website>}
  export const component={props:['schoolId','permissions','publicMode','portalMode','request','compact'],render:PigeRenders.community,setup(props:Props){
    const s=Vue.reactive({models:[] as SiteModel[],modelChoice:'horizon',resolvedModel:null as Website|null,modelPreviewInput:'',modelPreviewPage:'',modelPreviewActive:false,hasModelCheckpoint:false,demoConfirmed:false,sitePageIndex:-1,assets:[] as {id:string;url:string;sha256:string;created_at:string;thumbnail?:string}[],websiteInitial:'',sectionKind:'cards',previewHtml:'',previewWidth:'100%',publishedVersion:0,publishedUrl:'',published:false,hasDraft:false,website:{design:newDesign(),enabled:false,theme:'horizon',headline:'',introduction:'',about:'',public_url:'',portal_url:'',notice:'',admission_url:'',brand:{display_name:'',primary_color:'',secondary_color:'',font_family:''}} as Website,websiteOpen:false,busy:false,error:'',notice:'',items:[] as Post[],page:1,total:0,q:'',kind:'',status:'',upcoming:false,selected:null as Post|null,editing:false,discard:false,deleteConfirm:false,initial:'',form:empty()});
    const manage=()=>!props.publicMode&&!props.portalMode&&Boolean(props.permissions?.includes('schools.manage'));
    const endpoint=()=>props.portalMode?'/portal/community-feed':props.publicMode?'/public/schools/'+props.schoolId+'/community-feed':'/schools/'+props.schoolId+(manage()?'/community-posts':'/community-feed');
    const transport=(path:string,options?:RequestInit)=>(props.request||request)(path,options);
    async function run(action:()=>Promise<void>):Promise<void>{if(s.busy)return;s.busy=true;s.error='';s.notice='';try{await action();}catch(error){s.error=error instanceof Error?error.message:String(error);}finally{s.busy=false;}}
    async function load():Promise<void>{
      if(!props.schoolId&&!props.portalMode)return;
      const params=new URLSearchParams({page:String(s.page),page_size:props.compact?'4':'12',q:s.q,kind:s.kind,...(manage()?{status:s.status}:{upcoming:String(s.upcoming)})});
      const result=await transport(endpoint()+'?'+params) as Page;s.items=result.items;s.total=result.total;
    }
    async function loadWebsite():Promise<void>{if(manage()&&!props.compact){const data=await transport('/schools/'+props.schoolId+'/website') as {configuration:Website|null};if(data.configuration){const c=data.configuration;s.published=c.enabled;s.publishedVersion=c.published_version||0;s.publishedUrl=c.public_url;s.hasDraft=Boolean(c.draft);s.website={...s.website,...c,...(c.draft||{}),version:c.version};s.website.brand={display_name:'',primary_color:'',secondary_color:'',font_family:'',...s.website.brand};s.website.design={...newDesign(),...s.website.design};s.hasModelCheckpoint=Boolean(c.has_checkpoint);s.websiteInitial=JSON.stringify(websitePayload());}}}
    function websitePayload():Website{const {version,enabled,theme,headline,introduction,about,public_url,portal_url,notice,admission_url,brand,design}=s.website;return {version,enabled,theme,headline,introduction,about,public_url,portal_url,notice,admission_url,brand,design};}
    async function loadSiteAssets():Promise<void>{await run(async()=>{const data=await transport('/schools/'+props.schoolId+'/website/assets') as {items:typeof s.assets};s.assets=data.items;});}
    async function removeSiteAsset(asset:{id:string}):Promise<void>{if(!window.confirm('Excluir esta fotografia da biblioteca? Somente fotos sem uso em rascunhos, sites ou publicações podem ser excluídas.'))return;await run(async()=>{await transport('/schools/'+props.schoolId+'/website/assets/'+asset.id,{method:'DELETE'});s.assets=s.assets.filter(x=>x.id!==asset.id);s.notice='Fotografia sem uso excluída.';});}
    async function uploadSiteImage(event:Event,target:SiteImage):Promise<void>{const input=event.target as HTMLInputElement;const file=input.files?.[0];if(!file)return;await run(async()=>{if(file.size>3*1024*1024)throw new Error('Escolha uma imagem de até 3 MB.');if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Use uma fotografia JPEG, PNG ou WebP.');const body=new FormData();body.append('image',file);const asset=await transport('/schools/'+props.schoolId+'/website/assets',{method:'POST',body}) as SiteImage;target.url=asset.url;s.previewHtml='';s.notice='Fotografia enviada. Ela só ficará pública quando estiver em um site ou uma publicação pública.';});input.value='';}
    function toggleWebsite():void{if(s.busy)return;if(s.websiteOpen&&s.websiteInitial&&JSON.stringify(websitePayload())!==s.websiteInitial&&!window.confirm('Fechar a configuração com alterações ainda não salvas? Os campos permanecem nesta tela, mas serão perdidos ao sair.'))return;s.websiteOpen=!s.websiteOpen;if(s.websiteOpen&&!s.websiteInitial)s.websiteInitial=JSON.stringify(websitePayload());}
    function move<T>(items:T[],index:number,delta:number):void{const target=index+delta;if(target<0||target>=items.length)return;[items[index],items[target]]=[items[target],items[index]];s.previewHtml='';}
    function removeSiteItem<T>(items:T[],index:number):void{if(!window.confirm('Remover este item do rascunho? A publicação atual não será alterada até você publicar.'))return;items.splice(index,1);s.previewHtml='';}
    async function loadSiteModels():Promise<void>{await run(async()=>{const result=await transport('/schools/'+props.schoolId+'/website/models') as {items:SiteModel[]};s.models=result.items;s.modelChoice=s.website.theme;});}
    function selectedModel():SiteModel|undefined{return s.models.find(model=>model.id===s.modelChoice);}
    function modelInput():string{return JSON.stringify({model_id:s.modelChoice,website:websitePayload()});}
    function modelReady():boolean{return Boolean(s.resolvedModel&&s.modelPreviewInput===modelInput());}
    function clearModelPreview():void{s.resolvedModel=null;s.modelPreviewInput='';s.modelPreviewPage='';s.modelPreviewActive=false;s.previewHtml='';}
    function modelNewPages():SitePage[]{const existing=new Set(s.website.design?.pages.map(page=>page.slug)||[]);return s.resolvedModel?.design?.pages.filter(page=>!existing.has(page.slug))||[];}
    function modelRenames():string[]{const proposed=selectedModel()?.website.design?.menu||[];const resolved=s.resolvedModel?.design?.menu||[];return proposed.flatMap((link,index)=>resolved[index]&&link.url!==resolved[index].url?[link.url+' → '+resolved[index].url]:[]);}
    async function previewModel():Promise<void>{if(!selectedModel()){s.error='Carregue e escolha um modelo completo.';return;}await run(async()=>{clearModelPreview();const input=modelInput();const result=await transport('/schools/'+props.schoolId+'/website/preview-model',{method:'POST',body:input}) as {website:Website;html:string};s.resolvedModel=result.website;s.modelPreviewInput=input;s.modelPreviewActive=true;s.previewHtml=result.html;s.notice='Prévia sem gravação: confira a página inicial curta, cada página interna e o mapa do menu antes de aplicar. Nenhum campo do seu rascunho foi alterado.';});}
    async function previewModelPage():Promise<void>{if(!modelReady()){s.error='O conteúdo ou modelo mudou. Gere novamente a prévia completa antes de escolher uma página.';return;}await run(async()=>{const result=await transport('/schools/'+props.schoolId+'/website/preview'+(s.modelPreviewPage?'?page='+encodeURIComponent(s.modelPreviewPage):''),{method:'POST',body:JSON.stringify(s.resolvedModel)}) as {html:string};s.modelPreviewActive=true;s.previewHtml=result.html;});}
    function bindPreviewLinks(event:Event):void{
      let document:Document|null;
      try{document=(event.currentTarget as HTMLIFrameElement).contentDocument;}catch{return;}
      if(!document)return;
      document.addEventListener('click',(event:MouseEvent)=>{
        if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||!s.modelPreviewActive||!modelReady())return;
        const anchor=(event.target as Element)?.closest?.('a[href]');const href=anchor?.getAttribute('href')||'';
        if(href!=='/'&&(!/^\/[a-z][a-z0-9-]{0,59}$/.test(href)||!s.resolvedModel?.design?.pages.some(page=>'/'+page.slug===href)))return;
        event.preventDefault();if(s.busy)return;
        s.modelPreviewPage=href==='/'?'':href.slice(1);void previewModelPage();
      });
    }
    async function applyModel():Promise<void>{if(!modelReady()){await previewModel();if(modelReady())s.notice='Confira o mapa e as páginas na prévia. Depois clique novamente em Aplicar para confirmar o rascunho.';return;}const added=modelNewPages();const renamed=modelRenames();if(!window.confirm('Aplicar ao rascunho a página inicial curta, '+added.length+' novas páginas completas e o novo menu? Todas as páginas atuais, identidade e endereços serão preservados.'+(renamed.length?' Endereços ajustados para evitar colisões: '+renamed.join(', ')+'.':'')+' O site publicado NÃO muda. As páginas marcadas para inclusão só entrarão no ar após a ação Publicar site. A cópia original antes de testar modelos ficará salva na plataforma, inclusive após sair desta tela.'))return;await run(async()=>{await transport('/schools/'+props.schoolId+'/website/apply-model',{method:'POST',body:modelInput()});await loadWebsite();s.sitePageIndex=-1;s.demoConfirmed=false;clearModelPreview();s.notice='Página inicial, novas páginas e menu salvos somente em rascunho. Páginas anteriores preservadas; cópia original durável disponível. Nada foi publicado.';});}
    async function restoreModelCheckpoint():Promise<void>{if(!s.hasModelCheckpoint||!window.confirm('Restaurar a cópia original antes de testar modelos no rascunho? O site publicado não muda.'))return;await run(async()=>{await transport('/schools/'+props.schoolId+'/website/restore-model',{method:'POST',body:JSON.stringify({version:s.website.version})});await loadWebsite();clearModelPreview();s.sitePageIndex=-1;s.demoConfirmed=false;s.notice='Cópia original restaurada e salva no rascunho.';});}
    function markDemoReplaced():void{if(!s.website.design||!window.confirm('Você revisou todos os textos e substituiu as fotografias demonstrativas? A publicação ainda exigirá a ação Publicar site.'))return;const hasDemoAssets=JSON.stringify(s.website.design).includes('/public/website-model-assets/');if(hasDemoAssets){s.error='Ainda há imagens demonstrativas. Substitua-as antes de concluir a revisão.';return;}s.website.design.demonstration=false;s.demoConfirmed=false;s.previewHtml='';}
    function editingPage():SitePage|null{return s.website.design?.pages[s.sitePageIndex]||null;}
    function contentSections():SiteSection[]{return editingPage()?.sections||s.website.design?.sections||[];}
    function selectSitePage():void{s.previewHtml='';}
    function addSitePage():void{const d=s.website.design;if(!d||d.pages.length>=20)return;let n=1;while(d.pages.some(p=>p.slug==='pagina-'+n))n++;d.pages.push({slug:'pagina-'+n,title:'Nova página',introduction:'',image:null,published:true,sections:[]});s.sitePageIndex=d.pages.length-1;s.previewHtml='';}
    function moveSitePage(delta:number):void{const pages=s.website.design?.pages;if(!pages)return;const page=editingPage();move(pages,s.sitePageIndex,delta);s.sitePageIndex=page?pages.indexOf(page):-1;}
    function removeSitePage():void{const d=s.website.design,p=editingPage();if(!d||!p||!window.confirm('Remover esta página do rascunho? Links do menu para ela também serão retirados. Revise botões e outros links antes de publicar.'))return;d.pages.splice(s.sitePageIndex,1);d.menu=d.menu.filter(link=>link.url.split(/[?#]/)[0]!=='/'+p.slug);s.sitePageIndex=-1;s.previewHtml='';}
    function addPageToMenu():void{const d=s.website.design,p=editingPage();if(!d||!p||d.menu.length>=8)return;if(!p.published){s.error='Marque a página para publicação antes de adicioná-la ao menu.';return;}if(!d.menu.some(link=>link.url==='/'+p.slug))d.menu.push({label:p.title.slice(0,80),url:'/'+p.slug});s.previewHtml='';}
    function addSection():void{const d=s.website.design,sections=contentSections();if(!d||sections.length>=20)return;if(!editingPage())d.configured=true;let n=1;while(sections.some(x=>x.id==='secao-'+n))n++;sections.push({id:'secao-'+n,kind:s.sectionKind,visible:true,eyebrow:'',title:'',text:'',image:null,action:null,items:[]});s.previewHtml='';}
    function inheritBrand():void{if(!window.confirm('Restaurar a identidade herdada do PIGE neste rascunho?'))return;s.website.brand={display_name:'',primary_color:'',secondary_color:'',font_family:''};s.previewHtml='';}
    function editorialCheck():void{if(/^(https?:\/\/|www\.)/i.test(s.website.headline.trim()))throw new Error('Use um título na chamada principal. Informe a URL no endereço do botão.');}
    async function saveWebsite():Promise<void>{await run(async()=>{await transport('/schools/'+props.schoolId+'/website/draft',{method:'PUT',body:JSON.stringify(websitePayload())});await loadWebsite();s.notice='Rascunho salvo. A versão pública permanece a mesma até você publicar.';});}
    async function publishWebsite():Promise<void>{if(s.website.design?.demonstration&&!s.demoConfirmed){s.error='Confirme explicitamente a publicação de conteúdo demonstrativo ou substitua e revise os exemplos.';return;}if(!window.confirm(s.website.design?.demonstration?'Publicar EXEMPLOS DEMONSTRATIVOS com identificação visível?':'Publicar este conteúdo no site da escola?'))return;await run(async()=>{editorialCheck();await transport('/schools/'+props.schoolId+'/website/draft',{method:'PUT',body:JSON.stringify(websitePayload())});await loadWebsite();await transport('/schools/'+props.schoolId+'/website/publish',{method:'POST',body:JSON.stringify({version:s.website.version,confirm_demonstration:s.demoConfirmed})});await loadWebsite();s.notice='Site publicado com sucesso.';});}
    async function previewWebsite():Promise<void>{await run(async()=>{s.modelPreviewActive=false;editorialCheck();const result=await transport('/schools/'+props.schoolId+'/website/preview'+(editingPage()?'?page='+encodeURIComponent(editingPage()!.slug):''),{method:'POST',body:JSON.stringify(websitePayload())}) as {html:string};s.previewHtml=result.html;});}
    async function unpublishWebsite():Promise<void>{if(!window.confirm('Retirar o site do ar? O conteúdo será preservado em rascunho.'))return;await run(async()=>{await transport('/schools/'+props.schoolId+'/website/unpublish',{method:'POST',body:JSON.stringify(websitePayload())});await loadWebsite();s.notice='Site retirado da publicação. Rascunho preservado.';});}
    async function search():Promise<void>{s.page=1;await run(load);}
    async function page(delta:number):Promise<void>{s.page+=delta;await run(load);}
    function open(post:Post):void{s.selected=post;s.error='';}
    function edit(post?:Post):void{
      s.form=post?{image:post.image?{...post.image}:null,id:post.id,version:post.version||1,title:post.title,summary:post.summary,content:post.content,kind:post.kind,audience:post.audience,status:post.status||'draft',pinned:post.pinned,publish_at:local(post.publish_at),expires_at:local(post.expires_at),event_start:local(post.event_start),event_end:local(post.event_end),location:post.location}:empty();
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
    Vue.onMounted(()=>{void run(async()=>{await load();await loadWebsite();});});
    return {s,props,manage,run,load,toggleWebsite,loadSiteAssets,removeSiteAsset,uploadSiteImage,move,removeSiteItem,addSection,loadSiteModels,selectedModel,modelReady,clearModelPreview,modelNewPages,modelRenames,previewModel,previewModelPage,bindPreviewLinks,applyModel,restoreModelCheckpoint,markDemoReplaced,editingPage,contentSections,selectSitePage,addSitePage,moveSitePage,removeSitePage,addPageToMenu,inheritBrand,newImage,newLink,newItem,sectionLabels,saveWebsite,publishWebsite,previewWebsite,unpublishWebsite,search,page,open,edit,closeEditor,save,remove,date,audienceLabels,statusLabels,scheduled,expired,paragraphs};
  }};
}
