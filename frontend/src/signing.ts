namespace PigeSigning {
  type Row=PigeAPI.Row;
  type Certificate=Row&{subject:string;expires_at:string;certificate_sha256:string;configured_by:string};
  type QueueItem={document_id:string;student_id:string;student_name:string;enrollment_id:string;kind:string;signature_status:string;file_id:string;created_at:string};
  type Revision=Row&{file_id:string;source:string;sha256:string;signer:string;trust_status:string;created_at:string;validated_at?:string|null;validation_evidence_file_id?:string|null;validation_reference?:string;rejection_reason?:string};
  type Review={document_id:string;status:string;file_id:string;signature_valid:boolean|null;cryptographic_valid:boolean|null;trust_status:string;revocation_checked?:boolean;signatures:Row[];revisions:Revision[]};
  type Props={schoolId:string;permissions:string[];role:string;enrollmentId?:string;issuedId?:string};
  const str=(value:unknown):string=>value==null?'':String(value);
  const date=(value:unknown):string=>{const raw=str(value);return raw?new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:raw.length===10?undefined:'short',timeZone:'America/Bahia'}).format(new Date(raw.length===10?raw+'T12:00:00Z':raw)):'—';};
  const statuses:Record<string,string>={unsigned:'Sem assinatura',company_signed:'Assinado pela escola',pending_validation:'Assinatura do responsável em revisão',verified:'Conferido pela Direção',rejected:'Devolvido para correção'};
  export const component={props:['schoolId','permissions','role','enrollmentId','issuedId'],render:PigeRenders.signing,setup(props:Props){
    const state=Vue.reactive({
      busy:false,loading:false,error:'',notice:'',
      configured:false,certificate:null as Certificate|null,certificateName:'',certificatePassword:'',
      pending:[] as QueueItem[],pendingTotal:0,offset:0,limit:30,unsigned:[] as QueueItem[],unsignedTotal:0,unsignedOffset:0,removeCertificateOpen:false,
      enrollmentIssued:[] as Row[],review:null as Review|null,
      reportName:'',signerCpf:'',validationReference:'',confirmedReview:false,rejectionReason:''
    });
    let certificateFile:File|null=null,reportFile:File|null=null;
    const base=()=>'/schools/'+props.schoolId;
    const can=(permission:string)=>props.permissions.includes(permission);
    const canManageA1=()=>can('schools.manage')&&['admin','direction'].includes(props.role);
    const canDecide=()=>can('documents.validate')&&['admin','direction'].includes(props.role);
    const certificateExpired=()=>Boolean(state.certificate&&Date.parse(state.certificate.expires_at)<=Date.now());
    const label=(status:unknown)=>statuses[str(status)]||str(status)||'—';
    async function run(action:()=>Promise<void>):Promise<void>{if(state.busy)return;state.busy=true;state.error='';state.notice='';try{await action();}catch(error){state.error=error instanceof Error?error.message:String(error);}finally{state.busy=false;}}
    async function loadCertificate():Promise<void>{if(!can('schools.manage'))return;
      const result=await PigeAPI.request<{configured:boolean;certificate:Certificate|null}>(base()+'/signing-certificate/a1');
      state.configured=result.configured;state.certificate=result.certificate;
    }
    async function loadPending():Promise<void>{if(!can('documents.validate'))return;
      const result=await PigeAPI.request<{items:QueueItem[];total:number}>(base()+`/issued-documents/signatures/pending?limit=${state.limit}&offset=${state.offset}`);
      state.pending=result.items;state.pendingTotal=result.total;
    }
    async function loadUnsigned():Promise<void>{if(!can('documents.read'))return;const result=await PigeAPI.request<{items:QueueItem[];total:number}>(base()+`/issued-documents/signatures/unsigned?limit=${state.limit}&offset=${state.unsignedOffset}`);state.unsigned=result.items;state.unsignedTotal=result.total;}
    async function unsignedPage(delta:number):Promise<void>{const next=state.unsignedOffset+delta*state.limit;if(next<0||next>=state.unsignedTotal)return;state.unsignedOffset=next;await run(loadUnsigned);}
    async function signDocument(item:QueueItem):Promise<void>{await run(async()=>{const result=await PigeAPI.request<{file_id:string}>(base()+'/issued-documents/'+item.document_id+'/sign/a1',{method:'POST'});await loadUnsigned();await loadReview(item.document_id);state.notice='Documento assinado pela escola. O PDF original foi preservado.';});}
    async function loadEnrollmentIssued():Promise<void>{if(!props.enrollmentId)return;
      const enrollment=await PigeAPI.request<Row>(base()+'/enrollments/'+props.enrollmentId);
      const result=await PigeAPI.request<{issued:Row[]}>(base()+'/students/'+str(enrollment.student_id)+'/documents');
      state.enrollmentIssued=(result.issued||[]).filter(row=>row.kind==='template'&&row.enrollment_id===props.enrollmentId);
    }
    async function load():Promise<void>{state.loading=true;state.error='';try{
      await Promise.all([loadCertificate(),loadPending(),loadUnsigned(),loadEnrollmentIssued()]);
      if(props.issuedId)await loadReview(props.issuedId);
    }catch(error){state.error=error instanceof Error?error.message:String(error);}finally{state.loading=false;}}
    async function loadReview(id:string):Promise<void>{state.review=await PigeAPI.request<Review>(base()+'/issued-documents/'+id+'/signatures');state.confirmedReview=false;state.rejectionReason='';}
    async function openReview(id:string):Promise<void>{await run(()=>loadReview(id));}
    function certificateChanged(event:Event):void{certificateFile=(event.target as HTMLInputElement).files?.[0]||null;state.certificateName=certificateFile?.name||'';}
    function clearCertificateInput():void{certificateFile=null;state.certificateName='';state.certificatePassword='';const input=document.getElementById('a1-certificate-file') as HTMLInputElement|null;if(input)input.value='';}
    async function saveCertificate():Promise<void>{const file=certificateFile,password=state.certificatePassword;
      if(!file||!/\.(pfx|p12)$/i.test(file.name)||file.size>1024*1024){state.error='Selecione um certificado A1 P12/PFX de até 1 MB.';state.certificatePassword='';return;}
      if(!password){state.error='Informe a senha do certificado A1.';return;}
      await run(async()=>{const form=new FormData();form.append('file',file);form.append('password',password);
        const saved=await PigeAPI.request<Certificate>(base()+'/signing-certificate/a1',{method:'PUT',body:form});
        state.certificate=saved;state.configured=true;state.notice='Certificado A1 configurado. Confira sujeito e validade antes de emitir contratos que exigem assinatura.';
      });
      // Senha e arquivo permanecem somente na memória deste formulário durante o envio.
      clearCertificateInput();
    }
    async function removeCertificate():Promise<void>{if(!canManageA1())return;
      await run(async()=>{await PigeAPI.request(base()+'/signing-certificate/a1',{method:'DELETE'});await loadCertificate();state.removeCertificateOpen=false;state.notice='Certificado A1 desativado. Emissões que exigem assinatura da escola permanecerão bloqueadas até nova configuração.';});
    }
    async function page(delta:number):Promise<void>{const next=state.offset+delta*state.limit;if(next<0||next>=state.pendingTotal)return;state.offset=next;await run(loadPending);}
    async function download(fileId:string,name='documento-assinado.pdf'):Promise<void>{await run(()=>PigeAPI.download(base()+'/files/'+fileId+'/download',name));}
    function reportChanged(event:Event):void{reportFile=(event.target as HTMLInputElement).files?.[0]||null;state.reportName=reportFile?.name||'';}
    async function validate():Promise<void>{if(!state.review||!canDecide())return;
      if(!state.confirmedReview){state.error='Confirme que conferiu o PDF e a identidade no VALIDAR/ITI.';return;}
      if(!reportFile||!/\.pdf$/i.test(reportFile.name)){state.error='Anexe o relatório PDF do VALIDAR/ITI.';return;}
      if(state.signerCpf.replace(/\D/g,'').length!==11||!state.validationReference.trim()){state.error='Informe CPF do responsável e a referência da validação.';return;}
      await run(async()=>{
        const id=state.review!.document_id,form=new FormData();form.append('signer_cpf',state.signerCpf.replace(/\D/g,''));form.append('validation_reference',state.validationReference.trim());form.append('report',reportFile!);
        await PigeAPI.request(base()+'/issued-documents/'+id+'/validate-signature',{method:'POST',body:form});
        reportFile=null;state.reportName='';state.signerCpf='';state.validationReference='';state.confirmedReview=false;
        await Promise.all([loadReview(id),loadPending(),loadEnrollmentIssued()]);state.notice='Conferência registrada com relatório e usuário responsável. A versão do PDF permanece auditável.';
      });
    }
    async function reject():Promise<void>{if(!state.review||!canDecide())return;
      if(state.rejectionReason.trim().length<10){state.error='Descreva o motivo da devolução em ao menos 10 caracteres.';return;}
      await run(async()=>{const id=state.review!.document_id,form=new FormData();form.append('reason',state.rejectionReason.trim());
        await PigeAPI.request(base()+'/issued-documents/'+id+'/reject-signature',{method:'POST',body:form});
        await Promise.all([loadReview(id),loadPending(),loadEnrollmentIssued()]);state.notice='Assinatura devolvida. O responsável poderá reenviar uma nova revisão do PDF.';
      });
    }
    Vue.onMounted(()=>{void load();});
    Vue.onUnmounted(()=>{clearCertificateInput();reportFile=null;state.signerCpf='';state.validationReference='';});
    return{state,can,canManageA1,canDecide,certificateExpired,str,date,label,load,loadPending,openReview,loadUnsigned,unsignedPage,signDocument,certificateChanged,saveCertificate,removeCertificate,page,download,reportChanged,validate,reject};
  }};
}
