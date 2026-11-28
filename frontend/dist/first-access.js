'use strict';
(() => {
  let token=location.hash.slice(1),invitationId=new URLSearchParams(location.search).get('invitation')||undefined;
  const status=document.getElementById('status'),form=document.getElementById('invite-form');
  const loginLabels = new Map([
    ['/professor', 'Ir para o Portal do Professor'],
    ['/family', 'Ir para o Portal do Aluno e Responsável'],
    ['/', 'Ir para o login']
  ]);
  function updateLoginLink(path) {
    if (!loginLabels.has(path)) return;
    const link = document.getElementById('login-link');
    link.href = path;
    link.textContent = loginLabels.get(path);
  }
  let purposeLabel='Primeiro acesso';
  function showRecovery(title){
    purposeLabel='Recuperação de senha';
    document.getElementById('access-context').textContent=purposeLabel;
    document.getElementById('access-title').textContent=title;
    document.title=document.getElementById('institution-name').textContent+' · '+purposeLabel;
  }
  function identity(data){
    document.getElementById('institution-name').textContent=data.display_name;
    document.title=data.display_name+' · '+purposeLabel;
    const logo=document.getElementById('institution-logo');
    if(/^\/api\/v1\/institution\/assets\/[0-9a-f]{64}\.png$/.test(data.logo_url||'')){logo.src=data.logo_url;logo.hidden=false;}
    document.querySelector('meta[name="theme-color"]').content=data.primary_color;
    document.querySelector('[data-institution-theme]').href='/api/v1/institution/theme.css?v='+encodeURIComponent(data.version);
  }
  let bootstrap=null;try{bootstrap=JSON.parse(document.getElementById('institution-bootstrap')?.textContent||'null');}catch{}
  if(bootstrap)identity(bootstrap);
  else fetch('/api/v1/institution/identity',{cache:'no-store',credentials:'same-origin'}).then(r=>r.ok?r.json():null).then(data=>{if(data)identity(data);}).catch(()=>{});
  const send=async(path,body)=>{const r=await fetch('/api/v1/invitations/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Protection':'1'},body:JSON.stringify(body),cache:'no-store',credentials:'same-origin'});const data=await r.json();if(!r.ok)throw new Error(typeof data.detail==='string'?data.detail:'Revise a senha informada.');return data;};
  const recovery=/^\/(professor|family)\/recuperar-senha\/?$/.exec(location.pathname);
  if(recovery){
    const portal=recovery[1]==='professor'?'teacher':'family';
    updateLoginLink('/'+recovery[1]);
    showRecovery('Recuperar senha');
    status.textContent='Informe o e-mail que você usa para entrar no portal. Para o primeiro acesso, abra o convite enviado pela escola.';
    const requestForm=document.getElementById('recovery-form');
    requestForm.hidden=false;
    requestForm.addEventListener('submit',async event=>{
      event.preventDefault();
      const button=requestForm.querySelector('button');
      button.disabled=true;
      try{
        const result=await send('password-recovery',{portal,email:document.getElementById('email').value});
        status.textContent=result.message;
        requestForm.hidden=true;
      }catch(e){status.textContent=e.message;}finally{button.disabled=false;}
    });
    return;
  }
  send('inspect',token?{token}:{invitation_id:invitationId}).then(data=>{
    // O servidor preserva o convite em cookie HttpOnly, restrito a esta API e à validade original.
    // Só remover o fragmento após a resposta: uma falha de rede ainda permite reabrir/atualizar.
    if(token&&(data.continue_path==='/professor/first-access'||data.continue_path==='/family/first-access')){
      location.replace(data.continue_path+'#'+encodeURIComponent(token));
      return;
    }
    if(data.purpose==='password_reset')showRecovery('Redefina sua senha');
    token='';invitationId=data.invitation_id;history.replaceState(null,'',location.pathname+'?invitation='+encodeURIComponent(invitationId));
    updateLoginLink(data.login_path);
    document.getElementById('school').textContent='Acesso a '+data.school_name;
    status.textContent='Escolha uma senha com pelo menos 12 caracteres. O link será utilizado somente ao confirmar.';form.hidden=false;
  }).catch(e=>{status.textContent=e.message;token='';});
  form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('button'),password=document.getElementById('password'),confirmation=document.getElementById('confirmation');if(password.value!==confirmation.value){status.textContent='As senhas não conferem.';return;}button.disabled=true;try{const result=await send('accept',{invitation_id:invitationId,password:password.value});token='';password.value='';confirmation.value='';form.hidden=true;updateLoginLink(result.login_path);status.textContent=result.message;}catch(e){status.textContent=e.message;}finally{button.disabled=false;}});
})();
