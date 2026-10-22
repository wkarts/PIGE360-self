/** Portal privado: shell da aplicação, transporte e autorizações escolares preservados. */
namespace PigeFamily {
  type Document={id:string;type_name:string;status:string;file_id:string|null};
  type Student={id:string;name:string;number:string;financial_authorized:boolean;enrollments:{id:string;number:string;class_name:string;year_name:string;status:string}[];documents:Document[]};
  type Account={id:string;name:string;role:string;school_ids:string[]};
  type Post={id:string;title:string;summary:string;content:string;kind:string;publish_at:string|null;event_start:string|null;event_end:string|null;location:string};
  type Feed={items:Post[];total:number};
  const titles:Record<string,string>={overview:'Visão geral',students:'Meus alunos',academic:'Vida acadêmica',news:'Comunicados',agenda:'Agenda escolar',finance:'Financeiro',documents:'Documentos',support:'Atendimento'};
  function routeSection():string{const view=new URLSearchParams(location.search).get('view');return view&&titles[view]?view:location.pathname.includes('documents')?'documents':location.pathname.includes('finance')?'finance':location.pathname.includes('academic')?'academic':'overview';}
  const s=Vue.reactive({ready:false,busy:false,error:'',contextError:false,account:null as Account|null,email:'',password:'',passwordVisible:false,menuOpen:false,schoolId:'',schools:{} as Record<string,string>,section:routeSection(),students:[] as Student[],studentId:new URLSearchParams(location.search).get('student')||'',charges:[] as {id:string;description:string;amount:string;due_on:string;status:string}[],financeNote:'',financeError:'',financeLoaded:false,news:[] as Post[],events:[] as Post[],feedItems:[] as Post[],feedTotal:0,feedPage:1,feedBusy:false,feedError:'',overviewFeedError:'',selectedPost:null as Post|null});
  let postTrigger:HTMLElement|null=null;
  let generation=0,feedGeneration=0,authEpoch=0;let token='';
  let refreshing:{epoch:number;promise:Promise<void>}|null=null;
  class SessionChanged extends Error {constructor(){super('A sessão mudou.');this.name='AbortError';}}
  function checkAuth(epoch:number):void{if(epoch!==authEpoch)throw new SessionChanged();}
  function invalidateAuth():void{authEpoch++;refreshing=null;}
  function clearPrivate():void{generation++;feedGeneration++;s.students=[];s.charges=[];s.financeNote='';s.financeError='';s.financeLoaded=false;s.news=[];s.events=[];s.feedItems=[];s.feedTotal=0;s.feedPage=1;s.feedBusy=false;s.selectedPost=null;s.feedError='';s.overviewFeedError='';s.menuOpen=false;}
  async function raw(path:string,options:RequestInit={}):Promise<Response>{const headers=new Headers(options.headers);headers.set('X-CSRF-Protection','1');if(token)headers.set('Authorization','Bearer '+token);if(s.schoolId)headers.set('X-School-Id',s.schoolId);if(options.body)headers.set('Content-Type','application/json');return fetch('/api/v1'+path,{...options,headers,credentials:'same-origin',cache:'no-store'});}
  async function renew():Promise<void>{
    const epoch=authEpoch;
    if(!refreshing||refreshing.epoch!==epoch){
      const pending={epoch,promise:Promise.resolve()};
      pending.promise=(async()=>{const r=await raw('/auth/refresh',{method:'POST'});const data=await r.json();checkAuth(epoch);
        if(!r.ok){invalidateAuth();token='';s.account=null;clearPrivate();throw new Error('Sua sessão expirou. Entre novamente.');}
        token=data.access_token;s.account=data.user;
      })().finally(()=>{if(refreshing===pending)refreshing=null;});
      refreshing=pending;
    }
    await refreshing.promise;checkAuth(epoch);
  }
  async function response(path:string,options:RequestInit={}):Promise<Response>{
    const epoch=authEpoch;let r=await raw(path,options);checkAuth(epoch);
    // Login/logout never renew a prior session. An old request cannot replay in a new one.
    if(r.status===401&&token&&!/^\/auth\/(?:login|logout|refresh)$/.test(path)){await r.arrayBuffer();checkAuth(epoch);await renew();checkAuth(epoch);r=await raw(path,options);checkAuth(epoch);}
    if(!r.ok){let detail='Não foi possível carregar. Tente novamente.';try{detail=(await r.json()).detail||detail;}catch{}checkAuth(epoch);throw new Error(detail);}return r;
  }
  async function request<T>(path:string,options:RequestInit={}):Promise<T>{const epoch=authEpoch;const data=await (await response(path,options)).json();checkAuth(epoch);return data as T;}
  async function run(fn:()=>Promise<void>):Promise<void>{if(s.busy)return;s.busy=true;s.error='';try{await fn();}catch(e){if(!(e instanceof SessionChanged))s.error=e instanceof Error?e.message:'Não foi possível concluir.';}finally{s.busy=false;}}
  async function authenticated(data:Record<string,unknown>):Promise<void>{token=String(data.access_token||'');s.account=data.user as Account;s.password='';s.passwordVisible=false;s.schoolId=s.account.school_ids[0]||'';await load();}
  async function login():Promise<void>{if(s.busy)return;invalidateAuth();clearPrivate();token='';s.account=null;s.schoolId='';await run(async()=>{const result=await request<Record<string,unknown>>('/auth/login',{method:'POST',body:JSON.stringify({email:s.email,password:s.password})});s.password='';s.passwordVisible=false;if(await PigeMFA.accept(result))return;await authenticated(result);});}
  async function logout():Promise<void>{
    if(s.busy)return;
    // Invalidate pending renewals before the logout network request, not after it.
    invalidateAuth();clearPrivate();
    await run(async()=>{try{await request('/auth/logout',{method:'POST'});}finally{token='';s.account=null;s.schoolId='';s.studentId='';s.password='';s.passwordVisible=false;PigeMFA.clear();}});
  }
  async function load():Promise<void>{clearPrivate();s.contextError=false;const current=generation;try{const data=await request<{students:Student[];schools:{id:string;name:string}[]}>('/family/context');if(current!==generation)return;s.schools=Object.fromEntries((data.schools||[]).map(x=>[x.id,x.name]));s.students=data.students;if(!s.students.some(x=>x.id===s.studentId))s.studentId=s.students[0]?.id||'';await Promise.all([finance(),overviewFeed()]);if(current===generation&&['news','agenda'].includes(s.section))await loadFeed();}catch(e){if(current===generation)s.contextError=true;throw e;}}
  const label=(value:string):string=>({draft:'Em preparação',active:'Efetivada',suspended:'Suspensa',completed:'Concluída',pending:'Pendente',overdue:'Vencida',validated:'Validado',received:'Recebido',waived:'Dispensado',rejected:'Revisão necessária',expired:'Vencido',queued:'Em processamento',cancelled:'Cancelada',paid:'Paga',settled:'Liquidada',issued:'Emitida',registered:'Registrada'}[value]||value);
  const student=()=>s.students.find(x=>x.id===s.studentId);
  const pendingDocuments=()=>(student()?.documents||[]).filter(x=>['pending','rejected','expired'].includes(x.status));
  const overdue=()=>s.charges.filter(x=>x.status==='overdue');
  const initials=(name:string)=>name.trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toLocaleUpperCase('pt-BR');
  const title=()=>titles[s.section]||titles.overview;
  const date=(value:string|null)=>{if(!value)return 'Data não informada';const d=new Date(value.length===10?value+'T12:00:00':value);return Number.isNaN(d.getTime())?'Data não informada':new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Bahia',day:'2-digit',month:'short',year:'numeric',...(value.length>10?{hour:'2-digit',minute:'2-digit'}:{})}).format(d);};
  const money=(value:string)=>Number(value).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  async function finance():Promise<void>{s.charges=[];s.financeNote='';s.financeError='';s.financeLoaded=false;if(!student()?.financial_authorized)return;const selected=s.studentId,current=generation;try{const data=await request<{items:typeof s.charges;note:string}>('/family/students/'+selected+'/charges');if(selected!==s.studentId||current!==generation)return;s.charges=data.items;s.financeNote=data.note;s.financeLoaded=true;}catch(e){if(selected===s.studentId&&current===generation)s.financeError=e instanceof Error?e.message:'Não foi possível carregar o financeiro.';}}
  function feedPath(kind:string,page=1,size=12,upcoming=false):string{return '/schools/'+encodeURIComponent(s.schoolId)+'/community-feed?'+new URLSearchParams({kind,page:String(page),page_size:String(size),upcoming:String(upcoming)});}
  async function overviewFeed():Promise<void>{if(!s.schoolId)return;const current=generation;try{const [news,events]=await Promise.all([request<Feed>(feedPath('news',1,3)),request<Feed>(feedPath('event',1,3,true))]);if(current!==generation)return;s.news=news.items;s.events=events.items;}catch(e){if(current===generation)s.overviewFeedError=e instanceof Error?e.message:'Não foi possível carregar os comunicados e a agenda.';}}
  async function loadFeed(page=1):Promise<void>{if(!s.schoolId||s.contextError)return;const current=generation,id=++feedGeneration,kind=s.section==='agenda'?'event':'news';s.feedBusy=true;s.feedError='';s.feedItems=[];s.selectedPost=null;try{const data=await request<Feed>(feedPath(kind,page));if(current!==generation||id!==feedGeneration)return;s.feedItems=data.items;s.feedTotal=data.total;s.feedPage=page;}catch(e){if(current===generation&&id===feedGeneration)s.feedError=e instanceof Error?e.message:'Não foi possível carregar as publicações.';}finally{if(id===feedGeneration)s.feedBusy=false;}}
  function updateLocation(push=false):void{const params=new URLSearchParams({view:s.section});if(s.studentId)params.set('student',s.studentId);history[push?'pushState':'replaceState']({},'','/family.html?'+params);}
  async function changeStudent():Promise<void>{if(s.busy)return;s.selectedPost=null;updateLocation();await run(finance);}
  async function chooseStudent(id:string):Promise<void>{if(s.busy)return;s.studentId=id;await changeStudent();section('academic');}
  async function changeSchool():Promise<void>{if(s.busy)return;s.studentId='';await run(load);updateLocation();}
  async function download(path:string,filename:string):Promise<void>{const current=generation,selected=s.studentId;const r=await response(path);const blob=await r.blob();if(current!==generation||selected!==s.studentId)return;const url=URL.createObjectURL(blob);const a=window.document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function document(file:Document):Promise<void>{await run(()=>download('/family/students/'+s.studentId+'/documents/'+file.id,'documento-escolar'));}
  async function start():Promise<void>{await PigeInstitution.load();try{await renew();if(s.account){s.schoolId=s.account.school_ids[0]||'';await load();}}catch(e){if(s.account)s.error=e instanceof Error?e.message:'Não foi possível carregar seus dados.';}finally{s.ready=true;}}
  function openPost(post:Post):void{postTrigger=window.document.activeElement as HTMLElement|null;s.selectedPost=post;void Vue.nextTick(()=>{const target=window.document.getElementById('family-post-detail');target?.focus();target?.scrollIntoView({block:'start'});});}
  function closePost():void{s.selectedPost=null;if(postTrigger?.isConnected)postTrigger.focus();postTrigger=null;}
  function resized():void{if(window.innerWidth>800)closeMenu(false);}
  function closeMenu(restore=true):void{s.menuOpen=false;if(restore)void Vue.nextTick(()=>{if(!s.menuOpen)window.document.getElementById('family-menu-toggle')?.focus();});}
  function openMenu():void{s.menuOpen=true;void Vue.nextTick(()=>{if(s.menuOpen)window.document.getElementById('family-menu-close')?.focus();});}
  function menuKeys(event:KeyboardEvent):void{if(!s.menuOpen)return;if(event.key==='Escape'){event.preventDefault();closeMenu();}if(event.key==='Tab'){const elements=Array.from(window.document.querySelectorAll<HTMLElement>('#family-navigation button:not(:disabled),#family-navigation a[href]'));const first=elements[0],last=elements[elements.length-1];if(event.shiftKey&&window.document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&window.document.activeElement===last){event.preventDefault();first?.focus();}}}
  function section(name:string):void{if(!titles[name])return;const changed=s.section!==name;s.section=name;s.selectedPost=null;closeMenu(false);if(changed)updateLocation(true);if(['news','agenda'].includes(name))void loadFeed();void Vue.nextTick(()=>window.document.getElementById('family-title')?.focus());}
  async function popstate():Promise<void>{s.section=routeSection();s.selectedPost=null;closeMenu(false);const id=new URLSearchParams(location.search).get('student');if(id&&s.students.some(x=>x.id===id)&&id!==s.studentId){s.studentId=id;await finance();}if(['news','agenda'].includes(s.section))await loadFeed();}
  Vue.createApp({components:{'learning-portal':PigeLearning.component},render:PigeRenders.familyPortal,setup(){Vue.onMounted(()=>{window.addEventListener('popstate',popstate);window.addEventListener('keydown',menuKeys);window.addEventListener('resize',resized);PigeMFA.init(request,authenticated,logout);void start();});Vue.onUnmounted(()=>{window.removeEventListener('popstate',popstate);window.removeEventListener('keydown',menuKeys);window.removeEventListener('resize',resized);});return{s,label,student,title,initials,date,money,pendingDocuments,overdue,login,logout,changeSchool,changeStudent,chooseStudent,document,request,download,section,run,load,loadFeed,openPost,closePost,openMenu,closeMenu,mfa:PigeMFA,identity:PigeInstitution.state};}}).mount('#family');
}
