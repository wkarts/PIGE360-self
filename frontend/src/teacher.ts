namespace PigeTeacher {
  interface Assignment {id:string;class_name:string;subject_name:string;year_name:string;shift_name:string|null}
  interface Diary {id:string;teacher_assignment_id:string;component:string}
  interface Agenda {starts_on:string;ends_on:string;assignments:Assignment[];diaries:Diary[];events:{id:string;diary_id:string;date:string;title:string;kind:string}[]}
  const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bahia'}).format(new Date());
  const s=Vue.reactive({ready:false,busy:false,error:'',email:'',password:'',passwordVisible:false,
    user:null as PigeAPI.User|null,schools:[] as {id:string;name:string}[],schoolId:'',
    requestedDiary:undefined as {id:string}|undefined,section:'agenda',week:today(),agenda:null as Agenda|null});
  function clear(){
    PigeAPI.clear();PigeMFA.clear();s.user=null;s.schools=[];s.schoolId='';s.password='';s.passwordVisible=false;
    s.section='agenda';s.agenda=null;s.week=today();s.error='';
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
    s.agenda=null;s.section='agenda';s.requestedDiary=undefined;s.schoolId=id;PigeAPI.setActiveSchool(id);
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
  function showAgenda(){s.section='agenda';void run(agenda);}
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
      void start();
    });
    return {s,identity:PigeInstitution.state,mfa:PigeMFA,login,logout,run,agenda,workspace,date,group,selectSchool,showAgenda};
  }}).mount('#teacher');
}
