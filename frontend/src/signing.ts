namespace PigeSigning {
  type Row=PigeAPI.Row;
  type Certificate=Row&{subject:string;expires_at:string;certificate_sha256:string;configured_by:string};
  type QueueItem={document_id:string;student_id:string;student_name:string;enrollment_id:string;kind:string;signature_status:string;file_id:string;created_at:string};
  type Revision=Row&{file_id:string;source:string;sha256:string;signer:string;trust_status:string;created_at:string;validated_at?:string|null;validation_evidence_file_id?:string|null;validation_reference?:string;rejection_reason?:string};
  type Review={document_id:string;status:string;file_id:string;signature_valid:boolean|null;cryptographic_valid:boolean|null;trust_status:string;revocation_checked?:boolean;signatures:Row[];revisions:Revision[]};
  type Mode='certificate'|'pending-signatures'|'signature-review'|'document';
  type Props={schoolId:string;permissions:string[];role:string;mode?:Mode;enrollmentId?:string;issuedId?:string};
  const str=(value:unknown):string=>value==null?'':String(value);
  const date=(value:unknown):string=>{const raw=str(value);return raw?new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:raw.length===10?undefined:'short',timeZone:'America/Bahia'}).format(new Date(raw.length===10?raw+'T12:00:00Z':raw)):'—';};
  const statuses:Record<string,string>={unsigned:'Sem assinatura',company_signed:'Assinado pela escola',pending_validation:'Assinatura do responsável em revisão',verified:'Conferido pela Direção',rejected:'Devolvido para correção'};
  const kinds:Record<string,string>={enrollment:'Comprovante de matrícula',declaration:'Declaração escolar',student_record:'Ficha do aluno',template:'Documento personalizado'};
  const areas:Record<Mode,string>={certificate:'Certificados A1','pending-signatures':'Assinaturas pendentes','signature-review':'Conferência de assinaturas',document:'Documentos da matrícula'};
  export const component={props:['schoolId','permissions','role','mode','enrollmentId','issuedId'],render:PigeRenders.signing,setup(props:Props){
    const scopeSchoolId=props.schoolId,mode=props.mode||'document';
    const enrollmentId=props.enrollmentId||'',issuedId=props.issuedId||'';
    let alive=true;
    const state=Vue.reactive({
      busy:false,loading:false,error:'',notice:'',
      alerts:{email_enabled:false,whatsapp_enabled:false,email:'',phone_available:false},
      configured:false,certificate:null as Certificate|null,certificateName:'',certificatePassword:'',
      pending:[] as QueueItem[],pendingTotal:0,offset:0,limit:30,unsigned:[] as QueueItem[],unsignedTotal:0,unsignedOffset:0,removeCertificateOpen:false,
      enrollmentIssued:[] as Row[],review:null as Review|null,reviewTitle:'',
      reportName:'',signerCpf:'',validationReference:'',confirmedReview:false,rejectionReason:''
    });
    let certificateFile:File|null=null,reportFile:File|null=null;
    const base=()=>'/schools/'+scopeSchoolId;
    const isCurrent=()=>alive&&props.schoolId===scopeSchoolId;
    const isMode=(value:Mode)=>mode===value;
    const areaLabel=()=>areas[mode];
    const can=(permission:string)=>props.permissions.includes(permission);
    const canManageA1=()=>can('schools.manage')&&['admin','direction'].includes(props.role);
    const canSign=()=>canManageA1()&&can('documents.generate');
    const canDecide=()=>can('documents.validate')&&['admin','direction'].includes(props.role);
    const certificateExpired=()=>Boolean(state.certificate&&Date.parse(state.certificate.expires_at)<=Date.now());
    const label=(status:unknown)=>statuses[str(status)]||str(status)||'—';
    const kindLabel=(kind:unknown)=>kinds[str(kind)]||'Documento escolar';
    // A instância pertence a uma única escola. Respostas tardias nunca repopulam outra entidade.
    async function request<T>(path:string,options:RequestInit={}):Promise<T>{
      if(!isCurrent())throw new Error('A instituição ativa foi alterada.');
      const result=await PigeAPI.request<T>(base()+path,options);
      if(!isCurrent())throw new Error('A instituição ativa foi alterada.');
      return result;
    }
    async function run(action:()=>Promise<void>):Promise<void>{if(state.busy||!isCurrent())return;state.busy=true;state.error='';state.notice='';try{await action();}catch(error){if(isCurrent())state.error=error instanceof Error?error.message:String(error);}finally{if(isCurrent())state.busy=false;}}
    async function loadCertificate():Promise<void>{if(!canManageA1())return;
      const result=await request<{configured:boolean;certificate:Certificate|null}>('/signing-certificate/a1');
      state.configured=result.configured;state.certificate=result.certificate;
    }
    async function loadPending():Promise<void>{if(!isMode('signature-review')||!can('documents.validate'))return;
      const result=await request<{items:QueueItem[];total:number}>(`/issued-documents/signatures/pending?limit=${state.limit}&offset=${state.offset}`);
      state.pending=result.items;state.pendingTotal=result.total;
    }
    async function loadUnsigned():Promise<void>{if(!isMode('pending-signatures')||!can('documents.read'))return;
      const result=await request<{items:QueueItem[];total:number}>(`/issued-documents/signatures/unsigned?limit=${state.limit}&offset=${state.unsignedOffset}`);
      state.unsigned=result.items;state.unsignedTotal=result.total;
    }
    async function unsignedPage(delta:number):Promise<void>{const next=state.unsignedOffset+delta*state.limit;if(next<0||next>=state.unsignedTotal)return;state.unsignedOffset=next;await run(loadUnsigned);}
    async function signDocument(id:string):Promise<void>{if(!canSign()||!state.configured||certificateExpired())return;
      await run(async()=>{await request<{file_id:string}>('/issued-documents/'+id+'/sign/a1',{method:'POST'});await Promise.all([loadUnsigned(),loadEnrollmentIssued()]);await loadReview(id);state.notice='Documento assinado pela escola. O PDF original foi preservado.';});
    }
    async function loadEnrollmentIssued():Promise<void>{if(!isMode('document')||!enrollmentId||!can('documents.read'))return;
      const enrollment=await request<Row>('/enrollments/'+enrollmentId);
      const result=await request<{issued:Row[]}>('/students/'+str(enrollment.student_id)+'/documents');
      state.enrollmentIssued=(result.issued||[]).filter(row=>row.enrollment_id===enrollmentId);
    }
    async function load():Promise<void>{if(!isCurrent())return;state.loading=true;state.error='';try{
      if(isMode('certificate'))await Promise.all([loadCertificate(),loadAlertPreferences()]);
      else if(isMode('pending-signatures'))await Promise.all([loadCertificate(),loadUnsigned()]);
      else if(isMode('signature-review'))await loadPending();
      else {await Promise.all([loadCertificate(),loadEnrollmentIssued()]);if(issuedId)await loadReview(issuedId);}
    }catch(error){if(isCurrent())state.error=error instanceof Error?error.message:String(error);}finally{if(isCurrent())state.loading=false;}}
    function clearReviewInput():void{reportFile=null;state.reportName='';state.signerCpf='';state.validationReference='';state.confirmedReview=false;state.rejectionReason='';}
    async function loadReview(id:string):Promise<void>{if(isMode('certificate')||!can('documents.read'))return;
      state.review=null;clearReviewInput();
      const item=state.pending.find(row=>row.document_id===id)||state.unsigned.find(row=>row.document_id===id);
      const document=state.enrollmentIssued.find(row=>row.id===id);
      state.reviewTitle=item?item.student_name+' · '+kindLabel(item.kind):str(document?.template_name)||kindLabel(document?.kind);
      state.review=await request<Review>('/issued-documents/'+id+'/signatures');
    }
    async function openReview(id:string):Promise<void>{await run(()=>loadReview(id));}
    function certificateChanged(event:Event):void{certificateFile=(event.target as HTMLInputElement).files?.[0]||null;state.certificateName=certificateFile?.name||'';}
    function clearCertificateInput():void{certificateFile=null;state.certificateName='';state.certificatePassword='';const input=(isCurrent()?document.getElementById('a1-certificate-file'):null) as HTMLInputElement|null;if(input)input.value='';}
    async function saveCertificate():Promise<void>{if(!isMode('certificate')||!canManageA1()||!isCurrent())return;const file=certificateFile,password=state.certificatePassword;
      if(!file||!/\.(pfx|p12)$/i.test(file.name)||file.size>1024*1024){state.error='Selecione um certificado A1 P12/PFX de até 1 MB.';state.certificatePassword='';return;}
      if(!password){state.error='Informe a senha do certificado A1.';return;}
      await run(async()=>{const form=new FormData();form.append('file',file);form.append('password',password);
        const saved=await request<Certificate>('/signing-certificate/a1',{method:'PUT',body:form});
        state.certificate=saved;state.configured=true;state.notice='Certificado A1 da instituição configurado.';
      });
      clearCertificateInput();
    }
    async function removeCertificate():Promise<void>{if(!isMode('certificate')||!canManageA1())return;
      await run(async()=>{await request('/signing-certificate/a1',{method:'DELETE'});await loadCertificate();state.removeCertificateOpen=false;state.notice='Certificado A1 desativado. Cadastre um certificado válido para realizar novas assinaturas.';});
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
        await request('/issued-documents/'+id+'/validate-signature',{method:'POST',body:form});
        clearReviewInput();await Promise.all([loadReview(id),loadPending(),loadEnrollmentIssued()]);state.notice='Conferência registrada. O relatório e a versão assinada foram preservados no histórico.';
      });
    }
    async function reject():Promise<void>{if(!state.review||!canDecide())return;
      if(state.rejectionReason.trim().length<10){state.error='Descreva o motivo da devolução em ao menos 10 caracteres.';return;}
      await run(async()=>{const id=state.review!.document_id,form=new FormData();form.append('reason',state.rejectionReason.trim());
        await request('/issued-documents/'+id+'/reject-signature',{method:'POST',body:form});
        await Promise.all([loadReview(id),loadPending(),loadEnrollmentIssued()]);state.notice='Assinatura devolvida. O responsável poderá reenviar o PDF corrigido.';
      });
    }
    async function loadAlertPreferences():Promise<void>{if(isMode('certificate')&&canManageA1())state.alerts=await request<typeof state.alerts>('/signing-certificate/alert-preferences');}
    async function saveAlertPreferences():Promise<void>{if(!isMode('certificate')||!canManageA1())return;await run(async()=>{state.alerts=await request<typeof state.alerts>('/signing-certificate/alert-preferences',{method:'PUT',body:JSON.stringify({email_enabled:state.alerts.email_enabled,whatsapp_enabled:state.alerts.whatsapp_enabled})});state.notice='Preferências de aviso atualizadas.';});}
    Vue.onMounted(()=>{void load();});
    Vue.onUnmounted(()=>{alive=false;clearCertificateInput();clearReviewInput();state.certificate=null;state.pending=[];state.unsigned=[];state.enrollmentIssued=[];state.review=null;});
    return{state,isCurrent,isMode,areaLabel,saveAlertPreferences,can,canManageA1,canSign,canDecide,certificateExpired,str,date,label,kindLabel,load,loadPending,openReview,loadUnsigned,unsignedPage,signDocument,certificateChanged,saveCertificate,removeCertificate,page,download,reportChanged,validate,reject};
  }};
}
