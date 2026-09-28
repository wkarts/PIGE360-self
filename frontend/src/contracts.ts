namespace PigeContracts {
  export let hasUnsavedChanges=():boolean=>false;
  type Row=PigeAPI.Row;
  type Template=Row&{name:string;kind:string;header:string;body:string;footer:string;academic_year_id?:string|null;valid_from?:string|null;valid_until?:string|null;active:boolean;require_signature?:boolean;created_at?:string;letterhead_file_id?:string|null};
  type Field={key:string;label:string;source:string};
  type Preview={header:string;content:string;footer:string;variables:Record<string,string>;missing_fields:string[];template_version:number};
  type ImportResult={name:string;header?:string;body:string;footer?:string;warnings:string[];placeholders:string[]};
  type Enrollment=Row&{student_id:string;student_name:string;number:string;year_name:string;status:string};
  type Props={schoolId:string;permissions:string[];role:string;enrollmentId?:string;issuedId?:string};
  type Draft={name:string;kind:string;header:string;body:string;footer:string;academic_year_id:string;valid_from:string;valid_until:string;active:boolean;require_signature:boolean};
  const emptyDraft=():Draft=>({name:'',kind:'educational_contract',header:'',body:'',footer:'',academic_year_id:'',valid_from:'',valid_until:'',active:true,require_signature:true});
  const contractKind=(kind:string):boolean=>kind.split('_').some(token=>['contract','contracts','contrato','contratos'].includes(token));
  const str=(value:unknown):string=>value==null?'':String(value);
  const date=(value:unknown):string=>{const raw=str(value);return raw?new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC'}).format(new Date(raw.length===10?raw+'T12:00:00Z':raw)):'—';};
  export const component={props:['schoolId','permissions','role','enrollmentId','issuedId'],render:PigeRenders.contracts,setup(props:Props){
    const state=Vue.reactive({
      busy:false,loading:false,error:'',notice:'',tab:props.issuedId?'signatures':'templates',
      templates:[] as Template[],applicable:[] as Template[],years:[] as Row[],fields:[] as Field[],
      selected:null as Template|null,editing:false,draft:emptyDraft(),savedDraft:'',activeSection:'body',
      importWarnings:[] as string[],importFileName:'',letterheadName:'',letterheadUrl:'',
      enrollmentSearch:'',enrollmentChoices:[] as Enrollment[],enrollment:null as Enrollment|null,
      templateId:'',values:{} as Record<string,string>,preview:null as Preview|null,previewStale:false,
      issued:null as (Row&{file_id:string;template_name?:string})|null
    });
    const identity=PigeInstitution.state;
    let letterheadFile:File|null=null;
    const base=()=>'/schools/'+props.schoolId;
    const can=(permission:string)=>props.permissions.includes(permission);
    const textDirty=()=>state.editing&&JSON.stringify(state.draft)!==state.savedDraft;
    const editorDirty=()=>textDirty()||Boolean(letterheadFile);
    hasUnsavedChanges=editorDirty;
    const templatesResponse=(data:{items?:Template[]}|Template[]):Template[]=>Array.isArray(data)?data:data.items||[];
    async function run(action:()=>Promise<void>):Promise<void>{if(state.busy)return;state.busy=true;state.error='';state.notice='';try{await action();}catch(error){state.error=error instanceof Error?error.message:String(error);}finally{state.busy=false;}}
    async function load():Promise<void>{state.loading=true;state.error='';try{
      const [templates,years,fields]=await Promise.all([
        PigeAPI.request<{items:Template[]}>(base()+'/document-templates?include_inactive=true'),
        PigeAPI.request<Row[]>(base()+'/academic-years'),
        PigeAPI.request<{fields:Field[]}>(base()+'/document-templates/fields')
      ]);
      state.templates=templatesResponse(templates);state.years=years;state.fields=fields.fields||[];
      if(state.enrollment)await loadApplicable();
    }catch(error){state.error=error instanceof Error?error.message:String(error);}finally{state.loading=false;}}
    async function loadApplicable():Promise<void>{const enrollment=state.enrollment;if(!enrollment){state.applicable=[];return;}
      const data=await PigeAPI.request<{items:Template[]}>(base()+'/document-templates?enrollment_id='+encodeURIComponent(enrollment.id));
      if(state.enrollment?.id!==enrollment.id)return;
      state.applicable=templatesResponse(data);if(!state.applicable.some(template=>template.id===state.templateId)){state.templateId='';state.preview=null;state.values={};}
    }
    function beginNew():void{if(editorDirty()&&!window.confirm('Descartar alterações não salvas?'))return;
      clearLetterhead();state.selected=null;state.draft=emptyDraft();state.savedDraft=JSON.stringify(state.draft);state.importWarnings=[];state.importFileName='';state.editing=true;state.tab='templates';state.error='';state.notice='';
    }
    async function beginEdit(item:Template):Promise<void>{if(editorDirty()&&!window.confirm('Descartar alterações não salvas?'))return;
      await run(async()=>{
        const template=await PigeAPI.request<Template>(base()+'/document-templates/'+item.id);
        state.selected=template;state.draft={name:template.name,kind:template.kind,header:str(template.header),body:template.body,footer:str(template.footer),academic_year_id:str(template.academic_year_id),valid_from:str(template.valid_from),valid_until:str(template.valid_until),active:Boolean(template.active),require_signature:Boolean(template.require_signature)||contractKind(template.kind)};
        state.savedDraft=JSON.stringify(state.draft);state.importWarnings=[];state.importFileName='';state.editing=true;state.tab='templates';
        await hydrateLetterhead(template);
      });
    }
    function cancelEdit():void{if(editorDirty()&&!window.confirm('Descartar alterações não salvas?'))return;state.editing=false;state.selected=null;state.importWarnings=[];state.importFileName='';clearLetterhead();}
    function clearLetterhead():void{if(state.letterheadUrl)URL.revokeObjectURL(state.letterheadUrl);state.letterheadUrl='';state.letterheadName='';letterheadFile=null;}
    async function hydrateLetterhead(template:Template):Promise<void>{clearLetterhead();if(template.letterhead_file_id)state.letterheadUrl=await PigeAPI.objectUrl(base()+'/files/'+template.letterhead_file_id+'/download');}
    function letterheadChanged(event:Event):void{letterheadFile=(event.target as HTMLInputElement).files?.[0]||null;state.letterheadName=letterheadFile?.name||'';}
    async function uploadLetterhead():Promise<void>{if(!state.selected||!letterheadFile)return;
      if(textDirty()){state.error='Salve primeiro as alterações do texto para vincular o timbrado à versão atual.';return;}
      if(!/^image\/(png|jpeg)$/.test(letterheadFile.type)||letterheadFile.size>2*1024*1024){state.error='Use PNG ou JPEG de até 2 MB para o papel timbrado.';return;}
      await run(async()=>{const body=new FormData();body.append('file',letterheadFile!);
        const saved=await PigeAPI.request<Template>(base()+'/document-templates/'+state.selected!.id+'/letterhead',{method:'POST',body});
        state.selected=saved;state.templates=state.templates.map(template=>template.id===saved.id?saved:template);
        await hydrateLetterhead(saved);state.notice='Papel timbrado armazenado no modelo. A nova versão será usada nas próximas emissões.';
      });
    }
    async function removeLetterhead():Promise<void>{if(!state.selected?.letterhead_file_id||!window.confirm('Remover o papel timbrado deste modelo para as próximas emissões?'))return;
      if(textDirty()){state.error='Salve primeiro as alterações do texto para modificar o papel timbrado.';return;}
      await run(async()=>{const saved=await PigeAPI.request<Template>(base()+'/document-templates/'+state.selected!.id+'/letterhead',{method:'DELETE'});
        state.selected=saved;state.templates=state.templates.map(template=>template.id===saved.id?saved:template);clearLetterhead();state.notice='Papel timbrado removido para as próximas emissões.';
      });
    }
    function yearName(id:unknown):string{return str(state.years.find(year=>year.id===id)?.name)||'Todos os períodos';}
    function syncContractSignature():void{if(contractKind(state.draft.kind))state.draft.require_signature=true;}
    function validateDraft():void{const draft=state.draft;
      if(!draft.name.trim())throw new Error('Informe o nome do modelo.');
      if(!/^[a-z][a-z0-9_]{1,39}$/.test(draft.kind))throw new Error('A categoria deve começar com letra minúscula e conter apenas letras, números e sublinhado (2 a 40 caracteres).');
      if(draft.body.trim().length<10||draft.body.length>100000||draft.header.length>500||draft.footer.length>500)throw new Error('O conteúdo deve ter entre 10 e 100 mil caracteres; cabeçalho e rodapé até 500 caracteres.');
      if(draft.valid_from&&draft.valid_until&&draft.valid_from>draft.valid_until)throw new Error('A validade final precisa ser posterior à inicial.');
    }
    async function save():Promise<void>{await run(async()=>{
      validateDraft();const draft=state.draft;
      const data={...draft,name:draft.name.trim(),kind:draft.kind.trim(),require_signature:draft.require_signature||contractKind(draft.kind),academic_year_id:draft.academic_year_id||null,valid_from:draft.valid_from||null,valid_until:draft.valid_until||null};
      const saved=state.selected
        ?await PigeAPI.patch<Template>(base()+'/document-templates/'+state.selected.id,{...data,version:state.selected.version})
        :await PigeAPI.post<Template>(base()+'/document-templates',data);
      state.selected=saved;state.savedDraft=JSON.stringify(state.draft);state.importWarnings=[];state.importFileName='';
      const result=await PigeAPI.request<{items:Template[]}>(base()+'/document-templates?include_inactive=true');state.templates=templatesResponse(result);
      if(state.enrollment)await loadApplicable();state.notice='Modelo salvo. A versão anterior dos documentos já emitidos continua preservada.';
    });}
    async function importDocx(event:Event):Promise<void>{const input=event.target as HTMLInputElement;const file=input.files?.[0];input.value='';if(!file)return;
      if(!/\.docx$/i.test(file.name)){state.error='Selecione um arquivo DOCX (.docx).';return;}
      if(file.size>2*1024*1024){state.error='O arquivo DOCX deve ter até 2 MB.';return;}
      if(state.draft.body.trim()&&!window.confirm('Substituir o texto atual pelo texto extraído deste DOCX?'))return;
      await run(async()=>{
        const body=new FormData();body.append('file',file);
        const converted=await PigeAPI.request<ImportResult>(base()+'/document-templates/import-docx',{method:'POST',body});
        if(!state.editing)beginNew();
        state.draft={...state.draft,name:state.draft.name||converted.name,header:converted.header||'',body:converted.body,footer:converted.footer||''};
        state.importWarnings=converted.warnings||[];state.importFileName=file.name;
        state.notice='Texto do DOCX convertido para edição. Revise cada cláusula e substitua lacunas por campos antes de salvar.';
      });
    }
    async function importJson(event:Event):Promise<void>{const input=event.target as HTMLInputElement;const file=input.files?.[0];input.value='';if(!file)return;
      if(!/\.json$/i.test(file.name)||file.size>1024*1024){state.error='Selecione um modelo JSON de até 1 MB.';return;}
      if(state.draft.body.trim()&&!window.confirm('Substituir o conteúdo atual pelo modelo JSON?'))return;
      await run(async()=>{
        let parsed:unknown;try{parsed=JSON.parse(await file.text());}catch{throw new Error('O arquivo JSON está inválido.');}
        const outer=parsed as Record<string,unknown>;
        const raw=outer&&typeof outer==='object'&&!Array.isArray(outer)&&outer.template&&typeof outer.template==='object'?outer.template as Record<string,unknown>:outer;
        if(!raw||typeof raw!=='object'||Array.isArray(raw)||typeof raw.name!=='string'||typeof raw.body!=='string'||!raw.body.trim())throw new Error('O modelo JSON precisa conter name e body de texto.');
        if(raw.body.length>100000||str(raw.header).length>500||str(raw.footer).length>500)throw new Error('O texto do modelo excede o limite do editor.');
        if(!state.editing)beginNew();
        const requestedYear=str(raw.academic_year||outer?.academic_year||file.name.match(/20\d{2}/)?.[0]);
        const year=requestedYear?state.years.find(item=>String(item.name).includes(requestedYear)):undefined;
        const kind=typeof raw.kind==='string'?raw.kind:'educational_contract',needsA1=contractKind(kind);
        state.draft={name:raw.name.slice(0,160),kind,header:str(raw.header),body:raw.body,footer:str(raw.footer),academic_year_id:str(year?.id)||'',valid_from:typeof raw.valid_from==='string'?raw.valid_from:'',valid_until:typeof raw.valid_until==='string'?raw.valid_until:'',active:false,require_signature:needsA1||Boolean(raw.require_signature)};
        state.importFileName=file.name;state.importWarnings=needsA1&&raw.require_signature===false?['Este é um contrato: a assinatura A1 da escola foi ativada para cumprir a regra de emissão.']:[];
        state.notice='Modelo JSON carregado somente no editor. Confira o ano letivo e o texto; após salvar, envie o timbrado e ative quando estiver revisado.';
      });
    }
    function insertField(key:string,event:Event):void{
      const target=document.getElementById('contract-'+state.activeSection+'-editor') as HTMLTextAreaElement|null;
      if(!target)return;
      const section=target.dataset.section as 'header'|'body'|'footer';if(!['header','body','footer'].includes(section))return;
      const value=state.draft[section],start=target.selectionStart,end=target.selectionEnd,marker='{{'+key+'}}';
      state.draft[section]=value.slice(0,start)+marker+value.slice(end);
      void Vue.nextTick(()=>{target.focus();target.setSelectionRange(start+marker.length,start+marker.length);});
    }
    const category=(key:string):string=>key.startsWith('aluno.')?'Aluno':key.startsWith('contratante')||key.startsWith('responsavel.')?'Responsáveis':key.startsWith('financeiro.')?'Financeiro':key.startsWith('escola.')?'Escola':key.startsWith('matricula.')?'Matrícula':key.startsWith('assinatura.')||key.startsWith('testemunha')?'Assinaturas':'Outros';
    function categoryFields(name:string):Field[]{return state.fields.filter(field=>category(field.key)===name);}
    const categories=['Escola','Aluno','Responsáveis','Matrícula','Financeiro','Assinaturas','Outros'];
    function placeholders():string[]{const matches=(state.draft.header+'\n'+state.draft.body+'\n'+state.draft.footer).matchAll(/\{\{\s*([a-z][a-z0-9_.]*)\s*\}\}/gi);return Array.from(new Set(Array.from(matches,m=>m[1])));}
    function fieldLabel(key:string):string{return state.fields.find(field=>field.key===key)?.label||key;}
    async function searchEnrollments():Promise<void>{const q=state.enrollmentSearch.trim();if(q.length<2){state.enrollmentChoices=[];return;}
      await run(async()=>{const result=await PigeAPI.request<PigeAPI.Page<Enrollment>>(base()+'/enrollments?page_size=20&q='+encodeURIComponent(q));state.enrollmentChoices=result.items;});
    }
    async function chooseEnrollment(enrollment:Enrollment):Promise<void>{state.enrollment=enrollment;state.enrollmentSearch='';state.enrollmentChoices=[];state.values={};state.preview=null;state.issued=null;state.templateId='';await run(loadApplicable);}
    function clearEnrollment():void{state.enrollment=null;state.applicable=[];state.templateId='';state.preview=null;state.values={};state.issued=null;}
    function selectTemplate():void{state.preview=null;state.values={};state.issued=null;}
    function previewKeys():string[]{return state.preview?Array.from(new Set([...Object.keys(state.preview.variables||{}),...(state.preview.missing_fields||[])])):[];}
    function displayValue(key:string):string{return Object.prototype.hasOwnProperty.call(state.values,key)?state.values[key]:str(state.preview?.variables?.[key]);}
    function automaticValue(key:string):boolean{return !Object.prototype.hasOwnProperty.call(state.values,key)&&Boolean(state.preview?.variables?.[key]);}
    function setValue(key:string,event:Event):void{state.values[key]=(event.target as HTMLInputElement).value;state.previewStale=true;state.issued=null;}
    async function preview():Promise<void>{if(!state.templateId||!state.enrollment)return;await run(async()=>{
      state.preview=await PigeAPI.post<Preview>(base()+'/document-templates/'+state.templateId+'/preview',{enrollment_id:state.enrollment!.id,values:state.values});
      state.previewStale=false;state.issued=null;
    });}
    async function issue():Promise<void>{if(!state.templateId||!state.enrollment||!state.preview)return;await run(async()=>{
      if(state.previewStale||state.preview?.missing_fields?.length){throw new Error('Preencha os campos pendentes e gere uma nova prévia antes de emitir.');}
      const template=state.applicable.find(item=>item.id===state.templateId);
      if(!template||!template.active)throw new Error('Selecione um modelo ativo para esta matrícula.');
      const result=await PigeAPI.post<Row&{file_id:string;template_name?:string;signature_status?:string}>(base()+'/document-templates/'+state.templateId+'/issue',{enrollment_id:state.enrollment!.id,values:state.values});
      state.issued=result;state.notice='PDF emitido e preservado na ficha do aluno. Repetir a mesma emissão reutiliza o documento idêntico.';
      await downloadIssuedFile(result,(result.template_name||template.name).replace(/[^a-z0-9_-]+/gi,'-')+'.pdf');
    });}
    async function downloadPdfPreview():Promise<void>{if(!state.templateId||!state.enrollment)return;await run(()=>PigeAPI.downloadPost(base()+'/document-templates/'+state.templateId+'/preview.pdf',{enrollment_id:state.enrollment!.id,values:state.values},'previa-documento.pdf'));}
    async function downloadIssuedFile(issued:Row&{file_id:string;signature_status?:string},name:string):Promise<void>{
      let fileId=issued.file_id;
      if(issued.signature_status&&issued.signature_status!=='unsigned'){
        const current=await PigeAPI.request<{file_id:string;cryptographic_valid:boolean|null}>(base()+'/issued-documents/'+issued.id+'/signatures');
        if(!current.cryptographic_valid)throw new Error('A via assinada não passou na verificação de integridade.');
        fileId=current.file_id;
      }
      await PigeAPI.download(base()+'/files/'+fileId+'/download',name);
    }
    async function downloadIssued():Promise<void>{if(!state.issued)return;await run(()=>downloadIssuedFile(state.issued!,'documento-emitido.pdf'));}
    async function activateEnrollment(id:string):Promise<void>{try{const enrollment=await PigeAPI.request<Enrollment>(base()+'/enrollments/'+id);if(!props.issuedId)state.tab='issue';await chooseEnrollment(enrollment);}catch(error){state.error=error instanceof Error?error.message:String(error);}}
    const beforeUnload=(event:BeforeUnloadEvent)=>{if(editorDirty()){event.preventDefault();event.returnValue='';}};
    Vue.onMounted(()=>{window.addEventListener('beforeunload',beforeUnload);void load().then(()=>{if(props.enrollmentId)void activateEnrollment(props.enrollmentId);});});
    Vue.onUnmounted(()=>{window.removeEventListener('beforeunload',beforeUnload);hasUnsavedChanges=()=>false;clearLetterhead();});
    return{state,identity,can,str,date,load,beginNew,beginEdit,cancelEdit,save,importDocx,importJson,insertField,categories,categoryFields,yearName,contractKind,syncContractSignature,editorDirty,placeholders,fieldLabel,automaticValue,searchEnrollments,chooseEnrollment,clearEnrollment,selectTemplate,previewKeys,displayValue,setValue,preview,issue,downloadPdfPreview,downloadIssued,letterheadChanged,uploadLetterhead,removeLetterhead};
  }};
}
