/** Reutilizável em cadastros/portal. Sugere campos; não salva nem autoriza documentos. */
namespace PigeAssist {
  type Target=Record<string,unknown>;
  interface Suggestion {field:string;value:string;evidence?:string;confidence?:number|null;checked:boolean;before:unknown;targetField:string}
  interface Result {text:string;confidence:number|null;suggestions:Omit<Suggestion,'checked'|'before'|'targetField'>[];warnings:string[]}
  interface Job {id:string;status:string;error_code:string;result:Result|null}
  interface Lookup {data:Record<string,string>;provider:string;fetched_at:string;cached:boolean;stale:boolean;warning:string}
  interface Props {target:Target;fields:string[];request:<T>(path:string,options?:RequestInit)=>Promise<T>;root:string;lookupRoot:string;ocr:boolean;cnpj:boolean;cep:boolean;mapping:Record<string,string>;label:string;source:string}
  let instance=0;
  const labels:Record<string,string>={name:'Nome / razão social',trade_name:'Nome fantasia',cpf:'CPF',cnpj:'CNPJ',document:'Documento',birth_date:'Nascimento',birth_certificate:'Certidão',rg:'RG',rg_issuer:'Órgão emissor',mother_name:'Nome da mãe',father_name:'Nome do pai',birth_city:'Naturalidade',nationality:'Nacionalidade',postal_code:'CEP',street:'Logradouro',address:'Endereço completo',address_number:'Número',address_complement:'Complemento',district:'Bairro',city:'Cidade',state:'UF',country:'País',email:'E-mail',phone:'Telefone',registration_status:'Situação cadastral',opened_on:'Abertura',legal_nature:'Natureza jurídica',main_activity:'Atividade principal'};
  export const component={
    props:{target:{type:Object,required:true},fields:{type:Array,default:()=>[]},request:{type:Function,required:true},root:{type:String,required:true},lookupRoot:{type:String,default:''},ocr:{type:Boolean,default:true},cnpj:{type:Boolean,default:false},cep:{type:Boolean,default:true},mapping:{type:Object,default:()=>({})},label:{type:String,default:'este cadastro'},source:{type:String,default:''}},
    emits:['applied'],render:PigeRenders.assist,
    setup(props:Props,{emit}:{emit:(event:string,data:unknown)=>void}){
      const id='assist-'+(++instance);
      const s=Vue.reactive({open:false,busy:false,error:'',notice:'',purpose:'identity',fileName:'',preview:'',camera:false,
        status:'',jobId:'',rows:[] as Suggestion[],text:'',warnings:[] as string[],source:'',query:'',kind:'' as ''|'cep'|'cnpj',confirmed:false});
      let file:File|null=null,stream:MediaStream|null=null,sequence=0,disposed=false,timer:ReturnType<typeof setTimeout>|null=null;
      const targetField=(key:string)=>props.mapping[key]||key;
      const fields=()=>new Set(props.fields.length?props.fields:Object.keys(props.target));
      function stopCamera():void{stream?.getTracks().forEach(track=>track.stop());stream=null;s.camera=false;}
      function clearPreview():void{if(s.preview)URL.revokeObjectURL(s.preview);s.preview='';}
      function resetResult():void{s.rows=[];s.text='';s.warnings=[];s.source='';s.confirmed=false;s.error='';s.notice='';}
      function proposals(result:Result):void{
        const allowed=fields();s.text=result.text;s.warnings=result.warnings;
        s.rows=result.suggestions.filter(r=>allowed.has(targetField(r.field))).map(r=>({...r,targetField:targetField(r.field),before:props.target[targetField(r.field)],checked:!props.target[targetField(r.field)]}));
        s.status='Leitura concluída';if(!s.rows.length)s.notice='Nenhum campo identificado com segurança para esta ficha. Consulte o texto lido ou preencha manualmente.';
      }
      function selectFile(e:Event):void{const input=e.target as HTMLInputElement;file=input.files?.[0]||null;input.value='';clearPreview();resetResult();s.fileName=file?.name||'';if(file?.type.startsWith('image/'))s.preview=URL.createObjectURL(file);if(file)void analyze();}
      async function camera():Promise<void>{s.open=true;s.error='';const stamp=++sequence;
        try{if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('Abra por HTTPS ou use “Fotografar / escolher arquivo”.');
          const acquired=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}}});
          if(disposed||stamp!==sequence){acquired.getTracks().forEach(t=>t.stop());return;}
          stopCamera();stream=acquired;s.camera=true;await Vue.nextTick();const video=document.getElementById(id+'-camera') as HTMLVideoElement|null;
          if(!video)throw new Error('Câmera não disponível nesta tela.');video.srcObject=stream;await video.play();
        }catch(e){stopCamera();s.error='Não foi possível abrir a câmera. '+(e instanceof Error?e.message:'Use o envio de arquivo.');}}
      async function capture():Promise<void>{const video=document.getElementById(id+'-camera') as HTMLVideoElement|null;if(!video?.videoWidth)return;
        const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;
        canvas.getContext('2d')!.drawImage(video,0,0);const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',.92));
        if(blob){file=new File([blob],'documento.jpg',{type:'image/jpeg'});s.fileName=file.name;clearPreview();s.preview=URL.createObjectURL(blob);resetResult();}stopCamera();if(file)void analyze();}
      async function rotate():Promise<void>{if(!file||!s.preview)return;const image=new Image();image.src=s.preview;await image.decode();
        const canvas=document.createElement('canvas');canvas.width=image.naturalHeight;canvas.height=image.naturalWidth;const ctx=canvas.getContext('2d')!;
        ctx.translate(canvas.width,0);ctx.rotate(Math.PI/2);ctx.drawImage(image,0,0);const blob=await new Promise<Blob|null>(r=>canvas.toBlob(r,'image/jpeg',.92));
        if(blob){file=new File([blob],'documento-rotacionado.jpg',{type:'image/jpeg'});clearPreview();s.preview=URL.createObjectURL(blob);s.fileName=file.name;}}
      async function poll(job:Job,stamp:number,owner:Target,started:number):Promise<void>{
        if(disposed||stamp!==sequence||owner!==props.target)return;
        s.jobId=job.id;s.status=job.status==='queued'?'Documento na fila de leitura…':'Lendo documento…';
        if(job.status==='succeeded'&&job.result){proposals(job.result);s.source='Leitura local do documento';s.busy=false;return;}
        if(['failed','cancelled'].includes(job.status)){s.busy=false;s.error='Não foi possível ler o documento ('+job.error_code+'). Use outra foto ou preencha manualmente.';return;}
        if(Date.now()-started>180000){s.busy=false;s.error='A leitura está demorando. Verifique o worker OCR; o preenchimento manual não depende dele.';return;}
        timer=setTimeout(async()=>{try{const next=await props.request<Job>(props.root+'/ocr/jobs/'+job.id);await poll(next,stamp,owner,started);}catch(e){if(stamp===sequence){s.busy=false;s.error=e instanceof Error?e.message:String(e);}}},1800);
      }
      function openDocument():void{++sequence;stopCamera();resetResult();s.open=true;s.kind='';}
      async function analyze():Promise<void>{if(s.busy)return;if(!file&&!props.source){s.error='Selecione ou fotografe um documento.';return;}
        stopCamera();resetResult();s.busy=true;s.open=true;const stamp=++sequence,owner=props.target;
        try{let job:Job;if(!file&&props.source)job=await props.request<Job>(props.source,{method:'POST',body:JSON.stringify({purpose:s.purpose})});
          else{const body=new FormData();body.set('purpose',s.purpose);body.set('file',file!);job=await props.request<Job>(props.root+'/ocr/jobs',{method:'POST',body});}
          await poll(job,stamp,owner,Date.now());
        }catch(e){if(stamp===sequence){s.busy=false;s.error=e instanceof Error?e.message:String(e);}}}
      async function cancel():Promise<void>{++sequence;if(timer)clearTimeout(timer);stopCamera();s.busy=false;s.status='';
        if(s.jobId){const job=s.jobId;s.jobId='';try{await props.request(props.root+'/ocr/jobs/'+job,{method:'DELETE'});}catch{/* Expiração já garante descarte no worker. */}}
        resetResult();file=null;clearPreview();s.fileName='';s.open=false;}
      function openLookup(kind:'cnpj'|'cep'):void{++sequence;stopCamera();s.open=true;s.kind=kind;resetResult();s.query=String(props.target[targetField(kind==='cep'?'postal_code':'cnpj')]||'');}
      async function lookup():Promise<void>{if(!s.kind||s.busy)return;resetResult();s.busy=true;const owner=props.target,stamp=++sequence,query=s.query,kind=s.kind;
        try{const result=await props.request<Lookup>((props.lookupRoot||props.root)+'/lookups/'+kind,{method:'POST',body:JSON.stringify({value:query})});
          if(disposed||stamp!==sequence||owner!==props.target||query!==s.query)return;
          proposals({text:'',confidence:null,warnings:[result.warning],suggestions:Object.entries(result.data).map(([field,value])=>({field,value}))});
          s.source=result.provider+' · '+(result.cached?'cache':'consulta online')+' · '+new Date(result.fetched_at).toLocaleString('pt-BR');
        }catch(e){if(stamp===sequence)s.error=e instanceof Error?e.message:String(e);}finally{if(stamp===sequence)s.busy=false;}}
      function apply():void{if(!s.confirmed||s.busy)return;s.error='';const applied:Record<string,string>={};
        for(const row of s.rows.filter(r=>r.checked)){
          if(!fields().has(row.targetField)){row.checked=false;continue;}
          if(props.target[row.targetField]!==row.before){row.checked=false;s.error='Um campo foi alterado durante a conferência. Consulte novamente para evitar sobrescrever sua edição.';continue;}
          props.target[row.targetField]=row.value;applied[row.targetField]=row.value;row.before=row.value;row.checked=false;
        }
        if(Object.keys(applied).length){emit('applied',applied);s.notice='Campos preenchidos no rascunho. Revise a ficha e use o botão Salvar para persistir.';s.confirmed=false;}}
      Vue.onUnmounted(()=>{disposed=true;++sequence;if(timer)clearTimeout(timer);stopCamera();clearPreview();file=null;});
      Vue.onMounted(()=>{if(props.source){s.open=true;void analyze();}});
      return {s,id,props,labels,selectFile,camera,capture,rotate,stopCamera,openDocument,analyze,cancel,openLookup,lookup,apply};
    }
  };
}
