namespace PigeEducacenso {
  interface Enrollment {
    enrollment_id:string; enrollment_number?:string; student_number?:string; student_name?:string;
    class_group_id:string; class_name?:string; local_status:string;
    student_inep_code?:string|null; birth_date?:string|null;
    declaration?:{student_name?:string;student_inep_code?:string|null;birth_date?:string|null;status?:string};
  }
  interface Snapshot {
    collection_year?:number; replacement_rule?:string; return_statuses?:string[];
    rows:Enrollment[]; blocks:string[]; official_source:string;
  }
  interface Summary {
    id:string; version:number; digest:string; reference_date:string; stage:string; status:string;
  }
  interface Draft extends Summary {snapshot:Snapshot;rows_display?:Enrollment[];evidence?:Evidence[]}
  interface Evidence {id:string;file_id:string;digest:string;reported_status?:string}
  interface Revision {version:number;digest:string;reason:string;created_at:string}
  interface Catalog {id:string;name:string;status?:string;academic_year_id?:string;starts_on?:string;ends_on?:string}
  const reasons:Record<string,string>={
    leiaute_e_dominios_sem_homologacao:'Leiaute e tabelas de domínio pendentes de homologação.',
    declaracao_oficial_sem_comparacao:'Falta comparar a cobertura com a declaração oficial.',
    selecao_parcial:'Seleção parcial, destinada ao diagnóstico.',
    selecao_sem_matriculas:'Seleção sem matrículas na data informada.'
  };
  const statuses:Record<string,string>={draft:'Rascunho',active:'Ativa',suspended:'Suspensa',transferred:'Transferida',
    cancelled:'Cancelada',completed:'Concluída',inactive:'Inativa'};
  function stageLabel(stage:string){return stage==='matricula_inicial'?'Matrícula Inicial':'Situação do Aluno';}
  function statusLabel(value?:string){return value?(statuses[value]||value):'Não informada';}
  function dateLabel(value?:string|null){return value?.slice(0,10).split('-').reverse().join('/')||'—';}
  function nameOf(row:Enrollment){return row.student_name||row.declaration?.student_name||'Identificação indisponível';}
  function declaredName(row:Enrollment){return row.declaration?.student_name||row.student_name||'Não informado';}

