namespace PigeDossier {
  type Row=PigeAPI.Row;
  export interface FamilyRow { id:string;version?:number;direction:'guardian'|'student';peer:{id:string;name:string;phone?:string;cpf?:string};relationship:string;legal:boolean;financial:boolean;pickup:boolean;primary_contact:boolean;active:boolean;new_person?:Record<string,unknown>;local?:boolean }
  interface Reply {person:Row;profiles:Record<string,Row>;family:{items:FamilyRow[];page:number;total:number}}
  const emptyDraft=()=>({direction:'guardian' as 'guardian'|'student',person_id:'',relationship:'Responsável',legal:false,financial:false,pickup:false,primary_contact:false,active:true,newMode:false,name:'',cpf:'',birth_date:'',phone:'',email:''});
  export const state=Vue.reactive({active:false,loading:false,error:'',personId:'',personVersion:0,profiles:{} as Record<string,Row>,rows:[] as FamilyRow[],operations:{} as Record<string,FamilyRow>,editor:false,editId:'',query:'',matches:[] as Row[],searching:false,draft:emptyDraft(),page:1,total:0});
  let root='',sequence=0,searchSequence=0,draftId=0;
  let pending:Promise<void>=Promise.resolve();
  let timer:ReturnType<typeof setTimeout>|null=null;
  const profileFields:Record<string,string[]>={student:['previous_school','nis','sus_card','inep_code','health_plan','allergies','medications','health_notes','special_needs','authorized_transport','student_notes'],teacher:['registration_number','professional_registration','employment_type','employment_status','admission_date','termination_date','inep_code','education_institution','degree_course','specialization','teaching_areas','workload_hours','profile_notes'],employee:['employee_number','employment_type','employment_status','admission_date','termination_date','department','job_title','work_schedule','supervisor_name','profile_notes']};
  export function eligible(kind:string):boolean{return ['person','guardian','student','student-edit','teacher','teacher-edit','employee','employee-edit'].includes(kind);}
  function primaryKind(kind:string):string{return kind.startsWith('student')?'student':kind.startsWith('teacher')?'teacher':kind.startsWith('employee')?'employee':'';}
  export function start(base:string,kind:string,form:PigeAPI.FormDataMap,target:Row|null):Promise<void>{
    const current=++sequence;root=base;state.active=eligible(kind);state.loading=false;state.error='';state.rows=[];state.operations={};state.profiles={};state.editor=false;state.personId='';state.personVersion=0;state.page=1;state.total=0;state.matches=[];state.query='';state.draft=emptyDraft();
    const person=(target?.person as Row|undefined)||target;
    if(!state.active||!person?.id){pending=Promise.resolve();return pending;}
    state.personId=person.id;state.personVersion=person.version;state.loading=true;
    pending=PigeAPI.request<Reply>(root+'/persons/'+person.id+'/dossier').then(result=>{
      if(current!==sequence)return;state.personVersion=result.person.version;state.profiles=result.profiles;state.rows=result.family.items;state.total=result.family.total;
      const primary=primaryKind(kind);
      for(const key of Object.keys(form)){
        if(key.includes('__')){const [profile,field]=key.split('__');if(result.profiles[profile])form[key]=(result.profiles[profile][field]??'') as PigeAPI.Value;}
        else if(primary&&profileFields[primary].includes(key)&&result.profiles[primary])form[key]=(result.profiles[primary][key]??'') as PigeAPI.Value;
        else if(key in result.person)form[key]=result.person[key] as PigeAPI.Value;
      }
    }).catch(e=>{if(current===sequence)state.error=e instanceof Error?e.message:String(e);}).finally(()=>{if(current===sequence)state.loading=false;});
    return pending;
  }
  export function dirty():boolean{return state.active&&(Object.keys(state.operations).length>0||(state.editor&&Boolean(state.draft.person_id||state.draft.name||state.draft.phone)));}
  export function begin(student:boolean):void{state.editor=true;state.editId='';state.error='';state.query='';state.matches=[];state.draft={...emptyDraft(),direction:student?'guardian':'student'};}
  export function edit(row:FamilyRow):void{state.editId=row.id;state.editor=true;state.error='';state.draft={...emptyDraft(),...row,person_id:row.peer.id,newMode:Boolean(row.new_person),name:row.peer.name,cpf:String(row.new_person?.cpf||''),birth_date:String(row.new_person?.birth_date||''),phone:String(row.new_person?.phone||''),email:String(row.new_person?.email||'')};}
  export function toggle(row:FamilyRow):void{if(row.local){state.rows=state.rows.filter(x=>x.id!==row.id);delete state.operations[row.id];return;}row.active=!row.active;state.operations[row.id]={...row};}
  export function search():void{if(timer)clearTimeout(timer);const current=++searchSequence;state.matches=[];state.draft.person_id='';timer=setTimeout(async()=>{const q=state.query.trim();if(q.length<2)return;state.searching=true;try{const result=await PigeAPI.request<PigeAPI.Page<Row>>(root+'/persons?entity_kind=individual&active=true&page_size=20&q='+encodeURIComponent(q)+(state.draft.direction==='student'?'&type_code=student':''));if(current===searchSequence)state.matches=result.items.filter(p=>p.id!==state.personId&&(state.draft.direction!=='student'||Boolean(p.student_id)));}catch(e){if(current===searchSequence)state.error=e instanceof Error?e.message:String(e);}finally{if(current===searchSequence)state.searching=false;}},250);}
  export function choose(person:Row):void{state.draft.person_id=person.id;state.draft.name=String(person.name);state.query=String(person.name);state.matches=[];}
  export function stage():void{
    const d=state.draft;state.error='';
    if(d.relationship.trim().length<2){state.error='Informe o parentesco ou tipo de relacionamento.';return;}
    if(!state.editId&&!d.person_id&&!d.newMode){state.error='Selecione uma pessoa ou cadastre uma nova.';return;}
    if(d.newMode&&(d.name.trim().length<2||(d.direction==='student'&&!d.birth_date))){state.error='Informe o nome e, para aluno, a data de nascimento.';return;}
    const old=state.rows.find(r=>r.id===state.editId),id=old?.id||('new-'+(++draftId));
    if(!old&&!d.newMode&&state.rows.some(r=>r.peer.id===d.person_id&&r.direction===d.direction)){state.error='Este vínculo já está na ficha. Use Editar ou Reativar.';return;}
    const row:FamilyRow={id,version:old?.version,local:old?.local??!old,direction:d.direction,peer:{id:d.person_id,name:d.name},relationship:d.relationship.trim(),legal:d.legal,financial:d.financial,pickup:d.pickup,primary_contact:d.primary_contact,active:d.active};
    if(d.newMode)row.new_person={name:d.name.trim(),cpf:d.cpf||null,birth_date:d.birth_date||null,phone:d.phone,email:d.email,entity_kind:'individual',person_types:d.direction==='student'?['student']:['guardian']};
    if(old)state.rows.splice(state.rows.indexOf(old),1,row);else state.rows.push(row);
    state.operations[id]=row;state.editor=false;state.editId='';state.draft=emptyDraft();
  }
  export function cancelEditor():void{state.editor=false;state.draft=emptyDraft();state.editId='';state.error='';}
  export async function more():Promise<void>{if(!state.personId||state.loading)return;state.loading=true;try{const result=await PigeAPI.request<Reply['family']>(root+'/persons/'+state.personId+'/family?page='+(state.page+1));state.rows.push(...result.items.map(x=>state.operations[x.id]||x));state.page=result.page;state.total=result.total;}finally{state.loading=false;}}
  export async function save(kind:string,form:PigeAPI.FormDataMap,photo:File|null):Promise<Reply>{
    await pending;if(state.error)throw new Error(state.error);if(state.editor)throw new Error('Conclua o vínculo em edição com “Adicionar à ficha”, ou cancele essa edição.');
    const person:Record<string,unknown>={...form};delete person.photo;
    const profiles:Record<string,{version?:number;data:Record<string,unknown>}>={};const primary=primaryKind(kind);
    for(const [profile,keys] of Object.entries(profileFields)){
      const data:Record<string,unknown>={};let changed=false;
      for(const key of keys){const field=primary===profile?key:profile+'__'+key;if(field in person){const value=person[field];delete person[field];if((value??'')!==(state.profiles[profile]?.[key]??''))changed=true;data[key]=value;}}
      if((primary===profile||(Array.isArray(form.person_types)&&form.person_types.includes(profile)))&&(changed||!state.profiles[profile]))profiles[profile]={version:state.profiles[profile]?.version,data};
    }
    const types=Array.isArray(person.person_types)?person.person_types.map(String):[];
    if(primary&&!types.includes(primary))types.push(primary);if(kind==='guardian'&&!types.includes('guardian'))types.push('guardian');person.person_types=types;
    for(const key of ['cpf','birth_date','rg_issued_on'])person[key]=person[key]||null;
    const family=Object.values(state.operations).map(r=>({...(r.local?{}:{link_id:r.id,version:r.version}),direction:r.direction,person_id:r.new_person?null:r.peer.id,new_person:r.new_person||null,relationship:r.relationship,legal:r.legal,financial:r.financial,pickup:r.pickup,primary_contact:r.primary_contact,active:r.active}));
    const payload={person_id:state.personId||null,version:state.personVersion||null,person,profiles,family};
    if(photo){const body=new FormData();body.set('payload',JSON.stringify(payload));body.set('file',photo);return PigeAPI.request<Reply>(root+'/person-dossiers/with-photo',{method:'POST',body});}
    return PigeAPI.post<Reply>(root+'/person-dossiers',payload);
  }
}
