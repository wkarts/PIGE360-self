/** Página pública da escola. Sem sessão administrativa nem dados internos. */
namespace PigeNews {
  const state=Vue.reactive({ready:false,error:'',schoolId:'',schools:[] as {id:string;name:string}[]});
  async function start():Promise<void>{state.error='';try{
    await PigeInstitution.load();
    document.title=PigeInstitution.state.display_name+' · Notícias e agenda';
    const context=await PigeCommunity.request('/portal/context') as {schools:typeof state.schools;default_school_id:string};state.schools=context.schools;
    const requested=new URLSearchParams(location.search).get('school')||'';
    state.schoolId=state.schools.some(school=>school.id===requested)?requested:context.default_school_id;
  }catch(error){state.error=error instanceof Error?error.message:String(error);}finally{state.ready=true;}}
  function selectSchool():void{const url=new URL(location.href);if(state.schoolId)url.searchParams.set('school',state.schoolId);else url.searchParams.delete('school');history.replaceState(null,'',url);}
  Vue.createApp({render:PigeRenders.news,components:{'school-community':PigeCommunity.component},setup(){Vue.onMounted(()=>{PigeDialogs.install();void start();});return {state,identity:PigeInstitution.state,start,selectSchool};}}).mount('#school-news');
}