  type OptionalField='student_inep_code'|'birth_date';
  function declaredField(row:Enrollment,key:OptionalField){
    return row.declaration && key in row.declaration ? (row.declaration[key]??'') : (row[key]??'');
  }
  export const component={props:['schoolId','schoolName'],render:PigeRenders.educacenso,setup(props:{schoolId:string;schoolName:string}){
    const root='/schools/'+encodeURIComponent(props.schoolId),base=root+'/educacenso';
    const state=Vue.reactive({busy:false,error:'',notice:'',years:[] as Catalog[],groups:[] as Catalog[],
      year:'',stage:'matricula_inicial',environment:'treinamento',day:'',group:'',scope:'school',q:'',
      results:[] as Enrollment[],searched:false,searchOffset:0,total:0,chosen:null as Enrollment|null,
      preview:null as Snapshot|null,draft:null as Draft|null,history:[] as Summary[],offset:0,archived:false,
      revisions:[] as Revision[],editing:'',editValue:'',editInep:'',editBirth:'',editReason:'',conflict:false,
      file:null as File|null,fileKey:0,reportedStatus:'',tab:'prepare',visibleRows:25});
    let active=true;
    const currentYear=Vue.computed(()=>state.years.find(year=>year.id===state.year));
    const snapshot=Vue.computed(()=>state.tab==='detail'?state.draft?.snapshot:state.tab==='prepare'?state.preview:null);
    const rows=Vue.computed(()=>state.tab==='detail'?(state.draft?.rows_display??state.draft?.snapshot.rows??[]):state.preview?.rows??[]);
    const editDirty=Vue.computed(()=>{
      if(!state.editing)return false;
      const row=rows.value.find(item=>item.enrollment_id===state.editing);
      if(!row||state.editReason.trim())return true;
      if(state.draft?.stage==='situacao_aluno')return state.editValue!==(row.declaration?.status||'');
      return state.editValue!==(row.declaration?.student_name||row.student_name||'') ||
        state.editInep!==declaredField(row,'student_inep_code') || state.editBirth!==declaredField(row,'birth_date');
    });
    const editable=()=>!!state.draft && state.draft.status!=='arquivado' && state.tab==='detail';
    const fmtClass=(row:Enrollment)=>row.class_name || state.groups.find(group=>group.id===row.class_group_id)?.name || 'Turma não identificada';
    const query=(suffix='')=>'?environment='+encodeURIComponent(state.environment)+suffix;
    const draftPath=(id:string,suffix='')=>base+'/drafts/'+encodeURIComponent(id)+suffix;
    function clearEdit(){state.editing='';state.editValue='';state.editInep='';state.editBirth='';state.editReason='';state.conflict=false;}
    function resetSearch(){
      state.chosen=null;state.results=[];state.total=0;state.searched=false;state.searchOffset=0;
      state.preview=null;state.visibleRows=25;state.error='';state.notice='';
    }
    function resetFilters(){state.q='';resetSearch();}
    function yearChanged(){state.group='';resetFilters();}
    function filters(){return {year_id:state.year,stage:state.stage,reference_date:state.day,
      environment:state.environment,class_group_ids:state.group?[state.group]:null};}
    function selection(){
      if(!state.year||!state.day)throw new Error('Informe o ano letivo e a data de referência.');
      if(state.scope==='single'){
        if(!state.chosen)throw new Error('Selecione a matrícula de um aluno antes de validar.');
        return {...filters(),enrollment_ids:[state.chosen.enrollment_id]};
      }
      return filters();
    }
    async function run(work:()=>Promise<void>){
      if(!active||state.busy)return;
      state.busy=true;state.error='';state.notice='';
      try{await work();}catch(error){
        if(active){
          state.error=(error as Error).message;
          if((error as {status?:number}).status===409 && state.tab==='detail')state.conflict=true;
        }
      }finally{if(active)state.busy=false;}
    }
    function search(offset=0){return run(async()=>{
      if(!state.year||!state.day)throw new Error('Informe o ano letivo e a data de referência para buscar o aluno.');
      if(state.scope!=='single')return;
      state.chosen=null;state.preview=null;state.results=[];state.searched=false;
      const page=await PigeAPI.post<{items:Enrollment[];offset:number;total:number}>(base+'/enrollments/search',
        {...filters(),q:state.q.trim(),offset,limit:25});
      state.results=page.items;state.searchOffset=page.offset;state.total=page.total;state.searched=true;
    });}
    function choose(row:Enrollment){if(state.busy)return;state.chosen=row;state.preview=null;state.error='';state.notice='';}
    async function refreshHistory(){
      state.history=await PigeAPI.request<Summary[]>(base+'/drafts'+query('&offset='+state.offset+'&archived='+state.archived));
    }
    async function load(){await run(async()=>{
      const [years,groups]=await Promise.all([PigeAPI.request<Catalog[]>(root+'/academic-years'),PigeAPI.request<Catalog[]>(root+'/class-groups')]);
      state.years=years;state.groups=groups;state.year=(years.find(y=>y.status==='active')||years[0])?.id||'';
    });}
    function preview(){return run(async()=>{
      state.preview=null;const data=selection();
      state.preview=await PigeAPI.post<Snapshot>(base+'/preview',data);state.visibleRows=25;
    });}
    async function loadRevisions(id:string){
      state.revisions=(await PigeAPI.request<{items:Revision[]}>(draftPath(id,'/revisions')+query())).items;
    }
    function showDraft(draft:Draft){
      state.draft=draft;state.tab='detail';state.preview=null;state.file=null;state.reportedStatus='';
      state.visibleRows=25;state.revisions=[];clearEdit();
    }
    async function select(id:string){
      const draft=await PigeAPI.request<Draft>(draftPath(id)+query());
      showDraft(draft);await loadRevisions(id);
    }
    function save(){return run(async()=>{
      if(!state.preview)return;
      const draft=await PigeAPI.post<Summary>(base+'/drafts',selection());
      state.preview=null;state.offset=0;state.archived=false;
      await select(draft.id);
    });}
    function open(id:string){return run(()=>select(id));}
    function openTab(tab:string){if(state.busy||state.editing||state.tab===tab)return;
      state.tab=tab;state.error='';state.notice='';
      if(tab==='history')return run(refreshHistory);
    }
    function page(delta:number){return run(async()=>{state.offset=Math.max(0,state.offset+delta);await refreshHistory();});}
    function historyType(archived:boolean){return run(async()=>{
      state.archived=archived;state.offset=0;state.history=[];await refreshHistory();
    });}
    function changeEnvironment(){resetFilters();state.draft=null;state.file=null;state.revisions=[];state.offset=0;
      state.history=[];state.archived=false;state.tab='prepare';clearEdit();}
    function edit(row:Enrollment){if(state.busy||!editable()||state.editing||state.file)return;
      state.editing=row.enrollment_id;
      state.editValue=state.draft!.stage==='matricula_inicial'?(row.declaration?.student_name||row.student_name||''):(row.declaration?.status||'');
      state.editInep=declaredField(row,'student_inep_code');state.editBirth=declaredField(row,'birth_date');
      state.editReason='';state.conflict=false;state.error='';state.notice='';
      Vue.nextTick(()=>document.querySelector<HTMLInputElement>('.school-task:not([hidden]) .educacenso-editor input, .educacenso-editor input')?.focus());
    }
    async function canDiscardEdit(){
      if(!editDirty.value)return true;
      const id=state.draft?.id,version=state.draft?.version,editing=state.editing;
      const ok=await PigeDialogs.confirm('As alterações em edição serão descartadas.',{
        title:'Descartar ajuste?',confirmLabel:'Descartar ajuste',cancelLabel:'Continuar editando',destructive:true});
      return ok && active && state.draft?.id===id && state.draft?.version===version && state.editing===editing;
    }
    async function cancelEdit(){if(await canDiscardEdit()){clearEdit();state.error='';}}
    async function reloadDraft(){
      const id=state.draft?.id;if(id && await canDiscardEdit())await open(id);
    }
    function clearFile(){state.file=null;state.fileKey++;}
    function updateRow(){return run(async()=>{
      const draft=state.draft;if(!draft||!state.editing||!editable()||state.conflict)return;
      const value=state.editValue.trim(),reason=state.editReason.trim(),nameStage=draft.stage==='matricula_inicial';
      if(!value||value.length>(nameStage?200:80)||reason.length<5||reason.length>1000)throw new Error('Confira o valor declarado e informe o motivo do ajuste (5 a 1.000 caracteres).');
      if(!nameStage && Object.hasOwn(statuses,value.toLowerCase()))throw new Error('Informe a situação do aluno na declaração. O estado administrativo da matrícula é exibido em separado.');
      const original=rows.value.find(row=>row.enrollment_id===state.editing);
      if(!original)throw new Error('A matrícula saiu da revisão. Atualize o rascunho.');
      const changes:Record<string,string|null>={};
      if(nameStage){
        if(value!==(original.declaration?.student_name||original.student_name||''))changes.student_name=value;
        if(state.editInep.trim()!==declaredField(original,'student_inep_code'))changes.student_inep_code=state.editInep.trim()||null;
        if(state.editBirth!==declaredField(original,'birth_date'))changes.birth_date=state.editBirth||null;
      }else if(value!==(original.declaration?.status||''))changes.status=value;
      if(!Object.keys(changes).length)throw new Error('Altere pelo menos um dado da declaração antes de salvar.');
      const changed=await PigeAPI.patch<Draft>(draftPath(draft.id,'/rows/'+encodeURIComponent(state.editing))+query(),
        {version:draft.version,reason,...changes});
      showDraft(changed);state.notice='Ajuste registrado no rascunho.';await loadRevisions(changed.id);
    });}
    async function remove(row?:Enrollment){
      const draft=state.draft;if(!draft||!editable()||state.busy||state.editing||state.file)return;
      const environment=state.environment,version=draft.version;
      const reason=await PigeDialogs.prompt(row?'A revisão deixará de incluir a matrícula de '+nameOf(row)+'. O cadastro do aluno e a situação da matrícula na escola serão preservados.':
        'O rascunho ficará disponível em Arquivados para consulta das revisões e evidências. Os cadastros escolares serão preservados.',{
          title:row?'Retirar matrícula do rascunho':'Arquivar rascunho',inputLabel:'Motivo',minLength:5,maxLength:1000,
          confirmLabel:row?'Retirar do rascunho':'Arquivar rascunho',cancelLabel:'Voltar',destructive:true});
      if(!reason||!active||!editable()||state.draft?.id!==draft.id||state.draft.version!==version||state.environment!==environment)return;
      await run(async()=>{
        const body={version,reason:reason.trim()};
        const changed=row?await PigeAPI.request<Draft>(draftPath(draft.id,'/rows/'+encodeURIComponent(row.enrollment_id))+query(),{method:'DELETE',body:JSON.stringify(body)}):
          await PigeAPI.post<Draft>(draftPath(draft.id,'/archive')+query(),body);
        showDraft(changed);state.notice=row?'Matrícula retirada deste rascunho.':'Rascunho arquivado.';
        await loadRevisions(changed.id);
      });
    }
    function attach(){return run(async()=>{
      const draft=state.draft;
      if(!draft || !editable() || !state.file || state.editing)return;
      const form=new FormData();form.set('file',state.file);
      if(state.reportedStatus)form.set('reported_status',state.reportedStatus);
      await PigeAPI.request(draftPath(draft.id,'/evidence')+query(),{method:'POST',body:form});
      state.file=null;await select(draft.id);state.notice='Evidência anexada.';
    });}
    function diagnostic(version?:number){const draft=state.draft;if(draft)return run(()=>PigeAPI.download(
      draftPath(draft.id,'/diagnostico.json')+query('&version='+(version??draft.version)),'diagnostico-local.json'));}
    function studentFile(row:Enrollment){const draft=state.draft;if(draft)return run(()=>PigeAPI.download(
      draftPath(draft.id,'/enrollments/'+encodeURIComponent(row.enrollment_id)+'/ficha.pdf')+query('&version='+draft.version),'ficha-aluno.pdf'));}
    function fileChanged(event:Event){state.file=(event.target as HTMLInputElement).files?.[0]||null;}
    function download(item:Evidence){return run(()=>PigeAPI.download(root+'/files/'+encodeURIComponent(item.file_id)+'/download','evidencia.bin'));}
    Vue.onMounted(load);Vue.onUnmounted(()=>{active=false;});
    return {props,state,snapshot,rows,currentYear,editDirty,editable,stageLabel,statusLabel,dateLabel,nameOf,declaredName,declaredField,fmtClass,reasons,
      resetSearch,resetFilters,yearChanged,changeEnvironment,search,choose,preview,save,open,openTab,edit,cancelEdit,reloadDraft,updateRow,remove,
      page,historyType,attach,diagnostic,studentFile,fileChanged,clearFile,download};
  }};
}
