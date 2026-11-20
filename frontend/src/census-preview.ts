namespace PigeCensus {
  type Result = {enrollments:number; students:number; students_without_local_inep_id:number; groups:{name:string;enrollments:number}[]};
  export const component = {
    props:['schoolId','canConfigure'], render:PigeRenders.censusPreview,
    setup(props:{schoolId:string;canConfigure:boolean}) {
      const state=Vue.reactive({configuration:null as null|{enabled:boolean;version:number},years:[] as PigeAPI.Row[],year:'',reference:'',busy:false,error:'',result:null as Result|null});
      function clear(){state.error='';state.result=null;}
      async function preview(){
        if(state.busy)return;
        clear();state.busy=true;
        try{
          const params=new URLSearchParams({academic_year_id:state.year,reference_date:state.reference});
          state.result=await PigeAPI.request<Result>('/schools/'+props.schoolId+'/educacenso/preview?'+params);
        }catch(e){state.error=e instanceof Error?e.message:String(e);}
        finally{state.busy=false;}
      }
      const base='/schools/'+props.schoolId+'/educacenso';
      async function load(){
        state.configuration=await PigeAPI.request<{enabled:boolean;version:number}>(base+'/configuration');
        state.years=state.configuration.enabled?await PigeAPI.request<PigeAPI.Row[]>(base+'/years'):[];
      }
      async function configure(){
        if(!state.configuration||state.busy)return;
        state.busy=true;clear();
        try{
          await PigeAPI.request(base+'/configuration',{method:'PUT',body:JSON.stringify({
            enabled:!state.configuration.enabled,version:state.configuration.version
          })});
          await load();
        }catch(e){state.error=e instanceof Error?e.message:String(e);}
        finally{state.busy=false;}
      }
      Vue.onMounted(async()=>{
        try{await load();}
        catch(e){state.error=e instanceof Error?e.message:String(e);}
      });
      return {state,props,preview,clear,configure};
    }
  };
}
