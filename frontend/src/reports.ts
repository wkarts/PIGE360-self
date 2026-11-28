namespace PigeReports {
  type Catalog = {module:string;id:string;title:string;description:string;date_basis:string;statuses:{value:string;label:string}[];filters:string[]};
  type Metric = {key:string;label:string;value:unknown;type:string};
  type Report = {module:string;school_name:string;generated_at:string;status_summary:{label:string;count:number}[];title:string;description:string;date_basis:string;period:{date_from:string;date_to:string;label:string};filters:{label:string;value:string}[];columns:{key:string;label:string;type:string}[];items:Record<string,unknown>[];total:number;page:number;page_size:number;summary:Metric[];monthly:{month:string;label:string;count:number;amount?:string}[];notes:string[]};
  export const component = {props:['schoolId','catalogs','identity','canConfigure','canIssue','canSign'],render:PigeRenders.reports,setup(props:{schoolId:string;canConfigure:boolean;canIssue:boolean;canSign:boolean;catalogs:Record<string,PigeAPI.Row[]>}) {
    const state=Vue.reactive({busy:false,error:'',reportLogo:'',catalog:[] as Catalog[],kind:'enrollments',dateFrom:'',dateTo:'',preset:'last-three',academicYear:'',classGroup:'',unit:'',status:'',q:'',page:1,result:null as Report|null,appliedQuery:''});
    type Preferences={bulletin:string;color:string;font_family:string;student:string;employee:string;teacher:string;watermark_documents:string[];version:number};
    type Recipient={id:string;name:string;number:string;class_name:string;revision?:number;last_revision?:number;operation?:string;failure?:string;checked?:boolean};
    const kit=Vue.reactive({prefs:null as Preferences|null,year:'',grade:'',group:'',offset:0,more:false,
      recipients:[] as Recipient[],notice:''});
    const settingsPath=()=>'/schools/'+props.schoolId+'/report-preferences';
    let loadingPreferences=false,live=true;
    Vue.onBeforeUnmount(()=>{live=false;});
    async function openKit(event:Event){
      if(!(event.currentTarget as HTMLDetailsElement).open || !props.canConfigure || kit.prefs || loadingPreferences)return;
      loadingPreferences=true;
      try{kit.prefs=await PigeAPI.request<Preferences>(settingsPath());}
      catch(error){kit.notice=error instanceof Error?error.message:'Não foi possível carregar os padrões da escola.';}
      finally{loadingPreferences=false;}
    }
    async function saveLogo(event:Event){const input=event.target as HTMLInputElement;
      const file=input.files?.[0];if(!file||!kit.prefs)return;
      const body=new FormData();body.set('file',file);body.set('version',String(kit.prefs.version));
      await run(async()=>{const saved=await PigeAPI.request<{version:number;report_logo:string}>(settingsPath()+'/logo',{method:'PUT',body});
        if(kit.prefs)kit.prefs.version=saved.version;state.reportLogo=saved.report_logo;kit.notice='Logotipo atualizado para esta escola.';});
      input.value='';
    }
    async function savePreferences(){await run(async()=>{
      kit.prefs=await PigeAPI.request<Preferences>(settingsPath(),{method:'PUT',body:JSON.stringify(kit.prefs)});
      kit.notice='Preferências salvas para as próximas emissões.';
    });}
    function resetRecipients(){kit.recipients=[];kit.offset=0;kit.more=false;kit.notice='';}
    async function findRecipients(offset=0){await run(async()=>{
      const params=new URLSearchParams({academic_year_id:kit.year,grade_id:kit.grade,class_group_id:kit.group,offset:String(offset)});
      const found=await PigeAPI.request<{items:Recipient[];more:boolean}>(base()+'/bulletins/enrollments?'+params);
      kit.recipients=found.items.map(item=>({...item,checked:false}));kit.offset=offset;kit.more=found.more;
      kit.notice=found.items.length?'':'Nenhuma matrícula neste recorte.';
    });}
    async function previewBulletin(item:Recipient){await run(async()=>{
      const q=new URLSearchParams();
      if(kit.prefs){q.set('model',kit.prefs.bulletin);q.set('color',kit.prefs.color);}
      await PigeAPI.download(base()+'/bulletins/'+item.id+'/preview.pdf?'+q,'previa-'+item.number+'.pdf');
    });}
    async function signRecipient(item:Recipient){
      item.operation ||= crypto.randomUUID();
      const q=new URLSearchParams({operation:item.operation,expected_revision:String(item.last_revision || 0)});
      try{
        const result=await PigeAPI.post<{revision:number}>(base()+'/bulletins/'+item.id+'/issue?'+q,{});
        item.revision=result.revision;item.last_revision=result.revision;item.checked=false;item.failure='';item.operation=undefined;
      }catch(e){item.failure=e instanceof Error?e.message:'Emissão pendente';}
    }
    async function issueSelected(){await run(async()=>{
      for(const item of kit.recipients.filter(item=>item.checked&&!item.last_revision))await signRecipient(item);
    });}
    async function reissue(item:Recipient){
      await run(async()=>{
        const school=props.schoolId,revision=item.last_revision;
        const available=()=>live&&props.canIssue&&props.canSign&&props.schoolId===school&&
          Boolean(revision)&&item.last_revision===revision&&kit.recipients.includes(item);
        if(!available())return;
        const approved=await PigeDialogs.confirm('Emitir e assinar uma nova revisão do boletim de '+item.name+'?',
          {title:'Assinar nova revisão do boletim',confirmLabel:'Emitir e assinar'});
        if(approved&&available())await signRecipient(item);
      });
    }
    const base=()=>'/schools/'+props.schoolId+'/reports';
    const modules=()=>Array.from(new Set(state.catalog.map(item=>item.module)));
    const issuedAt=(stamp:string)=>new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Bahia'}).format(new Date(stamp));
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
    Vue.onMounted(()=>{period();void run(async()=>{const c=await PigeAPI.request<{items:Catalog[];report_logo:string}>(base()+'/catalog');state.catalog=c.items;state.reportLogo=c.report_logo;if(!c.items.some(i=>i.id===state.kind))state.kind=c.items[0]?.id||'';});});
    return{state,permissions:props,kit,openKit,saveLogo,savePreferences,resetRecipients,findRecipients,previewBulletin,issueSelected,reissue,selected,modules,issuedAt,period,changeKind,generate,download,value,classes,changed,filterAllowed,get catalogs(){return props.catalogs;}};
  }};
}
