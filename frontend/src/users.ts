namespace PigeUsers {
  export type PortalRole='teacher'|'student'|'guardian';
  export interface PortalTarget { request:number;schoolId:string;role:PortalRole;personId:string;name:string;email:string;creationHint:string }

  type Invitation={id:string;state:string;delivery_label:string;error_code:string;attempts:number;can_resend:boolean};
  type Access={teacher_routines?:string[];mailbox?:{address:string;status:string;job_status:string;error_message:string}|null;invitation:Invitation|null;id:string;name:string;email:string;role:string;role_label:string;person_id:string|null;active:boolean;access_active:boolean;account_active:boolean;archived_at:string|null;version:number;access_profile_id:string|null;access_profile_name:string;profile_active:boolean};
  type Profile={id:string;name:string;description:string;base_role:string;base_role_label:string;permissions:string[];active:boolean;version:number;users_count:number};
  type Catalog={teacher_routines?:Record<string,string>;roles:Record<string,{label:string;permissions:string[]}>;permissions:{id:string;group:string;label:string}[];can_manage_admin:boolean};
  type Form={teacher_routines:string[];id:string;version:number;name:string;email:string;password:string;role:string;person_id:string;active:boolean;access_profile_id:string;reason:string;create_mailbox:boolean;mailbox_local_part:string;mailbox_quota_mb:number|null};
  type Preview={can_delete_account:boolean;has_history:boolean;confirmation:string;self:boolean;version:number};
  const emptyForm=():Form=>({teacher_routines:[],id:'',version:1,name:'',email:'',password:'',role:'secretary',person_id:'',active:true,access_profile_id:'',reason:'',create_mailbox:false,mailbox_local_part:'',mailbox_quota_mb:null});
  export const component={props:['schoolId','currentUserId','portalTarget'],emits:['changed'],render:PigeRenders.users,setup(props:{schoolId:string;currentUserId:string;portalTarget?:PortalTarget|null},context:{emit:(event:string)=>void}){
    const s=Vue.reactive({busy:false,error:'',notice:'',tab:'users',search:'',status:'all',portalFilter:null as PortalTarget|null,users:[] as Access[],profiles:[] as Profile[],catalog:{roles:{},permissions:[],can_manage_admin:false} as Catalog,editing:false,form:emptyForm(),personSearch:'',people:[] as {id:string;name:string;cpf:string|null}[],profileEditing:false,profile:{id:'',version:1,name:'',description:'',base_role:'secretary',permissions:[] as string[],active:true,reason:'',users_count:0},actionTarget:null as Access|null,preview:null as Preview|null,action:'deactivate',actionReason:'',confirmation:'',deleteProfile:null as Profile|null});
    const base=()=>'/schools/'+encodeURIComponent(props.schoolId);
    let epoch=0;
    async function run(work:()=>Promise<void>):Promise<void>{if(s.busy)return;s.busy=true;s.error='';try{await work();}catch(e){s.error=e instanceof Error?e.message:'Não foi possível concluir a operação.';}finally{s.busy=false;}}
    async function refresh():Promise<void>{const n=++epoch;const [users,profiles,catalog]=await Promise.all([PigeAPI.request<Access[]>(base()+'/users'),PigeAPI.request<Profile[]>(base()+'/access-profiles'),PigeAPI.request<Catalog>(base()+'/access-profiles/catalog')]);if(n!==epoch)return;s.users=users;s.profiles=profiles;s.catalog=catalog;}
    let openFromRecord=Boolean(props.portalTarget);
    const load=()=>run(async()=>{
      await refresh();
      const target=props.portalTarget;
      if(!openFromRecord||!target||target.schoolId!==props.schoolId)return;
      openFromRecord=false;
      s.portalFilter=target;
      if(!linkedUsers().length&&!target.creationHint)startUser();
    });
    const linkedUsers=()=>s.users.filter(u=>u.person_id===s.portalFilter?.personId&&u.role===s.portalFilter.role);
    function startUser():void{
      const target=s.portalFilter;
      if(target&&(target.creationHint||linkedUsers().length))return;
      editUser();
      if(target){
        s.form.name=target.name;s.form.email=target.email;s.form.role=target.role;s.form.person_id=target.personId;
        if(target.role==='teacher')s.form.teacher_routines=Object.keys(s.catalog.teacher_routines||{});
        s.people=[{id:target.personId,name:target.name,cpf:null}];
      }
    }
    const rows=()=>(s.portalFilter?linkedUsers():s.users).filter(u=>(!s.search||[u.name,u.email,u.access_profile_name].some(v=>v.toLocaleLowerCase('pt-BR').includes(s.search.toLocaleLowerCase('pt-BR'))))&&(s.status==='all'||(s.status==='active'&&u.active)||(s.status==='inactive'&&!u.active&&!u.archived_at)||(s.status==='archived'&&!!u.archived_at)));
    const roleOptions=()=>({...s.catalog.roles,...(s.catalog.can_manage_admin?{admin:{label:'Administrador',permissions:[]}}:{})});
    const matchingProfiles=()=>s.profiles.filter(p=>p.active&&p.base_role===s.form.role);
    const individual=()=>['teacher','student','guardian'].includes(s.form.role);
    function editUser(user?:Access):void{s.error='';s.notice='';s.profileEditing=false;s.actionTarget=null;s.editing=true;s.people=[];s.personSearch='';s.form=user?{...emptyForm(),...user,teacher_routines:[...(user.teacher_routines||Object.keys(s.catalog.teacher_routines||{}))],person_id:user.person_id||'',access_profile_id:user.access_profile_id||'',password:'',reason:''}:emptyForm();document.querySelector('.users-workspace')?.scrollIntoView({block:'start',behavior:'smooth'});}
    function changeRole():void{s.form.teacher_routines=s.form.role==='teacher'?Object.keys(s.catalog.teacher_routines||{}):[];s.form.access_profile_id='';s.form.person_id='';s.people=[];s.personSearch='';}
    function changeRoutine(id:string,event:Event){
      const routines=new Set(s.form.teacher_routines);
      if((event.target as HTMLInputElement).checked)routines.add(id);
      else {
        routines.delete(id);
        if(id==='diary')routines.delete('materials');
      }
      s.form.teacher_routines=[...routines];
    }
    async function searchPeople():Promise<void>{if(s.personSearch.trim().length<2)return;await run(async()=>{const data=await PigeAPI.request<{items:{id:string;name:string;cpf:string|null}[]}>(base()+'/persons?q='+encodeURIComponent(s.personSearch.trim())+'&page_size=30');s.people=data.items;});}
    async function saveUser():Promise<void>{
      await run(async()=>{
        const f=s.form;
        const payload={...(f.role==='teacher'&&s.catalog.teacher_routines?{teacher_routines:f.teacher_routines}:{}),name:f.name,role:f.role,school_ids:[props.schoolId],person_id:f.person_id||null,access_profile_id:f.access_profile_id||null};
        let notice='Acesso atualizado.';
        if(f.id){
          await PigeAPI.patch(base()+'/users/'+f.id,{...payload,active:f.active,version:f.version,reason:f.reason});
        }else{
          const result=await PigeAPI.post<{existing_person_access?:boolean}>(base()+'/users',{
            ...payload,email:f.email,password:f.password,reuse_person_access:!!s.portalFilter,
            create_mailbox:f.create_mailbox,mailbox_school_id:f.create_mailbox?props.schoolId:null,
            mailbox_local_part:f.mailbox_local_part,mailbox_quota_mb:f.mailbox_quota_mb,
          });
          notice=result.existing_person_access?'Esta pessoa já possui acesso com este perfil. Confira a conta abaixo.':'Usuário criado. Consulte o estado do convite no cartão do usuário; aceite SMTP não comprova entrega na caixa.';
        }
        s.editing=false;await refresh();s.notice=notice;context.emit('changed');
      });
    }
    async function invitation(user:Access,action:string):Promise<void>{await run(async()=>{await PigeAPI.post(base()+'/users/'+user.id+'/invitation/'+action,{});await refresh();s.notice=action==='recover'?'Recuperação enfileirada para o e-mail de acesso.':action==='resend'?'Novo convite enfileirado; o anterior foi revogado.':'Convite revogado.';});}
    async function actionUser(user:Access):Promise<void>{s.actionTarget=user;s.action=user.archived_at?'restore':user.active?'deactivate':'activate';s.actionReason='';s.confirmation='';s.preview=null;s.editing=false;await run(async()=>{s.preview=await PigeAPI.request<Preview>(base()+'/users/'+user.id+'/lifecycle');});}
    async function applyAction():Promise<void>{if(!s.actionTarget||!s.preview)return;await run(async()=>{await PigeAPI.post(base()+'/users/'+s.actionTarget!.id+'/lifecycle',{action:s.action,version:s.preview!.version,reason:s.actionReason,confirmation:s.confirmation});s.actionTarget=null;await refresh();s.notice='Alteração de acesso concluída.';context.emit('changed');});}
    function editProfile(profile?:Profile):void{s.error='';s.notice='';s.editing=false;s.deleteProfile=null;s.profileEditing=true;s.profile=profile?{...profile,permissions:[...profile.permissions],reason:''}:{id:'',version:1,name:'',description:'',base_role:'secretary',permissions:[...(s.catalog.roles.secretary?.permissions||[])],active:true,reason:'',users_count:0};}
    function duplicateRole(roleKey:string):void{const role=s.catalog.roles[roleKey];if(!role)return;s.error='';s.notice='';s.editing=false;s.deleteProfile=null;s.profileEditing=true;s.profile={id:'',version:1,name:role.label+' personalizado',description:'Cópia editável do perfil padrão '+role.label+'.',base_role:roleKey,permissions:[...role.permissions],active:true,reason:'',users_count:0};}
    function duplicateProfile(profile:Profile):void{s.error='';s.notice='';s.editing=false;s.deleteProfile=null;s.profileEditing=true;s.profile={...profile,id:'',version:1,name:profile.name+' — cópia',permissions:[...profile.permissions],active:true,reason:'',users_count:0};}
    function profileBase():void{s.profile.permissions=[...(s.catalog.roles[s.profile.base_role]?.permissions||[])];}
    const permissionGroups=()=>[...new Set(s.catalog.permissions.filter(p=>s.catalog.roles[s.profile.base_role]?.permissions.includes(p.id)).map(p=>p.group))].map(name=>({name,items:s.catalog.permissions.filter(p=>p.group===name&&s.catalog.roles[s.profile.base_role]?.permissions.includes(p.id))}));
    function toggleGroup(name:string,enabled:boolean):void{const ids=permissionGroups().find(g=>g.name===name)?.items.map(p=>p.id)||[];s.profile.permissions=enabled?[...new Set([...s.profile.permissions,...ids])]:s.profile.permissions.filter(p=>!ids.includes(p));}
    async function saveProfile():Promise<void>{await run(async()=>{const {id,name,description,base_role,permissions,active,version,reason}=s.profile;const payload={name,description,base_role,permissions:[...permissions],active,version,reason};if(id)await PigeAPI.patch(base()+'/access-profiles/'+id,payload);else await PigeAPI.post(base()+'/access-profiles',payload);s.profileEditing=false;await refresh();s.notice='Perfil de acesso salvo.';context.emit('changed');});}
    function requestDeleteProfile(profile:Profile):void{s.deleteProfile=profile;s.profileEditing=false;s.actionReason='';s.confirmation='';s.error='';}
    async function removeProfile():Promise<void>{if(!s.deleteProfile)return;await run(async()=>{const p=s.deleteProfile!;await PigeAPI.post(base()+'/access-profiles/'+p.id+'/delete',{action:'delete',version:p.version,reason:s.actionReason,confirmation:s.confirmation});s.deleteProfile=null;await refresh();s.notice='Perfil excluído.';});}
    const mailboxLabel=(value:string):string=>({active:'Caixa ativa',disabled:'Caixa desativada',pending:'Criação enfileirada',retry:'Aguardando retomada',processing:'Criando caixa',completed:'Provisionada',failed:'Falha na criação',uncertain:'Resultado do provisionamento desconhecido'} as Record<string,string>)[value]||value;
    const invitationLabel=(value:string):string=>({pending:'Aguardando primeiro acesso',used:'Primeiro acesso concluído',revoked:'Revogado',expired:'Expirado'} as Record<string,string>)[value]||value;
    const statusLabel=(u:Access)=>u.archived_at?'Arquivado':!u.account_active?'Conta inativa':!u.profile_active?'Perfil inativo':u.active?'Ativo':'Inativo';
    Vue.onMounted(()=>{void load();});Vue.onBeforeUnmount(()=>{epoch++;});
    return{s,invitation,load,rows,linkedUsers,startUser,roleOptions,matchingProfiles,individual,editUser,changeRole,changeRoutine,searchPeople,saveUser,actionUser,applyAction,editProfile,duplicateRole,duplicateProfile,profileBase,permissionGroups,toggleGroup,saveProfile,requestDeleteProfile,removeProfile,statusLabel,invitationLabel,mailboxLabel};
  }};
}
