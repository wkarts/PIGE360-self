'use strict';
(() => {
  let token=location.hash.slice(1),invitationId=new URLSearchParams(location.search).get('invitation')||undefined;
  const status=document.getElementById('status'),form=document.getElementById('invite-form');
  function identity(data){
    document.getElementById('institution-name').textContent=data.display_name;
    document.title=data.display_name+' · Primeiro acesso';
    const logo=document.getElementById('institution-logo');
    if(/^\/api\/v1\/institution\/assets\/[0-9a-f]{64}\.png$/.test(data.logo_url||'')){logo.src=data.logo_url;logo.hidden=false;}
    document.querySelector('meta[name="theme-color"]').content=data.primary_color;
    document.querySelector('[data-institution-theme]').href='/api/v1/institution/theme.css?v='+encodeURIComponent(data.version);
  }
  let bootstrap=null;try{bootstrap=JSON.parse(document.getElementById('institution-bootstrap')?.textContent||'null');}catch{}
  if(bootstrap)identity(bootstrap);
  else fetch('/api/v1/institution/identity',{cache:'no-store',credentials:'same-origin'}).then(r=>r.ok?r.json():null).then(data=>{if(data)identity(data);}).catch(()=>{});
  const send=async(path,body)=>{const r=await fetch('/api/v1/invitations/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Protection':'1'},body:JSON.stringify(body),cache:'no-store',credentials:'same-origin'});const data=await r.json();if(!r.ok)throw new Error(typeof data.detail==='string'?data.detail:'Revise a senha informada.');return data;};
  send('inspect',token?{token}:{invitation_id:invitationId}).then(data=>{
    // O servidor preserva o convite em cookie HttpOnly, restrito a esta API e à validade original.
    // Só remover o fragmento após a resposta: uma falha de rede ainda permite reabrir/atualizar.
    token='';invitationId=data.invitation_id;history.replaceState(null,'',location.pathname+'?invitation='+encodeURIComponent(invitationId));
    document.getElementById('school').textContent='Acesso a '+data.school_name;
    status.textContent='Escolha uma senha com pelo menos 12 caracteres. O convite será utilizado somente ao confirmar.';form.hidden=false;
  }).catch(e=>{status.textContent=e.message;token='';});
  form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('button'),password=document.getElementById('password'),confirmation=document.getElementById('confirmation');if(password.value!==confirmation.value){status.textContent='As senhas não conferem.';return;}button.disabled=true;try{const result=await send('accept',{invitation_id:invitationId,password:password.value});token='';password.value='';confirmation.value='';form.hidden=true;status.textContent=result.message;}catch(e){status.textContent=e.message;}finally{button.disabled=false;}});
})();
