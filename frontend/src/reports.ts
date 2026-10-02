namespace PigeReports {
  type Catalog = {id:string;title:string;description:string;date_basis:string;statuses:{value:string;label:string}[];filters:string[]};
  type Metric = {key:string;label:string;value:unknown;type:string};
  type Report = {title:string;description:string;date_basis:string;period:{date_from:string;date_to:string;label:string};filters:{label:string;value:string}[];columns:{key:string;label:string;type:string}[];items:Record<string,unknown>[];total:number;page:number;page_size:number;summary:Metric[];monthly:{month:string;label:string;count:number;amount?:string}[];notes:string[]};
  export const component = {props:['schoolId','catalogs'],render:PigeRenders.reports,setup(props:{schoolId:string;catalogs:Record<string,PigeAPI.Row[]>}) {
    const state=Vue.reactive({busy:false,error:'',catalog:[] as Catalog[],kind:'enrollments',dateFrom:'',dateTo:'',preset:'last-three',academicYear:'',classGroup:'',unit:'',status:'',q:'',page:1,result:null as Report|null,appliedQuery:''});
    const base=()=>'/schools/'+props.schoolId+'/reports';
    const selected=()=>state.catalog.find(c=>c.id===state.kind);
    const iso=(d:Date)=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
    function period():void {const today=new Date(),y=today.getFullYear(),m=today.getMonth();let start:Date,end:Date;
      if(state.preset==='custom')return;
      if(state.preset==='month'){start=new Date(y,m,1);end=new Date(y,m+1,0);}
      else if(state.preset==='quarter'){const q=Math.floor(m/3)*3;start=new Date(y,q,1);end=new Date(y,q+3,0);}
      else if(state.preset==='year'){start=new Date(y,0,1);end=new Date(y,11,31);}
      else{start=new Date(y,m-3,1);end=new Date(y,m,0);}
      state.dateFrom=iso(start);state.dateTo=iso(end);
    }
    function query():string {const q=new URLSearchParams({date_from:state.dateFrom,date_to:state.dateTo});
      for(const [k,v] of Object.entries({academic_year_id:state.academicYear,class_group_id:state.classGroup,unit_id:state.unit,status:state.status,q:state.q.trim()}))if(v)q.set(k,v);return q.toString();}
    function changed():boolean{return Boolean(state.result)&&state.appliedQuery!==state.kind+'?'+query();}
    function changeKind():void{state.status='';state.academicYear='';state.classGroup='';state.unit='';state.result=null;state.page=1;state.error='';}
    async function run(action:()=>Promise<void>):Promise<void>{if(state.busy)return;state.busy=true;state.error='';try{await action();}catch(e){state.error=e instanceof Error?e.message:'Não foi possível gerar o relatório.';}finally{state.busy=false;}}
    async function generate(page=1):Promise<void>{await run(async()=>{if(!state.dateFrom||!state.dateTo||state.dateFrom>state.dateTo)throw new Error('Informe um período válido, com a data inicial antes da final.');
      const applied=state.kind+'?'+query();state.result=await PigeAPI.request<Report>(base()+'/management/'+applied+'&page='+page+'&page_size=30');state.appliedQuery=applied;state.page=page;});}
    async function download(format:'pdf'|'csv'):Promise<void>{await run(async()=>{if(!state.result||changed())throw new Error('Atualize o relatório antes de exportar.');const [kind,filters]=state.appliedQuery.split('?');await PigeAPI.download(base()+'/management/'+kind+'.'+format+'?'+filters,'relatorio-'+kind+'-'+state.result.period.date_from+'-'+state.result.period.date_to+'.'+format);});}
    function value(v:unknown,type:string):string {if(v===null||v===undefined||v==='')return '—';if(type==='currency')return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v));if(type==='date')return new Date(String(v).slice(0,10)+'T12:00:00Z').toLocaleDateString('pt-BR',{timeZone:'UTC'});if(type==='number'||type==='integer'||type==='percent')return Number(v).toLocaleString('pt-BR')+(type==='percent'?'%':'');return String(v);}
    const classes=()=> (props.catalogs['class-groups']||[]).filter(c=>(!state.academicYear||c.academic_year_id===state.academicYear)&&(!state.unit||c.unit_id===state.unit));
    const filterAllowed=(name:string)=>selected()?.filters?.includes(name)||false;
    Vue.onMounted(()=>{period();void run(async()=>{const c=await PigeAPI.request<{items:Catalog[]}>(base()+'/catalog');state.catalog=c.items;if(!c.items.some(i=>i.id===state.kind))state.kind=c.items[0]?.id||'';});});
    return{state,selected,period,changeKind,generate,download,value,classes,changed,filterAllowed,get catalogs(){return props.catalogs;}};
  }};
}
