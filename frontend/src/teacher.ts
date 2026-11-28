namespace PigeTeacher {
  interface Assignment {id:string;class_group_id:string;class_name:string;subject_name:string;year_name:string;shift_name:string|null}
  interface Diary {id:string;teacher_assignment_id:string;component:string}
  interface Agenda {starts_on:string;ends_on:string;assignments:Assignment[];diaries:Diary[];events:{id:string;diary_id:string;date:string;title:string;kind:string}[]}
  const pages = [
    {id:'overview',label:'Visão geral',icon:'dashboard'},
    {id:'agenda',label:'Minha programação',icon:'clock'},
    {id:'diary',label:'Diário de classe',icon:'academic'},
    {id:'materials',label:'Atividades e trabalhos',icon:'documents'},
    {id:'news',label:'Avisos e publicações',icon:'bell'},
    {id:'webmail',label:'E-mail',icon:'email'},
  ];
  const mail=PigePortalMail.use(PigeAPI.request);
  const sidebarKey='pige.teacher.sidebar.collapsed';
  function savedSidebar():boolean {
    try{return localStorage.getItem(sidebarKey)==='true';}catch{return false;}
  }
  const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bahia'}).format(new Date());
  const s=Vue.reactive({ready:false,busy:false,error:'',email:'',password:'',passwordVisible:false,
    user:null as PigeAPI.User|null,schools:[] as {id:string;name:string}[],schoolId:'',
    requestedDiary:undefined as {id:string;tab?:string}|undefined,section:'overview',tabs:['overview'],sidebarCollapsed:savedSidebar(),menuOpen:false,
    news:[] as {id:string;title:string;content:string;summary:string}[],newsPage:1,newsTotal:0,week:today(),agenda:null as Agenda|null});
  let loadedSchoolId='';
  function clear(){
    loadedSchoolId='';mail.clear();PigeAPI.clear();PigeMFA.clear();s.user=null;s.schools=[];s.schoolId='';s.password='';s.passwordVisible=false;
    s.section='overview';s.tabs=['overview'];s.requestedDiary=undefined;s.menuOpen=false;s.news=[];s.agenda=null;s.week=today();s.error='';
  }
  async function run(work:()=>Promise<void>){
    if(s.busy)return;s.busy=true;s.error='';
    try{await work();}catch(e){if((e as Error).name!=='AbortError')s.error=(e as Error).message;}finally{s.busy=false;}
  }
  async function agenda(){
    const id=s.schoolId,week=s.week;
    if(!id || !week || (!available('agenda') && !available('diary')))return;
    const resource=available('agenda')?'programacao':'atribuicoes';
    const data=await PigeAPI.request<Agenda>('/teacher/schools/'+id+'/'+resource+'?week='+encodeURIComponent(week));
    if(id===s.schoolId && week===s.week)s.agenda=data;
  }
  async function school(id:string){
    if(s.schoolId && s.schoolId!==id)PigeDiary.clearPilotContext(s.schoolId);
    loadedSchoolId='';mail.clear();s.agenda=null;s.news=[];s.newsPage=1;s.newsTotal=0;
    s.section='overview';s.tabs=['overview'];s.requestedDiary=undefined;s.schoolId=id;PigeAPI.setActiveSchool(id);
    if(s.user)s.user={...s.user,permissions:[],teacher_routines:[]};
    if(!id)return;
    s.user=await PigeAPI.request<PigeAPI.User>('/auth/me');
    loadedSchoolId=id;
    await Promise.all([agenda(),s.user.teacher_routines?.includes('mail')?mail.load(id):Promise.resolve()]);
  }
  async function workspace(){
    s.schools=await PigeAPI.request<typeof s.schools>('/teacher/schools');
    const link=new URLSearchParams(location.search);
    const linked=location.hash==='#diario' && s.schools.find(item=>item.id===link.get('diarioPiloto'));
    await school((linked && linked.id)||s.schools.find(item=>item.id===s.schoolId)?.id||s.schools[0]?.id||'');
    if(linked && available('diary') && !unavailable('diary')){s.tabs.push('diary');s.section='diary';}
  }
  async function enter(session:PigeAPI.SessionResponse){
    if(session.user.role!=='teacher'){
      PigeAPI.clear();s.error='Esta área requer uma conta de Professor. Confira o perfil com a Secretaria.';return;
    }
    PigeAPI.useSession(session);s.user=session.user;await workspace();
  }
  async function login(){await run(async()=>{
    const password=s.password;s.password='';s.passwordVisible=false;
    const data=await PigeAPI.post<Record<string,unknown>>('/auth/login',{email:s.email,password});
    if(!await PigeMFA.accept(data))await enter(data as unknown as PigeAPI.SessionResponse);
  });}
  async function logout(){if(canDiscardDiary())await run(async()=>{await PigeAPI.post('/auth/logout',{});clear();});}
  async function start(){
    await PigeInstitution.load();
    try{const session=await PigeAPI.refresh();await enter(session);}
    catch(e){if((e as {status?:number}).status!==401)s.error=(e as Error).message;}
    finally{s.ready=true;}
  }
  function selectSchool(event:Event){
    const select=event.target as HTMLSelectElement;
    if(!canDiscardDiary()){select.value=s.schoolId;return;}
    void run(()=>school(select.value));
  }
  async function publications(page=1){
    const id=s.schoolId;
    if(!available('news'))return;
    const feed=await PigeAPI.request<{items:typeof s.news;total:number}>('/schools/'+id+'/community-feed?kind=news&page_size=10&page='+page);
    if(id===s.schoolId){s.news=feed.items;s.newsTotal=feed.total;s.newsPage=page;}
  }
  function can(permission:string):boolean{return s.user?.permissions.includes(permission)===true;}
  function available(section:string):boolean {
    if(section==='overview'||section==='help')return true;
    if(!s.schoolId || !s.user)return false;
    const routines=s.user.teacher_routines;
    if(section==='webmail')return Boolean(routines?.includes('mail') && mail.state.available);
    if(routines)return routines.includes(section);
    return section==='news' || (['agenda','diary','materials'].includes(section) && can('diary.read'));
  }
  function unavailable(section:string):boolean {
    return ['diary','materials'].includes(section) && !s.agenda?.diaries.length;
  }
  function navigation(){return pages.filter(item=>available(item.id));}
  function title(section:string):string {
    return section==='help'?'Guia de uso':pages.find(item=>item.id===section)?.label || '';
  }
  function initials(name:string):string {
    const words=name.trim().split(/\s+/);
    return ((words[0]?.[0]||'')+(words.length>1?words[words.length-1][0]:'')).toLocaleUpperCase('pt-BR');
  }
  function metrics(){
    const data=s.agenda;
    if(!data)return [];
    const result=[];
    if(available('diary')){
      result.push({label:'Turmas',value:new Set(data.assignments.map(a=>a.class_group_id)).size,icon:'students',caption:'Com atribuição docente'},
        {label:'Diários vinculados',value:data.diaries.length,icon:'academic',caption:'Nas suas disciplinas'});
    }
    if(available('agenda')){
      result.push({label:'Aulas registradas',value:data.events.filter(e=>e.kind==='Aula registrada').length,icon:'clock',caption:'Na semana selecionada'},
        {label:'Avaliações',value:data.events.filter(e=>e.kind==='Avaliação').length,icon:'enrollment',caption:'Na semana selecionada'});
    }
    return result;
  }
  function focusTab(){
    Vue.nextTick(()=>document.getElementById('teacher-tab-'+s.section)?.focus());
  }
  function navigate(section:string,focusHeading=true){
    if(s.busy || !available(section) || unavailable(section))return;
    if(section!=='diary' && location.hash==='#diario')history.replaceState(history.state,'',location.pathname+location.search);
    if(!s.tabs.includes(section))s.tabs.push(section);
    s.menuOpen=false;s.section=section;PigePortalTabs.reveal();
    if(focusHeading)void Vue.nextTick(()=>document.getElementById('teacher-title')?.focus());
    if(section==='news')void run(()=>publications());
    if(section==='agenda')void run(agenda);
  }
  function canDiscardDiary():boolean {
    if(document.querySelector('#teacher-diary [aria-busy="true"]'))return false;
    return !document.querySelector('#teacher-diary [data-workspace-dirty="true"]') ||
      window.confirm('Descartar as alterações do diário que ainda não foram salvas?');
  }
  function openDiary(id:string,tab:string){
    if(s.busy || !available('diary') || !s.agenda?.diaries.some(d=>d.id===id))return;
    if((tab==='materials' && !available('materials')) || !canDiscardDiary())return;
    s.requestedDiary={id,tab};
    navigate('diary',false);
  }
  function closeTabs(section?:string){
    if(s.busy || section==='overview' || s.tabs.length<2)return;
    const closingDiary=s.tabs.includes('diary') && (!section || section==='diary');
    if(closingDiary && document.querySelector('#teacher-diary [aria-busy="true"]'))return;
    const dirty=closingDiary && document.querySelector('#teacher-diary [data-workspace-dirty="true"]');
    const closingMail=s.tabs.includes('webmail') && (!section || section==='webmail');
    const message=section?'Fechar a guia '+title(section)+'?':'Fechar todas as outras guias e manter a Visão geral aberta?';
    const diaryWarning=dirty?' As alterações do diário que ainda não foram salvas serão descartadas.':'';
    const mailWarning=closingMail?' Confira se as mensagens em edição foram salvas em Rascunhos.':'';
    if((!section || dirty || closingMail) && !window.confirm(message+diaryWarning+mailWarning))return;
    const previous=s.section;
    s.tabs=section?s.tabs.filter(id=>id!==section):['overview'];
    if(closingDiary)s.requestedDiary=undefined;
    if(!s.tabs.includes(previous))navigate('overview',false);
    focusTab();
  }
  function tabKeys(event:KeyboardEvent):void{
    const key=PigePortalTabs.keyTarget(event,s.tabs,s.section);
    if(key){navigate(key,false);focusTab();}
  }
  function toggleSidebar(){
    s.sidebarCollapsed=!s.sidebarCollapsed;PigePortalTabs.reveal();
    try{localStorage.setItem(sidebarKey,String(s.sidebarCollapsed));}catch{/* A escolha continua válida nesta janela. */}
  }
  async function retry(){
    if(!s.schools.length || !s.schoolId || loadedSchoolId!==s.schoolId){await workspace();return;}
    if(s.section==='news'){await publications(s.newsPage);return;}
    await agenda();
  }
  function toggleMenu(open:boolean){
    s.menuOpen=open;
    void Vue.nextTick(()=>document.getElementById(open?'teacher-menu-close':'teacher-menu-toggle')?.focus());
  }
  function menuKey(e:KeyboardEvent){
    if(!s.menuOpen)return;
    if(e.key==='Escape'){e.preventDefault();toggleMenu(false);}
    if(e.key==='Tab'){
      const items=document.querySelectorAll<HTMLElement>('#teacher-navigation button:not([disabled]), #teacher-navigation a[href]');
      const first=items[0],last=items[items.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
      if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    }
  }
  function date(value:string){return new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(value+'T12:00:00Z'));}
  function group(diaryId:string){
    const diary=s.agenda?.diaries.find(item=>item.id===diaryId);
    const assignment=s.agenda?.assignments.find(item=>item.id===diary?.teacher_assignment_id);
    return [assignment?.class_name,diary?.component].filter(Boolean).join(' · ');
  }
  Vue.createApp({render:PigeRenders.teacherPortal,components:{'school-diary':PigeDiary.component,'portal-mail':PigePortalMail.component},setup(){
    Vue.watch(()=>[s.ready,s.user?.id,s.user?.role,s.schoolId].join('|'),()=>{
      if(s.user&&s.schoolId)void PigeSupport.load(s.schoolId,'teacher_portal',s.user.id);
      else if(s.ready&&!s.user)void PigeSupport.load(undefined,'login');
      else PigeSupport.dispose();
    });
    Vue.onUnmounted(PigeSupport.dispose);

    Vue.onMounted(()=>{
      PigeMFA.init(PigeAPI.request,data=>enter(data as unknown as PigeAPI.SessionResponse),logout);
      window.addEventListener('pige-session-expired',()=>{clear();s.error='Sessão encerrada. Entre novamente.';});
      window.addEventListener('resize',()=>{if(innerWidth>800)s.menuOpen=false;PigePortalTabs.reveal();});
      void start();
    });
    return {s,mail,available,unavailable,can,navigation,title,initials,metrics,openDiary,closeTabs,tabKeys,toggleSidebar,retry,pilotForSchool:PigeDiary.pilotForSchool,navigate,toggleMenu,menuKey,publications,identity:PigeInstitution.state,mfa:PigeMFA,login,logout,run,agenda,workspace,date,group,selectSchool};
  }}).mount('#teacher');
}
