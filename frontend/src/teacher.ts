namespace PigeTeacher {
  interface Assignment {id:string;class_name:string;subject_name:string;year_name:string;shift_name:string|null}
  interface Diary {id:string;teacher_assignment_id:string;component:string}
  interface Agenda {starts_on:string;ends_on:string;assignments:Assignment[];diaries:Diary[];events:{id:string;diary_id:string;date:string;title:string;kind:string}[]}
  const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bahia'}).format(new Date());
  const s=Vue.reactive({ready:false,busy:false,error:'',email:'',password:'',passwordVisible:false,
    user:null as PigeAPI.User|null,schools:[] as {id:string;name:string}[],schoolId:'',
    requestedDiary:undefined as {id:string;tab?:string}|undefined,section:'overview',menuOpen:false,
    news:[] as {id:string;title:string;content:string;summary:string}[],newsPage:1,newsTotal:0,week:today(),agenda:null as Agenda|null});
  function clear(){
    PigeAPI.clear();PigeMFA.clear();s.user=null;s.schools=[];s.schoolId='';s.password='';s.passwordVisible=false;
    s.section='overview';s.menuOpen=false;s.news=[];s.agenda=null;s.week=today();s.error='';
  }
  async function run(work:()=>Promise<void>){
    if(s.busy)return;s.busy=true;s.error='';
    try{await work();}catch(e){if((e as Error).name!=='AbortError')s.error=(e as Error).message;}finally{s.busy=false;}
  }
  async function agenda(){
    if(!s.schoolId||!s.week)return;
    const data=await PigeAPI.request<Agenda>('/teacher/schools/'+s.schoolId+'/programacao?week='+encodeURIComponent(s.week));
    s.agenda=data;
  }
  async function school(id:string){
    s.agenda=null;s.news=[];s.newsPage=1;s.section='overview';s.requestedDiary=undefined;s.schoolId=id;PigeAPI.setActiveSchool(id);
    if(!id)return;
    s.user=await PigeAPI.request<PigeAPI.User>('/auth/me');
    await agenda();
  }
  async function workspace(){
    s.schools=await PigeAPI.request<typeof s.schools>('/teacher/schools');
    await school(s.schools.find(item=>item.id===s.schoolId)?.id||s.schools[0]?.id||'');
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
  async function logout(){await run(async()=>{await PigeAPI.post('/auth/logout',{});clear();});}
  async function start(){
    await PigeInstitution.load();
    try{const session=await PigeAPI.refresh();await enter(session);}
    catch(e){if((e as {status?:number}).status!==401)s.error=(e as Error).message;}
    finally{s.ready=true;}
  }
  function selectSchool(event:Event){void run(()=>school((event.target as HTMLSelectElement).value));}
  async function publications(page=1){
    const id=s.schoolId;
    const feed=await PigeAPI.request<{items:typeof s.news;total:number}>('/schools/'+id+'/community-feed?kind=news&page_size=10&page='+page);
    if(id===s.schoolId){s.news=feed.items;s.newsTotal=feed.total;s.newsPage=page;}
  }
  function navigate(section:string){
    s.menuOpen=false;s.section=section;
    if(section==='news')void run(()=>publications());
    if(section==='agenda')void run(agenda);
  }
  function toggleMenu(open:boolean){
    s.menuOpen=open;
    void Vue.nextTick(()=>document.getElementById(open?'teacher-menu-close':'teacher-menu-toggle')?.focus());
  }
  function menuKey(e:KeyboardEvent){
    if(!s.menuOpen)return;
    if(e.key==='Escape'){e.preventDefault();toggleMenu(false);}
    if(e.key==='Tab'){
      const items=document.querySelectorAll<HTMLButtonElement>('#teacher-navigation button:not([disabled])');
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
  Vue.createApp({render:PigeRenders.teacherPortal,components:{'school-diary':PigeDiary.component},setup(){
    Vue.onMounted(()=>{
      PigeMFA.init(PigeAPI.request,data=>enter(data as unknown as PigeAPI.SessionResponse),logout);
      window.addEventListener('pige-session-expired',()=>{clear();s.error='Sessão encerrada. Entre novamente.';});
      window.addEventListener('resize',()=>{if(innerWidth>800)s.menuOpen=false;});
      void start();
    });
    return {s,navigate,toggleMenu,menuKey,publications,identity:PigeInstitution.state,mfa:PigeMFA,login,logout,run,agenda,workspace,date,group,selectSchool};
  }}).mount('#teacher');
}
